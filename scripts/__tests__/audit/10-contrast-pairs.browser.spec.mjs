/**
 * Fixture test for the backdrop walk in scripts/audit/10-contrast-pairs.mjs.
 *
 * The walk itself only exists inside `page.evaluate`, so the pure tests in
 * `10-contrast-pairs.spec.mjs` cannot reach it. This one drives a real Chromium
 * over a hand-built shadow tree — no Storybook, no build output — and asserts
 * the three behaviours issue #49 turned on:
 *
 *   1. an element that paints no background is scored against the layer behind
 *      it, found by crossing the shadow boundary via `getRootNode().host`;
 *   2. a partially transparent layer is composited over what is behind it;
 *   3. a genuinely low-contrast element still fails — the check is resolved,
 *      not silenced.
 *
 * Skipped (not failed) when Chromium cannot launch, so `yarn test:scripts`
 * still runs on a machine without Playwright's browsers installed.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPair, measureSamples } from '../../audit/10-contrast-pairs.mjs';
import { launchBrowser } from '../../audit/lib/browser-context.mjs';

// The canvas is BLACK on purpose. With a white one, dropping the walk entirely
// still produced the right answer through `resolveBackground`'s canvas
// fallback, so the fixture could not tell a working walk from a missing one.
// Every expectation below inverts when the backdrop is not actually resolved.
//
// `.hydrated` because `measureSamples` waits for it before measuring — the
// Stencil runtime adds it, and the fixture states it outright.
const FIXTURE = `<!doctype html>
<html>
<head><style>body { margin: 0; background-color: rgb(0, 0, 0); }</style></head>
<body>
  <mud-fixture class="hydrated"></mud-fixture>
  <script>
    class MudFixture extends HTMLElement {
      connectedCallback() {
        this.attachShadow({ mode: 'open' }).innerHTML = \`
          <style>
            .wrap { background-color: transparent; }
            .tint { background-color: rgba(255, 255, 255, 0.5); }
            button { background-color: transparent; border: 0; font-size: 16px; }
            .readable { color: rgb(255, 255, 255); }
            .unreadable { color: rgb(40, 40, 40); }
            .on-tint { color: rgb(0, 0, 0); }
          </style>
          <div class="wrap">
            <button class="readable">readable</button>
            <button class="unreadable">unreadable</button>
            <div class="tint"><button class="on-tint">on tint</button></div>
          </div>\`;
      }
    }
    customElements.define('mud-fixture', MudFixture);
  </script>
</body>
</html>`;

const FIXTURE_URL = `data:text/html;charset=utf-8,${encodeURIComponent(FIXTURE)}`;

async function chromiumAvailable() {
  try {
    const { close } = await launchBrowser();
    await close();
    return true;
  } catch {
    return false;
  }
}

describe('10-contrast-pairs: backdrop walk in a real browser', async () => {
  const available = await chromiumAvailable();
  const skip = available ? false : 'Chromium unavailable — run `yarn dlx playwright install chromium`';

  // Keyed by tag + foreground: each fixture element was given a distinct color
  // so one sample is addressable without the walk reporting class names.
  const pairs = available
    ? Object.fromEntries(
        (await measureSamples(FIXTURE_URL, 'mud-fixture', 'light')).map(s => [`${s.tag}|${s.fg}`, buildPair(s)]),
      )
    : {};

  it('resolves a transparent element to the canvas behind its shadow host', { skip }, () => {
    const pair = pairs['button|rgb(255, 255, 255)'];
    assert.ok(pair, 'expected a sample for the readable button');
    assert.equal(pair.bgOwn, 'rgba(0, 0, 0, 0)');
    assert.equal(pair.bg, 'rgb(0, 0, 0)');
    assert.equal(pair.ratio, 21);
    assert.equal(pair.pass, true);
  });

  it('composites a partially transparent ancestor over the canvas', { skip }, () => {
    const pair = pairs['button|rgb(0, 0, 0)'];
    assert.ok(pair, 'expected a sample for the button on the tinted wrapper');
    assert.equal(pair.bgOwn, 'rgba(0, 0, 0, 0)');
    assert.equal(pair.bg, 'rgb(128, 128, 128)');
  });

  it('still fails a genuinely low-contrast element', { skip }, () => {
    const pair = pairs['button|rgb(40, 40, 40)'];
    assert.ok(pair, 'expected a sample for the unreadable button');
    assert.equal(pair.bg, 'rgb(0, 0, 0)');
    assert.equal(pair.pass, false);
    assert.ok(pair.ratio < 4.5, `expected a failing ratio, got ${pair.ratio}`);
  });

  it('reports no transparent background on any sample', { skip }, () => {
    assert.ok(Object.keys(pairs).length >= 3, 'expected the fixture to produce samples');
    for (const pair of Object.values(pairs)) {
      assert.doesNotMatch(pair.bg, /rgba\(/, `${pair.tag} reported a transparent background`);
    }
  });
});
