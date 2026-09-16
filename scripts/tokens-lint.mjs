#!/usr/bin/env node
/**
 * tokens-lint.mjs
 *
 * Adds line/column locations for found issues and prints a clickable "path:line:col" link.
 *
 * Scans JSON files in every --root directory for naming violations. Skips directories
 * (generated, dist, node_modules, .git) and files like style-dictionary*.config.json
 * and package.json (build/config files, not token data).
 *
 * Naming rule: compound keys are camelCase (`optionFontFamily`), per .specs/TOKEN-ARCHITECTURE.md
 * §4 and tokens/_agents/naming-conventions.md. Errors: a key that starts uppercase or mixes
 * kebab-case with camelCase (`option-fontFamily`). Warnings: underscores, dots, spaces.
 * All-lowercase kebab-case keys are NOT flagged, although TOKEN-ARCHITECTURE.md §11 lists them as
 * an anti-pattern: the files the Tokenhaus sync generates from Figma use them (`base-inverse`,
 * `blue-sky`), and flagging those would report keys the next sync writes back. This linter never
 * flagged them before either.
 *
 * Usage:
 *   node scripts/tokens-lint.mjs
 *   node scripts/tokens-lint.mjs --root tokens/core --out reports/token-naming.json
 *   node scripts/tokens-lint.mjs --root tokens/core --root tokens/core.dark
 *   node scripts/tokens-lint.mjs --vscode   # include vscode://file/ links in report
 *   node scripts/tokens-lint.mjs --no-color
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const ROOTS = [];
let OUT = null;
let ALLOW_FILE = null;
let NO_COLOR = !!process.env.NO_COLOR || !process.stdout.isTTY;
let VERBOSE = false;
let INCLUDE_VSCODE_LINK = false;
let LIST_LIMIT = 200;

function take(flag, i) {
  const v = argv[i];
  if (v === undefined || v.startsWith('--')) {
    console.error(`${flag} requires a value`);
    process.exit(2);
  }
  return v;
}

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--root') {
    ROOTS.push(take(a, ++i));
  } else if (a === '--out' || a === '--output') {
    OUT = take(a, ++i);
  } else if (a === '--allow-list') {
    ALLOW_FILE = take(a, ++i);
  } else if (a === '--limit') {
    const n = Number(take(a, ++i));
    if (!Number.isFinite(n) || n < 0) {
      console.error('--limit requires a non-negative integer (0 = unlimited)');
      process.exit(2);
    }
    LIST_LIMIT = n === 0 ? Infinity : n;
  } else if (a === '--no-color') {
    NO_COLOR = true;
  } else if (a === '--verbose') {
    VERBOSE = true;
  } else if (a === '--vscode') {
    INCLUDE_VSCODE_LINK = true;
  } else if (a === '--help' || a === '-h') {
    console.log(
      'Usage: node tokens-lint.mjs [--root tokens/core] [--out report.json] [--allow-list allow.json] [--limit N] [--no-color] [--vscode] [--verbose]',
    );
    process.exit(0);
  }
}
if (ROOTS.length === 0) ROOTS.push('tokens/core');

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const ORANGE = '\x1b[38;5;208m';
const CYAN = '\x1b[36m';

function colorize(text, color) {
  if (NO_COLOR) return text;
  return `${color}${text}${RESET}`;
}

// camelCase compound keys are the documented convention; kebab-case keys (from Figma) are accepted too.
// A key with uppercase letters is valid only as lowerCamelCase: no leading capital, no hyphen mixed in.
const RE_LOWER_CAMEL = /^[a-z][a-zA-Z0-9]*$/;
const hasBadCase = key => /[A-Z]/.test(key) && !RE_LOWER_CAMEL.test(key);

// Exact keys exempted through --allow-list.
const allowedSet = new Set();

async function loadAllowList(file) {
  try {
    const txt = await fs.readFile(file, 'utf8');
    const arr = JSON.parse(txt);
    if (Array.isArray(arr)) {
      arr.forEach(x => allowedSet.add(x));
      if (VERBOSE) console.log('Loaded allow-list with', arr.length, 'entries from', file);
    } else {
      console.warn('Allow-list file does not contain a JSON array, ignoring:', file);
    }
  } catch (e) {
    console.warn('Failed to load allow-list file:', file, e.message);
  }
}

function toKebab(key) {
  let s = String(key).replace(/\./g, '-').replace(/_/g, '-').replace(/\s+/g, '-');
  s = s.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
  s = s.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2');
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  s = s.replace(/colour/g, 'color');
  return s;
}

// Suggestions follow the documented camelCase convention: `option-fontFamily` → `optionFontFamily`.
// Dashes before digits stay (`1-5` is a half step, as in sizes.tokens.json), and a key that starts
// with a digit cannot be lowerCamelCase, so it keeps its kebab-case form.
function toCamel(key) {
  const kebab = toKebab(key);
  return /^[0-9]/.test(kebab) ? kebab : kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function reasonFor(key) {
  const reasons = [];
  if (hasBadCase(key))
    reasons.push('uppercase letters outside lowerCamelCase (leading capital or mixed with kebab-case)');
  if (key.includes('.')) reasons.push('contains dot character (.)');
  if (key.includes('_')) reasons.push('contains underscore (_)');
  if (key.includes(' ')) reasons.push('contains space');
  return reasons.join(', ');
}

function getLineColumn(text, index) {
  // index is the 0-based position of the match start
  const before = text.slice(0, index);
  // support CRLF or LF
  const lines = before.split(/\r\n|\n/);
  const line = lines.length; // 1-based
  const column = lines[lines.length - 1].length + 1; // 1-based
  return { line, column };
}

function findKeyIndexSequential(text, key, fromIndex) {
  // Match `"key"` followed by optional whitespace and `:` so we never confuse
  // a key with a string value of the same name (common in token files where
  // values like "fontWeight" or "color" appear as references).
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`"${escapedKey}"\\s*:`, 'g');
  re.lastIndex = fromIndex;
  const m = re.exec(text);
  return m ? m.index : -1;
}

const results = [];
let filesScanned = 0;

const SKIP_DIRS = new Set(['generated', 'dist', 'node_modules', '.git']);

function shouldSkipFile(filename) {
  // Skip style-dictionary configuration files and other build/config files
  return /^style-dictionary.*\.config\.json$/.test(filename) || filename === 'package.json';
}

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (VERBOSE) console.warn('Failed to read dir', dir, e.message);
    return;
  }
  await Promise.all(
    entries.map(async ent => {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) return;
        await walk(full);
      } else if (ent.isFile() && ent.name.endsWith('.json') && !shouldSkipFile(ent.name)) {
        await processFile(full);
      }
    }),
  );
}

async function processFile(filePath) {
  filesScanned++;
  let fileText;
  try {
    fileText = await fs.readFile(filePath, 'utf8');
  } catch (e) {
    if (VERBOSE) console.warn('Failed to read', filePath, e.message);
    return;
  }
  let json;
  try {
    json = JSON.parse(fileText);
  } catch (e) {
    console.warn('JSON parse error in', filePath, '-', e.message);
    return;
  }

  // We'll scan the file text sequentially for keys as we traverse the parsed JSON.
  let searchPos = 0;

  function traverse(node, pathParts) {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const key of Object.keys(node)) {
        // DTCG `$` properties ($value, $extensions, ...) are metadata, not token names; `$extensions`
        // namespaces are reverse-domain by spec (`com.figma`, `md.egov.mud`) and would read as dotted keys.
        if (key.startsWith('$')) continue;
        // try to find the textual position of this key in fileText after searchPos
        const foundIndex = findKeyIndexSequential(fileText, key, searchPos);
        let position = null;
        if (foundIndex >= 0) {
          position = getLineColumn(fileText, foundIndex);
          // bump searchPos past this occurrence
          searchPos = foundIndex + key.length + 2; // +2 for the surrounding quotes
        }
        checkKey(key, pathParts.concat(key), filePath, position);
        traverse(node[key], pathParts.concat(key));
      }
    } else if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        traverse(node[i], pathParts.concat(String(i)));
      }
    }
  }

  traverse(json, []);
}

function makeClickablePath(filePath, pos) {
  const rel = path.relative(process.cwd(), filePath);
  if (!pos) return rel;
  return `${rel}:${pos.line}:${pos.column}`;
}

function makeVscodeUri(filePath, pos) {
  if (!pos) return null;
  // Normalize to forward slashes and encode
  const abs = path.resolve(filePath).replace(/\\/g, '/');
  // vscode URI format: vscode://file/<abs-path>:line:col
  return encodeURI(`vscode://file/${abs}:${pos.line}:${pos.column}`);
}

function checkKey(key, keyPath, filePath, position) {
  const badCase = hasBadCase(key);
  const hasDot = key.includes('.');
  const hasUnderscore = key.includes('_');
  const hasSpace = key.includes(' ');
  const containsProblem = badCase || hasDot || hasUnderscore || hasSpace;
  const isAllowed = allowedSet.has(key);

  if (containsProblem && !isAllowed) {
    const severity = badCase ? 'error' : 'warning';
    const link = makeClickablePath(filePath, position);
    const vscodeLink = INCLUDE_VSCODE_LINK ? makeVscodeUri(filePath, position) : null;
    results.push({
      file: filePath,
      jsonPath: keyPath.join('.'),
      key,
      suggestion: toCamel(key),
      reason: reasonFor(key),
      severity,
      position: position || null,
      link,
      vscodeLink,
    });
  } else if (containsProblem && isAllowed && VERBOSE) {
    console.log('Allow-listed key at', keyPath.join('.'), 'in', filePath);
  }
}

(async function main() {
  if (ALLOW_FILE) await loadAllowList(ALLOW_FILE);
  console.log('Scanning:', ROOTS.join(', '));
  for (const root of ROOTS) await walk(root);

  // walk() is now parallel, so sort for stable output.
  results.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return (a.position?.line ?? 0) - (b.position?.line ?? 0);
  });

  const errors = results.filter(r => r.severity === 'error').length;
  const warnings = results.filter(r => r.severity === 'warning').length;

  if (results.length === 0) {
    console.log(colorize('✔ No naming violations detected (based on current whitelist).', GREEN));
  } else if (errors > 0) {
    console.log(colorize(`✖ Errors found: ${errors} (total issues: ${results.length})`, RED));
  } else if (warnings > 0) {
    console.log(colorize(`⚠ Warnings found: ${warnings}`, ORANGE));
  }

  if (results.length > 0) {
    console.log('');
    results.slice(0, LIST_LIMIT).forEach((r, i) => {
      const rel = path.relative(process.cwd(), r.file);
      const sevColor = r.severity === 'error' ? RED : ORANGE;
      const linkText = r.position ? `${rel}:${r.position.line}:${r.position.column}` : rel;
      console.log(colorize(`${i + 1}. ${linkText} — ${r.jsonPath}`, CYAN));
      console.log('   key:    ', colorize(r.key, sevColor), '→ suggestion:', colorize(r.suggestion, GREEN));
      console.log('   reason: ', r.reason);
      if (r.vscodeLink) {
        console.log('   vscode: ', r.vscodeLink);
      }
      console.log('');
    });
    if (results.length > LIST_LIMIT) {
      console.log(`... (${results.length - LIST_LIMIT} more issues omitted from preview)`);
    }
  }

  const summary = {
    scannedRoot: ROOTS.join(', '),
    filesScanned,
    issuesFound: results.length,
    errorCount: errors,
    warningCount: warnings,
    issues: results,
  };

  if (OUT) {
    try {
      await fs.mkdir(path.dirname(OUT), { recursive: true });
      await fs.writeFile(OUT, JSON.stringify(summary, null, 2), 'utf8');
      console.log('Report written to', OUT);
    } catch (e) {
      console.warn('Failed to write report file:', OUT, e.message);
    }
  }

  if (errors > 0) process.exit(1);
})();
