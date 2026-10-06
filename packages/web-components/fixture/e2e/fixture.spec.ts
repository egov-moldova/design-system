// Tests 5-8: the delivery shapes only the lazy loader has, and the core's refusal to export its
// script-tag build. Tests 1-4 run on `/` from `assets.spec.ts`, which the runner copies in next to
// this file with `asset-checks.ts`.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
// (`import(`./${id}.entry.js`)` against its own location). Vite, like Rollup, does not emit those
// chunks, so a bundled import would register the elements and render none. The core therefore does
// not export it (#193): the same import must fail the build, naming the specifier, instead of
// shipping a page that 404s. The script-tag shape itself stays covered by `esm-script.html` above.
test('exports: a bundled mud.esm.js import fails to resolve', async () => {
  const { build } = await import('vite');
  const app = fileURLToPath(new URL('..', import.meta.url));
  const error = await build({
    root: app,
    configFile: false,
    logLevel: 'silent',
    build: { write: false, rollupOptions: { input: join(app, 'bundled-import/entry.ts') } },
  }).then(
    () => null,
    (failure: unknown) => failure,
  );
  expect(error, 'the bundled import built').toBeInstanceOf(Error);
  // The specifier, in either resolver's wording: Rolldown's native resolver (`"./mud.esm.js" is not
  // exported`) or Vite's JS one (`Missing "./mud.esm.js" specifier`). A missing file or package
  // throws neither, so the match still tells an exports refusal from any other build failure.
  expect((error as Error).message).toMatch(/"\.\/mud\.esm\.js" is not exported|Missing "\.\/mud\.esm\.js" specifier/);
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
