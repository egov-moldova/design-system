/**
 * Lightweight Playwright wrapper shared by Tier 2 audit scripts.
 *
 * Playwright is loaded LAZILY via dynamic import so the rest of the audit
 * suite — and the smoke tests for pure helpers — never have to install it.
 * If a browser script is actually invoked without Playwright present, we
 * throw a clean message pointing the user at `yarn add -D playwright`.
 *
 * Public surface:
 *   - loadPlaywright()                            — resolves the playwright module or throws
 *   - launchBrowser({ headless, devtools })       — { browser, close() }
 *   - withPage({ url, action, headless })         — convenience: launch → newPage → goto → action → close
 *   - PLAYWRIGHT_INSTALL_HINT                     — single-line install instruction
 *
 * The wrapper does NOT impose any threading model — callers may share a
 * browser across multiple pages (faster) or launch one per call (simpler).
 */
export const PLAYWRIGHT_INSTALL_HINT =
  'Playwright is not installed. Run `yarn add -D playwright` (downloads ~50 MB) before using browser audit scripts.';

/**
 * The `playwright` package is a devDependency, but its browser binary is a
 * separate per-machine download. Without it every launch throws a long banner
 * ("Executable doesn't exist at …"); this is the one-line version.
 */
export const PLAYWRIGHT_BROWSER_HINT =
  'Playwright browser is not installed on this machine. Run `npx playwright install chromium-headless-shell` (~95 MB, once per Playwright version).';

/** True when a launch error means the browser binary has not been downloaded. */
export function isMissingBrowserError(err) {
  return /Executable doesn't exist|playwright install/i.test(String(err?.message ?? err));
}

let _cachedModule = null;

/**
 * Dynamically import the `playwright` module. Caches the resolved module so
 * repeated calls in one process are free. Throws a friendly error if the
 * package isn't installed.
 */
export async function loadPlaywright() {
  if (_cachedModule) return _cachedModule;
  try {
    _cachedModule = await import('playwright');
    return _cachedModule;
  } catch (err) {
    if (err && err.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(PLAYWRIGHT_INSTALL_HINT);
    }
    throw err;
  }
}

/**
 * Launch a Chromium browser and return a small handle.
 *
 *   const { browser, close } = await launchBrowser();
 *   const page = await browser.newPage();
 *   ...
 *   await close();
 */
export async function launchBrowser({ headless = true, devtools = false } = {}) {
  const playwright = await loadPlaywright();
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless, devtools });
  } catch (err) {
    if (isMissingBrowserError(err)) throw new Error(PLAYWRIGHT_BROWSER_HINT);
    throw err;
  }
  return {
    browser,
    async close() {
      try {
        await browser.close();
      } catch {
        // ignore — best-effort
      }
    },
  };
}

/**
 * One-shot helper: launch a browser, open one page, navigate to `url`,
 * run `action(page)`, then close everything. The action's return value is
 * passed through to the caller.
 *
 *   const errors = await withPage({
 *     url: storyUrl({ storyId: 'components-button--default' }),
 *     action: page => collectConsoleErrors(page),
 *   });
 */
export async function withPage({ url, action, headless = true, waitUntil = 'networkidle', timeoutMs = 15000 } = {}) {
  if (!url) throw new Error('withPage: url is required');
  if (typeof action !== 'function') throw new Error('withPage: action(page) function is required');

  const { browser, close } = await launchBrowser({ headless });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    await page.goto(url, { waitUntil, timeout: timeoutMs });
    return await action(page);
  } finally {
    await close();
  }
}

/**
 * Map `items` through async `fn(item, index)` with at most `limit` in flight,
 * returning results in input order (so a caller's findings stay
 * deterministic however the calls interleave).
 */
export async function mapLimit(items, limit, fn) {
  // Zero workers would resolve at once with every slot unvisited.
  if (!(limit >= 1)) throw new RangeError(`mapLimit: limit must be >= 1, got ${limit}`);
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Helper for scripts that need to test light + dark modes: toggle the global
 * Storybook theme by setting `document.documentElement.dataset.theme`.
 */
export async function setTheme(page, theme) {
  await page.evaluate(t => {
    document.documentElement.dataset.theme = t;
    return new Promise(r => requestAnimationFrame(() => r(true)));
  }, theme);
}
