#!/usr/bin/env node
// Validates the 3-tier design-token hierarchy beyond what tokens-lint and hardcoded-colors cover.
// Read-only over the filesystem. No subprocesses. Pure parsing + graph checks.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join, basename, relative, sep } from 'node:path';
import StyleDictionary from 'style-dictionary';

const REPO_ROOT = resolve(import.meta.dirname, '..');

// The CSS variable a token path becomes — the same `name/kebab` transform the build configs use, so
// `stackZIndex` maps to `stack-z-index` exactly as in tokens/generated/core.tokens.css.
const nameKebab = StyleDictionary.hooks.transforms['name/kebab'];
const cssVarName = tokenPath => `--${nameKebab.transform({ path: tokenPath.split('.') }, {})}`;

// A component token may reference the palette only when it states why, e.g. colours that must not
// follow the theme: "$extensions": { "md.egov.mud": { "tierPurityException": "<reason>" } }.
const EXTENSIONS_NAMESPACE = 'md.egov.mud';
const tierPurityException = leaf => leaf.$extensions?.[EXTENSIONS_NAMESPACE]?.tierPurityException;

const args = process.argv.slice(2);
const has = flag => args.includes(flag);
const valueOf = flag => {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};

if (has('--help') || has('-h')) {
  process.stdout.write(
    `Usage: node scripts/tokens-validate.mjs [options]\n\n` +
      `  --root <dir>            Token root (default: tokens); generated CSS is read from <root>/generated,\n` +
      `                          component CSS from <root>/../src/components\n` +
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
  const exception = tierPurityException(t.leaf);
  const hasExceptionReason = typeof exception === 'string' && exception.trim() !== '';
  let referencesPalette = false;
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
      referencesPalette = true;
      if (hasExceptionReason) continue;
      push({
        severity: 'error',
        code: 'tier-purity',
        file: t.file,
        ...locateKey(t.source, t.path),
        jsonPath: t.path,
        message:
          exception === undefined
            ? `Component-tier token references palette directly ({${ref}}). Use a semantic token instead.`
            : `Component-tier token references palette directly ({${ref}}) and its "${EXTENSIONS_NAMESPACE}".tierPurityException has no reason.`,
      });
    }
  }
  if (exception !== undefined && !referencesPalette) {
    push({
      severity: 'warning',
      code: 'tier-purity-exception-unused',
      file: t.file,
      ...locateKey(t.source, t.path),
      jsonPath: t.path,
      message: `Token carries "${EXTENSIONS_NAMESPACE}".tierPurityException but no component-tier palette reference. Remove the marker.`,
    });
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

// Dark-mode parity (warning). Every color.* token needs a dark override. So does any other
// non-component colour that cannot follow the theme on its own: a hex literal or a direct palette
// reference resolves to the same value in both modes (focusRing.color.halo, #75), while a reference
// to a semantic token (`{color.border.brand.focus-ring}`) picks up that token's dark override.
{
  // These look right in either theme: nothing to see, or the element's own text colour. Not
  // `inherit`: a CSS-wide keyword in a custom property applies to the property itself, so
  // `var(--x)` never receives it.
  const THEME_NEUTRAL_KEYWORDS = new Set(['transparent', 'currentcolor']);
  const isThemeNeutral = t => typeof t.$value === 'string' && THEME_NEUTRAL_KEYWORDS.has(t.$value.trim().toLowerCase());
  const isThemeBlind = t => {
    const refs = [...iterRefs(t.$value)];
    return refs.length === 0 || refs.every(ref => ref.startsWith('palette.'));
  };
  const needsDark = t =>
    t.mode === 'light' &&
    !isThemeNeutral(t) &&
    (t.path.startsWith('color.') || (t.tier === 'semantic' && t.$type === 'color' && isThemeBlind(t)));
  for (const t of tokens.values()) {
    if (needsDark(t) && !tokens.has(`dark:${t.path}`)) {
      push({
        severity: 'warning',
        code: 'dark-mode-missing',
        file: t.file,
        ...locateKey(t.source, t.path),
        jsonPath: t.path,
        message: t.path.startsWith('color.')
          ? `Semantic color has no dark-mode override in tokens/core.dark/color.tokens.json.`
          : `Colour resolves to the same value in both themes and has no dark-mode override under tokens/core.dark/.`,
      });
    }
  }
}

// Generated CSS drift
if (!SKIP_CSS_DRIFT) {
  const cssPath = resolve(root, 'generated/core.tokens.css');
  if (existsSync(cssPath)) {
    const css = readFileSync(cssPath, 'utf8');
    const defined = new Set();
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
    for (const [, t] of tokens) {
      if (t.mode !== 'light') continue;
      const cssName = cssVarName(t.path);
      if (!defined.has(cssName)) {
        push({
          severity: 'warning',
          code: 'css-drift',
          file: t.file,
          ...locateKey(t.source, t.path),
          jsonPath: t.path,
          message: `Token has no matching CSS variable in ${relative(REPO_ROOT, cssPath)} (expected ${cssName}). Run \`yarn tokens.build\`.`,
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
      message: `${relative(REPO_ROOT, cssPath)} not found. Run \`yarn tokens.build\`.`,
    });
  }
}

// Component CSS coverage
if (!SKIP_COMPONENT_CSS) {
  const componentTokenFiles = files.filter(f => f.split(sep).join('/').includes('/tokens/core/components/'));
  // A token root may be camelCase (`dateInput` in date-input.tokens.json); compare generated names.
  const tokenVars = new Set([...tokens.values()].filter(t => t.mode === 'light').map(t => cssVarName(t.path)));
  const componentsDir = resolve(root, '..', 'src/components');
  if (componentTokenFiles.length > 0 && !existsSync(componentsDir)) {
    push({
      severity: 'warning',
      code: 'component-css-missing',
      file: componentsDir,
      line: 1,
      col: 1,
      jsonPath: '',
      message: `${relative(REPO_ROOT, componentsDir)} not found, so component CSS coverage was not checked. --root must be the tokens directory next to src/.`,
    });
  }
  for (const file of componentTokenFiles) {
    const name = basename(file).replace(/\.tokens\.json$/, '');
    const cssPath = resolve(componentsDir, `mud-${name}/mud-${name}.css`);
    if (!existsSync(cssPath)) continue;
    const css = readFileSync(cssPath, 'utf8');
    const componentPrefix = `--${name}-`;
    // Custom properties the stylesheet sets itself (`--tooltip-arrow-size: var(--tooltip-arrow-size-sm)`).
    const declaredVars = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
    const usedVars = new Set();
    // A fallback does not make a variable intentional: a misspelled token name behind one renders the
    // fallback silently, so fallback reads are checked like any other.
    for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
      if (m[1].startsWith(componentPrefix)) usedVars.add(m[1]);
    }
    for (const v of usedVars) {
      const tail = v.slice(componentPrefix.length);
      if (!tokenVars.has(v) && !declaredVars.has(v)) {
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
