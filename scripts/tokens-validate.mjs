#!/usr/bin/env node
// Validates the 3-tier design-token hierarchy beyond what tokens-lint and hardcoded-colors cover.
// Read-only over the filesystem. No subprocesses. Pure parsing + graph checks.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join, basename, relative, sep } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');

const args = process.argv.slice(2);
const has = flag => args.includes(flag);
const valueOf = flag => {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};

if (has('--help') || has('-h')) {
  process.stdout.write(
    `Usage: node scripts/tokens-validate.mjs [options]\n\n` +
      `  --root <dir>            Token root (default: tokens)\n` +
      `  --out <file>            Write JSON report to file\n` +
      `  --no-color              Disable ANSI colors\n` +
      `  --no-component-css      Skip per-component CSS coverage check\n` +
      `  --no-css-drift          Skip generated CSS drift check\n` +
      `  --vscode                Emit vscode://file links\n` +
      `  --help, -h              Show this help\n`,
  );
  process.exit(0);
}

const ROOT = valueOf('--root') ?? 'tokens';
const OUT = valueOf('--out');
const NO_COLOR = has('--no-color') || process.env.NO_COLOR;
const SKIP_COMPONENT_CSS = has('--no-component-css');
const SKIP_CSS_DRIFT = has('--no-css-drift');
const VSCODE = has('--vscode');

const C = NO_COLOR
  ? { red: s => s, yellow: s => s, gray: s => s, bold: s => s }
  : {
      red: s => `\x1b[31m${s}\x1b[0m`,
      yellow: s => `\x1b[33m${s}\x1b[0m`,
      gray: s => `\x1b[90m${s}\x1b[0m`,
      bold: s => `\x1b[1m${s}\x1b[0m`,
    };

const findings = [];
const push = f => findings.push(f);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'generated' || name === 'figma-export' || name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (st.isFile() && name.endsWith('.tokens.json')) out.push(full);
  }
  return out;
}

function locateKey(source, jsonPath) {
  const leaf = jsonPath.split('.').pop();
  const needle = `"${leaf}"`;
  const idx = source.indexOf(needle);
  if (idx < 0) return { line: 1, col: 1 };
  const before = source.slice(0, idx);
  const line = before.split('\n').length;
  const col = idx - before.lastIndexOf('\n');
  return { line, col };
}

function classifyTier(absFile) {
  const rel = relative(REPO_ROOT, absFile).split(sep).join('/');
  if (rel.includes('/components/')) return 'component';
  if (rel.endsWith('/palette.tokens.json')) return 'palette';
  return 'semantic';
}

function classifyMode(absFile) {
  return relative(REPO_ROOT, absFile).split(sep).join('/').includes('/core.dark/') ? 'dark' : 'light';
}

function flatten(obj, prefix = '', out = []) {
  if (obj === null || typeof obj !== 'object') return out;
  if ('$value' in obj || '$type' in obj || 'value' in obj || 'type' in obj) {
    out.push({ path: prefix, leaf: obj });
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$')) continue;
    const next = prefix ? `${prefix}.${k}` : k;
    flatten(v, next, out);
  }
  return out;
}

const refRegex = /^\{([^}]+)\}$/;

function* iterRefs(value) {
  if (typeof value === 'string') {
    const m = refRegex.exec(value.trim());
    if (m) yield m[1];
  } else if (Array.isArray(value)) {
    for (const v of value) yield* iterRefs(v);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) yield* iterRefs(v);
  }
}

const root = resolve(REPO_ROOT, ROOT);
if (!existsSync(root)) {
  process.stderr.write(`tokens-validate: --root not found: ${root}\n`);
  process.exit(2);
}

let files;
try {
  files = walk(root);
} catch (e) {
  process.stderr.write(`tokens-validate: walk failed: ${e.message}\n`);
  process.exit(2);
}

const tokens = new Map();

for (const file of files) {
  let parsed;
  let source;
  try {
    source = readFileSync(file, 'utf8');
    parsed = JSON.parse(source);
  } catch (e) {
    push({
      severity: 'error',
      code: 'parse-error',
      file,
      line: 1,
      col: 1,
      jsonPath: '',
      message: `JSON parse failed: ${e.message}`,
    });
    continue;
  }

  const tier = classifyTier(file);
  const mode = classifyMode(file);

  for (const { path, leaf } of flatten(parsed)) {
    if ('value' in leaf || 'type' in leaf) {
      push({
        severity: 'error',
        code: 'dtcg-legacy-keys',
        file,
        ...locateKey(source, path),
        jsonPath: path,
        message: `Legacy "value"/"type" keys are forbidden — use DTCG "$value"/"$type".`,
      });
    }
    if (!('$value' in leaf)) {
      push({
        severity: 'error',
        code: 'dtcg-missing-value',
        file,
        ...locateKey(source, path),
        jsonPath: path,
        message: `Leaf token is missing "$value".`,
      });
      continue;
    }
    if (!('$type' in leaf)) {
      push({
        severity: 'error',
        code: 'dtcg-missing-type',
        file,
        ...locateKey(source, path),
        jsonPath: path,
        message: `Leaf token is missing "$type".`,
      });
    }

    const $type = leaf.$type;
    const $value = leaf.$value;

    if (($type === 'dimension' || $type === 'size') && typeof $value === 'number') {
      push({
        severity: 'error',
        code: 'dtcg-bare-dimension',
        file,
        ...locateKey(source, path),
        jsonPath: path,
        message: `Dimension "$value" must be an explicit unit string (e.g. "12px"), not a bare number.`,
      });
    }

    if ($type === 'fontWeight' && typeof $value === 'string' && !$value.startsWith('{')) {
      const n = Number($value);
      if (Number.isNaN(n)) {
        push({
          severity: 'error',
          code: 'dtcg-fontweight-non-numeric',
          file,
          ...locateKey(source, path),
          jsonPath: path,
          message: `fontWeight "$value" should be numeric (e.g. 400, 600), got "${$value}".`,
        });
      }
    }

    tokens.set(`${mode}:${path}`, { file, source, leaf, tier, mode, $value, $type, path });
  }
}

function lookup(path, preferMode) {
  return tokens.get(`${preferMode}:${path}`) ?? tokens.get(`light:${path}`) ?? null;
}

for (const [, t] of tokens) {
  for (const ref of iterRefs(t.$value)) {
    const target = lookup(ref, t.mode);
    if (!target) {
      push({
        severity: 'error',
        code: 'ref-unresolved',
        file: t.file,
        ...locateKey(t.source, t.path),
        jsonPath: t.path,
        message: `Reference {${ref}} does not resolve to any token.`,
      });
      continue;
    }
    if (t.tier === 'component' && ref.startsWith('palette.')) {
      push({
        severity: 'error',
        code: 'tier-purity',
        file: t.file,
        ...locateKey(t.source, t.path),
        jsonPath: t.path,
        message: `Component-tier token references palette directly ({${ref}}). Use a semantic token instead.`,
      });
    }
  }
}

// Cycle detection
{
  const visited = new Set();
  const stack = new Set();
  function visit(key, chain) {
    if (visited.has(key)) return;
    if (stack.has(key)) {
      const t = tokens.get(key);
      if (t) {
        const cycle = [...chain, key].slice(chain.indexOf(key));
        push({
          severity: 'error',
          code: 'ref-cycle',
          file: t.file,
          ...locateKey(t.source, t.path),
          jsonPath: t.path,
          message: `Reference cycle detected: ${cycle.map(k => k.split(':')[1]).join(' -> ')}`,
        });
      }
      return;
    }
    stack.add(key);
    const t = tokens.get(key);
    if (t) {
      for (const ref of iterRefs(t.$value)) {
        const nextKey = tokens.has(`${t.mode}:${ref}`) ? `${t.mode}:${ref}` : `light:${ref}`;
        if (tokens.has(nextKey)) visit(nextKey, [...chain, key]);
      }
    }
    stack.delete(key);
    visited.add(key);
  }
  for (const key of tokens.keys()) visit(key, []);
}

// Dark-mode parity (warning) — color.* tokens only
{
  const lightColors = [...tokens.entries()].filter(([, t]) => t.mode === 'light' && t.path.startsWith('color.'));
  for (const [, t] of lightColors) {
    if (!tokens.has(`dark:${t.path}`)) {
      push({
        severity: 'warning',
        code: 'dark-mode-missing',
        file: t.file,
        ...locateKey(t.source, t.path),
        jsonPath: t.path,
        message: `Semantic color has no dark-mode override in tokens/core.dark/color.tokens.json.`,
      });
    }
  }
}

// Generated CSS drift
if (!SKIP_CSS_DRIFT) {
  const cssPath = resolve(REPO_ROOT, 'tokens/generated/core.tokens.css');
  if (existsSync(cssPath)) {
    const css = readFileSync(cssPath, 'utf8');
    const defined = new Set();
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
    for (const [, t] of tokens) {
      if (t.mode !== 'light') continue;
      const cssName =
        '--' +
        t.path
          .replace(/\./g, '-')
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .toLowerCase();
      if (!defined.has(cssName)) {
        push({
          severity: 'warning',
          code: 'css-drift',
          file: t.file,
          ...locateKey(t.source, t.path),
          jsonPath: t.path,
          message: `Token has no matching CSS variable in tokens/generated/core.tokens.css (expected ${cssName}). Run \`yarn tokens.build\`.`,
        });
      }
    }
  } else {
    push({
      severity: 'warning',
      code: 'css-missing',
      file: cssPath,
      line: 1,
      col: 1,
      jsonPath: '',
      message: `tokens/generated/core.tokens.css not found. Run \`yarn tokens.build\`.`,
    });
  }
}

// Component CSS coverage
if (!SKIP_COMPONENT_CSS) {
  const componentTokenFiles = files.filter(f => f.split(sep).join('/').includes('/tokens/core/components/'));
  for (const file of componentTokenFiles) {
    const name = basename(file).replace(/\.tokens\.json$/, '');
    const cssPath = resolve(REPO_ROOT, `src/components/cor-${name}/cor-${name}.css`);
    if (!existsSync(cssPath)) continue;
    const css = readFileSync(cssPath, 'utf8');
    const componentPrefix = `--${name}-`;
    const usedVars = new Set();
    for (const m of css.matchAll(/var\((--[a-z0-9-]+)/g)) {
      if (m[1].startsWith(componentPrefix)) usedVars.add(m[1]);
    }
    const tokenKeys = [...tokens.keys()].filter(k => k.startsWith('light:'));
    for (const v of usedVars) {
      const tail = v.slice(componentPrefix.length);
      const normalizedVar = tail.toLowerCase().replace(/-/g, '');
      const matched = tokenKeys.some(k => {
        const kp = k.slice('light:'.length);
        if (!kp.startsWith(`${name}.`)) return false;
        const normalizedKp = kp
          .slice(name.length + 1)
          .toLowerCase()
          .replace(/[.-]/g, '');
        return normalizedKp === normalizedVar;
      });
      if (!matched) {
        push({
          severity: 'warning',
          code: 'css-uses-undefined-token',
          file: cssPath,
          line: 1,
          col: 1,
          jsonPath: `${name}.${tail}`,
          message: `${cssPath} references ${v} but no matching token exists under "${name}.*".`,
        });
      }
    }
  }
}

// Report
findings.sort((a, b) => {
  if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  return a.line - b.line;
});

const errors = findings.filter(f => f.severity === 'error');
const warnings = findings.filter(f => f.severity === 'warning');

const stdout = process.stdout;
function emit(s) {
  stdout.write(s + '\n');
}

for (const f of findings) {
  const rel = relative(REPO_ROOT, f.file).split(sep).join('/');
  const tag = f.severity === 'error' ? C.red('error') : C.yellow('warning');
  const loc = VSCODE ? `vscode://file/${f.file}:${f.line}:${f.col}` : `${rel}:${f.line}:${f.col}`;
  emit(`${tag} [${f.code}] ${loc}`);
  if (f.jsonPath) emit(C.gray(`  at JSON path: ${f.jsonPath}`));
  emit(`  ${f.message}`);
  emit('');
}

emit(
  C.bold(`tokens-validate: ${errors.length} error(s), ${warnings.length} warning(s) across ${files.length} file(s).`),
);

if (OUT) {
  try {
    writeFileSync(OUT, JSON.stringify({ root: ROOT, files: files.length, findings }, null, 2));
  } catch (e) {
    process.stderr.write(`tokens-validate: failed to write report to ${OUT}: ${e.message}\n`);
  }
}

process.exit(errors.length > 0 ? 1 : 0);
