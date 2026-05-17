#!/usr/bin/env node
/**
 * 01-component-structure.mjs
 *
 * Verifies the canonical file layout of a `cor-*` component:
 *   - REQUIRED:  cor-X.tsx, cor-X.css, cor-X.stories.ts, test/cor-X.spec.tsx, readme.md
 *   - OPTIONAL:  cor-X.types.ts, cor-X.enums.ts, cor-X.constants.ts, test/cor-X.e2e.ts
 *   - TOKENS:    tokens/core/components/<bare>.tokens.json (warning if missing)
 *
 * Also reports the component's location (`components` vs `hidden`) so callers
 * know whether it's graduated to production.
 *
 * Replaces AI work in:
 *   - `.claude/skills/audit-component/SKILL.md` Wave 2.1
 *   - `.claude/agents/audit-production.md` Phase 1.1
 *
 * Usage:
 *   node scripts/audit/01-component-structure.mjs cor-button [--json] [--out file]
 *   node scripts/audit/01-component-structure.mjs --all --json
 */
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';

const TOOL = 'component-structure';

const USAGE = defaultUsage(
  '01-component-structure',
  'Verify a component has all required files (TSX, CSS, stories, spec, readme, tokens).',
);

const REQUIRED_KINDS = ['tsx', 'css', 'stories', 'spec', 'readme'];
const OPTIONAL_KINDS = ['types', 'enums', 'constants', 'e2e'];
const TOKEN_KIND = 'tokens';

async function main() {
  const args = parseAuditArgs({ toolName: TOOL, usage: USAGE });
  const t0 = Date.now();

  const targets = await resolveTargets(args);
  if (!targets.length) {
    // `--changed` with no touched components is a clean no-op, not an error.
    if (args.changed) {
      const empty = buildResult({
        tool: TOOL,
        target: 'changed',
        findings: [],
        meta: { durationMs: Date.now() - t0, componentsScanned: 0, note: 'no changed components' },
      });
      await emit(empty, args);
      process.exit(0);
    }
    process.stderr.write(`${TOOL}: no components matched.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const findings = [];
  let scanned = 0;
  let totalRequiredMissing = 0;
  let totalOptionalMissing = 0;

  for (const target of targets) {
    const result = analyzeComponent(target);
    findings.push(...result.findings);
    scanned++;
    totalRequiredMissing += result.requiredMissing;
    totalOptionalMissing += result.optionalMissing;
  }

  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: scanned,
      requiredMissing: totalRequiredMissing,
      optionalMissing: totalOptionalMissing,
    },
  });

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Analyze a single component. Pure function — exported for tests.
 * Returns { findings, requiredMissing, optionalMissing, location, found }.
 */
export function analyzeComponent(target) {
  const findings = [];

  if (!target.found) {
    findings.push(
      finding({
        severity: 'error',
        code: 'STRUCTURE-NOT-FOUND',
        message:
          target.reason === 'invalid-name'
            ? `Invalid component name: "${target.input}". Expected "cor-<name>".`
            : `Component "${target.name}" not found in src/components or src/hidden.`,
      }),
    );
    return { findings, requiredMissing: 1, optionalMissing: 0, location: null, found: false };
  }

  let requiredMissing = 0;
  let optionalMissing = 0;

  // Required files
  for (const kind of REQUIRED_KINDS) {
    if (!target.exists[kind]) {
      requiredMissing++;
      findings.push(
        finding({
          severity: 'error',
          code: 'STRUCTURE-MISSING-REQUIRED',
          file: relativeToRepo(target.paths[kind]),
          message: `Required file is missing for ${target.name}: ${kind}`,
          fix: kindHint(kind, target.name),
        }),
      );
    }
  }

  // Optional files — info only (lets caller see what's there)
  for (const kind of OPTIONAL_KINDS) {
    if (!target.exists[kind]) {
      optionalMissing++;
      findings.push(
        finding({
          severity: 'info',
          code: 'STRUCTURE-OPTIONAL-MISSING',
          file: relativeToRepo(target.paths[kind]),
          message: `Optional file not present: ${kind} (no action needed unless component needs it).`,
        }),
      );
    }
  }

  // Tokens file — warning, since some components legitimately have no per-component tokens
  if (!target.exists[TOKEN_KIND]) {
    findings.push(
      finding({
        severity: 'warning',
        code: 'STRUCTURE-MISSING-TOKENS',
        file: relativeToRepo(target.paths[TOKEN_KIND]),
        message: `No per-component tokens file. Add tokens/core/components/${target.bare}.tokens.json if this component has custom design tokens.`,
        fix: `Run /update-tokens or skip if component truly uses only semantic tokens.`,
      }),
    );
  }

  // Component still under src/hidden/ → info-level "not yet graduated"
  if (target.location === 'hidden') {
    findings.push(
      finding({
        severity: 'info',
        code: 'STRUCTURE-UNGRADUATED',
        message: `Component lives in src/hidden/ — not yet graduated to src/components/. Run /migrate-component when ready.`,
      }),
    );
  }

  // Sanity: empty TSX file is almost certainly a bug
  if (target.exists.tsx && fileSize(target.paths.tsx) < 50) {
    findings.push(
      finding({
        severity: 'warning',
        code: 'STRUCTURE-EMPTY-TSX',
        file: relativeToRepo(target.paths.tsx),
        message: `TSX file is suspiciously small (<50 bytes). Possibly an empty stub.`,
      }),
    );
  }

  return { findings, requiredMissing, optionalMissing, location: target.location, found: true };
}

function fileSize(p) {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

function kindHint(kind, name) {
  switch (kind) {
    case 'tsx':
      return `Create src/components/${name}/${name}.tsx with a @Component class.`;
    case 'css':
      return `Create src/components/${name}/${name}.css — even if empty, Stencil expects it when styleUrl is set.`;
    case 'stories':
      return `Create src/components/${name}/${name}.stories.ts in CSF3 format. Use story-writer subagent or scripts/scaffold/story-scaffold.mjs (Sprint 2).`;
    case 'spec':
      return `Create src/components/${name}/test/${name}.spec.tsx with newSpecPage tests. Use test-writer subagent.`;
    case 'readme':
      return `Run yarn build (or stencil build --docs) to auto-generate readme.md.`;
    default:
      return null;
  }
}

async function resolveTargets(args) {
  if (args.all) {
    return listAllComponents().map(c => resolveComponentPaths(c.name));
  }
  if (args.changed) {
    const names = await listChangedComponents();
    return names.map(n => resolveComponentPaths(n));
  }
  return [resolveComponentPaths(args.component)];
}

/**
 * Find components touched by `git diff --name-only main...HEAD`.
 * If git fails or main is missing, returns []. Tools default to "no work" rather than crashing.
 */
async function listChangedComponents() {
  try {
    const { execFileSync } = await import('node:child_process');
    const raw = execFileSync('git', ['diff', '--name-only', 'main...HEAD'], { encoding: 'utf8' });
    const names = new Set();
    for (const line of raw.split('\n')) {
      const m = line.match(/^src\/(components|hidden)\/(cor-[a-z0-9-]+)\//);
      if (m) names.add(m[2]);
    }
    return [...names].sort();
  } catch {
    return [];
  }
}

// Only run when invoked directly — tests import analyzeComponent without triggering main.
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

// Re-export internal pieces for tests
export { TOOL, REQUIRED_KINDS, OPTIONAL_KINDS };
