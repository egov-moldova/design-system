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
 * Skipped (not failed) only when no browser can run here — Playwright missing
 * or its Chromium binary not downloaded — so `yarn test:scripts` still runs on
 * such a machine. Any other rejection, including one thrown by the code under
 * test, fails the test.
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

// The `mud-modal` shape: the component paints its surface
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
 * Whether a browser can start here at all — the ONLY condition that skips.
 *
 * The environment and the code under test are separated by what fails, not by
 * the wording of an error: if `launchBrowser` throws, this machine has no usable
 * Chromium (not installed, binary not downloaded, missing system libraries, a
 * sandbox refusing to spawn it) and the suite skips. Once a browser has started,
 * every later failure is the code's — the walk runs inside `page.evaluate`, so a
 * TypeError there rejects exactly as a missing browser would, and treating every
 * rejection as "no browser" turned the regression this file exists to catch into
 * a green, fully skipped run.
 */
async function browserCanLaunch() {
  try {
    const { close } = await launchBrowser();
    await close();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `browser unavailable — ${err.message}` };
  }
}

/** Pairs for a fixture. Called only after `browserCanLaunch` succeeded. */
async function pairsFor(url, theme = 'light') {
  return (await measureSamples(url, 'mud-fixture', theme)).map(buildPair);
}

/** Key each pair by tag + foreground; uniqueness is asserted by its own test. */
function byTagAndForeground(samples) {
  return Object.fromEntries(samples.map(sample => [`${sample.tag}|${sample.fg}`, buildPair(sample)]));
}

// A host whose own background is opaque and ends in a zero channel. Reading
// "ends in 0" as "alpha 0" made `findRenderedPair` see no painted surface and
// drop the element from the audit — a silent false negative in a WCAG gate.
const OPAQUE_HOST_FIXTURE = `<!doctype html>
<html>
<head><style>body { margin: 0; background-color: rgb(255, 255, 255); }</style></head>
<body>
  <mud-fixture class="hydrated">label</mud-fixture>
  <script>
    class MudFixture extends HTMLElement {
      connectedCallback() {
        this.style.cssText = 'display: block; background-color: rgb(255, 87, 0); color: rgb(255, 255, 255);';
        this.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>';
      }
    }
    customElements.define('mud-fixture', MudFixture);
  </script>
</body>
</html>`;

// The `mud-button` shape: a shadow `<button>` paints the fill and the label is
// SLOTTED into it. A text-presence filter on the surface scan cannot see slotted
// text, skipped this real surface, and fell through to a host pair of two colors
// that are not on screen — black on white, 21:1, PASS — where the label on its
// actual fill is what a user reads. A label that genuinely failed would have
// reported a pass.
const SLOTTED_LABEL_FIXTURE = `<!doctype html>
<html>
<head><style>body { margin: 0; background-color: rgb(255, 255, 255); }</style></head>
<body>
  <mud-fixture class="hydrated">Click me</mud-fixture>
  <script>
    class MudFixture extends HTMLElement {
      connectedCallback() {
        this.attachShadow({ mode: 'open' }).innerHTML =
          '<style>.btn { background-color: rgb(0, 88, 210); color: rgb(255, 255, 255); border: 0; font-size: 16px; }</style>' +
          '<button class="btn"><slot></slot></button>';
      }
    }
    customElements.define('mud-fixture', MudFixture);
  </script>
</body>
</html>`;

// An `<svg>` that paints a background ahead of any other painted shadow child.
// On SVG elements `className` is an SVGAnimatedString with no `.split`, so
// reading the class through it threw inside `page.evaluate` and lost the run.
const SVG_SURFACE_FIXTURE = `<!doctype html>
<html>
<head><style>body { margin: 0; background-color: rgb(255, 255, 255); }</style></head>
<body>
  <mud-fixture class="hydrated"></mud-fixture>
  <script>
    class MudFixture extends HTMLElement {
      connectedCallback() {
        this.attachShadow({ mode: 'open' }).innerHTML =
          '<svg class="icon" style="background-color: rgb(0, 88, 210)" width="8" height="8"></svg>';
      }
    }
    customElements.define('mud-fixture', MudFixture);
  </script>
</body>
</html>`;

// A gradient ancestor paints the surface while its `backgroundColor` still
// computes transparent, so reading the color alone walks through an opaque
// layer and scores the text against the page instead — a false PASS.
const GRADIENT_FIXTURE = `<!doctype html>
<html>
<head><style>body { margin: 0; background-color: rgb(255, 255, 255); }</style></head>
<body>
  <mud-fixture class="hydrated"></mud-fixture>
  <script>
    class MudFixture extends HTMLElement {
      connectedCallback() {
        this.attachShadow({ mode: 'open' }).innerHTML =
          '<div style="background-image: linear-gradient(red, blue)">' +
          '<button style="background-color: transparent; border: 0; color: rgb(255, 255, 255)">on gradient</button></div>';
      }
    }
    customElements.define('mud-fixture', MudFixture);
  </script>
</body>
</html>`;

describe('10-contrast-pairs: backdrop walk in a real browser', async () => {
  const browser = await browserCanLaunch();
  const skip = browser.ok ? false : browser.reason;

  const samples = browser.ok ? await measureSamples(asUrl(FIXTURE), 'mud-fixture', 'light') : [];
  const pairs = byTagAndForeground(samples);

  it('collects one sample per painted surface', { skip }, () => {
    // Three shadow buttons plus the host, whose pair `findRenderedPair` reads
    // off `.tint`. A changed count means the walk is visiting a different set.
    assert.equal(samples.length, 4);
  });

  it('addresses every sample by a unique key', { skip }, () => {
    // Otherwise a later sample overwrites an earlier one, the lookups below
    // still succeed, and they quietly describe a different element.
    assert.equal(Object.keys(pairs).length, samples.length);
  });

  it('keeps an opaque host whose background ends in a zero channel', { skip }, async () => {
    const opaque = await pairsFor(asUrl(OPAQUE_HOST_FIXTURE));
    assert.equal(opaque.length, 1, 'the opaque host was dropped from the audit');
    assert.equal(opaque[0].bg, 'rgb(255, 87, 0)');
    assert.equal(opaque[0].ratio, 3.17);
    assert.equal(opaque[0].pass, false);
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
      // `assert.doesNotMatch` throws a bare TypeError on null, which names
      // neither the element nor the defect — so check resolution first.
      assert.ok(pair.bg, `${pair.tag} left its background unresolved`);
      assert.doesNotMatch(pair.bg, /rgba\(/, `${pair.tag} reported a transparent background`);
    }
  });

  it('reaches a surface the element only paints on through its slot', { skip }, async () => {
    // The flattened-tree hop: the slotted button's `parentElement` is the host
    // in the LIGHT DOM, which paints nothing — walking it lands on the black
    // body. Only `assignedSlot` reaches `.panel`, which is what paints here.
    const slotted = await pairsFor(asUrl(SLOTTED_FIXTURE));
    const pair = slotted.find(s => s.origin === 'light');
    assert.ok(pair, 'expected a sample for the slotted button');
    assert.equal(pair.bgOwn, 'rgba(0, 0, 0, 0)');
    assert.equal(pair.bg, 'rgb(0, 88, 210)');
  });

  it('refuses to see through a gradient it cannot fold', { skip }, async () => {
    const gradient = await pairsFor(asUrl(GRADIENT_FIXTURE));
    const pair = gradient.find(s => s.tag === 'button');
    assert.ok(pair, 'expected a sample for the button on the gradient');
    // Reading `backgroundColor` alone would fold this to the white page and
    // report 1:1 — a number, where the honest answer is that nobody resolved
    // what is painted there.
    assert.equal(pair.bg, null);
    assert.equal(pair.error, 'unmeasurable');
    assert.ok(pair.bgStack.includes('background-image'));
  });

  it('reads a host pair off the surface that paints its slotted label', { skip }, async () => {
    const slottedLabel = await pairsFor(asUrl(SLOTTED_LABEL_FIXTURE));
    const host = slottedLabel.find(s => s.tag === 'mud-fixture');
    assert.ok(host, 'expected a host sample');
    assert.equal(host.source, 'shadow:button.btn');
    assert.equal(host.fg, 'rgb(255, 255, 255)');
    assert.equal(host.bg, 'rgb(0, 88, 210)');
    assert.equal(host.ratio, 6.31);
  });

  it('reads a host pair off an svg surface without throwing', { skip }, async () => {
    const svg = await pairsFor(asUrl(SVG_SURFACE_FIXTURE));
    const host = svg.find(s => s.tag === 'mud-fixture');
    assert.ok(host, 'expected a host sample read off the svg');
    assert.equal(host.source, 'shadow:svg.icon');
  });

  it('falls back to the dark canvas when the document declares color-scheme: dark', { skip }, async () => {
    const dark = await pairsFor(asUrl(DARK_CANVAS_FIXTURE), 'dark');
    const [pair] = dark;
    assert.ok(pair, 'expected a sample from the dark-canvas fixture');
    assert.equal(pair.theme, 'dark');
    // The dark canvas value is a UA stylesheet constant, not a spec one, so
    // the assertion is on the relationship: the probe tracked `color-scheme`,
    // and the fold landed on what it reported.
    assert.notEqual(pair.canvas, 'rgb(255, 255, 255)');
    assert.equal(pair.bg, pair.canvas);
    assert.equal(pair.pass, true);
  });
});
