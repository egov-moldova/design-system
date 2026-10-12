# Asset delivery — design

**Status:** approved by Dan on 2026-10-02 (with the `## Revisions after review` below)
**Reviewed:** critic dad8cc14 — read as the implementation plan's spec in its critique rounds
**Branch:** `danzubco/asset-delivery-on-191` (worktree `asset-delivery-on-191`), based on PR #191 head `2d13b3d2`,
with the PR #190 branch (`danzubco/react-adapter-registers-every-tag-through-two-st`, which contains PR #189)
merged in, so the change covers the core AND the four adapters in one place. The PR is stacked on #189 → #190
and #191; none of them is closed.
**Plan that follows from it:** one implementation plan, `2026-10-02-asset-delivery.md`.

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
5. **An inline SVG moves into `mud-icon` only when its drawing is identical to one in the icon set**;
   any other stays inline in its component, because merging a different drawing breaks the
   component's Figma conformance. Measured 2026-10-02 (path data compared against every file in
   `mud-icon/assets/`): only the `mud-checkbox` tick (`checkmark-small`) and dash (`minus-small`) are
   identical, so only they move — and only if the checkbox still passes its pixel-perfect check.
   The close glyphs of `mud-info-box` (3→13), `mud-toast` / `mud-banner` (3.333→12.667) and
   `mud-tooltip` (3.5→12.5), the `mud-link` external arrow, the animated `mud-accordion-item`
   plus/minus and the colored `mud-file-item` glyph stay inline.
6. **No asset configuration anywhere.** The adapters were never published (`private`, `0.0.1`), and
   `setupMud` / `defineCustomElements` (React), the `Mud` plugin (Vue) and `provideMud` (Angular) do
   nothing but set the asset path, so they are **removed**, not deprecated. The published
   web-components adapter keeps `defineCustomElements(opts?)` unchanged; `resourcesUrl` is simply no
   longer needed. The core keeps exporting Stencil's `setAssetPath` (runtime API), which no MUD
   component reads any more.
7. **`sideEffects`** is declared, listing every entry that is imported for its effect.
8. **Package duplication** of the generated modules is reduced where Stencil allows it.

## Design

### Units

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `scripts/assets/build-asset-modules.mjs` (new; called by `svg:icons` and `svg:flags`, and by the logo set) | Reads `assets/` of each owner, writes `generated/<name>.ts` (`export default '<svg…>'`) and `generated/index.ts` (the map), sanitized and id-prefixed. `--check` fails on drift, like `build-registry.mjs --check` today. | svgo (already a dev dependency) |
| `src/utils/svg-assets.ts` (new) | The one loader: `seedSvg(kind, key, markup)` (sync), `cachedSvg(kind, key)`, `loadSvg(kind, key, map)` (async, deduped, stale-result-safe). Returns a sanitized `Element`. | `svg-sanitizer.ts` |
| `mud-icon` | Resolves `name` + `variant` through the loader; keeps its public props, warnings, a11y and `variant` fallback. | loader, icon map |
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

Vue and Angular import their components the same way, with no plugin or provider; web-components
calls `defineCustomElements()`; a CDN `<script type="module">` needs nothing more.

### Published layout

- The generated modules ship inside every Stencil output, as chunks.
- Raw SVG files are **no longer published**: `assetsDirs` goes from `mud-icon`, `mud-logo` and
  `mud-phone-input`, and `scripts/copy-component-assets.mjs` goes with `dist/components/assets`.
  `dist/mud/assets/fonts/` stays — `styles.css` loads the Onest font from it. An application that
  referenced an SVG by URL breaks; the changelog says so and shows the replacement (`<mud-icon>`,
  `<mud-logo>`). The version number is decided at release, as always. `validate.package`'s
  `checkBundleAssets` is replaced by a check that every icon, logo and flag in the manifests has
  its module in each Stencil output.
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
- **Consumer fixtures, zero-config** — the existing runner `scripts/adapters/consumer-fixture.mjs`
  (from #189: packs core + adapter, installs with no lockfile, builds with the framework's own
  toolchain, drives Chromium) is extended, not duplicated: React and web-components fixtures are
  added beside Vue and Angular; the Vue and Angular fixtures drop their asset copy steps and their
  `assetPath` setup; the runner's "packed core carries `dist/components/assets`" assertion is
  inverted. Every fixture asserts: an internal icon present on first render, `<mud-icon name>`, a
  logo and a flag rendered, only the shown asset chunks requested, an unused component's tag absent
  from the main chunk (`sideEffects`), no console error. The web-components fixture also runs the
  loader from a plain HTML page on a deep subpath with no `resourcesUrl`, and an import map.
- `sideEffects` is declared on the core and on all four adapters; the web-components fixture keeps
  a side-effect-only `import '@egov-moldova/mud/mud.esm.js'` page so a wrong list fails it.
- Pixel-perfect check for every component whose rendering path changes (repo rule): `mud-icon`,
  `mud-logo`, `mud-phone-input` flags, and each component that switches to a seeded icon.

## Scope

One plan, on this branch, after merging the #190 branch in. Nothing is left for a later cycle.

**Core.** Generator, loader, `mud-icon`, `mud-logo`, flags (#191's `IntersectionObserver` gating
kept), seeding of every fixed-name internal icon, the checkbox tick/dash (pixel-perfect gated),
`sideEffects`, removal of `assetsDirs`, of the copy script and of every published SVG, the
`validate.package` check, package duplication reduced.

**Adapters** (all under `packages/` after the merge).

| Adapter | Change |
| --- | --- |
| React | remove `setupMud`, `defineCustomElements` and `toAssetBaseUrl`; remove the `postinstall` that runs `../../scripts/git/install-hooks.mjs` (it breaks every install outside the monorepo — present on `main` already) and keep the hook installation at the repo root; `sideEffects`; new consumer fixture. |
| Vue | remove the `Mud` plugin (asset path only); `sideEffects`; fixture drops `vite-plugin-static-copy` and `app.use(Mud, …)`. |
| Angular | remove `provideMud` (asset path only); `sideEffects`; fixture drops the `assets` glob in `angular.json` and `provideMud(…)`. |
| web-components | `defineCustomElements()` unchanged; `sideEffects`; new consumer fixture (bundler, plain HTML on a deep subpath, import map, side-effect-only import); the demo imports its own adapter and drops `serveDesignSystemAssets` / `copyDesignSystemAssetsToBuild`. |

**Docs — rewritten to describe how things are used now, with examples.** Root `README.md`
(consumer usage per framework, with a working snippet each: install, one CSS import, a component
with an icon, a logo, a phone input), `packages/*/README.md`, `INTEGRATION.md`, `CONTRIBUTING.md`
(how to add an icon / logo / flag, what the generator does, the fixtures), the `mud-design` skill,
the `stencil-compliance` references that teach `getAssetPath`, the PWA precache note, and a
changelog fragment naming the breaking removals (published SVGs, `setupMud`, `Mud`, `provideMud`).
A doc sweep closes on a grep: no consumer-facing text tells anyone to copy assets or pass an asset
path.

## Acceptance bar

The implementation plan turns each row into a command; at design level the bar is:

| Row | Threshold |
| --- | --- |
| Zero-config rendering | every consumer fixture (React, Vue, Angular 20 and 22, web-components) renders an internal icon on first render, a named icon, a logo and a flag with no asset setup in the fixture |
| Only shown assets downloaded | each fixture's network log holds exactly the asset chunks of what the page shows |
| Only imported components bundled | an unused component's tag is absent from each bundled fixture's main chunk |
| No published SVG, no copy step | the packed core contains no `*.svg`; `copy-component-assets.mjs` and every `assetsDirs` are gone |
| Figma conformance unchanged | pixel-perfect checks pass for `mud-icon`, `mud-logo`, `mud-phone-input`, `mud-checkbox` and every component that switches to a seeded icon |
| Project gates | `yarn lint`, `yarn typecheck`, `yarn test`, `yarn build`, `yarn validate.package` pass |
| Docs | the doc sweep grep finds no instruction to copy assets or pass an asset path |

## Revisions after review

Decided by Dan on 2026-10-02, after the implementation plan's critique round; they supersede the
sections above where they disagree.

1. **No seeding** (supersedes decision 3 and the seeding unit in § Units). Stencil awaits
   `componentWillLoad`, so an icon loaded through `import()` is never painted half-loaded; seeding
   only saved one small request on a component's first appearance, at the cost of edits in ~31
   components and the download of conditional glyphs never shown. Every icon loads through
   `import()`; seeding stays available as a later, additive change.
2. **The generated modules are committed** (supersedes "Generated modules are committed? No" in
   § Units), guarded by the generator's `--check`, like `icon-names.ts` today: a fresh clone, the
   editor and every script resolve them with no build step.
3. **The `mud-checkbox` tick and dash stay inline** (narrows decision 5): they paint synchronously
   today, and through an unseeded `mud-icon` the tick would wait for a chunk on the first check.
4. **The flag-icons licence ships as a file** (`dist/mud/licenses/flag-icons.txt`) and as a preserved
   comment in the flag map, since no SVG file carries it any more.
5. **The hook installer moves to a private `tooling/hooks` workspace**, not the repo root: the root
   manifest is the published core.
6. **The guards live in tools that already run in CI**, not in a new script: the source guard is an
   ESLint rule (`yarn lint`), the docs guard a rule of `scripts/docs/check-ai-docs.mjs`
   (`yarn docs:check`, consumer docs only, so contributor docs can still name the forbidden API), and
   the packed-SVG guard part of the consumer-fixture runner, which checks the core and every adapter
   tarball on each run. The four fixtures share one e2e file, and the runner fails on a missing or
   skipped required test.

## Not verified

- Next.js / SSR, Storybook as a consumer, webpack in a real application, and consumer test runners
  (Vitest/Jest in an application): the fixtures cover Vite (React, Vue, web-components), Angular
  CLI 20 and 22, plain HTML and an import map; the spike alone covered webpack.
- PWA precaching: a service worker that precaches every emitted file downloads every asset chunk;
  documented as a consumer note, not tested.
