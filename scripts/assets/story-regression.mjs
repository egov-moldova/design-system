#!/usr/bin/env node
/**
 * Story regression: capture every Storybook story, then compare two captures pixel by pixel.
 *
 *   node scripts/assets/story-regression.mjs capture <outDir> [--components <dir,...>]
 *   node scripts/assets/story-regression.mjs compare <baselineDir> <afterDir> [--components <dir,...>] [--budget <dir>=<n>px,...]
 *
 * `capture` serves `storybook-static/` (run `yarn sp.build` first), opens each story at 1280x800
 * under one fixed clock and writes `<outDir>/<story-id>.png` plus `<outDir>/manifest.json`
 * (`{ clock, stories: { <id>: { component, width, height, noise? } } }`; `noise` is present only for a
 * story whose repeated loads of one build differ, see `captureStory`).
 *
 * `compare` takes the UNION of both manifests' story ids. Exit 0: every story within its budget
 * (default 0 differing pixels, plus the baseline's recorded `noise` for that story); 1: a story over budget (a diff PNG is written beside the after
 * capture); 2: a story present on one side only, different clocks, or a usage / I/O error.
 *
 * DEBT(story-regression): a one-change instrument; the lasting home for visual regression is
 * screenshot assertions in the existing `storybook` Vitest project, which can hold a baseline once
 * icons render there through import().
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';

import { launchBrowser, mapLimit } from '../audit/lib/browser-context.mjs';
import { diffImages } from '../audit/lib/image-diff.mjs';
import { captureState } from '../audit/lib/state-page.mjs';
import { isEntrypoint } from '../lib/is-entrypoint.mjs';
import { isStorybookReachable, storyUrl } from '../audit/lib/storybook-helpers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STATIC_DIR = join(ROOT, 'storybook-static');
const PORT = 6110;
const BASE_URL = `http://localhost:${PORT}`;
export const FIXED_CLOCK = '2026-10-02T12:00:00Z';
const VIEWPORT = { width: 1280, height: 800 };
const ASSET_WAIT_MS = 5000;
// One page at a time: see `openStory`.
const CONCURRENCY = 1;
const MAX_LOADS = 5;
const SETTLE_MS = 300;
const DIFF_THRESHOLD = 0.1;

/** `{ storyId: componentDir }` for the `story` entries of a Storybook index, docs entries dropped. */
export function storiesFor(index, componentDirs) {
  const out = {};
  for (const entry of Object.values(index.entries ?? {})) {
    if (entry.type !== 'story') continue;
    const dir = /^\.\/src\/components\/([^/]+)\//.exec(entry.importPath ?? '')?.[1];
    if (!dir) continue;
    if (componentDirs && !componentDirs.includes(dir)) continue;
    out[entry.id] = dir;
  }
  return out;
}

/** Sorted union of the story ids of two manifests, plus the ids present on one side only. */
export function storyIdsToCompare(baselineStories, afterStories) {
  const base = Object.keys(baselineStories);
  const after = Object.keys(afterStories);
  const ids = [...new Set([...base, ...after])].sort();
  return {
    ids,
    onlyIn: {
      baseline: base.filter(id => !(id in afterStories)).sort(),
      after: after.filter(id => !(id in baselineStories)).sort(),
    },
  };
}

/** Differing-pixel count of two decoded PNGs; images of different sizes are `Infinity` apart. */
export function compareImages(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { pixels: Infinity, diff: null };
  const { diffPixels, diffImage } = diffImages(a, b, { threshold: DIFF_THRESHOLD });
  return { pixels: diffPixels, diff: diffImage };
}

export const budgetFor = (dir, budgets) => budgets[dir] ?? 0;

/** `mud-phone-input=279px,mud-x=3px` → `{ 'mud-phone-input': 279, 'mud-x': 3 }`. */
export function parseBudgets(value) {
  const out = {};
  for (const part of (value ?? '').split(',').filter(Boolean)) {
    const m = /^([^=]+)=(\d+)(?:px)?$/.exec(part.trim());
    if (!m) throw new Error(`--budget expects <dir>=<n>px, got "${part}"`);
    out[m[1]] = Number(m[2]);
  }
  return out;
}

const splitList = value => (value ? value.split(',').filter(Boolean) : undefined);

/**
 * Runs in the page. Walks every open shadow root and reports how many drawings it still waits for
 * (`pending`) and which flag images finished loading without a drawing (`broken`).
 *   - `mud-icon`, `mud-logo`: done once its shadow root holds an `svg` or an `img` with naturalWidth > 0.
 *   - `.flag img`, and `.option-flag img` the phone-input list asked for (it carries a `src`): done once
 *     `naturalWidth > 0`; `complete` with naturalWidth 0 is broken. That is the flag of a build before
 *     the asset change, so a baseline captured from one still waits for its flags.
 *   - `.flag[data-iso]`, the trigger's inline flag box: done once it holds an `svg`. A list row's
 *     `.option-flag[data-iso]` is not counted: it stays empty until the row nears the visible part of
 *     the list, so waiting for it would hold every capture until the deadline.
 */
function inspectAssets() {
  const hosts = [];
  const flagImgs = [];
  const flagBoxes = [];
  const visit = root => {
    for (const el of root.querySelectorAll('*')) {
      if (el.tagName === 'MUD-ICON' || el.tagName === 'MUD-LOGO') hosts.push(el);
      if (el.tagName === 'IMG' && el.closest('.flag, .option-flag') && el.hasAttribute('src')) flagImgs.push(el);
      if (el.matches('.flag[data-iso]')) flagBoxes.push(el);
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(document);
  const drawn = host => {
    const root = host.shadowRoot ?? host;
    return root.querySelector('svg') !== null || [...root.querySelectorAll('img')].some(i => i.naturalWidth > 0);
  };
  const pendingHosts = hosts.filter(h => !drawn(h)).length;
  const pendingFlags =
    flagImgs.filter(i => !i.complete).length + flagBoxes.filter(box => box.querySelector('svg') === null).length;
  const broken = flagImgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
  return { pending: pendingHosts + pendingFlags, broken };
}

async function waitForAssets(page) {
  const deadline = Date.now() + ASSET_WAIT_MS;
  for (;;) {
    const state = await page.evaluate(inspectAssets);
    if (state.broken.length > 0)
      throw new Error(`flag image failed to load (naturalWidth 0): ${state.broken.join(', ')}`);
    if (state.pending === 0 || Date.now() >= deadline) return state;
    await page.waitForTimeout(100);
  }
}

/** Let every finite transition and animation finish before the shot; `document.getAnimations()` reaches shadow trees. */
async function settleAnimations(page) {
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity));
    await Promise.allSettled(finite.map(a => a.finished));
  });
}

function startPreview() {
  const viteBin = join(ROOT, 'node_modules/vite/bin/vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--outDir', 'storybook-static', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  return child;
}

async function waitForServer(child) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`vite preview exited with ${child.exitCode}`);
    if (await isStorybookReachable({ port: PORT })) return;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`vite preview did not listen on ${PORT}`);
}

/**
 * Open a story the way every capture sees it: one viewport, light theme, scale 1, the fixed clock
 * (`context.clock.setFixedTime`, as `openState` does for the pixel-perfect audit), hydrated and
 * with fonts loaded. `reducedMotion: 'reduce'` and `CONCURRENCY = 1` are both deliberate:
 * `mud-tooltip` measures its bubble in the frame after it opens and positions it from that, so a
 * bubble caught mid-transition, or measured on a busy CPU, lands in another spot from run to run.
 * Measured with four captures of the 11 tooltip stories compared at a zero budget: 4 pages in
 * parallel differed by 272-8345 px per story; one page at a time without reduced motion still
 * differed (77-6492 px); one page at a time with it was identical.
 */
async function openStory(browser, id) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  await context.clock.setFixedTime(new Date(FIXED_CLOCK));
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(storyUrl({ storyId: id, baseUrl: BASE_URL }), { waitUntil: 'load' });
  await page.waitForFunction(
    () => {
      const els = [...document.querySelectorAll('*')].filter(el => el.tagName.startsWith('MUD-'));
      return els.every(el => el.classList.contains('hydrated'));
    },
    null,
    { timeout: 15000 },
  );
  await page.evaluate(() => document.fonts.ready.then(() => true));
  return { page, release: () => context.close() };
}

async function captureStoryOnce(browser, id, outDir) {
  const { page, release } = await openStory(browser, id);
  try {
    const left = await waitForAssets(page);
    if (left.pending > 0)
      process.stderr.write(`warn: ${id}: ${left.pending} drawing(s) still pending after ${ASSET_WAIT_MS}ms\n`);
    // A story taller than the viewport would be cut at 800px by the clip; grow the viewport to the
    // content once, so the whole root is compared on both sides.
    const box = await page.locator('#storybook-root').first().boundingBox();
    if (box && box.y + box.height > VIEWPORT.height) {
      await page.setViewportSize({ width: VIEWPORT.width, height: Math.ceil(box.y + box.height) });
    }
    await settleAnimations(page);
    const file = join(outDir, `${id}.png`);
    const shoot = () =>
      box && box.width > 0 && box.height > 0
        ? captureState(page, { selector: '#storybook-root', bleed: 0 }, file)
        : // A root with no box (a closed modal renders nothing in flow): the whole viewport, so
          // something appearing out of flow later still shows as a difference.
          page.screenshot({ path: file, animations: 'disabled', caret: 'hide', scale: 'device' });
    await page.waitForTimeout(SETTLE_MS);
    await shoot();
    const png = PNG.sync.read(readFileSync(file));
    return { width: png.width, height: png.height };
  } finally {
    await release();
  }
}

/**
 * Load the story twice; when the two PNGs differ, load up to `MAX_LOADS` times and keep the most
 * frequent rendering. A few stories (the tooltip bubbles, one 1px edge of a button) differ between
 * two loads of one build even with one page at a time and reduced motion: Chromium anti-aliases
 * text in an overlay differently from load to load while the DOM, the geometry and the computed
 * styles are identical (probed over 16 loads of `components-tooltip--all-sizes`: three renderings).
 * `noise` is the largest differing-pixel count between any two loads seen. It is the instrument's
 * own floor for that story, which `compare` adds to the budget; 0 for a story that loaded the same
 * twice.
 */
async function captureStory(browser, id, outDir) {
  const file = join(outDir, `${id}.png`);
  const loads = [];
  for (let load = 0; load < MAX_LOADS; load++) {
    const size = await captureStoryOnce(browser, id, outDir);
    loads.push({ size, png: readFileSync(file) });
    if (load === 1 && loads[0].png.equals(loads[1].png)) break;
  }
  const counts = new Map();
  for (const { png } of loads) counts.set(png.toString('base64'), (counts.get(png.toString('base64')) ?? 0) + 1);
  const modal = loads.reduce((best, l) =>
    counts.get(l.png.toString('base64')) > counts.get(best.png.toString('base64')) ? l : best,
  );
  // A load of another size is an outlier (a layout glitch seen once in 462 stories), not noise
  // between renderings: it is outvoted above and left out of the floor, which would be infinite.
  const sameSize = loads.filter(l => l.size.width === modal.size.width && l.size.height === modal.size.height);
  if (sameSize.length < loads.length)
    process.stderr.write(`note: ${id}: ${loads.length - sameSize.length} load(s) of another size dropped\n`);
  let noise = 0;
  for (let i = 0; i < sameSize.length; i++) {
    for (let j = i + 1; j < sameSize.length; j++) {
      if (sameSize[i].png.equals(sameSize[j].png)) continue;
      noise = Math.max(noise, compareImages(PNG.sync.read(sameSize[i].png), PNG.sync.read(sameSize[j].png)).pixels);
    }
  }
  writeFileSync(file, modal.png);
  if (noise > 0) process.stderr.write(`note: ${id}: loads differ by up to ${noise}px, recorded as its noise floor\n`);
  return { ...modal.size, ...(noise > 0 ? { noise } : {}) };
}

async function capture(outDir, components) {
  const indexFile = join(STATIC_DIR, 'index.json');
  if (!existsSync(indexFile)) throw new Error(`${indexFile} not found — run \`yarn sp.build\` first`);
  const stories = storiesFor(JSON.parse(readFileSync(indexFile, 'utf8')), components);
  const ids = Object.keys(stories).sort();
  if (ids.length === 0) throw new Error('no story matches');
  mkdirSync(outDir, { recursive: true });

  const server = startPreview();
  const { browser, close } = await launchBrowser();
  const failures = [];
  const manifest = { clock: FIXED_CLOCK, stories: {} };
  try {
    await waitForServer(server);
    // Reachability above proves the port, not the story: a missing index entry would 404 per story.
    await mapLimit(ids, CONCURRENCY, async id => {
      try {
        const size = await captureStory(browser, id, outDir);
        manifest.stories[id] = { component: stories[id], ...size };
      } catch (err) {
        failures.push(`${id}: ${String(err?.message ?? err).split('\n')[0]}`);
      }
    });
  } finally {
    await close();
    server.kill();
  }
  manifest.stories = Object.fromEntries(Object.entries(manifest.stories).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`captured ${Object.keys(manifest.stories).length} of ${ids.length} stories into ${outDir}\n`);
  if (failures.length > 0) {
    process.stderr.write(`${failures.length} story capture(s) failed:\n${failures.map(f => `  ${f}`).join('\n')}\n`);
    return 1;
  }
  return 0;
}

function readManifest(dir) {
  const file = join(dir, 'manifest.json');
  if (!existsSync(file)) throw new Error(`${file} not found`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

function compare(baselineDir, afterDir, components, budgets) {
  const base = readManifest(baselineDir);
  const after = readManifest(afterDir);
  if (base.clock !== after.clock) {
    process.stderr.write(`manifests carry different clocks: ${base.clock} vs ${after.clock}\n`);
    return 2;
  }
  const keep = stories =>
    Object.fromEntries(Object.entries(stories).filter(([, s]) => !components || components.includes(s.component)));
  const baseStories = keep(base.stories);
  const afterStories = keep(after.stories);
  const { ids, onlyIn } = storyIdsToCompare(baseStories, afterStories);
  if (onlyIn.baseline.length > 0 || onlyIn.after.length > 0) {
    for (const id of onlyIn.baseline) process.stderr.write(`only in baseline: ${id}\n`);
    for (const id of onlyIn.after) process.stderr.write(`only in after: ${id}\n`);
    return 2;
  }
  const over = [];
  for (const id of ids) {
    const dir = afterStories[id].component;
    const a = PNG.sync.read(readFileSync(join(baselineDir, `${id}.png`)));
    const b = PNG.sync.read(readFileSync(join(afterDir, `${id}.png`)));
    const { pixels, diff } = compareImages(a, b);
    const noise = baseStories[id].noise ?? 0;
    const budget = Math.max(budgetFor(dir, budgets), noise);
    if (pixels > budget) {
      if (diff) writeFileSync(join(afterDir, `${id}.diff.png`), PNG.sync.write(diff));
      over.push(
        `${id} (${dir}): ${pixels === Infinity ? 'size differs' : `${pixels}px`} > budget ${budget}px${noise > 0 ? ` (incl. noise floor ${noise}px)` : ''}`,
      );
    }
  }
  process.stdout.write(`compared ${ids.length} stories, ${over.length} over budget\n`);
  if (over.length > 0) {
    process.stdout.write(`${over.join('\n')}\n`);
    return 1;
  }
  return 0;
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { components: { type: 'string' }, budget: { type: 'string' } },
    allowPositionals: true,
  });
  const [command, first, second] = positionals;
  const components = splitList(values.components);
  if (command === 'capture' && first && !second) return capture(resolve(first), components);
  if (command === 'compare' && first && second) {
    return compare(resolve(first), resolve(second), components, parseBudgets(values.budget));
  }
  process.stderr.write(
    'usage: story-regression.mjs capture <outDir> [--components <dir,...>]\n' +
      '       story-regression.mjs compare <baselineDir> <afterDir> [--components <dir,...>] [--budget <dir>=<n>px,...]\n',
  );
  return 2;
}

if (isEntrypoint(import.meta.url)) {
  main(process.argv.slice(2)).then(
    code => process.exit(code),
    err => {
      process.stderr.write(`story-regression: ${err?.message ?? err}\n`);
      process.exit(2);
    },
  );
}
