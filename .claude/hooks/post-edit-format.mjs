#!/usr/bin/env node
// PostToolUse formatter/linter dispatcher for Edit / Write / MultiEdit.
// Dispatches per-file commands based on extension. Silent on success, stderr on failure.
// Reads the Claude Code hook envelope from stdin: { tool_name, tool_input: { file_path, ... } }.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, sep, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..');

const SOURCE_PREFIXES = [
  'src/',
  'tokens/',
  'scripts/',
  '.storybook/',
  '_agents/',
];

// Single-file files at the repo root that should still be formatted.
const ROOT_CONFIG_FILES = new Set([
  'package.json',
  '.prettierrc.json',
  '.stylelintrc.json',
  'commitlint.config.js',
  'stencil.config.ts',
  'README.md',
  'AGENTS.md',
]);

const PROTECTED_PATTERNS = [
  /^dist(\/|$)/,
  /^loader(\/|$)/,
  /^www(\/|$)/,
  /^storybook-static(\/|$)/,
  /^coverage(\/|$)/,
  /^\.stencil(\/|$)/,
  /^\.wireit(\/|$)/,
  /^\.yarn(\/|$)/,
  /^tokens\/generated(\/|$)/,
  /^src\/components\.d\.ts$/,
  /^components\/[^/]+\.(d\.ts|js)$/,
  /^custom-elements\.json$/,
  /^yarn\.lock$/,
  /^node_modules(\/|$)/,
];

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function isInScope(rel) {
  if (PROTECTED_PATTERNS.some((p) => p.test(rel))) return false;
  if (SOURCE_PREFIXES.some((prefix) => rel.startsWith(prefix))) return true;
  if (!rel.includes('/') && ROOT_CONFIG_FILES.has(rel)) return true;
  return false;
}

function run(cmd, args, label) {
  const result = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    process.stderr.write(`[post-edit-format] ${label} failed (exit ${result.status})\n`);
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  return result.status === 0;
}

const raw = readStdin().trim();
if (!raw) process.exit(0);

let envelope;
try {
  envelope = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = envelope?.tool_input?.file_path;
if (typeof filePath !== 'string' || !filePath) process.exit(0);

const absolute = resolve(filePath);

// File may have been deleted by the edit (rare); skip if not present.
try {
  if (!existsSync(absolute) || !statSync(absolute).isFile()) process.exit(0);
} catch {
  process.exit(0);
}

const rel = relative(REPO_ROOT, absolute).split(sep).join('/');
if (rel.startsWith('..') || rel === '') process.exit(0);
if (!isInScope(rel)) process.exit(0);

const ext = extname(rel).toLowerCase();
const isTokenFile = rel.startsWith('tokens/') && rel.endsWith('.tokens.json');

let ok = true;

if (ext === '.ts' || ext === '.tsx') {
  ok = run('yarn', ['prettier', '--write', `"${rel}"`], 'prettier') && ok;
  ok = run('yarn', ['eslint', '--fix', '--max-warnings', '0', `"${rel}"`], 'eslint') && ok;
} else if (ext === '.css') {
  ok = run('yarn', ['prettier', '--write', `"${rel}"`], 'prettier') && ok;
  ok = run('yarn', ['stylelint', '--fix', `"${rel}"`], 'stylelint') && ok;
} else if (isTokenFile) {
  // Warn-only: tokens-lint runs against the whole tier directory but the warn
  // is informational. Do not propagate non-zero exit to avoid noisy failures.
  run('node', ['scripts/tokens-lint.mjs', '--root', 'tokens/core', '--no-color', '--limit', '50'], 'tokens-lint');
} else if (ext === '.json' || ext === '.md' || ext === '.mjs' || ext === '.js') {
  ok = run('yarn', ['prettier', '--write', `"${rel}"`], 'prettier') && ok;
}

process.exit(ok ? 0 : 1);
