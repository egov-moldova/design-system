#!/usr/bin/env node
/**
 * 09-a11y-tree.mjs
 *
 * Visits a `cor-*` component story (light + dark) and collects two pieces of
 * structured data the a11y-verifier agent currently extracts manually:
 *
 *   1. The accessibility snapshot tree (`page.accessibility.snapshot()`)
 *   2. A census of every interactive element with role / accessible name /
 *      focus-visible status, walked via `page.evaluate` + querySelectorAll.
 *
 * The script ONLY collects data — it never interprets ARIA correctness
 * (e.g. "is aria-label appropriate here?"). That judgment stays with AI.
 *
 * Replaces AI work in:
 *   - `.claude/agents/a11y-verifier.md` Step 2 (navigate + snapshot)
 *   - `.claude/agents/a11y-verifier.md` Step 3 (element-by-element ARIA scan)
 *   - `.claude/agents/a11y-verifier.md` Step 5 (ARIA validation data gathering)
 *
 * Usage:
 *   yarn sp.dev.watch
 *   node scripts/audit/09-a11y-tree.mjs cor-button --json
 *   node scripts/audit/09-a11y-tree.mjs cor-button --story-id atoms-button--default --json
 */
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import { DEFAULT_PORT, isStorybookReachable, storyUrl, inferStoryId } from './lib/storybook-helpers.mjs';
import { withPage, setTheme, PLAYWRIGHT_INSTALL_HINT } from './lib/browser-context.mjs';
import { analyzeStoriesFile } from './05-story-exports.mjs';

const TOOL = 'a11y-tree';

const USAGE = defaultUsage(
  '09-a11y-tree',
  'Capture the accessibility tree + interactive-element census for a Storybook story (light + dark).',
  [
    '',
    'Extra options:',
    '  --port <N>          Storybook port (default: 6007)',
    '  --story-id <id>     Specific story id to audit (default: first Default-like export)',
    '  --skip-dark         Skip the dark-mode pass (faster)',
  ],
);

// Tag names we consider "interactive" by default. Custom cor-* elements are
// added on top by the per-component name match.
const INTERACTIVE_TAGS = ['button', 'a', 'input', 'select', 'textarea', 'details', 'summary'];

// Roles we consider interactive regardless of tag.
const INTERACTIVE_ROLES = [
  'button',
  'link',
  'textbox',
  'combobox',
  'checkbox',
  'radio',
  'switch',
  'tab',
  'menuitem',
  'option',
  'slider',
  'spinbutton',
  'searchbox',
];

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      'port': { type: 'string', default: String(DEFAULT_PORT) },
      'story-id': { type: 'string' },
      'skip-dark': { type: 'boolean', default: false },
    },
  });
  const t0 = Date.now();
  const port = Number(args.extras.port);
  const baseUrl = `http://localhost:${port}`;

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
    perComponent = await Promise.all(
      targets.map(t =>
        analyzeComponent(t, {
          baseUrl,
          storyId: args.extras['story-id'] ?? null,
          skipDark: args.extras['skip-dark'],
        }),
      ),
    );
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n`);
    process.exit(EXIT_INTERNAL);
  }

  const findings = perComponent.flatMap(c => c.findings);
  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: { durationMs: Date.now() - t0, componentsScanned: targets.length, baseUrl },
  });

  if (!args.all && !args.changed && perComponent.length === 1) {
    result.meta.snapshot = perComponent[0].snapshot;
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

/**
 * Visit a single component's primary story; collect tree + element census for
 * both themes (light, dark).
 */
export async function analyzeComponent(target, { baseUrl, storyId = null, skipDark = false } = {}) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      snapshot: null,
      componentName: target.name ?? null,
    };
  }

  const resolvedStoryId = storyId ?? pickDefaultStoryId(target);
  if (!resolvedStoryId) {
    return {
      findings: [
        finding({
          severity: 'warning',
          code: 'A11Y-NO-STORY',
          file: relativeToRepo(target.paths.stories),
          message: `Could not infer a story id for ${target.name}. Pass --story-id explicitly.`,
        }),
      ],
      snapshot: null,
      componentName: target.name,
    };
  }

  const url = storyUrl({ storyId: resolvedStoryId, baseUrl });

  const light = await collectForTheme(url, target.name, 'light');
  const dark = skipDark ? null : await collectForTheme(url, target.name, 'dark');

  const findings = [];

  // Quality safeguard: flag obviously missing accessible names, but stop short
  // of interpreting ARIA correctness — that's AI's job.
  for (const theme of [light, dark].filter(Boolean)) {
    for (const el of theme.interactive) {
      if (!el.accessibleName || el.accessibleName.trim() === '') {
        findings.push(
          finding({
            severity: 'warning',
            code: 'A11Y-MISSING-ACCESSIBLE-NAME',
            message: `${theme.theme}: <${el.tag}> at index ${el.index} has no accessible name (role=${el.role ?? 'none'}).`,
          }),
        );
      }
    }
  }

  return {
    findings,
    snapshot: { storyId: resolvedStoryId, light, dark },
    componentName: target.name,
  };
}

/**
 * Visit `url` with theme applied; return { theme, tree, interactive }.
 * Performs network + browser side effects.
 */
async function collectForTheme(url, componentName, theme) {
  return withPage({
    url,
    waitUntil: 'load',
    action: async page => {
      await page.waitForTimeout(750);
      if (theme === 'dark') {
        await setTheme(page, 'dark');
        await page.waitForTimeout(250);
      }

      const tree = await page.accessibility.snapshot();
      const interactive = await page.evaluate(
        ctx => {
          const sel = [ctx.componentName, ...ctx.tags, ...ctx.roles.map(r => `[role="${r}"]`)].join(',');
          const els = Array.from(document.querySelectorAll(sel));
          return els.map((el, index) => {
            const styles = window.getComputedStyle(el);
            return {
              index,
              tag: el.tagName.toLowerCase(),
              role: el.getAttribute('role') || null,
              accessibleName:
                el.getAttribute('aria-label') ||
                el.getAttribute('aria-labelledby') ||
                (el.textContent && el.textContent.trim().slice(0, 80)) ||
                '',
              ariaAttributes: Array.from(el.attributes)
                .filter(a => a.name.startsWith('aria-'))
                .map(a => `${a.name}="${a.value}"`),
              outlineWidth: styles.outlineWidth,
              outlineStyle: styles.outlineStyle,
              outlineColor: styles.outlineColor,
            };
          });
        },
        { componentName, tags: INTERACTIVE_TAGS, roles: INTERACTIVE_ROLES },
      );

      return { theme, tree, interactive };
    },
  });
}

function pickDefaultStoryId(target) {
  if (target.exists?.stories) {
    const { stories } = analyzeStoriesFile(target.paths.stories, target.name);
    const def = stories.find(s => /default/i.test(s.name)) ?? stories[0];
    return def?.storyId ?? null;
  }
  return inferStoryId(`Atoms/${pascal(target.bare)}`, 'Default');
}

function pascal(s) {
  return s
    .split('-')
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
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

export { TOOL, INTERACTIVE_TAGS, INTERACTIVE_ROLES, pickDefaultStoryId };
