#!/usr/bin/env node

/**
 * check-docs.mjs
 *
 * Dependency-free checker for the public documents (any Markdown file whose
 * basename is in PUBLIC_DOC_BASENAMES, at any depth) that carry links, version
 * claims, script names or the package name.
 *
 *   node scripts/docs/check-docs.mjs              # scan the repo root
 *   node scripts/docs/check-docs.mjs --root <dir>  # scan another root
 *
 * Every rule is a named export, so another checker can run it on its own file
 * set. `checkDocs` (and so the CLI) runs `link`, `yarn-script`, `node-version`,
 * `sd-version` and `stencil-version` on the public documents and `package-name`
 * on every tracked file. `path` and `stale-prefix` are exported but not run
 * here: the public documents still hold matches for both (legacy identifiers,
 * run-output paths), so enabling them is a separate content change.
 *
 *   link            — a relative Markdown link that does not resolve.
 *   yarn-script     — `yarn <name>` in code naming no script, built-in or binary.
 *   node-version    — a Node major-version claim that disagrees with
 *                      package.json's `engines.node` `>=` bound.
 *   sd-version      — a Style Dictionary major-version claim that disagrees
 *                      with the `style-dictionary` dependency's major.
 *   stencil-version — a `Stencil 4.x` claim, or a minor above the
 *                      `@stencil/core` pin, for the pinned major.
 *   package-name    — a reference to the retired npm scope STALE_SCOPE (the
 *                      live name lives in package.json `name`).
 *   path            — a backticked repo path (`dir/file.ext`) that does not exist
 *                      and is not git-ignored.
 *   stale-prefix    — a retired `cor`/`Cor`/`HTMLCor`/`onCor` component identifier;
 *                      the prefix is `mud`.
 *
 * Exit codes: 0 clean, 1 one or more hits, 2 internal error (e.g. an
 * unreadable or malformed package.json).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { withoutGitLocation } from '../git/env.mjs';
import { isEntrypoint } from '../lib/is-entrypoint.mjs';

// Assembled so this file and its spec never contain the literal, which rule
// package-name scans every tracked file for — including these two.
export const STALE_SCOPE = ['@egov', 'md/'].join('');

const WALK_SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'storybook-static', 'www', 'loader']);

const PUBLIC_DOC_BASENAMES = new Set([
  'STACK.md',
  'README.md',
  'CONTRIBUTING.md',
  'INTEGRATION.md',
  'PRINCIPLES.md',
  'PRODUCT.md',
  'SECURITY.md',
  'DESIGN.md',
  'TESTING.md',
]);

/**
 * Node-version claim forms recognised, case-insensitive (keep this list
 * conservative, a false positive in prose is worse than a miss):
 *   - `Node >= NN` / `Node >=NN`         -> NODE_GTE
 *   - `Node.js NN`                        -> NODE_DOT_JS
 *   - `Node NN.x`                         -> NODE_DOT_X
 *   - `` `node -v` `` ... `(>= NN)`       -> NODE_DASH_V
 * A markdown table row whose first or second cell is exactly `Node` and some
 * cell contains `>= NN` is handled separately (`tableRowMajors`), since a
 * version claim there is rarely adjacent to the literal word "Node" on the
 * same textual run.
 */
const NODE_GTE = /\bnode\s*>=\s*(\d+)/gi;
const NODE_DOT_JS = /\bnode\.js\s+(\d+)\b/gi;
const NODE_DOT_X = /\bnode\s+(\d+)\.x\b/gi;
const NODE_DASH_V = /node -v[^\n]*?\(>=\s*(\d+)\)/gi;

const CONTROL_CODE_CHARS = /[*<>{$]/;

export function makeHit(file, line, ruleId, message) {
  return { file, line, ruleId, message };
}

// ---------------------------------------------------------------------------
// File enumeration
// ---------------------------------------------------------------------------

export function isGitRepo(root) {
  try {
    // `-C root` alone loses to a GIT_DIR a git hook exports: see scripts/git/env.mjs.
    const out = execFileSync('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: withoutGitLocation(),
    });
    return out.trim() === 'true';
  } catch {
    return false;
  }
}

function gitListFiles(root) {
  const out = execFileSync('git', ['-C', root, 'ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: withoutGitLocation(),
  });
  return out.split('\0').filter(Boolean);
}

function walkFiles(root) {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (WALK_SKIP_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        results.push(path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/'));
      }
    }
  }
  walk(root);
  return results;
}

export function enumerateFiles(root) {
  return isGitRepo(root) ? gitListFiles(root) : walkFiles(root);
}

export function isBinaryFile(absPath) {
  const fd = fs.openSync(absPath, 'r');
  try {
    const buf = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buf, 0, 8192, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

// ---------------------------------------------------------------------------
// Scope predicates
// ---------------------------------------------------------------------------

/** A public document: a Markdown file the library's consumers or contributors read. */
export function isPublicDoc(relPath) {
  return relPath.endsWith('.md') && PUBLIC_DOC_BASENAMES.has(path.basename(relPath));
}

/** Every tracked file is scanned for the retired scope, except history that records it on purpose. */
export function isPackageNameScope(relPath) {
  if (path.basename(relPath) === 'CHANGELOG.md') return false;
  if (/(^|\/)plans\//.test(relPath)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Rule: link
// ---------------------------------------------------------------------------

export function findCodeSpans(line) {
  const spans = [];
  const re = /`([^`]*)`/g;
  let m;
  while ((m = re.exec(line))) {
    spans.push({ start: m.index, end: re.lastIndex, content: m[1] });
  }
  return spans;
}

function inSpan(index, spans) {
  return spans.some(s => index >= s.start && index < s.end);
}

export function checkLinks(relPath, absPath, lines, root) {
  const hits = [];
  const fileDir = path.dirname(absPath);
  let inFence = false;

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const trimmed = line.trim();
    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const spans = findCodeSpans(line);

    // Markdown links: [text](target)
    const linkRe = /\[([^\]]*)\]\(([^()]*)\)/g;
    let m;
    while ((m = linkRe.exec(line))) {
      if (inSpan(m.index, spans)) continue;
      let target = m[2].trim();
      if (!target) continue;
      if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
      if (CONTROL_CODE_CHARS.test(target)) continue;
      if (/^https?:/i.test(target) || /^mailto:/i.test(target)) continue;
      if (target.startsWith('#')) continue;
      if (target.startsWith('/')) continue;

      const cut = target.search(/[#?]/);
      let cleanTarget = cut === -1 ? target : target.slice(0, cut);
      if (!cleanTarget) continue;
      try {
        cleanTarget = decodeURIComponent(cleanTarget);
      } catch {
        // Malformed escape — resolve the raw target rather than dropping the check.
      }

      const resolved = path.resolve(fileDir, cleanTarget);
      // A target that leaves the repository (`../../issues`) is a hosting-site URL, not a file.
      if (path.relative(root, resolved).startsWith('..')) continue;
      if (!fs.existsSync(resolved)) {
        hits.push(
          makeHit(
            relPath,
            lineNo,
            'link',
            `link target not found: ${target} (resolved ${path.relative(root, resolved)})`,
          ),
        );
      }
    }
  });

  return hits;
}

// ---------------------------------------------------------------------------
// Rule: path
// ---------------------------------------------------------------------------

const REPO_PATH_BACKTICK =
  /`((?:\.\.?\/)*[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)+\.(?:md|mjs|cjs|js|ts|tsx|mts|json|css|ya?ml|sh|ps1))`/g;
// Template names in docs: `mud-x`, `component-name`, `$ARGUMENTS`, `<category>`, globs.
const PATH_PLACEHOLDER = /mud-x\b|component-name|[$<>{}*]/;

function gitIgnored(root, relPaths) {
  // A path outside the repo cannot be ignored by it, and git aborts the whole
  // batch on one (exit 128), which would read as "nothing is ignored".
  const inRepo = relPaths.filter(p => !p.startsWith('../'));
  if (inRepo.length === 0 || !isGitRepo(root)) return new Set();
  const run = spawnSync('git', ['-C', root, 'check-ignore', '--stdin'], {
    input: inRepo.join('\n'),
    encoding: 'utf8',
    env: withoutGitLocation(),
  });
  if (run.status !== 0 && run.status !== 1) {
    throw new Error(`git check-ignore failed (exit ${run.status}): ${String(run.stderr).trim()}`);
  }
  return new Set(
    String(run.stdout ?? '')
      .split('\n')
      .filter(Boolean),
  );
}

export function checkPaths(relPath, lines, root) {
  const dir = path.posix.dirname(relPath);
  const unresolved = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    for (const m of line.matchAll(REPO_PATH_BACKTICK)) {
      const p = m[1];
      if (PATH_PLACEHOLDER.test(p)) continue;
      // The whole text of a Markdown link: its target is graded by the `link` rule instead.
      const end = m.index + m[0].length;
      if (line[m.index - 1] === '[' && line.startsWith('](', end)) continue;
      const relative = /^\.\.?\//.test(p);
      const candidates = relative ? [path.posix.normalize(path.posix.join(dir, p))] : [p, path.posix.join(dir, p)];
      if (candidates.some(c => fs.existsSync(path.join(root, c)))) continue;
      unresolved.push({ line: i + 1, p, primary: candidates[0] });
    }
  });
  const ignored = gitIgnored(
    root,
    unresolved.map(u => u.primary),
  );
  return unresolved
    .filter(u => !ignored.has(u.primary))
    .map(u => makeHit(relPath, u.line, 'path', `backticked path does not exist: ${u.p}`));
}

// ---------------------------------------------------------------------------
// Rule: yarn-script
// ---------------------------------------------------------------------------

// `yarn <name>` inside a code span or at the start of a fenced line must name a
// script of the root or a workspace package.json, a Yarn built-in, or a binary
// Yarn can run. Prose outside code is not read: it is not a command.
const YARN_BUILTINS = new Set([
  'add',
  'bin',
  'cache',
  'config',
  'constraints',
  'dedupe',
  'dlx',
  'exec',
  'explain',
  'info',
  'init',
  'install',
  'link',
  'node',
  'npm',
  'pack',
  'patch',
  'patch-commit',
  'plugin',
  'rebuild',
  'remove',
  'run',
  'search',
  'set',
  'stage',
  'unlink',
  'up',
  'upgrade-interactive',
  'version',
  'why',
  'workspace',
  'workspaces',
]);

export function knownYarnNames(root, pkg) {
  const names = new Set([...Object.keys(pkg.scripts ?? {}), ...YARN_BUILTINS]);
  for (const ws of Array.isArray(pkg.workspaces) ? pkg.workspaces : []) {
    try {
      const wsPkg = JSON.parse(fs.readFileSync(path.join(root, ws, 'package.json'), 'utf8'));
      for (const n of Object.keys(wsPkg.scripts ?? {})) names.add(n);
    } catch {
      // a glob or a missing workspace contributes no names
    }
  }
  try {
    for (const bin of fs.readdirSync(path.join(root, 'node_modules', '.bin'))) names.add(bin);
  } catch {
    // no install: binaries cannot be told apart, so only scripts and built-ins count
  }
  return names;
}

export function checkYarnScripts(relPath, lines, known) {
  const hits = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      return;
    }
    const re = inFence ? /^\s*yarn\s+([a-z][\w:.-]*)/g : /`yarn\s+([a-z][\w:.-]*)[^`]*`/g;
    for (const m of line.matchAll(re)) {
      if (!known.has(m[1])) hits.push(makeHit(relPath, i + 1, 'yarn-script', `\`yarn ${m[1]}\` names no script`));
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
// Rule: node-version
// ---------------------------------------------------------------------------

function tableRowMajors(line) {
  if (!line.trim().startsWith('|')) return [];
  const cells = line
    .split('|')
    .map(c => c.trim())
    .filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
  const isNodeRow = cells[0]?.toLowerCase() === 'node' || cells[1]?.toLowerCase() === 'node';
  if (!isNodeRow) return [];
  const majors = [];
  for (const cell of cells) {
    const m = /(>=\s*(\d+))/.exec(cell);
    if (m) majors.push(Number(m[2]));
  }
  return majors;
}

function proseMajors(line) {
  const majors = [];
  for (const re of [NODE_GTE, NODE_DOT_JS, NODE_DOT_X, NODE_DASH_V]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) {
      majors.push(Number(m[1]));
    }
  }
  return majors;
}

export function checkNodeVersion(relPath, lines, allowedMajor) {
  const hits = [];
  let inFence = false;

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const trimmed = line.trim();
    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const majors = new Set([...proseMajors(line), ...tableRowMajors(line)]);
    for (const major of majors) {
      if (major !== allowedMajor) {
        hits.push(
          makeHit(
            relPath,
            lineNo,
            'node-version',
            `Node ${major} claim does not match engines.node major ${allowedMajor}`,
          ),
        );
      }
    }
  });

  return hits;
}

// ---------------------------------------------------------------------------
// Rule: sd-version
// ---------------------------------------------------------------------------

// Claims recognised (case-insensitive): `Style Dictionary v4`, `Style Dictionary 4`,
// `Style Dictionary 4.x`, `Style Dictionary 4.4+`, `Style Dictionary 4.4.2`, and the
// abbreviation `SD v4`. A trailing sentence full stop does not hide the version.
const SD_CLAIM = /\b(?:style[ -]dictionary\s+v?|SD\s+v)(\d+)(?:\.(?:\d+|x))*\+?(?!\w)(?!\.\d)/gi;

export function dependencyMajor(pkg, name) {
  const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  const m = typeof range === 'string' ? range.match(/(\d+)/) : null;
  return m ? Number(m[1]) : null;
}

export function checkStyleDictionaryVersion(relPath, lines, allowedMajor) {
  const hits = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    for (const m of line.matchAll(SD_CLAIM)) {
      const major = Number(m[1]);
      if (major !== allowedMajor) {
        hits.push(
          makeHit(
            relPath,
            i + 1,
            'sd-version',
            `Style Dictionary ${major} claim does not match package.json major ${allowedMajor}`,
          ),
        );
      }
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
// Rule: stale-prefix
// ---------------------------------------------------------------------------

// The component prefix was renamed; a `cor`-prefixed name in a doc is stale, in every
// spelling a doc uses: camel/Pascal identifiers, kebab tags and custom properties
// (`cor-button`, `--cor-color`), and the prefix named as a word (`cor` prefix).
// `Corlab` / `corlab-` (lowercase after the prefix) is the vendor name and does not match.
// Placeholder spellings (`Cor<Name>`, `cor<Component>`, `HTMLCor${Name}Element`) count too.
const STALE_PREFIX = /\b(?:on)?[Cc]or[A-Z<]|\b[Cc]or\$\{|HTMLCor[A-Z<$]|\bcor-[a-z]|`[Cc]or`|\b[Cc]or\s+prefix/g;

export function checkStalePrefix(relPath, lines) {
  const hits = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(STALE_PREFIX)) {
      hits.push(
        makeHit(relPath, i + 1, 'stale-prefix', `retired component prefix in \`${m[0]}…\`; use the mud prefix`),
      );
      break;
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
// Rule: stencil-version
// ---------------------------------------------------------------------------

// Prose (`Stencil 4.46`, `Stencil >= 4.46`, `Stencil (4.46)`), table rows (`| Stencil | ~4.46.0 |`) and
// package spellings (`@stencil/core` `~4.46.0`, `@stencil/core@4.46`, `"@stencil/core": "~4.46.0"`).
const STENCIL_PROSE_CLAIMS = [
  // Whitespace runs are bounded (64 before the version or the table pipe, wide enough for a padded table cell):
  // adjacent unbounded runs backtrack in cubic time on a long line.
  /\bStencil[ \t]{1,64}[`(]?[ \t]{0,8}(?:[~^]|>=?|≥)?[ \t]{0,8}v?(\d+)(?:\.(\d+|x))?/gi,
  /\bStencil[ \t]{0,64}\|[ \t]{0,8}`?[ \t]{0,8}(?:[~^]|>=?|≥)?[ \t]{0,8}v?(\d+)\.(\d+|x)/gi,
];
const STENCIL_PACKAGE_CLAIM = /@stencil\/core[`"]?(?:@|:?\s*)[`"]?\s*(?:[~^]|>=?)?v?(\d+)\.(\d+|x)/gi;

export function pinnedMajorMinor(pkg, name) {
  const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  const m = typeof range === 'string' ? range.match(/(\d+)\.(\d+)/) : null;
  return m ? { major: Number(m[1]), minor: Number(m[2]) } : null;
}

export function checkStencilVersion(relPath, lines, pin) {
  const hits = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      return;
    }
    // Inside a fence only the package spelling is a claim (a manifest or install command).
    const patterns = inFence ? [STENCIL_PACKAGE_CLAIM] : [...STENCIL_PROSE_CLAIMS, STENCIL_PACKAGE_CLAIM];
    const claims = patterns.flatMap(re => [...line.matchAll(re)]);
    for (const m of claims) {
      if (Number(m[1]) !== pin.major) continue; // another major is a forward or history reference
      // `4.x` is a vague claim; a minor above the pin claims an API this repo does not have.
      // A lower minor ("Stencil 4.38 added …") and a bare major are history, not claims.
      const minor = m[2]?.toLowerCase();
      if (minor === 'x' || (minor !== undefined && Number(minor) > pin.minor)) {
        hits.push(
          makeHit(
            relPath,
            i + 1,
            'stencil-version',
            `version claim "${m[0]}" does not match pinned ${pin.major}.${pin.minor}`,
          ),
        );
        break;
      }
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
// Rule: package-name
// ---------------------------------------------------------------------------

export function checkPackageName(relPath, lines, realName) {
  const hits = [];
  lines.forEach((line, i) => {
    if (line.includes(STALE_SCOPE)) {
      hits.push(
        makeHit(
          relPath,
          i + 1,
          'package-name',
          `\`${STALE_SCOPE}\` reference found; the real package is \`${realName}\``,
        ),
      );
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
// package.json
// ---------------------------------------------------------------------------

export function readPackage(root) {
  const pkgPath = path.join(root, 'package.json');
  let raw;
  try {
    raw = fs.readFileSync(pkgPath, 'utf8');
  } catch (err) {
    throw new Error(`cannot read ${pkgPath}: ${err.message}`);
  }
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch (err) {
    throw new Error(`cannot parse ${pkgPath}: ${err.message}`);
  }
  return pkg;
}

export function enginesMajor(pkg) {
  const nodeRange = pkg.engines?.node;
  if (typeof nodeRange !== 'string') {
    throw new Error('package.json engines.node is missing or not a string');
  }
  const m = />=\s*(\d+)/.exec(nodeRange);
  if (!m) {
    throw new Error(`package.json engines.node has no >= bound: ${nodeRange}`);
  }
  return Number(m[1]);
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export function checkDocs({ root }) {
  const pkg = readPackage(root);
  const allowedMajor = enginesMajor(pkg);
  const realPackageName = pkg.name;
  const sdMajor = dependencyMajor(pkg, 'style-dictionary');
  const yarnNames = knownYarnNames(root, pkg);
  const stencilPin = pinnedMajorMinor(pkg, '@stencil/core');

  const files = enumerateFiles(root);
  const hits = [];

  for (const relPath of files) {
    const absPath = path.join(root, relPath);
    let stat;
    try {
      stat = fs.statSync(absPath);
    } catch {
      continue; // e.g. a tracked file deleted from the worktree
    }
    if (!stat.isFile()) continue;
    if (isBinaryFile(absPath)) continue;

    const publicDoc = isPublicDoc(relPath);
    const needsPackageName = isPackageNameScope(relPath);

    if (!publicDoc && !needsPackageName) continue;

    const lines = fs.readFileSync(absPath, 'utf8').split('\n');

    if (publicDoc) {
      hits.push(...checkLinks(relPath, absPath, lines, root));
      hits.push(...checkYarnScripts(relPath, lines, yarnNames));
      hits.push(...checkNodeVersion(relPath, lines, allowedMajor));
      if (stencilPin) hits.push(...checkStencilVersion(relPath, lines, stencilPin));
      if (sdMajor !== null) hits.push(...checkStyleDictionaryVersion(relPath, lines, sdMajor));
    }
    if (needsPackageName) hits.push(...checkPackageName(relPath, lines, realPackageName));
  }

  hits.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return hits;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function resolveRoot(argv) {
  const idx = argv.indexOf('--root');
  if (idx !== -1 && argv[idx + 1]) {
    return path.resolve(process.cwd(), argv[idx + 1]);
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

function main() {
  const root = resolveRoot(process.argv.slice(2));

  let hits;
  try {
    hits = checkDocs({ root });
  } catch (err) {
    console.error(`check-docs: internal error: ${err.message}`);
    process.exit(2);
    return;
  }

  for (const hit of hits) {
    // A file name must not turn a log line into a CI command: fixed prefix, no control or bidi characters.
    console.log(
      `- ${`${hit.file}:${hit.line}: [${hit.ruleId}] ${hit.message}`.replace(/[^\p{L}\p{M}\p{N}\p{P}\p{S} ]/gu, '?')}`,
    );
  }
  console.log(hits.length ? `check-docs: ${hits.length} problem(s)` : 'check-docs: clean');
  process.exit(hits.length ? 1 : 0);
}

if (isEntrypoint(import.meta.url)) {
  main();
}
