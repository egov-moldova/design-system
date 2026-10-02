# Asset delivery — design

**Status:** draft for review
**Reviewed:** none
**Branch:** `danzubco/asset-delivery-on-191` (worktree `asset-delivery-on-191`), based on PR #191 head `2d13b3d2`
**Plans that follow from it:** cycle 1 below gets its own implementation plan; cycle 2 gets its own design note once cycle 1 lands.

## Goal

Every consumer of `@egov-moldova/mud` — React, Vue, Angular, the vanilla web-components adapter, a
plain `<script type="module">` page and a CDN import — renders every icon, logo and flag with **no
configuration**: no `assetPath`, no `resourcesUrl`, no copied folder. An application downloads only
the assets it shows, and its bundle contains only the components it imports.

## Problem, measured

| Defect | Evidence |
| --- | --- |
| Icons and logos load by `fetch(getAssetPath(...))`, so a bundler never sees them and the consumer must copy `dist/components/assets` and call `setupMud` / `app.use(Mud, …)` / `provideMud(…)`. | `src/components/mud-icon/mud-icon.providers.ts`, `src/components/mud-logo/mud-logo.providers.ts` |
| The web-components README path (`defineCustomElements()` from the loader) 404s every icon, including the chevrons and close glyphs other components render: the lazy loader resolves assets against `document.baseURI`. | Chromium probe 2026-10-02: `404 /assets/outlined/calendar.svg`, also on a deep subpath; `dist/esm/index-*.js` sets `$resourcesUrl$ = new URL(options.resourcesUrl \|\| "./", document.baseURI)` |
| PR #191 moves the phone-input flags from inline JS (zero-config) to `<img src={getAssetPath(...)}>` — the same broken path, for 271 files / 1.9 MB. | `src/components/mud-phone-input/mud-phone-input.flags.ts` |
| No `sideEffects` in `package.json`: a React app importing 3 components ships every component. | Probe: 216 KB gzip JS; with `"sideEffects": ["*.css"]` on core + adapter 91 KB gzip, runtime identical |
| The asset set ships three times (`dist/mud/assets`, `dist/components/assets` via `scripts/copy-component-assets.mjs`, `dist/collection/assets`). | `ls dist` |

## Spike result (throwaway, scratchpad)

A minimal Stencil 4.45.0 library carrying the real catalog (196 icons, 55 logos, 271 flags as one ES
module each, plus a `name → () => import()` map per class) was packed and consumed:

- **All three Stencil outputs emit one chunk per asset** — `dist-custom-elements`, `dist/esm` (loader)
  and `dist/<namespace>` (script). No chunk carries more than one asset.
- **Eight consumer paths render with zero configuration and download only the shown assets:** Vite 8
  build, webpack 5 build, esbuild with splitting, Vite dev server, the lazy loader (incl. a deep
  subpath, no `resourcesUrl`), the `<namespace>.esm.js` script, and an import map (CDN shape).
- **An internal icon seeded synchronously before first render paints on the first frame** on all
  eight paths.
- An unused component and its internal icon stay out of the consumer's main bundle; logo and flag
  chunks are not emitted when their component is not imported.
- Map cost at real scale: icons 3.4 KB gzip, flags 3.3 KB, logos 1.1 KB — each only with its component.
- Cost found: the packed library grows (3.7 MB packed, 18.6 MB unpacked, 3206 files) because Stencil
  writes every module into six output directories, plus one `.d.ts` per module.

### Options

| Option | Complexity added now | Cost to build | Cost to maintain | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- | --- |
| A. Status quo: `fetch` + `assetPath`, fix the docs | low — docs only | low | high — one setup per adapter, one copy step per app | low | silent blank icons whenever a step is missed; the README path already fails | none for consumers beyond correct docs |
| B. Inline every asset in JS | low — one generated module per class | low | low | med — consumers come to rely on sync rendering | 137 KB gzip of logos and 1.9 MB of flags in every app that uses those components | zero-config, but pays for every asset |
| C. Registry + explicit import (`registerIcons({ calendar })`) | high — a new public API in core and every adapter | high | med | high — a public API | a forgotten registration renders nothing and the type system cannot see it | smallest possible build output |
| D. Static internal icons + `import()` per asset, owned by the rendering component | med — a generator and one shared loader | med | low — assets stay files next to their owner | med — a published file layout changes | Stencil emitting chunks is proven by the spike; untested on Angular CLI itself, Next/SSR, Storybook | zero-config on every path, only shown assets downloaded |

**Recommendation: D** — the only option that is zero-config on every consumer path without making
every application pay for every asset; C stays available as a later, additive opt-in if a real need
for a minimal `dist/` or custom application icons appears.

## Decision

D, approved by Dan on 2026-10-02 together with:

1. **One owner per asset class.** `mud-icon` renders icons, `mud-logo` renders logos,
   `mud-phone-input` renders flags (internal; a public `mud-flag` only when a second consumer of
   flags appears).
2. **A generator** emits one ES module per asset — markup sanitized and `id`s prefixed at build time —
   plus a typed `name → () => import()` map per class. It extends `yarn svg:icons`
   (`scripts/icons/build-registry.mjs`) and #191's `yarn svg:flags` (`scripts/flags/sync-flags.mjs`).
3. **Hybrid loading.** A component that renders an icon by a FIXED name imports that icon module
   statically and seeds a synchronous cache in `componentWillLoad`, so it paints on the first frame.
   Every other icon, every logo and every flag loads through `import()`.
4. **Inline SVG in the shadow root.** No `fetch`, no `<img>`, no `data:` URL. Runtime sanitization
   stays as defence in depth (`src/utils/svg-sanitizer.ts`).
5. **The inline SVGs in other components move into `mud-icon`**, except two accepted exceptions:
   the animated plus/minus of `mud-accordion-item` and the colored glyph of `mud-file-item`.
6. **Compatibility.** `setAssetPath`, `setupMud`, the Vue `Mud` plugin's `assetPath`, Angular
   `provideMud({ assetPath })` and the loader's `resourcesUrl` keep being accepted and become
   no-ops for icons, logos and flags — a minor release.
7. **`sideEffects`** is declared, listing every entry that is imported for its effect.
8. **Package duplication** of the generated modules is reduced where Stencil allows it.

## Design

### Units

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `scripts/assets/build-asset-modules.mjs` (new; called by `svg:icons` and `svg:flags`, and by the logo set) | Reads `assets/` of each owner, writes `generated/<name>.ts` (`export default '<svg…>'`) and `generated/index.ts` (the map), sanitized and id-prefixed. `--check` fails on drift, like `build-registry.mjs --check` today. | svgo (already a dev dependency) |
| `src/utils/svg-assets.ts` (new) | The one loader: `seedSvg(kind, key, markup)` (sync), `cachedSvg(kind, key)`, `loadSvg(kind, key, map)` (async, deduped, stale-result-safe). Returns a sanitized `Element`. | `svg-sanitizer.ts` |
| `mud-icon` | Resolves `name` + `variant` (+ size drawing, cycle 2) through the loader; keeps its public props, warnings, a11y and `variant` fallback. | loader, icon map |
| `mud-logo` | Same, for logos; keeps `mudLogoError` (`reason: 'fetch-failed'` now means the import failed). | loader, logo map |
| `mud-phone-input` | Renders a flag as inline SVG through the loader; keeps #191's `IntersectionObserver` gating, so a row's flag module is imported only near the visible list. | loader, flag map |
| Components with fixed internal icons (33 use `<mud-icon>`; 26 distinct static names today) | `import` the icon module, `seedSvg` in `componentWillLoad`. | loader, the icon's module |

Generated modules are committed? **No** — they are build output under `src/**/generated/`,
git-ignored and produced by the build before Stencil runs, exactly as `src/components.d.ts` is
today. The `--check` mode runs in the spec lane so a stale generator fails CI. Because Stencil,
the spec lane, `typecheck`, `lint` and Storybook all read `src/`, the generator becomes a Wireit
dependency of each of them (and of the `yarn dev` watch, which regenerates on a change under any
owner's `assets/`).

### What a consumer writes

```tsx
import '@egov-moldova/mud-react/styles.css';
import { MudIcon, MudSelect } from '@egov-moldova/mud-react';

<MudSelect label="Raion" />   // chevron painted on the first frame, no request
<MudIcon name="calendar" />   // one small chunk, requested only when shown
```

Same for Vue (`app.use(Mud)`), Angular (`provideMud()`), web-components (`defineCustomElements()`)
and a CDN `<script type="module">` — no options.

### Published layout

- The generated modules ship inside every Stencil output, as chunks.
- Raw SVG files: `dist/components/assets` (the copy script) is removed — nothing resolves against it
  any more. `dist/mud/assets` (from `assetsDirs`) stays for **one minor release**, documented as
  deprecated, because an application may reference an SVG by URL directly; it is removed in the next
  major. `validate.package`'s `checkBundleAssets` changes accordingly.
- Duplication: drop the per-module `.d.ts` files the generated modules produce (one declaration for
  each map is enough); whether `dist/cjs` and `dist/collection` have consumers is checked, not assumed.

### Error handling

- Unknown name → current warning, decorative empty host (unchanged).
- Import rejects (network) → warning + empty host; the cache evicts the failure so a retry can
  succeed (today's `fetch` behaviour, kept).
- A stale result (prop changed while importing) is discarded (today's guard, kept).

### Testing

- Spec lane: the `fetch` mock in `mud-icon.spec.tsx` and the logo spec is removed — `import()` of the
  real modules runs in Vitest — and the specs assert the real drawing (`data-*` marker or path).
- Generator: `--check` drift spec; sanitization spec (a `<script>`, an `on*` attribute and an external
  `href` are stripped); id-prefix spec (two flags with the same internal id render side by side
  without collision).
- **Zero-config consumer probe** (new script, run in CI): packs the core, installs it into a temp
  directory with no lockfile, then in Chromium drives (1) a Vite production build, (2) the lazy
  loader from a plain HTML page on a deep subpath with no `resourcesUrl`, (3) an import map. Each
  asserts: internal icon present on first render, `<mud-icon name>` rendered, a logo and a flag
  rendered, only the shown asset chunks requested, no console error.
- `sideEffects`: the same probe asserts an unused component's tag is absent from the Vite main chunk
  and the probe page still registers its elements through `mud.esm.js` (a side-effect-only import).
- Pixel-perfect check for every component whose rendering path changes (repo rule): `mud-icon`,
  `mud-logo`, `mud-phone-input` flags, and each component that switches to a seeded icon.

## Scope by cycle

**Cycle 1 — this branch, its own implementation plan.** Generator, loader, `mud-icon`, `mud-logo`,
flags, seeding of the existing fixed-name internal icons, `sideEffects` on the core package,
removal of the copy script and `dist/components/assets`, deprecation of `dist/mud/assets`, the
zero-config probe, docs (README asset sections, `INTEGRATION.md`, changelog fragment).

**Cycle 2 — absorb the inline glyphs (decision 5).** Needs a design note of its own because the
seven glyphs are **not** one drawing: the close glyph is drawn 3→13 in `mud-info-box`, 3.333→12.667
in `mud-toast` / `mud-banner` and 3.5→12.5 in `mud-tooltip`; `mud-link` needs an em-relative size and
`mud-checkbox` a sync paint. It adds per-size drawings to the icon model and an `inherit` size to
`IconSize` (public contract), and each geometry must be confirmed against its Figma node before two
are merged — a visual change otherwise.

**Adapter follow-ups — on their own branches, not here.** The adapters live in `react/` and
`web-components/` on this base, and PR #189 moves them to `packages/`; editing them here would
conflict with #189 and #190.

| Branch | Change |
| --- | --- |
| #190 (React) | `setupMud` becomes optional (no throw without `assetPath`); README drops the copy step; fix the `postinstall: node ../../scripts/git/install-hooks.mjs` that breaks every external install; `sideEffects` on the adapter. |
| #189 (Vue, Angular) | `app.use(Mud)` and `provideMud()` accept no options; README drops the copy step; `sideEffects` on both adapters; the consumer fixtures stop copying assets and assert an icon renders. |
| web-components (after #189's move) | README drops `resourcesUrl` / copy guidance; the demo imports its own adapter and drops `serveDesignSystemAssets` / `copyDesignSystemAssetsToBuild`. |

These are small once cycle 1 lands, since the adapters only stop requiring what the core no longer
needs. Order: cycle 1 merges after #191; the adapter follow-ups go in whichever of #189/#190 is still
open then, or as one follow-up PR after they merge.

## Not verified

- Angular CLI's own build (the spike used esbuild, which it wraps), Next.js / SSR, Storybook, and
  consumer test runners (Vitest/Jest in an application) — the cycle-1 probe covers Vite and the
  loader only.
- The real React wrappers (`@stencil/react-output-target`) over the new mechanism; they import the
  same per-component modules the Vite probe imported.
- PWA precaching: a service worker that precaches every emitted file downloads every asset chunk;
  documented as a consumer note, not tested.
