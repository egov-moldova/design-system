# Angular and Vue adapters for `@egov-moldova/mud`

**Execution**: workflow — `2026-09-30-angular-vue-adapters.workflow.mjs` (generated from this plan by tools/plan-to-workflow.mjs; regenerate, never edit)
**Reviewed:** preflight 335a20e3, critic 56c07731, critic 88abaf94 — the 3-round cap ended the loop on 2026-10-01 with round 3's findings folded in below without a further round; Dan's go to implement, 2026-10-01.

## Goal

Two new workspace packages — `@egov-moldova/mud-angular` and `@egov-moldova/mud-vue` — whose
built output a real Angular or Vue application installs from a packed tarball and uses: typed
wrapper components, form binding (`ngModel` / `formControl` / `v-model`) on every form control,
and resolved component assets. Proven by consumer fixture apps built with each framework's own
toolchain and driven in a browser, in CI.

## Problem

Angular and Vue consumers today get raw custom elements only. They must configure
`CUSTOM_ELEMENTS_SCHEMA` or `isCustomElement` themselves, get no typed inputs or outputs in
templates, cannot bind any `mud-*` form control to `ngModel`, `formControl` or `v-model`, and
must find out on their own that `mud-icon` and `mud-logo` need an asset path (README
§ framework notes).

## Acceptance bar

Zero tolerance:

- a committed generated proxy file;
- a shim folder at the repo root;
- a `workspace:` specifier in any packed manifest;
- a change to the core's published `exports`, `files` or version (the one additive type
  re-export in Phase 0 is the owner-approved exception, 2026-10-01: it changes neither);
- a console error in a fixture run;
- a second runtime in a fixture build: any module in the fixture's bundle graph that resolves
  under `@egov-moldova/mud/loader`, `@egov-moldova/mud/dist/esm`, `@egov-moldova/mud/dist/cjs`
  or `@egov-moldova/mud/dist/mud` (Vite `build.manifest`, `ng build --stats-json`). Neither a
  double `customElements.define` nor a network request can be relied on: every Stencil define is
  guarded by `customElements.get`, the lazy runtime skips tags already defined so it may request
  nothing, and bundlers rename its chunks.

Must pass:

| Check | Bar |
|---|---|
| Vue fixture (Vue 3 at its `fixture/versions.json` pin) | PASS on the common fixture checks below, all through `v-model` |
| Angular fixture at 20 (zone.js) and at 22 (zoneless) | PASS on the common fixture checks below, through `ngModel`, plus `formControl` on select, a cleared numeric-input yielding a `null` model, a phone-input country switch updating the model, and a bare boolean attribute compiling under `strictTemplates` with `inlineProperties: true` |
| Proxy, shim and manifest guard in the runner | FAIL on any tracked file under the React, Vue or Angular proxy output directory (the list read from the shared `scripts/adapters/` module, not retyped), a root `components/` directory, or a `workspace:` specifier in the `package.json` of any tarball the runner packed (read from the tarball, not from the source tree) |
| Typed wrappers, Vue and Angular | each fixture typechecks with its framework's own checker (`vue-tsc --noEmit`, `ng build` under `strictTemplates`), AND the runner's negative case (one input bound to a wrongly typed value) fails with exactly the type-mismatch diagnostic at that binding (TS2322, or Angular's template type error naming the input). Any other failure is a runner error, not a pass |
| `yarn check.verify`, `yarn validate.package`, `yarn test:scripts`, `yarn docs:check` | green |
| CI `Adapters` job | green on the PR |

Common fixture checks:

- Upgrade: a shadow root is present.
- Model binding both ways, once per distinct model shape: string on `mudInput` (text-input),
  string on `mudChange` (date-input, whose model must stay unchanged after a partial keystroke),
  number (numeric-input, including a value typed past `max` that the component clamps on blur:
  the model holds the clamped value), boolean (checkbox), select (select), string array
  (input-chip), file array (file-input, through Playwright `setInputFiles` on its inner input,
  after the form initialised it with `null`).
- Tokens: the README's documented imports, `@egov-moldova/mud/tokens/core.tokens.css` and
  `@egov-moldova/mud/styles.css`, resolve. Proven by a named semantic `--color-*` token read with
  `getComputedStyle` on a rendered `mud-*` host. `styles.css` alone defines no token.
- Assets: through the documented per-framework asset step (Phases 3 and 4), the shadow roots of
  `mud-icon` and `mud-logo` each contain an `<svg>`. "No 404" alone is not the check: with no
  asset path set, `mud-icon` makes no request at all.

Every row of the form-control model map has an accessor (Angular) or a component model (Vue):
17 of 17 components listed there. The fixtures drive one component per model shape, so the
other ten rows are configuration only. Their instrument is
`scripts/__tests__/adapter-form-models.spec.mjs` (Phase 3): it reads the one shared model map and
fails on any row whose property or event `.storybook/custom-elements.json` does not declare
for that tag, on any manifest emitter that is neither a row nor a stated exclusion, or on any
count other than 17.

## Spec / issue

egov-moldova/design-system#178 (no body; scope agreed with the owner in chat, 2026-09-30).

## Branch and base

`danzubco/create-angular-and-vue-adapters`, built on `upstream/main` (77eca9e3) with the two open
PRs merged in number order: #177 (Storybook docs source), then #179 (ops config). The PR for this
plan therefore merges after both; until they land its diff carries their commits.

## Current state (measured 2026-09-30)

- The core builds the runtime a wrapper needs: `dist-custom-elements` with
  `externalRuntime: false` in every non-dev build (`stencil.config.ts`), exported as
  `./components` and `./components/mud-*.js` (`package.json` `exports`). It does NOT export the
  types the Angular and Vue generators import from `@egov-moldova/mud/components`: `Components`,
  `JSX`, the `Mud*CustomEvent` interfaces and the event-detail types. `dist/components/index.d.ts`
  re-exports only `src/index.ts`, which carries none of them (a `tsc` probe returns TS2305 for
  `Components` and `JSX`). Stencil's generated `components.d.ts` already exports all of them, so
  Phase 0 adds `export type * from './components';` to `src/index.ts`, the Stencil starter's own
  convention (owner decision, 2026-10-01). `exports`, `files` and version do not change.
- `react/` is private, unpublished, builds with `tsc || true`, and gets its proxies only from
  `yarn build.react`, which runs a second full Stencil build. The proxies are git-ignored.
- Release pipelines (Azure, `.github/workflows/cd.yml`) publish only the core.
- Angular and Vue adapters existed before and were removed in 6e557bf5 (2026-05-17). Their
  carrying costs, per `.claude/plans/_archive/remove-react-vue-angular-adapters-implementation-plan.prompt.md`:
  committed generated proxies conflicting across worktrees, extra CI steps, and a root
  `components/` shim folder because ng-packagr 18 (`moduleResolution: node`) did not resolve
  `exports` subpaths.
- A root-level directory named like an npm package shadows that package for Vite's bare-specifier
  resolution (`.claude/plans/2026-09-11-issue-23-storybook-lane-react-shadowing.md`, measured on
  `react/`). A root `vue/` directory would repeat it for `vue`.
- Pinned tool versions, read from npm on 2026-09-30: `@stencil/angular-output-target` 1.5.0,
  `@stencil/vue-output-target` 0.14.3 (still 0.x), Angular 22.2.0 latest with 20 and 21 in LTS
  (v20 LTS ends ~2026-11-28), ng-packagr 20.3.x needs TypeScript `>=5.8 <6.0` (repo: 5.9.3) and
  Node `>=24` is supported.

### Inbound set of the moved paths (measured 2026-09-30 at 2c6b3d85)

Operative references to `react/` and `web-components/` outside the historical records, per file:

```derived
$ git grep -n -E "(^|[^a-z@/-])(react|web-components)/" | grep -v -E '^(CHANGELOG\.md|\.claude/plans/|docs/backlog/|docs/screenshots/)' | cut -d: -f1 | sort | uniq -c
   1 _agents/verification-git.md
   2 .claude/agents/integration-checker.md
   4 .prettierignore
   4 .storybook/vitest.setup.ts
   8 CONTRIBUTING.md
   2 Dockerfile
   1 INTEGRATION.md
   7 package.json
   5 react/README.md
   4 scripts/__tests__/check-content-language.spec.mjs
   1 scripts/__tests__/git-hooks.spec.mjs
   8 scripts/__tests__/validate-package.spec.mjs
   5 scripts/audit/07-integration-usage.mjs
   3 scripts/check-content-language.mjs
   2 scripts/check-dev-all.mjs
   1 scripts/git/install-hooks.mjs
   1 STACK.md
   2 stencil.config.ts
   4 vitest.config.mts
```

That grep does not see the bare workspace names (`package.json` `workspaces: ["web-components",
"react"]`, the wireit globs without a trailing match) — those sit in `package.json`, already
listed. Nor does it see paths inside the moved trees that climb to the repo root, which break
one level deeper:

```derived
$ git grep -n -E "\.\./|\"directory\"" -- react web-components ':!**/demo/manifest.ts'
react/package.json:21:    "postinstall": "node ../scripts/git/install-hooks.mjs",
web-components/README.md:31:`styles.css` also loads the Onest font (`assets/fonts/onest-variable.woff2`, next to it in the package) — do not declare an `@font-face` of your own. Vite, webpack and Angular CLI emit the font automatically; esbuild used directly needs `--loader:.woff2=file`. See the root README's [Fonts](../README.md#fonts) section.
web-components/README.md:93:Every component published by `@egov-moldova/mud` is registered. The full list is browseable in [Storybook](../.storybook/). Highlights include:
web-components/demo/vite.config.ts:6:const DESIGN_SYSTEM_DIST = resolve(__dirname, '../../dist/mud');
web-components/demo/vite.config.ts:7:const GENERATED_TOKENS = resolve(__dirname, '../../tokens/generated');
web-components/demo/vite.config.ts:123:      allow: [resolve(__dirname, '..'), resolve(__dirname, '../..')],
web-components/package.json:40:    "directory": "web-components"
```

(`demo/manifest.ts` is excluded: its `../../` is a URL relative to the demo's own pages.)
`scripts/__tests__/audit/07-integration-usage.spec.mjs:45` names `'web-components'` as a usage
category key, not a path, and stays. `.github/`, `.gitignore`, `tsconfig.json`, the ESLint and
Stylelint configs and `.storybook/main.ts` carry no workspace path.

### Form-control model map

A form control here is a component that emits `mudInput` or `mudChange` carrying its value.
Four emitters are excluded: `mud-radio`, whose value `mud-radio-group` owns; `mud-pagination`
and `mud-tabs`, which emit navigation and not a form value; and `mud-accordion`, which emits its
open item ids (disclosure state). `formAssociated` is not the rule: `mud-button` and
`mud-service-button` are form-associated without holding a value, and `mud-radio-group`,
`mud-date-picker`, `mud-time-picker` and `mud-menu` hold one without being form-associated.
`mud-menu` holds a value only with `type="selection"`, where it sets `value` and then emits
`mudChange` (`mud-menu.tsx:71-74`); it is row 17 (owner decision, 2026-10-01).

The set is read from the manifest the spec reads, not from a grep: a grep misses
`@Event({ eventName: 'mudChange' })` and depends on the host's regex dialect.

```derived
$ node -e 'const m=require("./.storybook/custom-elements.json");const s=new Set();for(const mod of m.modules)for(const d of mod.declarations||[])for(const e of d.events||[])if(/^mud(Change|Input)$/.test(e.name))s.add(d.tagName);console.log([...s].sort().join(" "));console.log(s.size)'
mud-accordion mud-checkbox mud-date-input mud-date-picker mud-file-input mud-input-chip mud-menu mud-numeric-input mud-pagination mud-phone-input mud-radio mud-radio-group mud-search-input mud-segmented-control mud-select mud-switch mud-tabs mud-text-input mud-textarea mud-time-input mud-time-picker
21
```

21 emitters minus 4 excluded = 17 rows (manifest built 2026-10-01 from 56c07731's sources). A new
emitter changes this set, and `adapter-form-models.spec.mjs` compares the map against it
(Phase 3).

All 17 controls below set their model property before they emit, so reading
`event.target[prop]` is correct, with one exception: `mud-numeric-input` sets `value` to
`undefined` on clear and on an empty or ambiguous entry (`mud-numeric-input.tsx:716-727,771-773`),
which the generated `number` accessor turns into `NaN` (`parseFloat(undefined)`). Its accessor
is therefore hand-written and maps `undefined`, `null` and `''` to `null`.

Writing before emitting is not the whole contract: a model also goes stale when a component
writes its property on a path that emits a DIFFERENT event. Two such paths exist, and the map's
Event column lists every event that follows a user-driven write:

- `mud-numeric-input` clamps and rounds on commit, writes `value` and emits only `mudChange`
  (`mud-numeric-input.tsx:798-822`).
- `mud-phone-input`'s country switch rewrites `value` to a new E.164 number and emits only
  `mudCountryChange` (`mud-phone-input.tsx:693`).

Angular listens to every listed event. Vue's generator binds ONE event per model
(`@stencil/vue-output-target@0.14.3 dist/index.js:174`), so Vue binds numeric-input on
`mudChange` (its model updates on commit, like date-input; owner decision, 2026-10-01) and
phone-input on `mudInput`, leaving the country switch as a recorded Vue limitation (Not verified).

Value holders that emit under another name are dispositioned too, so the definition above cannot
silently miss a control: the spec lists every tag whose manifest declares a `value`, `checked`
or `selected` member and is neither a row nor an exclusion, and fails until each one is stated
as a row or an exclusion with a reason (for example `mud-chip`, a `selected` toggle emitting
`mudSelect`).

`date-input` and `time-input` bind on `mudChange`, not `mudInput`. Their `mudInput` carries the
partially masked text while the user types (`mud-date-input.tsx:948-951`), which is not a value a
form model should hold. They use the `select` accessor type, not `text`: the Angular generator
merges every `valueAccessorConfigs` row of one `type` into ONE directive that listens to all of
that type's events on all of its selectors
(`@stencil/angular-output-target@1.5.0 dist/generate-value-accessors.js:12-28`). As `text` rows
they would hear the `mudInput` of the text row. Every `select` row binds `mudChange`. So the
Angular type is DERIVED from the row's property and events, never stored beside them, and the
spec asserts that every generated type binds one event set. A row cannot be typed into the wrong
merge.

The same merge rules out the obvious derivation of one config per row: the generator appends one
host entry per config (`generate-value-accessors.js:25`), so eight `select` rows would write
`'(mudChange)'` eight times and fail with TS1117 (duplicate property). The derivation groups rows
by (Angular type, event, property) into ONE config whose `elementSelectors` lists every tag.

| Model | Events (Angular) | Event (Vue) | Components | Angular accessor |
|---|---|---|---|---|
| `value` (string) | `mudInput` | `mudInput` | text-input, textarea, search-input | `text` |
| `value` (string) | `mudInput`, `mudCountryChange` | `mudInput` | phone-input (E.164 on each keystroke and on a country switch) | `text`, plus one `text` config for `mudCountryChange` on phone-input alone |
| `value` (number) | `mudInput`, `mudChange` | `mudChange` | numeric-input | hand-written (`undefined`/`null`/`''` → `null`) |
| `checked` | `mudChange` | `mudChange` | checkbox, switch | `boolean` |
| `value` | `mudChange` | `mudChange` | select, radio-group, segmented-control, date-picker (`string \| string[]` in range mode, passed through as-is), time-picker, date-input, time-input, menu (`type="selection"`) | `select` |
| `chips` (string[]) | `mudChange` | `mudChange` | input-chip | hand-written (`null`/`undefined` → `[]`) |
| `files` (File[]) | `mudChange` | `mudChange` | file-input | hand-written (`null`/`undefined` → `[]`: Angular calls `writeValue(null)` on setup and on `reset()`, and `mud-file-input.tsx:830` reads `this.files.length` unguarded) |

The generated Angular accessors always write `.value` (or `.checked` for `boolean`)
(`angular-output-target/resources/control-value-accessors/value-accessor.ts:14`). That is why
`chips` and `files` need their own accessors. Vue's `componentModels` are per component, read and
write the same `targetAttr`, and carry no type merging, so the whole table maps directly, with
numeric-input's `undefined` passed through as Vue's empty model.

## Options

| Decision | Options | Taken |
|---|---|---|
| Angular support | `^20 \|\| ^21 \|\| ^22` built with 20 · `^21 \|\| ^22` built with 21 | `^20 \|\| ^21 \|\| ^22`, compiled with Angular 20 in partial mode (owner, 2026-09-30) |
| Proxy generation | Every non-dev `yarn build` generates React, Angular and Vue proxies, and each adapter build depends on it · one flag and one full Stencil build per adapter (the React pattern) | One build (owner, 2026-09-30) |
| Publish status | Publishable, no CD change · private like React · publishable plus a CD step | Private like React (owner, 2026-09-30) |
| Consumption proof | Fixture apps in CI · typecheck and build only | Fixture apps in CI (owner, 2026-09-30) |
| Workspace location | `packages/` for the two new ones only · root `angular/` + `vue/` with a Vitest alias for `vue` · all four adapters in `packages/` | All four in `packages/` (owner, 2026-09-30): one convention. A root `vue/` would repeat #23. Moving `react/` removes #23's root cause, and moving `web-components/` completes the move #23 deferred. |
| Angular output type | `standalone` · `scam` · `component` (lazy loader) | `standalone` with `esModules: true`: the target's default, tree-shakable, and built on `dist-custom-elements` |
| Vue registration | `includeImportCustomElements` (standalone bundle) · lazy loader | Standalone bundle with `esModules: true`. Never both runtimes: the React adapter mixes them, which is a defect (#180). |

## Global constraints

- Everything authored is English. Conventional commits, one commit per phase, staged by explicit
  path. No AI attribution anywhere.
- Generated proxies are git-ignored and never committed (the lesson of 6e557bf5).
- No shim folders at the repo root: resolution goes through the core's `exports` map.
- The core's published `package.json` `exports`, `files` and version stay unchanged.
  `yarn validate.package` stays green. The core changes are Phase 0's additive type
  re-export in `src/index.ts` and one guard in `mud-file-input` that treats a `null` or
  `undefined` `files` as `[]` (owner decision, 2026-10-01, after the verify round: Vue's generator
  cannot convert a `null` model, and `mud-file-input.tsx:830` read `files.length` unguarded). The
  guard ships with a spec case, and the Vue fixture then initialises file-input with `null` as the
  bar states. No other core source changes.
- No adapter build masks a type error: no `|| true`, no `skipLibCheck` or `@ts-nocheck` over the
  generated proxies. The adapter build is what proves every generated type import resolves.
- The move of `react/` and `web-components/` changes paths only. The package names, manifests
  and behaviour stay as they are; their defects are #180's, not this plan's.
- Both new packages are `private: true`. No change to `cd.yml` or the release pipelines.
- Node through `fnm exec --using=24 --` (the repo pins 24).
- `@stencil/vue-output-target` is pinned with `~`, because it is 0.x.
- Fixture apps live outside the Yarn workspaces and install tarballs, never workspace links, so
  a packaging defect cannot hide behind a symlink.

## Execution matrix

| Phase | Model | Effort | Wave | Notes |
| --- | --- | --- | --- | --- |
| 0 Core type export + proxy compile spike | Opus 5.5 | medium | A | first: settles the go/no-go facts before anything is moved |
| 1 Move adapters into `packages/` | Sonnet 5.5 | high | B | depends on 0; every path consumer moves in the same phase (one contract) |
| 2 Unified proxy build | Sonnet 5.5 | high | C | depends on 1 (new React path; shared `stencil.config.ts`, `package.json`) |
| 3 Vue adapter + fixture runner | Sonnet 5.5 | high | D | depends on 2 (shared `stencil.config.ts`, `package.json`) |
| 4 Angular adapter | Opus 5.5 | medium | E | depends on 3 (the fixture runner it extends; the same shared files) |
| 5 CI, Docker, docs | Sonnet 5.5 | high | F | depends on 3 and 4 (documents and wires what they built) |

Dispatch verdict: dispatch. Every phase passes the brief-test: each is self-contained against
this plan, with its own acceptance commands.

Routing rationale: the architectural decisions are made in this plan, so phases 1, 2, 3 and 5
execute a stated design at the implementer tier. Phases 0 and 4 carry the open technical risks:
the ng-packagr resolution that needed the old shim, `inlineProperties` being experimental, the
generated type imports, the hand-written accessors, and the `workspace:` specifier in
ng-packagr's `dist/` manifest. So they run one tier up, at medium effort. Phase 0 measures those
risks in a scratch directory before Phase 1 moves anything. The final gate review runs in the
controlling session. Escalation: a phase that fails its acceptance twice restarts one tier up
with fresh context. Phases run sequentially: each wave holds one phase, because phases 0–4 share
`stencil.config.ts`, `src/index.ts`'s build output and the root `package.json`.

## Phases

### Phase 0: Core type export and proxy compile spike

**Executor**: Opus 5.5 · medium · Wave A · implementer

Files: `src/index.ts` (one line). The spike writes only under the session scratchpad and is
never committed.

- [ ] Add `export type * from './components';` to `src/index.ts`, with a one-line comment that
      the Angular and Vue proxy generators import `Components`, `JSX`, the `Mud*CustomEvent`
      interfaces and the event-detail types from `@egov-moldova/mud/components`. If a name
      collides with an explicit export already in `src/index.ts`, keep the explicit one and report
      the collision.
- [ ] Spike, in the scratchpad, against a packed core tarball built from this commit:
  - generate the Vue and Angular proxies with the pinned output targets (a scratch copy of
    `stencil.config.ts` carrying only those two targets, `customElementsDir: 'components'`, and
    `inlineProperties: true` for Angular);
  - `tsc --noEmit` the Vue proxies under `moduleResolution: bundler`, with no `skipLibCheck`.
    The runtime's types import the optional peer `vue-router`
    (`@stencil/vue-output-target@0.14.3 dist/types.d.ts:2`), so the spike installs it for types,
    as Phase 3 will;
  - build a minimal ng-packagr 20 library in partial mode that imports two generated Angular
    components through `@egov-moldova/mud/components/mud-*.js`, with no shim, and record how
    ng-packagr treats the core as a dependency (peer, or `allowedNonPeerDependencies`);
  - pack that library, grep its packed `package.json` for `workspace:`, and `ng build` it from a
    throwaway Angular 22 app (zoneless, `strictTemplates`) that binds one input to a wrongly
    typed value: the build must fail with the type-mismatch diagnostic, and pass once corrected.
    Partial compilation defers template checking to the consumer, so the library build alone
    proves nothing about `inlineProperties`.
- [ ] Report each spike result with its command and exit status. STOP and report if the Angular
      library cannot resolve the `exports` subpaths without a shim, or if `inlineProperties: true`
      does not give typed inputs in the Angular 22 consumer: those are the two facts Phase 4
      cannot work around.
- Verify: `yarn build`, `yarn validate.package`, `yarn typecheck` and `yarn test` are green; a
  scratch file `import type { Components, JSX, MudMenuCustomEvent } from '@egov-moldova/mud/components'`
  passes `tsc --noEmit` against the packed core (it fails with TS2305 before this phase); the
  spike commands exit as stated.

### Phase 1: Move `react/` and `web-components/` into `packages/`

**Executor**: Sonnet 5.5 · high · Wave B · implementer (after Phase 0)

Files:
- the two workspace trees, moved with a plain `mv`; the controller stages the move;
- root `package.json` (`workspaces`, wireit `files`/`output`, `build.react`);
- `yarn.lock` (workspace path entries only);
- `stencil.config.ts` (React `outDir`, comments);
- `Dockerfile` (the two `COPY` lines);
- `.prettierignore`;
- `vitest.config.mts` and `.storybook/vitest.setup.ts`;
- `scripts/audit/07-integration-usage.mjs`, `scripts/check-content-language.mjs`,
  `scripts/check-dev-all.mjs` and `scripts/git/install-hooks.mjs`;
- `scripts/__tests__/{git-hooks,validate-package,check-content-language}.spec.mjs`;
- `.claude/agents/integration-checker.md`, `CONTRIBUTING.md`, `STACK.md` and `INTEGRATION.md`;
- inside the moved trees: `packages/react/package.json` (`postinstall`),
  `packages/react/README.md`, `packages/web-components/package.json` (`repository.directory`),
  `packages/web-components/README.md` (relative links) and
  `packages/web-components/demo/vite.config.ts` (root-relative `resolve` calls).

The inbound set is the two `derived` fences under Current state. Re-run both commands after the
move: the first returns only historical records, and the second shows every climb one level
deeper (`../../scripts/...`, `../../../dist/mud`, `"directory": "packages/web-components"`).

- [ ] Move both trees. Rewrite every operative path, including each relative path inside the
      moved packages that climbs to the repo root (`../scripts/...` becomes `../../scripts/...`).
      Historical records stay as written: `CHANGELOG.md`, `.claude/plans/**`, `docs/backlog/**`,
      `docs/screenshots/**`, and the history note in `_agents/verification-git.md`.
- [ ] Three silent failure modes, each verified rather than assumed:
  - the wireit `files`/`output` globs: a wrong glob is a cache miss, never an error;
  - `07-integration-usage.mjs`: its scan globs and the `web-components/` category prefix at
    `:227`;
  - `install-hooks.mjs`: it resolves `.husky` and `.git` from the workspace's cwd, which is
    now one level deeper.
- [ ] `scripts/__tests__/git-hooks.spec.mjs:127` asserts `workspaces.includes('react')` and `:130`
      the exact `node ../scripts/git/install-hooks.mjs` string. Rewrite both to the new shape
      (the workspace entry and `../../scripts/...`).
- [ ] Remove the Vitest `react` alias that #23 added (`vitest.config.mts:173-202`) and its note
      in `.storybook/vitest.setup.ts`: moving `react/` removes the cause #23 measured (its E2
      experiment). If the storybook lane goes red without the alias, keep the alias and report.
- Verify:
  - `yarn install` changes only workspace path entries in `yarn.lock`, and the hooks install
    (`.husky` resolved);
  - `yarn build`, `yarn build.react`, `yarn build.web`, `yarn demo.web.build`,
    `yarn test:scripts`, `yarn lint` and `yarn test` are green;
  - `yarn audit:integration` still counts `web-components` usage (non-zero);
  - `yarn test.storybook` is green;
  - the enumeration grep returns only historical records.

### Phase 2: Unified proxy build

**Executor**: Sonnet 5.5 · high · Wave C · implementer (after Phase 1)

Files: `stencil.config.ts`, root `package.json` (scripts, wireit), `scripts/__tests__/validate-package.spec.mjs`, `.prettierignore`, `packages/react/README.md` (it documents `stencil build --docs --react`, which this phase removes), `packages/react/.gitignore` and `packages/react/src/components/stencil-generated/.gitkeep` (deleted), `scripts/adapters/proxy-dirs.*` (new).

- [ ] The React output target runs in every non-dev build, as `dist-custom-elements` already
      does, instead of only under `--react`. Remove the `--react` flag branch.
- [ ] Delete the tracked `packages/react/src/components/stencil-generated/.gitkeep` and its `!`
      negation in `packages/react/.gitignore`: the output target creates the directory, and the
      runner's guard fails on any tracked file under a proxy directory.
- [ ] The proxy output directories live in ONE module under `scripts/adapters/` (React here; Vue
      and Angular added by Phases 3 and 4). `stencil.config.ts` reads each `outDir` from it, the
      runner's guard reads its list from it, and a `validate-package.spec.mjs` case asserts that
      the wireit `build` `output`, the `.gitignore` files and `.prettierignore` each carry every
      directory. The build empties each proxy directory before Stencil writes it (`clean` is
      `false` on the root build, so a renamed component would otherwise leave a stale proxy).
- [ ] The wireit `build` entry declares the generated proxy directory as output.
      `build.react` becomes a wireit entry depending on `build` and runs only the workspace
      build. No second Stencil build.
- [ ] Keep the existing comments' invariants: the paired `customElementsDir` and
      `externalRuntime: false`, and the spec that asserts `customElementsDir` agrees with the
      exports key.
- Verify: `yarn build` leaves `packages/react/src/components/stencil-generated/` populated;
  `yarn build.react` runs no `stencil build`; `yarn validate.package`, `yarn test:scripts` and
  `yarn lint` are green.

### Phase 3: Vue adapter and the consumer-fixture runner

**Executor**: Sonnet 5.5 · high · Wave D · implementer (after Phase 2)

Files: `packages/vue/**`, `stencil.config.ts` (Vue target), root `package.json` (workspace, devDeps, `build.vue`, wireit `build` and `typecheck` files and output), `scripts/adapters/**`, `yarn.lock`, `.prettierignore`, `.gitignore` (proxy output), `Dockerfile` (the `packages/vue` manifest `COPY`, in the same commit as the workspace, so every commit's immutable install passes), `scripts/__tests__/validate-package.spec.mjs`, `scripts/__tests__/adapter-form-models.spec.mjs`.

- [ ] The form-control model map lives in ONE module under `scripts/adapters/` that
      `stencil.config.ts` imports. The Vue `componentModels` here and the Angular
      `valueAccessorConfigs` in Phase 4 are both derived from it, never typed twice. Its rows
      carry the four exclusions with their reasons, so the spec reads them from the same module.
      Write it as `.ts` with erasable syntax only: Stencil's config loader transpiles relative
      `.ts` imports, and Node 24 imports it natively in the `node --test` spec, so no hand-written
      declaration is needed (an `.mjs` would need one, as `stencil-postcss.config.d.mts` shows).
      `scripts/__tests__/adapter-form-models.spec.mjs` checks it against
      `.storybook/custom-elements.json`, as the acceptance bar states, and goes red when one
      row's event is renamed. It also derives the emitter set from that manifest (tags declaring
      a `mudInput` or `mudChange` event) and fails when that set, minus the four exclusions,
      differs from the map's tags.
- [ ] Wireit: add `scripts/adapters/**` to the `files` of `build` and `typecheck` (and of `test`
      if the spec lane loads `stencil.config.ts`), and the Vue proxy directory to `build`
      `output` through the shared proxy-directory module. Without the first, a map edit is a
      cache hit that restores stale `componentModels`.
- [ ] One `@stencil/vue-output-target` range: the root devDependency (the generator) and the
      `packages/vue` dependency (its `/runtime`) are the same `~0.14.3`, and a
      `scripts/__tests__/validate-package.spec.mjs` case fails when they differ.

- [ ] `packages/vue`: `@egov-moldova/mud-vue`, `private: true`, peer `vue ^3.4.38`, dependency
      `@stencil/vue-output-target` `~0.14.3` (for its `/runtime`), core as `workspace:^`, and
      `vue-router` as a devDependency for the runtime's types (README: a consumer type-checking
      libraries without `skipLibCheck` needs it too). Built with `tsc` to `dist/` (ESM +
      `.d.ts`). The proxies are git-ignored.
- [ ] The Vue output target: `includeImportCustomElements: true`, `esModules: true`,
      `customElementsDir: 'components'`, and `componentModels` from the model map above.
- [ ] A plugin exported as `Mud`, used as `app.use(Mud, { assetPath })`, that calls the
      standalone bundle's `setAssetPath`. `assetPath` is REQUIRED: React's default
      (`<origin>/node_modules/@egov-moldova/mud/dist/components/`) resolves only on a Vite dev
      server, so a default would leave the shortest call broken in every production build, and
      relaxing a required option later is non-breaking while the reverse is not. The documented
      consumer step: copy `node_modules/@egov-moldova/mud/dist/components/assets` into the app's
      served output (Vite `public/` or a copy plugin) and pass the matching `assetPath`. The
      fixture uses exactly that step. Wrapped components need no `isCustomElement`.
- [ ] `scripts/adapters/consumer-fixture.mjs <framework> [--framework-version <major>]`, which:
  1. packs the core and the adapter;
  2. fails if any packed manifest carries a `workspace:` specifier, if `git ls-files` lists
     anything under a proxy output directory from the shared module, or if a root `components/`
     directory exists;
  3. copies `packages/<framework>/fixture/` to a temp directory and installs the tarballs plus
     the fixture's pinned dependencies with `npm install --ignore-scripts` (dropped per package
     only if a pinned tool is shown to need its script, and that exception written beside the
     pin). The pins come from a per-major table in the fixture (`fixture/versions.json`, keyed by
     major: framework packages, CLI or build tool, `typescript`, `zone.js` where used, Playwright),
     and the runner fails on a major the table lacks. Angular 20.3 needs TypeScript `>=5.8 <6.0`
     and Angular 22 needs `>=6.0 <6.1`, so one pin set cannot serve both, and the fixture's
     tsconfig must be valid under both. Angular 20 runs with zone.js and Angular 22 zoneless,
     the default a new app of each major gets;
  4. typechecks and builds with the framework's own CLI (`vue-tsc --noEmit` then `vite build`
     with `build.manifest` for Vue; `ng build --stats-json` under `strictTemplates` for Angular),
     then fails if the bundle graph contains a second-runtime module (acceptance bar);
  5. compiles the fixture's negative case (one wrapper input bound to a wrongly typed value,
     kept outside the normal build) and passes only on the type-mismatch diagnostic at that
     binding; no failure, or any other failure, fails the run;
  6. installs the pinned Playwright's Chromium (`npx playwright install --with-deps chromium`),
     serves the build and runs the fixture's Playwright spec.
- [ ] Vue fixture (Vite + `@vitejs/plugin-vue`, Vue 3 at its pin). It imports
      `@egov-moldova/mud/tokens/core.tokens.css` and `@egov-moldova/mud/styles.css` the way the
      README tells consumers to: tokens stay the consumer's import and are not bundled into the
      adapter. Its spec asserts every item in the bar's common fixture checks through `v-model`,
      plus no console error.
- Verify: `yarn build.vue`, `yarn test:scripts` (which runs the manifest spec) and
  `node scripts/adapters/consumer-fixture.mjs vue` are green; the fixture spec goes red when the
  plugin's `setAssetPath` call is removed.

### Phase 4: Angular adapter

**Executor**: Opus 5.5 · medium · Wave E · implementer (after Phase 3: extends its runner)

Files: `packages/angular/**`, `stencil.config.ts` (Angular target), root `package.json` (workspace, devDeps, `build.angular`, wireit `build` output), `scripts/adapters/**`, `yarn.lock`, `.prettierignore`, `.gitignore` (proxy output), `Dockerfile` (the `packages/angular` manifest `COPY`), `scripts/__tests__/validate-package.spec.mjs`.

- [ ] The core is a peer dependency of `packages/angular` or an `allowedNonPeerDependencies`
      entry in `ng-package.json`, as Phase 0's spike measured. State the choice and how it
      settles the `workspace:` rewrite below.

- [ ] `packages/angular`: `@egov-moldova/mud-angular`, `private: true`, peers
      `@angular/core` and `@angular/forms` `^20.0.0 || ^21.0.0 || ^22.0.0`, built by ng-packagr
      with Angular 20.3.x devDependencies in partial compilation mode.
- [ ] Resolve `@egov-moldova/mud/components/mud-*.js` through the `exports` map using the
      library tsconfig's `moduleResolution: bundler`. No shim folder. If this cannot be made to
      work, STOP and report the measured failure — do not reintroduce the shim.
- [ ] The Angular output target: `outputType: 'standalone'`, `esModules: true`,
      `customElementsDir: 'components'`, `booleanAttributes: true`, `inlineProperties: true`, and
      `valueAccessorConfigs` from the model map. `inlineProperties` is required, not optional: the
      target's own docs (`dist/types.d.ts`, `booleanAttributes`) say that without it the wrappers
      declare no typed inputs, which would make the typed-wrapper bar and the bare-boolean check
      pass while measuring nothing. If it does not compile under `strictTemplates` at 20 or 22,
      STOP and report, as for the shim. `valueAccessorConfigs` follow the grouping rule beside
      the model map (one config per Angular type, event and property). Add the Angular proxy
      directory to the shared proxy-directory module.
- [ ] Hand-written standalone accessors for `mud-input-chip` (`chips`; `null`/`undefined` →
      `[]`), `mud-file-input` (`files`; `null`/`undefined` → `[]`) and `mud-numeric-input`
      (listening to `mudInput` and `mudChange`; `undefined`/`null`/`''` → `null`, and a `null`
      model written as `undefined`, not `''`).
- [ ] The public API exports every value accessor individually plus one `MUD_FORM_ACCESSORS`
      array of all of them. The standalone barrel exports the components alone, so
      `MudTextInput` with `[(ngModel)]` and no accessor throws "No value accessor" at runtime;
      the accessors are scoped by tag selector, so importing the one array once covers all 17
      controls. The fixture imports raw components plus `MUD_FORM_ACCESSORS`, the documented
      path.
- [ ] `provideMud({ assetPath })` as an environment provider that calls the standalone
      `setAssetPath`, with `assetPath` REQUIRED for the reason Phase 3 gives. The documented
      consumer step for assets is an `angular.json` `assets` glob from
      `node_modules/@egov-moldova/mud/dist/components/assets` with the matching `assetPath`. The
      fixture uses exactly that step.
- [ ] The ng-packagr `dist/` manifest carries no `workspace:` specifier. Decide the mechanism;
      the runner's check from Phase 3 is the acceptance test.
- [ ] Angular fixture (standalone app, `strictTemplates`), run at Angular 20 and 22 through
      `--framework-version`. Its spec asserts:
  - every item in the bar's common fixture checks through `[(ngModel)]`, with
    `tokens/core.tokens.css` and `styles.css` added in `angular.json` `styles`, plus the Vue
    fixture's console check;
  - a reactive `formControl` on `mud-select`;
  - clearing `mud-numeric-input` leaves the model `null`;
  - switching `mud-phone-input`'s country updates the model to the new E.164 value;
  - a bare boolean attribute (`<mud-button disabled>`) compiles.
- Verify: `yarn build.angular` is green, and
  `node scripts/adapters/consumer-fixture.mjs angular --framework-version 20` and `… 22` are
  green; the fixture spec goes red when `provideMud`'s `setAssetPath` call is removed.

### Phase 5: CI, Docker and documentation

**Executor**: Sonnet 5.5 · high · Wave F · implementer (after Phases 3 and 4)

Files: `.github/workflows/ci.yml`, `README.md`, `CONTRIBUTING.md`, `STACK.md`, `AGENTS.md`, `_agents/environment-commands.md`, `.claude/skills/mud-design/SKILL.md`, `changes/<fragment>.md`.

- [ ] CI job `Adapters`:
  1. `yarn tokens.build`;
  2. `yarn build`;
  3. `yarn build.vue`;
  4. `yarn build.angular`;
  5. the fixture runner for vue, angular@20 and angular@22 (the runner installs its pinned
     Chromium; cache the Playwright browser directory keyed by that pin).
- [ ] Docs:
  - README: Angular and Vue usage marked "not yet published", like React, each with the token
    imports, the required `assetPath` and the asset step the fixture uses (Phases 3 and 4), for
    Angular `MUD_FORM_ACCESSORS`, and for Vue the two binding notes (numeric-input updates its
    model on commit; a phone-input country switch does not reach `v-model`);
  - CONTRIBUTING: workspace table and local `file:` installs;
  - STACK: the workspaces and the versions, plus the output-target pins;
  - AGENTS build reference and `_agents/environment-commands.md`: the new commands;
  - the `mud-design` skill: import lines.
- [ ] A changelog fragment per `changes/README.md`.
- Verify: `yarn docs:check`, `yarn lint`, `yarn changelog.check` and
  `docker build --target builder .` are green (the last needs the local Docker daemon).

## Final verification (controlling session)

- `yarn check.verify` and the three fixture runs, from a clean checkout.
- A gate review of the whole diff before the PR leaves draft.

## Not verified (by design)

- Server-side rendering (Angular SSR, Nuxt). The core has no hydrate output target, so the
  adapters are client-only. This gets its own issue if needed.
- Transitive dependency drift in the fixtures: they install pinned direct dependencies without a
  lockfile, so a green run is not byte-reproducible, and unpinned transitive install scripts run
  in the CI job (bounded by the workflow's `permissions: contents: read`). Accepted trade-off:
  three lockfiles to refresh per framework release cost more than the drift while the packages
  are private. Revisit before publishing.
- Angular 21. Partial compilation built with 20 and tested on 20 and 22 brackets it; 21 itself is
  not run.
- Publishing. The packages stay private and the release pipelines are unchanged.
- Vue: a `mud-phone-input` country switch does not reach `v-model`, because the component emits
  only `mudCountryChange` there and Vue's generator binds one event per model. Recorded
  limitation, documented in the README; the fix belongs in the core (Found).

## Self-refute log

1. Does the fix reuse the defect's own mechanism class? No instance. The old adapters failed
   on committed proxies and a shim folder. Here both are refused by a mechanism (`git ls-files`
   and a directory check in the fixture runner), not by an author's promise, and the fixtures
   install packed tarballs so a workspace symlink cannot mask a packaging defect.
2. Can the letter be met with the intent violated? Instance: "17 of 17 rows have an accessor" (16 before round 2)
   is met by configuration entries alone, while the fixtures exercise only six of them. A row
   naming the wrong event passes. Fixed by the shared model map and its manifest spec (Phase 3,
   acceptance bar).
3. Does every numeric target have a denominator and an instrument outside what it grades?
   "17 of 17" had its denominator only in this plan's own table. The manifest spec is the
   outside instrument: Stencil writes the manifest from the decorators. Angular "20 and 22" is
   graded by the fixture runner's `--framework-version`, outside the adapter build.
4. Do two rules interact into an unintended pass? Scanned: tarball-only installs × the
   `workspace:` check (ng-packagr's `dist/` manifest is the one packed, so the check sees it);
   "core `files` unchanged" × three new output targets (they write under `packages/`, outside
   `dist/`, and `yarn validate.package` grades the packed core). One instance, found by review
   rather than by this scan: git-ignored proxies × wireit caching. A declared output restores
   the proxies on a hit, but the model-map module was not a declared input, so a map edit
   restored STALE proxies. Fixed in Phase 3 (the module joins wireit `build` `files`).

## Found (outside this plan's scope)

- Both adapters depend on the core as `workspace:^`, which packs as a caret range, while their
  proxies are generated from one exact core API. Harmless while they are private; before
  publishing, pin exactly (`workspace:*`) so adapter and core release as a pair.
- Commit 27d81b96's message lists an `./assets/*` export key, but `package.json` `exports` has
  none today. The asset steps above therefore copy by filesystem path.
- `mud-phone-input`'s `changeCountry` rewrites `value` and emits only `mudCountryChange`
  (`mud-phone-input.tsx:693`); `mud-numeric-input`'s commit clamp writes `value` and emits only
  `mudChange`. Emitting `mudInput` after every user-driven write would let every adapter bind one
  event. Core issue to open.

- #180 (opened 2026-09-30): the React adapter registers the same tags through two runtimes. Its
  build is `tsc || true`, its peer is React 18 only, and its comments still say `AGE` / `cor-*`.
  `web-components` was checked for the same defects: it has one runtime; it shares the
  `strict: false` tsconfig and has stale `age-demo-*` keys.
- `yarn npm audit --severity high --all --recursive` in CI will now also cover the Angular and
  Vue dev trees.
