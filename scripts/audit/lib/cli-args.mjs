/**
 * Shared CLI argument parsing for all scripts/audit/* tools.
 *
 * Every audit script accepts a common base set of flags:
 *   <componentName | --all | --changed>   — what to audit
 *   --json                                 — emit machine-readable JSON to stdout
 *   --out <file>                           — write JSON to file (overrides --json)
 *   --vscode                               — emit vscode://file links in human output
 *   --no-color                             — disable ANSI colors
 *   --help, -h                             — print usage and exit 0
 *
 * Tool-specific flags can be added by passing extra `options` to `parseAuditArgs`.
 */
import { parseArgs } from 'node:util';
import { EXIT_INTERNAL } from './exit-codes.mjs';

const BASE_OPTIONS = {
  'all': { type: 'boolean', default: false },
  'changed': { type: 'boolean', default: false },
  'json': { type: 'boolean', default: false },
  'out': { type: 'string' },
  'vscode': { type: 'boolean', default: false },
  'no-color': { type: 'boolean', default: false },
  'help': { type: 'boolean', short: 'h', default: false },
};

/**
 * Parse argv into a normalized object.
 *
 * @param {object} opts
 * @param {string[]} [opts.argv]    — defaults to process.argv.slice(2)
 * @param {object}   [opts.extra]   — extra options merged into BASE_OPTIONS (parseArgs format)
 * @param {string}   [opts.toolName] — used in help output
 * @param {string}   [opts.usage]   — full usage block printed on --help
 * @returns {{ component:string|null, all:boolean, changed:boolean, json:boolean, out:string|null, vscode:boolean, noColor:boolean, extras:object, positionals:string[] }}
 */
export function parseAuditArgs({
  argv = process.argv.slice(2),
  extra = {},
  toolName = 'audit-script',
  usage = '',
} = {}) {
  const options = { ...BASE_OPTIONS, ...extra };
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options, allowPositionals: true, strict: true });
  } catch (err) {
    process.stderr.write(`${toolName}: ${err.message}\n`);
    if (usage) process.stderr.write(`\n${usage}\n`);
    process.exit(2);
  }

  if (parsed.values.help) {
    process.stdout.write(`${usage}\n`);
    process.exit(0);
  }

  const positional = parsed.positionals[0] ?? null;
  const result = {
    component: positional,
    all: parsed.values.all,
    changed: parsed.values.changed,
    json: parsed.values.json,
    out: parsed.values.out ?? null,
    vscode: parsed.values.vscode,
    noColor: parsed.values['no-color'],
    positionals: parsed.positionals,
    extras: {},
  };

  // Surface tool-specific extras separately so callers can ignore base flags.
  for (const key of Object.keys(extra)) {
    result.extras[key] = parsed.values[key];
  }

  // Mutual-exclusion guard: must specify exactly one of component, --all, or --changed.
  const targetCount = [result.component, result.all, result.changed].filter(Boolean).length;
  if (targetCount === 0) {
    process.stderr.write(`${toolName}: must specify a component name, --all, or --changed (got none).\n\n${usage}\n`);
    process.exit(2);
  }
  if (targetCount > 1) {
    process.stderr.write(`${toolName}: choose exactly one of <component>, --all, --changed (got ${targetCount}).\n`);
    process.exit(2);
  }

  return result;
}

/**
 * Build a standard usage string. Tools can override and extend.
 */
export function defaultUsage(toolName, summary, extraLines = []) {
  return [
    `Usage: node scripts/audit/${toolName}.mjs <component> [options]`,
    '',
    summary,
    '',
    'Targets (choose one):',
    '  <mud-name>          Audit a single component (e.g. mud-button or button)',
    '  --all               Audit every mud-* component under src/components and src/hidden',
    '  --changed           Audit components touched in git diff (HEAD vs main)',
    '',
    'Output:',
    '  --json              Emit a machine-readable JSON envelope to stdout',
    '  --out <file>        Write the JSON envelope to a file',
    '  --vscode            Add vscode://file links to human output',
    '  --no-color          Disable ANSI colors',
    '  --help, -h          Show this help',
    ...(extraLines.length ? ['', ...extraLines] : []),
  ].join('\n');
}

/** Audit depths, shallowest first (plan `2026-09-21-audit-component-depths.md` Decision §1). */
export const DEPTHS = Object.freeze(['quick', 'standard', 'deep']);
export const DEFAULT_DEPTH = 'standard';

/**
 * Resolve `--depth` and its two legacy spellings into one depth: `--fast` is
 * an alias of `quick` (kept for `pre-pr-check`), `--e2e` folds into `deep`.
 * A legacy flag that contradicts an explicit `--depth` is a usage error rather
 * than a silent pick. Pure.
 *
 * @returns {{ depth: string } | { error: string }}
 */
export function resolveDepth({ depth, fast = false, e2e = false } = {}) {
  if (depth !== undefined && !DEPTHS.includes(depth)) {
    return { error: `--depth must be one of ${DEPTHS.join(', ')} (got "${depth}")` };
  }
  if (fast && e2e) return { error: '--fast (quick) and --e2e (deep) contradict each other' };
  const implied = fast ? 'quick' : e2e ? 'deep' : undefined;
  if (implied && depth !== undefined && depth !== implied) {
    return { error: `--${fast ? 'fast' : 'e2e'} means --depth ${implied}, which contradicts --depth ${depth}` };
  }
  return { depth: depth ?? implied ?? DEFAULT_DEPTH };
}

const RUN_ALL_TOOL = 'run-all';

/**
 * `run-all.mjs`'s own usage text (Decision §8 of
 * `2026-09-22-audit-depths-sentinel-fixes.md`: moved here, beside
 * `resolveDepth`, so `verdict.mjs` can validate the same flags before
 * spawning run-all as a child process, exiting 2 on a usage error itself
 * rather than letting a spawned failure read back as INCOMPLETE).
 */
export const RUN_ALL_USAGE = `Usage: node scripts/audit/run-all.mjs <component | --all | --changed> [options]

Run the audit checks a depth requires in waves and aggregate the results into
a single JSON envelope. AI agents should call this instead of dispatching each
script individually; gate callers use \`yarn audit:component\` (verdict.mjs).

Targets (choose one):
  <mud-name>          Audit one component (e.g. mud-button or button)
  --all               Audit every mud-* component, one pipeline each
  --changed           Audit components touched in git diff vs main, one pipeline each

Depth:
  --depth <d>         quick | standard | deep (default: standard)
                        quick     lint + Wave A; no build, no browser
                        standard  quick + prerequisites + Waves B and C
                        deep      standard + figma-refs --check, adapter builds,
                                  E2E (deferred) and the AI-leg rows
  --fast              Deprecated alias of --depth quick
  --e2e               Folded into --depth deep

Options:
  --json              Emit the combined JSON envelope to stdout (default human summary)
  --out <file>        Write the combined JSON envelope to a file
  --skip <ids>        Comma-separated list of check ids to skip (e.g. 06,08)
  --only <ids>        Comma-separated list — only run these checks. A required id dropped
                      by --skip / --only makes the verdict INCOMPLETE.
  --no-browser        Excuse the browser checks (Wave C and the browser AI legs);
                      the verdict level is capped at CLEAN-STATIC.
  --ci                Same as --no-browser, and sets meta.ciDetected. Also enabled
                      when process.env.CI is set.
  --no-figma          Excuse the Figma checks (11, 15, figma-refs, the Figma AI leg)
                      for this run; deep is then capped at MERGE-READY.
  --figma-dir <dir>   Forwarded to 11-pixel-diff-states (reference PNGs)
  --verdict           Also write audit/<component>/runs/<run>/, verdict.json,
                      fix-brief.md and audit/_run/summary.json (verdict.mjs does this)
  --audit-dir <dir>   Root for --verdict output (default: audit/)
  --no-color          Disable ANSI colors
  --help, -h          Show this help`;

/**
 * Parse `run-all.mjs`'s own argv. `env` is injectable so a test can set `CI`
 * without touching the real environment. Exits the process (2) on a usage
 * error — verdict.mjs's fresh mode calls this before spawning run-all so a
 * usage error surfaces as exit 2 there too, never as a spawned INCOMPLETE (S9).
 */
export function parseCli(argv = process.argv.slice(2), env = process.env) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        'all': { type: 'boolean', default: false },
        'changed': { type: 'boolean', default: false },
        'json': { type: 'boolean', default: false },
        'out': { type: 'string' },
        'skip': { type: 'string', default: '' },
        'only': { type: 'string', default: '' },
        'depth': { type: 'string' },
        'fast': { type: 'boolean', default: false },
        'e2e': { type: 'boolean', default: false },
        'no-browser': { type: 'boolean', default: false },
        'no-figma': { type: 'boolean', default: false },
        'ci': { type: 'boolean', default: false },
        'figma-dir': { type: 'string' },
        'verdict': { type: 'boolean', default: false },
        'audit-dir': { type: 'string' },
        'no-color': { type: 'boolean', default: false },
        'help': { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    process.stderr.write(`${RUN_ALL_TOOL}: ${err.message}\n\n${RUN_ALL_USAGE}\n`);
    process.exit(EXIT_INTERNAL);
  }
  if (parsed.values.help) {
    process.stdout.write(`${RUN_ALL_USAGE}\n`);
    process.exit(0);
  }
  const component = parsed.positionals[0] ?? null;
  const all = parsed.values.all;
  const changed = parsed.values.changed;
  const targetCount = [component, all, changed].filter(Boolean).length;
  if (targetCount === 0) {
    process.stderr.write(`${RUN_ALL_TOOL}: choose a component, --all, or --changed.\n\n${RUN_ALL_USAGE}\n`);
    process.exit(EXIT_INTERNAL);
  }
  if (targetCount > 1) {
    process.stderr.write(`${RUN_ALL_TOOL}: choose exactly one of <component>, --all, --changed.\n`);
    process.exit(EXIT_INTERNAL);
  }
  const depth = resolveDepth({ depth: parsed.values.depth, fast: parsed.values.fast, e2e: parsed.values.e2e });
  if (depth.error) {
    process.stderr.write(`${RUN_ALL_TOOL}: ${depth.error}\n`);
    process.exit(EXIT_INTERNAL);
  }
  // CI mode: the explicit --ci flag or any truthy CI env var (GitHub Actions,
  // GitLab CI, CircleCI, … all set CI=true). Either excuses the browser checks
  // and caps the level (Decision §6); the verdict names which one.
  const ciEnv = Boolean(env.CI);
  const ci = parsed.values.ci || ciEnv;
  const noBrowser = parsed.values['no-browser'];
  const browserWaiver = ciEnv ? 'CI env' : parsed.values.ci || noBrowser ? 'flag' : null;
  return {
    component,
    all,
    changed,
    depth: depth.depth,
    json: parsed.values.json,
    out: parsed.values.out ?? null,
    skip: splitIds(parsed.values.skip),
    only: splitIds(parsed.values.only),
    noBrowser,
    noFigma: parsed.values['no-figma'],
    ci,
    browserWaiver,
    figmaDir: parsed.values['figma-dir'] ?? null,
    verdict: parsed.values.verdict,
    auditDir: parsed.values['audit-dir'] ?? null,
    noColor: parsed.values['no-color'],
  };
}

function splitIds(s) {
  return new Set(
    s
      .split(',')
      .map(x => x.trim())
      .filter(Boolean),
  );
}
