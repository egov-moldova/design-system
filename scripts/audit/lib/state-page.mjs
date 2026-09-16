/**
 * Render one manifest state in Storybook exactly the way Figma draws it, so a
 * screenshot or a computed-style read compares like with like:
 *
 *   - fixed clock          → date-dependent components ("today") are deterministic
 *   - device scale factor  → capture resolution matches the Figma export scale
 *   - theme via globals    → the Storybook theme decorator and backgrounds both switch
 *   - optional fixture     → `html` replaces the story canvas with the exact markup
 *   - optional props       → `props` assigns array / object properties the markup cannot carry
 *   - hydration + fonts    → no unstyled or fallback-font frames
 *   - interactions         → click steps, then hover / keyboard focus (:focus-visible) / press
 *
 * Shared by `11-pixel-diff-states` and `15-style-parity`.
 */
import { normalizeColor, shadowExtents } from './style-values.mjs';
import { storyUrl } from './storybook-helpers.mjs';

const SETTLE_MS = 350; // longer than the 150ms component transitions

/** Storybook iframe URL for a resolved state, including the theme globals. */
export function stateUrl(state, baseUrl) {
  const url = new URL(storyUrl({ storyId: state.story, baseUrl }));
  if (state.theme === 'dark') url.searchParams.set('globals', 'mode:dark;backgrounds.value:dark');
  return url.toString();
}

/**
 * Open a page for a resolved state (see `resolveState` in figma-manifest.mjs).
 * @returns {Promise<{ page, context, release: () => Promise<void> }>}
 */
export async function openState(browser, state, { baseUrl, scale = 2 }) {
  // No `reducedMotion` here: with it set, `:focus` stops matching in every
  // context after the first one in the same browser (Playwright 1.63 /
  // Chromium 153). Transitions are waited out instead (SETTLE_MS) and the
  // screenshot freezes CSS animations.
  const context = await browser.newContext({
    viewport: state.viewport,
    deviceScaleFactor: scale,
    colorScheme: state.theme,
  });
  if (state.clock) await context.clock.setFixedTime(new Date(state.clock));
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(stateUrl(state, baseUrl), { waitUntil: 'load' });
  await waitForHydration(page);

  if (state.theme === 'dark') {
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
  }
  if (state.html) {
    await page.evaluate(html => {
      const root = document.querySelector('#storybook-root') ?? document.body;
      // Room around the fixture so shadow bleed is never clipped by the viewport edge.
      root.style.padding = '48px';
      root.innerHTML = html;
    }, state.html);
    await waitForHydration(page);
  }
  if (state.props) {
    await page.evaluate(props => {
      for (const [selector, values] of Object.entries(props)) {
        const els = document.querySelectorAll(selector);
        if (els.length === 0) throw new Error(`props target not found: ${selector}`);
        els.forEach(el => Object.assign(el, values));
      }
    }, state.props);
    await page.evaluate(() =>
      Promise.all(
        [...document.querySelectorAll('*')]
          .filter(el => el.tagName.startsWith('MUD-') && el.componentOnReady)
          .map(el => el.componentOnReady()),
      ),
    );
  }
  await page.evaluate(() => document.fonts.ready.then(() => true));

  let release = async () => {};
  for (const step of state.interactions ?? []) {
    await release();
    release = await interact(page, step);
    await page.waitForTimeout(SETTLE_MS);
  }
  await page.waitForTimeout(SETTLE_MS);

  return {
    page,
    context,
    release: async () => {
      await release();
      await context.close();
    },
  };
}

async function waitForHydration(page) {
  await page.waitForFunction(
    () => {
      const els = [...document.querySelectorAll('*')].filter(el => el.tagName.startsWith('MUD-'));
      return els.length > 0 && els.every(el => el.classList.contains('hydrated'));
    },
    null,
    { timeout: 15000 },
  );
}

async function interact(page, { type, target }) {
  const locator = page.locator(target).first();
  if ((await locator.count()) === 0) throw new Error(`interaction target not found: ${target}`);
  if (type === 'hover') {
    await locator.hover();
    return async () => {};
  }
  if (type === 'click') {
    // Changes component state (open a view, select a value); the pointer is
    // moved away afterwards so the click leaves no hover behind.
    await locator.click();
    await page.mouse.move(0, 0);
    return async () => {};
  }
  if (type === 'focus') {
    // A keyboard event first, so Chromium treats the programmatic focus as
    // keyboard focus and matches :focus-visible.
    await page.keyboard.press('Shift');
    await locator.focus();
    return async () => {};
  }
  // press: hold the primary button down while the capture happens.
  await locator.hover();
  await page.mouse.down();
  return async () => {
    await page.mouse.up();
  };
}

/**
 * Screenshot the capture target. `bleed: "auto"` grows the clip by the
 * element's own box-shadow extents — the same area Figma adds to an exported
 * node's render bounds — so a Figma PNG and the capture share one canvas.
 *
 * @returns {Promise<{ path, box: {x,y,width,height}, bleed: {top,right,bottom,left} }>}
 */
export async function captureState(page, { selector, bleed = 'auto' }, outputPath) {
  const locator = page.locator(selector).first();
  if ((await locator.count()) === 0) throw new Error(`capture target not found: ${selector}`);
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`capture target has no layout box: ${selector}`);

  let ext;
  if (bleed === 'auto') {
    ext = shadowExtents(await locator.evaluate(el => getComputedStyle(el).boxShadow));
  } else {
    ext = { top: bleed, right: bleed, bottom: bleed, left: bleed };
  }

  const clip = captureClip(box, ext, page.viewportSize());
  await page.screenshot({ path: outputPath, clip, animations: 'disabled', caret: 'hide', scale: 'device' });
  return { path: outputPath, box, bleed: ext };
}

/**
 * Clip rectangle for a capture: the element's box grown by `bleed`, clamped to
 * the viewport (a bleed wider than the surrounding padding would otherwise ask
 * for pixels the screenshot cannot contain). Pure — exported for tests.
 */
export function captureClip(box, bleed, viewport) {
  const x = Math.max(0, box.x - bleed.left);
  const y = Math.max(0, box.y - bleed.top);
  return {
    x,
    y,
    width: Math.min(viewport.width - x, box.x + box.width + bleed.right - x),
    height: Math.min(viewport.height - y, box.y + box.height + bleed.bottom - y),
  };
}

/**
 * The opaque colour behind the component — what a transparent Figma export
 * should be flattened onto before diffing. First non-transparent background
 * among body and html; white if neither paints one.
 */
export async function pageBackground(page) {
  const colors = await page.evaluate(() =>
    [document.body, document.documentElement].map(el => getComputedStyle(el).backgroundColor),
  );
  for (const c of colors) {
    const hex = normalizeColor(c);
    if (hex && hex.length === 7) return hex;
  }
  return '#ffffff';
}
