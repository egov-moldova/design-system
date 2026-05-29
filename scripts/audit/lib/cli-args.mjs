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
