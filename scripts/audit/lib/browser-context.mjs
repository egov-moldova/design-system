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
  const browser = await playwright.chromium.launch({ headless, devtools });
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
 *     url: storyUrl({ storyId: 'atoms-button--default' }),
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
 * Helper for scripts that need to test light + dark modes: toggle the global
 * Storybook theme by setting `document.documentElement.dataset.theme`.
 */
export async function setTheme(page, theme) {
  await page.evaluate(t => {
    document.documentElement.dataset.theme = t;
    return new Promise(r => requestAnimationFrame(() => r(true)));
  }, theme);
}
