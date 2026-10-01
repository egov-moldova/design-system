# Angular and Vue adapters for `@egov-moldova/mud`

**Execution**: workflow — `2026-09-30-angular-vue-adapters.workflow.mjs` (generated from this plan by tools/plan-to-workflow.mjs; regenerate, never edit)
**Reviewed:** none

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
- a change to the core's published `exports`, `files` or version;
- a console error in a fixture run, including a double `customElements.define`.

Must pass:

| Check | Bar |
|---|---|
| Vue fixture (latest Vue 3) | PASS on the common fixture checks below, all through `v-model` |
| Angular fixture at 20 and at 22 | PASS on the common fixture checks below, through `ngModel`, plus `formControl` on select and a bare boolean attribute compiling under `strictTemplates` |
| Proxy and shim guard in the runner | FAIL on any tracked file under a proxy output directory, or a root `components/` directory |
| `yarn check.verify`, `yarn validate.package`, `yarn test:scripts`, `yarn docs:check` | green |
| CI `Adapters` job | green on the PR |

Common fixture checks:

- Upgrade: a shadow root is present.
- Model binding both ways, once per distinct model shape: string on `mudInput` (text-input),
  string on `mudChange` (date-input), number (numeric-input), boolean (checkbox), select
  (select), array (input-chip).
- Tokens: the documented `@egov-moldova/mud/styles.css` import resolves. Proven by a computed
  token custom property on the page.
- Assets: `mud-icon` loads its SVG with no 404.

Every row of the form-control model map has an accessor (Angular) or a component model (Vue):
16 of 16 components listed there (`mud-radio` excluded by design).

## Spec / issue

egov-moldova/design-system#178 (no body; scope agreed with the owner in chat, 2026-09-30).

## Branch and base

`danzubco/create-angular-and-vue-adapters`, built on `upstream/main` (77eca9e3) with the two open
PRs merged in number order: #177 (Storybook docs source), then #179 (ops config). The PR for this
plan therefore merges after both; until they land its diff carries their commits.

## Current state (measured 2026-09-30)

- The core already builds everything a wrapper needs: `dist-custom-elements` with
  `externalRuntime: false` in every non-dev build (`stencil.config.ts`), exported as
  `./components` and `./components/mud-*.js` (`package.json` `exports`). The published core
  contract does not change.
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

All 16 controls below set their model property before they emit, so reading
`event.target[prop]` is correct. This was read in each component's emit path on 2026-09-30.

`date-input` and `time-input` bind on `mudChange`, not `mudInput`. Their `mudInput` carries the
partially masked text while the user types (`mud-date-input.tsx:948-951`), which is not a value a
form model should hold.

| Model | Event | Components | Angular accessor |
|---|---|---|---|
| `value` (string) | `mudInput` | text-input, textarea, search-input, phone-input (E.164 on each keystroke) | `text` |
| `value` (string) | `mudChange` | date-input, time-input | `text` |
| `value` (number) | `mudInput` | numeric-input | `number` |
| `checked` | `mudChange` | checkbox, switch | `boolean` |
| `value` | `mudChange` | select, radio-group, segmented-control, date-picker (`string \| string[]` in range mode, passed through as-is), time-picker | `select` |
| `chips` (string[]) | `mudChange` | input-chip | hand-written |
| `files` (File[]) | `mudChange` | file-input | hand-written |

The generated Angular accessors always write `.value` (or `.checked` for `boolean`)
(`angular-output-target/resources/control-value-accessors/value-accessor.ts:14`). That is why
`chips` and `files` need their own accessors. Vue's `componentModels` read and write the same
`targetAttr`, so the whole table maps directly. `mud-radio` gets no model; `mud-radio-group` owns
the radio value.

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
  `yarn validate.package` stays green.
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
| 1 Move adapters into `packages/` | Sonnet 5.5 | high | A | every path consumer moves in the same phase (one contract) |
| 2 Unified proxy build | Sonnet 5.5 | high | B | depends on 1 (new React path; shared `stencil.config.ts`, `package.json`) |
| 3 Vue adapter + fixture runner | Sonnet 5.5 | high | C | depends on 2 (shared `stencil.config.ts`, `package.json`) |
| 4 Angular adapter | Opus 5.5 | medium | D | depends on 3 (the fixture runner it extends; the same shared files) |
| 5 CI, Docker, docs | Sonnet 5.5 | high | E | depends on 3 and 4 (documents and wires what they built) |

Dispatch verdict: dispatch. Every phase passes the brief-test: each is self-contained against
this plan, with its own acceptance commands.

Routing rationale: the architectural decisions are made in this plan, so phases 1, 2, 3 and 5
execute a stated design at the implementer tier. Phase 4 carries the open technical risks: the
ng-packagr resolution that needed the old shim, `inlineProperties` being experimental, the
hand-written accessors, and the `workspace:` specifier in ng-packagr's `dist/` manifest. So it
runs one tier up, at medium effort. The final gate review runs in the controlling session.
Escalation: a phase that fails its acceptance twice restarts one tier up with fresh context.
Phases run sequentially: each wave holds one phase, because phases 1–4 share
`stencil.config.ts` and the root `package.json`.

## Phases

### Phase 1: Move `react/` and `web-components/` into `packages/`

**Executor**: Sonnet 5.5 · high · Wave A · implementer

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

**Executor**: Sonnet 5.5 · high · Wave B · implementer (after Phase 1)

Files: `stencil.config.ts`, root `package.json` (scripts, wireit), `scripts/__tests__/validate-package.spec.mjs`, `.prettierignore`, `packages/react/README.md` (it documents `stencil build --docs --react`, which this phase removes).

- [ ] The React output target runs in every non-dev build, as `dist-custom-elements` already
      does, instead of only under `--react`. Remove the `--react` flag branch.
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

**Executor**: Sonnet 5.5 · high · Wave C · implementer (after Phase 2)

Files: `packages/vue/**`, `stencil.config.ts` (Vue target), root `package.json` (workspace, devDeps, `build.vue`), `scripts/adapters/**`, `yarn.lock`, `.prettierignore`, `.gitignore` (proxy output), `scripts/__tests__/validate-package.spec.mjs`.

- [ ] `packages/vue`: `@egov-moldova/mud-vue`, `private: true`, peer `vue ^3.4.38`, dependency
      `@stencil/vue-output-target` `~0.14.3` (for its `/runtime`), core as `workspace:^`. Built
      with `tsc` to `dist/` (ESM + `.d.ts`). The proxies are git-ignored.
- [ ] The Vue output target: `includeImportCustomElements: true`, `esModules: true`,
      `customElementsDir: 'components'`, and `componentModels` from the model map above.
- [ ] A plugin exported as `Mud`, used as `app.use(Mud, { assetPath? })`, that calls the
      standalone bundle's `setAssetPath`, with the same default and override contract as
      `packages/react/src/index.ts`. Wrapped components need no `isCustomElement`.
- [ ] `scripts/adapters/consumer-fixture.mjs <framework> [--framework-version <major>]`, which:
  1. packs the core and the adapter;
  2. fails if any packed manifest carries a `workspace:` specifier, if `git ls-files` lists
     anything under a proxy output directory, or if a root `components/` directory exists;
  3. copies `packages/<framework>/fixture/` to a temp directory and installs the tarballs plus
     the fixture's pinned dependencies with npm;
  4. builds with the framework's own CLI;
  5. serves the build and runs a Playwright spec.
- [ ] Vue fixture (Vite + `@vitejs/plugin-vue`, latest Vue 3). It imports
      `@egov-moldova/mud/styles.css` the way the README tells consumers to: tokens stay the
      consumer's import and are not bundled into the adapter. Its spec asserts every item in the
      bar's common fixture checks through `v-model`, plus no console error (including no
      double-define).
- Verify: `yarn build.vue` and `node scripts/adapters/consumer-fixture.mjs vue` are green; the
  spec goes red when the plugin's `setAssetPath` call is removed.

### Phase 4: Angular adapter

**Executor**: Opus 5.5 · medium · Wave D · implementer (after Phase 3: extends its runner)

Files: `packages/angular/**`, `stencil.config.ts` (Angular target), root `package.json` (workspace, devDeps, `build.angular`), `scripts/adapters/**`, `yarn.lock`, `.prettierignore`, `.gitignore` (proxy output), `scripts/__tests__/validate-package.spec.mjs`.

- [ ] `packages/angular`: `@egov-moldova/mud-angular`, `private: true`, peers
      `@angular/core` and `@angular/forms` `^20.0.0 || ^21.0.0 || ^22.0.0`, built by ng-packagr
      with Angular 20.3.x devDependencies in partial compilation mode.
- [ ] Resolve `@egov-moldova/mud/components/mud-*.js` through the `exports` map using the
      library tsconfig's `moduleResolution: bundler`. No shim folder. If this cannot be made to
      work, STOP and report the measured failure — do not reintroduce the shim.
- [ ] The Angular output target: `outputType: 'standalone'`, `esModules: true`,
      `customElementsDir: 'components'`, `booleanAttributes: true`, and `valueAccessorConfigs`
      from the model map. Try `inlineProperties: true` (experimental) and keep it only if the
      fixture compiles under `strictTemplates`; record the result under Not verified.
- [ ] Hand-written standalone accessors for `mud-input-chip` (`chips`) and `mud-file-input`
      (`files`). Check `mud-numeric-input` against a `null` model: the generated accessor writes
      `''` into a number prop. Use its own accessor if that misbehaves.
- [ ] `provideMud({ assetPath? })` as an environment provider that calls the standalone
      `setAssetPath`, with the same default as the React adapter.
- [ ] The ng-packagr `dist/` manifest carries no `workspace:` specifier. Decide the mechanism;
      the runner's check from Phase 3 is the acceptance test.
- [ ] Angular fixture (standalone app, `strictTemplates`), run at Angular 20 and 22 through
      `--framework-version`. Its spec asserts:
  - every item in the bar's common fixture checks through `[(ngModel)]`, with `styles.css` added
    in `angular.json` `styles`, plus the Vue fixture's console check;
  - a reactive `formControl` on `mud-select`;
  - a bare boolean attribute (`<mud-button disabled>`) compiles.
- Verify: `yarn build.angular` is green, and
  `node scripts/adapters/consumer-fixture.mjs angular --framework-version 20` and `… 22` are
  green.

### Phase 5: CI, Docker and documentation

**Executor**: Sonnet 5.5 · high · Wave E · implementer (after Phases 3 and 4)

Files: `.github/workflows/ci.yml`, `Dockerfile`, `README.md`, `CONTRIBUTING.md`, `STACK.md`, `AGENTS.md`, `_agents/environment-commands.md`, `.claude/skills/mud-design/SKILL.md`, `changes/<fragment>.md`.

- [ ] CI job `Adapters`:
  1. `yarn tokens.build`;
  2. `yarn build`;
  3. `yarn build.vue`;
  4. `yarn build.angular`;
  5. the fixture runner for vue, angular@20 and angular@22.
- [ ] `Dockerfile`: `COPY` the two new workspace manifests (`packages/angular`,
      `packages/vue`), otherwise the immutable install fails.
- [ ] Docs:
  - README: Angular and Vue usage marked "not yet published", like React;
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
  lockfile, so a green run is not byte-reproducible.
- Angular 21. Partial compilation built with 20 and tested on 20 and 22 brackets it; 21 itself is
  not run.
- Publishing. The packages stay private and the release pipelines are unchanged.

## Found (outside this plan's scope)

- #180 (opened 2026-09-30): the React adapter registers the same tags through two runtimes. Its
  build is `tsc || true`, its peer is React 18 only, and its comments still say `AGE` / `cor-*`.
  `web-components` was checked for the same defects: it has one runtime; it shares the
  `strict: false` tsconfig and has stale `age-demo-*` keys.
- `yarn npm audit --severity high --all --recursive` in CI will now also cover the Angular and
  Vue dev trees.
