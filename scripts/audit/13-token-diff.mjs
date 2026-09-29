#!/usr/bin/env node
/**
 * 13-token-diff.mjs
 *
 * Diffs DTCG token JSON between two sources and reports added / removed /
 * changed tokens. Used during redesign workflows to see exactly what changed
 * when a Figma export arrives.
 *
 * Compares two files (or a current component-token file vs a Figma export):
 *
 *   1. Component mode (default):
 *      Compares `tokens/core/components/<bare>.tokens.json` against the entry
 *      for the same component inside `tokens-tokenhaus.json` (Figma export).
 *
 *   2. File mode (--from / --to):
 *      Diffs two arbitrary DTCG JSON files.
 *
 * Output:
 *   { added: [...], removed: [...], changed: [{ token, before, after, before$type, after$type }], summary: { count } }
 *
 * Replaces AI work in:
 *   - `.claude/agents/redesign-component.md` Step 3 (token diff)
 *   - `.claude/commands/modify-component.md` partial (when adding variants)
 *
 * Usage:
 *   node scripts/audit/13-token-diff.mjs mud-button --json
 *   node scripts/audit/13-token-diff.mjs --from a.json --to b.json --json
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { normalizeComponentName, bareName, REPO_ROOT, resolveComponentPaths } from './lib/component-paths.mjs';
import { tokenOwner } from './lib/token-match.mjs';

const TOOL = 'token-diff';

const USAGE = `Usage:
  node scripts/audit/13-token-diff.mjs <component> [--figma-export <path>] [--json]
  node scripts/audit/13-token-diff.mjs --from <file> --to <file> [--json]

Modes:
  component mode: <component> = mud-X. Diffs tokens/core/components/<bare>.tokens.json
                  against the matching block in <figma-export> (default: tokens-tokenhaus.json).
  file mode:      --from / --to point to two DTCG JSON files; the entire structures are diffed.

Output options:
  --json        Emit JSON envelope to stdout
  --out <file>  Write JSON envelope to file
  --no-color    Disable ANSI colors
  --help, -h    Show this help`;

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        'from': { type: 'string' },
        'to': { type: 'string' },
        'figma-export': { type: 'string', default: 'tokens-tokenhaus.json' },
        'json': { type: 'boolean', default: false },
        'out': { type: 'string' },
        'no-color': { type: 'boolean', default: false },
        'help': { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n${USAGE}\n`);
    process.exit(EXIT_INTERNAL);
  }
  if (parsed.values.help) {
    process.stdout.write(`${USAGE}\n`);
    process.exit(0);
  }
  return {
    component: parsed.positionals[0] ?? null,
    from: parsed.values.from ?? null,
    to: parsed.values.to ?? null,
    figmaExport: parsed.values['figma-export'],
    json: parsed.values.json,
    out: parsed.values.out ?? null,
    noColor: parsed.values['no-color'],
  };
}

async function main() {
  const args = parseCli();
  const t0 = Date.now();

  const mode = resolveMode(args);
  if (!mode.ok) {
    process.stderr.write(`${TOOL}: ${mode.error}\n\n${USAGE}\n`);
    process.exit(EXIT_INTERNAL);
  }

  let before;
  let after;
  let target;
  let findings = [];
  try {
    if (mode.kind === 'file') {
      before = readJsonOrFail(mode.from, 'before');
      after = readJsonOrFail(mode.to, 'after');
      target = `${mode.from} vs ${mode.to}`;
    } else {
      const sources = loadComponentSources(mode.componentName, mode.figmaExport);
      if (sources.error) {
        findings.push(sources.error);
        await emit(
          buildResult({
            tool: TOOL,
            target: mode.componentName,
            findings,
            meta: { durationMs: Date.now() - t0 },
          }),
          args,
        );
        process.exit(sources.error.severity === 'error' ? 1 : 0);
      }
      before = sources.before;
      after = sources.after;
      target = mode.componentName;
    }
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n`);
    process.exit(EXIT_INTERNAL);
  }

  const diff = diffTokens(before, after);

  const result = buildResult({
    tool: TOOL,
    target,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      summary: {
        added: diff.added.length,
        removed: diff.removed.length,
        changed: diff.changed.length,
        unchanged: diff.unchanged,
      },
      diff,
    },
  });

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Resolve the diff mode (component vs file). Pure function — exported for tests.
 */
export function resolveMode(args) {
  const hasFromTo = args.from && args.to;
  if (hasFromTo) {
    return { ok: true, kind: 'file', from: args.from, to: args.to };
  }
  if (args.from || args.to) {
    return { ok: false, error: '--from and --to must be provided together.' };
  }
  if (!args.component) {
    return { ok: false, error: 'must specify a component name or both --from and --to.' };
  }
  const name = normalizeComponentName(args.component);
  if (!name) {
    return { ok: false, error: `invalid component name: ${args.component}` };
  }
  return { ok: true, kind: 'component', componentName: name, figmaExport: args.figmaExport };
}

/**
 * Load `tokens/core/components/<bare>.tokens.json` (current) and the matching
 * block inside the Figma export. Returns { before, after, error? }.
 */
const TOKENS_DIR = join(REPO_ROOT, 'tokens', 'core', 'components');

/**
 * Every custom property a stylesheet READS but does not itself declare, split
 * by whether the read carries a fallback. `var(--icon-color, currentColor)`
 * cannot be "missing": the fallback makes the property optional by
 * construction, so it is a styling API the component publishes, never a token
 * it expects someone else to define. A fallback-less read is the opposite —
 * the component only renders correctly once something defines it. Pure.
 *
 * @returns {{ required: string[], api: string[] }} both sorted, disjoint
 */
export function undeclaredCustomProperties(cssText) {
  // A commented-out declaration or read is not code.
  const css = String(cssText ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
  const declared = new Set([...css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map(m => m[1]));
  const withFallback = new Map();
  for (const m of css.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*(,?)/g)) {
    const [, name, comma] = m;
    if (declared.has(name)) continue;
    // One fallback-less read is enough to make the property required.
    withFallback.set(name, (withFallback.get(name) ?? true) && comma === ',');
  }
  const pick = wanted =>
    [...withFallback]
      .filter(([, hasFallback]) => hasFallback === wanted)
      .map(([n]) => n)
      .sort();
  return { required: pick(false), api: pick(true) };
}

/**
 * Which tokens file a component's CSS draws on (Decision 13). Its own
 * `<bare>.tokens.json` when present; otherwise the component token file that
 * owns the most custom properties the CSS reads without declaring them
 * (`mud-text-input` → `input.tokens.json`). Ownership is `tokenOwner`'s
 * longest-name match, the same rule `15-style-parity` names tokens by, so
 * `--button-group-*` is never a `button` token.
 *
 * `file: null` means no component token file owns anything this CSS reads.
 * `required` / `api` then say whether that is a gap or a design: a
 * fallback-less `--<bare>-*` read with no file behind it is a missing input
 * (`noTarget`), while one that always carries a fallback is published API.
 *
 * @returns {{ file: string | null, abs: string | null, required: string[], api: string[] }}
 */
export function resolveTokensFile(componentName, { tokensDir = TOKENS_DIR } = {}) {
  const bare = bareName(componentName);
  const resolved = resolveComponentPaths(componentName);
  const css = resolved.found
    ? readdirSync(resolved.root)
        .filter(f => f.endsWith('.css'))
        .map(f => readFileSync(join(resolved.root, f), 'utf8'))
        .join('\n')
    : '';
  const undeclared = undeclaredCustomProperties(css);
  const ownPrefix = `--${bare}-`;
  const scoped = {
    required: undeclared.required.filter(v => v.startsWith(ownPrefix)),
    api: undeclared.api.filter(v => v.startsWith(ownPrefix)),
  };

  const own = join(tokensDir, `${bare}.tokens.json`);
  if (existsSync(own)) return { file: relativePathFor(own), abs: own, ...scoped };

  const components = (existsSync(tokensDir) ? readdirSync(tokensDir) : [])
    .filter(n => n.endsWith('.tokens.json'))
    .map(n => n.replace(/\.tokens\.json$/, ''))
    .sort();
  const counts = new Map();
  for (const v of [...undeclared.required, ...undeclared.api]) {
    const owner = tokenOwner(v, components);
    if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  let best = { count: 0, name: null };
  for (const name of components) {
    const count = counts.get(name) ?? 0;
    if (count > best.count) best = { count, name };
  }
  if (!best.name) return { file: null, abs: null, ...scoped };
  const abs = join(tokensDir, `${best.name}.tokens.json`);
  return { file: relativePathFor(abs), abs, ...scoped };
}

/** Exported for tests (S6, Decision 13): the `TOKEN-DIFF-NO-CURRENT` / `TOKEN-DIFF-NO-FIGMA-EXPORT` sites. */
export function loadComponentSources(componentName, figmaExportPath, { tokensDir = TOKENS_DIR } = {}) {
  const bare = bareName(componentName);
  const { abs: currentPath, required, api } = resolveTokensFile(componentName, { tokensDir });
  if (!currentPath) {
    const expected = relativePathFor(join(tokensDir, `${bare}.tokens.json`));
    // Decision 13, and the component's own prefix is what decides between the
    // two shapes. A fallback-less `--<bare>-*` read with no file behind it is a
    // missing input: the row could not diff anything it should have been able
    // to diff, so INCOMPLETE rather than a silent pass.
    if (required.length) {
      return {
        error: finding({
          severity: 'warning',
          code: 'TOKEN-DIFF-NO-CURRENT',
          file: expected,
          message: `${componentName}'s CSS reads ${required.join(', ')} with no fallback, and no file under tokens/core/components/ defines them — there is nothing to diff against.`,
          fix: `create ${expected} with the component's tokens, or give the custom properties a fallback if they are a styling API`,
          noTarget: true,
        }),
      };
    }
    // Everything else is a design, not a gap, and the message says which:
    // published styling API (always read with a fallback), or no component
    // tokens at all. Visible on the row as a not-applicable note.
    const reason = api.length
      ? `its only own custom ${api.length === 1 ? 'property is' : 'properties are'} ${api.join(', ')}, always read with a fallback — published styling API, not tokens`
      : 'no var(--…) in its CSS is owned by a file in tokens/core/components/';
    return {
      error: finding({
        code: 'TOKEN-DIFF-NO-CURRENT',
        file: expected,
        message: `${componentName} uses no component tokens (${reason}) — token diff not applicable.`,
        notApplicable: true,
      }),
    };
  }
  const figmaAbs = join(REPO_ROOT, figmaExportPath);
  if (!existsSync(figmaAbs)) {
    return {
      error: finding({
        severity: 'warning',
        code: 'TOKEN-DIFF-NO-FIGMA-EXPORT',
        file: figmaExportPath,
        message: `Figma export not found at ${figmaExportPath}. Run \`yarn sync:tokens\` (Tokenhaus pipeline) to refresh it.`,
        noTarget: true,
      }),
    };
  }
  const before = readJsonOrFail(currentPath, 'current');
  const figmaAll = readJsonOrFail(figmaAbs, 'figma export');
  const root = componentRoot(before, bare);
  const after = extractComponentBlock(figmaAll, bare, root);
  if (!after) {
    const names = root === bare ? `"${bare}"` : `"${bare}" or "${root}"`;
    // The export is the Tokenhaus pipeline's, and it carries only global
    // foundations today — no component block for ANY component. The row would
    // otherwise report `info` and read as a pass while comparing nothing, so
    // it says on the row that it did not apply, and why.
    // Baseline: `node -p "Object.keys(require('./tokens-tokenhaus.json')).join('|')"`
    // → 8 keys, all global foundations ("3. Sizes", "1. Semantic Colors", …),
    // not one component block.
    return {
      error: finding({
        code: 'TOKEN-DIFF-NO-FIGMA-BLOCK',
        file: figmaExportPath,
        message: `No ${names} block found in ${figmaExportPath} — the Figma export carries no tokens for this component, so there is nothing to diff against. Token diff not applicable.`,
        notApplicable: true,
      }),
    };
  }
  return { before, after };
}

function readJsonOrFail(path, label) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    throw new Error(`cannot read ${label} (${path}): ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`cannot parse JSON for ${label} (${path}): ${err.message}`);
  }
}

function relativePathFor(absPath) {
  return absPath
    .replace(REPO_ROOT, '')
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/');
}

export function componentRoot(doc, bare) {
  const roots = doc && typeof doc === 'object' ? Object.keys(doc).filter(key => !key.startsWith('$')) : [];
  return roots[0] ?? bare;
}

// The block comes back under `root`, the current file's own root key (`searchInput` in
// search-input.tokens.json), or every flattened path differs from the current file's and the
// diff reports each token as removed and re-added. The export may name it either way.
export function extractComponentBlock(figmaAll, bare, root = bare) {
  // Figma exports vary in nesting; check a few common layouts.
  if (!figmaAll || typeof figmaAll !== 'object') return null;
  for (const scope of [figmaAll, figmaAll.components]) {
    for (const name of [bare, root]) {
      if (scope && scope[name]) return { [root]: scope[name] };
    }
  }
  return null;
}

/**
 * Flatten a DTCG token tree into a map of dotted path → leaf descriptor.
 * Stops at any node containing `$value` or `$type`. Pure function — exported.
 *
 *   { button: { fontSize: { $value: "{fontSize.14}", $type: "dimension" } } }
 *     → { "button.fontSize": { value: "{fontSize.14}", type: "dimension" } }
 */
export function flattenDtcg(obj, prefix = '', out = {}) {
  if (obj === null || typeof obj !== 'object') return out;
  if ('$value' in obj) {
    out[prefix] = { value: obj.$value, type: obj.$type ?? null };
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$')) continue;
    const next = prefix ? `${prefix}.${k}` : k;
    flattenDtcg(v, next, out);
  }
  return out;
}

/**
 * Diff two DTCG token trees. Pure function — exported for tests.
 *
 * Returns:
 *   {
 *     added:    [{ token, after }],
 *     removed:  [{ token, before }],
 *     changed:  [{ token, before, after, before$type, after$type }],
 *     unchanged: count
 *   }
 */
export function diffTokens(beforeTree, afterTree) {
  const beforeFlat = flattenDtcg(beforeTree);
  const afterFlat = flattenDtcg(afterTree);

  const added = [];
  const removed = [];
  const changed = [];
  let unchanged = 0;

  const allKeys = new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)]);
  for (const key of [...allKeys].sort()) {
    const b = beforeFlat[key];
    const a = afterFlat[key];

    if (!b && a) {
      added.push({ token: key, after: a.value, ['$type']: a.type });
      continue;
    }
    if (b && !a) {
      removed.push({ token: key, before: b.value, ['$type']: b.type });
      continue;
    }
    if (b.value === a.value && b.type === a.type) {
      unchanged++;
      continue;
    }
    changed.push({
      token: key,
      before: b.value,
      after: a.value,
      ['before$type']: b.type,
      ['after$type']: a.type,
    });
  }

  return { added, removed, changed, unchanged };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
