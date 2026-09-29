#!/usr/bin/env node
/**
 * 07-integration-usage.mjs
 *
 * Reports where a `mud-*` component is USED across the codebase. Helpful for:
 *   - Refactoring impact analysis ("if I rename this prop, what stories break?")
 *   - Redesign sanity check ("are there callsites that depend on the old API?")
 *   - Migration planning ("how widely adopted is this component?")
 *
 * Categories scanned:
 *   - Storybook stories          (src/**\/*.stories.ts)
 *   - Component tests            (src/**\/test/*.spec.tsx, *.e2e.ts)
 *   - Other components           (src/components/mud-Y/mud-Y.tsx — cross-references)
 *   - web-components workspace   (web-components/**\/*.ts)
 *
 * Also verifies the component's auto-generated CustomEvent type is exported
 * from src/index.ts (Stencil generates `MudXCustomEvent` per component with events).
 *
 * Replaces AI work in:
 *   - `.claude/agents/integration-checker.md` (all phases)
 *
 * Usage:
 *   node scripts/audit/07-integration-usage.mjs mud-button --json
 *   node scripts/audit/07-integration-usage.mjs --all --json
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo, REPO_ROOT } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';

const TOOL = 'integration-usage';

const USAGE = defaultUsage(
  '07-integration-usage',
  'Find every usage of a mud-* component (stories, tests, cross-component references, web-components workspace) and verify type exports.',
);

// Source globs scanned for usage references.
const USAGE_GLOBS = [
  'src/**/*.stories.ts',
  'src/**/*.tsx',
  'src/**/*.ts',
  'web-components/**/*.ts',
  'web-components/**/*.tsx',
  'web-components/**/*.html',
];

const IGNORE_DIRS = [/[\\/](node_modules|dist|loader|\.stencil|\.wireit|storybook-static|coverage|\.yarn)[\\/]/];

async function main() {
  const args = parseAuditArgs({ toolName: TOOL, usage: USAGE });
  const t0 = Date.now();

  const targets = await resolveTargets(args);
  if (!targets.length) {
    if (args.changed) {
      await emit(
        buildResult({
          tool: TOOL,
          target: 'changed',
          findings: [],
          meta: { durationMs: Date.now() - t0, componentsScanned: 0 },
        }),
        args,
      );
      process.exit(0);
    }
    process.stderr.write(`${TOOL}: no components matched.\n`);
    process.exit(EXIT_INTERNAL);
  }

  // Pre-load the candidate file list ONCE so multi-component scans don't reglob.
  const fileList = await collectCandidateFiles();
  // Pre-load src/index.ts to check Custom-Event exports.
  const indexSource = readSafely(join(REPO_ROOT, 'src', 'index.ts'));

  const perComponent = await Promise.all(targets.map(t => analyzeComponent(t, { fileList, indexSource })));
  const findings = perComponent.flatMap(c => c.findings);

  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: targets.length,
      filesScanned: fileList.length,
    },
  });

  if (!args.all && !args.changed && perComponent.length === 1) {
    result.meta.usage = perComponent[0].usage;
    result.meta.exports = perComponent[0].exports;
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Analyze one component. Pure async — exported for tests.
 * Returns { findings, usage, exports, componentName }.
 */
export async function analyzeComponent(target, { fileList, indexSource }) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      usage: null,
      exports: null,
      componentName: target.name ?? null,
    };
  }

  const findings = [];
  const usage = scanUsage(target.name, fileList);
  const exports = checkExports(target.name, indexSource);

  if (usage.byCategory.stories.length === 0 && usage.byCategory.tests.length === 0) {
    findings.push(
      finding({
        severity: 'warning',
        code: 'INTEGRATION-NO-USAGE',
        message: `No stories or tests reference ${target.name} — component may be orphaned or pre-launch.`,
      }),
    );
  }

  if (indexSource && !exports.customEventType) {
    findings.push(
      finding({
        severity: 'info',
        code: 'INTEGRATION-NO-CE-TYPE-EXPORT',
        file: 'src/index.ts',
        message: `Custom-event type ${exports.expectedTypeName} not exported from src/index.ts. Expected if the component declares any @Event(); harmless otherwise. Run yarn build to regenerate.`,
      }),
    );
  }

  return { findings, usage, exports, componentName: target.name };
}

/**
 * Collect candidate files once (cached across all components in a scan).
 * Returns absolute file paths.
 */
async function collectCandidateFiles() {
  const files = new Set();
  for (const pattern of USAGE_GLOBS) {
    for await (const p of glob(pattern, { cwd: REPO_ROOT, withFileTypes: false })) {
      const abs = typeof p === 'string' ? join(REPO_ROOT, p) : (p.fullpath?.() ?? p.name);
      if (IGNORE_DIRS.some(re => re.test(abs))) continue;
      try {
        if (statSync(abs).isFile()) files.add(abs);
      } catch {
        // skip
      }
    }
  }
  return [...files];
}

/**
 * Scan candidate files for usages of <mud-X>, mud-X tag references, and
 * component name imports. Pure helper — exported for tests.
 */
export function scanUsage(componentName, fileList) {
  // Match `<mud-X>` or `<mud-X ` (opening tag with attrs)
  // and the bare tag string `mud-X` inside templates / strings.
  const escaped = escapeRegex(componentName);
  const tagRe = new RegExp(`<${escaped}\\b|['"\`]${escaped}['"\`]`, 'g');

  const ownComponentSegment = `${componentName}/`;

  const byCategory = {
    'stories': [],
    'tests': [],
    'components': [],
    'web-components': [],
    'other': [],
  };

  let total = 0;
  for (const file of fileList) {
    const rel = relativeToRepo(file);
    if (rel.includes(`/${ownComponentSegment}`)) continue;

    const content = readSafely(file);
    if (!content) continue;
    if (!content.includes(componentName)) continue;

    const matches = [...content.matchAll(tagRe)];
    if (matches.length === 0) continue;

    total += matches.length;

    const category = categorizeFile(rel);
    const firstMatch = matches[0];
    const firstLine = content.slice(0, firstMatch.index).split('\n').length;
    byCategory[category].push({
      file: rel,
      count: matches.length,
      firstLine,
    });
  }

  for (const cat of Object.values(byCategory)) {
    cat.sort((a, b) => b.count - a.count);
  }

  return { total, byCategory };
}

function categorizeFile(rel) {
  if (rel.includes('.stories.')) return 'stories';
  if (rel.includes('/test/') || rel.endsWith('.spec.tsx') || rel.endsWith('.e2e.ts')) return 'tests';
  if (rel.startsWith('web-components/')) return 'web-components';
  if (rel.startsWith('src/components/')) return 'components';
  return 'other';
}

/**
 * Check whether the component's auto-generated `Cor<X>CustomEvent` type is
 * exported from src/index.ts. This is a Stencil convention — components with
 * @Event() get a generated CustomEvent type that should be re-exported.
 *
 * Returns { expectedTypeName, customEventType: bool }.
 */
export function checkExports(componentName, indexSource) {
  // mud-banner-notification → MudBannerNotificationCustomEvent
  const pascal = componentName
    .replace(/^mud-/, '')
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  const expectedTypeName = `Mud${pascal}CustomEvent`;
  const customEventType = indexSource ? indexSource.includes(expectedTypeName) : false;
  return { expectedTypeName, customEventType };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readSafely(p) {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

async function resolveTargets(args) {
  if (args.all) return listAllComponents().map(c => resolveComponentPaths(c.name));
  if (args.changed) return listChangedComponents().map(n => resolveComponentPaths(n));
  return [resolveComponentPaths(args.component)];
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
