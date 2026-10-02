# Asset delivery — implementation plan

**Execution**: workflow — `2026-10-02-asset-delivery.workflow.mjs` (generated from this plan by tools/plan-to-workflow.mjs; regenerate, never edit)

**Status:** ready for review
**Reviewed:** none
**Spec:** `.claude/plans/2026-10-02-asset-delivery-design.md` (approved by Dan on 2026-10-02)
**Branch:** `danzubco/asset-delivery-on-191` — PR #191 head `2d13b3d2` + the PR #190 branch (which
contains PR #189) merged at `448dc20d`. The PR this branch opens is stacked on #189 → #190 and #191.

**Goal:** every consumer of `@egov-moldova/mud` — React, Vue, Angular, the web-components adapter, a
plain module page and a CDN import — renders every icon, logo and flag with no asset configuration,
downloads only the assets it shows, and bundles only the components it imports.

**Architecture:** a build-time generator turns every SVG owned by `mud-icon`, `mud-logo` and
`mud-phone-input` into one sanitized, id-prefixed ES module plus a `key → () => import()` map per
class. One shared loader (`src/utils/svg-assets.ts`) resolves a key synchronously from a seed cache or
asynchronously through the map, and returns a sanitized `Element` the owner appends to its shadow root.
Components that render an icon by a fixed name import its module statically and seed the cache.
Published SVG files, the copy step and every asset-path API disappear.

**Tech stack:** Stencil 4.45 (`dist`, `dist-custom-elements`, React/Vue/Angular output targets), SVGO 4
(`prefixIds`, `removeScripts`, `removeAttrs`), Vitest + `@stencil/vitest` (spec lane), `node:test`
(`yarn test:scripts`), Playwright 1.63 + pixelmatch 7 (fixtures, visual regression), Wireit.

## Execution matrix

Dispatch verdict: dispatch — every phase is a written brief (Files, steps, commands) whose result is a
diff plus a passing check, so each passes the brief-test by construction; the phases chain on
contracts (generator → loader → owners → seeding → package → adapters → fixtures → docs), so the waves
are sequential.

| Phase | Model | Effort | Wave | Notes |
| --- | --- | --- | --- | --- |
| 0 Baseline | Sonnet 5.5 | high | A | must run before any `src/` change: the baseline is the untouched tree |
| 1 Generator and loader | Opus 5.5 | medium | B | sanitization + id prefixing is security-adjacent; Task 2 consumes Task 1's map type — sequential inside the phase |
| 2 Owners | Sonnet 5.5 | high | C | consumes Phase 1 (`ICON_MODULES`, `LOGO_MODULES`, `FLAG_MODULES`, `svg-assets`); Tasks 3, 4, 5 own disjoint folders |
| 3 Seeding | Sonnet 5.5 | high | D | consumes Phase 2; Task 6 edits `mud-phone-input.tsx`, which Task 5 owned — hard dependency |
| 4 Package and build | Sonnet 5.5 | high | E | consumes Phases 1-2 (no `assetsDirs` left); shares `package.json` with Phase 1 and Phase 5; its builds must not overlap Phase 3's visual gate |
| 5 Adapters | Sonnet 5.5 | high | F | shares root `package.json` (`workspaces`) with Phase 4 |
| 6 Consumer fixtures | Sonnet 5.5 | high | G | consumes Phase 5's removed APIs and Phase 4's no-SVG package |
| 7 Documentation | Sonnet 5.5 | medium | H | writes no code; its framework snippets are copied from Phase 6's fixtures |
| 8 Proof | Sonnet 5.5 | high | I | runs the full bar; fixes any regression it finds, which is code |

Routing rationale: no phase needs Fable 5.1 for execution — the architectural judgment is encoded in
the spec and this plan; Opus 5.5 takes Phase 1 only, where a sanitization mistake would ship to every
consumer. Escalation: if a phase fails its acceptance criteria twice, restart that phase one tier up
with fresh context instead of iterating in place. Parallel = separate subagents on disjoint files; run
the full test suite once per wave, not per agent.

## Options

The comparison lives in the spec (`### Options`, four options graded, PASS on `options-screen`).

## Decision

Option D of the spec — static internal icons plus `import()` per asset, owned by the rendering
component — with Dan's answers of 2026-10-02:

- An inline glyph moves into `mud-icon` only when its drawing is identical to one in the icon set:
  only the `mud-checkbox` tick (`checkmark-small`) and dash (`minus-small`), and only if the checkbox
  shows no visual difference. Every other inline glyph stays.
- No SVG is published any more; `dist/mud/assets/fonts/` stays.
- The adapter asset APIs (`setupMud`, React `defineCustomElements`, Vue `Mud`, Angular `provideMud`)
  are removed: the adapters were never published.
- The docs are rewritten to describe current usage, with a working example per framework.

One refinement of the spec's testing section, found while planning: Stencil waits for the promise
`componentWillLoad` returns before the first render, so an icon loaded through `import()` is never
painted half-loaded either. What seeding buys is **no runtime import and no request waterfall** for a
component's own icons. That is asserted in the spec lane (a seeded icon renders without its map entry
being called); the fixtures assert that assets render and that unused assets are never downloaded.

## Global Constraints

- Node 24 (`.nvmrc`): every `yarn` / `node` command runs as `fnm exec --using=24 -- <command>`. The
  shell's default Node is 26.
- Stencil `~4.45.0` with the repo patch (`.yarn/patches/@stencil-core-npm-4.45.0-*.patch`); SVGO
  `^4.1.0`; no new runtime dependency in any published package.
- Never edit `src/components.d.ts`, component `readme.md` files (generated) or
  `packages/*/src/**/stencil-generated/**` by hand; never stage with `git add -A` / `git add .`. A task
  that changes a component's JSDoc (Tasks 3, 4) runs `yarn build` and stages the regenerated
  `readme.md` of that component BY NAME in its own commit.
- Locale-first (`AGENTS.md` rule 13): no new user-facing string literal.
- Token-first: no new hard-coded colour or size in component CSS (`yarn lint.colors`).
- The seven inline glyphs that are NOT identical to the icon set stay exactly as they are:
  close glyphs of `mud-info-box`, `mud-toast`, `mud-banner`, `mud-tooltip`; the `mud-link` external
  arrow; the `mud-accordion-item` plus/minus; the `mud-file-item` glyph.
- Every changed component keeps its public props, events, slots and parts, except the removals the
  spec lists (adapter asset APIs, published SVG files).
- Commits: Conventional Commits (`commitlint`), header ≤ 100 characters, one commit per task, staged
  paths named explicitly.
- `CHANGELOG.md` is not edited; one fragment under `changes/` (`changes/README.md`).

## Review Focus

1. **An unknown or prototype-shaped name** (`name="constructor"`, `name="__proto__"`) reaches a map
   lookup: the icon must stay a decorative empty host, never throw. Pinned in Task 2 and Task 3.
2. **A prop that changes while its module is importing** must not paint the old drawing. Pinned in
   Task 3 (icon) and Task 4 (logo).
3. **The same flag twice in one shadow root** (the trigger and the selected row): both render, and a
   drawing whose internal ids are prefixed per flag does not pick up another flag's gradient. Pinned in
   Task 1 (prefix) and Task 5.
4. **A failed import** (offline, a 404 after a redeploy changed chunk hashes): the host stays empty,
   one warning, and a later render retries instead of caching the failure. Pinned in Task 2.
5. **A side-effect-only import** (`import '@egov-moldova/mud/mud.esm.js'`) after `sideEffects` is
   declared: elements must still register. Pinned in Task 13 (web-components fixture).

---

## Phase 0 — Baseline

**Executor**: Sonnet 5.5 · high · Wave A · implementer (first: the baseline must come from the untouched tree)

### Task 0: Story regression tool and baseline capture

Captures every Storybook story of the components whose rendering path changes, BEFORE any code
change, so Task 15 can prove nothing moved.

**Files:**
- Create: `scripts/assets/story-regression.mjs`
- Create: `scripts/__tests__/story-regression.spec.mjs`
- Modify: `.gitignore` (add `/.asset-regression/`)

**Interfaces:**
- Produces: `node scripts/assets/story-regression.mjs capture <outDir> [--components <tag,...>]` and
  `node scripts/assets/story-regression.mjs compare <baselineDir> <afterDir> [--tolerance <tag>=<ratio>,...]`.
  Exit 0 = no story differs beyond its tolerance; exit 1 = a story differs (each listed with its diff
  ratio and a diff PNG written next to the after capture); exit 2 = a story is missing on one side.

- [ ] **Step 1: Write the failing test** — `scripts/__tests__/story-regression.spec.mjs` (`node:test`)
  unit-tests the two pure helpers the script exports:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compareImages, storiesFor } from '../assets/story-regression.mjs';

describe('storiesFor', () => {
  const index = {
    entries: {
      'components-icon--default': { type: 'story', id: 'components-icon--default', importPath: './src/components/mud-icon/mud-icon.stories.ts' },
      'components-icon--docs': { type: 'docs', id: 'components-icon--docs', importPath: './src/components/mud-icon/mud-icon.stories.ts' },
      'components-button--default': { type: 'story', id: 'components-button--default', importPath: './src/components/mud-button/mud-button.stories.ts' },
    },
  };
  it('keeps stories of the requested component folders and drops docs entries', () => {
    assert.deepEqual(storiesFor(index, ['mud-icon']), ['components-icon--default']);
  });
});

describe('compareImages', () => {
  it('reports zero for identical buffers and the differing ratio otherwise', async () => {
    const { PNG } = await import('pngjs');
    const a = new PNG({ width: 2, height: 1 });
    a.data.fill(255);
    const b = new PNG({ width: 2, height: 1 });
    b.data.fill(255);
    b.data[0] = 0;
    assert.equal(compareImages(a, a).ratio, 0);
    assert.equal(compareImages(a, b).ratio, 0.5);
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `fnm exec --using=24 -- node --test scripts/__tests__/story-regression.spec.mjs`
  → FAIL, module not found.
- [ ] **Step 3: Implement** `scripts/assets/story-regression.mjs`:
  - `storiesFor(index, componentDirs)` — the ids of `type: 'story'` entries whose `importPath` lies in
    `src/components/<dir>/`.
  - `compareImages(a, b)` — `pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 })`, returns
    `{ ratio: differing / (w*h), diff }`; different sizes → `ratio: 1`.
  - `capture`: serves `storybook-static/` with `vite preview --outDir storybook-static --port 6110`
    (Vite is a dev dependency), reads `storybook-static/index.json`, opens each
    `iframe.html?id=<id>&viewMode=story` in Chromium at 1280×800, waits until every `mud-icon`,
    `mud-logo` and `.flag` element in every open shadow root holds an `svg` or 5 s pass, then
    screenshots the `#storybook-root` element to `<outDir>/<id>.png`.
  - `compare`: pairs files by name, applies the default tolerance 0 and any `--tolerance`.
  - Default component list: `mud-icon,mud-logo,mud-phone-input,mud-checkbox` plus every component
    seeded in Task 6 (`mud-time-input,mud-numeric-input,mud-menu,mud-date-picker,mud-textarea,mud-pagination,mud-date-input,mud-text-input,mud-sidebar,mud-breadcrumb,mud-select,mud-chip,mud-search-input,mud-file-item,mud-input-chip,mud-tabs,mud-file-input,mud-modal`).
- [ ] **Step 4: Run it to verify it passes** — same command → PASS.
- [ ] **Step 5: Capture the baseline from the untouched tree:**
  `fnm exec --using=24 -- yarn sp.build && fnm exec --using=24 -- node scripts/assets/story-regression.mjs capture .asset-regression/baseline`
  — the baseline must come from commit `448dc20d` plus the plan files only (`git diff --stat 448dc20d -- src` empty).
- [ ] **Step 6: Commit** — `git add scripts/assets/story-regression.mjs scripts/__tests__/story-regression.spec.mjs .gitignore`;
  `test(assets): story regression capture and compare, baseline before the asset change`.

---

## Phase 1 — Generator and loader

**Executor**: Opus 5.5 · medium · Wave B · implementer (after Phase 0; Task 2 consumes Task 1's map type)

### Task 1: Asset module generator

**Files:**
- Create: `scripts/assets/build-asset-modules.mjs`
- Create: `scripts/assets/svgo.asset-modules.mjs`
- Create: `scripts/__tests__/build-asset-modules.spec.mjs`
- Modify: `package.json` (new Wireit script `assets.generate`; add it to the `dependencies` of `build`,
  `test`, `types.ensure`, `lint.js`, `dx:prepare`, `test.storybook.watch` and any other Wireit
  script that reads `src/` — find them with `grep -n '"src/' package.json`)
- Modify: `.gitignore` (`/src/generated/`), `eslint.config.mjs` (global `ignores`: `src/generated/**`),
  `.prettierignore` (`src/generated/`), `tsconfig.json` only if `src/generated` is excluded there.

**Interfaces:**
- Produces, under `src/generated/` (git-ignored, regenerated by every build):
  - `icons/<variant>/<name>.ts`, `logos/<name>.ts`, `flags/<code>.ts` — each `export default '<svg …>';`
  - `icons/index.ts` → `export const ICON_MODULES: SvgModuleMap` keyed `'<variant>/<name>'`
  - `logos/index.ts` → `export const LOGO_MODULES: SvgModuleMap` keyed `'<name>'`
  - `flags/index.ts` → `export const FLAG_MODULES: SvgModuleMap` keyed by file base (`md`, `sh-ac`)
  - every index imports `type SvgModuleMap` from `../../utils/svg-assets` (Task 2).
- Every emitted `<svg>` carries `data-mud-asset="<kind>:<key>"` (e.g. `icon:outlined/calendar`).
- Sources: `src/components/mud-icon/assets/{outlined,filled}/*.svg`,
  `src/components/mud-logo/assets/*.svg`, `src/components/mud-phone-input/assets/flags/*.svg`.
- `--check`: writes nothing, exits 1 when any output would differ (stale or extra file).

- [ ] **Step 1: Write the failing tests** in `scripts/__tests__/build-asset-modules.spec.mjs`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toModuleSource, transformSvg } from '../assets/build-asset-modules.mjs';

describe('transformSvg', () => {
  it('strips scripts, event handlers and external references', () => {
    const out = transformSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>x()</script><a href="https://evil.test"><path d="M0 0h1"/></a><use href="#a"/></svg>', { kind: 'icon', key: 'outlined/x' });
    assert.doesNotMatch(out, /<script|onload|https:\/\/evil/);
    assert.match(out, /href="#mud-icon-outlined-x-/); // a local fragment survives, prefixed
  });
  it('prefixes every id and every reference to it with the asset key', () => {
    const out = transformSvg('<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><path fill="url(#g)" d="M0 0h1"/></svg>', { kind: 'flag', key: 'md' });
    assert.match(out, /id="mud-flag-md-g"/);
    assert.match(out, /url\(#mud-flag-md-g\)/);
  });
  it('marks the root with its asset key', () => {
    assert.match(transformSvg('<svg xmlns="http://www.w3.org/2000/svg"/>', { kind: 'logo', key: 'mpass-logo-with-name' }), /data-mud-asset="logo:mpass-logo-with-name"/);
  });
  it('makes a flag cover its box like object-fit: cover', () => {
    assert.match(transformSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"/>', { kind: 'flag', key: 'ro' }), /preserveAspectRatio="xMidYMid slice"/);
  });
});

describe('toModuleSource', () => {
  it('emits one default-exported string literal', () => {
    assert.equal(toModuleSource('<svg a="1"/>'), "export default '<svg a=\"1\"/>';\n");
  });
});
```

- [ ] **Step 2: Run** `fnm exec --using=24 -- node --test scripts/__tests__/build-asset-modules.spec.mjs` → FAIL.
- [ ] **Step 3: Implement.** `svgo.asset-modules.mjs` exports `configFor({ kind, key })`:
  `multipass: false`, plugins `removeScripts`, `{ name: 'removeAttrs', params: { attrs: '(on.*)' } }`,
  a local plugin that deletes any `href` / `xlink:href` / `src` not starting with `#`,
  `{ name: 'prefixIds', params: { prefix: \`mud-${kind}-${key.replace('/', '-')}\`, delim: '-' } }`,
  and a local plugin that sets `data-mud-asset` on the root (and, for `kind === 'flag'`,
  `preserveAspectRatio="xMidYMid slice"`). No geometry plugin: the source files are already optimised
  by `svg:icons` / `svg:flags`, and #191 measured that lower precision visibly changes flags
  (`svgo.config.flags.js`). `build-asset-modules.mjs` walks the three sources, refuses a key outside
  `/^[a-z0-9][a-z0-9-]*$/` (keys become file names and TS keys), writes the modules and the three
  index files with `() => import('./<path>')` entries, deletes outputs with no source, and honours
  `--check`. Export `transformSvg` and `toModuleSource` for the spec; guard the CLI with
  `isEntrypoint` (`scripts/lib/is-entrypoint.mjs`).
- [ ] **Step 4: Wire Wireit.** `"assets.generate": { "command": "node scripts/assets/build-asset-modules.mjs", "files": ["scripts/assets/**", "src/components/mud-icon/assets/**/*.svg", "src/components/mud-logo/assets/*.svg", "src/components/mud-phone-input/assets/flags/*.svg"], "output": ["src/generated/**"] }`
  and add `"assets.generate"` to the dependency lists named above.
- [ ] **Step 5: Run** the spec → PASS; then `fnm exec --using=24 -- yarn assets.generate && fnm exec --using=24 -- node scripts/assets/build-asset-modules.mjs --check`
  → exit 0; `ls src/generated/icons/outlined | wc -l` equals `ls src/components/mud-icon/assets/outlined | grep -c svg`.
- [ ] **Step 6: Commit** — the five files named above; `build(assets): generate one sanitized ES module per icon, logo and flag`.

### Task 2: Shared SVG loader

**Files:**
- Create: `src/utils/svg-assets.ts`
- Create: `src/utils/test/svg-assets.spec.ts`

**Interfaces:**
- Consumes: `sanitizeSvgToElement(markup: string): Element | null` from `src/utils/svg-sanitizer.ts`.
- Produces:

```ts
export type SvgKind = 'icon' | 'logo' | 'flag';
export type SvgModuleMap = Readonly<Partial<Record<string, () => Promise<{ default: string }>>>>;
/** Synchronous seed for an asset a component ships statically; call it in componentWillLoad. */
export function seedSvg(kind: SvgKind, key: string, markup: string): void;
/** A fresh clone of a seeded or already-loaded asset, or undefined. Never imports. */
export function cachedSvg(kind: SvgKind, key: string): Element | undefined;
/** Resolves through the cache, else through `map[key]`; null for an unknown key or a failed import. */
export function loadSvg(kind: SvgKind, key: string, map: SvgModuleMap): Promise<Element | null>;
/** Tests only. */
export function clearSvgCache(): void;
```

- [ ] **Step 1: Write the failing spec** `src/utils/test/svg-assets.spec.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cachedSvg, clearSvgCache, loadSvg, seedSvg } from '../svg-assets';

const svg = (k: string) => `<svg xmlns="http://www.w3.org/2000/svg" data-mud-asset="icon:${k}"></svg>`;

describe('svg-assets', () => {
  afterEach(() => clearSvgCache());

  it('returns a seeded asset synchronously, as a fresh clone each time', () => {
    seedSvg('icon', 'outlined/a', svg('outlined/a'));
    const one = cachedSvg('icon', 'outlined/a');
    expect(one?.getAttribute('data-mud-asset')).toBe('icon:outlined/a');
    expect(cachedSvg('icon', 'outlined/a')).not.toBe(one);
  });

  it('does not call the map for a seeded key', async () => {
    seedSvg('icon', 'outlined/a', svg('outlined/a'));
    const load = vi.fn(async () => ({ default: svg('outlined/a') }));
    await loadSvg('icon', 'outlined/a', { 'outlined/a': load });
    expect(load).not.toHaveBeenCalled();
  });

  it('dedupes concurrent loads of one key', async () => {
    const load = vi.fn(async () => ({ default: svg('outlined/b') }));
    await Promise.all([loadSvg('icon', 'outlined/b', { 'outlined/b': load }), loadSvg('icon', 'outlined/b', { 'outlined/b': load })]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('answers null for an unknown or prototype-shaped key without throwing', async () => {
    expect(await loadSvg('icon', 'constructor', {})).toBeNull();
    expect(await loadSvg('icon', '__proto__', {})).toBeNull();
  });

  it('evicts a failed import so the next call retries', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ default: svg('outlined/c') });
    expect(await loadSvg('icon', 'outlined/c', { 'outlined/c': load })).toBeNull();
    expect((await loadSvg('icon', 'outlined/c', { 'outlined/c': load }))?.getAttribute('data-mud-asset')).toBe('icon:outlined/c');
  });

  it('keeps kinds apart', () => {
    seedSvg('logo', 'x', svg('x'));
    expect(cachedSvg('icon', 'x')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/utils/test/svg-assets.spec.ts` → FAIL.
- [ ] **Step 3: Implement** with two `Map`s keyed `` `${kind}:${key}` `` (parsed `Element`s and in-flight
  promises); look the key up with `Object.hasOwn(map, key)` before calling, so a prototype member is
  never invoked; sanitize once at insertion, clone on every read.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(utils): one SVG loader for seeded and import()-loaded assets`.

---

## Phase 2 — Owners

**Executor**: Sonnet 5.5 · high · Wave C · implementer (after Phase 1; Tasks 3, 4, 5 own disjoint folders)

### Task 3: `mud-icon` loads through the loader

**Files:**
- Modify: `src/components/mud-icon/mud-icon.tsx` (`assetsDirs` removed from `@Component`; `loadSvg()` at
  lines 132-192 rewritten; component JSDoc "fetched on-demand" sentence updated)
- Delete: `src/components/mud-icon/mud-icon.providers.ts` (its `resolveIconAsset` variant fallback
  moves into the component, its `fetchIconSvg` / `clearIconSvgCache` disappear)
- Modify: `src/components/mud-icon/test/mud-icon.spec.tsx` (the `fetch` mock is removed)

**Interfaces:**
- Consumes: `ICON_MODULES` (Task 1), `cachedSvg`, `loadSvg`, `clearSvgCache` (Task 2).
- Produces: unchanged public API of `mud-icon` (`name`, `variant`, `size`, `color`, `interactive`,
  `disabled`, warnings, a11y behaviour). Asset key used by seeding components:
  `'<resolvedVariant>/<name>'`.

- [ ] **Step 1: Rewrite the spec to the real modules.** Delete `makeFetchMock` and every `fetchSpy`
  assertion; keep `clearSvgCache()` in `afterEach`. Replace the fetch-URL assertions with the drawing
  itself, e.g.:

```tsx
it('renders the filled drawing when variant="filled"', async () => {
  const { root, waitForChanges } = await render(<mud-icon name={name} variant="filled" />);
  await waitForChanges();
  expect(root?.shadowRoot?.querySelector('svg')?.getAttribute('data-mud-asset')).toBe(`icon:filled/${name}`);
});

it('renders a seeded icon without importing it', async () => {
  seedSvg('icon', 'outlined/calendar', '<svg xmlns="http://www.w3.org/2000/svg" data-mud-asset="icon:outlined/calendar"></svg>');
  const spy = vi.spyOn(ICON_MODULES as Record<string, () => Promise<{ default: string }>>, 'outlined/calendar');
  const { root } = await render(<mud-icon name="calendar" />);
  expect(root?.shadowRoot?.querySelector('svg')).toBeTruthy();
  expect(spy).not.toHaveBeenCalled();
});

it('discards a drawing whose name changed while it was importing', async () => {
  const { root, waitForChanges } = await render(<mud-icon name="calendar" />);
  root!.setAttribute('name', 'wallet');
  await waitForChanges();
  await waitForChanges();
  expect(root?.shadowRoot?.querySelector('svg')?.getAttribute('data-mud-asset')).toBe('icon:outlined/wallet');
});
```

  Keep the existing `name="constructor"` and filled-only fallback cases, now asserting on
  `data-mud-asset`.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/components/mud-icon` → FAIL.
- [ ] **Step 3: Implement.** In `loadSvg()`: keep the variant and name guards and the fallback warning;
  compute `key = \`${resolvedVariant}/${requestedName}\``; `const hit = cachedSvg('icon', key)` → set
  `svgElement` and return synchronously; otherwise `await loadSvg('icon', key, ICON_MODULES)`, keep the
  stale-result guard, warn `[mud-icon] Failed to load SVG: …` on null. `componentWillLoad` stays
  `async` but returns without awaiting when the cache hit. Remove `assetsDirs`.
- [ ] **Step 4: Run** → PASS; `fnm exec --using=24 -- yarn typecheck` → exit 0.
- [ ] **Step 5: Commit** — `feat(icon): load drawings through import(), no asset path and no fetch`.

### Task 4: `mud-logo` loads through the loader

**Files:**
- Modify: `src/components/mud-logo/mud-logo.tsx` (`assetsDirs` removed; the load path at lines 77-140)
- Delete: `src/components/mud-logo/mud-logo.providers.ts`
- Modify: `src/components/mud-logo/test/mud-logo.spec.tsx` (its 22 `fetch` references removed)

**Interfaces:**
- Consumes: `LOGO_MODULES`, `loadSvg`, `clearSvgCache`.
- Produces: unchanged `mud-logo` API; `mudLogoError` keeps `reason: 'unknown' | 'fetch-failed'`
  (`'fetch-failed'` now means the import failed — documented in the event JSDoc).

- [ ] **Step 1: Rewrite the spec** to the real modules: assert `data-mud-asset="logo:<name>"` for a valid
  name, `mudLogoError` `{ reason: 'unknown' }` for an invalid one, and the stale-result guard by
  changing `name` before `waitForChanges` (same shape as Task 3 step 1).
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/components/mud-logo` → FAIL.
- [ ] **Step 3: Implement** — `await loadSvg('logo', name, LOGO_MODULES)`; null → `mudLogoError`
  `'fetch-failed'`; remove `assetsDirs`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(logo): load logos through import(), no asset path and no fetch`.

### Task 5: Flags render inline through the loader

**Files:**
- Modify: `src/components/mud-phone-input/mud-phone-input.flags.ts` (replace `flagAssetPath` /
  `flagUrl` with `flagKey(iso): string` — `FILE_BY_ISO[iso] ?? iso.toLowerCase()`)
- Modify: `src/components/mud-phone-input/mud-phone-input.tsx` (`assetsDirs` removed; `renderFlag`
  at ~line 925 and the option-row flag at ~line 1152 render `<span class="flag" data-iso={…}>` with no
  `<img>`; `rowFlagUrl` becomes `rowFlagShown(iso): boolean`; a `@State() loadedFlags` set triggers a
  re-render when a flag module resolves; `componentDidRender` appends the cloned `Element` into every
  `.flag[data-iso]` / `.option-flag[data-iso]` that is shown and empty)
- Modify: `src/components/mud-phone-input/mud-phone-input.css` (`.flag img` and `.option-flag img` →
  `svg`, same `display`/size rules; `object-fit` goes — the generator's `preserveAspectRatio="xMidYMid slice"`
  gives the same cover crop)
- Modify: `src/components/mud-phone-input/test/mud-phone-input.flags.spec.ts`,
  `src/components/mud-phone-input/test/mud-phone-input.spec.tsx` (every `img src` assertion and the
  `setAssetPath('https://cdn.test/build/')` setup)

**Interfaces:**
- Consumes: `FLAG_MODULES`, `cachedSvg`, `loadSvg`.
- Produces: `flagKey(iso: string): string`; #191's `IntersectionObserver` gating unchanged — a row's
  flag module is imported only once the row is near the visible list.

- [ ] **Step 1: Update the specs.** `flags.spec.ts`: `flagKey('MD') === 'md'`, `flagKey('AC') === 'sh-ac'`,
  and "every country in `COUNTRIES` has a key in `FLAG_MODULES`" (replaces the file-exists check).
  `mud-phone-input.spec.tsx`: the trigger flag holds
  `svg[data-mud-asset="flag:md"]` after `waitForChanges`; an open list shows flags only for rows the
  observer reported (keep #191's observer test, assert on `svg` instead of `img`); two `.flag` boxes
  showing the same country both hold an `svg`.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/components/mud-phone-input` → FAIL.
- [ ] **Step 3: Implement** as listed under Files.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(phone-input): flags render inline through import(), no asset path`.

---

## Phase 3 — Seeding

**Executor**: Sonnet 5.5 · high · Wave D · implementer (after Phase 2; Task 6 edits `mud-phone-input.tsx` after Task 5)

### Task 6: Components seed their fixed-name icons

**Files (each: one static import per distinct icon, one `seedSvg` call per icon at the top of
`componentWillLoad`, added before any existing body; create `componentWillLoad` where absent):**

| Component file | Icons (variant `outlined` unless the site sets `variant`) |
| --- | --- |
| `src/components/mud-time-input/mud-time-input.tsx` | asterisk, cross-small, clock |
| `src/components/mud-numeric-input/mud-numeric-input.tsx` | cross-small, chevron-top, chevron-bottom |
| `src/components/mud-menu/mud-menu-item.tsx` | checkmark-small |
| `src/components/mud-date-picker/mud-date-picker.tsx` | chevron-left, chevron-right, chevron-bottom-small |
| `src/components/mud-phone-input/mud-phone-input.tsx` | chevron-bottom, cross-small, search, checkmark-small, warning |
| `src/components/mud-textarea/mud-textarea.tsx` | resize |
| `src/components/mud-pagination/mud-pagination.tsx` | chevron-left, chevron-right |
| `src/components/mud-date-input/mud-date-input.tsx` | asterisk, cross-small, calendar |
| `src/components/mud-text-input/mud-text-input.tsx` | cross-large, warning |
| `src/components/mud-sidebar/mud-sidebar-item.tsx` | chevron-bottom |
| `src/components/mud-breadcrumb/mud-breadcrumb.tsx` | chevron-right-small, chevron-left-small |
| `src/components/mud-select/mud-select.tsx` | checkmark-small, chevron-bottom |
| `src/components/mud-chip/mud-chip.tsx` | checkmark-small, cross-small |
| `src/components/mud-search-input/mud-search-input.tsx` | cross-small, arrow-right |
| `src/components/mud-file-item/mud-file-item.tsx` | cross-large |
| `src/components/mud-input-chip/mud-input-chip.tsx` | cross-small |
| `src/components/mud-tabs/mud-tabs.tsx` | chevron-left-small, chevron-right-small |
| `src/components/mud-file-input/mud-file-input.tsx` | cloud-upload |
| `src/components/mud-modal/mud-modal.tsx` | cross-small |

The table is the 2026-10-02 output of
`grep -rnoE '<mud-icon[^>]*\bname="[a-z0-9-]+"' src/components --include='*.tsx' | grep -v -E 'stories|/test/'`;
re-run it first and seed what it returns if it differs. Names passed through a variable or a prop
(`name={iconName}`, 13 sites) are NOT seeded — they load through `import()`.

**Interfaces:**
- Consumes: `seedSvg` (Task 2), `src/generated/icons/<variant>/<name>.ts` default exports (Task 1).
- Produces: nothing new.

Pattern (shown for `mud-select`):

```tsx
import checkmarkSmall from '../../generated/icons/outlined/checkmark-small';
import chevronBottom from '../../generated/icons/outlined/chevron-bottom';
import { seedSvg } from '../../utils/svg-assets';
// …
componentWillLoad() {
  // Seeded so the chevron and the tick paint without a runtime import (src/utils/svg-assets.ts).
  seedSvg('icon', 'outlined/checkmark-small', checkmarkSmall);
  seedSvg('icon', 'outlined/chevron-bottom', chevronBottom);
  // …existing body
}
```

- [ ] **Step 1: Write the failing spec** `src/utils/test/seeded-icons.spec.ts`: for each component file
  in the table, read its source and assert every fixed `<mud-icon name="x">` (same regex as above) has
  a matching `seedSvg('icon', '<variant>/x', …)` call — so a new fixed icon added later without a seed
  fails CI.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/utils/test/seeded-icons.spec.ts` → FAIL.
- [ ] **Step 3: Implement** the table, component by component.
- [ ] **Step 4: Run** the seeded-icons spec and the full spec lane `fnm exec --using=24 -- yarn test` → PASS.
- [ ] **Step 5: Commit** — the 19 component files and the spec; `perf(components): seed fixed-name icons so they paint without a runtime import`.

### Task 7: `mud-checkbox` tick and dash through `mud-icon` (gated)

The two drawings are identical to `checkmark-small` and `minus-small` (path data compared
2026-10-02). They move only if the checkbox shows no visual difference.

**Files:**
- Modify: `src/components/mud-checkbox/mud-checkbox.tsx` (`renderGlyph`, ~lines 330-360; seed both icons)
- Modify: `src/components/mud-checkbox/mud-checkbox.css` (`.glyph` rules, ~line 164: size the
  `mud-icon` host to the box the inline `svg` had; colour stays `currentColor`)
- Modify: `src/components/mud-checkbox/test/mud-checkbox.spec.tsx` (glyph assertions → `mud-icon[name]`)

- [ ] **Step 1: Update the spec**: checked → `mud-icon[name="checkmark-small"]`, indeterminate →
  `mud-icon[name="minus-small"]`, each with its `svg` on the first `waitForChanges` (seeded).
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/components/mud-checkbox` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Visual gate**: `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn sp.build && fnm exec --using=24 -- node scripts/assets/story-regression.mjs capture .asset-regression/checkbox --components mud-checkbox && fnm exec --using=24 -- node scripts/assets/story-regression.mjs compare .asset-regression/baseline .asset-regression/checkbox`
  → exit 0. **Any differing story → revert this task's three files** (`git checkout -- <files>`), record
  the diff ratios under the plan's `## Deviations` and keep the inline glyphs (Dan's rule: a glyph that
  does not match stays inline).
- [ ] **Step 5: Commit** (only when step 4 passed) — `refactor(checkbox): tick and dash through mud-icon, same drawings`.

---

## Phase 4 — Package and build

**Executor**: Sonnet 5.5 · high · Wave E · implementer (after Phase 3; shares `package.json` with Phases 1 and 5)

### Task 8: No published SVG, no copy step, `sideEffects` on the core

**Files:**
- Delete: `scripts/copy-component-assets.mjs`
- Modify: `package.json` (`build` command drops `&& node scripts/copy-component-assets.mjs`; the
  `build` Wireit `files` / `output` lists drop the copy script; add
  `"sideEffects": ["*.css", "./dist/mud/mud.esm.js", "./dist/esm/loader.js", "./loader/*"]`)
- Modify: `stencil.config.ts` (lines 70-75: the comment that explains the copy script goes; the
  `dist` `copy` entry for fonts stays)
- Modify: `.storybook/main.mjs` (lines 41-44 comment and the two `staticDirs` entries for
  `mud-icon/assets` and `mud-logo/assets` go; tokens and fonts entries stay)
- Modify: `scripts/validate-package.mjs` (`checkBundleAssets` → `checkAssetModules`: every key of the
  icon and logo manifests and every flag file has a generated module in `dist/components/` AND in
  `dist/esm/`, found by its `data-mud-asset` marker; plus `checkNoPublishedSvg`: no packed path ends in
  `.svg`)
- Modify: `scripts/__tests__/validate-package.spec.mjs` (the two checks; delete the `checkBundleAssets` cases)
- Modify: `INTEGRATION.md` line 403 troubleshooting row (no asset path left to get wrong)

- [ ] **Step 1: Write the failing check tests** (`node:test`): `checkNoPublishedSvg(['dist/mud/assets/outlined/a.svg'])`
  returns one problem; `checkNoPublishedSvg(['dist/mud/assets/fonts/onest-variable.woff2'])` returns none;
  `checkAssetModules` reports a manifest key with no marker in a fixture file list.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test:scripts` → FAIL.
- [ ] **Step 3: Implement** the Files list.
- [ ] **Step 4: Measure duplication.** Record in the plan's `## Deviations` (or confirm none): the
  packed size and file count from `fnm exec --using=24 -- yarn pack --out "$TMPDIR/mud-core.tgz"` before
  this task (from `448dc20d`) and after. If `dist/types/generated/**` holds one `.d.ts` per asset
  module, exclude `src/generated/**` from Stencil's type emission only if Stencil 4.45 supports it
  without breaking `dist/types/index.d.ts`; otherwise leave it and record the measured cost. Do not
  remove the `dist/cjs` or `dist/collection` outputs: whether they have consumers is a separate question
  this plan only records (`grep` the exports map and the adapters for each).
- [ ] **Step 5: Run** `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn validate.package && fnm exec --using=24 -- yarn test:scripts`
  → exit 0; `ls dist/components/assets dist/mud/assets/outlined 2>&1 | grep -c "No such file"` → 2.
- [ ] **Step 6: Commit** — `build: publish no SVG files, drop the asset copy step, declare sideEffects`.

---

## Phase 5 — Adapters

**Executor**: Sonnet 5.5 · high · Wave F · implementer (after Phase 4; root `package.json` workspaces)

### Task 9: React — remove the asset setup and the broken `postinstall`

**Files:**
- Delete: `packages/react/src/setup.ts`, `scripts/__tests__/react-adapter-setup.spec.mjs`
- Modify: `packages/react/src/index.ts` (drop the `./setup` exports; line 10 becomes
  `export { setNonce } from '@egov-moldova/mud/components';` — `setNonce` is CSP, `setAssetPath` has
  nothing left to configure)
- Modify: `packages/react/package.json` (drop `postinstall`; add `"sideEffects": false`)
- Create: `tooling/hooks/package.json` — `{ "name": "@egov-moldova/repo-hooks", "private": true, "scripts": { "postinstall": "node ../../scripts/git/install-hooks.mjs" } }`
- Modify: root `package.json` `workspaces` (add `"tooling/hooks"`), `scripts/git/install-hooks.mjs`
  header comment (now run by the private `tooling/hooks` workspace, which is never published, so the
  install script cannot reach a consumer)

**Interfaces:** removes `setupMud`, `defineCustomElements`, `toAssetBaseUrl`, `MudSetupOptions`,
`DefineCustomElementsOptions` from `@egov-moldova/mud-react`.

- [ ] **Step 1: Failing check** — add to `scripts/__tests__/` (`node:test`) `published-manifests.spec.mjs`:
  for every workspace whose `package.json` has no `"private": true` OR is one of the four adapters,
  assert no `preinstall` / `install` / `postinstall` script; and assert `tooling/hooks/package.json`
  is `private: true` with that `postinstall`.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test:scripts` → FAIL.
- [ ] **Step 3: Implement**; `fnm exec --using=24 -- yarn install` must still print
  `husky - …` / install the merge driver (run it and read the output).
- [ ] **Step 4: Run** `fnm exec --using=24 -- yarn test:scripts && fnm exec --using=24 -- yarn build.react` → exit 0.
- [ ] **Step 5: Commit** — `fix(react)!: drop the asset setup API and the postinstall that breaks external installs`.

### Task 10: Vue — remove the `Mud` plugin

**Files:**
- Delete: `packages/vue/src/plugin.ts`
- Modify: `packages/vue/src/index.ts` (lines 10-11 go), `packages/vue/package.json` (`"sideEffects": false`)

- [ ] **Step 1: Run** `grep -rn "plugin\|MudPluginOptions\|app.use(Mud" packages/vue --include='*.ts' --include='*.vue'`
  — every hit outside `fixture/` is removed here; the fixture changes in Task 13.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Run** `fnm exec --using=24 -- yarn build.vue` → exit 0.
- [ ] **Step 4: Commit** — `feat(vue)!: remove the Mud plugin, no asset path to set`.

### Task 11: Angular — remove `provideMud`

**Files:**
- Delete: `packages/angular/src/lib/provide-mud.ts`
- Modify: `packages/angular/src/public-api.ts` (last two exports go), `packages/angular/package.json`
  (`"sideEffects": false`, unless ng-packagr already writes it into `dist/package.json` — check the built file)

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn build.angular` → exit 0.
- [ ] **Step 3: Commit** — `feat(angular)!: remove provideMud, no asset path to set`.

### Task 12: web-components — demo on its own adapter, `sideEffects`

**Files:**
- Modify: `packages/web-components/demo/main.ts` (line 8: `import '@egov-moldova/mud/mud.esm.js'` →
  `import { defineCustomElements } from '@egov-moldova/mud-web-components'; defineCustomElements();`)
- Modify: `packages/web-components/demo/vite.config.ts` (`serveDesignSystemAssets`,
  `copyDesignSystemAssetsToBuild` and their comments go; `base: './'` stays)
- Modify: `packages/web-components/package.json` (`"sideEffects": false`)

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn build.web && fnm exec --using=24 -- yarn workspace @egov-moldova/mud-web-components demo.build`
  → exit 0; then serve `packages/web-components/demo/dist-demo` and open it from a file path and from
  a subfolder: icons render (checked in Task 13's fixture as well).
- [ ] **Step 3: Commit** — `fix(web-components): demo uses its own adapter, no asset copy plugins`.

---

## Phase 6 — Consumer fixtures

**Executor**: Sonnet 5.5 · high · Wave G · implementer (after Phase 5; consumes the removed adapter APIs)

### Task 13: Fixtures for all four adapters, zero-config

**Files:**
- Modify: `scripts/adapters/consumer-fixture.mjs` (`FRAMEWORKS` gains `react` and `web-components`;
  lines 574-577 inverted: fail when the packed core holds any `*.svg`; the usage line lists all four)
- Create: `packages/react/fixture/` — `package.json` template, `versions.json` (`{"18": {...}, "19": {...}}`
  pins of `react`, `react-dom`, `@types/react*`, `vite`, `@vitejs/plugin-react`, `typescript`),
  `index.html`, `src/main.tsx`, `src/App.tsx`, `tsconfig.json`, `tsconfig.negative.json`,
  `negative/wrong-type.tsx` (a `MudTextInput` with `value={1}` must fail `tsc`), `vite.config.ts`,
  `playwright.config.ts`, `e2e/fixture.spec.ts`
- Create: `packages/web-components/fixture/` — same layout without React: `src/main.ts` (bundler page:
  `defineCustomElements()`), `static/loader.html`, `static/deep/sub/page/loader.html`,
  `static/importmap.html`, `static/esm-side-effect.html` (`<script type="module">import '…/mud.esm.js'</script>`),
  served by `serve.mjs` from the installed `node_modules`; no negative case (`negative: null`, and
  `checkNegative` skips a null entry)
- Modify: `packages/vue/fixture/src/main.ts` (no `Mud`), `packages/vue/fixture/vite.config.ts`
  (no `vite-plugin-static-copy`), `packages/vue/fixture/package.json` template if it lists that plugin
- Modify: `packages/angular/fixture/src/main.ts` (no `provideMud`), `packages/angular/fixture/angular.json`
  (the `assets` glob for `dist/components/assets` goes)
- Modify: `packages/vue/fixture/e2e/fixture.spec.ts`, `packages/angular/fixture/e2e/fixture.spec.ts`
  (the shared assertions below)
- Modify: `scripts/__tests__/consumer-fixture.spec.mjs` if it pins `FRAMEWORKS` keys or the inverted assertion
- Modify: `.github/workflows/ci.yml` (Adapters job, after line 235: `node scripts/adapters/consumer-fixture.mjs react`
  — React 19 default — plus `--framework-version 18`, and `node scripts/adapters/consumer-fixture.mjs web-components`)

**Every fixture's e2e asserts** (with the existing console-error watch):
1. `mud-icon` by name, `mud-logo`, and `mud-phone-input`'s trigger flag each hold an `svg` with the
   expected `data-mud-asset`.
2. A component's own icon renders (`mud-select`'s chevron `mud-icon` holds its `svg`).
3. Three assets the page never shows — icon `outlined/umbrella`, logo `msign-logo-with-verb`, flag `jp`
   (all three exist and no component renders them, checked 2026-10-02) —
   appear in **no** network response (scan every JS response body for their `data-mud-asset` marker).
4. Bundled fixtures (React, Vue, Angular, web-components bundler page): no file of the build output
   contains the tag of one component the fixture does not import (choose it per fixture and name it in
   the spec; `mud-stepper` is unused by all four as of 2026-10-02 — re-check with `grep`). The
   web-components loader pages assert instead that the `mud-stepper` chunk is never requested.
5. web-components only: `loader.html` on the deep subpath and `importmap.html` render (1)–(2) with no
   `resourcesUrl`; `esm-side-effect.html` registers `mud-button` (`customElements.get('mud-button')`).

- [ ] **Step 1: Write the React fixture's e2e first** and run it against the current tree to see it
  fail where expected: `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn build.react && fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs react`
  → FAIL until the runner knows `react`.
- [ ] **Step 2: Implement** the runner entries and both new fixtures; update the Vue and Angular fixtures.
- [ ] **Step 3: Run each:** `node scripts/adapters/consumer-fixture.mjs react`, `react --framework-version 18`,
  `vue`, `angular --framework-version 20`, `angular --framework-version 22`, `web-components`
  (each prefixed `fnm exec --using=24 --`, after `yarn build.react|vue|angular|web` as the runner's
  preflight demands) → every run ends `PASS <framework>@<major>`.
- [ ] **Step 4: Commit** — `test(adapters): zero-config fixtures for React and web-components, no asset copy anywhere`.

---

## Phase 7 — Documentation

**Executor**: Sonnet 5.5 · medium · Wave H · implementer (after Phase 6; snippets come from the fixtures)

### Task 14: Docs describe current usage, with examples

**Files:**
- Modify: `README.md` — the consumer sections ("With a bundler", "React component wrappers", "Vue
  component wrappers", "Angular component wrappers", plain HTML / CDN). Each framework gets one working
  example: install, the token and style imports, a form control, `<MudIcon name="calendar" />` (or the
  framework's equivalent), a `mud-logo`, a `mud-phone-input`. State once: icons, logos and flags load
  automatically, only when shown; there is no asset step. Add a "Service workers / PWA" note: exclude
  the per-asset chunks from precaching (a Workbox `globIgnores` example), or the app downloads every
  icon on install.
- Modify: `packages/react/README.md`, `packages/vue/README.md`, `packages/angular/README.md`,
  `packages/web-components/README.md` (the `resourcesUrl` line at 102 says the option is not needed for
  MUD assets; the plain-HTML section drops "serve the whole `dist/mud/`" only if fonts no longer need
  it — they do, so keep it and say why: the font)
- Modify: `INTEGRATION.md` (line 64 copy step: keep for script-tag hosting of the JS and font, say so;
  every other asset mention)
- Modify: `CONTRIBUTING.md` — how to add an icon (`svg:icons`), a logo (drop the SVG, append to
  `LOGO_NAMES`), a flag (`svg:flags`); what `assets.generate` writes and that `src/generated/` is never
  committed; how a component seeds a fixed icon (and that `src/utils/test/seeded-icons.spec.ts` enforces
  it); the six fixture commands; the story regression tool.
- Modify: `.claude/skills/mud-design/SKILL.md` (lines 21 and 26: no `assetPath`, no `Mud`, no `provideMud`)
- Modify: `.claude/skills/stencil-compliance/SKILL.md` rows C8 / API3 / API4 and
  `.claude/skills/stencil-compliance/references/functional-api.md` lines 65-66, 112, 127 — assets are
  ES modules loaded through `src/utils/svg-assets.ts`; `getAssetPath` / `assetsDirs` are not used by
  any component.
- Create: `changes/asset-delivery.md` — `type: Changed`, `breaking: true`, title "icons, logos and flags
  load automatically; no asset path, no copied folder". Body: what changed, the removed published SVG
  files, the removed adapter APIs; **Migration:** delete the copy step and the `assetPath` / `setupMud` /
  `Mud` / `provideMud` / `resourcesUrl` setup; replace any `<img src=".../assets/...svg">` with
  `<mud-icon>` / `<mud-logo>`.
- Modify: any other doc the sweep below finds.

- [ ] **Step 1: Sweep** — `grep -rnE "assetPath|setAssetPath|resourcesUrl|copy-component-assets|dist/components/assets|dist/mud/assets/(outlined|filled)|public/mud|setupMud|provideMud|app\.use\(Mud|vite-plugin-static-copy|getAssetPath|assetsDirs" --include='*.md' . | grep -v -E '^\./(node_modules|\.claude/plans|changes/)'`
  — list every hit; each is rewritten or, when historical (an archived plan, a closed issue), left.
- [ ] **Step 2: Rewrite** the files above.
- [ ] **Step 3: Run the examples.** Each README framework snippet is copied verbatim from the matching
  fixture's `src/` (Task 13), so the fixtures are what proves the snippets work; diff each snippet
  against its fixture file.
- [ ] **Step 4: Run** the consumer-doc grep of the acceptance bar → exit 0.
- [ ] **Step 5: Commit** — `docs: icons, logos and flags load on their own — usage per framework, with examples`.

---

## Phase 8 — Proof

**Executor**: Sonnet 5.5 · high · Wave I · implementer (last; runs the full bar)

### Task 15: Visual regression and the full bar

- [ ] **Step 1:** `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn sp.build && fnm exec --using=24 -- node scripts/assets/story-regression.mjs capture .asset-regression/after`
- [ ] **Step 2:** `fnm exec --using=24 -- node scripts/assets/story-regression.mjs compare .asset-regression/baseline .asset-regression/after --tolerance mud-phone-input=0.001`
  → exit 0. The phone-input tolerance (0.1 % of a story's pixels) admits the raster difference between an
  `<img>` and an inline `svg` of the same drawing; anything above it, or any difference elsewhere, is a
  regression to fix, not to tolerate. The denominator is the `#storybook-root` element capture, not
  the 1280×800 viewport: a phone-input story captures at most ~300×400 px (120 000 px → 120 px at
  0.1 %), so one wrong flag (20×14 = 280 px) still fails it.
- [ ] **Step 3:** run every row of the acceptance bar below, as written.
- [ ] **Step 4:** fill `## Deviations` (or write "none").

## Acceptance bar

| # | Criterion | Command (as run) | Tolerance |
| --- | --- | --- | --- |
| 1 | Generator in sync | `fnm exec --using=24 -- node scripts/assets/build-asset-modules.mjs --check` | the command succeeds |
| 2 | Lint | `fnm exec --using=24 -- yarn lint` | the command succeeds |
| 3 | Types | `fnm exec --using=24 -- yarn typecheck` | the command succeeds |
| 4 | Spec lane | `fnm exec --using=24 -- yarn test` | the command succeeds |
| 5 | Script tests | `fnm exec --using=24 -- yarn test:scripts` | the command succeeds |
| 6 | Build + package gate | `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn validate.package` | the command succeeds |
| 7 | Adapter builds | `fnm exec --using=24 -- yarn build.react && fnm exec --using=24 -- yarn build.vue && fnm exec --using=24 -- yarn build.angular && fnm exec --using=24 -- yarn build.web` | the command succeeds |
| 8 | React fixture | `fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs react && fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs react --framework-version 18` | the command succeeds |
| 9 | Vue fixture | `fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs vue` | the command succeeds |
| 10 | Angular fixtures | `fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs angular --framework-version 20 && fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs angular --framework-version 22` | the command succeeds |
| 11 | web-components fixture | `fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs web-components` | the command succeeds |
| 12 | No published SVG | `fnm exec --using=24 -- yarn pack --out "$TMPDIR/mud-core.tgz" && ! tar -tzf "$TMPDIR/mud-core.tgz" \| grep -q '\.svg$'` | the command succeeds |
| 13 | No asset path machinery | `! test -e scripts/copy-component-assets.mjs && ! grep -rqE "assetsDirs\|getAssetPath" src --include='*.tsx' --include='*.ts'` | the command succeeds |
| 14 | Visual regression | `fnm exec --using=24 -- node scripts/assets/story-regression.mjs compare .asset-regression/baseline .asset-regression/after --tolerance mud-phone-input=0.001` | the command succeeds |
| 15 | Consumer docs | `! grep -nE "assetPath\|resourcesUrl\|dist/components/assets\|copy-component-assets\|setupMud\|provideMud\|app\.use\(Mud\|vite-plugin-static-copy" README.md INTEGRATION.md CONTRIBUTING.md packages/react/README.md packages/vue/README.md packages/angular/README.md packages/web-components/README.md .claude/skills/mud-design/SKILL.md` | the command succeeds |

## Self-refute log

| # | Question | Instance found, and where it is fixed — or what was scanned |
| --- | --- | --- |
| 1 | Does the fix reuse the defect's own mechanism class? | The defect is a manual step a consumer must remember. No fix relies on anyone remembering: the generator is a Wireit dependency with `--check` (Task 1), seeding is enforced by `src/utils/test/seeded-icons.spec.ts` (Task 6), zero-config is enforced by fixtures that contain no asset setup (Task 13), and the baseline's untouched-tree precondition is a command (`git diff --stat 448dc20d -- src` empty, Task 0 step 5), not a promise. |
| 2 | Can a rule's letter be met with its intent violated? | (a) Row 14's phone-input tolerance, read against a full-viewport denominator, would let a wrong 20×14 flag pass (280 px of 1 024 000) — fixed by stating the element-capture denominator in Task 15 step 2. (b) Fixture assertion 3 probes three never-shown assets, so another unused asset could still be downloaded — accepted: the spike measured the mechanism over the whole catalog, and a per-chunk assertion cannot tell a statically seeded icon in its own esbuild chunk from a lazy one. (c) Row 13 could pass while a test still calls `setAssetPath` — scanned: the only users are the phone-input specs Task 5 rewrites. |
| 3 | Has every numeric target a denominator, a minimum n, and an instrument outside what it grades? | Row 14: denominator = pixels of the `#storybook-root` capture, n = every story of the 22 listed components, instrument = pixelmatch over captures, independent of the code under change. The 0.1 % figure is a stated budget, not a measurement; its worst case is derived in Task 15 step 2. Map-size and chunk numbers in the spec come from the spike, which is outside this plan's code. |
| 4 | Do two of the plan's own rules interact into an unintended pass? | (a) "Never touch generated readmes" × Tasks 3/4 changing JSDoc: the build regenerates the readme, and without a rule it would either stay stale or be swept up unnamed — fixed in Global Constraints (stage it by name in the task's commit). (b) Task 7's revert-on-difference × row 14: a reverted Task 7 leaves the checkbox inline, which row 14 then compares against an inline baseline — consistent. (c) Seeding (Task 6) × fixture assertion 3: seeded icons enter main chunks by design, so the never-shown probes are chosen outside the seeded set (`umbrella`, `msign-logo-with-verb`, `jp`) — consistent. |

## Deviations

(filled during implementation)

## Not verified

- Next.js / SSR, Storybook as a consumer application, webpack in a real application, and consumer
  test runners (Vitest/Jest inside an application). The fixtures cover Vite (React 18/19, Vue,
  web-components), Angular CLI 20/22, plain HTML on a deep subpath, an import map and a side-effect-only
  import; webpack was covered by the throwaway spike only.
- PWA precaching: documented, not tested.
- Whether `dist/cjs` and `dist/collection` have consumers: recorded by Task 8, not acted on.
