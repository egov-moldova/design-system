#!/usr/bin/env node

/**
 * check-ai-docs.mjs
 *
 * Dependency-free checker for the AI-facing documentation (AGENTS.md,
 * CLAUDE.md, `_agents/*.md`, `.claude/agents|commands|skills/*.md`) plus a
 * handful of other docs that carry version claims or the package name.
 *
 *   node scripts/docs/check-ai-docs.mjs              # scan the repo root
 *   node scripts/docs/check-ai-docs.mjs --root <dir>  # scan another root
 *
 * Rules:
 *   link           — a relative Markdown link, or a backticked
 *                     `(../)*_agents/<name>.md` path, that does not resolve.
 *   node-version   — a Node major-version claim that disagrees with
 *                     package.json's `engines.node` `>=` bound.
 *   sd-version     — a Style Dictionary major-version claim that disagrees
 *                     with the `style-dictionary` dependency's major.
 *   path           — a backticked repo path (`dir/file.ext`) in doc scope that
 *                     does not exist and is not git-ignored.
 *   package-name   — a reference to the retired npm scope STALE_SCOPE (the
 *                     live name lives in package.json `name`).
 *   settings-path  — a machine-specific `/Users/...` or `C:\Users\...` path
 *                     baked into `.claude/settings.json`.
 *
 * Exit codes: 0 clean, 1 one or more hits, 2 internal error (e.g. an
 * unreadable or malformed package.json).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Assembled so this file and its spec never contain the literal, which rule
// package-name scans every tracked file for — including these two.
export const STALE_SCOPE = ['@egov', 'md/'].join('');

const WALK_SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'storybook-static', 'www', 'loader']);

const DOC_SCOPE_PREFIXES = ['.claude/agents/', '.claude/commands/', '.claude/skills/'];

const NODE_VERSION_EXTRA_BASENAMES = new Set([
  'STACK.md',
  'README.md',
  'CONTRIBUTING.md',
  'INTEGRATION.md',
  'PRINCIPLES.md',
  'PRODUCT.md',
  'SECURITY.md',
  'DESIGN.md',
]);

/**
 * Node-version claim forms recognised, case-insensitive (top-of-file comment
 * per the task's request — keep this list conservative, a false positive in
 * prose is worse than a miss):
 *   - `Node >= NN` / `Node >=NN`         -> NODE_GTE
 *   - `Node.js NN`                        -> NODE_DOT_JS
 *   - `Node NN.x`                         -> NODE_DOT_X
 *   - `` `node -v` `` ... `(>= NN)`       -> NODE_DASH_V
 * A markdown table row whose first or second cell is exactly `Node` and some
 * cell contains `>= NN` is handled separately (`tableRowMajor`), since a
 * version claim there is rarely adjacent to the literal word "Node" on the
 * same textual run.
 */
const NODE_GTE = /\bnode\s*>=\s*(\d+)/gi;
const NODE_DOT_JS = /\bnode\.js\s+(\d+)\b/gi;
const NODE_DOT_X = /\bnode\s+(\d+)\.x\b/gi;
const NODE_DASH_V = /node -v[^\n]*?\(>=\s*(\d+)\)/gi;

const AGENTS_BACKTICK_RE = /^(\.\.\/)*_agents\/[^*]+\.md$/;

const CONTROL_CODE_CHARS = /[*<>{$]/;

function makeHit(file, line, ruleId, message) {
  return { file, line, ruleId, message };
}

// ---------------------------------------------------------------------------
// File enumeration
// ---------------------------------------------------------------------------

function isGitRepo(root) {
  try {
    const out = execFileSync('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
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

function enumerateFiles(root) {
  return isGitRepo(root) ? gitListFiles(root) : walkFiles(root);
}

function isBinaryFile(absPath) {
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

export function isIndexFile(relPath) {
  const base = path.basename(relPath);
  return base === 'AGENTS.md' || base === 'CLAUDE.md';
}

export function isDocScope(relPath) {
  if (isIndexFile(relPath)) return true;
  if (!relPath.endsWith('.md')) return false;
  if (/(^|\/)_agents\//.test(relPath)) return true;
  return DOC_SCOPE_PREFIXES.some(prefix => relPath.startsWith(prefix));
}

function isNodeVersionScope(relPath) {
  if (isDocScope(relPath)) return true;
  if (!relPath.endsWith('.md')) return false;
  if (NODE_VERSION_EXTRA_BASENAMES.has(path.basename(relPath))) return true;
  return relPath.startsWith('.specs/');
}

function isPackageNameScope(relPath) {
  if (path.basename(relPath) === 'CHANGELOG.md') return false;
  if (relPath.startsWith('.claude/plans/')) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Rule: link
// ---------------------------------------------------------------------------

function findCodeSpans(line) {
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

function resolveAgentsBacktick(content, indexFile, fileDir, root) {
  const base = indexFile || content.startsWith('../') ? fileDir : root;
  const resolved = path.resolve(base, content);
  return { exists: fs.existsSync(resolved), checkedPath: path.relative(root, resolved) };
}

function checkLinks(relPath, absPath, lines, root) {
  const hits = [];
  const indexFile = isIndexFile(relPath);
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

    // Backticked `(../)*_agents/<name>.md` mentions.
    for (const span of spans) {
      if (!AGENTS_BACKTICK_RE.test(span.content)) continue;
      const resolved = resolveAgentsBacktick(span.content, indexFile, fileDir, root);
      if (!resolved.exists) {
        hits.push(makeHit(relPath, lineNo, 'link', `\`${span.content}\` does not resolve to ${resolved.checkedPath}`));
      }
    }

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
  if (relPaths.length === 0 || !isGitRepo(root)) return new Set();
  const run = spawnSync('git', ['-C', root, 'check-ignore', '--stdin'], {
    input: relPaths.join('\n'),
    encoding: 'utf8',
  });
  return new Set(
    String(run.stdout ?? '')
      .split('\n')
      .filter(Boolean),
  );
}

function checkPaths(relPath, lines, root) {
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
      if (PATH_PLACEHOLDER.test(p) || AGENTS_BACKTICK_RE.test(p)) continue;
      // The whole text of a Markdown link: its target is graded by the `link` rule instead.
      const end = m.index + m[0].length;
      if (line[m.index - 1] === '[' && line.startsWith('](', end)) continue;
      const relative = /^\.\.?\//.test(p);
      // Skill-relative shorthand (`stencil-compliance/references/x.md`) is a convention
      // inside `.claude/` only; elsewhere it would let a path resolve by coincidence.
      const candidates = relative
        ? [path.posix.normalize(path.posix.join(dir, p))]
        : [
            p,
            path.posix.join(dir, p),
            ...(relPath.startsWith('.claude/') ? [path.posix.join('.claude/skills', p)] : []),
          ];
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

function checkNodeVersion(relPath, lines, allowedMajor) {
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

function checkStyleDictionaryVersion(relPath, lines, allowedMajor) {
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
// Rule: package-name
// ---------------------------------------------------------------------------

function checkPackageName(relPath, lines, realName) {
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
// Rule: settings-path
// ---------------------------------------------------------------------------

function checkSettingsPath(relPath, lines) {
  const hits = [];
  lines.forEach((line, i) => {
    if (/\/Users\//.test(line) || /C:\\Users\\/.test(line) || /C:\/Users\//.test(line)) {
      hits.push(makeHit(relPath, i + 1, 'settings-path', 'settings.json contains a machine-specific Users path'));
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
// package.json
// ---------------------------------------------------------------------------

function readPackage(root) {
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

function enginesMajor(pkg) {
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

export function checkAiDocs({ root }) {
  const pkg = readPackage(root);
  const allowedMajor = enginesMajor(pkg);
  const realPackageName = pkg.name;
  const sdMajor = dependencyMajor(pkg, 'style-dictionary');

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

    const needsDocScope = isDocScope(relPath);
    const needsNodeVersion = isNodeVersionScope(relPath);
    const needsPackageName = isPackageNameScope(relPath);
    const needsSettingsPath = relPath === '.claude/settings.json';

    if (!needsDocScope && !needsNodeVersion && !needsPackageName && !needsSettingsPath) continue;

    const lines = fs.readFileSync(absPath, 'utf8').split('\n');

    if (needsDocScope) hits.push(...checkLinks(relPath, absPath, lines, root));
    if (needsDocScope && relPath.endsWith('.md')) hits.push(...checkPaths(relPath, lines, root));
    if (needsNodeVersion) hits.push(...checkNodeVersion(relPath, lines, allowedMajor));
    if (needsNodeVersion && sdMajor !== null) hits.push(...checkStyleDictionaryVersion(relPath, lines, sdMajor));
    if (needsPackageName) hits.push(...checkPackageName(relPath, lines, realPackageName));
    if (needsSettingsPath) hits.push(...checkSettingsPath(relPath, lines));
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
    hits = checkAiDocs({ root });
  } catch (err) {
    console.error(`check-ai-docs: internal error: ${err.message}`);
    process.exit(2);
    return;
  }

  for (const hit of hits) {
    console.log(`${hit.file}:${hit.line}: [${hit.ruleId}] ${hit.message}`);
  }
  console.log(hits.length ? `check-ai-docs: ${hits.length} problem(s)` : 'check-ai-docs: clean');
  process.exit(hits.length ? 1 : 0);
}

const isEntrypoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main();
}
