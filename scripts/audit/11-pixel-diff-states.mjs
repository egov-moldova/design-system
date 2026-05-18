#!/usr/bin/env node
/**
 * 11-pixel-diff-states.mjs ★ QUALITY-CRITICAL
 *
 * Captures Playwright screenshots for every story of a `cor-*` component
 * (light + dark) and diffs them against Figma references using **Pixelmatch
 * (Mapbox)** — the same library the existing `scripts/visual-diff.mjs` uses
 * and the same algorithm under the MCP `image-compare` server. This matches
 * the user's explicit quality preference (Playwright's built-in compare was
 * rejected in plan question Q2).
 *
 * Required inputs:
 *   - <componentName>                    — cor-X
 *   - --figma-dir <path>                 — folder containing one `<state>.png`
 *                                          per story name (kebab-cased)
 *
 * Output:
 *   { states: [{ name, light: { diffPercent, status, diffImagePath },
 *                dark:  { diffPercent, status, diffImagePath } }] }
 *
 * Thresholds (mirrors scripts/visual-diff.mjs):
 *   < 0.5%   PASS
 *   < 2.0%   WARNING (marked `requires-ai-review`)
 *   >= 2.0%  FAIL
 *
 * Replaces AI work in:
 *   - `.claude/agents/pixel-perfect-verifier.md` Step 4-6
 *
 * Usage:
 *   yarn sp.dev.watch
 *   node scripts/audit/11-pixel-diff-states.mjs cor-button --figma-dir ./figma-refs/cor-button --json
 */
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo, REPO_ROOT } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import { DEFAULT_PORT, isStorybookReachable, storyUrl } from './lib/storybook-helpers.mjs';
import { withPage, setTheme, PLAYWRIGHT_INSTALL_HINT } from './lib/browser-context.mjs';
import { analyzeStoriesFile } from './05-story-exports.mjs';

const TOOL = 'pixel-diff-states';

const USAGE = defaultUsage(
  '11-pixel-diff-states',
  'Capture screenshots of every story (light + dark) and diff against Figma references via Pixelmatch.',
  [
    '',
    'Extra options:',
    '  --port <N>          Storybook port (default: 6007)',
    '  --figma-dir <dir>   Folder containing one <state>.png per story (kebab-cased)',
    '  --skip-dark         Skip the dark-mode pass',
    '  --out-dir <dir>     Where to save captured PNGs + diff images (default: .audit-screenshots/cor-X/)',
    '  --pass-threshold <%>  Percent diff that still counts as PASS (default: 0.5)',
    '  --warn-threshold <%>  Above this is FAIL (default: 2.0)',
  ],
);

const DEFAULT_PASS = 0.5;
const DEFAULT_WARN = 2.0;

// ─── Thresholds + status (pure, exported for tests) ───────────────────────

export function classifyDiff(diffPercent, { passThreshold = DEFAULT_PASS, warnThreshold = DEFAULT_WARN } = {}) {
  if (diffPercent === null || diffPercent === undefined || Number.isNaN(diffPercent)) {
    return { status: 'UNKNOWN', requiresReview: true };
  }
  if (diffPercent < passThreshold) return { status: 'PASS', requiresReview: false };
  if (diffPercent < warnThreshold) return { status: 'WARNING', requiresReview: true };
  return { status: 'FAIL', requiresReview: false };
}

export function kebabCase(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Find the Figma reference PNG for a story name + theme. Looks for, in order:
 *   <state>-<theme>.png   (e.g. default-dark.png)
 *   <state>.png           (theme-agnostic)
 */
export function pickReferencePath(figmaDir, storyName, theme) {
  const kebab = kebabCase(storyName);
  const candidates = [join(figmaDir, `${kebab}-${theme}.png`), join(figmaDir, `${kebab}.png`)];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

// ─── Main flow ────────────────────────────────────────────────────────────

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      'port': { type: 'string', default: String(DEFAULT_PORT) },
      'figma-dir': { type: 'string' },
      'skip-dark': { type: 'boolean', default: false },
      'out-dir': { type: 'string' },
      'pass-threshold': { type: 'string', default: String(DEFAULT_PASS) },
      'warn-threshold': { type: 'string', default: String(DEFAULT_WARN) },
    },
  });
  const t0 = Date.now();
  const port = Number(args.extras.port);
  const baseUrl = `http://localhost:${port}`;
  const passThreshold = Number(args.extras['pass-threshold']);
  const warnThreshold = Number(args.extras['warn-threshold']);
  const skipDark = args.extras['skip-dark'];
  const figmaDir = args.extras['figma-dir'] ? resolve(args.extras['figma-dir']) : null;

  if (!figmaDir) {
    process.stderr.write(`${TOOL}: --figma-dir is required.\n${USAGE}\n`);
    process.exit(EXIT_INTERNAL);
  }
  if (!existsSync(figmaDir)) {
    process.stderr.write(`${TOOL}: figma reference dir not found: ${figmaDir}\n`);
    process.exit(EXIT_INTERNAL);
  }
  if (!(await isStorybookReachable({ port }))) {
    process.stderr.write(`${TOOL}: Storybook not reachable on port ${port}.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const targets = await resolveTargets(args);
  if (!targets.length) {
    if (args.changed) {
      await emit(
        buildResult({ tool: TOOL, target: 'changed', findings: [], meta: { durationMs: Date.now() - t0 } }),
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
          figmaDir,
          outDir: args.extras['out-dir'] ?? join(REPO_ROOT, '.audit-screenshots', t.name ?? 'unknown'),
          passThreshold,
          warnThreshold,
          skipDark,
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
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: targets.length,
      passThreshold,
      warnThreshold,
      baseUrl,
    },
  });

  if (!args.all && !args.changed && perComponent.length === 1) {
    result.meta.states = perComponent[0].states;
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

export async function analyzeComponent(target, opts) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      states: [],
      componentName: target.name ?? null,
    };
  }
  if (!target.exists?.stories) {
    return {
      findings: [
        finding({
          severity: 'warning',
          code: 'PIXEL-NO-STORIES',
          file: relativeToRepo(target.paths.stories),
          message: `No stories file found for ${target.name}; nothing to capture.`,
        }),
      ],
      states: [],
      componentName: target.name,
    };
  }

  mkdirSync(opts.outDir, { recursive: true });

  const { stories } = analyzeStoriesFile(target.paths.stories, target.name);
  const states = [];
  const findings = [];

  for (const story of stories) {
    if (!story.storyId) continue;
    const url = storyUrl({ storyId: story.storyId, baseUrl: opts.baseUrl });
    const light = await captureAndDiff({
      url,
      theme: 'light',
      story,
      componentName: target.name,
      outDir: opts.outDir,
      figmaDir: opts.figmaDir,
      passThreshold: opts.passThreshold,
      warnThreshold: opts.warnThreshold,
    });
    const dark = opts.skipDark
      ? null
      : await captureAndDiff({
          url,
          theme: 'dark',
          story,
          componentName: target.name,
          outDir: opts.outDir,
          figmaDir: opts.figmaDir,
          passThreshold: opts.passThreshold,
          warnThreshold: opts.warnThreshold,
        });

    states.push({ name: story.name, storyId: story.storyId, light, dark });

    for (const themed of [light, dark].filter(Boolean)) {
      if (themed.status === 'FAIL') {
        findings.push(
          finding({
            severity: 'error',
            code: 'PIXEL-DIFF-FAIL',
            file: themed.diffImagePath ? relativeToRepo(themed.diffImagePath) : null,
            message: `${story.name} [${themed.theme}]: ${themed.diffPercent}% diff exceeds ${opts.warnThreshold}% fail threshold.`,
            fix: 'Inspect the diff image; adjust CSS or token mapping. If the design intentionally drifted from Figma, update the reference PNG.',
          }),
        );
      } else if (themed.status === 'WARNING') {
        findings.push(
          finding({
            severity: 'warning',
            code: 'PIXEL-DIFF-WARNING',
            file: themed.diffImagePath ? relativeToRepo(themed.diffImagePath) : null,
            message: `${story.name} [${themed.theme}]: ${themed.diffPercent}% diff is borderline (requires AI review).`,
          }),
        );
      } else if (themed.status === 'UNKNOWN' && themed.error) {
        findings.push(
          finding({
            severity: 'info',
            code: 'PIXEL-DIFF-SKIPPED',
            message: `${story.name} [${themed.theme}]: ${themed.error}`,
          }),
        );
      }
    }
  }

  return { findings, states, componentName: target.name };
}

async function captureAndDiff({ url, theme, story, componentName, outDir, figmaDir, passThreshold, warnThreshold }) {
  const referencePath = pickReferencePath(figmaDir, story.name, theme);
  const screenshotPath = join(outDir, `${kebabCase(story.name)}-${theme}.png`);
  const diffPath = join(outDir, `${kebabCase(story.name)}-${theme}.diff.png`);

  if (!referencePath) {
    // Capture screenshot anyway so it can be used as a future baseline.
    await captureScreenshot({ url, theme, outputPath: screenshotPath, componentName });
    return {
      theme,
      diffPercent: null,
      status: 'UNKNOWN',
      requiresReview: true,
      error: `no Figma reference (${kebabCase(story.name)}.png or ${kebabCase(story.name)}-${theme}.png) found in ${figmaDir}`,
      screenshotPath,
      diffImagePath: null,
    };
  }

  await captureScreenshot({ url, theme, outputPath: screenshotPath, componentName });

  const diff = runVisualDiff({
    figmaPath: referencePath,
    browserPath: screenshotPath,
    outputPath: diffPath,
  });

  if (!diff.ok) {
    return {
      theme,
      diffPercent: null,
      status: 'UNKNOWN',
      requiresReview: true,
      error: diff.error,
      screenshotPath,
      diffImagePath: null,
    };
  }

  const cls = classifyDiff(diff.diffPercent, { passThreshold, warnThreshold });
  return {
    theme,
    diffPercent: diff.diffPercent,
    diffPixels: diff.diffPixels,
    status: cls.status,
    requiresReview: cls.requiresReview,
    screenshotPath,
    diffImagePath: diffPath,
    referencePath,
  };
}

async function captureScreenshot({ url, theme, outputPath, componentName }) {
  await withPage({
    url,
    waitUntil: 'load',
    action: async page => {
      // Wait for the component to hydrate before screenshotting; otherwise the
      // captured PNG can show un-styled content.
      if (componentName) {
        await page.waitForSelector(`${componentName}.hydrated`, { timeout: 10000 }).catch(() => null);
      }
      await page.waitForTimeout(250);
      if (theme === 'dark') {
        await setTheme(page, 'dark');
        await page.waitForTimeout(250);
      }
      // Crop to the component element so Storybook chrome (toolbar, docs page)
      // and tooling overlays (Agentation MCP) don't bleed into the diff.
      // Fall back to viewport-cropped capture if no host is locatable.
      let captured = false;
      if (componentName) {
        const locator = page.locator(componentName).first();
        if ((await locator.count().catch(() => 0)) > 0) {
          await locator.screenshot({ path: outputPath }).catch(async () => {
            await page.screenshot({ path: outputPath, fullPage: false });
          });
          captured = true;
        }
      }
      if (!captured) {
        await page.screenshot({ path: outputPath, fullPage: false });
      }
    },
  });
}

/**
 * Delegate to scripts/visual-diff.mjs as a subprocess. Reusing it keeps the
 * Pixelmatch invocation in ONE place (single source of truth for the diff
 * algorithm + thresholds).
 *
 * Returns { ok, diffPixels?, diffPercent?, status?, error? }.
 */
function runVisualDiff({ figmaPath, browserPath, outputPath }) {
  const script = join(REPO_ROOT, 'scripts', 'visual-diff.mjs');
  const res = spawnSync(
    process.execPath,
    [script, '--figma', figmaPath, '--browser', browserPath, '--output', outputPath],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  if (res.status !== 0 && res.status !== 1) {
    return { ok: false, error: (res.stderr ?? 'visual-diff subprocess failed').trim().slice(0, 300) };
  }
  try {
    const parsed = JSON.parse(res.stdout ?? '{}');
    return { ok: true, ...parsed };
  } catch (err) {
    return { ok: false, error: `failed to parse visual-diff output: ${err.message}` };
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
    if (err.message === PLAYWRIGHT_INSTALL_HINT) {
      process.stderr.write(`${TOOL}: ${err.message}\n`);
    } else {
      process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    }
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL, DEFAULT_PASS, DEFAULT_WARN };
