#!/usr/bin/env node
/**
 * 12-console-errors.mjs
 *
 * Navigates to each story of a `cor-*` component and captures runtime
 * `console.error` + `console.warn` + uncaught `pageerror` events. Reports
 * any non-empty channel as a finding.
 *
 * Replaces AI work in:
 *   - `.claude/commands/pre-pr-check.md` Wave 5a (console errors)
 *   - `.claude/skills/audit-component/SKILL.md` Wave 3 console check
 *
 * Storybook must be running (default: http://localhost:6007). If not, the
 * script exits with a clean ENV-not-ready message — it does NOT start
 * Storybook itself (that's the orchestrator's responsibility).
 *
 * Usage:
 *   yarn sp.dev.watch                              # in another terminal
 *   node scripts/audit/12-console-errors.mjs cor-button --json
 *   node scripts/audit/12-console-errors.mjs --all --json
 */
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import {
  DEFAULT_BASE_URL,
  DEFAULT_PORT,
  isStorybookReachable,
  storyUrl,
  inferStoryId,
} from './lib/storybook-helpers.mjs';
import { withPage, PLAYWRIGHT_INSTALL_HINT } from './lib/browser-context.mjs';
import { analyzeStoriesFile } from './05-story-exports.mjs';

const TOOL = 'console-errors';

const USAGE = defaultUsage(
  '12-console-errors',
  'Navigate to each Storybook story for a component and report any console.error / console.warn / page errors.',
  [
    '',
    'Extra options:',
    '  --port <N>          Storybook port (default: 6007)',
    '  --warn-as-finding   Treat console.warn as warning finding (default: info only)',
    '  --story <id>        Audit one specific story id instead of every export',
  ],
);

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      'port': { type: 'string', default: String(DEFAULT_PORT) },
      'warn-as-finding': { type: 'boolean', default: false },
      'story': { type: 'string' },
    },
  });
  const t0 = Date.now();
  const port = Number(args.extras.port);
  const baseUrl = `http://localhost:${port}`;
  const warnAsFinding = args.extras['warn-as-finding'];
  const explicitStory = args.extras.story ?? null;

  if (!(await isStorybookReachable({ port }))) {
    process.stderr.write(`${TOOL}: Storybook is not reachable on port ${port}. Start it with \`yarn sp.dev.watch\`.\n`);
    process.exit(EXIT_INTERNAL);
  }

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

  let perComponent;
  try {
    perComponent = await Promise.all(targets.map(t => analyzeComponent(t, { baseUrl, warnAsFinding, explicitStory })));
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n`);
    process.exit(EXIT_INTERNAL);
  }

  const findings = perComponent.flatMap(c => c.findings);
  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: targets.length,
      storiesVisited: perComponent.reduce((sum, c) => sum + (c.storiesVisited ?? 0), 0),
      baseUrl,
    },
  });

  if (!args.all && !args.changed && perComponent.length === 1) {
    result.meta.perStory = perComponent[0].perStory;
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Visit every story of a component, collect console output. Pure async —
 * exported for tests via injection (we test classifyMessage directly).
 */
export async function analyzeComponent(target, { baseUrl, warnAsFinding, explicitStory } = {}) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      storiesVisited: 0,
      perStory: [],
      componentName: target.name ?? null,
    };
  }

  const storyIds = listStoryIdsForComponent(target, explicitStory);
  if (storyIds.length === 0) {
    return {
      findings: [
        finding({
          severity: 'warning',
          code: 'CONSOLE-NO-STORIES',
          file: relativeToRepo(target.paths.stories),
          message: `No stories found for ${target.name}; nothing to audit.`,
        }),
      ],
      storiesVisited: 0,
      perStory: [],
      componentName: target.name,
    };
  }

  const perStory = [];
  const findings = [];
  for (const storyId of storyIds) {
    const url = storyUrl({ storyId, baseUrl });
    const collected = await visitAndCollect(url);
    perStory.push({ storyId, ...collected });

    for (const err of collected.errors) {
      findings.push(
        finding({
          severity: 'error',
          code: 'CONSOLE-RUNTIME-ERROR',
          file: relativeToRepo(target.paths.stories),
          message: `${storyId}: ${err.slice(0, 200)}`,
        }),
      );
    }
    if (warnAsFinding) {
      for (const w of collected.warnings) {
        findings.push(
          finding({
            severity: 'warning',
            code: 'CONSOLE-RUNTIME-WARNING',
            file: relativeToRepo(target.paths.stories),
            message: `${storyId}: ${w.slice(0, 200)}`,
          }),
        );
      }
    }
  }

  return { findings, storiesVisited: storyIds.length, perStory, componentName: target.name };
}

/**
 * Determine which story ids to visit. Prefer the actual *.stories.ts file via
 * 05-story-exports (canonical). Fall back to a single inferred Default id.
 */
function listStoryIdsForComponent(target, explicitStory) {
  if (explicitStory) return [explicitStory];
  if (!target.exists?.stories) {
    const defaultId = inferStoryId(`Atoms/${pascal(target.bare)}`, 'Default');
    return defaultId ? [defaultId] : [];
  }
  const { stories } = analyzeStoriesFile(target.paths.stories, target.name);
  return stories.filter(s => s.storyId).map(s => s.storyId);
}

function pascal(s) {
  return s
    .split('-')
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

/**
 * Navigate to a single URL and collect console.error / console.warn / pageerror.
 * Pure side-effecting (network + browser) — not unit-testable but isolated.
 */
async function visitAndCollect(url) {
  return withPage({
    url,
    waitUntil: 'load',
    timeoutMs: 15000,
    action: async page => {
      const errors = [];
      const warnings = [];
      page.on('console', msg => {
        const text = msg.text();
        const cls = classifyMessage(msg.type(), text);
        if (cls === 'error') errors.push(text);
        else if (cls === 'warning') warnings.push(text);
      });
      page.on('pageerror', err => {
        errors.push(`uncaught: ${err.message}`);
      });
      // Give the page a moment to settle (Stencil hydration may run after load)
      await page.waitForTimeout(1500);
      return { errors, warnings };
    },
  });
}

/**
 * Classify a console message. Some Storybook noise is filtered out:
 *   - "Download the React DevTools" — Storybook UI banner; we're in iframe but be safe
 *   - Hot-module-reload chatter from Vite/Storybook (info-level only)
 * Exported for tests.
 */
export function classifyMessage(type, text) {
  const t = text ?? '';
  if (type === 'error') {
    // Storybook itself sometimes logs harmless 404s for missing optional addons
    if (/favicon\.ico/i.test(t)) return 'info';
    return 'error';
  }
  if (type === 'warning') {
    if (/\[HMR\]|hot-module-reload|webpack-internal/i.test(t)) return 'info';
    return 'warning';
  }
  return 'info';
}

async function resolveTargets(args) {
  if (args.all) return listAllComponents().map(c => resolveComponentPaths(c.name));
  if (args.changed) return listChangedComponents().map(n => resolveComponentPaths(n));
  return [resolveComponentPaths(args.component)];
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    if (err.message === PLAYWRIGHT_INSTALL_HINT) {
      process.stderr.write(`${TOOL}: ${err.message}\n`);
    } else {
      process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    }
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
