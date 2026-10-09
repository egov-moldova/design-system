# React adapter: one Stencil runtime, a build that can fail, adapter hygiene (#180)

**Reviewed:** preflight 3d4d5309, critic 867651f3, critic 27d547c4 — the 3-round cap ended the loop on 2026-10-01 with round 3's findings folded in below without a further round; awaiting Dan's go to implement.

## Goal

`@egov-moldova/mud-react` registers every `mud-*` element through the standalone bundle only,
configured by one setup call shaped like the Vue and Angular adapters; its build fails on a type
error and typechecks against React 18 and 19; both adapter tsconfigs are strict; stale names are
gone. A static guard keeps the second runtime from coming back.

## Problem

A React app using `@egov-moldova/mud-react` ships two Stencil runtimes, and whichever registers a
tag first owns it. `mud-icon` and `mud-logo` registered by the lazy loader ignore the asset path
the adapter set on the standalone bundle, so their SVGs resolve against the wrong base. The
adapter's build is `tsc || true`, so neither CI nor the audit's `adapter-react` row can catch a
type error, and the peers exclude React 19.

## Spec / issue

egov-moldova/design-system#180. Found while planning #178.

## Branch and base

- Branch `danzubco/react-adapter-registers-every-tag-through-two-st`, fast-forwarded onto the head
  of #189 (`ed49b48b`, branch `danzubco/create-angular-and-vue-adapters`), because #189 moves
  `react/` and `web-components/` into `packages/` and every path below is the moved one.
- PR base `main` (upstream), stacked on #189: **merge #189 first**. If #189 moves before it
  merges, merge its head into this branch (no rebase).
- Open PR #188 touches `web-components/demo/{demo.css,manifest.ts,pages/actions/mud-service-button.html}`;
  this plan touches `packages/web-components/demo/main.ts` only in that tree, so the two do not
  overlap.

## Current state (measured 2026-10-01 at `ed49b48b`, after `yarn build`)

- `packages/react/src/index.ts` imports `defineCustomElements` and `setNonce` from
  `@egov-moldova/mud/loader` (the lazy runtime) and `setAssetPath` from
  `@egov-moldova/mud/components` (the standalone runtime). Every generated wrapper imports
  `@egov-moldova/mud/components/mud-*.js`. Two runtimes, first registration wins per tag.
- Each generated wrapper passes `defineCustomElement: defineMud<Name>` to `createComponent`, and
  `@stencil/react-output-target@1.6.2`'s `createComponent` calls it immediately
  (`node_modules/@stencil/react-output-target/dist/create-component-ICzm58MY.js`, `typeof s < "u" && s()`):
  a wrapper registers its element when its module is evaluated. The call is `/*@__PURE__*/`, so
  a bundler drops an unused wrapper and its registration with it.
- The root specifier `@egov-moldova/mud` resolves to `dist/index.js` = `export * from './esm/index.js'`,
  the lazy runtime. Only `@egov-moldova/mud/components` and `@egov-moldova/mud/components/mud-*.js`
  are the standalone runtime.
- 37 of the generated wrappers ALSO import the root specifier, type-only:
  `import { type MudXCustomEvent, type MudXDetail } from "@egov-moldova/mud";` (from
  `stencilPackageName` at `stencil.config.ts:91`; `grep -rl 'from "@egov-moldova/mud";' packages/react/src/components/stencil-generated | wc -l` → 37).
  The compiler erases them, so they load no runtime. The guard must allow exactly this shape:
  its logic, run against the files on disk, reports only the two `/loader` imports in `index.ts`.
- `@egov-moldova/mud/components` exports `setAssetPath`, `getAssetPath`, `setNonce`,
  `setPlatformOptions` (`dist/components/index.d.ts`).
- `packages/react`: `tsc --noEmit -p .` → 0 errors; with `--strict` → 0 errors.
- Type isolation (scratch probes, strict): with no `types` option the program auto-includes every
  `node_modules/@types/*`, so a `paths`-mapped React 19 program ALSO loaded
  `node_modules/@types/react` 18 (`--listFilesOnly`). With `"types": []`: the React 19 program
  (`paths` → `@types/react@19.3.0`) loads only the 19 files, 0 errors; the React 18 program loads
  only `@types/react` 18 + `@types/prop-types`, 0 errors. `src/` never imports `react-dom`.
- `fnm exec --using=24 -- node --input-type=module -e "const m = await import('@egov-moldova/mud/components'); …"`
  loads the standalone bundle under bare Node 24 (`setAssetPath`, `setNonce` are functions,
  `document` is undefined): the Phase 1 spec can import `setup.ts`.
- `@stencil/react-output-target@1.6.2` peers: `react ^18 || ^19`, `react-dom ^18 || ^19`.
- `packages/web-components`: `tsc --noEmit` with `--strict --moduleResolution bundler --module esnext` → 0 errors.
- CI job `adapters` runs `yarn build`, `build.vue`, `build.angular` and the fixtures; it never
  runs `yarn build.react`. The audit's deep `adapter-react` row runs `yarn build.react`
  (`scripts/audit/run-all.mjs:247`), so with `tsc || true` that row cannot fail today.
- `scripts/__tests__/validate-package.spec.mjs:708` already walks `packages/react/src` and checks
  every `@egov-moldova/mud` specifier against the exports map.
- Stale names: `packages/react/src/index.ts` (`AGE`, `cor-*`, `cor-logo.providers.ts`),
  `packages/react/README.md` (`AGE`, `Cor*`, `cor-*`, SIMSM, a personal absolute path),
  `packages/web-components/demo/main.ts:16-17` (`age-demo-theme`, `age-demo-lang`).

## Options

Owner decisions, 2026-10-01.

### Options

| Option | Complexity added now | Cost to maintain | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- |
| A. Keep `defineCustomElements(opts?)`, drop the loader, keep the `/node_modules/...` default | low — no new export | low — one entry point | low | the name claims a registration it no longer does; the default works only on a Vite dev server | zero migration |
| B. New `setupMud({ assetPath })`, `assetPath` required, resolved against `document.baseURI`, SSR-safe; `defineCustomElements` removed | low — one export replaces one | low — one entry point | med — every linked consumer migrates | breaks linked consumers (SIMSM) at once | same contract as Vue `Mud` and Angular `provideMud` |
| C. B plus `defineCustomElements` kept as a `@deprecated` alias with the old default | med — two entry points for one job | med — two entry points until the alias is removed | med | the alias registers nothing either; a consumer that relied on it for raw `<mud-*>` tags must import the wrapper | B's contract without breaking linked consumers now |

Recommended was B (one entry point, the cheapest moment to break a private 0.0.1 package).
**Decision: C** (owner, 2026-10-01): linked consumers keep compiling until the alias is removed. Peers `^18.0.0 || ^19.0.0` (owner). Proof: static guard
plus CI typecheck against React 18 and 19 types, no React consumer fixture (owner).

What C means precisely: neither entry point registers elements. A wrapper registers its own
element (and the elements it renders) when imported. A consumer writing a raw `<mud-x>` tag in
JSX imports `defineCustomElement` from `@egov-moldova/mud/components/mud-x.js` and calls it, or
uses the wrapper. The README says so.

## Global constraints

- Everything authored is English. Conventional commits, one commit per phase, staged by explicit
  path, never `git add -A` / `.` / `-u`. No AI attribution anywhere.
- Node through `fnm exec --using=24 --` (the repo pins 24; the shell default is 26).
- No change to core `src/`, `stencil.config.ts`, the core's `exports` / `files` / version, or the
  generated proxies (git-ignored, never committed).
- No adapter build masks a type error: no `|| true`, no `@ts-nocheck`, no `skipLibCheck` change.
- `packages/react` stays `private: true`, version `0.0.1`.
- No `!` / `BREAKING CHANGE` commit: nothing removed (the alias stays).

## Acceptance bar

Zero tolerance:

- `yarn test:scripts` (spec `names only the standalone runtime`) fails on an `@egov-moldova/mud` specifier under `packages/react/src` other than
  `@egov-moldova/mud/components`, `@egov-moldova/mud/components/mud-*.js`, or the root in a
  type-only import statement;
- `yarn test:scripts` (spec `no adapter build masks a failure`) fails on an adapter `build` script holding `;` or `||`;
- `yarn test:scripts` (spec `every adapter compiles in strict mode`) fails on a lax adapter tsconfig;
- `git grep -n -w -E 'AGE|SIMSM|mdascal|cor-[a-z-]+|Cor[A-Z][A-Za-z]*' -- packages/react` prints nothing (exit 1);
- `git grep -n 'age-demo' -- packages/web-components` prints nothing (exit 1);
- `diff -r "$TMPDIR/web-dist-before" packages/web-components/dist` exits 0 after Phase 3 Step 4
  (Step 1 snapshots `dist/` from a build on the unchanged tree; `tsc` emit carries no timestamps
  or hashes, and a scratch emit with the new options was byte-identical, measured at preflight);
- `fnm exec --using=24 -- npx tsc -p packages/react/tsconfig.react19.json --listFilesOnly | grep '/node_modules/@types/react/'` prints nothing (exit 1);
- `fnm exec --using=24 -- npx tsc -p packages/react/tsconfig.react19.json --listFilesOnly | grep -q '/node_modules/react-types-19/index.d.ts'` exits 0;
- `fnm exec --using=24 -- npx tsc -p packages/react/tsconfig.json --listFilesOnly | grep '/react-types-19/'` prints nothing (exit 1).

Each command exits 0, run as written from the repo root:

1. `fnm exec --using=24 -- yarn build.react`
2. `fnm exec --using=24 -- yarn build.web`
3. `fnm exec --using=24 -- yarn test:scripts`
4. `fnm exec --using=24 -- yarn typecheck`
5. `fnm exec --using=24 -- yarn lint`
6. `fnm exec --using=24 -- yarn docs:check`
7. `fnm exec --using=24 -- yarn changelog.check`
8. `fnm exec --using=24 -- yarn workspace @egov-moldova/mud-web-components demo.build`

## Review focus

Inputs no task can pin with a browser, most likely to bite first:

1. A raw `<mud-x>` in JSX with no wrapper import stays an unknown element. Previously the loader
   registered it. Pinned by the README and the alias's `@deprecated` JSDoc, not by a test.
2. `assetPath: 'mud'` (relative, no trailing slash) must become `<base>mud/`, or every asset URL
   drops the last segment. Pinned in Phase 1's spec.
3. `assetPath` as an absolute CDN URL must pass through unchanged. Pinned in Phase 1's spec.
4. `setupMud` on a server (no `document`) must not throw for a valid path, and must still throw
   for an empty one. Pinned in Phase 1's spec (Node has no `document`).
5. Calling setup twice with different paths: the last call wins (the old alias ignored the second
   call). Documented in the JSDoc; observable only with `window`/`document` stubs (see Not verified).

## Execution

**Executor**: Sonnet 5.5 · high (code-writing phases; the design is decided above)

Dispatch verdict: inline. Each phase would pass the brief-test, but the plan is three small
phases over ~14 files with every design decision taken; a dispatch per phase costs more context
than it saves. Order: Phase 1, then Phase 2 (strict mode compiles Phase 1's `setup.ts`; both edit
`packages/react/package.json` and the validate-package spec), then Phase 3 (its strict spec
needs Phase 2's strict React tsconfig to pass). One commit per phase.

## Phases

### Phase 1: React runtime and setup API

Files: `packages/react/src/setup.ts`, `packages/react/src/index.ts`, `packages/react/package.json`,
`packages/react/README.md`, `README.md`, `CONTRIBUTING.md`,
`scripts/__tests__/validate-package.spec.mjs`, `scripts/__tests__/react-adapter-setup.spec.mjs`,
`changes/issue-180-react-adapter.md`.

Interfaces produced:

- `setupMud(options: MudSetupOptions): void`, `interface MudSetupOptions { assetPath: string }`
- `toAssetBaseUrl(assetPath: string, baseURI: string): string`
- `defineCustomElements(opts?: DefineCustomElementsOptions): Promise<void>` (`@deprecated`),
  `type DefineCustomElementsOptions = { assetPath?: string }`
- re-exports `setAssetPath`, `setNonce` from `@egov-moldova/mud/components`

- [ ] **Step 1: the guard, RED.** Append to `scripts/__tests__/validate-package.spec.mjs`, inside
  `describe('the React workspace names only exported subpaths', …)` after the existing `it`
  (reuse its `walk`, `REACT_SRC`, `SPECIFIER_RE`; do not copy them):

  ```js
  // #180: the wrappers import the standalone bundle, so any other `@egov-moldova/mud` entry
  // registers tags through a second Stencil runtime. The root specifier resolves to
  // `dist/index.js`, which re-exports `dist/esm`, the lazy runtime, so it is allowed ONLY in an
  // import the compiler erases: `import type { … }`, or every binding marked `type` — the shape
  // the React output target writes for event-detail types (`stencilPackageName`).
  // Limit: that erasure is the default; a consumer compiling this `src/` with
  // `verbatimModuleSyntax` keeps `import {} from "@egov-moldova/mud"` and evaluates the lazy
  // runtime's modules (no tag registered). A specifier assembled at runtime is outside any
  // static read.
  const STANDALONE_RE = /^@egov-moldova\/mud\/components(?:\/mud-[a-z0-9-]+\.js)?$/;
  const ROOT_IMPORT_RE = /\bimport\s+(type\s+)?\{([^}]*)\}\s*from\s*["']@egov-moldova\/mud["']\s*;?/g;
  const isTypeOnly = (typeKeyword, bindings) =>
    Boolean(typeKeyword) ||
    bindings
      .split(',')
      .map(binding => binding.trim())
      .filter(Boolean)
      .every(binding => /^type\s/.test(binding));

  it('names only the standalone runtime, never the lazy loader (#180)', () => {
    const files = walk(REACT_SRC);
    assert.ok(files.length > 0, 'packages/react/src holds no .ts/.tsx files — the scan would grade nothing');

    const lazy = [];
    for (const file of files) {
      const source = fs
        .readFileSync(file, 'utf8')
        .replace(ROOT_IMPORT_RE, (statement, typeKeyword, bindings) => (isTypeOnly(typeKeyword, bindings) ? '' : statement));
      for (const [, specifier] of source.matchAll(SPECIFIER_RE)) {
        if (!STANDALONE_RE.test(specifier)) lazy.push(`${path.relative(PROJECT_ROOT, file)}: ${specifier}`);
      }
    }
    assert.deepEqual(lazy, []);
  });
  ```

  Run `fnm exec --using=24 -- node --test --test-name-pattern='lazy loader' scripts/__tests__/validate-package.spec.mjs`.
  Expected: FAIL listing exactly `packages/react/src/index.ts: @egov-moldova/mud/loader` (twice) —
  no generated wrapper (their 37 type-only root imports are stripped first; measured at
  preflight). Then check the stripping cannot hide a value import: a scratch run of the same
  logic over `import { A, type B } from "@egov-moldova/mud";` must still report the root.

- [ ] **Step 2: the setup spec, RED.** Create `scripts/__tests__/react-adapter-setup.spec.mjs`:

  ```js
  // packages/react/src/setup.ts, run under Node's native type stripping. Node has no
  // `document`, so this is also the server-render path of `setupMud`.
  import assert from 'node:assert/strict';
  import { describe, it } from 'node:test';

  import { defineCustomElements, setupMud, toAssetBaseUrl } from '../../packages/react/src/setup.ts';

  describe('toAssetBaseUrl', () => {
    it('resolves a relative path against the base and adds the trailing slash', () => {
      assert.equal(toAssetBaseUrl('mud', 'https://app.test/base/page'), 'https://app.test/base/mud/');
    });
    it('keeps a relative path that already ends in a slash', () => {
      assert.equal(toAssetBaseUrl('mud/', 'https://app.test/base/'), 'https://app.test/base/mud/');
    });
    it('passes an absolute URL through', () => {
      const cdn = 'https://cdn.test/@egov-moldova/mud/dist/components/';
      assert.equal(toAssetBaseUrl(cdn, 'https://app.test/'), cdn);
    });
    it('resolves a root-relative path against the origin', () => {
      assert.equal(toAssetBaseUrl('/static/mud', 'https://app.test/a/b'), 'https://app.test/static/mud/');
    });
  });

  describe('setupMud', () => {
    for (const assetPath of ['', undefined, null, 42]) {
      it(`throws on assetPath ${JSON.stringify(assetPath)}`, () => {
        assert.throws(() => setupMud({ assetPath }), /\[mud-react\] `setupMud\(\{ assetPath \}\)` needs a non-empty `assetPath`/);
      });
    }
    it('throws when called with no options', () => {
      assert.throws(() => setupMud(undefined), /needs a non-empty `assetPath`/);
    });
    it('is a no-op without a document (server render)', () => {
      assert.equal(setupMud({ assetPath: 'mud/' }), undefined);
    });
  });

  describe('defineCustomElements (deprecated alias)', () => {
    it('resolves without a document and without options', async () => {
      assert.equal(await defineCustomElements(), undefined);
    });
  });
  ```

  Run `fnm exec --using=24 -- node --test scripts/__tests__/react-adapter-setup.spec.mjs`.
  Expected: FAIL, module `packages/react/src/setup.ts` not found.

- [ ] **Step 3: `packages/react/src/setup.ts`.** Erasable TypeScript only (Node strips the types
  for the spec): no enums, namespaces or parameter properties, no relative imports.

  ```ts
  import { setAssetPath } from '@egov-moldova/mud/components';

  export interface MudSetupOptions {
    /**
     * The URL of the directory that holds the component assets, i.e. the directory whose
     * immediate child is `assets/`. REQUIRED: `mud-icon` and `mud-logo` fetch their SVGs from
     * `<assetPath>assets/...`, and there is no default that is right in every build.
     *
     * Copy `node_modules/@egov-moldova/mud/dist/components/assets` into the app's served output
     * (Vite `public/`, a copy plugin, or the framework's static folder) and pass the URL it is
     * served at. A relative URL resolves against the document's base URL.
     */
    assetPath: string;
  }

  /**
   * The absolute directory URL the standalone bundle's `getAssetPath` needs: it builds
   * `new URL(path, assetPath)`, which throws on a relative base, and `mud-icon` swallows that
   * throw, so the icon would stay blank with no error.
   */
  export function toAssetBaseUrl(assetPath: string, baseURI: string): string {
    const absolute = new URL(assetPath, baseURI);
    if (!absolute.pathname.endsWith('/')) absolute.pathname += '/';
    return absolute.href;
  }

  /**
   * Registers the asset path the standalone component bundle resolves SVGs against. Call it
   * once at startup, before the first render:
   *
   * ```ts
   * setupMud({ assetPath: import.meta.env.BASE_URL });
   * ```
   *
   * It registers no element: every wrapper registers its own element, and the elements it
   * renders, when it is imported. A raw `<mud-x>` tag needs its wrapper imported, or
   * `defineCustomElement` from `@egov-moldova/mud/components/mud-x.js` called.
   *
   * A second call replaces the path the first one set.
   */
  export function setupMud(options: MudSetupOptions): void {
    const assetPath: unknown = options?.assetPath;
    if (typeof assetPath !== 'string' || assetPath === '') {
      throw new Error('[mud-react] `setupMud({ assetPath })` needs a non-empty `assetPath`.');
    }
    // A server render has no `document`, and no component fetches an asset there: skip the setup.
    if (typeof document === 'undefined') return;
    setAssetPath(toAssetBaseUrl(assetPath, document.baseURI));
  }

  export type DefineCustomElementsOptions = {
    /** See {@link MudSetupOptions.assetPath}. Defaults to `<origin>/node_modules/@egov-moldova/mud/dist/components/`, which only a dev server that exposes `node_modules` serves. */
    assetPath?: string;
  };

  /**
   * @deprecated Use {@link setupMud}, which requires `assetPath`. This alias registers no
   * element either (see `setupMud`); it only sets the asset path, defaulting to the
   * `node_modules` URL of a Vite dev server. Kept so linked consumers keep compiling.
   */
  export function defineCustomElements(opts?: DefineCustomElementsOptions): Promise<void> {
    if (typeof document !== 'undefined') {
      setupMud({
        assetPath:
          opts?.assetPath ?? new URL('/node_modules/@egov-moldova/mud/dist/components/', window.location.origin).href,
      });
    }
    return Promise.resolve();
  }
  ```

- [ ] **Step 4: `packages/react/src/index.ts`** — replace the whole file:

  ```ts
  // Every React wrapper @stencil/react-output-target generates into
  // `./components/stencil-generated/` on each non-dev `yarn build` at the repo root. Each one
  // imports its element from the standalone bundle (`@egov-moldova/mud/components/mud-*.js`)
  // and registers it when its module is evaluated: the adapter loads one Stencil runtime, and
  // never the lazy loader (#180).
  export * from './components/stencil-generated/components';

  export { defineCustomElements, setupMud } from './setup';
  export type { DefineCustomElementsOptions, MudSetupOptions } from './setup';
  export { setAssetPath, setNonce } from '@egov-moldova/mud/components';
  ```

  `toAssetBaseUrl` stays out of the package API: `setup.ts` exports it for the spec only.

- [ ] **Step 5: GREEN.** `fnm exec --using=24 -- node --test scripts/__tests__/react-adapter-setup.spec.mjs`
  and the Step 1 command: both PASS. `fnm exec --using=24 -- npx tsc --noEmit -p packages/react`: exit 0.

- [ ] **Step 6: peers.** `packages/react/package.json` `peerDependencies`:
  `"react": "^18.0.0 || ^19.0.0"`, `"react-dom": "^18.0.0 || ^19.0.0"`.

- [ ] **Step 7: docs.**
  - `packages/react/README.md`: replace with the shape of `packages/vue/README.md` — title, one
    sentence ("React 18 and 19 adapter for the MUD Design System: typed wrapper components around
    the `mud-*` custom elements of `@egov-moldova/mud`."), "Not yet published", a link to the root
    README section `#react-component-wrappers` and to CONTRIBUTING's framework-adapters section.
  - `README.md` § React component wrappers (keep the "Not yet published" note): peers
    `react ^18 || ^19`; install line; usage with the token/style imports, the asset copy step and
    `setupMud({ assetPath })` before `createRoot`; a `<MudTextInput label="…" onMudChange={event => …}>`
    example (`MudButton` declares no custom events: `mud-button.ts` has
    `MudButtonEvents = NonNullable<unknown>`; `MudTextInputEvents` has `onMudChange`), reading the
    value from `event.detail`; the raw-tag note from `setupMud`'s JSDoc; `defineCustomElements` is
    deprecated in favour of `setupMud`. Re-read the generated
    `packages/react/src/components/stencil-generated/mud-text-input.ts` for the detail's field names
    before writing the handler.
  - `CONTRIBUTING.md` § Framework adapters: one short "Linking `mud-react` into another app"
    paragraph — `yarn build.react`, then `npm link` in `packages/react/` and
    `npm link @egov-moldova/mud-react` in the consuming app; re-run `yarn build.react` after a
    component's public API changes (the watch build does not regenerate proxies); the consuming
    app dedupes React (Vite `resolve.dedupe: ['react', 'react-dom']`), because the linked `src/`
    otherwise resolves this repo's React 18 and a React 19 app loads two Reacts. No personal paths.
- [ ] **Step 8: changelog fragment** `changes/issue-180-react-adapter.md`:

  ```markdown
  ---
  type: Fixed
  title: the React adapter loads one Stencil runtime
  ---

  `@egov-moldova/mud-react` (private, not yet published) registered elements through both the lazy loader and the standalone bundle, so the asset path set on one was ignored by elements the other registered first. It now uses the standalone bundle only. `setupMud({ assetPath })` replaces `defineCustomElements()`, which stays as a deprecated alias and, like `setupMud`, only sets the asset path: each wrapper registers its own element.

  **Migration:** call `setupMud({ assetPath })` once at startup. A raw `<mud-*>` tag written without its wrapper needs the wrapper imported, or `defineCustomElement` from `@egov-moldova/mud/components/mud-<name>.js`.
  ```
- [ ] **Step 9: verify and commit.** First `fnm exec --using=24 -- npx prettier --write` over
  this phase's Files (the code blocks above are not pre-formatted to the repo's print width).
  Then commands 3, 5, 6, 7 of the acceptance bar, and the first stale-name grep. Commit `fix(react): register every element through the standalone bundle only (#180)`.

### Phase 2: Build gate, strict mode, React 19 typecheck, CI

Files: `packages/react/package.json`, `packages/react/tsconfig.json`,
`packages/react/tsconfig.react19.json`, `package.json`, `yarn.lock`, `.github/workflows/ci.yml`,
`scripts/__tests__/validate-package.spec.mjs`.

- [ ] **Step 1: the gate spec, RED.** Append to `scripts/__tests__/validate-package.spec.mjs`:

  ```js
  describe('no adapter build masks a failure (#180)', () => {
    // A `build` that swallows its exit status turns `yarn build.<adapter>`, the CI step and
    // the audit's `adapter-*` rows into checks that cannot fail. Masking idioms cannot be
    // enumerated (`|| true`, `|| echo`, `; exit 0`, `; next-command`), so the positive shape is
    // asserted instead: commands chained by `&&` only. A legitimate `||` needs an explicit
    // exception here.
    // Each `&&` segment must hold no other shell control operator: `;`, `|` (also `||`), `&`, newline.
    const propagates = build => build.split('&&').every(segment => !/[;|&\n]/.test(segment));
    const PACKAGES = path.join(PROJECT_ROOT, 'packages');

    it('every packages/*/package.json build script propagates its exit status', () => {
      const masked = fs
        .readdirSync(PACKAGES, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && fs.existsSync(path.join(PACKAGES, entry.name, 'package.json')))
        .map(entry => [entry.name, JSON.parse(fs.readFileSync(path.join(PACKAGES, entry.name, 'package.json'), 'utf8')).scripts?.build])
        .filter(([, build]) => typeof build === 'string' && !propagates(build))
        .map(([name, build]) => `packages/${name}: ${build}`);
      assert.deepEqual(masked, []);
    });
  });
  ```

  Run `fnm exec --using=24 -- node --test --test-name-pattern='masks a failure' scripts/__tests__/validate-package.spec.mjs`.
  Expected: FAIL with `packages/react: tsc || true`.

- [ ] **Step 2: React 19 types.** In `packages/react/package.json` `devDependencies` add
  `"react-types-19": "npm:@types/react@^19.3.0"` — deliberately OUTSIDE the `@types` scope, so
  no program auto-includes it as a global type package. No `react-dom` alias: `src/` never imports
  `react-dom`. Run `fnm exec --using=24 -- yarn install`, then find the install:
  `command ls -d node_modules/react-types-19 packages/react/node_modules/react-types-19 2>/dev/null`
  (`nodeLinker: node-modules`; expected at the root).
- [ ] **Step 3: strict, and no ambient type packages.** `packages/react/tsconfig.json`: delete
  `strict: false`, `strictNullChecks: false`, `strictPropertyInitialization: false`,
  `noImplicitAny: false`; add `"strict": true`, `"noEmitOnError": true` and `"types": []` (as
  `packages/vue/tsconfig.json` does). `"types": []` stops the auto-inclusion of every
  `node_modules/@types/*`, which otherwise loads React 18 into the React 19 program (measured,
  Current state); explicit imports still resolve their own types.
- [ ] **Step 4: `packages/react/tsconfig.react19.json`** (paths relative to this file; if Step 2
  found the package under `packages/react/node_modules`, the prefix is `./node_modules/`):

  ```json
  {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "noEmit": true,
      "declaration": false,
      "declarationMap": false,
      "paths": {
        "react": ["../../node_modules/react-types-19"],
        "react/*": ["../../node_modules/react-types-19/*"]
      }
    }
  }
  ```

  The `paths` map applies to every import in the program, including `@stencil/react-output-target`'s
  own declarations; `"types": []` is inherited. A wrong prefix makes TypeScript fall back to the
  18 types silently, which is why the acceptance bar checks both programs' file lists.
- [ ] **Step 5: the build.** `packages/react/package.json` `scripts.build`:
  `"tsc && tsc -p tsconfig.react19.json"`. Root `package.json` `wireit["build.react"].files`: add
  `"packages/react/tsconfig.react19.json"`.
- [ ] **Step 6: GREEN.** Acceptance bar command 1 and both `--listFilesOnly` rows; the Step 1 test passes.
  Prove the gate bites: append `export const broken: number = 'x';` to
  `packages/react/src/setup.ts`, run `fnm exec --using=24 -- yarn workspace @egov-moldova/mud-react build`
  → non-zero exit; then, with the line still there, run the React 19 program alone,
  `fnm exec --using=24 -- npx tsc -p packages/react/tsconfig.react19.json` → non-zero exit
  (the `&&` in the build stops at the first `tsc`, so only this run shows the 19 program
  reports errors); remove the line.
- [ ] **Step 7: CI.** In `.github/workflows/ci.yml` job `adapters`, after the `yarn build` step and
  before `yarn build.vue`, a step named `Build the React adapter (typechecks against React 18 and 19)`
  running `yarn build.react`, in the style of its neighbours.
- [ ] **Step 8: verify and commit.** `fnm exec --using=24 -- npx prettier --write` over this
  phase's Files except `yarn.lock`, then acceptance bar 1, 3, 4, 5. Commit
  `build(react): fail on type errors, strict mode, typecheck against React 19 (#180)`.

### Phase 3: Vanilla adapter hygiene

Files: `packages/web-components/tsconfig.json`, `packages/web-components/demo/main.ts`,
`scripts/__tests__/validate-package.spec.mjs`.

- [ ] **Step 0: the strict spec, RED.** Append to `scripts/__tests__/validate-package.spec.mjs`
  (after Phase 2's `no adapter build masks a failure` block, reusing its `PACKAGES` idea but in
  its own `describe`), and add `import ts from 'typescript';` to the file's imports (`typescript`
  is a root devDependency; its CommonJS default export carries `optionDeclarations`):

  ```js
  describe('every adapter compiles in strict mode (#180)', () => {
    const PACKAGES = path.join(PROJECT_ROOT, 'packages');
    // The compiler's own list, so a flag a TypeScript upgrade adds to `strict` is covered
    // without editing this spec (5.9.3: nine flags, incl. `noImplicitThis`,
    // `strictBuiltinIteratorReturn`). `optionDeclarations` is not in the public typings but is
    // exported at runtime; the guard below fails loudly if an upgrade removes it.
    const STRICT_FAMILY = (ts.optionDeclarations ?? []).filter(option => option.strictFlag).map(option => option.name);
    assert.ok(STRICT_FAMILY.length >= 9, `typescript exposes ${STRICT_FAMILY.length} strict flags; expected at least 9`);

    it('packages/*/tsconfig.json sets strict and turns no strict-family flag back off', () => {
      const lax = fs
        .readdirSync(PACKAGES, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && fs.existsSync(path.join(PACKAGES, entry.name, 'tsconfig.json')))
        .flatMap(entry => {
          const options = JSON.parse(fs.readFileSync(path.join(PACKAGES, entry.name, 'tsconfig.json'), 'utf8')).compilerOptions ?? {};
          // `noCheck: true` skips type checking while `tsc` still exits 0.
          const off = [...STRICT_FAMILY.filter(flag => options[flag] === false), ...(options.noCheck === true ? ['noCheck'] : [])];
          return options.strict === true && off.length === 0 ? [] : [`packages/${entry.name}: strict=${options.strict} off=[${off.join(', ')}]`];
        });
      assert.deepEqual(lax, []);
    });
  });
  ```

  The four tsconfigs are plain JSON today (no comments); if `JSON.parse` throws on one, that file
  gained a comment and the spec needs TypeScript's `readConfigFile`, not a regex.
  Run `fnm exec --using=24 -- node --test --test-name-pattern='strict mode' scripts/__tests__/validate-package.spec.mjs`.
  Expected: FAIL with `packages/web-components: strict=false off=[strictNullChecks, noImplicitAny, strictPropertyInitialization]`
  (React is strict after Phase 2).

- [ ] **Step 1: baseline.** `fnm exec --using=24 -- yarn build.web`, then
  `rm -rf "$TMPDIR/web-dist-before" && cp -R packages/web-components/dist "$TMPDIR/web-dist-before"`.
- [ ] **Step 2: tsconfig.** Delete `strict: false`, `strictNullChecks: false`,
  `strictPropertyInitialization: false`, `noImplicitAny: false`; add `"strict": true`; set
  `"moduleResolution": "bundler"` (keeps `"module": "ES2020"`, which `bundler` accepts).
- [ ] **Step 3: demo keys.** `packages/web-components/demo/main.ts:16-17`: `'mud-demo-theme'`,
  `'mud-demo-lang'`. A stored preference under the old keys is dropped once; the demo falls back
  to `prefers-color-scheme` and `ro-MD`.
- [ ] **Step 4: verify.** `fnm exec --using=24 -- yarn build.web`, then
  `diff -r "$TMPDIR/web-dist-before" packages/web-components/dist` exits 0; Step 0's test passes;
  `fnm exec --using=24 -- npx prettier --write` over this phase's Files; acceptance bar 3, 5 and 8
  and the `age-demo` grep. Commit `chore(web-components): strict tsconfig, bundler resolution, mud demo storage keys (#180)`.

## Final verification

All acceptance-bar rows from a clean `yarn build`, then a gate review of the whole diff before the
PR leaves draft.

## Not verified (by design)

- A React application consuming the adapter in a browser: no React consumer fixture (owner
  decision). Asset resolution through the standalone bundle's `setAssetPath` is exercised by the
  Vue and Angular fixtures of #189, which set it the same way; the React wiring is one call,
  covered by typecheck and the spec's validation and server paths only.
- React 19 at runtime: only its types are checked.
- `setupMud` in a browser (the `document` branch) and "last call wins": not run. They are
  observable in Node only by stubbing `window` and `document` before the bundle is first
  imported (the bundle captures `window` at evaluation); not taken, to keep the spec free of
  platform stubs. `toAssetBaseUrl`, which the branch delegates to, is tested.
- The runtime guard's blind spots: a specifier assembled at runtime; a lazy import reached
  transitively through `@egov-moldova/mud/components`; a type-only root import kept by a
  consumer that compiles this `src/` with `verbatimModuleSyntax` (it evaluates the lazy
  runtime's modules, registering no tag).
- The strict spec reads each tsconfig's declared options, not the effective ones: a future
  `extends` base turning a strict flag off would pass. No adapter tsconfig uses `extends` today.
- Compiler flags on the `build` command line bypass both specs: `tsc --strict false`,
  `tsc --noCheck` or `tsc -p tsconfig.lax.json` hold no shell operator and read no
  `tsconfig.json` flag. No adapter build passes such a flag today; a reviewer reads `build`.

## Self-refute log

1. Does the fix reuse the defect's own mechanism class? No instance. The defect is a mixed
   import nobody checked; the fix is a mechanical allowlist over every specifier in
   `packages/react/src` (generated wrappers included), not a convention. Its blind spot — a
   specifier assembled at runtime, or a lazy import reached transitively through
   `@egov-moldova/mud/components` — is stated in the spec's existing comment and in Not verified.
2. Can a rule's letter be met with its intent violated? Instance: the build gate is met by
   `tsc` while the tsconfig turns strict back off. Fixed by Phase 3 Step 0 (strict spec over every
   `packages/*/tsconfig.json`). Second instance: `tsconfig.react19.json`'s `paths` pointing at a
   wrong directory falls back to normal resolution and typechecks against React 18 again, so
   the React 19 check passes vacuously. Third, found at preflight and then measured: without
   `"types": []` every `@types/*` package is auto-included, so the 19 program also loaded the 18
   types (and a `@types/react-19` alias would leak into the 18 program). Fixed by Phase 2 Step 3
   (`"types": []`), Step 2 (alias outside `@types`) and the two `--listFilesOnly` rows, one per program.
3. Numeric targets: none beyond "0 errors" and "exit 0"; each names its command, and every
   0-error claim under Current state was run on 2026-10-01 at `ed49b48b`.
4. Two rules interacting: (a) the build-shape spec and the React 19 config —
   `tsc && tsc -p tsconfig.react19.json` passes the shape while the second `tsc` could check
   nothing new (row 2's fallback); the two `--listFilesOnly` rows are the checks outside both.
   (b) The build-shape spec and the strict spec share one blind spot: a compiler flag on the
   `build` command line (`--strict false`, `--noCheck`, `-p <lax config>`) passes both; stated
   under Not verified (found at round 3). Scanned: the nine zero-tolerance rows pairwise at
   27d547c4; no other pair shares a blind spot.

## Found (outside this plan's scope)

- `toAssetBaseUrl`'s logic now exists in three adapters (`packages/vue/src/plugin.ts`,
  `packages/angular/src/lib/provide-mud.ts`, `packages/react/src/setup.ts`). A shared home would
  be a core export, which this plan may not add. Optional follow-up.
- `scripts/copy-component-assets.mjs:12` still says `cor-logo`. Optional.
- Remove the `defineCustomElements` alias before `mud-react` is first published. Owner's call.
