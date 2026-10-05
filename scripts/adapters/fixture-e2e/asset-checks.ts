// Shared by every consumer fixture's Playwright specs. The runner (scripts/adapters/consumer-fixture.mjs)
// copies this directory into the temp fixture app's `e2e/`, so it runs where the browser is, and the
// four apps are asserted by the same code.
//
// The page contract every fixture page renders:
//   data-testid="asset-icon"    mud-icon name="calendar"
//   data-testid="asset-logo"    mud-logo name="mpass-logo-with-name"
//   data-testid="asset-phone"   mud-phone-input, default country MD
//   data-testid="asset-select"  mud-select
import { expect, test as base, type Locator, type Page } from '@playwright/test';

/** What each contract element must draw: the `data-mud-asset` marker of its SVG. */
export const EXPECTED = {
  icon: 'icon:outlined/calendar',
  logo: 'logo:mpass-logo-with-name',
  flag: 'flag:md',
  chevron: 'icon:outlined/chevron-bottom',
} as const;

// Assets that exist in the core and that no component on the contract pages renders.
// Baseline: `grep -nE "outlined/umbrella|msign-logo-with-verb|'jp'" src/generated/*/index.ts` finds one row each.
export const NEVER_SHOWN = ['icon:outlined/umbrella', 'logo:msign-logo-with-verb', 'flag:jp'] as const;

// An SVG module is a JavaScript string, so the marker sits in a script as `data-mud-asset="…"`, or as
// `data-mud-asset=\"…\"` once a bundler has re-quoted the string.
const MARKER = /data-mud-asset=\\?["']([^"'\\]+)/g;

export interface Network {
  /** The URL of every response the page received, in arrival order. */
  urls: string[];
  /** Every marker found in a JavaScript response body, with the URLs carrying it. */
  markers(): Promise<Map<string, string[]>>;
}

// Every test runs with a console watch: "no console error" is part of every check, not one more
// test that could run before the error happens. A failed request (a 404 on an asset) is also logged
// by the browser as a console error; a request that never completes is caught too.
export const test = base.extend<{ page: Page; network: Network; expectedErrors: RegExp }>({
  // Console errors a test knowingly provokes; every other one still fails it. Set with `test.use`.
  // One RegExp, not a list: Playwright reads an array value as a `[value, options]` fixture tuple.
  expectedErrors: [/(?!)/, { option: true }],

  page: async ({ page, expectedErrors }, use) => {
    const errors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(String(error)));
    page.on('requestfailed', request => {
      // The browser aborts a request it no longer needs (a navigation, a cancelled prefetch):
      // that is not a failure of the page.
      if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
      errors.push(`request failed: ${request.url()}`);
    });
    await use(page);
    const unexpected = errors.filter(message => !expectedErrors.test(message));
    expect(unexpected, 'console errors').toEqual([]);
  },

  // Registered before the test body runs, so it sees the first request of the first navigation.
  network: async ({ page }, use) => {
    const urls: string[] = [];
    const found = new Map<string, string[]>();
    const reads: Promise<void>[] = [];
    const unreadable: string[] = [];
    page.on('response', response => {
      const url = response.url();
      urls.push(url);
      const isScript =
        /javascript/.test(response.headers()['content-type'] ?? '') || /\.m?js(?:$|\?)/.test(new URL(url).pathname);
      if (!isScript) return;
      reads.push(
        response.text().then(
          text => {
            for (const match of text.matchAll(MARKER))
              found.set(match[1], [...new Set([...(found.get(match[1]) ?? []), url])]);
          },
          () => void unreadable.push(url),
        ),
      );
    });
    await use({
      urls,
      async markers() {
        await Promise.all(reads);
        // A body the browser could not hand over would read as "no marker": fail instead of passing.
        expect(unreadable, 'script responses whose body could not be read').toEqual([]);
        return found;
      },
    });
  },
});

export const host = (page: Page, id: string): Locator => page.locator(`[data-testid="${id}"]`);

/** The marker of the SVG drawn by the shadow root `selector` reaches from `locator`, or null. */
const drawn = (locator: Locator, selector: string): Promise<string | null> =>
  locator.evaluate((el, path) => {
    // `path` is `<host selector> >> svg`: every `>>` crosses into the shadow root of the match so far.
    let scope: Element | null = el;
    for (const step of path.split('>>').map(part => part.trim())) {
      if (!scope) return null;
      scope = (scope.shadowRoot ?? scope).querySelector(step);
    }
    return scope?.getAttribute('data-mud-asset') ?? null;
  }, selector);

/** Test 1: the named icon, the named logo and the phone-input's trigger flag each hold their SVG. */
export async function expectNamedAssets(page: Page): Promise<void> {
  await expect.poll(() => drawn(host(page, 'asset-icon'), 'svg'), { message: 'asset-icon' }).toBe(EXPECTED.icon);
  await expect.poll(() => drawn(host(page, 'asset-logo'), 'svg'), { message: 'asset-logo' }).toBe(EXPECTED.logo);
  await expect
    .poll(() => drawn(host(page, 'asset-phone'), '.flag svg'), { message: 'asset-phone' })
    .toBe(EXPECTED.flag);
}

/** Test 2: a component's own icon, here the chevron `mud-select` draws for itself. */
export async function expectOwnIcon(page: Page): Promise<void> {
  await expect
    .poll(() => drawn(host(page, 'asset-select'), 'mud-icon.chevron >> svg'), { message: 'asset-select chevron' })
    .toBe(EXPECTED.chevron);
}

/** Every marker some SVG on the page carries, in the document and in every nested open shadow root. */
export const renderedMarkers = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const found = new Set<string>();
    const walk = (root: Document | ShadowRoot): void => {
      for (const el of root.querySelectorAll('*')) {
        const marker = el.getAttribute('data-mud-asset');
        if (marker) found.add(marker);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(document);
    return [...found];
  });

/**
 * Waits until the page has stopped loading: the network is idle and no response has arrived for
 * three polls in a row (a chunk requested by a render that the last response triggered).
 */
export async function settle(page: Page, network: Network): Promise<void> {
  await page.waitForLoadState('networkidle');
  let last = -1;
  let stable = 0;
  for (let attempt = 0; attempt < 40 && stable < 3; attempt++) {
    await page.waitForTimeout(250);
    stable = network.urls.length === last ? stable + 1 : 0;
    last = network.urls.length;
  }
}
