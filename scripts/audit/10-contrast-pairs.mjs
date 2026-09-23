#!/usr/bin/env node
/**
 * 10-contrast-pairs.mjs
 *
 * Visits a `mud-*` story (light + dark), measures the computed foreground /
 * background / border colors of every interactive element, and reports the
 * WCAG 2.1 AA contrast ratio for each foreground-vs-background pair.
 *
 * The WCAG formula — relative luminance and the ratio — is the one
 * `scripts/audit-token-contrast.mjs` uses, but the two no longer agree on
 * everything around it: this script composites a translucent background over
 * the layers behind it, clamps out-of-gamut channels, and reads
 * `color(srgb …)`, and the token audit does none of that. A translucent tint
 * can therefore pass one and fail the other; cross-reference them knowing that.
 * The other difference is the data source: this script reads runtime computed
 * colors from the live component, not from the token files.
 *
 * The background of a pair is the COMPOSITED one: an element that paints no
 * background of its own is scored against the layers behind it, walked across
 * shadow boundaries up to the story canvas (`collectBackgroundStack` +
 * `resolveBackground`). Taking the element's own `backgroundColor` instead
 * scored transparent elements against `rgba(0, 0, 0, 0)` and reported
 * compliant components as failures (issue #49).
 *
 * Replaces AI work in:
 *   - `.claude/agents/a11y-verifier.md` Step 6 (light + dark contrast checks)
 *   - `.claude/agents/audit-production.md` Phase 3.3 (component-runtime contrast)
 *
 * Thresholds (WCAG 2.1 AA):
 *   - normal text:    4.5:1
 *   - large text:     3:1  (≥18pt or ≥14pt bold)
 *   - UI components:  3:1  (applied to `hr`, `img` and `svg` elements)
 *   - disabled:       exempt (per SC 1.4.3)
 *
 * NOT checked: SC 1.4.11 non-text contrast. `borderColor` is collected on each
 * sample but never evaluated, so a control's boundary and a focus ring against
 * their surroundings are still judged by hand.
 *
 * Usage:
 *   yarn sp.dev.watch
 *   node scripts/audit/10-contrast-pairs.mjs mud-button --json
 *   node scripts/audit/10-contrast-pairs.mjs mud-text-input --story-id atoms-input--default --json
 */
import { fileURLToPath } from 'node:url';
import { parseAuditArgs, defaultUsage } from './lib/cli-args.mjs';
import { resolveComponentPaths, listAllComponents, relativeToRepo } from './lib/component-paths.mjs';
import { buildResult, emit, finding } from './lib/json-output.mjs';
import { EXIT_INTERNAL, exitCodeFromSummary } from './lib/exit-codes.mjs';
import { listChangedComponents } from './lib/changed-components.mjs';
import { DEFAULT_PORT, isStorybookReachable, storyUrl, inferStoryId } from './lib/storybook-helpers.mjs';
import { withPage, setTheme, PLAYWRIGHT_INSTALL_HINT } from './lib/browser-context.mjs';
import { analyzeStoriesFile } from './05-story-exports.mjs';
import { INTERACTIVE_TAGS, INTERACTIVE_ROLES } from './09-a11y-tree.mjs';

const TOOL = 'contrast-pairs';

const USAGE = defaultUsage(
  '10-contrast-pairs',
  'Measure WCAG 2.1 AA color contrast for every interactive element on a Storybook story (light + dark).',
  [
    '',
    'Extra options:',
    '  --port <N>          Storybook port (default: 6007)',
    '  --story-id <id>     Specific story id (default: Default-like export)',
    '  --skip-dark         Skip the dark-mode pass',
  ],
);

// ─── WCAG 2.1 contrast math (pure, exported for tests) ────────────────────

/**
 * Clamp to a real 0..255 channel. `color-mix()` in a wide-gamut interpolation
 * space can serialize srgb components outside 0..1, and an unclamped 1.2 lands
 * as 306 — which drives `relativeLuminance` above 1.0 and yields ratios past
 * WCAG's 21:1 ceiling, i.e. a comfortable pass for any threshold.
 */
function channel(value) {
  return Math.min(255, Math.max(0, Math.round(Number(value))));
}

/**
 * One CSS number, as Chromium serializes it: an optional sign, digits with an
 * optional fraction, and an optional exponent. `color-mix()` of a near-zero
 * share computes to channels like `3.49681e-7` and alphas like `5.96046e-8`, so
 * a `[0-9.]+` class both refused a valid color — reported unreadable — and
 * accepted `.` or `1.2.3`, which became NaN and slipped past the unmeasurable
 * path as `contrast NaN:1`.
 */
const NUM = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;
const RGB_PATTERN = new RegExp(
  `^rgba?\\(\\s*(${NUM})\\s*[, ]\\s*(${NUM})\\s*[, ]\\s*(${NUM})\\s*(?:[,/]\\s*(${NUM}%?)\\s*)?\\)$`,
  'i',
);
const SRGB_PATTERN = new RegExp(
  `^color\\(\\s*srgb\\s+(${NUM})\\s+(${NUM})\\s+(${NUM})\\s*(?:\\/\\s*(${NUM}%?)\\s*)?\\)$`,
  'i',
);

/**
 * Alpha, clamped to [0, 1] as CSS clamps it. The number grammar accepts a sign
 * so that channels can be negative, and an unclamped `rgba(255, 255, 255, -1)`
 * composited to `rgb(-255, -255, -255)` and a ratio of -9.71. NaN passes through
 * untouched, for `finiteColor` to refuse.
 */
function alphaOf(token) {
  if (token === undefined) return 1;
  const value = token.endsWith('%') ? Number(token.slice(0, -1)) / 100 : Number(token);
  return Number.isNaN(value) ? value : Math.min(1, Math.max(0, value));
}

/** A color only if every component is a real number; otherwise unreadable. */
function finiteColor(r, g, b, a) {
  return [r, g, b, a].every(Number.isFinite) ? { r, g, b, a } : null;
}

/**
 * Parse `rgb(r, g, b)` / `rgba(r, g, b, a)` / `color(srgb r g b / a)` /
 * `#rrggbb` / `#rgb` into { r, g, b, a } with channels 0..255 and alpha 0..1.
 */
export function parseColor(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();

  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3)
      h = h
        .split('')
        .map(c => c + c)
        .join('');
    if (h.length === 4)
      h = h
        .split('')
        .map(c => c + c)
        .join('');
    if (h.length === 6) h = h + 'ff';
    if (h.length !== 8) return null;
    const n = parseInt(h, 16);
    return {
      r: (n >>> 24) & 0xff,
      g: (n >>> 16) & 0xff,
      b: (n >>> 8) & 0xff,
      a: (n & 0xff) / 255,
    };
  }

  const rgb = s.match(RGB_PATTERN);
  if (rgb) {
    return finiteColor(channel(rgb[1]), channel(rgb[2]), channel(rgb[3]), alphaOf(rgb[4]));
  }

  // `color(srgb r g b / a)` with 0..1 channels. Chromium serializes every
  // `color-mix(in srgb, …)` this way, and the repo ships several — so without
  // this branch those layers are unreadable at runtime.
  // Baseline: `grep -rlc 'color-mix(in srgb' src/components/*/[a-z]*.css` -> 3
  // files (mud-banner, mud-date-input, mud-toast) on 2026-09-16.
  const srgb = s.match(SRGB_PATTERN);
  if (srgb) {
    return finiteColor(
      channel(Number(srgb[1]) * 255),
      channel(Number(srgb[2]) * 255),
      channel(Number(srgb[3]) * 255),
      alphaOf(srgb[4]),
    );
  }

  // Everything else — `color(display-p3 …)`, `oklch(…)`, a gradient keyword —
  // is UNREADABLE, not absent. Returning null is what lets `resolveBackground`
  // report an unresolved backdrop instead of quietly scoring the element
  // against the layer behind the one it could not read.
  return null;
}

export function relativeLuminance({ r, g, b }) {
  const lin = c => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function compositeOver(fg, bg) {
  if (fg.a >= 1) return fg;
  return {
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
    a: 1,
  };
}

/**
 * Serialize a parsed color back to the `rgb(r, g, b)` spelling of
 * getComputedStyle. `null` in, `null` out: `resolveBackground` returns null by
 * contract, and destructuring it would throw a TypeError naming neither the
 * element nor the defect.
 */
export function formatColor(color) {
  return color ? `rgb(${color.r}, ${color.g}, ${color.b})` : null;
}

/** The background the UA paints when no element in the chain paints one. */
export const DEFAULT_CANVAS = 'rgb(255, 255, 255)';

/**
 * Composite a stack of background layers into the single opaque color that is
 * actually painted behind an element.
 *
 * `layers` is ordered nearest-first — the element's own `backgroundColor`, then
 * each ancestor's, as `collectBackgroundStack` in `measureSamples` gathers them.
 * An element with no background of its own paints on whatever is behind it, so
 * scoring it against its own `rgba(0, 0, 0, 0)` measures a color no user ever
 * sees (issue #49). Painting order is farthest-first, so the fold runs from the
 * end of the array back to the front, and a partially transparent layer is
 * composited over what is behind it rather than used as-is.
 *
 * `fallback` is the story canvas, which the page reads from the `Canvas` system
 * color. It is reached only when no layer up to `<html>` paints anything.
 *
 * This is the ONLY place alpha is decided. The walk collects every layer up to
 * the root and makes no judgment about which of them is opaque, so a color
 * spelling `parseColor` does not know can no longer make the walk stop early —
 * or vanish from the fold and leave a confident wrong number in its place.
 *
 * Returns an opaque color, or `null` when a layer it had to read was
 * unreadable. `null` travels to `classifyContrast` as `unmeasurable`, which is
 * the tool's one way of saying "I could not measure this" — the alternative is
 * a plausible two-decimal ratio for a surface nobody resolved.
 */
export function resolveBackground(layers, { fallback = DEFAULT_CANVAS } = {}) {
  const stack = [];
  for (const layer of Array.isArray(layers) ? layers : [layers]) {
    const color = parseColor(layer);
    if (!color) return null;
    stack.push(color);
    // Nothing behind an opaque layer is visible, so nothing behind it is read.
    // An unreadable layer further out therefore cannot make this unmeasurable.
    if (color.a >= 1) break;
  }
  // The fallback gets the same treatment as a layer, not a substitution: an
  // unreadable canvas silently replaced by white, or a transparent one
  // promoted to opaque black, is the "confident number for a surface nobody
  // resolved" this function exists to refuse — and it would invert every
  // verdict in a run rather than one row.
  if (stack.length === 0 || stack[stack.length - 1].a < 1) {
    const canvas = parseColor(fallback);
    if (!canvas || canvas.a < 1) return null;
    stack.push(canvas);
  }
  let out = stack[stack.length - 1];
  for (let i = stack.length - 2; i >= 0; i -= 1) {
    out = compositeOver(stack[i], out);
  }
  return out;
}

/**
 * The WCAG 2.1 contrast ratio between a foreground color (which may be
 * transparent) and a background; the foreground is composited over the
 * background to handle alpha.
 *
 * The ratio is UNROUNDED. Rounding belongs to display, never to the value a
 * threshold is compared against: `rgb(100, 123, 125)` on white is 4.4957:1,
 * which rounds to 4.5 and would pass a 4.5:1 check it does not meet. This is
 * the one place every caller reads the ratio from, so it is where the guard
 * lives — a caller cannot reintroduce the false PASS by forgetting to use an
 * exact variant.
 *
 * Returns null if either color was unparseable.
 */
export function contrastRatio(fgInput, bgInput) {
  const fgRaw = typeof fgInput === 'string' ? parseColor(fgInput) : fgInput;
  const bgRaw = typeof bgInput === 'string' ? parseColor(bgInput) : bgInput;
  if (!fgRaw || !bgRaw) return null;
  const bg = bgRaw.a < 1 ? { ...bgRaw, a: 1 } : bgRaw;
  const fg = compositeOver(fgRaw, bg);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Classify a pair by WCAG 2.1 AA thresholds.
 *   normal text   : 4.5:1  (anything below = fail)
 *   large text    : 3:1
 *   UI component  : 3:1
 *   disabled      : exempt (treated as pass)
 *
 * Caller passes `kind` from runtime context (e.g. inferred from font size
 * + role). Defaults to 'normal' which is the strictest rule.
 */
export function classifyContrast(ratio, kind = 'normal', { disabled = false } = {}) {
  // Unreadability is a TOOL defect — a color spelling the parser cannot read —
  // not a contrast one, so SC 1.4.3's disabled exemption must not swallow it.
  // Checked first for that reason: a disabled row is where the repo's
  // `color-mix()` tints live, which is exactly where a parser gap would hide.
  if (ratio === null || ratio === undefined) {
    return { kind, ratio: null, threshold: null, pass: false, error: 'unmeasurable' };
  }
  if (disabled) return { kind, ratio, threshold: null, pass: true, exempt: true };
  const threshold = kind === 'large' || kind === 'ui' ? 3 : 4.5;
  return { kind, ratio, threshold, pass: ratio >= threshold };
}

// ─── Main flow (browser side effects) ─────────────────────────────────────

async function main() {
  const args = parseAuditArgs({
    toolName: TOOL,
    usage: USAGE,
    extra: {
      'port': { type: 'string', default: String(DEFAULT_PORT) },
      'story-id': { type: 'string' },
      'skip-dark': { type: 'boolean', default: false },
    },
  });
  const t0 = Date.now();
  const port = Number(args.extras.port);
  const baseUrl = `http://localhost:${port}`;

  if (!(await isStorybookReachable({ port }))) {
    process.stderr.write(`${TOOL}: Storybook not reachable on port ${port}.\n`);
    process.exit(EXIT_INTERNAL);
  }

  const targets = await resolveTargets(args);
  if (!targets.length) {
    if (args.changed) {
      await emit(
        buildResult({ tool: TOOL, target: 'changed', findings: [], meta: { durationMs: Date.now() - t0 } }),
        args,
      );
      process.exit(0);
    }
    process.stderr.write(`${TOOL}: no components matched.\n`);
    process.exit(EXIT_INTERNAL);
  }

  let perComponent;
  try {
    perComponent = await Promise.all(
      targets.map(t =>
        analyzeComponent(t, {
          baseUrl,
          storyId: args.extras['story-id'] ?? null,
          skipDark: args.extras['skip-dark'],
        }),
      ),
    );
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n`);
    process.exit(EXIT_INTERNAL);
  }

  const findings = perComponent.flatMap(c => c.findings);
  // An unreadable pair is a warning, so a component whose every pair is
  // unreadable exits 0 having checked nothing. These counts make that visible
  // in the envelope instead of reading as a clean pass.
  const judged = perComponent.flatMap(c => c.pairs ?? []).filter(p => !p.exempt);
  const pairsUnmeasurable = judged.filter(p => p.error === 'unmeasurable').length;
  const result = buildResult({
    tool: TOOL,
    target: args.all ? 'all' : args.changed ? 'changed' : targets[0].name,
    findings,
    meta: {
      durationMs: Date.now() - t0,
      componentsScanned: targets.length,
      baseUrl,
      pairsMeasured: judged.length - pairsUnmeasurable,
      pairsUnmeasurable,
    },
  });

  if (!args.all && !args.changed && perComponent.length === 1) {
    result.meta.pairs = perComponent[0].pairs;
  }

  await emit(result, args);
  process.exit(exitCodeFromSummary(result.summary));
}

export async function analyzeComponent(target, { baseUrl, storyId = null, skipDark = false } = {}) {
  if (!target.found) {
    return {
      findings: [
        finding({
          severity: 'error',
          code: 'STRUCTURE-NOT-FOUND',
          message: `Component "${target.name ?? target.input}" not found.`,
        }),
      ],
      pairs: null,
      componentName: target.name ?? null,
    };
  }

  const resolvedStoryId = storyId ?? pickDefaultStoryId(target);
  if (!resolvedStoryId) {
    return {
      findings: [
        finding({
          severity: 'warning',
          code: 'CONTRAST-NO-STORY',
          message: `No story id resolvable for ${target.name}; pass --story-id.`,
          noTarget: true,
        }),
      ],
      pairs: null,
      componentName: target.name,
    };
  }

  const url = storyUrl({ storyId: resolvedStoryId, baseUrl });

  const lightSamples = await measureSamples(url, target.name, 'light');
  const darkSamples = skipDark ? [] : await measureSamples(url, target.name, 'dark');

  const pairs = [...lightSamples, ...darkSamples].map(s => buildPair(s));

  const findings = findingsFromPairs(pairs, relativeToRepo(target.paths.tsx));

  return { findings, pairs, componentName: target.name };
}

/**
 * Turn classified pairs into findings. Pure — exported for tests, because the
 * routing below is three-way and every branch sends the reader somewhere
 * different; a mis-route is invisible from outside the script.
 *
 * Severity follows who can act on it. A ratio below threshold is a COMPONENT
 * defect: `error`, which `exitCodeFromSummary` maps to a blocking exit. An
 * unreadable color is a TOOL limit — no token or CSS change makes a gradient
 * foldable — so it is a `warning`: reported on every run, but never a
 * permanent CI block that nothing short of deleting the design can clear.
 */
export function findingsFromPairs(pairs, file) {
  const findings = [];
  for (const p of pairs) {
    if (p.pass || p.exempt) continue;
    // For a host pair `source` names the shadow child the colors were read off,
    // not the host the `tag` names — without it the reader greps the host's CSS
    // for a background it does not declare. For any other element it is only
    // the tree it sits in (`light` or `shadow`), which narrows the search but
    // does not identify which of several matching elements it was.
    const where = `${p.theme} <${p.tag}> [${p.kind}] (${p.source})`;
    // Keyed on `bg`, not on the error: `unmeasurable` also fires when the
    // FOREGROUND is the unreadable color and the backdrop resolved fine.
    if (p.bg === null) {
      // Only up to the layer that could not be read — the ones past it were
      // never consumed, so naming them points at surfaces that are innocent.
      // When every layer parsed, the canvas is what stopped the fold, and it
      // has to be named: otherwise the message reads `layers=[]`.
      const stopped = p.bgStack.findIndex(layer => !parseColor(layer));
      const read = stopped === -1 ? [...p.bgStack, `canvas: ${p.canvas}`] : p.bgStack.slice(0, stopped + 1);
      findings.push(
        finding({
          severity: 'warning',
          code: 'CONTRAST-BACKDROP-UNREADABLE',
          file,
          message: `${where}: background unresolved. fg=${p.fg} layers=[${read.join(' | ')}].`,
          // An image cannot be taught to `parseColor`; telling the reader to
          // try is how a check gets switched off instead of read.
          // Three causes, three different readers' actions — and only one of
          // them is a spelling `parseColor` could learn.
          fix: read.includes('background-image')
            ? 'A background-image paints behind this text and cannot be folded to one color; judge this pair by eye.'
            : stopped === -1
              ? 'Nothing up to <html> paints an opaque background and the page canvas is not usable; judge this pair by eye.'
              : 'Teach parseColor the unreadable color spelling, or judge this pair by eye.',
        }),
      );
      continue;
    }
    if (p.error === 'unmeasurable') {
      findings.push(
        finding({
          severity: 'warning',
          code: 'CONTRAST-FOREGROUND-UNREADABLE',
          file,
          message: `${where}: foreground unresolved. fg=${p.fg} bg=${p.bg}.`,
          fix: 'Teach parseColor the unreadable color spelling, or judge this pair by eye.',
        }),
      );
      continue;
    }
    findings.push(
      finding({
        severity: 'error',
        code: 'CONTRAST-BELOW-THRESHOLD',
        file,
        message: `${where}: contrast ${p.ratio}:1 (threshold ${p.threshold}:1). fg=${p.fg} bg=${p.bg}.`,
        // Token values are exported from Figma and `yarn sync:tokens:apply`
        // overwrites them, so a token edit is never the fix a finding offers.
        fix: 'Check the component references the semantic token meant for this role; if it does, report the token value to design — do not edit it here.',
      }),
    );
  }
  return findings;
}

/**
 * Combine a runtime color sample with the WCAG classification. Pure — exported
 * for tests.
 *
 * `sample.bgStack` is the backdrop the browser pass collected (nearest-first);
 * `bg` on the returned pair is that stack composited down to one opaque color,
 * so the reported background is the one the user sees. `bgOwn` keeps the
 * element's own `backgroundColor` for debugging. A sample with no stack —
 * every caller outside `measureSamples` — is treated as a one-layer stack.
 */
export function buildPair(sample) {
  const bgStack = sample.bgStack ?? [sample.bg];
  const resolved = resolveBackground(bgStack, { fallback: sample.canvas ?? DEFAULT_CANVAS });
  const bg = formatColor(resolved);
  // The parsed object, not the formatted string: round-tripping it back
  // through `parseColor` is a second chance to lose what was already resolved.
  const exact = contrastRatio(sample.fg, resolved);
  const cls = classifyContrast(exact, sample.kind, { disabled: sample.disabled });
  return {
    ...sample,
    bg,
    bgOwn: sample.bg,
    bgStack,
    error: cls.error ?? null,
    // Classified on the exact value; displayed truncated rather than rounded,
    // so a reported ratio never reads as meeting a threshold it failed —
    // 4.4957 shows as 4.49, not as a failing 4.5.
    ratio: exact === null ? null : Math.floor(exact * 100) / 100,
    threshold: cls.threshold,
    pass: cls.pass,
    exempt: !!cls.exempt,
  };
}

/**
 * Drive one page and return a raw color sample per measured element. Exported
 * so the fixture test in `scripts/__tests__/audit/` can run the backdrop walk
 * against a hand-built shadow tree without a Storybook.
 */
export async function measureSamples(url, componentName, theme) {
  return withPage({
    url,
    waitUntil: 'load',
    action: async page => {
      // Wait for the component to hydrate before measuring; otherwise the host
      // has no class/attribute mapping yet and bg/fg report defaults.
      await page.waitForSelector(`${componentName}.hydrated`, { timeout: 10000 }).catch(() => null);
      await page.waitForTimeout(250);
      if (theme === 'dark') {
        await setTheme(page, 'dark');
        await page.waitForTimeout(250);
      }
      const samples = await page.evaluate(
        ctx => {
          // Scope element collection to the audited component's subtree only.
          // Without this, the selector matches Storybook chrome + tooling
          // overlays (Agentation MCP, docs page) and produces dozens of false
          // positives unrelated to the mud-* under test.
          //
          // Walk: each <mud-X> host + its light-DOM descendants (slotted
          // content) + its own shadow-root descendants. Do NOT pierce nested
          // custom-element shadow roots — those belong to other components.
          const interactiveSel = [...ctx.tags, ...ctx.roles.map(r => `[role="${r}"]`)].join(',');
          const hosts = Array.from(document.querySelectorAll(ctx.componentName));
          const collected = [];
          for (const host of hosts) {
            // The host itself — measured as "ui" kind. Background may be
            // transparent (display: inline-flex on :host with no bg); when
            // that's the case we fall back to the first inner element with a
            // non-transparent background so the measurement reflects the
            // visual the user actually sees.
            collected.push({ el: host, origin: 'host' });
            for (const el of host.querySelectorAll(interactiveSel)) {
              collected.push({ el, origin: 'light' });
            }
            if (host.shadowRoot) {
              for (const el of host.shadowRoot.querySelectorAll(interactiveSel)) {
                collected.push({ el, origin: 'shadow' });
              }
            }
          }

          // Picks which element the fg/bg pair is READ OFF; it never decides
          // the contrast math, which `resolveBackground` owns.
          //
          // A test for "ends in zero" is NOT the same as "has a zero alpha":
          // `rgb(255, 87, 0)` and `rgb(0, 0, 0)` are fully opaque and end in
          // one. Reading them as transparent makes `findRenderedPair` find no
          // painted surface and drop the element from the audit entirely — a
          // silent false negative in a WCAG gate, which is worse than the
          // false positive this file exists to fix. So the alpha has to be
          // matched where it actually lives: the FOURTH component of `rgba()`,
          // or the one after the slash in `color()`. `rgb()` carries none.
          // Baseline: `node -e "console.log(/^rgba?\(.*,\s*0\s*\)$/.test('rgb(255, 87, 0)'))"`
          // -> true, the form this replaces.
          const isTransparent = s =>
            s === 'transparent' ||
            /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*0(\.0+)?\s*\)$/.test(s) ||
            /\/\s*0(\.0+)?\s*\)$/.test(s);

          // The background the UA paints when nothing in the chain paints one.
          // `Canvas` is the CSS system color for exactly that surface and it
          // tracks the document's `color-scheme`. THIS REPO DECLARES NONE, so
          // it reads white in both passes and the dark story is saved instead
          // by `.storybook/storybook-overrides.css`'s `html[data-theme='dark']
          // body` rule, which paints an opaque surface the walk stops at long
          // before the fallback. Do not read the dark fallback as live cover.
          // Baseline: `grep -rn "color-scheme" src/ .storybook/` -> 0 hits on
          // 2026-09-16; `setTheme` sets `data-theme` (lib/browser-context.mjs).
          // Read from a probe kept out of layout so measuring cannot move it.
          const canvasProbe = document.createElement('div');
          canvasProbe.style.cssText = 'display: none; background-color: Canvas;';
          document.documentElement.appendChild(canvasProbe);
          const canvas = window.getComputedStyle(canvasProbe).backgroundColor;
          canvasProbe.remove();

          // Every background layer painted behind `el`, nearest first, all the
          // way to the root. An element with no background of its own paints on
          // what is behind it, so the element's own `backgroundColor` is only
          // the first layer, never the answer (issue #49).
          //
          // This walk deliberately makes NO judgment about which layer is
          // opaque. A string test here could not read `color(srgb …)` — what
          // Chromium serializes every `color-mix(in srgb, …)` to — and would
          // walk past a surface that fully covers the ones behind it.
          // `resolveBackground` decides where the stack ends, because
          // `parseColor` is the one place that knows what a color spelling is
          // worth; a layer it cannot read becomes an unresolved backdrop there
          // rather than vanishing here.
          //
          // The walk follows the FLATTENED tree, which is what the browser
          // paints, not the DOM tree. Two hops the DOM tree does not give:
          //   - `assignedSlot` — slotted light-DOM content paints where its
          //     slot sits, so a consumer's element slotted into a shadow tree
          //     paints on that tree's surfaces. `mud-modal` paints its
          //     background on a shadow `.surface` with the slots inside it and
          //     nothing on `:host`, so a `parentElement` walk leaves that
          //     surface out and scores the slotted element against the page
          //     canvas — the same false failure as #49, one level in.
          //     Baseline: `grep -n 'container-background' src/components/mud-modal/mud-modal.css`
          //     -> line 55, inside `.surface`, carries `--modal-container-background`.
          //   - `getRootNode().host` — an element at the top of a shadow root
          //     has no `parentElement`, but it still paints on the host's
          //     ancestors.
          //
          // DEBT(backdrop is modelled as ancestor background colors): a
          // `background-image` cannot be folded to one color, so the walk
          // records a marker and the row comes back unresolved rather than
          // scored. Ancestor or own `opacity`, out-of-flow content, overlapping
          // siblings and pseudo-element fills are not seen at all and still
          // yield a ratio; all are documented for the consumer in
          // `.claude/agents/a11y-verifier.md`. Upgrade path: measure the pixels
          // actually painted behind the glyphs — hit-test the text box with
          // `document.elementsFromPoint`, or screenshot the element with its
          // `color` made transparent — which covers every case above with one
          // mechanism instead of a branch each.
          const collectBackgroundStack = el => {
            const layers = [];
            let node = el;
            while (node && node.nodeType === 1) {
              const style = window.getComputedStyle(node);
              // A gradient or image paints the surface while `backgroundColor`
              // still computes to a transparent value, so reading the color
              // alone walks straight through an opaque layer and scores the
              // element against something behind it — a confident wrong number,
              // and in a WCAG gate a false PASS. What paints there cannot be
              // folded (it needs geometry and stop interpolation), so the
              // honest answer is that this backdrop is unresolved: push a
              // marker `parseColor` refuses and let the fold report it.
              layers.push(
                /^none(\s*,\s*none)*$/.test(style.backgroundImage) ? style.backgroundColor : 'background-image',
              );

              const parent = node.assignedSlot ?? node.parentElement;
              if (parent) {
                node = parent;
                continue;
              }
              const root = node.getRootNode();
              node = root && root.host ? root.host : null;
            }
            return layers;
          };

          // When the host has a transparent background (typical: `:host { display: inline-flex }`
          // with no own bg), the real visual contrast lives on a shadow-root
          // child like `.badge` that paints the colored fill. Walk shadow for
          // the first such element with non-transparent bg + visible text, and
          // return BOTH its fg and bg so the contrast pair comes from one
          // element (a valid WCAG measurement, not a host/inner mash-up).
          //
          // DEBT(element selection has no visibility or slot model): which
          // element a pair is READ OFF is the first shadow child that paints a
          // background, else nothing — so a textless fill (a checkbox box, a
          // switch track, a separator rule) and a visually hidden `<input>` can
          // each yield a row pairing an inherited `color` with a fill. A
          // text-presence filter here was tried and removed: `innerText` does
          // not see text that arrives through a `<slot>`, so it skipped the real
          // painted surface of a slotted-label button and reported a host pair
          // of two off-screen colors as a PASS where the label could genuinely
          // fail, and it counted `display: none` and `opacity: 0` text as
          // painted. Upgrade path: choose the surface from where glyphs are
          // actually rendered — the same paint-based measurement named at
          // `collectBackgroundStack` — rather than from a text heuristic.
          const readPair = (el, source) => {
            const s = window.getComputedStyle(el);
            return { el, fg: s.color, bg: s.backgroundColor, fontSize: s.fontSize, fontWeight: s.fontWeight, source };
          };

          const findRenderedPair = el => {
            if (!isTransparent(window.getComputedStyle(el).backgroundColor)) {
              return readPair(el, 'host');
            }
            const root = el.shadowRoot ?? null;
            if (root) {
              for (const inner of root.querySelectorAll('*')) {
                if (!isTransparent(window.getComputedStyle(inner).backgroundColor)) {
                  // `getAttribute('class')`, not `className`: on an SVG element
                  // `className` is an SVGAnimatedString with no `.split`, and the
                  // throw rejects `page.evaluate` and loses the whole run.
                  const classAttr = inner.getAttribute('class');
                  const cls = classAttr ? '.' + classAttr.trim().split(/\s+/).join('.') : '';
                  return readPair(inner, `shadow:${inner.tagName.toLowerCase()}${cls}`);
                }
              }
            }
            // No rendered surface found (Pattern A: host transparent, shadow
            // empty of colored elements). The slotted child in light DOM
            // (collected as origin='light') carries the real measurement;
            // skip the host to avoid a pair that reflects no user-visible
            // contrast.
            return null;
          };

          return collected.flatMap(({ el, origin }, index) => {
            const isDisabled = el.matches(':disabled, [aria-disabled="true"], [disabled]');
            const tag = el.tagName.toLowerCase();
            const isHost = tag === ctx.componentName;
            const isInteractive = ctx.tags.includes(tag) || ctx.roles.includes(el.getAttribute('role') || '') || isHost;

            let fg, bg, bgStack, borderColor, fontSize, fontWeight, source;
            if (isHost) {
              const pair = findRenderedPair(el);
              if (!pair) return []; // Pattern A wrapper — slotted child carries the measurement.
              fg = pair.fg;
              bg = pair.bg;
              // From the element the pair was read off, not from the host: a
              // shadow child's backdrop starts at that child.
              bgStack = collectBackgroundStack(pair.el);
              fontSize = parseFloat(pair.fontSize) || 16;
              fontWeight = Number(pair.fontWeight) || 400;
              borderColor = window.getComputedStyle(el).borderTopColor;
              source = pair.source;
            } else {
              const styles = window.getComputedStyle(el);
              fg = styles.color;
              bg = styles.backgroundColor;
              bgStack = collectBackgroundStack(el);
              borderColor = styles.borderTopColor;
              fontSize = parseFloat(styles.fontSize) || 16;
              fontWeight = Number(styles.fontWeight) || 400;
              source = origin;
            }

            const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700); // 18pt / 14pt bold
            // Kind heuristic: if the rendered surface carries visible text
            // (host with text label, or any tag that normally contains text),
            // classify as "normal"/"large" so the 4.5:1 threshold applies.
            // Otherwise "ui" (3:1) for pure visual components.
            const tagCarriesText = !['hr', 'img', 'svg'].includes(tag);
            const kind = isLargeText ? 'large' : tagCarriesText ? 'normal' : 'ui';

            return {
              index,
              tag,
              origin,
              source,
              role: el.getAttribute('role') || null,
              fg,
              bg,
              bgStack,
              canvas,
              borderColor,
              disabled: isDisabled,
              interactive: isInteractive,
              kind,
            };
          });
        },
        { componentName, tags: INTERACTIVE_TAGS, roles: INTERACTIVE_ROLES },
      );
      return samples.map(s => ({ ...s, theme }));
    },
  });
}

function pickDefaultStoryId(target) {
  if (target.exists?.stories) {
    const { stories } = analyzeStoriesFile(target.paths.stories, target.name);
    const def = stories.find(s => /default/i.test(s.name)) ?? stories[0];
    return def?.storyId ?? null;
  }
  return inferStoryId(`Atoms/${pascal(target.bare)}`, 'Default');
}

function pascal(s) {
  return s
    .split('-')
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

async function resolveTargets(args) {
  if (args.all) return listAllComponents().map(c => resolveComponentPaths(c.name));
  if (args.changed) return listChangedComponents().map(n => resolveComponentPaths(n));
  return [resolveComponentPaths(args.component)];
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch(err => {
    if (err.message === PLAYWRIGHT_INSTALL_HINT) {
      process.stderr.write(`${TOOL}: ${err.message}\n`);
    } else {
      process.stderr.write(`${TOOL}: internal error — ${err.stack ?? err.message ?? err}\n`);
    }
    process.exit(EXIT_INTERNAL);
  });
}

export { TOOL };
