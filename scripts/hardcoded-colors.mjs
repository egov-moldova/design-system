#!/usr/bin/env node
/**
 * hardcoded-colors.mjs
 *
 * Scans source files for hardcoded color values that should use design tokens instead.
 * Detects hex colors, rgb/rgba/hsl/hsla functions, modern color functions, and named
 * CSS colors (CSS/SCSS only). Reports file:line:col links like tokens-lint.
 *
 * Usage:
 *   node scripts/hardcoded-colors.mjs
 *   node scripts/hardcoded-colors.mjs --root src --out reports/hardcoded-colors.json
 *   node scripts/hardcoded-colors.mjs --ext css,scss,ts,tsx
 *   node scripts/hardcoded-colors.mjs --vscode
 *   node scripts/hardcoded-colors.mjs --no-color
 *   node scripts/hardcoded-colors.mjs --skip-named
 *   node scripts/hardcoded-colors.mjs --allow-list allow.json
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
let ROOT = 'src';
let OUT = null;
let ALLOW_FILE = null;
let NO_COLOR = !!process.env.NO_COLOR || !process.stdout.isTTY;
let VERBOSE = false;
let INCLUDE_VSCODE_LINK = false;
let LIST_LIMIT = 200;
let EXTS = new Set(['css', 'scss', 'less', 'ts', 'tsx']);
let SKIP_NAMED = false;

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
    ROOT = take(a, ++i);
  } else if (a === '--out' || a === '--output') {
    OUT = take(a, ++i);
  } else if (a === '--allow-list') {
    ALLOW_FILE = take(a, ++i);
  } else if (a === '--ext') {
    EXTS = new Set(
      take(a, ++i)
        .split(',')
        .map(e => e.trim().replace(/^\./, '')),
    );
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
  } else if (a === '--skip-named') {
    SKIP_NAMED = true;
  } else if (a === '--help' || a === '-h') {
    console.log(
      [
        'Usage: node scripts/hardcoded-colors.mjs [options]',
        '',
        'Options:',
        '  --root <dir>       Directory to scan (default: src)',
        '  --out <file>       Write JSON report to file',
        '  --ext <list>       Comma-separated extensions (default: css,scss,less,ts,tsx)',
        '  --allow-list <f>   JSON file with strings/regexes to ignore',
        '  --limit <n>        Max issues in console (0 = unlimited, default: 200)',
        '  --skip-named       Skip named CSS color detection',
        '  --no-color         Disable colored output',
        '  --vscode           Include vscode:// links in output',
        '  --verbose          Show extra scan info',
      ].join('\n'),
    );
    process.exit(0);
  }
}

// ─── Terminal colors ───────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const ORANGE = '\x1b[38;5;208m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

function colorize(text, color) {
  if (NO_COLOR) return text;
  return `${color}${text}${RESET}`;
}

// ─── Allow list ────────────────────────────────────────────────────────────────
// Entries are strings (substring match) or "/pattern/flags" regex strings.

const allowList = [];

async function loadAllowList(file) {
  try {
    const txt = await fs.readFile(file, 'utf8');
    const arr = JSON.parse(txt);
    if (!Array.isArray(arr)) {
      console.warn('Allow-list must be a JSON array, ignoring:', file);
      return;
    }
    for (const entry of arr) {
      if (typeof entry !== 'string') continue;
      const m = entry.match(/^\/(.+)\/([gimsuy]*)$/);
      if (m) {
        try {
          allowList.push(new RegExp(m[1], m[2]));
        } catch {
          console.warn('Invalid regex in allow-list, skipping:', entry);
        }
      } else {
        allowList.push(entry);
      }
    }
    if (VERBOSE) console.log('Loaded allow-list with', arr.length, 'entries from', file);
  } catch (e) {
    console.warn('Failed to load allow-list:', file, e.message);
  }
}

function isAllowed(value) {
  for (const p of allowList) {
    if (p instanceof RegExp ? p.test(value) : value.includes(p)) return true;
  }
  return false;
}

// ─── Color patterns ────────────────────────────────────────────────────────────

// Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA — matched at word boundary
// The negative lookbehind avoids matching inside CSS custom property names (`--my-bg-#abc` never happens,
// but just to be safe we also skip if preceded by a word char or dash).
const RE_HEX = () => /(?<![a-zA-Z0-9_-])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;

// Functional color notations — no whitespace before ( to avoid matching prose like "color (description)"
const RE_FUNCTIONAL = () => /\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/gi;

const STATIC_PATTERNS = [
  { name: 'hex', re: RE_HEX, severity: 'error' },
  { name: 'functional', re: RE_FUNCTIONAL, severity: 'error' },
];

// Named CSS colors — only checked in CSS/SCSS/LESS files to avoid false positives
// in TS identifiers. Matched only in property-value position (after a colon or comma,
// or at start of value) using a lookbehind.
const CSS_NAMED_COLORS = [
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
];

// Sort longest-first to prevent shorter names shadowing longer ones (e.g. "red" vs "darkred")
const NAMED_COLOR_SORTED = [...CSS_NAMED_COLORS].sort((a, b) => b.length - a.length);

// Match named colors that appear as CSS values: after `:` or `,` with optional whitespace,
// or as the entire value (start of value field). Lookbehind keeps col accurate.
const RE_NAMED_COLOR = new RegExp(`(?<=(?::|,)\\s*)\\b(${NAMED_COLOR_SORTED.join('|')})\\b(?![-_a-zA-Z0-9])`, 'gi');

const CSS_EXTS = new Set(['css', 'scss', 'less']);

// ─── Utilities ─────────────────────────────────────────────────────────────────

function getExt(filename) {
  return filename.split('.').pop().toLowerCase();
}

function makeClickablePath(filePath, line, col) {
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return `${rel}:${line}:${col}`;
}

function makeVscodeUri(filePath, line, col) {
  const abs = path.resolve(filePath).replace(/\\/g, '/');
  return encodeURI(`vscode://file/${abs}:${line}:${col}`);
}

function lineContext(lineText, matchIndex, matchLength, radius = 30) {
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(lineText.length, matchIndex + matchLength + radius);
  const snippet = lineText.slice(start, end).trim();
  return snippet.length > 80 ? snippet.slice(0, 77) + '...' : snippet;
}

// ─── File processing ───────────────────────────────────────────────────────────

const results = [];
let filesScanned = 0;
const SKIP_DIRS = new Set(['generated', 'dist', 'node_modules', '.git']);

async function processFile(filePath) {
  filesScanned++;
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (e) {
    if (VERBOSE) console.warn('Cannot read', filePath, e.message);
    return;
  }

  const ext = getExt(filePath);
  const isCss = CSS_EXTS.has(ext);
  const rawLines = content.split(/\r\n|\n/);

  // Strip CSS block comments line-by-line so we don't report colors inside /* ... */
  let inBlockComment = false;
  const lines = rawLines.map(raw => {
    if (!isCss) return raw; // TS/TSX: handle inline // comments per-match
    let out = '';
    let i = 0;
    while (i < raw.length) {
      if (inBlockComment) {
        const end = raw.indexOf('*/', i);
        if (end >= 0) {
          inBlockComment = false;
          // Preserve column offsets by replacing comment chars with spaces
          out += ' '.repeat(end + 2 - i);
          i = end + 2;
        } else {
          out += ' '.repeat(raw.length - i);
          i = raw.length;
        }
      } else {
        const start = raw.indexOf('/*', i);
        if (start >= 0) {
          out += raw.slice(i, start);
          inBlockComment = true;
          i = start + 2;
          out += '  '; // placeholder for /*
        } else {
          out += raw.slice(i);
          i = raw.length;
        }
      }
    }
    return out;
  });

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    const line = lines[lineIdx];
    if (!line.trim()) continue;

    // For TS/TSX: find where // comment starts (naively, ignoring string context)
    const inlineCommentCol = (() => {
      if (isCss) return Infinity;
      const idx = line.indexOf('//');
      return idx >= 0 ? idx : Infinity;
    })();

    function addResult(type, severity, matchIndex, matchStr) {
      if (matchIndex >= inlineCommentCol) return; // inside line comment
      if (isAllowed(matchStr)) return;

      const col = matchIndex + 1;
      const link = makeClickablePath(filePath, lineNum, col);
      const vscodeLink = INCLUDE_VSCODE_LINK ? makeVscodeUri(filePath, lineNum, col) : null;
      const context = lineContext(rawLines[lineIdx], matchIndex, matchStr.length);

      results.push({ file: filePath, line: lineNum, col, type, value: matchStr, context, severity, link, vscodeLink });
    }

    // Static patterns (hex + functional) — apply to all file types
    for (const pat of STATIC_PATTERNS) {
      const re = pat.re();
      let m;
      while ((m = re.exec(line)) !== null) {
        // Skip if inside a CSS var() call: `var(--foo)` — look for unclosed var( before match
        const before = line.slice(0, m.index);
        const openVarCount = (before.match(/\bvar\s*\(/g) || []).length;
        const closeVarCount = (before.match(/\)/g) || []).length;
        if (openVarCount > closeVarCount) continue; // inside var()

        addResult(pat.name, pat.severity, m.index, m[0]);
      }
    }

    // Named color detection — CSS/SCSS/LESS only
    if (!SKIP_NAMED && isCss) {
      const re = new RegExp(RE_NAMED_COLOR.source, RE_NAMED_COLOR.flags);
      let m;
      while ((m = re.exec(line)) !== null) {
        addResult('named-color', 'warning', m.index, m[0].trim());
      }
    }
  }
}

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (VERBOSE) console.warn('Cannot read dir', dir, e.message);
    return;
  }
  await Promise.all(
    entries.map(async ent => {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) {
          if (VERBOSE) console.log('Skipping dir:', full);
          return;
        }
        await walk(full);
      } else if (ent.isFile() && EXTS.has(getExt(ent.name)) && !ent.name.endsWith('.d.ts')) {
        await processFile(full);
      }
    }),
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

(async function main() {
  if (ALLOW_FILE) await loadAllowList(ALLOW_FILE);
  console.log('Scanning:', ROOT, colorize(`[${[...EXTS].join(', ')}]`, DIM));
  await walk(ROOT);

  // Stable sort: by file, then line, then column
  results.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    return a.col - b.col;
  });

  const errors = results.filter(r => r.severity === 'error').length;
  const warnings = results.filter(r => r.severity === 'warning').length;

  console.log('');
  if (results.length === 0) {
    console.log(colorize('✔ No hardcoded colors detected.', GREEN));
  } else if (errors > 0) {
    console.log(
      colorize(`✖ ${errors} error${errors !== 1 ? 's' : ''}`, RED) +
        (warnings > 0 ? colorize(`, ${warnings} warning${warnings !== 1 ? 's' : ''}`, ORANGE) : '') +
        ` (${results.length} total, ${filesScanned} files scanned)`,
    );
  } else {
    console.log(
      colorize(`⚠ ${warnings} warning${warnings !== 1 ? 's' : ''}`, ORANGE) + ` (${filesScanned} files scanned)`,
    );
  }

  if (results.length > 0) {
    console.log('');
    results.slice(0, LIST_LIMIT).forEach((r, i) => {
      const sevColor = r.severity === 'error' ? RED : ORANGE;
      const label = r.severity === 'error' ? 'error' : 'warn ';
      console.log(colorize(`${i + 1}. ${r.link}`, CYAN));
      console.log(`   [${colorize(label, sevColor)}] ${colorize(r.type, sevColor)}: ${colorize(r.value, RED)}`);
      console.log(`   ${colorize('context:', DIM)} ${r.context}`);
      if (r.vscodeLink) console.log(`   ${colorize('vscode:', DIM)}  ${r.vscodeLink}`);
      console.log('');
    });
    if (results.length > LIST_LIMIT) {
      console.log(
        colorize(`... (${results.length - LIST_LIMIT} more issues not shown — use --limit 0 to see all)`, DIM),
      );
    }
  }

  const summary = {
    scannedRoot: ROOT,
    extensions: [...EXTS],
    filesScanned,
    issuesFound: results.length,
    errorCount: errors,
    warningCount: warnings,
    issues: results,
  };

  if (OUT) {
    try {
      await fs.mkdir(path.dirname(path.resolve(OUT)), { recursive: true });
      await fs.writeFile(OUT, JSON.stringify(summary, null, 2), 'utf8');
      console.log('Report written to', OUT);
    } catch (e) {
      console.warn('Failed to write report:', OUT, e.message);
    }
  }

  if (errors > 0) process.exit(1);
})();
