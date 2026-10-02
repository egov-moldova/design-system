# Asset delivery — implementation plan

**Execution**: workflow — `2026-10-02-asset-delivery.workflow.mjs` (generated from this plan by tools/plan-to-workflow.mjs; regenerate, never edit)

**Status:** planned (unbuilt) — awaiting Dan's review
**Reviewed:** none
**Spec:** `.claude/plans/2026-10-02-asset-delivery-design.md` (approved by Dan on 2026-10-02; its
`## Revisions after review` section records the two decisions Dan changed afterwards)
**Branch:** `danzubco/asset-delivery-on-191` — PR #191 head `2d13b3d2` + the PR #190 branch (which
contains PR #189) merged at `448dc20d`. The PR this branch opens is stacked on #189 → #190 and #191.

**Goal:** every consumer of `@egov-moldova/mud` — React, Vue, Angular, the web-components adapter, a
plain module page and a CDN import — renders every icon, logo and flag with no asset configuration,
downloads only the assets it shows, and bundles only the components it imports.

**Architecture:** a generator turns every SVG owned by `mud-icon`, `mud-logo` and `mud-phone-input`
into one sanitized, id-prefixed ES module plus a `key → () => import()` map per class; the generated
modules are committed and guarded by a `--check` mode, like `icon-names.ts` today. One shared loader
(`src/utils/svg-assets.ts`) resolves a key through the map, caches the parsed drawing, and returns a
sanitized `Element` the owner appends to its shadow root. Published SVG files, the copy step and every
asset-path API disappear.

**Tech stack:** Stencil 4.45 (`dist`, `dist-custom-elements`, React/Vue/Angular output targets), SVGO 4
(`prefixIds`, `removeScripts`, `removeAttrs`, `convertStyleToAttrs`), Vitest + `@stencil/vitest`
(spec lane), `node:test` (`yarn test:scripts`), Playwright 1.63 + pixelmatch 7 (fixtures, visual
regression), Wireit.

## Problem

A consumer of the design system sees blank icons, logos and flags — with no error — whenever one of
three manual steps is missed: copy the core's asset folder into the app, call the adapter's asset
setup (`setupMud`, `app.use(Mud, …)`, `provideMud(…)`, or the loader's `resourcesUrl`), and point it at
the right URL. The web-components README path already 404s every icon (Chromium probe, 2026-10-02);
PR #191 moves the phone-input flags onto the same path; and with no `sideEffects` declared, a
3-component React app ships every component (216 KB gzip measured, 91 KB with `sideEffects`). The
spec's `## Problem, measured` table carries the evidence for each.

## Execution matrix

Dispatch verdict: dispatch — every phase is a written brief (Files, steps, commands) whose result is a
diff plus a passing check, so each passes the brief-test by construction; the phases chain on
contracts (loader → generator → owners → package → adapters → fixtures → docs), so the waves are
sequential.

| Phase | Model | Effort | Wave | Notes |
| --- | --- | --- | --- | --- |
| 0 Baseline | Sonnet 5.5 | high | A | must run before any `src/` change: the baseline is the untouched tree |
| 1 Loader and generator | Opus 5.5 | medium | B | sanitization + id prefixing is security-adjacent; Task 2's index files import Task 1's `SvgModuleMap` — sequential inside the phase |
| 2 Owners | Sonnet 5.5 | high | C | consumes Phase 1 (`svg-assets`, `ICON_MODULES`, `LOGO_MODULES`, `FLAG_MODULES`); Tasks 3, 4, 5 own disjoint folders |
| 3 Package and build | Sonnet 5.5 | high | D | consumes Phase 2 (no `assetsDirs` left); shares root `package.json` with Phases 1 and 4 |
| 4 Adapters | Sonnet 5.5 | high | E | consumes Phase 3's svg-free package and inverted runner check; shares root `package.json` (`workspaces`) with Phase 3; Task 9 can stop for Dan |
| 5 Consumer fixtures | Sonnet 5.5 | high | F | consumes Phase 4's removed APIs and updated Vue/Angular fixtures |
| 6 Documentation | Sonnet 5.5 | medium | G | writes no code; its framework snippets are copied from Phase 5's fixtures |
| 7 Proof | Sonnet 5.5 | high | H | runs the full bar; fixes any regression it finds, which is code |

Routing rationale: no phase needs Fable 5.1 for execution — the architectural judgment is encoded in
the spec and this plan; Opus 5.5 takes Phase 1 only, where a sanitization mistake would ship to every
consumer. Escalation: if a phase fails its acceptance criteria twice, restart that phase one tier up
with fresh context instead of iterating in place. Parallel = separate subagents on disjoint files; run
the full test suite once per wave, not per agent.

## Options

The comparison lives in the spec (`### Options`, four options graded, PASS on `options-screen`).

## Decision

Option D of the spec — every asset loaded through `import()`, owned by the rendering component — as
refined by Dan on 2026-10-02 after the plan's critique round:

- **No seeding.** Spec decision 3 (fixed-name icons imported statically and seeded) is dropped.
  Stencil awaits `componentWillLoad`, so an icon loaded through `import()` is never painted
  half-loaded; seeding only saved one small request on a component's first appearance, while it cost
  edits in ~31 components, a structural spec, and the download of conditional glyphs never shown
  (warning, clear, tick) — against the goal's "downloads only the assets it shows". It can be added
  later as a purely additive change if a measurement asks for it.
- **The generated modules are committed** (`src/generated/`), guarded by
  `build-asset-modules.mjs --check` — the precedent of `icon-names.ts` and `icons.manifest.json`. A
  fresh clone, the editor and every script (Wireit or not) resolve them with no build step.
- **Inline glyphs stay inline.** An inline glyph moves into `mud-icon` only when its drawing is
  identical to one in the icon set AND nothing visible changes. The only identical ones — the
  `mud-checkbox` tick and dash — paint synchronously today; through an unseeded `mud-icon` the tick
  would wait for a chunk on the first check, so they stay inline with the seven non-identical glyphs.
- No SVG is published any more; `dist/mud/assets/fonts/` stays; the flag-icons licence ships as a file.
- The adapter asset APIs (`setupMud`, React `defineCustomElements`, Vue `Mud`, Angular `provideMud`)
  are removed: the adapters were never published.
- The docs are rewritten to describe current usage, with a working example per framework.

## Global Constraints

- Node 24 (`.nvmrc`): every `yarn` / `node` command runs as `fnm exec --using=24 -- <command>`. The
  shell's default Node is 26.
- Stencil `~4.45.0` with the repo patch (`.yarn/patches/@stencil-core-npm-4.45.0-*.patch`); SVGO
  `^4.1.0`; no new runtime dependency in any published package.
- Never edit `src/components.d.ts`, component `readme.md` files or
  `packages/*/src/**/stencil-generated/**` by hand. A task that changes a component's JSDoc runs
  `yarn build` and stages that component's regenerated `readme.md` BY NAME in its own commit.
- `src/generated/` is generator output: never edited by hand; after changing any SVG under an owner's
  `assets/`, run `yarn assets.generate` and commit the result in the same commit.
- Locale-first (`AGENTS.md` rule 13): no new user-facing string literal.
- Token-first: no new hard-coded colour or size in component CSS (`yarn lint.colors`).
- These inline glyphs stay exactly as they are: the close glyphs of `mud-info-box`, `mud-toast`,
  `mud-banner`, `mud-tooltip`; the `mud-link` external arrow; the `mud-accordion-item` plus/minus; the
  `mud-file-item` glyph; the `mud-checkbox` tick and dash.
- Every changed component keeps its public props, events, slots and parts, except the removals the
  spec lists (adapter asset APIs, published SVG files).
- Git: a dispatched leg never runs a git command that writes the index, refs or worktree (`add`,
  `commit`, `checkout`, `restore`, `reset`, `stash`, …). It reports the paths it wrote; the controller
  stages them BY NAME (never `git add -A` / `git add .`) and commits, one commit per task, Conventional
  Commits, header ≤ 100 characters. A step that says "revert" means: report the files, the controller
  restores them.
- `CHANGELOG.md` is not edited; one fragment under `changes/` (`changes/README.md`).

## Review Focus

1. **An unknown or prototype-shaped name** (`name="constructor"`, `name="__proto__"`) reaches a map
   lookup: the icon must stay a decorative empty host, never throw. Pinned in Task 1 and Task 3.
2. **A prop that changes while its module is importing** must not paint the old drawing. Pinned in
   Task 3 and Task 4 with a held import promise, so the race is real.
3. **A flag box reused for another country** — the trigger after a country change, a list row after
   the search filter changes — must show the new country's flag, and two boxes showing the same
   country must both render without picking up another flag's gradient. Pinned in Task 2 (id prefix)
   and Task 5.
4. **A failed import** (offline, a 404 after a redeploy changed chunk hashes): the host stays empty,
   one warning, and a later render retries instead of caching the failure. Pinned in Task 1.
5. **A side-effect-only import inside a bundled app** (`import '@egov-moldova/mud/mud.esm.js'`) after
   `sideEffects` is declared: elements must still register. Pinned in Task 11 (a Vite-built page of
   the web-components fixture).

---

## Phase 0 — Baseline

**Executor**: Sonnet 5.5 · high · Wave A · implementer (first: the baseline must come from the untouched tree)

### Task 0: Story regression tool and baseline capture

Captures every Storybook story BEFORE any code change, so Task 13 can prove nothing moved. Every
component that renders a `mud-icon` (33 of them), a `mud-logo` or a flag changes its loading path, so
the capture covers all stories rather than a list that could miss one.

**Files:**
- Create: `scripts/assets/story-regression.mjs`
- Create: `scripts/__tests__/story-regression.spec.mjs`
- Modify: `.gitignore` (add `/.asset-regression/`)

**Interfaces:**
- Produces:
  - `node scripts/assets/story-regression.mjs capture <outDir> [--components <dir,...>]` — writes
    `<outDir>/<story-id>.png` per story and `<outDir>/manifest.json`
    (`{ "<story-id>": { "component": "<src/components dir>", "width": n, "height": n } }`).
  - `node scripts/assets/story-regression.mjs compare <baselineDir> <afterDir> [--components <dir,...>] [--budget <dir>=<n>px,...]`
    — compares the stories present in `<afterDir>/manifest.json` (filtered by `--components` when
    given) against the baseline's same ids; the default budget is 0 differing pixels; `--budget`
    raises it per component dir. Exit 0 = every compared story within its budget; 1 = a story over
    budget (each listed with its differing-pixel count, a diff PNG beside the after capture); 2 = a
    compared story missing in the baseline, or a usage / I/O error.

- [ ] **Step 1: Write the failing test** — `scripts/__tests__/story-regression.spec.mjs` (`node:test`):

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { budgetFor, compareImages, storiesFor } from '../assets/story-regression.mjs';

describe('storiesFor', () => {
  const index = {
    entries: {
      'components-icon--default': { type: 'story', id: 'components-icon--default', importPath: './src/components/mud-icon/mud-icon.stories.ts' },
      'components-icon--docs': { type: 'docs', id: 'components-icon--docs', importPath: './src/components/mud-icon/mud-icon.stories.ts' },
      'components-button--default': { type: 'story', id: 'components-button--default', importPath: './src/components/mud-button/mud-button.stories.ts' },
    },
  };
  it('maps every story to its component dir and drops docs entries', () => {
    assert.deepEqual(storiesFor(index), { 'components-icon--default': 'mud-icon', 'components-button--default': 'mud-button' });
  });
  it('filters by component dir', () => {
    assert.deepEqual(Object.keys(storiesFor(index, ['mud-icon'])), ['components-icon--default']);
  });
});

describe('compareImages', () => {
  it('reports zero for identical images and the differing pixel count otherwise', async () => {
    const { PNG } = await import('pngjs');
    const a = new PNG({ width: 2, height: 1 });
    a.data.fill(255);
    const b = new PNG({ width: 2, height: 1 });
    b.data.fill(255);
    b.data[0] = 0;
    assert.equal(compareImages(a, a).pixels, 0);
    assert.equal(compareImages(a, b).pixels, 1);
  });
});

describe('budgetFor', () => {
  it('defaults to zero and reads a per-component budget', () => {
    assert.equal(budgetFor('mud-icon', { 'mud-phone-input': 279 }), 0);
    assert.equal(budgetFor('mud-phone-input', { 'mud-phone-input': 279 }), 279);
  });
});
```

- [ ] **Step 2: Run it to verify it fails** — `fnm exec --using=24 -- node --test scripts/__tests__/story-regression.spec.mjs` → FAIL, module not found.
- [ ] **Step 3: Implement** `scripts/assets/story-regression.mjs`, reusing the pixel-perfect audit's
  shared helpers rather than re-writing them — `diffImages` from `scripts/audit/lib/image-diff.mjs`,
  `storyUrl` from `scripts/audit/lib/storybook-helpers.mjs`, `launchBrowser` from
  `scripts/audit/lib/browser-context.mjs`, `captureState` from `scripts/audit/lib/state-page.mjs`
  (read each signature there first):
  - `storiesFor(index, componentDirs?)` — `{ storyId: componentDir }` for `type: 'story'` entries,
    the dir read from `importPath` (`./src/components/<dir>/…`).
  - `compareImages(a, b)` — a thin wrapper over `diffImages` with threshold 0.1, returning
    `{ pixels, diff }`; different sizes → `pixels: Infinity`.
  - `budgetFor(dir, budgets)` — `budgets[dir] ?? 0`.
  - `capture`: serves `storybook-static/` with `vite preview --outDir storybook-static --port 6110`
    (Vite is a dev dependency), reads `storybook-static/index.json`, opens each story through
    `storyUrl` in Chromium at 1280×800, waits until every `mud-icon`, every `mud-logo`, every `.flag`
    and every `.option-flag` that the phone-input's list has marked shown, in every open shadow root,
    holds an `svg` — or 5 s pass — then captures the `#storybook-root` element.
- [ ] **Step 4: Run it to verify it passes** — same command → PASS.
- [ ] **Step 5: Capture the baseline from the untouched tree:**
  `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn sp.build && fnm exec --using=24 -- node scripts/assets/story-regression.mjs capture .asset-regression/baseline`
  — only after `git diff --stat 448dc20d -- src` prints nothing.
- [ ] **Step 6: Record the phone-input budget.** Read the largest `mud-phone-input` capture from
  `.asset-regression/baseline/manifest.json` and write it, with its story id, under the plan's
  `## Deviations` heading. The budget Task 13 applies is fixed at **279 differing pixels per
  `mud-phone-input` story**: one fewer than a single 20×14 flag box, so a whole wrong flag can never
  fit inside it, whatever the story's size. It exists only because an `<img>` and an inline `svg` of
  the same drawing rasterize their anti-aliased edges differently.
- [ ] **Step 7: Commit** — `scripts/assets/story-regression.mjs`, `scripts/__tests__/story-regression.spec.mjs`, `.gitignore`;
  `test(assets): story regression capture and compare, baseline before the asset change`.

---

## Phase 1 — Loader and generator

**Executor**: Opus 5.5 · medium · Wave B · implementer (after Phase 0; Task 2's index files import Task 1's type)

### Task 1: Shared SVG loader

**Files:**
- Create: `src/utils/svg-assets.ts`
- Create: `src/utils/test/svg-assets.spec.ts`

**Interfaces:**
- Consumes: `sanitizeSvgToElement(markup: string): Element | null` from `src/utils/svg-sanitizer.ts`.
- Produces:

```ts
export type SvgKind = 'icon' | 'logo' | 'flag';
export type SvgModuleMap = Readonly<Partial<Record<string, () => Promise<{ default: string }>>>>;
/** A fresh clone of an already-loaded asset, or undefined. Never imports. */
export function cachedSvg(kind: SvgKind, key: string): Element | undefined;
/** Resolves through the cache, else through `map[key]`; null for an unknown key or a failed import. */
export function loadSvg(kind: SvgKind, key: string, map: SvgModuleMap): Promise<Element | null>;
/** Tests only. */
export function clearSvgCache(): void;
```

- [ ] **Step 1: Write the failing spec** `src/utils/test/svg-assets.spec.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cachedSvg, clearSvgCache, loadSvg } from '../svg-assets';

const svg = (k: string) => `<svg xmlns="http://www.w3.org/2000/svg" data-mud-asset="icon:${k}"></svg>`;

describe('svg-assets', () => {
  afterEach(() => clearSvgCache());

  it('serves a loaded asset synchronously afterwards, as a fresh clone each time', async () => {
    await loadSvg('icon', 'outlined/a', { 'outlined/a': async () => ({ default: svg('outlined/a') }) });
    const one = cachedSvg('icon', 'outlined/a');
    expect(one?.getAttribute('data-mud-asset')).toBe('icon:outlined/a');
    expect(cachedSvg('icon', 'outlined/a')).not.toBe(one);
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

  it('keeps kinds apart', async () => {
    await loadSvg('logo', 'x', { x: async () => ({ default: svg('x') }) });
    expect(cachedSvg('icon', 'x')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/utils/test/svg-assets.spec.ts` → FAIL.
- [ ] **Step 3: Implement** with two `Map`s keyed `` `${kind}:${key}` `` (parsed `Element`s and in-flight
  promises); look the key up with `Object.hasOwn(map, key)` before calling, so a prototype member is
  never invoked; sanitize once at insertion, clone on every read; a rejected import deletes its
  in-flight entry and resolves to null.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `src/utils/svg-assets.ts`, `src/utils/test/svg-assets.spec.ts`;
  `feat(utils): one SVG loader for import()-loaded assets`.

### Task 2: Asset module generator

**Files:**
- Create: `scripts/assets/build-asset-modules.mjs`
- Create: `scripts/assets/svgo.asset-modules.mjs`
- Create: `scripts/__tests__/build-asset-modules.spec.mjs`
- Create: `src/generated/**` (generator output, committed)
- Modify: `package.json` (new script `"assets.generate": "node scripts/assets/build-asset-modules.mjs"`
  — a plain script, not a Wireit dependency of anything: the output is committed)
- Modify: `eslint.config.mjs` (global `ignores`: `src/generated/**`), `.prettierignore` (`src/generated/`),
  `.gitattributes` (`src/generated/** linguist-generated=true`, so reviews collapse it)

**Interfaces:**
- Consumes: `type SvgModuleMap` from `src/utils/svg-assets.ts` (Task 1).
- Produces, under `src/generated/`:
  - `icons/<variant>/<name>.ts`, `logos/<name>.ts`, `flags/<code>.ts` — each `export default '<svg …>';`
  - `icons/index.ts` → `export const ICON_MODULES: SvgModuleMap` keyed `'<variant>/<name>'`
  - `logos/index.ts` → `export const LOGO_MODULES: SvgModuleMap` keyed `'<name>'`
  - `flags/index.ts` → `export const FLAG_MODULES: SvgModuleMap` keyed by file base (`md`, `sh-ac`),
    headed by a `/*! … */` comment carrying the flag-icons copyright and MIT notice from
    `src/components/mud-phone-input/assets/flags/LICENSE`, so minifiers keep it in the chunk.
  - every index: `import type { SvgModuleMap } from '../../utils/svg-assets';`
- Every emitted `<svg>` carries `data-mud-asset="<kind>:<key>"` (e.g. `icon:outlined/calendar`).
- Sources: `src/components/mud-icon/assets/{outlined,filled}/*.svg`,
  `src/components/mud-logo/assets/*.svg`, `src/components/mud-phone-input/assets/flags/*.svg`.
- `--check`: writes nothing, exits 1 when any output would differ (stale, missing or extra file).

- [ ] **Step 1: Write the failing tests** in `scripts/__tests__/build-asset-modules.spec.mjs`:

```js
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  it('turns a style attribute into presentation attributes, so a strict style-src-attr CSP allows it', () => {
    const out = transformSvg('<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:#fff" d="M0 0h1"/></svg>', { kind: 'flag', key: 'ro' });
    assert.doesNotMatch(out, /style=/);
    assert.match(out, /fill="#fff"/);
  });
});

describe('toModuleSource', () => {
  it('emits one default-exported string literal', () => {
    assert.equal(toModuleSource('<svg a="1"/>'), "export default '<svg a=\"1\"/>';\n");
  });
});

describe('committed output', () => {
  it('src/generated matches what the generator would write', () => {
    const run = spawnSync(process.execPath, ['scripts/assets/build-asset-modules.mjs', '--check'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stdout + run.stderr);
  });
});
```

- [ ] **Step 2: Run** `fnm exec --using=24 -- node --test scripts/__tests__/build-asset-modules.spec.mjs` → FAIL.
- [ ] **Step 3: Implement.** `svgo.asset-modules.mjs` exports `configFor({ kind, key })`:
  `multipass: false`, plugins `removeScripts`, `{ name: 'removeAttrs', params: { attrs: '(on.*)' } }`,
  `convertStyleToAttrs`, a local plugin that deletes any `href` / `xlink:href` / `src` not starting
  with `#`, `{ name: 'prefixIds', params: { prefix: \`mud-${kind}-${key.replace('/', '-')}\`, delim: '-' } }`,
  and a local plugin that sets `data-mud-asset` on the root (and, for `kind === 'flag'`,
  `preserveAspectRatio="xMidYMid slice"`). No geometry plugin: the source files are already optimised
  by `svg:icons` / `svg:flags`, and #191 measured that lower precision visibly changes flags
  (`svgo.config.flags.js`). `build-asset-modules.mjs` walks the three sources, refuses a key outside
  `/^[a-z0-9][a-z0-9-]*$/` (keys become file names and TS keys), writes the modules and the three
  index files with `() => import('./<path>')` entries, deletes outputs with no source, and honours
  `--check`. Export `transformSvg` and `toModuleSource` for the spec; guard the CLI with
  `isEntrypoint` (`scripts/lib/is-entrypoint.mjs`).
- [ ] **Step 4: Generate and check:** `fnm exec --using=24 -- yarn assets.generate && fnm exec --using=24 -- node --test scripts/__tests__/build-asset-modules.spec.mjs && fnm exec --using=24 -- yarn typecheck`
  → exit 0; `find src/generated/icons -name '*.ts' ! -name index.ts | wc -l` equals
  `find src/components/mud-icon/assets -name '*.svg' | wc -l`.
- [ ] **Step 5: Commit** — the files named above plus `src/generated/` (by path);
  `build(assets): generate one sanitized ES module per icon, logo and flag`.

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
- Modify: `src/components/mud-icon/readme.md` (regenerated by `yarn build`, staged by name)

**Interfaces:**
- Consumes: `ICON_MODULES` (Task 2), `cachedSvg`, `loadSvg`, `clearSvgCache` (Task 1).
- Produces: unchanged public API of `mud-icon` (`name`, `variant`, `size`, `color`, `interactive`,
  `disabled`, warnings, a11y behaviour).

- [ ] **Step 1: Rewrite the spec to the real modules.** Delete `makeFetchMock` and every `fetchSpy`
  assertion; keep `clearSvgCache()` in `afterEach`. Replace the fetch-URL assertions with the drawing
  itself, and make the race real by holding the import:

```tsx
it('renders the filled drawing when variant="filled"', async () => {
  const { root, waitForChanges } = await render(<mud-icon name={name} variant="filled" />);
  await waitForChanges();
  expect(root?.shadowRoot?.querySelector('svg')?.getAttribute('data-mud-asset')).toBe(`icon:filled/${name}`);
});

it('discards a drawing whose name changed while it was importing', async () => {
  const { root, waitForChanges } = await render(<mud-icon name="wallet" />);
  const modules = ICON_MODULES as Record<string, () => Promise<{ default: string }>>;
  let release!: (m: { default: string }) => void;
  vi.spyOn(modules, 'outlined/calendar').mockReturnValueOnce(new Promise(r => (release = r)));
  root!.setAttribute('name', 'calendar');
  await waitForChanges();
  root!.setAttribute('name', 'umbrella');
  await waitForChanges();
  release({ default: '<svg xmlns="http://www.w3.org/2000/svg" data-mud-asset="icon:outlined/calendar"></svg>' });
  await waitForChanges();
  await waitForChanges();
  expect(root?.shadowRoot?.querySelector('svg')?.getAttribute('data-mud-asset')).toBe('icon:outlined/umbrella');
});

it('renders a second instance of a loaded icon without importing again', async () => {
  await render(<mud-icon name="calendar" />);
  const spy = vi.spyOn(ICON_MODULES as Record<string, () => Promise<{ default: string }>>, 'outlined/calendar');
  const { root } = await render(<mud-icon name="calendar" />);
  expect(root?.shadowRoot?.querySelector('svg')).toBeTruthy();
  expect(spy).not.toHaveBeenCalled();
});
```

  The spy replaces only the timing of one module import, never the component's rendering
  (`TESTING.md`'s zero-mock rule is about `mud-*` rendering). Keep the existing `name="constructor"`
  and filled-only fallback cases, now asserting on `data-mud-asset`.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/components/mud-icon` → FAIL.
- [ ] **Step 3: Implement.** In `loadSvg()`: keep the variant and name guards and the fallback warning;
  compute `key = \`${resolvedVariant}/${requestedName}\``; `const hit = cachedSvg('icon', key)` → set
  `svgElement` and return synchronously; otherwise `await loadSvg('icon', key, ICON_MODULES)`, keep the
  stale-result guard, warn `[mud-icon] Failed to load SVG: …` on null. Remove `assetsDirs`.
- [ ] **Step 4: Run** → PASS; `fnm exec --using=24 -- yarn typecheck` → exit 0.
- [ ] **Step 5: Commit** — `feat(icon): load drawings through import(), no asset path and no fetch`.

### Task 4: `mud-logo` loads through the loader

**Files:**
- Modify: `src/components/mud-logo/mud-logo.tsx` (`assetsDirs` removed; the load path at lines 77-140)
- Delete: `src/components/mud-logo/mud-logo.providers.ts`
- Modify: `src/components/mud-logo/test/mud-logo.spec.tsx` (its 22 `fetch` references removed)
- Modify: `src/components/mud-logo/readme.md` (regenerated, staged by name)

**Interfaces:**
- Consumes: `LOGO_MODULES`, `loadSvg`, `clearSvgCache`.
- Produces: unchanged `mud-logo` API; `mudLogoError` keeps `reason: 'unknown' | 'fetch-failed'`
  (`'fetch-failed'` now means the import failed — documented in the event JSDoc).

- [ ] **Step 1: Rewrite the spec** to the real modules: `data-mud-asset="logo:<name>"` for a valid name;
  `mudLogoError` `{ reason: 'unknown' }` for an invalid one; the stale-result guard with a held import
  exactly as Task 3 step 1 (render `mpass-logo-with-name`, hold `mcloud-logo-with-name`, switch to
  `msign-logo-with-name`, release, assert `logo:msign-logo-with-name`).
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/components/mud-logo` → FAIL.
- [ ] **Step 3: Implement** — `await loadSvg('logo', name, LOGO_MODULES)`; null → `mudLogoError`
  `'fetch-failed'`; remove `assetsDirs`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(logo): load logos through import(), no asset path and no fetch`.

### Task 5: Flags render inline through the loader

**Files:**
- Modify: `src/components/mud-phone-input/mud-phone-input.flags.ts` (replace `flagAssetPath` /
  `flagUrl` with `flagKey(iso): string` — `FILE_BY_ISO[iso] ?? iso.toLowerCase()`)
- Modify: `src/components/mud-phone-input/mud-phone-input.tsx`:
  - `assetsDirs` removed;
  - `renderFlag` (~line 925) and the option-row flag (~line 1152) render `<span class="flag" data-iso={…}>`
    / `<span class="option-flag" data-iso={…}>` with no `<img>`;
  - `rowFlagUrl` becomes `rowFlagShown(iso): boolean` (#191's `IntersectionObserver` gating unchanged);
  - a `@State() loadedFlags` set triggers a re-render when a flag module resolves;
  - `componentDidRender` walks every `.flag[data-iso]` / `.option-flag[data-iso]`: when the box is
    shown and its child `svg`'s `data-mud-asset` is not `flag:${flagKey(iso)}`, it removes the child
    and appends `cachedSvg('flag', flagKey(iso))` (or starts `loadSvg` and leaves the box empty until
    `loadedFlags` re-renders it). Matching on the marker, not on "empty", is what keeps a box Stencil
    reuses for another country from showing the old flag: the rows are unkeyed (~line 1131) and the
    trigger span is the same element across country changes — the same reason `mud-icon` clears and
    re-appends on every render (`mud-icon.tsx:123-130`).
- Modify: `src/components/mud-phone-input/mud-phone-input.css` (`.flag img` and `.option-flag img` →
  `svg`, same `display`/size rules; `object-fit` goes — the generator's `preserveAspectRatio="xMidYMid slice"`
  gives the same cover crop)
- Modify: `src/components/mud-phone-input/test/mud-phone-input.flags.spec.ts`,
  `src/components/mud-phone-input/test/mud-phone-input.spec.tsx` (every `img src` assertion and the
  `setAssetPath('https://cdn.test/build/')` setup)

**Interfaces:**
- Consumes: `FLAG_MODULES`, `cachedSvg`, `loadSvg`.
- Produces: `flagKey(iso: string): string`.

- [ ] **Step 1: Update the specs.** `flags.spec.ts`: `flagKey('MD') === 'md'`, `flagKey('AC') === 'sh-ac'`,
  and "every country in `COUNTRIES` has a key in `FLAG_MODULES`" (replaces the file-exists check).
  `mud-phone-input.spec.tsx`:
  - the trigger flag holds `svg[data-mud-asset="flag:md"]` after `waitForChanges`;
  - after selecting Romania, the trigger flag holds `flag:ro` and no `flag:md`;
  - after typing a search that reorders the list, every shown `.option-flag` holds the marker of its
    own row's `data-iso`;
  - an open list shows flags only for rows the observer reported (keep #191's observer test, assert
    on `svg` instead of `img`);
  - two boxes showing the same country both hold an `svg`.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test.dev src/components/mud-phone-input` → FAIL.
- [ ] **Step 3: Implement** as listed under Files.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(phone-input): flags render inline through import(), no asset path`.

---

## Phase 3 — Package and build

**Executor**: Sonnet 5.5 · high · Wave D · implementer (after Phase 2; shares root `package.json` with Phases 1 and 4)

### Task 6: No published SVG, no copy step, `sideEffects` on the core

**Files:**
- Delete: `scripts/copy-component-assets.mjs`
- Modify: `package.json` (`build` command drops `&& node scripts/copy-component-assets.mjs`; the
  `build` Wireit `files` / `output` lists drop the copy script; add
  `"sideEffects": ["*.css", "./dist/mud/mud.esm.js", "./dist/esm/loader.js", "./loader/*"]`)
- Modify: `stencil.config.ts` (lines 70-75: the comment that explains the copy script goes; the
  `dist` `copy` list keeps the fonts entry and gains
  `{ src: 'components/mud-phone-input/assets/flags/LICENSE', dest: 'licenses/flag-icons.txt', warn: true }`)
- Modify: `.storybook/main.mjs` (lines 41-44 comment and the two `staticDirs` entries for
  `mud-icon/assets` and `mud-logo/assets` go; tokens and fonts entries stay)
- Modify: `scripts/validate-package.mjs`:
  - export `isPublishedSvg(path)` — the ONE predicate for "a packed path that is an SVG file"
    (`/\.svg$/i`), imported by `check-asset-delivery.mjs` and `consumer-fixture.mjs`;
  - `checkNoPublishedSvg(packedFiles)` uses it;
  - `checkBundleAssets` → `checkAssetModules`: every key of the icon and logo manifests and every flag
    file has a generated module, found by its `data-mud-asset` marker, in `dist/components/`,
    `dist/esm/` AND `dist/mud/` (the CDN output `unpkg` points at);
  - `checkFlagLicense`: `dist/mud/licenses/flag-icons.txt` is packed.
- Modify: `scripts/__tests__/validate-package.spec.mjs` (the new checks; delete the `checkBundleAssets` cases)
- Modify: `scripts/adapters/consumer-fixture.mjs` lines 574-578: the "packed core carries
  `dist/components/assets`" assertion is inverted — fail when any packed path satisfies `isPublishedSvg`
- Modify: `INTEGRATION.md` line 403 troubleshooting row (no asset path left to get wrong)
- Create: `scripts/assets/check-asset-delivery.mjs` — the acceptance bar's negative checks as one script,
  so no bar row depends on a `grep` pasted out of a markdown table. Exit 0 = clean, 1 = violations
  (each printed as `path:line: <pattern>`), 2 = usage or I/O error (a missing file or an unreadable
  tarball fails the row instead of passing it). `--root <dir>` (default: repo root) for the spec.
  - `--source`: fails when `scripts/copy-component-assets.mjs` exists, when `assetsDirs`,
    `getAssetPath` or `setAssetPath(` appears in `src/**/*.{ts,tsx}`, `packages/*/src/**/*.{ts,tsx}`
    (excluding `stencil-generated/`) or `stencil.config.ts`, or when `.storybook/main.mjs` still maps
    `mud-icon/assets` / `mud-logo/assets`.
  - `--docs`: over every tracked `*.md` / `*.mdx` (`git ls-files`) except `.claude/plans/**`,
    `changes/**`, `CHANGELOG.md` and `**/_archive/**`, fails on any consumer instruction to set up
    assets: `assetPath`, `setAssetPath`, `getAssetPath`, `resourcesUrl`, `setupMud`, `provideMud`,
    `app.use(Mud`, `dist/components/assets`, `public/mud/assets`, `assets/flags`, `assets/outlined`,
    `assets/filled`, `copy-component-assets`, `vite-plugin-static-copy`. One allowlist, in the script:
    the `defineCustomElements(opts?: { resourcesUrl?: …` API signature line of
    `packages/web-components/README.md`.
  - `--packed <tgz> [<tgz>…]`: fails when any entry of any listed tarball satisfies `isPublishedSvg`.
- Create: `scripts/__tests__/check-asset-delivery.spec.mjs` — for each mode, a positive control (a temp
  root seeded with one forbidden string, or a tarball holding `package/x.svg`, is reported with exit 1),
  the allowlisted line passes, a clean temp root exits 0, and a missing tarball exits 2.

- [ ] **Step 1: Write the failing tests** (`node:test`): `checkNoPublishedSvg(['dist/mud/assets/outlined/a.svg'])`
  returns one problem; `checkNoPublishedSvg(['dist/mud/assets/fonts/onest-variable.woff2'])` returns none;
  `checkAssetModules` reports a manifest key with no marker in a fixture file list, including one
  missing only from `dist/mud/`; `checkFlagLicense` reports a missing licence file; and the
  `check-asset-delivery.spec.mjs` controls above.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test:scripts` → FAIL.
- [ ] **Step 3: Implement** the Files list.
- [ ] **Step 4: Measure duplication.** Record under `## Deviations`: the packed size and file count from
  `fnm exec --using=24 -- yarn pack --out "$TMPDIR/mud-core.tgz"` at `448dc20d` and after this task. If
  `dist/types/generated/**` holds one `.d.ts` per asset module, exclude `src/generated/**` from
  Stencil's type emission only if Stencil 4.45 supports it without breaking `dist/types/index.d.ts`;
  otherwise leave it and record the measured cost. Do not remove the `dist/cjs` or `dist/collection`
  outputs: whether they have consumers is a separate question this plan only records (`grep` the
  exports map and the adapters for each).
- [ ] **Step 5: Run** `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn validate.package && fnm exec --using=24 -- yarn test:scripts && fnm exec --using=24 -- node scripts/assets/check-asset-delivery.mjs --source`
  → exit 0.
- [ ] **Step 6: Commit** — `build: publish no SVG files, drop the asset copy step, declare sideEffects`.

---

## Phase 4 — Adapters

**Executor**: Sonnet 5.5 · high · Wave E · implementer (after Phase 3; Task 9 can stop for Dan)

### Task 7: React — remove the asset setup and the broken `postinstall`

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
- Modify: `scripts/__tests__/git-hooks.spec.mjs` § "hook installation" (lines 113-132) — it already
  forbids install/pack lifecycle scripts on the root and pins the hook to the React workspace's
  `postinstall`; extend it rather than adding a second spec.

**Interfaces:** removes `setupMud`, `defineCustomElements`, `toAssetBaseUrl`, `MudSetupOptions`,
`DefineCustomElementsOptions` from `@egov-moldova/mud-react`.

- [ ] **Step 1: Failing check** — in `git-hooks.spec.mjs`:
  - the root test is unchanged (the root manifest is the published core: no install or pack script);
  - a new test asserts that none of the four adapter manifests
    (`packages/{react,vue,angular,web-components}/package.json`) declares `preinstall`, `install` or
    `postinstall` — the scripts that run on a consumer's machine. `prepare` stays allowed there:
    `packages/web-components/package.json` builds its `dist/` with it before publishing;
  - "runs from the postinstall of a private workspace" now asserts `workspaces` includes
    `tooling/hooks`, `tooling/hooks/package.json` is `private: true`, and its `postinstall` is
    `node ../../scripts/git/install-hooks.mjs`.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn test:scripts` → FAIL.
- [ ] **Step 3: Implement**; then `fnm exec --using=24 -- yarn install` must still print
  `husky - …` and register the merge driver (run it and read the output).
- [ ] **Step 4: Run** `fnm exec --using=24 -- yarn test:scripts && fnm exec --using=24 -- yarn build.react` → exit 0.
- [ ] **Step 5: Commit** — `fix(react)!: drop the asset setup API and the postinstall that breaks external installs`.

### Task 8: Vue — remove the `Mud` plugin

**Files:**
- Delete: `packages/vue/src/plugin.ts`
- Modify: `packages/vue/src/index.ts` (lines 10-11 go), `packages/vue/package.json` (`"sideEffects": false`)
- Modify: `packages/vue/fixture/src/main.ts` (no `Mud`), `packages/vue/fixture/vite.config.ts` (no
  `vite-plugin-static-copy`), and the fixture's `package.json` template if it lists that plugin

- [ ] **Step 1: Run** `grep -rn "plugin\|MudPluginOptions\|app.use(Mud\|static-copy" packages/vue --include='*.ts' --include='*.vue' --include='*.json'`
  — every hit is removed here.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Run** `fnm exec --using=24 -- yarn build.vue && fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs vue`
  → exit 0 (the existing "mud-icon and mud-logo each render an svg" test now passes with no asset setup).
- [ ] **Step 4: Commit** — `feat(vue)!: remove the Mud plugin, no asset path to set`.

### Task 9: Angular — remove `provideMud`, settle the recorded tree-shaking limitation

`stencil.config.ts:134-138` records `DEBT(angular-wrapper-side-effects)`: Angular bundles carried every
wrapper, so the package "cannot declare `sideEffects: false`". The adapter now targets
`@stencil/angular-output-target` 1.5.0, whose `esModules: true` writes one file per component, and
ng-packagr may still flatten them. This task measures it instead of assuming either way.

**Files:**
- Delete: `packages/angular/src/lib/provide-mud.ts`
- Modify: `packages/angular/src/public-api.ts` (last two exports go), `packages/angular/package.json`
  (`"sideEffects": false`, unless ng-packagr already writes it into `dist/package.json` — check the built file)
- Modify: `packages/angular/fixture/src/main.ts` (no `provideMud`), `packages/angular/fixture/angular.json`
  (the `assets` glob for `dist/components/assets` goes)
- Modify: `packages/angular/fixture/e2e/fixture.spec.ts` — add the test
  `bundle: an unimported component is not bundled` (no file of the fixture's build output contains
  `mud-stepper`, which the fixture does not import)
- Modify: `stencil.config.ts` lines 134-138 — only when step 3 passes: the `DEBT` comment goes

- [ ] **Step 1: Implement** the removals and the fixture edits.
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn build.angular` → exit 0.
- [ ] **Step 3: Measure:** `fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs angular --framework-version 20 && fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs angular --framework-version 22`.
  - Both pass → delete the `DEBT` comment and commit.
  - The new bundle test fails (the limitation still holds) → the controller restores
    `stencil.config.ts`, keeps the rest of the task, and the stage ends with `## Needs Dan`: the choice
    is an Angular-specific fix (per-wrapper definition on first use, or `/*@__PURE__*/` wrappers in the
    generated proxies) or a documented Angular exception to "bundles only the components it imports".
- [ ] **Step 4: Commit** — `feat(angular)!: remove provideMud, no asset path to set`.

### Task 10: web-components — demo on its own adapter, `sideEffects`

**Files:**
- Modify: `packages/web-components/demo/main.ts` (line 8: `import '@egov-moldova/mud/mud.esm.js'` →
  `import { defineCustomElements } from '@egov-moldova/mud-web-components'; defineCustomElements();`)
- Modify: `packages/web-components/demo/vite.config.ts` (`serveDesignSystemAssets`,
  `copyDesignSystemAssetsToBuild` and their comments go; `base: './'` stays)
- Modify: `packages/web-components/package.json` (`"sideEffects": false`)

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run** `fnm exec --using=24 -- yarn build.web && fnm exec --using=24 -- yarn workspace @egov-moldova/mud-web-components demo.build`
  → exit 0.
- [ ] **Step 3: Commit** — `fix(web-components): demo uses its own adapter, no asset copy plugins`.

---

## Phase 5 — Consumer fixtures

**Executor**: Sonnet 5.5 · high · Wave F · implementer (after Phase 4; consumes the removed adapter APIs)

### Task 11: Fixtures for all four adapters, zero-config

**Files:**
- Modify: `scripts/adapters/consumer-fixture.mjs` (`FRAMEWORKS` gains `react` and `web-components`; the
  usage line lists all four; `checkNegative` skips a framework whose `negative` is `null`)
- Create: `packages/react/fixture/` — `package.json` template, `versions.json` (`{"18": {...}, "19": {...}}`
  pins of `react`, `react-dom`, `@types/react*`, `vite`, `@vitejs/plugin-react`, `typescript`),
  `index.html`, `src/main.tsx`, `src/App.tsx`, `tsconfig.json`, `tsconfig.negative.json`,
  `negative/wrong-type.tsx` (a `MudTextInput` with `value={1}` must fail `tsc`), `vite.config.ts`,
  `playwright.config.ts`, `e2e/fixture.spec.ts`
- Create: `packages/web-components/fixture/` — `package.json` template, `versions.json`, `vite.config.ts`
  with two Vite-built pages: `index.html` + `src/main.ts` (`defineCustomElements()` from the adapter)
  and `side-effect.html` + `src/side-effect.ts` (only `import '@egov-moldova/mud/mud.esm.js'`); static
  pages served from the installed `node_modules` by `serve.mjs`: `static/deep/sub/page/loader.html`,
  `static/importmap.html`, `static/one-icon.html` (the loader page with a single
  `<mud-icon name="umbrella">` and nothing else); `playwright.config.ts`, `e2e/fixture.spec.ts`;
  `negative: null`
- Modify: `packages/vue/fixture/e2e/fixture.spec.ts`, `packages/angular/fixture/e2e/fixture.spec.ts`
  (the shared tests below; Angular's bundle test exists since Task 9)
- Create: `scripts/__tests__/fixture-coverage.spec.mjs` — reads each `packages/<framework>/fixture/e2e/fixture.spec.ts`
  and fails when a title from the table below is missing from a fixture it applies to. A fixture run
  only proves the tests that exist; this proves they exist.
- Modify: `scripts/__tests__/consumer-fixture.spec.mjs` if it pins `FRAMEWORKS` keys
- Modify: `.github/workflows/ci.yml` (Adapters job, after line 235: `node scripts/adapters/consumer-fixture.mjs react`
  — React 19 default — plus `--framework-version 18`, and `node scripts/adapters/consumer-fixture.mjs web-components`)

**Tests** (each one Playwright test with a fixed title; the existing console-error watch stays):

| # | Test title (exact) | Asserts | Fixtures |
| --- | --- | --- | --- |
| 1 | `assets: named icon, logo and flag render` | `mud-icon` by name, `mud-logo` and `mud-phone-input`'s trigger flag each hold an `svg` with the expected `data-mud-asset` | all four |
| 2 | `assets: a component's own icon renders` | `mud-select`'s chevron `mud-icon` holds its `svg` | all four |
| 3 | `assets: never-shown assets are not downloaded` | every `data-mud-asset` marker found in any network response belongs to an asset some shadow root on the page renders; and the markers of `icon:outlined/umbrella`, `logo:msign-logo-with-verb` and `flag:jp` (all exist, no component renders them, checked 2026-10-02) appear in no response | all four |
| 4 | `bundle: an unimported component is not bundled` | React, Vue, Angular (custom-elements bundle): no file of the build output contains `mud-stepper`. web-components (lazy loader, whose registry names every tag by design): the `mud-stepper` entry chunk is never requested, on every page | all four |
| 5 | `cdn: loader page on a deep subpath renders` | tests 1-2 on `static/deep/sub/page/loader.html`, no `resourcesUrl` | web-components |
| 6 | `cdn: import map page renders` | tests 1-2 on `static/importmap.html` | web-components |
| 7 | `side effects: mud.esm.js import registers elements` | on the Vite-built `side-effect.html`, `customElements.get('mud-button')` is defined — so a wrong `sideEffects` list fails here | web-components |
| 8 | `assets: one shown icon downloads exactly one asset chunk` | `static/one-icon.html` receives exactly one response carrying a `data-mud-asset` marker | web-components |

- [ ] **Step 1: Write the React fixture's e2e first** and run it against the current tree to see it
  fail where expected: `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn build.react && fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs react`
  → FAIL until the runner knows `react`.
- [ ] **Step 2: Implement** the runner entries, both new fixtures, the shared tests in all four, and
  `fixture-coverage.spec.mjs`.
- [ ] **Step 3: Run each:** `node scripts/adapters/consumer-fixture.mjs react`, `react --framework-version 18`,
  `vue`, `angular --framework-version 20`, `angular --framework-version 22`, `web-components`
  (each prefixed `fnm exec --using=24 --`, after `yarn build.react|vue|angular|web` as the runner's
  preflight demands) → every run ends `PASS <framework>@<major>`; then `fnm exec --using=24 -- yarn test:scripts` → exit 0.
- [ ] **Step 4: Commit** — `test(adapters): zero-config fixtures for React and web-components, no asset copy anywhere`.

---

## Phase 6 — Documentation

**Executor**: Sonnet 5.5 · medium · Wave G · implementer (after Phase 5; snippets come from the fixtures)

### Task 12: Docs describe current usage, with examples

**Files:**
- Modify: `README.md` — the consumer sections ("With a bundler", "React component wrappers", "Vue
  component wrappers", "Angular component wrappers", plain HTML / CDN). Each framework gets one working
  example: install, the token and style imports, a form control, `<MudIcon name="calendar" />` (or the
  framework's equivalent), a `mud-logo`, a `mud-phone-input`. State once: icons, logos and flags load
  automatically, only when shown; there is no asset step. Add a "Service workers / PWA" note: exclude
  the per-asset chunks from precaching (a Workbox `globIgnores` example), or the app downloads every
  icon on install. Add a "Content Security Policy" note: assets arrive as JavaScript modules
  (`script-src` covers them); no `img-src` or `connect-src` entry is needed for MUD assets.
- Modify: `packages/react/README.md`, `packages/vue/README.md`, `packages/angular/README.md`,
  `packages/web-components/README.md` (the `resourcesUrl` signature line at 102 stays as API reference
  and says the option is not needed for MUD assets; the plain-HTML section keeps "serve the whole
  `dist/mud/`" and says why: the font)
- Modify: `INTEGRATION.md` — line 35 (`assets/` holds SVG files that must stay beside `mud.esm.js`),
  line 64 (copy step: keep it for script-tag hosting of the JS and the font, say so), line 386 (flag
  CSP advice for `<img>` flags), and every other asset mention the sweep finds
- Modify: `CONTRIBUTING.md` — how to add an icon (`svg:icons`, then `assets.generate`), a logo (drop the
  SVG, append to `LOGO_NAMES`, then `assets.generate`), a flag (`svg:flags`, then `assets.generate`);
  that `src/generated/` is committed and checked by `build-asset-modules.mjs --check`; the six fixture
  commands; the story regression tool.
- Modify: `.claude/skills/mud-design/SKILL.md` (lines 21 and 26: no `assetPath`, no `Mud`, no `provideMud`)
- Modify: `.claude/skills/stencil-compliance/SKILL.md` rows C8 / API3 / API4 and
  `.claude/skills/stencil-compliance/references/functional-api.md` lines 65-66, 112, 127 — assets are
  ES modules loaded through `src/utils/svg-assets.ts`; `getAssetPath` / `assetsDirs` are not used by
  any component.
- Create: `changes/asset-delivery.md` — `type: Changed`, `breaking: true`, title "icons, logos and flags
  load automatically; no asset path, no copied folder". Body: what changed, the removed published SVG
  files, the removed adapter APIs, where the flag-icons licence now ships; **Migration:** delete the
  copy step and the `assetPath` / `setupMud` / `Mud` / `provideMud` / `resourcesUrl` setup; replace any
  `<img src=".../assets/...svg">` with `<mud-icon>` / `<mud-logo>`.
- Modify: any other doc step 1 finds.

- [ ] **Step 1: Sweep** — `fnm exec --using=24 -- node scripts/assets/check-asset-delivery.mjs --docs` lists
  every hit; each is rewritten or, when historical, the file is under an excluded path already.
- [ ] **Step 2: Rewrite** the files above.
- [ ] **Step 3: Snippets come from the fixtures.** Each README framework snippet is copied verbatim
  from the matching fixture's `src/` (Task 11), so the fixtures are what proves the snippets work; diff
  each snippet against its fixture file.
- [ ] **Step 4: Run** `fnm exec --using=24 -- node scripts/assets/check-asset-delivery.mjs --docs` → exit 0.
- [ ] **Step 5: Commit** — `docs: icons, logos and flags load on their own — usage per framework, with examples`.

---

## Phase 7 — Proof

**Executor**: Sonnet 5.5 · high · Wave H · implementer (last; runs the full bar)

### Task 13: Visual regression and the full bar

- [ ] **Step 1:** `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn sp.build && fnm exec --using=24 -- node scripts/assets/story-regression.mjs capture .asset-regression/after`
- [ ] **Step 2:** run row 14 as written. A story over budget is a regression to fix, not to tolerate.
- [ ] **Step 3:** pack the five tarballs row 15 reads, from the built tree:
  `fnm exec --using=24 -- yarn pack --out "$TMPDIR/mud-core.tgz"`,
  `fnm exec --using=24 -- yarn workspace @egov-moldova/mud-react pack --out "$TMPDIR/mud-react.tgz"`,
  `fnm exec --using=24 -- yarn workspace @egov-moldova/mud-vue pack --out "$TMPDIR/mud-vue.tgz"`,
  `fnm exec --using=24 -- yarn workspace @egov-moldova/mud-web-components pack --out "$TMPDIR/mud-web-components.tgz"`,
  and Angular from its built package: `(cd packages/angular/dist && fnm exec --using=24 -- npm pack --pack-destination "$TMPDIR")`
  then `mv "$TMPDIR"/egov-moldova-mud-angular-*.tgz "$TMPDIR/mud-angular.tgz"`.
- [ ] **Step 4:** run every row of the acceptance bar below, as written.
- [ ] **Step 5:** fill `## Deviations` (or write "none").

## Acceptance bar

| # | Criterion | Command (as run) | Tolerance |
| --- | --- | --- | --- |
| 1 | Generated modules in sync | `fnm exec --using=24 -- node scripts/assets/build-asset-modules.mjs --check` | exit status zero: no stale, missing or extra generated module |
| 2 | Lint | `fnm exec --using=24 -- yarn lint` | exit status zero: no ESLint, Stylelint or Prettier finding |
| 3 | Types | `fnm exec --using=24 -- yarn typecheck` | exit status zero: no TypeScript error |
| 4 | Spec lane | `fnm exec --using=24 -- yarn test` | exit status zero |
| 5 | Script tests (incl. `fixture-coverage`, `check-asset-delivery`, `build-asset-modules`, `git-hooks`, `validate-package` specs) | `fnm exec --using=24 -- yarn test:scripts` | exit status zero |
| 6 | Build and package gate | `fnm exec --using=24 -- yarn build && fnm exec --using=24 -- yarn validate.package` | exit status zero for both, in order |
| 7 | Adapter builds | `fnm exec --using=24 -- yarn build.react && fnm exec --using=24 -- yarn build.vue && fnm exec --using=24 -- yarn build.angular && fnm exec --using=24 -- yarn build.web` | exit status zero for all four |
| 8 | Zero-config rendering — React 18 and 19 | `fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs react && fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs react --framework-version 18` | both runs end `PASS react@<major>` with the four shared fixture tests passed |
| 9 | Zero-config rendering — Vue | `fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs vue` | ends `PASS vue@<major>` with the four shared fixture tests passed |
| 10 | Zero-config rendering — Angular 20 and 22 | `fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs angular --framework-version 20 && fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs angular --framework-version 22` | both runs end `PASS angular@<major>` with the four shared fixture tests passed |
| 11 | Zero-config rendering — web-components, plain module page, CDN shape | `fnm exec --using=24 -- node scripts/adapters/consumer-fixture.mjs web-components` | ends `PASS web-components@<major>` with all eight web-components fixture tests passed |
| 12 | Only shown assets downloaded | rows 8-11, plus `fnm exec --using=24 -- node --test scripts/__tests__/fixture-coverage.spec.mjs` (the tests exist in every fixture) | every asset marker in any fixture's network log belongs to an asset the page renders; none of the three probe markers appears; exactly one asset-carrying response on the web-components one-icon page |
| 13 | Only imported components bundled | rows 8-11, plus the `fixture-coverage` spec of row 12 | `mud-stepper` appears in no emitted file of the React, Vue and Angular fixtures; its entry chunk is never requested on any web-components page |
| 14 | Visual parity | `fnm exec --using=24 -- node scripts/assets/story-regression.mjs compare .asset-regression/baseline .asset-regression/after --budget mud-phone-input=279px` | no differing pixel in any story outside `mud-phone-input`; fewer differing pixels than one 20×14 flag box in each `mud-phone-input` story; no story missing in the baseline |
| 15 | No published SVG, in any of the five packages | `fnm exec --using=24 -- node scripts/assets/check-asset-delivery.mjs --packed "$TMPDIR/mud-core.tgz" "$TMPDIR/mud-react.tgz" "$TMPDIR/mud-vue.tgz" "$TMPDIR/mud-angular.tgz" "$TMPDIR/mud-web-components.tgz"` (packed by Task 13 step 3) | no `.svg` entry in any tarball; a missing tarball fails the row |
| 16 | No asset-path machinery left | `fnm exec --using=24 -- node scripts/assets/check-asset-delivery.mjs --source` | no violation across `src/`, `packages/*/src/`, `stencil.config.ts`, `.storybook/main.mjs` and the copy script |
| 17 | Consumer docs | `fnm exec --using=24 -- node scripts/assets/check-asset-delivery.mjs --docs` | no asset-setup instruction in any tracked `.md` / `.mdx` outside plans, changelog fragments and archives |

Row 14's flag box comes from the phone-input tokens (both sizes draw the flag in the same box), run
2026-10-02 on this branch:

```derived
$ grep -hoE "phone-input-flag-(width|height)-(md|lg): [0-9]+px" tokens/generated/core.tokens.css | sed 's/px$//' | sort -u
phone-input-flag-height-lg: 14
phone-input-flag-height-md: 14
phone-input-flag-width-lg: 20
phone-input-flag-width-md: 20
```

## Reuse ledger

Swept 2026-10-02 at `83111aa6`. Homes for every unit: `scripts/` (incl. `scripts/audit/lib/`,
`scripts/icons/`, `scripts/flags/`, `scripts/adapters/`, `scripts/lib/`), `scripts/__tests__/`,
`src/utils/`, `packages/*/fixture/`, root `package.json` scripts, installed dev dependencies (`svgo`,
`pixelmatch`, `pngjs`, `playwright`, `vite`). Tiers covered: name, path and functional (read the
candidate's exports); dependency tier by `package.json`.

## reuse-candidates: story-regression

- `scripts/audit/11-pixel-diff-states.mjs` · functional · rejected-because it diffs captures against
  Figma exports per state manifest, not two capture sets; **reused instead**: its shared helpers in
  `scripts/audit/lib/` (`diffImages`, `storyUrl`, `launchBrowser`, `captureState`).
- `scripts/audit/regression-baseline.mjs`, `scripts/audit/regression-check.mjs` · name · rejected-because
  they diff audit findings, not pixels.

## reuse-candidates: story-regression.spec

- none in `scripts/__tests__/` covers a capture-vs-capture comparison · new spec for the new script.

## reuse-candidates: svg-assets

- `src/utils/svg-sanitizer.ts` · functional (parses SVG) · **reused** for sanitizing; the cache and the
  import map are a new concern.
- `src/components/mud-icon/mud-icon.providers.ts`, `src/components/mud-logo/mud-logo.providers.ts` ·
  functional (cache + dedupe + evict-on-failure) · merged into the loader and deleted (Tasks 3-4): two
  copies of the same cache become one.

## reuse-candidates: svg-assets.spec

- the two providers' cache cases in `mud-icon.spec.tsx` / `mud-logo.spec.tsx` · functional · moved here.

## reuse-candidates: build-asset-modules

- `scripts/icons/build-registry.mjs` · functional (scans the same icon folders) · extend rejected-because
  it emits the manifest and `icon-names.ts` with a `--check` contract its own spec pins; the new script
  reads the same folders plus logos and flags and writes a different output tree. It reuses
  `scripts/lib/is-entrypoint.mjs` and mirrors the registry's `--check`, committed-output and safe-name rules.
- `scripts/flags/sync-flags.mjs` · functional (SVGO over flags) · rejected-because it vendors upstream
  files into `assets/flags/`; the generator consumes its output.

## reuse-candidates: svgo.asset-modules

- `svgo.config.flags.js`, `svgo.config.icons.fill.js`, `svgo.config.icons.size.js` · name · rejected-because
  each rewrites source files in place with geometry plugins; the module build must not change geometry
  and adds per-asset `prefixIds` and the root marker.

## reuse-candidates: build-asset-modules.spec

- none · new spec for the new script.

## reuse-candidates: check-asset-delivery

- `scripts/validate-package.mjs` · functional (packed-file checks) · **extended** for the core tarball
  and **exports the shared `isPublishedSvg` predicate** the new script imports; the new script covers
  the four adapter tarballs, the source tree and the docs, which `validate.package` does not read.

## reuse-candidates: check-asset-delivery.spec

- none · new spec for the new script.

## reuse-candidates: fixture-coverage.spec

- `scripts/__tests__/consumer-fixture.spec.mjs` · path · rejected-because it unit-tests the runner's
  helpers; title coverage of the e2e files is a separate check.

## reuse-candidates: package

- `packages/react/package.json` `postinstall` · functional (current hook installer) · rejected-because
  that package will be published; the private `tooling/hooks` workspace keeps the same installer
  (`scripts/git/install-hooks.mjs`, unchanged) out of every published manifest.

## reuse-candidates: fixture

- `packages/vue/fixture/`, `packages/angular/fixture/` and `scripts/adapters/consumer-fixture.mjs` ·
  functional · **extended**: the React and web-components fixtures copy their layout and register as
  `FRAMEWORKS` entries of the existing runner.

## reuse-candidates: asset-delivery

- `changes/README.md` fragment format · **reused** as specified.

## Self-refute log

| # | Question | Instance found, and where it is fixed — or what was scanned |
| --- | --- | --- |
| 1 | Does the fix reuse the defect's own mechanism class? | The defect is a manual step a consumer must remember. No fix relies on anyone remembering: the generated modules are committed and checked by `--check` inside `yarn test:scripts` (Task 2), zero-config is enforced by fixtures that contain no asset setup (Task 11), and `fixture-coverage.spec.mjs` proves the required tests exist (Task 11). The baseline's untouched-tree precondition is a command (Task 0 step 5), not a promise. |
| 2 | Can a rule's letter be met with its intent violated? | (a) A visual tolerance as a ratio of the capture would let a wrong flag pass in a large grid story — fixed by an absolute budget smaller than one flag box (Task 0 step 6, row 14). (b) Negative greps in markdown cells pass on a grep error and turn `\|` literal — moved into `check-asset-delivery.mjs` with exit 2 on I/O errors and positive controls (rows 15-17). (c) A side-effect guard served unbundled never reads `sideEffects` — the guard page is Vite-built (Task 11 test 7). (d) "Not bundled" cannot hold for the lazy loader, whose registry names every tag — the web-components fixture asserts "never requested" instead (test 4). (e) A flag fill rule keyed on "empty" passes first-render specs while reused boxes show the old flag — the rule keys on the marker and the specs change country and filter (Task 5). |
| 3 | Has every numeric target a denominator, a minimum n, and an instrument outside what it grades? | Row 14: 279 differing pixels per `mud-phone-input` story, derived from the flag box (20×14 = 280), n = every story in `storybook-static/index.json`, instrument = pixelmatch over captures, independent of the code under change; the largest phone-input capture is measured in Task 0 step 6. Map-size and chunk numbers in the spec come from the spike, outside this plan's code. |
| 4 | Do two of the plan's own rules interact into an unintended pass? | (a) "Never touch generated readmes" × JSDoc changes: stage the regenerated readme by name (Global Constraints). (b) "One commit per task" × the pre-commit `yarn typecheck`: the generator's index files import the loader's type, so the loader is Task 1 and the generator Task 2. (c) "Dispatched legs run no writing git" × Task 9's restore path: the controller restores (Global Constraints). (d) "`prepare` forbidden on published manifests" × the web-components adapter's `prepare: yarn build`: adapters forbid only install-time scripts (Task 7). |

## Deviations

- Spec decision 3 (seeding) is dropped and the generated modules are committed instead of git-ignored —
  both decided by Dan on 2026-10-02 after the critique round (`## Decision`; spec `## Revisions after review`).
- The `mud-checkbox` tick and dash stay inline (consequence of dropping seeding; `## Decision`).
- The hook installer moves to a private `tooling/hooks` workspace, not to the repo root as the spec's
  adapter table says: the root manifest is the published core, and `git-hooks.spec.mjs` forbids an
  install script there because `npm publish` would send it to every consumer.
- The spec's per-size icon drawings ("cycle 2") are dropped: the only glyphs that could have needed
  them stay inline.

(filled further during implementation)

## Not verified

- Next.js / SSR, Storybook as a consumer application, webpack in a real application, and consumer
  test runners (Vitest/Jest inside an application). The fixtures cover Vite (React 18/19, Vue,
  web-components), Angular CLI 20/22, plain HTML on a deep subpath, an import map and a bundled
  side-effect-only import; webpack was covered by the throwaway spike only.
- The request waterfall an unseeded icon adds on a component's first appearance: not measured (Dan
  chose to drop seeding without it; it can be measured on the web-components fixture's network log).
- PWA precaching: documented, not tested.
- Whether `dist/cjs` and `dist/collection` have consumers: recorded by Task 6, not acted on.
