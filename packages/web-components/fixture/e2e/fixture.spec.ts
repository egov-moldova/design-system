// Tests 5-8, which only the lazy loader's delivery shapes need. Tests 1-4 run on `/` from
// `assets.spec.ts`, which the runner copies in next to this file with `asset-checks.ts`.
import { expect } from '@playwright/test';

import { expectNamedAssets, expectOwnIcon, settle, test } from './asset-checks';

test('cdn: loader page on a deep subpath renders', async ({ page }) => {
  await page.goto('/static/deep/sub/page/loader.html');
  await expectNamedAssets(page);
  await expectOwnIcon(page);
});

test('cdn: import map and script-tag pages render', async ({ page }) => {
  for (const path of ['/static/importmap.html', '/static/esm-script.html']) {
    await page.goto(path);
    await expectNamedAssets(page);
    await expectOwnIcon(page);
  }
});

// `mud.esm.js` is the script-tag build: it loads its component chunks by a URL it computes at runtime
// (`import(`./${id}.entry.js`)` against its own location). A bundler cannot see those chunks, so in a
// bundled app the import registers the elements and the chunks 404. Registration is all this test
// asserts; these three errors are that known limit, and any other console error still fails it.
test.describe('side-effect import', () => {
  test.use({
    expectedErrors: new RegExp(
      [
        'Failed to load resource: the server responded with a status of 404',
        'Failed to fetch dynamically imported module: .*\\.entry\\.js',
        'Constructor for "mud-button#undefined" was not found',
      ].join('|'),
    ),
  });

  test('side effects: mud.esm.js import registers elements', async ({ page }) => {
    await page.goto('/side-effect.html');
    // The built page, not a dev server: its one script is a hashed file Vite wrote under `assets/`.
    await expect(page.locator('script[type="module"]')).toHaveAttribute('src', /^\/assets\//);
    await expect
      .poll(() => page.evaluate(() => customElements.get('mud-button') !== undefined), { message: 'mud-button' })
      .toBe(true);
  });
});

test('assets: one shown icon downloads exactly one asset chunk', async ({ page, network }) => {
  await page.goto('/static/one-icon.html');
  await expect
    .poll(() => page.locator('mud-icon').evaluate(el => el.shadowRoot?.querySelector('svg') != null))
    .toBe(true);
  await settle(page, network);
  const downloaded = await network.markers();
  const carriers = new Set([...downloaded.values()].flat());
  expect([...downloaded.keys()], 'markers in the responses').toEqual(['icon:outlined/umbrella']);
  expect([...carriers], 'responses carrying a marker').toHaveLength(1);
});
