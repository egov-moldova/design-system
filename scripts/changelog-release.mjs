#!/usr/bin/env node
/**
 * changelog-release.mjs
 *
 * Folds the changelog fragments in `changes/*.md` into CHANGELOG.md under a
 * `## <version> — <date>` section, then deletes the fragments.
 *
 * Why fragments: when every PR edited the top of CHANGELOG.md, any two open
 * branches conflicted there. A PR now adds its own file under `changes/`, so no
 * two PRs touch the same path, and the file is assembled once, at release.
 *
 * Why this runs on a release branch and not in the publish pipeline: the Azure
 * pipeline stamps `package.json` and never commits back (CONTRIBUTING.md,
 * "Publishing"). Run there, the fragments would stay in the repo and ship again
 * under the next version.
 *
 * Fragment format (`changes/README.md` is the contributor-facing copy):
 *
 *   ---
 *   type: Changed
 *   title: `mud-icon` requires `name`
 *   breaking: true
 *   ---
 *   Body in Markdown, including the **Migration:** note.
 *
 * `type` is one of TYPES. `title` is optional and renders as
 * `### Changed — <title>`. `breaking: true` sorts the entry first within its
 * type and appends " (breaking)". Whole-line `#` comments are allowed in the
 * front matter; inline ones are not, so a title can contain "#88".
 *
 * A legacy `## Unreleased` section left in CHANGELOG.md is folded into the same
 * release, after the fragment entries, and its heading is removed.
 *
 * The version is the first positional argument, or `version` in package.json.
 * A prerelease (`1.1.10-dev.1`) or the `0.0.0-development` placeholder is
 * refused: development releases do not cut a changelog section.
 *
 * Usage:
 *   node scripts/changelog-release.mjs 1.1.10            # write CHANGELOG.md, delete fragments
 *   node scripts/changelog-release.mjs 1.1.10 --dry-run  # print the section, change nothing
 *   node scripts/changelog-release.mjs --check           # validate fragments only
 *   node scripts/changelog-release.mjs --check --base origin/main
 *       # also fail when a commit since <base> is marked breaking (`feat!:`,
 *       # `BREAKING CHANGE:` footer) and the branch adds or edits no fragment
 *       # with `breaking: true`; CI runs this on every pull request
 *   node scripts/changelog-release.mjs 1.1.10 --date 2026-09-23 --root <dir>
 *
 * Exit codes: 0 success (including "nothing to release"), 1 invalid input.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Keep a Changelog types, in the order a reader upgrading needs them: what breaks first. */
export const TYPES = ['Removed', 'Changed', 'Deprecated', 'Added', 'Fixed', 'Security', 'Internal'];

const FRAGMENTS_DIR = 'changes';
const CHANGELOG = 'CHANGELOG.md';
const SEMVER = /^\d+\.\d+\.\d+$/;
const PLACEHOLDER_VERSION = '0.0.0-development';

class InputError extends Error {}

/**
 * Parses one fragment. Throws InputError naming the file on anything malformed:
 * a fragment that fails here would otherwise fail the release, long after its
 * PR merged.
 */
export function parseFragment(file, text) {
  const src = text.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src);
  if (!match) throw new InputError(`${file}: missing front matter (--- … ---)`);

  const meta = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const sep = line.indexOf(':');
    if (sep === -1) throw new InputError(`${file}: front matter line is not "key: value": ${line}`);
    const key = line.slice(0, sep).trim();
    // No inline comments: a title such as "closes #88" must survive intact.
    const value = line.slice(sep + 1).trim();
    if (!['type', 'title', 'breaking'].includes(key))
      throw new InputError(`${file}: unknown front matter key "${key}"`);
    meta[key] = value;
  }

  if (!TYPES.includes(meta.type)) {
    throw new InputError(`${file}: type must be one of ${TYPES.join(', ')} (got "${meta.type ?? ''}")`);
  }
  if (meta.breaking !== undefined && !['true', 'false'].includes(meta.breaking)) {
    throw new InputError(`${file}: breaking must be true or false (got "${meta.breaking}")`);
  }
  const body = match[2].trim();
  if (!body && !meta.title) throw new InputError(`${file}: needs a title or a body`);

  return { file, type: meta.type, title: meta.title ?? '', breaking: meta.breaking === 'true', body };
}

/** Renders one fragment as a `###` entry. */
function renderEntry(fragment) {
  let heading = fragment.title ? `### ${fragment.type} — ${fragment.title}` : `### ${fragment.type}`;
  if (fragment.breaking && !/\(breaking\)$/i.test(fragment.title)) heading += ' (breaking)';
  return fragment.body ? `${heading}\n\n${fragment.body}` : heading;
}

/**
 * Orders fragments by type, breaking first within a type, then by file name.
 * The file names compare by code unit, not `localeCompare`, so the order is the
 * same on every machine whatever its locale.
 */
export function sortFragments(fragments) {
  return [...fragments].sort(
    (a, b) =>
      TYPES.indexOf(a.type) - TYPES.indexOf(b.type) ||
      Number(b.breaking) - Number(a.breaking) ||
      (a.file < b.file ? -1 : a.file > b.file ? 1 : 0),
  );
}

/**
 * Splits CHANGELOG.md into the text before the first `## ` section (the title
 * and any preamble), the body of a leading `## Unreleased` section, and the rest.
 */
function splitChangelog(text) {
  const src = text.replace(/\r\n/g, '\n');
  const firstSection = src.search(/^## /m);
  if (firstSection === -1) return { head: src.trimEnd(), unreleased: '', rest: '' };

  const head = src.slice(0, firstSection).trimEnd();
  const tail = src.slice(firstSection);
  if (!/^## Unreleased[ \t]*$/m.test(tail.split('\n', 1)[0])) return { head, unreleased: '', rest: tail.trimEnd() };

  const afterHeading = tail.slice(tail.indexOf('\n') + 1);
  const next = afterHeading.search(/^## /m);
  const unreleased = (next === -1 ? afterHeading : afterHeading.slice(0, next)).trim();
  const rest = next === -1 ? '' : afterHeading.slice(next).trimEnd();
  return { head, unreleased, rest };
}

/**
 * Returns the new CHANGELOG.md text, or null when there is nothing to release.
 * Pure, so the tests exercise it without a filesystem.
 */
export function buildChangelog(changelogText, fragments, version, date) {
  const { head, unreleased, rest } = splitChangelog(changelogText);
  const escaped = version.replace(/\./g, '\\.');
  if (new RegExp(`^## ${escaped}(\\s|$)`, 'm').test(rest)) {
    throw new InputError(`${CHANGELOG} already has a section for ${version}`);
  }

  const entries = sortFragments(fragments).map(renderEntry);
  if (unreleased) entries.push(unreleased);
  if (entries.length === 0) return null;

  const section = `## ${version} — ${date}\n\n${entries.join('\n\n')}`;
  return `${[head || '# Changelog', section, rest].filter(Boolean).join('\n\n')}\n`;
}

/** Reads and parses every fragment; collects every error before failing. */
export function readFragments(root) {
  const dir = path.join(root, FRAGMENTS_DIR);
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter(name => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
    .sort();

  const fragments = [];
  const errors = [];
  for (const name of files) {
    const rel = `${FRAGMENTS_DIR}/${name}`;
    try {
      fragments.push(parseFragment(rel, fs.readFileSync(path.join(dir, name), 'utf8')));
    } catch (error) {
      if (!(error instanceof InputError)) throw error;
      errors.push(error.message);
    }
  }
  if (errors.length) throw new InputError(errors.join('\n'));
  return fragments;
}

/**
 * True when a commit message marks a breaking change under Conventional Commits:
 * `type!:` or `type(scope)!:` in the header, or a `BREAKING CHANGE:` /
 * `BREAKING-CHANGE:` footer. commitlint already enforces the format.
 */
export function isBreakingMessage(message) {
  const header = message.split('\n', 1)[0];
  return /^[a-z]+(\([^)]*\))?!:/i.test(header) || /^BREAKING[ -]CHANGE:/m.test(message);
}

function git(root, args) {
  const run = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (run.status !== 0) throw new InputError(`git ${args.join(' ')} failed: ${(run.stderr ?? '').trim()}`);
  return run.stdout;
}

/**
 * Fails when a commit between `base` and HEAD is marked breaking but the branch
 * adds or edits no fragment with `breaking: true`. A breaking change is the one
 * entry a consumer cannot do without: it carries the migration.
 */
function checkBreakingHasFragment(root, base, fragments) {
  const breaking = git(root, ['log', '--no-merges', '--format=%h %B%x1e', `${base}..HEAD`])
    .split('\x1e')
    .map(entry => entry.trim())
    .filter(entry => entry && isBreakingMessage(entry.slice(entry.indexOf(' ') + 1)));
  if (!breaking.length) return;

  const touched = new Set(
    git(root, ['diff', '--name-only', '--diff-filter=AM', `${base}...HEAD`, '--', FRAGMENTS_DIR])
      .split('\n')
      .map(name => name.trim())
      .filter(Boolean),
  );
  if (fragments.some(fragment => fragment.breaking && touched.has(fragment.file))) return;

  const commits = breaking.map(entry => `  ${entry.split('\n', 1)[0]}`).join('\n');
  throw new InputError(
    `These commits are marked breaking, but the branch adds no fragment with "breaking: true" in ${FRAGMENTS_DIR}/:\n` +
      `${commits}\nAdd one with the migration note (see ${FRAGMENTS_DIR}/README.md).`,
  );
}

function resolveVersion(root, explicit) {
  const version = explicit ?? JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (version === PLACEHOLDER_VERSION) {
    throw new InputError(
      `package.json carries the ${PLACEHOLDER_VERSION} placeholder; pass the release version, e.g. 1.1.10`,
    );
  }
  if (!SEMVER.test(version ?? '')) {
    throw new InputError(`"${version}" is not a release version (x.y.z); prereleases do not cut a changelog section`);
  }
  return version;
}

function parseArgs(argv) {
  const opts = {
    version: undefined,
    date: undefined,
    root: process.cwd(),
    dryRun: false,
    check: false,
    base: undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new InputError(`${arg} requires a value`);
      return v;
    };
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--check') opts.check = true;
    else if (arg === '--date') opts.date = value();
    else if (arg === '--root') opts.root = path.resolve(value());
    else if (arg === '--base') opts.base = value();
    else if (arg.startsWith('--')) throw new InputError(`unknown option ${arg}`);
    else if (opts.version === undefined) opts.version = arg;
    else throw new InputError(`unexpected argument ${arg}`);
  }
  if (opts.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
    throw new InputError(`--date must be YYYY-MM-DD (got "${opts.date}")`);
  }
  if (opts.base !== undefined && !opts.check) throw new InputError('--base only applies with --check');
  return opts;
}

function main(argv) {
  const opts = parseArgs(argv);
  const fragments = readFragments(opts.root);

  if (opts.check) {
    if (opts.base !== undefined) checkBreakingHasFragment(opts.root, opts.base, fragments);
    console.log(`${fragments.length} changelog fragment(s) valid.`);
    return;
  }

  const version = resolveVersion(opts.root, opts.version);
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const changelogPath = path.join(opts.root, CHANGELOG);
  const current = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '';
  const next = buildChangelog(current, fragments, version, date);

  if (next === null) {
    console.log(`No fragments in ${FRAGMENTS_DIR}/ and no Unreleased section; ${CHANGELOG} left unchanged.`);
    return;
  }
  if (opts.dryRun) {
    process.stdout.write(next);
    return;
  }

  fs.writeFileSync(changelogPath, next);
  for (const fragment of fragments) fs.rmSync(path.join(opts.root, fragment.file));
  console.log(`${CHANGELOG}: added ${version} — ${date} from ${fragments.length} fragment(s).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
}
