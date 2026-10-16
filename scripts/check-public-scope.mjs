#!/usr/bin/env node
/**
 * check-public-scope.mjs — keeps editor and assistant configuration, and the internal-only
 * scripts that go with it, out of the public repository and out of its published packages.
 *
 * One authored list, two exports: `ROOTS` (the literal paths, also usable to write a local
 * exclude file) and `PATTERNS` (the regexes that match a root with or without a trailing
 * segment, so a committed symlink named `.claude` is caught too). `INTERNAL_ONLY_FILES` names
 * the exact paths of scripts and specs that cite no root, so no citation scan would see them.
 *
 * Modes (several may be combined; default `--paths`):
 *   --paths   every tracked path (`git ls-files -z`) against PATTERNS and INTERNAL_ONLY_FILES
 *   --staged  the same over the index (`git diff --cached --name-only -z --diff-filter=ACMR`)
 *   --content tracked text files that cite a root path
 *   --packed  the `yarn pack` / `npm pack` file lists of `.` and `web-components`: no root path,
 *             no root citation, no PROSE_PATTERNS match in a packed text file, no matching
 *             `package.json` script
 *
 * Stated limit: a path assembled from segments (`join(REPO, '.claude', …)`) is not seen by the
 * citation scan; CI running the script specs on a checkout without those files is the backstop.
 *
 * Usage: node scripts/check-public-scope.mjs [--paths] [--staged] [--content] [--packed]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { isEntrypoint } from './lib/is-entrypoint.mjs';

/** Printed beside every offender; `CONTRIBUTING.md` carries the matching section. */
export const MESSAGE = 'out-of-scope file committed — see CONTRIBUTING.md § Repository scope';

/** The literal paths that must not be tracked. A trailing slash marks a directory. */
export const ROOTS = [
  '.mcp.json',
  'AGENTS.md',
  'CLAUDE.md',
  'src/components/AGENTS.md',
  'src/components/CLAUDE.md',
  'tokens/AGENTS.md',
  'tokens/CLAUDE.md',
  '_agents/',
  '.claude/',
  'src/components/_agents/',
  'tokens/_agents/',
  'CLAUDE.local.md',
];

/** Each regex matches a root with or without a trailing segment. Every ROOT matches one. */
export const PATTERNS = [
  /(^|\/)\.claude(\/|$)/,
  /(^|\/)_agents(\/|$)/,
  /(^|\/)(AGENTS|CLAUDE)\.md$/,
  /^\.mcp\.json$/,
  /(^|\/)CLAUDE\.local\.md$/,
];

/** Exact paths of internal-only scripts and specs. None of them cites a root. */
export const INTERNAL_ONLY_FILES = [
  'scripts/audit/measure-prompt-cost.mjs',
  'scripts/audit/CLEANUP.md',
  'scripts/docs/check-ai-docs.mjs',
  'scripts/cleanup-agents.mjs',
  'scripts/__tests__/check-ai-docs.spec.mjs',
  'scripts/__tests__/cleanup-agents.spec.mjs',
  'scripts/__tests__/pixel-perfect-skill.spec.mjs',
  'scripts/__tests__/stencil-compliance-skill.spec.mjs',
];

/**
 * Prose and identifier patterns that must not appear in published text. A quoted
 * 'AI' is data (initials, a country code), so only the unquoted word counts.
 */
export const PROSE_PATTERNS = [
  { kind: 'prose', pattern: /(?<!['"`])\bAI\b(?!['"`])/ },
  { kind: 'prose', pattern: /claude|subagent|\bLLM\b/i },
  { kind: 'identifier', pattern: /ai-findings|\baiLegs\b|requires-ai-review|\/ai\/<|runs\/[^ ]*\/ai\// },
];

/** A root path cited in text. A preceding word character or hyphen means a different name. */
const ROOT_CITATION = /(?<![\w-])(?:\.claude\/|_agents\/|AGENTS\.md|CLAUDE\.md|\.mcp\.json)/;

/** Files the citation scan never reports: this guard, its spec, and released history. */
const CITATION_EXEMPT = [
  'scripts/check-public-scope.mjs',
  'scripts/__tests__/check-public-scope.spec.mjs',
  'CHANGELOG.md',
];

const PACKAGES = ['.', 'web-components'];

/** Paths (input order kept) that match a pattern or name an internal-only file. */
export function outOfScope(paths) {
  return paths.filter(p => PATTERNS.some(re => re.test(p)) || INTERNAL_ONLY_FILES.includes(p));
}

/** 1-based line numbers of `text` that cite a root path. */
export function rootCitationLines(text) {
  return text.split('\n').flatMap((line, i) => (ROOT_CITATION.test(line) ? [i + 1] : []));
}

/** Line numbers of tracked text file `file` that cite a root; `[]` for roots and exempt files. */
export function citesOutOfScope(file, text) {
  if (CITATION_EXEMPT.includes(file) || outOfScope([file]).length > 0) return [];
  return rootCitationLines(text);
}

/** `{ line, kind }` for every PROSE_PATTERNS match in `text`. */
export function proseHits(text) {
  return text
    .split('\n')
    .flatMap((line, i) =>
      PROSE_PATTERNS.filter(({ pattern }) => pattern.test(line)).map(({ kind }) => ({ line: i + 1, kind })),
    );
}

/** `scripts` entries of a package.json that a published package must not carry. */
export function packedScriptOffenders(pkg) {
  return Object.entries(pkg?.scripts ?? {})
    .filter(
      ([key, value]) =>
        /^cleanup:agents/.test(key) ||
        rootCitationLines(String(value)).length > 0 ||
        INTERNAL_ONLY_FILES.some(file => String(value).includes(file)),
    )
    .map(([key]) => key);
}

/** Splits `git ... -z` output into paths. */
export function splitNul(output) {
  return output.split('\0').filter(Boolean);
}

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

export const listTracked = cwd => splitNul(git(cwd, ['ls-files', '-z']));
export const listStaged = cwd => splitNul(git(cwd, ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']));

/** Text of `file` under `cwd`, or null when it is missing, not a regular file or binary. */
function readText(cwd, file) {
  const full = path.join(cwd, file);
  try {
    if (!fs.lstatSync(full).isFile()) return null;
    const buffer = fs.readFileSync(full);
    return buffer.subarray(0, 8000).includes(0) ? null : buffer.toString('utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

const pathFindings = paths => outOfScope(paths).map(file => ({ file, reason: MESSAGE }));

export const checkPaths = (cwd = process.cwd()) => pathFindings(listTracked(cwd));
export const checkStaged = (cwd = process.cwd()) => pathFindings(listStaged(cwd));

/** Tracked text files citing a root path: `[{ file, line, reason }]`. */
export function checkContent(cwd = process.cwd()) {
  return listTracked(cwd).flatMap(file => {
    const text = readText(cwd, file);
    if (text === null) return [];
    return citesOutOfScope(file, text).map(line => ({ file, line, reason: 'cites an out-of-scope path' }));
  });
}

async function defaultPackedFiles(cwd) {
  const { packedFileList, npmPackedFileList } = await import('./validate-package.mjs');
  return [...new Set([...packedFileList(cwd), ...npmPackedFileList(cwd)])];
}

/**
 * Packed-tarball findings for each package under `root`. `listFiles(cwd)` returns the packed
 * file list; the default asks both packers (`--ignore-scripts` is set in validate-package.mjs).
 */
export async function checkPacked(root = process.cwd(), { listFiles = defaultPackedFiles, packages = PACKAGES } = {}) {
  const findings = [];
  for (const pkgDir of packages) {
    const cwd = path.join(root, pkgDir);
    const label = file => path.posix.join(pkgDir, file);
    const files = await listFiles(cwd);
    for (const file of outOfScope(files)) findings.push({ file: label(file), reason: MESSAGE });
    for (const file of files) {
      const text = readText(cwd, file);
      if (text === null) continue;
      if (file === 'package.json') {
        for (const key of packedScriptOffenders(JSON.parse(text))) {
          findings.push({ file: label(file), reason: `script "${key}" names a removed path` });
        }
      }
      for (const line of rootCitationLines(text)) {
        findings.push({ file: label(file), line, reason: 'packed text cites an out-of-scope path' });
      }
      for (const { line, kind } of proseHits(text)) {
        findings.push({ file: label(file), line, reason: `packed text matches the ${kind} patterns` });
      }
    }
  }
  return findings;
}

const CHECKS = {
  '--paths': checkPaths,
  '--staged': checkStaged,
  '--content': checkContent,
  '--packed': checkPacked,
};

/** Runs the named modes; returns `{ mode, findings }` per mode. */
export async function run(modes = ['--paths'], cwd = process.cwd()) {
  const results = [];
  for (const mode of modes) results.push({ mode, findings: await CHECKS[mode](cwd) });
  return results;
}

if (isEntrypoint(import.meta.url)) {
  const args = process.argv.slice(2);
  const unknown = args.filter(arg => !(arg in CHECKS));
  if (unknown.length > 0) {
    console.error(`[check-public-scope] unknown argument: ${unknown.join(' ')}`);
    console.error('Usage: node scripts/check-public-scope.mjs [--paths] [--staged] [--content] [--packed]');
    process.exit(2);
  }
  let total = 0;
  for (const { mode, findings } of await run(args.length > 0 ? args : ['--paths'])) {
    for (const { file, line, reason } of findings) {
      console.error(`${file}${line ? `:${line}` : ''} · ${reason}`);
    }
    total += findings.length;
    console.error(`[check-public-scope] ${mode}: ${findings.length} offender(s).`);
  }
  process.exit(total > 0 ? 1 : 0);
}
