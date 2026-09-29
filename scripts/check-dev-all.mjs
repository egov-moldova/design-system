#!/usr/bin/env node
/**
 * check-dev-all.mjs — issue #163 acceptance: `yarn dev:all` really serves Storybook (6007) and
 * the vanilla demo (5174) from ONE watch build, and a component edit and a locale switch both
 * reach a page without a reload of the servers.
 *
 * Committed and run on demand. It is NOT in CI or `test:scripts`: it starts long-running
 * servers, rewrites `dist/` through the Stencil watcher and drives a real browser.
 *
 * Steps (each failure names the step):
 *   1. start `yarn dev:all` in its own process group; wait for both servers to answer HTTP 200;
 *   2. append a comment line to `src/components/mud-badge/mud-badge.tsx` and wait until
 *      `dist/mud/mud.esm.js`'s mtime advances (60 s budget);
 *   3. in a Storybook `mud-badge` story and in the demo `mud-badge` page, assert a `mud-badge`
 *      has a rendered `shadowRoot`;
 *   4. at a 1280 px viewport, open the demo `mud-pagination` page and the Storybook
 *      `mud-pagination` Docs page, switch the locale control to `Русский`, and assert the first
 *      mounted `mud-pagination`'s visible next-button text becomes the `ru-MD` `nextLabel`
 *      without a reload.
 *
 * Cleanup guarantee: whatever happens (success, failed assertion, thrown error, SIGINT / SIGTERM
 * / SIGHUP, process exit) the process group of `yarn dev:all` is signalled (SIGTERM, then
 * SIGKILL), anything still LISTENING on 6007 / 5174 is killed (the ports were verified free
 * before the start, so any listener is ours), and `mud-badge.tsx` is written back byte-for-byte
 * from the Buffer read before the edit. The final `exit` hook repeats the synchronous parts, so
 * even a crash in the async cleanup leaves neither servers nor an edited component behind.
 *
 * Playwright is the repo's own devDependency, driven from this local script — never the shared
 * Playwright MCP browser.
 *
 * Usage: fnm exec --using=24 -- node scripts/check-dev-all.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, globSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const STORYBOOK = 'http://localhost:6007';
const DEMO = 'http://localhost:5174';
const PORTS = [6007, 5174];
const BADGE_TSX = join(ROOT, 'src/components/mud-badge/mud-badge.tsx');
const BUNDLE = join(ROOT, 'dist/mud/mud.esm.js');
const START_TIMEOUT_MS = 240_000;
const REBUILD_TIMEOUT_MS = 60_000;
const LOG_FILE = join(tmpdir(), `check-dev-all-${process.pid}.log`);

let child;
let logFd;
let badgeOriginal; // Buffer, set before the first write to BADGE_TSX
let cleaned = false;

const step = message => console.log(`\n[check-dev-all] ${message}`);
const sleep = ms => new Promise(done => setTimeout(done, ms));

function restoreBadge() {
  if (badgeOriginal === undefined) return;
  writeFileSync(BADGE_TSX, badgeOriginal);
}

/**
 * Runs `restore` and, on failure, prints a message that names the file to restore by hand —
 * the same guarded shape as `cleanupSync`'s other steps (`signalGroup`, `killListeners`,
 * closing `logFd`), so a broken filesystem write here can never abort the rest of cleanup or
 * fail silently. Exported (and `restore`/`badgeTsxPath`/`log` are parameters, not module
 * globals) so a test can exercise the catch branch without touching the real filesystem.
 */
export function safeRestoreBadge(restore, badgeTsxPath, log = console.error) {
  try {
    restore();
  } catch (error) {
    log(`\n[check-dev-all] FAILED TO RESTORE ${badgeTsxPath} — restore it by hand: ${error?.message ?? error}`);
  }
}

function signalGroup(signal) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    // group already gone
  }
}

function listenerPids() {
  const pids = new Set();
  for (const port of PORTS) {
    const out = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
    for (const pid of out.stdout.split('\n').filter(Boolean)) pids.add(Number(pid));
  }
  return [...pids];
}

function killListeners() {
  for (const pid of listenerPids()) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
}

/** Synchronous, idempotent, and the only thing the `exit` hook needs. */
function cleanupSync() {
  signalGroup('SIGKILL');
  killListeners();
  safeRestoreBadge(restoreBadge, BADGE_TSX);
  if (logFd !== undefined) {
    try {
      closeSync(logFd);
    } catch {
      // already closed
    }
    logFd = undefined;
  }
}

async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  signalGroup('SIGTERM');
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && listenerPids().length > 0) await sleep(250);
  cleanupSync();
}

process.on('exit', cleanupSync);
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    cleanup().finally(() => process.exit(130));
  });
}

async function httpStatus(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    await res.arrayBuffer();
    return res.status;
  } catch {
    return 0;
  }
}

async function waitFor(description, timeoutMs, probe) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null)
      throw new Error(`yarn dev:all exited early (${child.exitCode}) while waiting for ${description}`);
    const value = await probe();
    if (value) return value;
    await sleep(500);
  }
  throw new Error(`timed out after ${timeoutMs / 1000}s waiting for ${description}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** First page under demo/pages/* named for the tag, so a category move never breaks this. */
function demoPage(tag) {
  const [rel] = globSync(`web-components/demo/pages/*/${tag}.html`, { cwd: ROOT });
  assert(rel, `no demo page for ${tag}`);
  return `${DEMO}/${rel.replace('web-components/demo/', '')}`;
}

async function storybookEntry(title, type) {
  const res = await fetch(`${STORYBOOK}/index.json`);
  const { entries } = await res.json();
  const entry = Object.values(entries).find(e => e.title === title && e.type === type);
  assert(entry, `Storybook has no ${type} entry titled ${title}`);
  return entry.id;
}

async function hasRenderedBadge(page) {
  await page.waitForFunction(() => {
    const badge = document.querySelector('mud-badge');
    return Boolean(badge && badge.shadowRoot && badge.shadowRoot.childElementCount > 0);
  });
}

/** Visible next-button text of the first mud-pagination in `root` (a Page or Frame). */
function firstNextLabel(root) {
  return root.evaluate(() => {
    const host = document.querySelector('mud-pagination');
    const label = host?.shadowRoot?.querySelector('.nav-next .nav-label');
    if (!label) return null;
    const box = label.getBoundingClientRect();
    if (getComputedStyle(label).display === 'none' || box.width === 0) return null;
    return (label.textContent ?? '').trim();
  });
}

async function switchStorybookLang(page) {
  // The toolbar button's accessible name is the `lang` global's description plus its current title.
  const trigger = page.getByRole('button', { name: /Built-in component copy only/ }).first();
  await trigger.waitFor({ timeout: 15_000 });
  await trigger.click();
  await page.getByText('Русский', { exact: true }).first().click();
  return 'toolbar';
}

async function main() {
  // Preflight: a foreign server on our ports would make every later assertion meaningless.
  assert(listenerPids().length === 0, `something already listens on ${PORTS.join(' or ')}; stop it first`);
  assert(existsSync(BADGE_TSX), `${BADGE_TSX} is missing`);

  const { chromium } = await import('playwright');
  const { PAGINATION_MESSAGES } = await import(
    pathToFileURL(join(ROOT, 'src/components/mud-pagination/mud-pagination.messages.ts')).href
  );
  const roNext = PAGINATION_MESSAGES['ro-MD'].nextLabel;
  const ruNext = PAGINATION_MESSAGES['ru-MD'].nextLabel;
  assert(roNext !== ruNext, 'ro-MD and ru-MD nextLabel must differ for this check to discriminate');

  step(`starting yarn dev:all (log: ${LOG_FILE})`);
  logFd = openSync(LOG_FILE, 'w');
  child = spawn('yarn', ['dev:all'], {
    cwd: ROOT,
    detached: true, // own process group, so the whole wireit tree can be signalled at once
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, MUD_DEMO_NO_OPEN: '1', FORCE_COLOR: '0' },
  });

  await waitFor('Storybook on 6007 and the demo on 5174 to answer 200', START_TIMEOUT_MS, async () => {
    const [sb, demo] = await Promise.all([httpStatus(`${STORYBOOK}/iframe.html`), httpStatus(`${DEMO}/index.html`)]);
    return sb === 200 && demo === 200;
  });
  assert(existsSync(BUNDLE), `${BUNDLE} missing although both servers answer`);
  step('both servers answer HTTP 200');

  step('editing mud-badge.tsx, waiting for dist/mud/mud.esm.js to advance');
  const before = statSync(BUNDLE).mtimeMs;
  badgeOriginal = readFileSync(BADGE_TSX);
  writeFileSync(BADGE_TSX, Buffer.concat([badgeOriginal, Buffer.from('\n// check-dev-all: temporary edit\n')]));
  await waitFor('dist/mud/mud.esm.js mtime to advance', REBUILD_TIMEOUT_MS, () => statSync(BUNDLE).mtimeMs > before);
  restoreBadge();
  step('bundle rebuilt; mud-badge.tsx restored');

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    step('mud-badge renders in a Storybook story and in the demo page');
    const badgeStory = await storybookEntry('Components/Badge', 'story');
    const sbPage = await context.newPage();
    await sbPage.goto(`${STORYBOOK}/iframe.html?id=${badgeStory}&viewMode=story`);
    await hasRenderedBadge(sbPage);
    const demoPage1 = await context.newPage();
    await demoPage1.goto(demoPage('mud-badge'));
    await hasRenderedBadge(demoPage1);
    await sbPage.close();
    await demoPage1.close();

    step('demo: switching the language select to Русский updates mud-pagination without a reload');
    const demoContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const demo = await demoContext.newPage();
    await demo.goto(demoPage('mud-pagination'));
    await demo.waitForFunction(() => document.querySelector('mud-pagination')?.shadowRoot?.querySelector('.nav-next'));
    await demo.evaluate(() => {
      window.__noReload = true;
    });
    assert((await firstNextLabel(demo)) === roNext, `demo: expected "${roNext}" before the switch`);
    await demo.selectOption('[data-lang-select]', { label: 'Русский' });
    await demo.waitForFunction(
      expected => {
        const label = document.querySelector('mud-pagination')?.shadowRoot?.querySelector('.nav-next .nav-label');
        return (label?.textContent ?? '').trim() === expected;
      },
      ruNext,
      { timeout: 10_000 },
    );
    assert(await demo.evaluate(() => window.__noReload === true), 'demo: the page reloaded');

    step('Storybook Docs: switching the locale control to Русский updates mud-pagination without a reload');
    const docsId = await storybookEntry('Components/Pagination', 'docs');
    const manager = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await manager.goto(`${STORYBOOK}/?path=/docs/${docsId}`);
    const frame = manager.frameLocator('#storybook-preview-iframe');
    await frame.locator('mud-pagination').first().waitFor({ timeout: 30_000 });
    const previewFrame = manager.frames().find(f => f.url().includes('iframe.html'));
    assert(previewFrame, 'Storybook: preview iframe not found');
    await previewFrame.waitForFunction(() =>
      document.querySelector('mud-pagination')?.shadowRoot?.querySelector('.nav-next'),
    );
    await previewFrame.evaluate(() => {
      window.__noReload = true;
    });
    assert((await firstNextLabel(previewFrame)) === roNext, `Storybook: expected "${roNext}" before the switch`);
    const how = await switchStorybookLang(manager);
    await previewFrame.waitForFunction(
      expected => {
        const label = document.querySelector('mud-pagination')?.shadowRoot?.querySelector('.nav-next .nav-label');
        return (label?.textContent ?? '').trim() === expected;
      },
      ruNext,
      { timeout: 10_000 },
    );
    assert(await previewFrame.evaluate(() => window.__noReload === true), 'Storybook: the preview reloaded');
    step(`Storybook locale switched via ${how}`);
  } finally {
    await browser.close();
  }
}

// Guarded so a test can `import` this module (for `safeRestoreBadge`) without starting real
// dev servers and a browser — importing a script must never have a side effect only running
// it should have.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let failure;
  try {
    await main();
  } catch (error) {
    failure = error;
  }
  await cleanup();

  if (failure) {
    console.error(`\n[check-dev-all] FAIL: ${failure.stack ?? failure}`);
    const tail = existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf8').split('\n').slice(-40).join('\n') : '';
    console.error(`\n[check-dev-all] last lines of ${LOG_FILE}:\n${tail}`);
    process.exit(1);
  }
  console.log('\n[check-dev-all] PASS');
  process.exit(0);
}
