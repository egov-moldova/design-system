#!/usr/bin/env node
// PreToolUse guard for Edit / Write / MultiEdit.
// Blocks edits to generated, locked, or built-output files by exiting 2 with stderr.
// Reads the Claude Code hook envelope from stdin: { tool_name, tool_input: { file_path, ... } }.

import { readFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..');

// Protected paths — regex against the repo-relative POSIX path of the file being edited.
const PROTECTED_PATTERNS = [
  /^dist(\/|$)/,
  /^loader(\/|$)/,
  /^www(\/|$)/,
  /^storybook-static(\/|$)/,
  /^coverage(\/|$)/,
  /^\.stencil(\/|$)/,
  /^\.wireit(\/|$)/,
  /^\.yarn\/cache(\/|$)/,
  /^tokens\/generated(\/|$)/,
  /^src\/components\.d\.ts$/,
  /^components\/[^/]+\.(d\.ts|js)$/,
  /^custom-elements\.json$/,
  /^yarn\.lock$/,
  /^\.storybook\/stories\/assets\/core[^/]*\.tokens\.json$/,
];

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
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
const rel = relative(REPO_ROOT, absolute).split(sep).join('/');

if (rel.startsWith('..') || rel === '') process.exit(0);

for (const pattern of PROTECTED_PATTERNS) {
  if (pattern.test(rel)) {
    process.stderr.write(
      `Blocked: ${rel} is auto-generated or locked and must not be edited by hand.\n` +
        `Edit the source instead (e.g., for tokens edit tokens/core/*.tokens.json then rebuild; ` +
        `for components.d.ts run \`yarn build\`; for yarn.lock run \`yarn install\`).\n`,
    );
    process.exit(2);
  }
}

process.exit(0);
