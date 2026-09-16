/**
 * Fixture test for the backdrop walk in scripts/audit/10-contrast-pairs.mjs.
 *
 * The walk itself only exists inside `page.evaluate`, so the pure tests in
 * `10-contrast-pairs.spec.mjs` cannot reach it. This one drives a real Chromium
 * over a hand-built shadow tree — no Storybook, no build output — and asserts
 * the behaviours issue #49 turned on:
 *
 *   1. an element that paints no background is scored against the layer behind
 *      it, found by crossing the shadow boundary via `getRootNode().host`;
 *   2. a partially transparent layer is composited over what is behind it;
 *   3. the host branch walks from the element the pair was READ OFF, not from
 *      the host — a distinct code path from 1 and 2;
 *   4. the `Canvas` probe tracks the document's `color-scheme`;
 *   5. a genuinely low-contrast element still fails — the check is resolved,
 *      not silenced.
 *
 * Skipped (not failed) when the browser cannot produce samples, so
 * `yarn test:scripts` still runs on a machine without Playwright's browsers.
 * The skip reason carries the error, so a real regression inside
 * `launchBrowser` / `withPage` cannot read as "browsers not installed".
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPair, measureSamples } from '../../audit/10-contrast-pairs.mjs';

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
            .tint { background-color: rgba(255, 255, 255, 0.5); color: rgb(10, 10, 10); }
            button { background-color: transparent; border: 0; font-size: 16px; }
            .readable { color: rgb(255, 255, 255); }
            .unreadable { color: rgb(40, 40, 40); }
            .on-tint { color: rgb(0, 0, 0); }
          </style>
          <div class="wrap">
            <button class="readable">readable</button>
            <button class="unreadable">unreadable</button>
            <div class="tint"><button class="on-tint">on tint</button></div>
            <div class="panel"><slot></slot></div>
          </div>\`;
      }
    }
    customElements.define('mud-fixture', MudFixture);
  </script>
</body>
</html>`;

// The `mud-cookie-banner` / `mud-modal` shape: the component paints its surface
// on a shadow-tree container and the consumer's element is slotted INTO it, so
// the painted surface is only reachable through `assignedSlot`.
const SLOTTED_FIXTURE = FIXTURE.replace(
  '<mud-fixture class="hydrated"></mud-fixture>',
  '<mud-fixture class="hydrated"><button style="background-color: transparent; border: 0; color: rgb(255, 255, 255)">slotted</button></mud-fixture>',
).replace(
  '.wrap { background-color: transparent; }',
  '.wrap { background-color: transparent; } .panel { background-color: rgb(0, 88, 210); }',
);

// No element anywhere paints a background, so the walk runs out and the canvas
// fallback is the only thing left — which is the point. `color-scheme: dark` is
// declared here because the repo under audit declares none (see the probe's own
// comment), so this is the only place the dark canvas is reachable at all.
const DARK_CANVAS_FIXTURE = `<!doctype html>
<html>
<head><style>:root { color-scheme: dark; } body { margin: 0; }</style></head>
<body>
  <mud-fixture class="hydrated"></mud-fixture>
  <script>
    class MudFixture extends HTMLElement {
      connectedCallback() {
        this.attachShadow({ mode: 'open' }).innerHTML =
          '<button style="background-color: transparent; border: 0; color: rgb(255, 255, 255)">on canvas</button>';
      }
    }
    customElements.define('mud-fixture', MudFixture);
  </script>
</body>
</html>`;

const asUrl = html => `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

/**
 * Collect the samples, or the reason the browser could not produce them.
 *
 * The whole run is behind this one call rather than behind a separate
 * `launch()` probe: a probe only proves the browser starts, so a page that
 * launches but cannot navigate (a sandboxed CI box, a `data:` URL refused by
 * policy, the goto timeout under load) rejected the unguarded call and errored
 * the file — on exactly the machine the skip exists to protect. It also halves
 * the browsers a run starts.
 */
async function collectSamples(url) {
  try {
    return { ok: true, samples: await measureSamples(url, 'mud-fixture', 'light') };
  } catch (err) {
    return { ok: false, reason: `browser unavailable — ${err.message}` };
  }
}

/**
 * Key each pair by tag + foreground, refusing a collision rather than letting
 * the later sample overwrite the earlier one and vanish from every assertion.
 */
function byTagAndForeground(samples) {
  const pairs = {};
  for (const sample of samples) {
    const key = `${sample.tag}|${sample.fg}`;
    assert.equal(pairs[key], undefined, `two fixture samples share the key ${key}`);
    pairs[key] = buildPair(sample);
  }
  return pairs;
}

describe('10-contrast-pairs: backdrop walk in a real browser', async () => {
  const run = await collectSamples(asUrl(FIXTURE));
  const skip = run.ok ? false : run.reason;

  const samples = run.samples ?? [];
  const pairs = run.ok ? byTagAndForeground(samples) : {};

  it('collects one sample per painted surface', { skip }, () => {
    // Three shadow buttons plus the host, whose pair `findRenderedPair` reads
    // off `.tint`. A changed count means the walk is visiting a different set.
    assert.equal(samples.length, 4);
  });

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

  it('walks the host pair from the element it was read off', { skip }, () => {
    // The host paints nothing; its pair comes from `.tint` in the shadow root.
    // Walking from the host instead would reach the black body and report
    // rgb(0, 0, 0) — so this is the assertion that pins `pair.el`.
    const pair = pairs['mud-fixture|rgb(10, 10, 10)'];
    assert.ok(pair, 'expected a host sample read off the tinted wrapper');
    assert.equal(pair.bgOwn, 'rgba(255, 255, 255, 0.5)');
    assert.equal(pair.bg, 'rgb(128, 128, 128)');
  });

  it('still fails a genuinely low-contrast element', { skip }, () => {
    const pair = pairs['button|rgb(40, 40, 40)'];
    assert.ok(pair, 'expected a sample for the unreadable button');
    assert.equal(pair.bg, 'rgb(0, 0, 0)');
    assert.equal(pair.pass, false);
    assert.ok(pair.ratio < 4.5, `expected a failing ratio, got ${pair.ratio}`);
  });

  it('carries a transparent own-background through to an opaque resolved one', { skip }, () => {
    // The bar is "no row whose background is rgba(0, 0, 0, 0)". Asserting that
    // on `bg` alone proves nothing — `formatColor` can only emit `rgb(...)`.
    // What has content is that the raw stack DOES contain the transparency the
    // old code scored against, and that it no longer reaches the verdict.
    const transparent = samples.filter(s => s.bgStack.some(layer => layer === 'rgba(0, 0, 0, 0)'));
    assert.ok(transparent.length >= 3, 'fixture no longer exercises a transparent layer');
    for (const pair of Object.values(pairs)) {
      assert.doesNotMatch(pair.bg, /rgba\(/, `${pair.tag} reported a transparent background`);
    }
  });

  it('reaches a surface the element only paints on through its slot', { skip }, async () => {
    // The flattened-tree hop: the slotted button's `parentElement` is the host
    // in the LIGHT DOM, which paints nothing — walking it lands on the black
    // body. Only `assignedSlot` reaches `.panel`, which is what paints here.
    const slotted = await measureSamples(asUrl(SLOTTED_FIXTURE), 'mud-fixture', 'light');
    const pair = slotted.filter(s => s.origin === 'light').map(buildPair)[0];
    assert.ok(pair, 'expected a sample for the slotted button');
    assert.equal(pair.bgOwn, 'rgba(0, 0, 0, 0)');
    assert.equal(pair.bg, 'rgb(0, 88, 210)');
  });

  it('falls back to the dark canvas when the document declares color-scheme: dark', { skip }, async () => {
    const [pair] = (await measureSamples(asUrl(DARK_CANVAS_FIXTURE), 'mud-fixture', 'dark')).map(buildPair);
    assert.ok(pair, 'expected a sample from the dark-canvas fixture');
    assert.equal(pair.theme, 'dark');
    assert.equal(pair.canvas, 'rgb(18, 18, 18)');
    assert.equal(pair.bg, 'rgb(18, 18, 18)');
    assert.equal(pair.pass, true);
  });
});
