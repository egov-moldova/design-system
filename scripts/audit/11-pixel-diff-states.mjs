#!/usr/bin/env node
/**
 * 11-pixel-diff-states.mjs ★ QUALITY-CRITICAL
 *
 * Captures Playwright screenshots of a `mud-*` component and diffs them against
 * Figma references using **Pixelmatch (Mapbox)** — the same library under the
 * MCP `image-compare` server. The diff and canvas alignment live in
 * `lib/image-diff.mjs`, invoked through `scripts/visual-diff.mjs`.
 *
 * Two modes:
 *
 *   Manifest mode (preferred) — `src/components/<name>/test/<name>.figma.json`
 *     exists (or `--manifest` is given). One capture per manifest state, each
 *     tied to a Figma node, rendered with the state's fixture, theme, clock and
 *     interaction. References: `<refs-dir>/<state>.png`, exported by
 *     `scripts/audit/figma-refs.mjs`.
 *
 *   Story mode (legacy) — no manifest. One capture per story export, light and,
 *     when a `<story>-dark.png` reference exists, dark. References are named
 *     after the story export (kebab-cased) in `--figma-dir`.
 *
 * Captures are taken at `--scale` (default: manifest `figma.scale`, else 2) so
 * they match Figma's 2× PNG export, and include the element's own shadow
 * bleed, which Figma adds to exported render bounds. A canvas size mismatch
 * is reported as its own finding in CSS px — it is often the real drift
 * (an extra footer, a missing border) behind a high diff percentage.
 *
 * Thresholds: `DEFAULT_PASS` / `DEFAULT_WARN` in `lib/image-diff.mjs` — PASS below
 * the first, WARNING (marked `requires-ai-review`) below the second, FAIL at or
 * above it. A manifest state's `mask` selectors are painted out of both images
 * and reported as `PIXEL-MASKED`.
 *
 * Usage:
 *   yarn sp.dev.watch
 *   node scripts/audit/figma-refs.mjs mud-date-picker          # export references once
 *   node scripts/audit/11-pixel-diff-states.mjs mud-date-picker --json
 *   node scripts/audit/11-pixel-diff-states.mjs mud-button --figma-dir ./figma-refs/mud-button --json   # story mode
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
import { launchBrowser, setTheme, PLAYWRIGHT_INSTALL_HINT, PLAYWRIGHT_BROWSER_HINT } from './lib/browser-context.mjs';
import { DEFAULT_PASS, DEFAULT_WARN, classifyDiff, describeSizeMismatch } from './lib/image-diff.mjs';
import {
  defaultRefsDir,
  loadManifest,
  manifestPathFor,
  referenceFileName,
  resolveState,
} from './lib/figma-manifest.mjs';
import { captureState, openState, pageBackground } from './lib/state-page.mjs';
import { analyzeStoriesFile } from './05-story-exports.mjs';

const TOOL = 'pixel-diff-states';

const USAGE = defaultUsage(
  '11-pixel-diff-states',
  'Capture component states and diff them against Figma references via Pixelmatch.',
  [
    '',
    'Extra options:',
    '  --port <N>            Storybook port (default: 6007)',
    '  --manifest <file>     Figma state manifest (default: src/components/<name>/test/<name>.figma.json)',
    '  --figma-dir <dir>     Reference PNGs (manifest mode default: .audit-figma/<name>/; required in story mode)',
    '  --scale <N>           Device scale factor for captures (default: manifest figma.scale, else 2)',
    '  --align <mode>        top-left | center — canvas alignment for size mismatches (default: top-left)',
    '  --skip-dark           Story mode: skip the dark-mode pass',
    '  --out-dir <dir>       Where to save captured PNGs + diff images (default: .audit-screenshots/<name>/)',
    `  --pass-threshold <%>  Percent diff that still counts as PASS (default: ${DEFAULT_PASS})`,
    `  --warn-threshold <%>  At or above this is FAIL (default: ${DEFAULT_WARN})`,
  ],
);

const DEFAULT_SCALE = 2;

export { classifyDiff };

export function kebabCase(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Story mode: find the Figma reference PNG for a story name + theme.
 *   light → `<state>-light.png`, then `<state>.png`
 *   dark  → `<state>-dark.png` only
 *
 * A dark capture is never compared with a light reference: that produced a
 * guaranteed FAIL for every story that had no dark design.
 */
export function pickReferencePath(figmaDir, storyName, theme) {
  const kebab = kebabCase(storyName);
  const candidates =
    theme === 'dark'
      ? [join(figmaDir, `${kebab}-dark.png`)]
      : [join(figmaDir, `${kebab}-light.png`), join(figmaDir, `${kebab}.png`)];
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
      'manifest': { type: 'string' },
      'figma-dir': { type: 'string' },
      'scale': { type: 'string' },
      'align': { type: 'string', default: 'top-left' },
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

  if (!(await isStorybookReachable({ port }))) {
    process.stderr.write(`${TOOL}: Storybook not reachable on port ${port}. Start it with \`yarn sp.dev.watch\`.\n`);
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

  let browserHandle;
  let failure;
  const perComponent = [];
  try {
    browserHandle = await launchBrowser();
    for (const target of targets) {
      perComponent.push(
        await analyzeComponent(target, {
          browser: browserHandle.browser,
          baseUrl,
          args,
          passThreshold,
          warnThreshold,
        }),
      );
    }
  } catch (err) {
    failure = err;
  } finally {
    // Close before any exit so no headless Chromium outlives the script.
    await browserHandle?.close();
  }
  if (failure) {
    process.stderr.write(`${TOOL}: ${failure.message}\n`);
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
    result.meta.mode = perComponent[0].mode;
    result.meta.scale = perComponent[0].scale;
    result.meta.manifest = perComponent[0].manifest;
    result.meta.refsDir = perComponent[0].refsDir;
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

  const manifestPath = opts.args.extras.manifest ? resolve(opts.args.extras.manifest) : manifestPathFor(target.name);
  if (opts.args.extras.manifest || existsSync(manifestPath)) {
    return analyzeManifest(target, manifestPath, opts);
  }
  return analyzeStories(target, opts);
}

// ─── Manifest mode ────────────────────────────────────────────────────────

async function analyzeManifest(target, manifestPath, opts) {
  const { args, browser, baseUrl, passThreshold, warnThreshold } = opts;
  const { manifest, errors } = loadManifest(manifestPath);
  const manifestRel = relativeToRepo(manifestPath);
  if (!manifest || errors.length) {
    return {
      mode: 'manifest',
      manifest: manifestRel,
      findings: errors.map(message =>
        finding({ severity: 'error', code: 'PIXEL-MANIFEST-INVALID', file: manifestRel, message }),
      ),
      states: [],
      componentName: target.name,
    };
  }

  const scale = Number(args.extras.scale ?? manifest.figma?.scale ?? DEFAULT_SCALE);
  const refsDir = args.extras['figma-dir'] ? resolve(args.extras['figma-dir']) : defaultRefsDir(target.name);
  const outDir = args.extras['out-dir'] ?? join(REPO_ROOT, '.audit-screenshots', target.name);
  mkdirSync(outDir, { recursive: true });

  const states = [];
  const findings = [];
  for (const raw of manifest.states) {
    const state = resolveState(manifest, raw, target.name);
    // `pixel: false` states (and states without a node) are style-parity only.
    if (!state.pixel) continue;
    const referencePath = join(refsDir, referenceFileName(state));
    const screenshotPath = join(outDir, `${state.name}.png`);
    const diffPath = join(outDir, `${state.name}.diff.png`);
    const entry = { theme: state.theme, node: state.node };

    let session;
    try {
      session = await openState(browser, state, { baseUrl, scale });
      const shot = await captureState(session.page, { ...state.capture, mask: state.mask }, screenshotPath);
      entry.maskRects = shot.maskRects;
      entry.background = await pageBackground(session.page);
    } catch (err) {
      Object.assign(entry, { status: 'UNKNOWN', diffPercent: null, requiresReview: true, error: err.message });
      findings.push(
        finding({
          severity: 'error',
          code: 'PIXEL-CAPTURE-FAILED',
          file: manifestRel,
          message: `${state.name}: ${err.message}`,
        }),
      );
      states.push(themedState(state, entry));
      continue;
    } finally {
      await session?.release();
    }
    entry.screenshotPath = screenshotPath;

    if (!existsSync(referencePath)) {
      Object.assign(entry, {
        status: 'UNKNOWN',
        diffPercent: null,
        requiresReview: true,
        error: `no Figma reference ${relativeToRepo(referencePath)}`,
      });
      // Error, not info: a manifest state names a Figma node, so a missing
      // reference means nothing was verified. References are git-ignored, so
      // a fresh checkout would otherwise report a green "pixel diff" that
      // compared zero states.
      findings.push(
        finding({
          severity: 'error',
          code: 'PIXEL-NO-REFERENCE',
          message: `${state.name}: no Figma reference at ${relativeToRepo(referencePath)} — state not verified.`,
          fix: `node scripts/audit/figma-refs.mjs ${target.name}`,
        }),
      );
      states.push(themedState(state, entry));
      continue;
    }

    Object.assign(
      entry,
      compare({
        referencePath,
        screenshotPath,
        diffPath,
        align: args.extras.align,
        background: entry.background,
        masks: entry.maskRects,
        passThreshold,
        warnThreshold,
      }),
    );
    findings.push(...findingsFor(`${state.name}${state.node ? ` (Figma ${state.node})` : ''}`, entry, scale, opts));
    states.push(themedState(state, entry));
  }

  return {
    mode: 'manifest',
    scale,
    manifest: manifestRel,
    refsDir: relativeToRepo(refsDir),
    findings,
    states,
    componentName: target.name,
  };
}

/** Keep the `{ name, storyId, light, dark }` shape consumers already read. */
function themedState(state, entry) {
  return {
    name: state.name,
    node: state.node,
    storyId: state.story,
    light: state.theme === 'light' ? { theme: 'light', ...entry } : null,
    dark: state.theme === 'dark' ? { theme: 'dark', ...entry } : null,
  };
}

// ─── Story mode (legacy) ──────────────────────────────────────────────────

async function analyzeStories(target, opts) {
  const { args, browser, baseUrl, passThreshold, warnThreshold } = opts;
  const figmaDir = args.extras['figma-dir'] ? resolve(args.extras['figma-dir']) : null;
  if (!figmaDir || !existsSync(figmaDir)) {
    return {
      mode: 'stories',
      findings: [
        finding({
          severity: 'warning',
          code: 'PIXEL-NO-REFERENCES',
          message: figmaDir
            ? `figma reference dir not found: ${figmaDir}`
            : `No manifest at ${relativeToRepo(manifestPathFor(target.name))} and no --figma-dir.`,
          fix: 'Create the manifest (see .claude/skills/pixel-perfect/SKILL.md), then run scripts/audit/figma-refs.mjs.',
        }),
      ],
      states: [],
      componentName: target.name,
    };
  }
  if (!target.exists?.stories) {
    return {
      mode: 'stories',
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

  const scale = Number(args.extras.scale ?? DEFAULT_SCALE);
  const outDir = args.extras['out-dir'] ?? join(REPO_ROOT, '.audit-screenshots', target.name);
  mkdirSync(outDir, { recursive: true });

  const { stories } = analyzeStoriesFile(target.paths.stories, target.name);
  const states = [];
  const findings = [];

  for (const story of stories) {
    if (!story.storyId) continue;
    const url = storyUrl({ storyId: story.storyId, baseUrl });
    const themes = ['light'];
    if (!args.extras['skip-dark'] && pickReferencePath(figmaDir, story.name, 'dark')) themes.push('dark');

    const result = { name: story.name, storyId: story.storyId, light: null, dark: null };
    for (const theme of themes) {
      const referencePath = pickReferencePath(figmaDir, story.name, theme);
      const screenshotPath = join(outDir, `${kebabCase(story.name)}-${theme}.png`);
      const diffPath = join(outDir, `${kebabCase(story.name)}-${theme}.diff.png`);
      const background = await captureStory({
        browser,
        url,
        theme,
        scale,
        componentName: target.name,
        outputPath: screenshotPath,
      });

      if (!referencePath) {
        result[theme] = {
          theme,
          diffPercent: null,
          status: 'UNKNOWN',
          requiresReview: true,
          error: `no Figma reference (${kebabCase(story.name)}.png) found in ${figmaDir}`,
          screenshotPath,
          diffImagePath: null,
        };
        findings.push(
          finding({
            severity: 'info',
            code: 'PIXEL-DIFF-SKIPPED',
            message: `${story.name} [${theme}]: ${result[theme].error}`,
          }),
        );
        continue;
      }
      result[theme] = {
        theme,
        screenshotPath,
        background,
        ...compare({
          referencePath,
          screenshotPath,
          diffPath,
          align: args.extras.align,
          background,
          passThreshold,
          warnThreshold,
        }),
      };
      findings.push(...findingsFor(`${story.name} [${theme}]`, result[theme], scale, opts));
    }
    states.push(result);
  }

  return { mode: 'stories', scale, refsDir: relativeToRepo(figmaDir), findings, states, componentName: target.name };
}

/** Capture one story; returns the page background the diff should flatten onto. */
async function captureStory({ browser, url, theme, scale, componentName, outputPath }) {
  const context = await browser.newContext({ deviceScaleFactor: scale });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector(`${componentName}.hydrated`, { timeout: 10000 }).catch(() => null);
    await page.evaluate(() => document.fonts.ready.then(() => true));
    if (theme === 'dark') await setTheme(page, 'dark');
    await page.waitForTimeout(250);
    // Crop to the component element so Storybook chrome doesn't bleed into the diff.
    const locator = page.locator(componentName).first();
    if ((await locator.count().catch(() => 0)) > 0) {
      await captureState(page, { selector: componentName, bleed: 'auto' }, outputPath);
    } else {
      await page.screenshot({ path: outputPath, fullPage: false, animations: 'disabled', caret: 'hide' });
    }
    return await pageBackground(page);
  } finally {
    await context.close();
  }
}

// ─── Shared ───────────────────────────────────────────────────────────────

function compare({ referencePath, screenshotPath, diffPath, align, background, masks, passThreshold, warnThreshold }) {
  const diff = runVisualDiff({
    figmaPath: referencePath,
    browserPath: screenshotPath,
    outputPath: diffPath,
    align,
    background,
    masks,
  });
  if (!diff.ok) {
    return {
      diffPercent: null,
      status: 'UNKNOWN',
      requiresReview: true,
      error: diff.error,
      diffImagePath: null,
      referencePath,
    };
  }
  const cls = classifyDiff(diff.diffPercent, { passThreshold, warnThreshold });
  return {
    diffPercent: diff.diffPercent,
    diffPixels: diff.diffPixels,
    maskedPixels: diff.maskedPixels ?? 0,
    status: cls.status,
    requiresReview: cls.requiresReview,
    sizeMismatch: diff.sizeMismatch ?? null,
    diffImagePath: diffPath,
    referencePath,
  };
}

/** Findings for one compared state. Pure — exported for tests. */
export function findingsFor(label, themed, scale, opts) {
  const out = [];
  const masked = themed.maskedPixels > 0 ? ` (${themed.maskedPixels} px masked)` : '';
  if (themed.maskedPixels > 0) {
    out.push(
      finding({
        severity: 'info',
        code: 'PIXEL-MASKED',
        message: `${label}: ${themed.maskedPixels} px masked by the manifest — not compared.`,
      }),
    );
  }
  const file = themed.diffImagePath ? relativeToRepo(themed.diffImagePath) : null;
  if (themed.sizeMismatch) {
    out.push(
      finding({
        severity: 'warning',
        code: 'PIXEL-SIZE-MISMATCH',
        file,
        message: `${label}: ${describeSizeMismatch(themed.sizeMismatch, scale)}.`,
        fix: 'A size difference usually means an extra or missing element, border or spacing — compare the structure before tuning colours.',
      }),
    );
  }
  if (themed.status === 'FAIL') {
    out.push(
      finding({
        severity: 'error',
        code: 'PIXEL-DIFF-FAIL',
        file,
        message: `${label}: ${themed.diffPercent}% diff exceeds ${opts.warnThreshold}% fail threshold${masked}.`,
        fix: 'Inspect the diff image; run 15-style-parity for exact values; adjust CSS or token mapping. If the design intentionally drifted from Figma, re-export the reference.',
      }),
    );
  } else if (themed.status === 'WARNING') {
    out.push(
      finding({
        severity: 'warning',
        code: 'PIXEL-DIFF-WARNING',
        file,
        message: `${label}: ${themed.diffPercent}% diff is borderline (requires AI review)${masked}.`,
      }),
    );
  } else if (themed.status === 'UNKNOWN' && themed.error) {
    out.push(finding({ severity: 'info', code: 'PIXEL-DIFF-SKIPPED', message: `${label}: ${themed.error}` }));
  } else if (themed.status === 'UNKNOWN') {
    // The diff ran but had no pixel left to compare (every pixel masked). A state that
    // compared nothing must not read as verified, the same rule as PIXEL-NO-REFERENCE.
    out.push(
      finding({
        severity: 'error',
        code: 'PIXEL-NOTHING-COMPARED',
        file,
        message: `${label}: the manifest masks every pixel of the capture — nothing was compared.`,
        fix: 'Narrow the state mask to the mock-data elements, or set "pixel": false and rely on style parity.',
      }),
    );
  }
  return out;
}

/**
 * Delegate to scripts/visual-diff.mjs as a subprocess. Reusing it keeps the
 * Pixelmatch invocation in ONE place (single source of truth for the diff
 * algorithm + thresholds).
 *
 * Returns { ok, diffPixels?, maskedPixels?, diffPercent?, status?, sizeMismatch?, error? }.
 */
function runVisualDiff({ figmaPath, browserPath, outputPath, align = 'top-left', background = '#ffffff', masks = [] }) {
  const script = join(REPO_ROOT, 'scripts', 'visual-diff.mjs');
  const res = spawnSync(
    process.execPath,
    [
      script,
      '--figma',
      figmaPath,
      '--browser',
      browserPath,
      '--output',
      outputPath,
      '--align',
      align,
      '--background',
      background,
      ...(masks?.length ? ['--masks', JSON.stringify(masks)] : []),
    ],
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
    if (err.message === PLAYWRIGHT_INSTALL_HINT || err.message === PLAYWRIGHT_BROWSER_HINT) {
      process.stderr.write(`${TOOL}: ${err.message}\n`);
    } else {
      process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    }
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL, DEFAULT_PASS, DEFAULT_WARN, DEFAULT_SCALE };
