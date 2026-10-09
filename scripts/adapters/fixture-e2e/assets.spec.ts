// Asset delivery, asserted once for every adapter's app page (`/`). The runner copies this file into
// the temp fixture app's `e2e/` and sets FIXTURE_FRAMEWORK (react | vue | angular | web-components).
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect } from '@playwright/test';

import { EXPECTED, NEVER_SHOWN, expectNamedAssets, expectOwnIcon, renderedMarkers, settle, test } from './asset-checks';

const framework = process.env.FIXTURE_FRAMEWORK;

test('assets: named icon, logo and flag render', async ({ page }) => {
  await page.goto('/');
  await expectNamedAssets(page);
});

test("assets: a component's own icon renders", async ({ page }) => {
  await page.goto('/');
  await expectOwnIcon(page);
});

test('assets: never-shown assets are not downloaded', async ({ page, network }) => {
  await page.goto('/');
  await expectNamedAssets(page);
  await expectOwnIcon(page);
  await settle(page, network);

  const rendered = new Set(await renderedMarkers(page));
  const downloaded = await network.markers();

  // Guard against a vacuous pass: the assets the page shows must be seen in the responses, or the
  // collector read nothing.
  for (const marker of Object.values(EXPECTED)) {
    expect(downloaded.has(marker), `${marker} is shown but no response carried its marker`).toBe(true);
  }
  // The probe assets are only meaningful while no component on the page draws them.
  for (const marker of NEVER_SHOWN) expect(rendered.has(marker), `${marker} is rendered by the page`).toBe(false);

  const unshown = [...downloaded]
    .filter(([marker]) => !rendered.has(marker))
    .map(([marker, urls]) => `${marker} <- ${urls.join(', ')}`);
  expect(unshown, 'markers downloaded that no shadow root on the page renders').toEqual([]);
  for (const marker of NEVER_SHOWN) expect(downloaded.has(marker), `${marker} was downloaded`).toBe(false);
});

// The lazy loader's registry names every tag by design, so for it the check is on the network.
// For the other three the build output is the custom-elements bundle, which carries only what the
// app imports.
const BUILD_OUTPUT: Record<string, string> = {
  react: 'dist',
  vue: 'dist',
  // The runner copies the fixture into a temp directory and runs this spec from it, so the production
  // build the browser serves is `dist/fixture/browser` under the working directory.
  angular: 'dist/fixture/browser',
};

/**
 * The bundle ids that the registries of the installed core give `mud-stepper`: the stems of its
 * `*.entry.js` chunk. `esm/loader.js` is the registry the adapter's loader uses (the id is the tag),
 * `mud/mud.esm.js` the script-tag build's (a hashed id). The registry is a JSON string inside a
 * script, so its quotes carry one or more backslashes.
 */
function stepperEntryIds(): string[] {
  const dist = resolve(process.cwd(), 'node_modules/@egov-moldova/mud/dist');
  const ids = new Set<string>();
  for (const file of ['esm/loader.js', 'mud/mud.esm.js']) {
    const source = readFileSync(join(dist, file), 'utf8');
    const found = [...source.matchAll(/\[\\*"([^"\\]+)\\*",\[\[\d+,\\*"mud-stepper\\*"/g)].map(match => match[1]);
    // A registry that no longer lists mud-stepper means this lookup went stale, not that it is safe.
    expect(found.length, `${file} lists no mud-stepper bundle`).toBeGreaterThan(0);
    for (const id of found) ids.add(id);
  }
  return [...ids];
}

test('bundle: an unimported component is not bundled', async ({ page, network }) => {
  if (framework === 'web-components') {
    const ids = stepperEntryIds();
    // The loader registry lists mud-stepper, so an empty list means this lookup went stale.
    expect(ids.length, 'mud-stepper entry ids read from the installed core registries').toBeGreaterThan(0);
    await page.goto('/');
    await expectNamedAssets(page);
    await settle(page, network);
    // Another entry chunk was requested (the page's own components), or the filter below sees nothing.
    expect(
      network.urls.some(url => /\.entry[.-]/.test(url)),
      'no entry chunk was requested at all',
    ).toBe(true);
    const requested = network.urls.filter(url => ids.some(id => url.includes(`${id}.entry`)));
    expect(requested, `the mud-stepper entry chunk (${ids.join(', ')}) was requested`).toEqual([]);
    return;
  }

  const relative = BUILD_OUTPUT[framework ?? ''];
  expect(relative, `no build output directory is known for FIXTURE_FRAMEWORK=${framework}`).toBeTruthy();
  const output = resolve(process.cwd(), relative);
  const files = readdirSync(output, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile());
  expect(files.length, `no build output under ${output}`).toBeGreaterThan(0);
  const sources = files.map(entry => readFileSync(join(entry.parentPath, entry.name), 'utf8'));
  // The scan must be able to see a component: the one the page imports is in the output.
  expect(
    sources.some(source => source.includes('mud-select')),
    'no file of the build output contains mud-select',
  ).toBe(true);
  // The fixture never imports `mud-stepper`: any file naming it carries a component nobody asked for.
  const carriers = files.filter((_, index) => sources[index].includes('mud-stepper')).map(entry => entry.name);
  expect(carriers, 'files of the build output that contain mud-stepper').toEqual([]);
});
