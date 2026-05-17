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
 *   node scripts/audit/13-token-diff.mjs cor-button --json
 *   node scripts/audit/13-token-diff.mjs --from a.json --to b.json --json
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { normalizeComponentName, bareName, REPO_ROOT } from './lib/component-paths.mjs';

const TOOL = 'token-diff';

const USAGE = `Usage:
  node scripts/audit/13-token-diff.mjs <component> [--figma-export <path>] [--json]
  node scripts/audit/13-token-diff.mjs --from <file> --to <file> [--json]

Modes:
  component mode: <component> = cor-X. Diffs tokens/core/components/<bare>.tokens.json
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
function loadComponentSources(componentName, figmaExportPath) {
  const bare = bareName(componentName);
  const currentPath = join(REPO_ROOT, 'tokens', 'core', 'components', `${bare}.tokens.json`);
  if (!existsSync(currentPath)) {
    return {
      error: finding({
        severity: 'warning',
        code: 'TOKEN-DIFF-NO-CURRENT',
        file: relativePathFor(currentPath),
        message: `Current tokens file not found for ${componentName}.`,
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
      }),
    };
  }
  const before = readJsonOrFail(currentPath, 'current');
  const figmaAll = readJsonOrFail(figmaAbs, 'figma export');
  const after = extractComponentBlock(figmaAll, bare);
  if (!after) {
    return {
      error: finding({
        severity: 'info',
        code: 'TOKEN-DIFF-NO-FIGMA-BLOCK',
        file: figmaExportPath,
        message: `No "${bare}" block found in Figma export — component may be unreleased or named differently in Figma.`,
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

function extractComponentBlock(figmaAll, bare) {
  // Figma exports vary in nesting; check a few common layouts.
  if (figmaAll && typeof figmaAll === 'object') {
    if (figmaAll[bare]) return { [bare]: figmaAll[bare] };
    if (figmaAll.components && figmaAll.components[bare]) {
      return { [bare]: figmaAll.components[bare] };
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
