# Fix Published Package Build — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the tarball published to npm satisfy every entrypoint `package.json` declares, built in production mode, with no development artifacts or build-machine paths — and add a gate that fails the pipeline if that ever stops being true.

**Architecture:** The defects have one root cause: `yarn test.dev` spawns `stencil build --dev` *after* `yarn build`, overwriting the production `dist/` with a development one immediately before `npm publish`. Fix the cause on the publish path (that step stops touching `dist/`), correct three independent contract errors it was masking, then install a publish gate so the class of defect cannot recur silently.

**Scope of the root-cause fix, stated precisely.** Task 2 changes `test.dev`, which is the script the pipeline runs (`pipline-mud-publish-npm.yml`, `Run Tests`). It does **not** change `yarn test` → `check.verify` → `yarn check` / `yarn check.ci`, which go through `scripts/check-test-stderr.mjs`; that wrapper resolves and spawns the `stencil-test` binary (`scripts/check-test-stderr.mjs:41-44`), so those paths keep producing a development `dist/`. That is off the publish path and the gate would catch its output anyway, but a developer who runs `yarn check` locally and then packs by hand still gets a dev bundle. Pointing the wrapper at `vitest` is the obvious follow-up once Task 2 Step 1 proves the suite runs without a built bundle; it is deliberately not in this plan, whose bar is what gets published.

**Tech Stack:** Stencil 4.43.4, Yarn 4 workspaces, Wireit, Vitest 4 (`@stencil/vitest`), Azure Pipelines, Node 24.

**Spec:** [GitHub issue #1 — Published Package Build Validation Issues](https://github.com/egov-moldova/design-system/issues/1), plus the session investigation recorded in *Evidence* below.

## The problem

`@egov-moldova/mud` has shipped a **development** build to npm for at least eighteen versions. Published `1.1.9` carries `isDev: true` in its runtime, 81 source maps, an unminified 6.3 MB lazy bundle, absolute build-machine paths under `dist/types/`, and none of `dist/index.js`, `dist/index.cjs.js`, `dist/esm/`, `dist/cjs/`, `dist/collection/` or `dist/components/` — most of what `package.json` promises.

Nobody noticed because the only published consumer, `@egov-moldova/mud-web-components`, imports exactly the four entrypoints that happened to survive. The React adapter in `react/` imports one that did not, so it cannot work against a published package today.

The symptom this plan removes: a consumer resolving any declared entrypoint other than `/loader` or the type root gets a missing file, and every consumer gets a development runtime.

## Acceptance bar

Zero-tolerance list — each is a FAIL, no tolerance band:

1. Every single-file path `package.json` declares (`main`, `module`, `types`, `unpkg`, `collection`, `collection:main`, `es2015`, `es2017`, and every non-pattern leaf of `exports`) is present in the packed tarball.
1b. Every **pattern** export resolves to at least one real file. A literal existence check is meaningless on `./dist/components/*`, so this is graded by the one property that actually breaks when it is empty: the standalone bundle carries the same assets the lazy bundle does (item 6). Without 1b the bar would exclude exactly the subtree the React adapter resolves assets through, and the gate would report PASS on a bundle that renders empty.
2. Zero `.map` files in the tarball.
3. Zero tarball paths containing a `.stencil` segment or a root build-config basename (`stencil.config.js`, `playwright.config.js`, `vitest-setup.js`).
4. Zero files in the published lazy bundle matching `isDev:\s*true` or `Running in development mode`.
5. `@egov-moldova/mud/loader` (runtime) and `@egov-moldova/mud` (types) still resolve after every task — the two entrypoints published consumers use today.
6. If the lazy bundle ships assets, the standalone custom-elements bundle ships them too. Measured with `dist-custom-elements` enabled: 417 lazy / 0 standalone before the copy step, 417 / 417 after.

Decidable by one named command: **`node scripts/validate-package.mjs`, exit 0**, run against a production build.

The bar is met when that command exits 0 on a production build **and** exits 1 after a `stencil build --dev` is run over that build (Task 6 Step 6). A gate never observed failing is not a gate, so both halves are required.

## Global Constraints

- Node `>=24.0.0 <25.0.0`; Yarn `4.12.0`; Stencil `^4.43.4` — do not change any of these pins.
- All authored content is English: code, comments, commit messages.
- `web-components/src/index.ts` consumes only `@egov-moldova/mud/loader` (runtime) and `@egov-moldova/mud` (types only). These two entrypoints work today and **must keep working** — they are the only ones any published consumer uses.
- `react/src/index.ts:6` consumes `@egov-moldova/mud/dist/components`. This entrypoint is declared but never built by the default build. Decision **A** (confirmed by Dan, 2026-08-26): `dist-custom-elements` moves into the default build, so package contents stop depending on which build flag CI happened to use.
- No new runtime dependencies. The publish gate is a project script with zero dependencies (see *Rejected alternative* under Task 1).
- `git add` names paths explicitly — never `-A`, `.`, `-u`, or `commit -a`.

## Evidence

Reproduced in an isolated worktree at HEAD `9c72e3a`:

| | after `stencil build --docs` (prod) | after `stencil build --dev` over it |
|---|---|---|
| `dist/` | `cjs, collection, esm, index.cjs.js, index.js, mud, types` | **only** `mud, types` |
| `loader/` | 5 files | 5 files (survive — dev mode declares no loader target, so it neither regenerates nor empties them) |
| `.map` files | 0 | **81** — exactly the count issue #1 reports |

Mechanism: `@stencil/vitest/dist/bin/stencil-test.js:611-618` spawns `npx stencil build --dev` unless `--prod` is passed. `@stencil/core/compiler/stencil.js:275164` sets `buildDist = !devMode`, and `stencil.js:273927-273960` gates `dist/collection`, `dist/esm`, `dist/cjs`, `dist/index.js`, `dist/index.cjs.js` and `loader/` behind `buildDist`. This repo's `stencil.config.ts:14` sets `sourceMap = isDevMode && !isWatchMode`, which is why a non-watch dev build emits the 81 maps.

Published `1.1.9` confirms the outcome: `dist/mud/p-DckhwNz2.js` contains `isDev: true` and `dist/mud/mud.esm.js` contains `"Running in development mode."`.

Two further contract errors are **not** caused by the dev build and survive its fix:

1. `es2015` / `es2017` declare `dist/esm/index.mjs`. A correct production build emits `dist/esm/index.js` — `index.mjs` has never existed.
2. `tsconfig.json:26` has `"include": ["src", "types", "*.ts"]`, pulling `stencil.config.ts`, `playwright.config.ts` and `vitest-setup.ts` into the Stencil TypeScript program. A production build emits them as `dist/stencil.config.js`, `dist/playwright.config.js`, `dist/vitest-setup.js`; on CI, where Stencil resolves them via `.stencil/`, their declarations land under `dist/types/home/vsts/work/1/s/.stencil/`.

## Self-refute log

Four questions asked against this plan before it was reviewed. Each row is either an instance plus the step that fixes it, or `no instance` plus what was scanned.

**1. Does the fix reuse the defect's own mechanism class?** The defect is a build step silently overwriting another step's output. `no instance` for the honesty-reliance half — the gate asks no actor to self-report; `packedFileList()` asks the packer itself. Its inverse is paired, not assumed: Task 6 Step 6 reintroduces the real defect (`stencil build --dev`) and requires the gate to go red. A gate never seen to fail is not a gate.

  **One residual, stated rather than waved past.** An earlier draft of this row claimed "the instrument and the published artifact cannot disagree". That was false as written and is withdrawn. The gate measures `yarn pack --dry-run`; the pipeline publishes with `npm publish` (`pipline-mud-publish-npm.yml:53`), which is a different tool operating at a later moment. Two things bound the residual, and neither is an argument that it is zero: the two packers were compared on this exact package and produced **identical** 1477-file lists (Task 6 Step 3 re-derives this and fails the gate if it ever stops holding), and the gate is anchored as the last step before publish, so nothing in the pipeline writes between them. The window is real and is accepted, not closed. Closing it would mean packing a real tarball and publishing that artifact (`npm publish <tarball>`), which changes what `npm publish` does on the release path — a larger change than the window justifies today.

**2. Can the rule's letter be met with its intent violated?** *Instance.* `checkDevSignature` filtered on the literal prefix `dist/mud/`. Renaming the Stencil namespace (`stencil.config.ts:69`) moves the bundle, and the check would then scan a directory that does not exist — reporting "no development runtime" forever while being structurally incapable of finding one. Fixed in Task 1 Step 3: `lazyBundleDir(pkg)` derives the directory from the `unpkg` field, which is itself part of the contract the gate validates, and throws rather than degrading to a vacuous scan when that field is unusable. Covered by three assertions in Task 1 Step 1.

**3. Has every numeric target a denominator, a minimum n, and an instrument outside what it grades?** `no instance` — this plan sets no numeric target. Its bar is binary and decidable by one named command (`node scripts/validate-package.mjs`, exit 0). The 81-map and file-count figures in *Evidence* are observations of a reproduced state, not thresholds. The instrument-outside condition is met by Task 6 Step 5, which grades the gate against a deliberately broken build rather than against the fixed one it was written alongside.

**4. Do any two of the plan's own rules interact into a pass nobody intended?** *Two instances, both found by probing the repo rather than by reading the plan.*

- `wireit.build.files` (`package.json`) lists `tsconfig.json` but not `tsconfig.stencil.json`. Task 4 makes the latter drive the Stencil program, so after Task 4 an edit to the file that decides what gets compiled would leave the cached build valid and the edit unapplied — each rule correct alone, the pair silently stale. Confirmed: `node -e "…wireit.build.files.includes('tsconfig.stencil.json')"` → `NOT TRACKED`. Fixed in Task 4 Step 3, for both `build` and `dx:stencil:once`.
- Task 2's fallback branch moves `Run Tests` above `Build All`, while Task 6 Step 2 originally anchored the gate's position to `Run Tests`. Taken together they place the gate before the build, where it fails on an absent `dist/` for a reason unrelated to the defect. Fixed in Task 6 Step 2: the gate is anchored to the publish step and to the set of steps that write `dist/`, neither of which the fallback moves.

---

## Requirement coverage — every item issue #1 reported

| # | Issue #1 item | Disposition |
|---|---|---|
| 1 | `main` → `dist/index.cjs.js` — Missing | Task 2 (root cause: the dev rebuild deleted it) |
| 2 | `module` → `dist/index.js` — Missing | Task 2 |
| 3 | `types` → `dist/types/index.d.ts` — Present | No task. Verified still present after every task (Tasks 3 Step 4, 4 Step 5) |
| 4 | `collection` → `dist/collection/collection-manifest.json` — Missing | Task 2 |
| 5 | `collection:main` → `dist/collection/index.js` — Missing | Task 2 |
| 6 | `es2015` → `dist/esm/index.mjs` — Missing | Task 5. Not a lost artifact — the declared filename has never existed; the build emits `dist/esm/index.js` |
| 7 | `es2017` → `dist/esm/index.mjs` — Missing | Task 5, same cause |
| 8 | `exports["."].import` — Missing | Task 2 |
| 9 | `exports["."].require` — Missing | Task 2 |
| 10 | `exports["."].types` — Present | No task; regression-guarded as item 3 |
| 11 | `exports["./loader"].import` — Present | No task; regression-guarded (Task 3 Step 4) |
| 12 | `exports["./loader"].require` — Present | No task; regression-guarded |
| 13 | `exports["./dist/components"].import` — Missing | Task 3 — the target was never built outside `--react`. Task 3 Step 2 additionally fixes the assets that would have shipped missing |
| 14 | `exports["./dist/components"].types` — Missing | Task 3 |
| 15 | 81 `.map` files, 1.98 MB of 5.60 MB — "development-build signature" | Task 2. A production build emits zero maps (`sourceMap` is `isDevMode && !isWatchMode`, `stencil.config.ts:14`) |
| 16 | Leaked build config paths under `dist/types/home/vsts/…/.stencil/` | Task 4 |
| 17 | `react/package.json:23` — `"@egov-moldova/mud": "portal:.."` — "not yet been triggered, but should be reviewed" | **Deferred to the follow-up task**, deliberately. Reviewed and confirmed real; shipped outside this plan because its lockfile commit is a risk on the release path for a defect that cannot currently fire. Reasoning at the follow-up task's own heading |

Items not in issue #1 that this plan adds, and why each is not scope creep: the publish gate (Tasks 1, 6) is the mechanism that keeps items 1-16 fixed rather than fixed-once; the `dist/components/assets/` copy (Task 3 Step 2) is a defect item 13's fix would otherwise introduce.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `scripts/validate-package.mjs` | Publish gate — pure predicates over a packed file list plus a thin I/O shell. Create. | 1 |
| `scripts/__tests__/validate-package.spec.mjs` | Unit tests for those predicates. Create. | 1 |
| `package.json` (`scripts.test.dev`) | Stop the test runner from rebuilding `dist/`. Modify. | 2 |
| `stencil.config.ts` | Emit `dist-custom-elements` unconditionally; give Stencil its own tsconfig. Modify. | 3, 4 |
| `tsconfig.stencil.json` | Stencil-only TypeScript program, scoped to `src`. Create. | 4 |
| `package.json` (`es2015`, `es2017`) | Point at the file the build actually emits. Modify. | 5 |
| `package.json` (`scripts.validate.package`) | Expose the gate to CI. Modify. | 6 |
| `pipline-mud-publish-npm.yml` | Run the gate between build and publish. Modify. | 6 |
| `react/package.json` | Remove the Yarn-only `portal:` protocol from a publish-armed package. Modify. | 7 |

## Verification procedure (used by Tasks 2-6)

A `yarn dev` watch server may be running against the working tree; a production build in place would fight it. Every build check in this plan runs against a throwaway copy:

**Run every step below on Node 24, and install it first if it is missing.** `package.json` pins `>=24.0.0 <25.0.0` and CI installs `24.x`. `node --test`, the packer's JSON shape and Stencil's bundled TypeScript all cross a major boundary, so a proof taken on another major is not a proof of what CI will do.

```bash
fnm install 24 && fnm use 24 && node --version    # expect v24.x
```

**Honest limit on the evidence already in this plan.** Every figure quoted here — the 1477-file packer comparison, the `MISSING (4)` / `FORBIDDEN (6)` / `ABSOLUTE (3)` red bar, the 417-file asset counts — was measured on **v26.3.0**, because `fnm list` on this machine holds only `v26.3.0` and `system`. Those numbers are about the repo, not about the runtime, and Stencil produced byte-identical output structure on both the dev and production paths there; but they have not been reproduced on Node 24. Re-take the red bar on Node 24 at Task 1 Step 5 and treat any divergence as the plan's model being wrong, not as noise.

```bash
# From the repo root, on Node 24. Copies the WORKING TREE (uncommitted edits included).
verify_build() {
  node --version | grep -q '^v24\.' || { echo "wrong Node major — run 'fnm use 24'"; return 1; }
  local dest="${TMPDIR:-/tmp}/mud-verify"
  rm -rf "$dest" && mkdir -p "$dest"
  rsync -a --exclude node_modules --exclude .git --exclude dist \
        --exclude loader --exclude .wireit --exclude .stencil ./ "$dest/"
  ln -s "$PWD/node_modules" "$dest/node_modules"
  ( cd "$dest" && NODE_OPTIONS=--max-old-space-size=4096 npx stencil build --docs \
      && node scripts/copy-component-assets.mjs )
}
```

The asset-copy call is not decoration: Task 3 Step 2 adds it to `wireit.build.command`, not to `stencil build`, so a helper that ran `stencil build` alone would produce an empty `dist/components/assets/` and make the plan's own green bar unreachable. The helper must build what the pipeline publishes.

`rsync` is present on macOS and on the Azure `ubuntu` image. The symlinked `node_modules` is read-only in practice — Stencil writes only to `dist/`, `loader/`, `.stencil/`.

---

### Task 1: Publish gate — write it first, watch it fail

The gate is this plan's test. It runs against today's build and must report the exact defects issue #1 lists; Tasks 2-5 are done when it reports none.

**Files:**
- Create: `scripts/validate-package.mjs`
- Test: `scripts/__tests__/validate-package.spec.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `PROJECT_ROOT: string`, `ENTRY_FIELDS: string[]`, `FORBIDDEN_SEGMENTS: string[]`, `DEV_BUILD_MARKERS: RegExp[]`, `normalizePackagePath(target: string): string`, `collectDeclaredEntries(pkg: object): {source: string, target: string}[]`, `checkDeclaredEntries(entries, packedFiles: string[]): {source, target}[]`, `checkForbiddenPaths(packedFiles: string[]): string[]`, `checkSourceMaps(packedFiles: string[]): string[]`, `lazyBundleDir(pkg: object): string`, `checkDevSignature(packedFiles: string[], readText: (file: string) => string, bundleDir: string): string[]`, `standaloneBundleDir(pkg: object): string`, `checkBundleAssets(packedFiles: string[], lazyDir: string, standaloneDir: string): string[]`, `ABSOLUTE_PATH_ROOTS: string[]`, `checkAbsolutePaths(packedFiles: string[]): string[]`, `packedFileList(cwd?: string): string[]`, `main(options?: {cwd?, log?, error?}): number`. Task 6 calls the script through `yarn validate.package`.

**Rejected alternative — record it, do not re-litigate it:** `publint` is the standard tool for entrypoint/contract validation and would cover the `checkDeclaredEntries` half. It is rejected here because it covers *only* that half: the development-build signature (source maps, `isDev: true`) and the build-machine path leak are this repo's specific failure mode and would still need a project script. One script with zero new dependencies beats a dependency plus a script. Revisit if the contract grows conditions (`browser`, `react-native`) where publint's rule set earns its keep.

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/validate-package.spec.mjs`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkDeclaredEntries,
  checkDevSignature,
  checkForbiddenPaths,
  checkAbsolutePaths,
  checkBundleAssets,
  checkSourceMaps,
  collectDeclaredEntries,
  lazyBundleDir,
  normalizePackagePath,
  standaloneBundleDir,
} from '../validate-package.mjs';

const PKG = {
  main: 'dist/index.cjs.js',
  module: 'dist/index.js',
  types: 'dist/types/index.d.ts',
  unpkg: 'dist/mud/mud.esm.js',
  collection: 'dist/collection/collection-manifest.json',
  'collection:main': 'dist/collection/index.js',
  es2015: 'dist/esm/index.js',
  es2017: 'dist/esm/index.js',
  exports: {
    '.': {
      types: './dist/types/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs.js',
    },
    './loader': {
      types: './loader/index.d.ts',
      import: './loader/index.js',
      require: './loader/index.cjs.js',
    },
    './dist/mud/tokens/*.css': './dist/mud/tokens/*.css',
    './dist/components': {
      types: './dist/components/index.d.ts',
      import: './dist/components/index.js',
    },
  },
};

describe('normalizePackagePath', () => {
  it('strips the leading ./ that exports entries carry', () => {
    assert.equal(normalizePackagePath('./dist/index.js'), 'dist/index.js');
  });

  it('leaves a bare field value untouched', () => {
    assert.equal(normalizePackagePath('dist/index.js'), 'dist/index.js');
  });
});

describe('collectDeclaredEntries', () => {
  it('collects every single-file field and every exports leaf', () => {
    const sources = collectDeclaredEntries(PKG).map((entry) => entry.source);
    assert.ok(sources.includes('main'));
    assert.ok(sources.includes('collection:main'));
    assert.ok(sources.includes('$.exports[.][import]'));
    assert.ok(sources.includes('$.exports[./dist/components][types]'));
  });

  it('skips subpath patterns, which resolve to many files', () => {
    const targets = collectDeclaredEntries(PKG).map((entry) => entry.target);
    assert.ok(!targets.some((target) => target.includes('*')));
  });

  it('tolerates a package.json with no exports field', () => {
    assert.deepEqual(collectDeclaredEntries({ main: 'a.js' }), [
      { source: 'main', target: 'a.js' },
    ]);
  });
});

describe('checkDeclaredEntries', () => {
  it('reports a declared entry that is absent from the tarball', () => {
    const packed = ['dist/index.cjs.js', 'dist/types/index.d.ts'];
    const missing = checkDeclaredEntries(collectDeclaredEntries(PKG), packed);
    assert.ok(missing.some((entry) => entry.target === 'dist/collection/index.js'));
    assert.ok(!missing.some((entry) => entry.target === 'dist/index.cjs.js'));
  });

  it('matches an exports leaf against its ./-stripped path', () => {
    const missing = checkDeclaredEntries(
      [{ source: '$.exports[.][import]', target: './dist/index.js' }],
      ['dist/index.js'],
    );
    assert.deepEqual(missing, []);
  });
});

describe('checkForbiddenPaths', () => {
  it('flags a leaked build-machine declaration directory', () => {
    const packed = [
      'dist/types/index.d.ts',
      'dist/types/home/vsts/work/1/s/.stencil/stencil.config.d.ts',
    ];
    assert.deepEqual(checkForbiddenPaths(packed), [
      'dist/types/home/vsts/work/1/s/.stencil/stencil.config.d.ts',
    ]);
  });

  it('flags a root config compiled into dist', () => {
    assert.deepEqual(checkForbiddenPaths(['dist/vitest-setup.js']), ['dist/vitest-setup.js']);
  });

  it('passes a clean tarball', () => {
    assert.deepEqual(checkForbiddenPaths(['dist/index.js', 'loader/index.js']), []);
  });
});

describe('standaloneBundleDir', () => {
  it('derives the directory from the exports entry', () => {
    assert.equal(standaloneBundleDir(PKG), 'dist/components/');
  });

  it('throws rather than silently disabling the asset check', () => {
    assert.throws(() => standaloneBundleDir({ exports: {} }), /cannot locate the standalone bundle/);
  });
});

describe('checkBundleAssets', () => {
  it('flags a standalone bundle shipped without the assets the lazy one has', () => {
    const packed = ['dist/mud/assets/icon.svg', 'dist/components/index.js'];
    assert.deepEqual(checkBundleAssets(packed, 'dist/mud/', 'dist/components/'), [
      'dist/components/assets/ is empty while dist/mud/assets/ carries 1 file(s)',
    ]);
  });

  it('passes when both carry assets', () => {
    const packed = ['dist/mud/assets/icon.svg', 'dist/components/assets/icon.svg'];
    assert.deepEqual(checkBundleAssets(packed, 'dist/mud/', 'dist/components/'), []);
  });

  it('is silent when the package has no assets at all', () => {
    assert.deepEqual(checkBundleAssets(['dist/mud/mud.esm.js'], 'dist/mud/', 'dist/components/'), []);
  });

});

describe('checkAbsolutePaths', () => {
  it('flags a declaration emitted under a Linux build-machine path', () => {
    const packed = ['dist/types/home/vsts/work/1/s/.stencil/stencil.config.d.ts'];
    assert.deepEqual(checkAbsolutePaths(packed), packed);
  });

  it('flags a macOS one', () => {
    const packed = ['dist/types/Users/Dan/WORK/x/.stencil/vitest-setup.d.ts'];
    assert.deepEqual(checkAbsolutePaths(packed), packed);
  });

  it('does not flag dist/types/private, a directory this build really emits', () => {
    assert.deepEqual(checkAbsolutePaths(['dist/types/private/thing.d.ts']), []);
  });
});

describe('checkSourceMaps', () => {
  it('flags any .map file', () => {
    assert.deepEqual(checkSourceMaps(['dist/mud/mud.esm.js', 'dist/mud/mud.esm.js.map']), [
      'dist/mud/mud.esm.js.map',
    ]);
  });
});

describe('lazyBundleDir', () => {
  it('derives the bundle directory from the unpkg field', () => {
    assert.equal(lazyBundleDir(PKG), 'dist/mud/');
  });

  it('follows a renamed Stencil namespace without an edit here', () => {
    assert.equal(lazyBundleDir({ unpkg: 'dist/age/age.esm.js' }), 'dist/age/');
  });

  it('throws rather than silently scanning nothing when unpkg is unusable', () => {
    assert.throws(() => lazyBundleDir({}), /cannot locate the lazy bundle/);
    assert.throws(() => lazyBundleDir({ unpkg: 'mud.esm.js' }), /cannot locate the lazy bundle/);
  });
});

describe('checkDevSignature', () => {
  const DIR = 'dist/mud/';

  it('flags a lazy bundle built in development mode', () => {
    const packed = ['dist/mud/p-abc.js', 'dist/mud/mud.esm.js'];
    const contents = {
      'dist/mud/p-abc.js': 'const BUILD = { isDev: true, isTesting: false };',
      'dist/mud/mud.esm.js': 'var patchBrowser = () => {};',
    };
    assert.deepEqual(checkDevSignature(packed, (file) => contents[file], DIR), [
      'dist/mud/p-abc.js',
    ]);
  });

  it('flags the development-mode console notice', () => {
    const packed = ['dist/mud/mud.esm.js'];
    const contents = { 'dist/mud/mud.esm.js': 'consoleDevInfo("Running in development mode.")' };
    assert.deepEqual(checkDevSignature(packed, (file) => contents[file], DIR), [
      'dist/mud/mud.esm.js',
    ]);
  });

  it('passes a minified production bundle', () => {
    const packed = ['dist/mud/p-abc.js'];
    const contents = { 'dist/mud/p-abc.js': 'const B={isDev:!1,isTesting:!1};' };
    assert.deepEqual(checkDevSignature(packed, (file) => contents[file], DIR), []);
  });

  it('ignores files outside the lazy bundle', () => {
    const packed = ['dist/collection/thing.js'];
    const contents = { 'dist/collection/thing.js': 'isDev: true' };
    assert.deepEqual(checkDevSignature(packed, (file) => contents[file], DIR), []);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
node --test "scripts/__tests__/validate-package.spec.mjs"
```

Expected: FAIL — `Cannot find module .../scripts/validate-package.mjs`.

- [ ] **Step 3: Write the implementation**

Create `scripts/validate-package.mjs`:

```js
#!/usr/bin/env node
/**
 * Publish gate — proves the tarball npm would publish satisfies the contract
 * package.json declares, and carries no development-build artifacts.
 *
 * Run after a production build and before `npm publish`. Exits non-zero on the
 * first category that has offenders, printing every offender in every category
 * so one CI run reports the whole picture.
 *
 * Background: @egov-moldova/mud 1.0.x-1.1.9 shipped a development bundle with
 * most declared entrypoints absent, because the test step rebuilt dist/ in dev
 * mode after the production build. See GitHub issue #1.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** package.json fields whose value names exactly one entry file. */
export const ENTRY_FIELDS = [
  'main',
  'module',
  'types',
  'unpkg',
  'collection',
  'collection:main',
  'es2015',
  'es2017',
];

/**
 * Path segments that only ever appear in build-machine artifacts. `.stencil` is
 * Stencil's cache/staging directory; the three config basenames are root-level
 * TypeScript files that must not enter the published program.
 */
export const FORBIDDEN_SEGMENTS = [
  '.stencil',
  'stencil.config.js',
  'playwright.config.js',
  'vitest-setup.js',
];

/**
 * Markers Stencil leaves in a lazy bundle built with `--dev`. A production
 * build minifies `isDev` to `!1` and drops the notice, so neither can match.
 */
export const DEV_BUILD_MARKERS = [/\bisDev:\s*true\b/, /Running in development mode/];

/** Strips the leading `./` that `exports` values carry and tarball paths do not. */
export function normalizePackagePath(target) {
  return target.replace(/^\.\//, '');
}

function walkExports(node, trail, entries) {
  if (typeof node === 'string') {
    entries.push({ source: trail, target: node });
    return;
  }
  if (node === null || typeof node !== 'object') {
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    // A subpath pattern resolves to many files; a literal existence check on it
    // would be meaningless. Its directory is covered by the sibling literals.
    if (key.includes('*')) {
      continue;
    }
    walkExports(child, `${trail}[${key}]`, entries);
  }
}

/** Every single-file path package.json declares, each tagged with where it came from. */
export function collectDeclaredEntries(pkg) {
  const entries = [];
  for (const field of ENTRY_FIELDS) {
    if (typeof pkg[field] === 'string') {
      entries.push({ source: field, target: pkg[field] });
    }
  }
  walkExports(pkg.exports, '$.exports', entries);
  return entries.filter((entry) => !entry.target.includes('*'));
}

export function checkDeclaredEntries(entries, packedFiles) {
  const packed = new Set(packedFiles);
  return entries.filter((entry) => !packed.has(normalizePackagePath(entry.target)));
}

export function checkForbiddenPaths(packedFiles) {
  return packedFiles.filter((file) =>
    file.split('/').some((segment) => FORBIDDEN_SEGMENTS.includes(segment)),
  );
}

export function checkSourceMaps(packedFiles) {
  return packedFiles.filter((file) => file.endsWith('.map'));
}

/**
 * The directory the lazy browser bundle is published into, derived from the
 * `unpkg` field rather than hardcoded. Hardcoding `dist/mud/` would make this
 * check answer "no dev build" by scanning a directory that no longer exists
 * the moment the Stencil namespace is renamed — the rule's letter met with its
 * intent violated. Throws instead of degrading to a vacuous scan.
 */
export function lazyBundleDir(pkg) {
  if (typeof pkg.unpkg !== 'string' || !pkg.unpkg.includes('/')) {
    throw new Error(
      'validate-package: cannot locate the lazy bundle — package.json has no usable "unpkg" field',
    );
  }
  return `${path.posix.dirname(normalizePackagePath(pkg.unpkg))}/`;
}

export function checkDevSignature(packedFiles, readText, bundleDir) {
  return packedFiles
    .filter((file) => file.startsWith(bundleDir) && file.endsWith('.js'))
    .filter((file) => DEV_BUILD_MARKERS.some((marker) => marker.test(readText(file))));
}

/**
 * Where `exports["./dist/components"]` points. Throws rather than returning
 * null: a null would make `checkBundleAssets` a silent no-op, which is the same
 * vacuous-scan failure `lazyBundleDir` exists to avoid one function up. If the
 * standalone bundle is ever dropped from the contract deliberately, drop
 * acceptance-bar items 1b and 6 with it — do not let the check quietly stop
 * grading while the gate still reports PASS.
 */
export function standaloneBundleDir(pkg) {
  const target = pkg.exports?.['./dist/components']?.import;
  if (typeof target !== 'string' || !target.includes('/')) {
    throw new Error(
      'validate-package: cannot locate the standalone bundle — exports["./dist/components"].import is missing or unusable',
    );
  }
  return `${path.posix.dirname(normalizePackagePath(target))}/`;
}

/**
 * The standalone custom-elements bundle resolves `getAssetPath('./assets/x')`
 * relative to itself, but Stencil's `dist-custom-elements` target silently
 * ignores `assetsDirs` — `scripts/copy-component-assets.mjs` mirrors them in as
 * a post-build step. Without it a component with assets "renders empty
 * silently" (that script's own words). Nothing else in the tarball reveals it:
 * `exports["./dist/components/*"]` is a pattern, so checkDeclaredEntries skips
 * it by design.
 */
export function checkBundleAssets(packedFiles, lazyDir, standaloneDir) {
  const lazy = packedFiles.filter((file) => file.startsWith(`${lazyDir}assets/`));
  if (lazy.length === 0) {
    return [];
  }
  const standalone = packedFiles.filter((file) => file.startsWith(`${standaloneDir}assets/`));
  return standalone.length === 0
    ? [`${standaloneDir}assets/ is empty while ${lazyDir}assets/ carries ${lazy.length} file(s)`]
    : [];
}

/**
 * Filesystem roots that can only appear in a tarball path when a declaration
 * was emitted under an absolute build-machine path. Deliberately just these
 * two plus a Windows drive letter: `root`, `var` and `private` were considered
 * and dropped because `dist/types/private/` is a real directory this build
 * emits. This asserts a shape rather than enumerating today's offending
 * basenames, which FORBIDDEN_SEGMENTS does and which goes stale.
 */
export const ABSOLUTE_PATH_ROOTS = ['home', 'Users'];

export function checkAbsolutePaths(packedFiles) {
  return packedFiles.filter((file) =>
    file
      .split('/')
      .slice(1)
      .some((segment) => ABSOLUTE_PATH_ROOTS.includes(segment) || /^[A-Za-z]:$/.test(segment)),
  );
}

/**
 * The exact file list that would be published — `files`, ignore rules and the
 * packer's own built-in rules all applied. Asking the packer beats
 * reimplementing its rules.
 *
 * Yarn, because this repo is Yarn 4 (`packageManager` in package.json) and
 * `web-components` already publishes with `yarn npm publish`. Two properties
 * make it the better instrument here, both measured rather than assumed:
 *
 *   1. `yarn pack --dry-run` runs NO lifecycle script — neither `prepare` nor
 *      `prepack`. `npm pack --dry-run` runs `prepare`, and a `prepare` that
 *      exits non-zero aborts the pack with that code. This package's `prepare`
 *      is `husky install && …` (package.json:49), so an npm-based gate would
 *      reinstall git hooks as a side effect of a read-only validation.
 *   2. On this package the two packers agree exactly — 1477 files, zero
 *      difference. Re-derive rather than trusting this sentence; Task 6 Step 3
 *      is the step that owns it.
 *
 * Output is NDJSON: one `{"base":…}` line, then one `{"location":…}` per file,
 * with no `package/` prefix.
 */
export function packedFileList(cwd = PROJECT_ROOT) {
  const raw = execFileSync('yarn', ['pack', '--dry-run', '--json'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return raw
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line))
    .filter((entry) => typeof entry.location === 'string')
    .map((entry) => entry.location);
}

export function main({ cwd = PROJECT_ROOT, log = console.log, error = console.error } = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const declared = collectDeclaredEntries(pkg);
  const files = packedFileList(cwd);
  const readText = (file) => fs.readFileSync(path.join(cwd, file), 'utf8');

  const categories = [
    [
      'declared entrypoint missing from tarball',
      checkDeclaredEntries(declared, files).map((entry) => `${entry.source} -> ${entry.target}`),
    ],
    ['build-machine artifact in tarball', checkForbiddenPaths(files)],
    ['absolute build-machine path in tarball', checkAbsolutePaths(files)],
    [
      'standalone bundle published without its assets',
      checkBundleAssets(files, lazyBundleDir(pkg), standaloneBundleDir(pkg)),
    ],
    ['source map in tarball (development build)', checkSourceMaps(files)],
    [
      'development runtime in tarball',
      // Both runtime bundles, not just the lazy one: after the custom-elements
      // target became unconditional the tarball carries two, and the goal says
      // "no development-build artifacts", not "none in the lazy bundle".
      [lazyBundleDir(pkg), standaloneBundleDir(pkg)].flatMap((dir) =>
        checkDevSignature(files, readText, dir),
      ),
    ],
  ];

  const failures = categories.filter(([, offenders]) => offenders.length > 0);

  if (failures.length === 0) {
    log(
      `validate-package: PASS — ${files.length} files packed, ` +
        `${declared.length}/${declared.length} declared entrypoints present`,
    );
    return 0;
  }

  for (const [label, offenders] of failures) {
    error(`validate-package: FAIL — ${label} (${offenders.length})`);
    for (const offender of offenders) {
      error(`  ${offender}`);
    }
  }
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
node --test "scripts/__tests__/validate-package.spec.mjs"
```

Expected: PASS, all assertions.

- [ ] **Step 5: See the gate go red against the real build**

Build a production tarball from the current working tree and run the gate against it:

```bash
verify_build   # the function from "Verification procedure" above
cd "${TMPDIR:-/tmp}/mud-verify" && node scripts/validate-package.mjs; echo "exit=$?"
```

Expected: `exit=1`, with exactly these offenders. This is a transcript of a real run of these predicates against a production build of this repo, not an estimate:

```
validate-package: FAIL — declared entrypoint missing from tarball (4)
  es2015 -> dist/esm/index.mjs
  es2017 -> dist/esm/index.mjs
  $.exports[./dist/components][types] -> ./dist/components/index.d.ts
  $.exports[./dist/components][import] -> ./dist/components/index.js
validate-package: FAIL — build-machine artifact in tarball (6)
  dist/playwright.config.js
  dist/stencil.config.js
  dist/types/<abs-path>/.stencil/playwright.config.d.ts
  dist/types/<abs-path>/.stencil/stencil.config.d.ts
  dist/types/<abs-path>/.stencil/vitest-setup.d.ts
  dist/vitest-setup.js
validate-package: FAIL — absolute build-machine path in tarball (3)
  dist/types/<abs-path>/.stencil/playwright.config.d.ts
  dist/types/<abs-path>/.stencil/stencil.config.d.ts
  dist/types/<abs-path>/.stencil/vitest-setup.d.ts
```

`<abs-path>` is the machine's own checkout path — `Users/Dan/WORK/…` locally, `home/vsts/work/1/s` on the Azure agent. The three `.stencil` declarations appear under BOTH the forbidden-segment and absolute-path categories; that overlap is expected, not a bug.

The count is 17 declared entries, 4 missing. `source map` and `development runtime` report zero here, because this bar is taken on a production build — they fire in Task 6 Step 5, which is where the dev-build regression is proved.

A fourth category fires too, and it must be in the transcript you record:

```
validate-package: FAIL — standalone bundle published without its assets (1)
  dist/components/assets/ is empty while dist/mud/assets/ carries 417 file(s)
```

`exports["./dist/components"]` is always declared, so `standaloneBundleDir` always resolves; before Task 3 the directory simply is not built, and before Task 3 Step 2 it is built without assets. Both states are the same failure to a consumer, and the gate reports both.

Record the actual output. A category reporting something not listed above means the plan's model of the defect is wrong somewhere — stop and reconcile before continuing.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-package.mjs scripts/__tests__/validate-package.spec.mjs
git commit -m "feat(scripts): add publish gate validating the published tarball"
```

---

### Task 2: Stop the test runner from rebuilding dist/

Root cause. `stencil-test` spawns `stencil build --dev`; the `spec` project does not need a built bundle, because `stencilVitestPlugin()` compiles each `.tsx` from source in Vite's transform pipeline — `vitest-setup.ts:1-9` states this outright ("No dist lazy-bundle loader is needed here").

**Files:**
- Modify: `package.json:78` (`scripts.test.dev`)
- Modify: `AGENTS.md:128` — it documents `test.dev` as "`stencil-test --project spec` — fast run without wireit-level cache (rebuilds Stencil once)". Left alone, the repo's own agent-facing convention file would tell the next agent the opposite of what the script does. Replace that line with:

```
yarn test.dev                  # `vitest --project spec --run` — compiles components from source; does not build dist
```

**Interfaces:**
- Consumes: nothing.
- Produces: `yarn test.dev` runs the `spec` suite without writing to `dist/`. The `test` wireit script (`scripts.test` → `node scripts/check-test-stderr.mjs --project spec`) is untouched and keeps its own path.

- [ ] **Step 1: Prove the suite passes without a dist bundle**

Run the runner this task will switch to, against a tree with no `dist/`:

```bash
rm -rf "${TMPDIR:-/tmp}/mud-nodist" && mkdir -p "${TMPDIR:-/tmp}/mud-nodist"
rsync -a --exclude node_modules --exclude .git --exclude dist --exclude loader \
      --exclude .wireit --exclude .stencil ./ "${TMPDIR:-/tmp}/mud-nodist/"
ln -s "$PWD/node_modules" "${TMPDIR:-/tmp}/mud-nodist/node_modules"
cd "${TMPDIR:-/tmp}/mud-nodist" && npx vitest --project spec --run; echo "exit=$?"
```

Expected: `exit=0`, and no `dist/` directory created:

```bash
test -d "${TMPDIR:-/tmp}/mud-nodist/dist" && echo "REGRESSION: dist was written" || echo "ok: dist untouched"
```

**If this step fails**, do not proceed to Step 2. Fall back to the reviewed alternative: leave `test.dev` as-is and instead move `yarn test.dev` above `yarn build` in `pipline-mud-publish-npm.yml` (Task 6 wires the same gate either way). Record which branch was taken in the completion report.

- [ ] **Step 2: Switch the script**

In `package.json`, replace:

```json
    "test.dev": "stencil-test --project spec",
```

with:

```json
    "test.dev": "vitest --project spec --run",
```

- [ ] **Step 3: Verify the production build now survives the test step**

```bash
verify_build
cd "${TMPDIR:-/tmp}/mud-verify" && yarn test.dev && ls dist
```

Expected: tests pass, and `ls dist` still shows `cjs collection esm index.cjs.js index.js mud types` — the set the production build produced, unchanged.

- [ ] **Step 4: Confirm the gate lost its dev-build findings**

```bash
cd "${TMPDIR:-/tmp}/mud-verify" && node scripts/validate-package.mjs; echo "exit=$?"
```

Expected: still `exit=1`, but the `source map` and `development runtime` categories are now **absent**; only the `es2015/es2017`, `dist/components` and build-machine-artifact offenders remain (Tasks 3-5).

- [ ] **Step 5: Commit**

```bash
git add package.json AGENTS.md
git commit -m "fix(test): run spec suite via vitest so it stops rebuilding dist in dev mode"
```

---

### Task 3: Emit dist-custom-elements in the default build

Decision A. `stencil.config.ts:57` adds `dist-custom-elements` only under `--react`, but `package.json` declares `exports["./dist/components"]` unconditionally and `react/src/index.ts:6` imports from it. Package contents must not depend on which flag CI used.

**Files:**
- Modify: `stencil.config.ts:49-73`

**Interfaces:**
- Consumes: nothing.
- Produces: `dist/components/index.js` and `dist/components/index.d.ts` in every build. `--react` keeps its remaining job: generating the React proxies into `react/src/components/stencil-generated`.

- [ ] **Step 1: Move the output target out of the flag branch**

In `stencil.config.ts`, the block currently reads:

```ts
if (isReactBuild) {
  // Note: Stencil's `dist-custom-elements` target ignores the `copy` option for
  // ...
  outputTargets.push({ type: 'dist-custom-elements', externalRuntime: false });
  outputTargets.push(
    react({
      outDir: 'react/src/components/stencil-generated',
      esModules: true,
      stencilPackageName: '@egov-moldova/mud',
      excludeComponents: [],
    }),
  );
}
```

Replace it with:

```ts
// The standalone custom-elements bundle is part of the published contract —
// `package.json` declares `exports["./dist/components"]` unconditionally and
// `react/src/index.ts` imports `setAssetPath` from it. It is therefore built
// always, not only under `--react`; package contents must not depend on which
// flag CI happened to pass.
//
// Note: Stencil's `dist-custom-elements` target ignores the `copy` option for
// `assetsDirs` declared on components (Stencil v4 bug/limitation — copy on
// this target type silently no-ops). See `scripts/copy-component-assets.mjs`
// for the post-build copy that mirrors `dist/mud/assets/` into
// `dist/components/assets/` so consumers of the standalone bundle (React
// wrappers) can resolve `getAssetPath('./assets/foo.svg')` correctly.
// `!isDevMode` rather than unconditional: the requirement is that the PUBLISHED
// build stop depending on `--react`, and `yarn dev` / `yarn start` rebuild in
// watch mode many times an hour. A second full component bundle per rebuild is
// broader than the requirement, in a config whose every other branch carries a
// PERF rationale for exactly this cost.
if (isReactBuild || !isDevMode) {
  outputTargets.push({ type: 'dist-custom-elements', externalRuntime: false });
}

// React proxies remain opt-in: they are generated into the React workspace,
// not into the published package, so `yarn build.react` still owns them.
if (isReactBuild) {
  outputTargets.push(
    react({
      outDir: 'react/src/components/stencil-generated',
      esModules: true,
      stencilPackageName: '@egov-moldova/mud',
      excludeComponents: [],
    }),
  );
}
```

- [ ] **Step 2: Move the asset copy into the always-on build**

Emitting `dist/components/` without its assets ships a bundle that fails silently. Stencil's `dist-custom-elements` target ignores `assetsDirs`; `scripts/copy-component-assets.mjs` mirrors `dist/mud/assets/` into `dist/components/assets/` afterwards — and today it is invoked only from `build.react` (`package.json:53`), which the publish pipeline never runs. Measured on a build with `dist-custom-elements` enabled — the state Task 3 Step 1 creates — `dist/mud/assets/` carried **417** files and `dist/components/assets/` **0**; after running the copy script, **417** and **417**. (A default build today emits no `dist/components/` at all, so a count taken there would be measuring an absent directory, not the defect.) `mud-icon` declares `assetsDirs: ['assets']` (`src/components/mud-icon/mud-icon.tsx:23`) and `react/src/index.ts:41-44` points the React asset base at `dist/components/`, so this is the exact consumer Task 3 exists to unbreak. That script's own header names the symptom: *"The component renders empty silently."*

In `package.json`, extend `wireit.build.command`:

```json
      "command": "cross-env NODE_OPTIONS=--max-old-space-size=4096 stencil build --docs && node scripts/copy-component-assets.mjs",
```

Leave the invocation in `build.react` as it is: that script runs `stencil build --docs --react` directly rather than through wireit, so it needs its own call. The script removes its destination first and is idempotent, so running it on both paths is safe.

- [ ] **Step 3: Verify the default build now emits it**

```bash
verify_build
ls "${TMPDIR:-/tmp}/mud-verify/dist/components/index.js" \
   "${TMPDIR:-/tmp}/mud-verify/dist/components/index.d.ts"
grep -c setAssetPath "${TMPDIR:-/tmp}/mud-verify/dist/components/index.d.ts"
```

Expected: both files listed, and `setAssetPath` present (that is the symbol `react/src/index.ts:6` imports).

- [ ] **Step 4: Verify the entrypoints that already worked still work**

```bash
cd "${TMPDIR:-/tmp}/mud-verify"
ls loader/index.js loader/index.cjs.js loader/index.d.ts dist/types/index.d.ts
```

Expected: all four present. These are the only entrypoints published consumers use today; this step is the regression guard for them and repeats in Tasks 4 and 5.

- [ ] **Step 5: Confirm the assets actually landed**

```bash
cd "${TMPDIR:-/tmp}/mud-verify"
echo "lazy:       $(find dist/mud/assets -type f | wc -l)"
echo "standalone: $(find dist/components/assets -type f | wc -l)"
```

Expected: both non-zero and equal. A standalone count of 0 means Step 2's edit did not take effect — the gate's `standalone bundle published without its assets` category exists precisely for this.

- [ ] **Step 6: Confirm the gate lost the dist/components findings**

```bash
cd "${TMPDIR:-/tmp}/mud-verify" && node scripts/validate-package.mjs; echo "exit=$?"
```

Expected: `exit=1` still, with `$.exports[./dist/components][...]` **gone** from the missing list.

- [ ] **Step 7: Commit**

```bash
git add stencil.config.ts package.json
git commit -m "fix(build): emit dist-custom-elements in every build, not only --react"
```

---

### Task 4: Stop leaking build-machine paths into the package

`tsconfig.json:26` pulls root-level `*.ts` into the Stencil program. Give Stencil a program scoped to `src`, and leave `tsconfig.json` alone so `yarn typecheck` (`tsc --noEmit`) keeps covering the config files.

**Files:**
- Create: `tsconfig.stencil.json`
- Modify: `stencil.config.ts` (config object, next to `srcDir`)

**Interfaces:**
- Consumes: Task 3's edited `stencil.config.ts`.
- Produces: a `dist/` root containing only `index.js` and `index.cjs.js` as loose files, and a `dist/types/` containing only `components/`, `utils/` and the three root declarations.

- [ ] **Step 1: Create the Stencil-only tsconfig**

Create `tsconfig.stencil.json`. It `extends` the root config and overrides only what must differ — copying the option set would create a second source of truth for `strict`, `target`, `lib` and 15 others, which is the configuration-value case CLAUDE.md sends straight to Single Source of Truth rather than to Rule of Three. Nothing in this plan's gate would catch the two drifting apart.

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["@stencil/core", "node"],
    "tsBuildInfoFile": ".stencil/.tsbuildinfo.stencil"
  },
  "include": ["src"]
}
```

Three overrides, each with a reason. `include` is the whole point — it drops the root-level `*.ts` that leak into `dist/`. `types` drops `@playwright/test`, dead weight once `playwright.config.ts` is out of the program (`grep -r "@playwright/test" src/` returns nothing, so no source file needs it). `tsBuildInfoFile` keeps the two programs from sharing incremental state. `exclude` is inherited unchanged.

- [ ] **Step 2: Verify the inheritance actually resolves**

`extends` is TypeScript's mechanism, and Stencil parses the file through TypeScript — but verify rather than assume, since this config drives the published build:

```bash
npx tsc --showConfig -p tsconfig.stencil.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s);console.log('strict:',c.compilerOptions.strict,'| target:',c.compilerOptions.target,'| types:',c.compilerOptions.types,'| include:',c.include)})"
```

Expected: `strict: true`, `target: es2022` (both inherited), `types` holding only `@stencil/core` and `node`, and `include` resolving to `src` alone. If `strict` or `target` come back undefined, the inheritance did not resolve — fall back to the fully-expanded copy and note it in the completion report.

- [ ] **Step 3: Point Stencil at it**

In `stencil.config.ts`, inside the exported `config` object, add the `tsconfig` line directly after `srcDir`:

```ts
export const config: Config = {
  namespace: 'mud',
  srcDir: 'src',
  // Stencil compiles only `src`. The root-level `*.ts` files that
  // `tsconfig.json` includes for `yarn typecheck` (stencil.config.ts,
  // playwright.config.ts, vitest-setup.ts) must stay out of the emitted
  // program: they were being written to `dist/*.js`, and their declarations
  // landed under an absolute build-machine path in `dist/types/`.
  tsconfig: 'tsconfig.stencil.json',
  globalStyle: 'src/assets/css/index.css',
```

- [ ] **Step 4: Register the new tsconfig as a build input**

`wireit.build.files` lists `tsconfig.json` but would not list `tsconfig.stencil.json`, so editing the file that now drives the Stencil program would leave the cached build valid and the edit unapplied. In `package.json`, inside `wireit.build.files`, add the new path after `"tsconfig.json"`:

```json
      "stencil.config.ts",
      "tsconfig.json",
      "tsconfig.stencil.json",
      "scripts/copy-component-assets.mjs"
```

Two additions, one reason each. `tsconfig.stencil.json` now drives what gets compiled; `scripts/copy-component-assets.mjs` became part of `wireit.build.command` in Task 3 Step 2. Either one edited without being listed here leaves the cached build valid and the edit unapplied — the same staleness this plan's self-refute log caught once already.

Apply the same addition to `wireit["dx:stencil:once"].files`, which carries the same list for the dev build.

- [ ] **Step 5: Verify the leak is gone and nothing else moved**

```bash
verify_build
cd "${TMPDIR:-/tmp}/mud-verify"
echo "--- loose files at dist root ---"; find dist -maxdepth 1 -type f
echo "--- dist/types subdirectories ---"; find dist/types -maxdepth 1 -type d
echo "--- entrypoints that already worked ---"; ls loader/index.js dist/types/index.d.ts dist/components/index.js
```

Expected: dist root holds exactly `dist/index.js` and `dist/index.cjs.js`; `dist/types` holds only itself, `components` and `utils`; all three entrypoints present.

- [ ] **Step 6: Verify the typecheck still covers the config files**

```bash
yarn typecheck
```

Expected: passes. This is the check that proves splitting the tsconfig did not silently drop `stencil.config.ts`, `playwright.config.ts` and `vitest-setup.ts` from type coverage.

- [ ] **Step 7: Confirm the gate lost the build-machine findings**

```bash
cd "${TMPDIR:-/tmp}/mud-verify" && node scripts/validate-package.mjs; echo "exit=$?"
```

Expected: `exit=1` with only the `es2015`/`es2017` offenders left.

- [ ] **Step 8: Commit**

```bash
git add tsconfig.stencil.json stencil.config.ts package.json
git commit -m "fix(build): scope the Stencil TypeScript program to src"
```

---

### Task 5: Point es2015/es2017 at the file the build emits

Never caused by the dev build. Stencil writes `dist/esm/index.js`; `package.json` has always claimed `dist/esm/index.mjs`.

**Files:**
- Modify: `package.json:11-12`

**Interfaces:**
- Consumes: nothing.
- Produces: the gate's `declared entrypoint missing` category becomes empty, which is Tasks 1-5's exit condition.

- [ ] **Step 1: Confirm the emitted filename before editing**

This reads the build Task 4 Step 5 produced. If that copy is gone, run `verify_build` first.

```bash
ls "${TMPDIR:-/tmp}/mud-verify/dist/esm/" | grep -E '^index\.'
```

Expected: `index.js`, and no `index.mjs`. Edit to match what this prints — do not assume.

- [ ] **Step 2: Correct both fields**

In `package.json`, replace:

```json
  "es2015": "dist/esm/index.mjs",
  "es2017": "dist/esm/index.mjs",
```

with:

```json
  "es2015": "dist/esm/index.js",
  "es2017": "dist/esm/index.js",
```

- [ ] **Step 3: Verify the gate is green**

```bash
verify_build
cd "${TMPDIR:-/tmp}/mud-verify" && node scripts/validate-package.mjs; echo "exit=$?"
```

Expected: `exit=0` and a `validate-package: PASS` line reporting every declared entrypoint present. This is the plan's green bar.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "fix(pkg): point es2015/es2017 at dist/esm/index.js, the emitted file"
```

---

### Task 6: Run the gate in the publish pipeline

Without this the fixes hold only until the next pipeline edit reintroduces a step that touches `dist/`.

**Files:**
- Modify: `package.json` (`scripts`, after `"test:scripts"`)
- Modify: `pipline-mud-publish-npm.yml:52-64`

**Interfaces:**
- Consumes: Task 1's `scripts/validate-package.mjs`.
- Produces: `yarn validate.package`, and a pipeline step that fails the run before `npm publish` if the tarball is wrong.

- [ ] **Step 1: Expose the gate as a project script**

In `package.json`, directly after the `"test:scripts"` line, add:

```json
    "validate.package": "node scripts/validate-package.mjs",
```

- [ ] **Step 2: Add the gate step to the pipeline**

In `pipline-mud-publish-npm.yml`, between the `Run Tests` step and the `Publish @egov-moldova/mud` step, insert:

```yaml
    - script: yarn validate.package
      displayName: 'Validate Published Package'
```

The step's position is the point, and it is anchored to the publish, not to the tests: **the gate is the last step before the first `Publish` step, and it comes after every step that writes `dist/`** — `Build All` and, if Task 2 took its fallback branch, `Run Tests` too. State it that way rather than as "after Run Tests": Task 2's fallback moves `Run Tests` above `Build All`, and an instruction anchored to a step that moved would place the gate before the build, where it fails on an absent `dist/` for the wrong reason.

- [ ] **Step 3: Prove the gate's packer still agrees with the publisher's**

The gate measures `yarn pack`; the pipeline publishes with `npm publish`. They agree on this package today — this step is what keeps that a measured fact rather than an assumption, and it is the guard named in the self-refute log's residual.

```bash
cd "${TMPDIR:-/tmp}/mud-verify"
yarn pack --dry-run --json 2>/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(s.trim().split('\n').map(l=>JSON.parse(l)).filter(o=>o.location).map(o=>o.location).sort().join('\n'))})" > "${TMPDIR:-/tmp}/yarn-list.txt"
npm pack --dry-run --json --ignore-scripts 2>/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s)[0].files.map(f=>f.path).sort().join('\n'))})" > "${TMPDIR:-/tmp}/npm-list.txt"
diff "${TMPDIR:-/tmp}/yarn-list.txt" "${TMPDIR:-/tmp}/npm-list.txt" \
  && echo "packers agree ($(wc -l < "${TMPDIR:-/tmp}/yarn-list.txt") files)"
```

Expected: no diff. `--ignore-scripts` on the npm side is required for the comparison itself — without it `npm pack --dry-run` runs this package's `prepare` (`husky install`), which yarn does not.

**The residual this step does not close, named rather than implied.** The comparison proves equality *under* `--ignore-scripts`; the release path is `npm publish` *with* lifecycle scripts, so `prepare` (`husky install && node scripts/git/setup-merge-drivers.mjs`, `package.json:49`) runs after the gate and before the tarball is built. Neither of those writes to `dist/` today — the second installs a git merge driver — so the exposure is repo-authored code running in a window, not a known corruption. Closing it costs one flag: `npm publish --ignore-scripts`. That is a release-path change and is left as the owner's call, listed under *Out of scope* rather than taken silently.

If they ever diverge, the gate stops being a statement about what gets published. Do not paper over it: bring the publish step onto the same tool (`yarn npm publish`, which `web-components` already uses at `pipline-mud-publish-npm.yml:60`) and re-run.

- [ ] **Step 4: Cover the gate script with the existing script test suite**

Confirm the new spec file is picked up by the project's own runner:

```bash
node --test scripts/__tests__/validate-package.spec.mjs
```

Expected: passes.

Scoped to the new file deliberately. `yarn test:scripts` is **already red on this tree, before any change in this plan**: `node --test "scripts/__tests__/**/*.spec.mjs"` returns exit 1 with 283 of 284 passing, the failure being `mud-button — extracts expected shape` at `scripts/__tests__/audit/14-component-contract.spec.mjs:370`. That is pre-existing and out of this plan's scope; do not try to fix it here, and do not read the suite's red as this plan's doing.

- [ ] **Step 5: Rehearse the pipeline's own sequence end to end**

```bash
verify_build
cd "${TMPDIR:-/tmp}/mud-verify"
yarn test.dev && yarn validate.package; echo "exit=$?"
```

Expected: `exit=0`. This reproduces the **build → test → gate ordering** that produced the bug. It is not the full CI sequence: `verify_build` calls `stencil build --docs` directly, skipping the `tokens.build.prod` and `wca.custom-elements` wireit dependencies that CI's `yarn build` runs first. Neither affects any gate predicate (the token export is a pattern, which the gate skips by design), but do not read this step as proof that `yarn build` itself is unchanged.

- [ ] **Step 6: Prove the gate actually fails when the defect returns**

Reintroduce the original defect in the throwaway copy and confirm the gate catches it:

```bash
cd "${TMPDIR:-/tmp}/mud-verify"
npx stencil build --dev >/dev/null 2>&1
node scripts/validate-package.mjs; echo "exit=$?"
```

Expected: `exit=1`, reporting the missing entrypoints, the source maps and the development runtime. A gate that has never been seen to fail is not a gate. Then discard the copy — do not "fix" it.

- [ ] **Step 7: Commit**

```bash
git add package.json pipline-mud-publish-npm.yml
git commit -m "ci: gate npm publish on package contract validation"
```

---

### Task 7 — FOLLOW-UP, deliberately NOT on this plan's release path

**Do not run this task in the same change as Tasks 1-6.** Its Step 4 commits `yarn.lock`, and `pipline-mud-publish-npm.yml:31` runs `yarn install --immutable` — the one command a lockfile drift makes fail. That is nonzero risk on a release-critical run, bought for a defect the acceptance bar does not measure and that cannot currently fire: `@egov-moldova/mud-react` returns 404 on npm, is outside the root tarball (`files` covers only `dist/` and `loader/`), and neither pipeline step publishes it.

Issue #1 Section 3 raises it, and Section 3 itself says the issue "has not yet been triggered, but should be reviewed". This is that disposition: reviewed, real, and shipped separately once Tasks 1-6 have published a correct package.

#### Remove the Yarn-only protocol from a publish-armed package

`react/package.json:23` declares `"@egov-moldova/mud": "portal:.."`. `portal:` is a Yarn protocol; `npm publish` does not rewrite it, so a publish would ship an uninstallable dependency. Latent today — `@egov-moldova/mud-react` returns 404 on npm and the pipeline does not publish it — but the package carries `publishConfig.registry`, so it is armed.

`web-components/package.json` is the working precedent: it declares `"@egov-moldova/mud": "workspace:^"` and its published metadata shows `"^1.1.9"`, because `yarn npm publish` rewrites `workspace:` at pack time.

**Files:**
- Modify: `react/package.json:23`

**Interfaces:**
- Consumes: nothing.
- Produces: `react/` resolves `@egov-moldova/mud` through the workspace, same as `web-components/`.

- [ ] **Step 1: Switch to the workspace protocol**

In `react/package.json`, replace:

```json
    "@egov-moldova/mud": "portal:..",
```

with:

```json
    "@egov-moldova/mud": "workspace:^",
```

`react` is already listed in the root `workspaces` array, so the range resolves locally.

- [ ] **Step 2: Verify the workspace still links**

```bash
yarn install
yarn workspaces list
ls -l node_modules/@egov-moldova/mud
```

Expected: the install succeeds, `@egov-moldova/mud-react` appears in the workspace list, and `node_modules/@egov-moldova/mud` is a symlink to the repo root — the same target `portal:..` resolved to.

Note: `yarn install` rewrites `node_modules` while a `yarn dev` watch server may be running. Stop the dev server first, or run this step when no watch is active.

- [ ] **Step 3: Verify the root package is unaffected**

```bash
git diff --stat -- package.json
git diff -- yarn.lock | grep -E '^[+-]' | grep -v '^[+-][+-]' | head -20
```

Expected: `package.json` shows no diff at all — this task must not touch the root package — and the `yarn.lock` change is confined to the `@egov-moldova/mud-react` entry's resolution of `@egov-moldova/mud`.

- [ ] **Step 4: Commit**

```bash
git add react/package.json yarn.lock
git commit -m "fix(react): resolve the design system through the workspace protocol"
```

---

## Execution Matrix

| Task | Shape | Model / effort | Wave | Rationale |
|---|---|---|---|---|
| 1-6 | implementer, single-file config edits with a shared verification loop | session model, session effort — **inline, no dispatch** | serial | Every task's verification is the same `verify_build` + gate loop over the same three files (`package.json`, `stencil.config.ts`, the pipeline). Each task's red bar is the previous task's output, so a dispatched worker would need the whole prior transcript to know what "expected" means. Delegation cost exceeds the work (CLAUDE.md § Cost, speed & model discipline — do not delegate what finishes in a few tool calls). |

No task runs git commands in parallel; the controller commits serially, as written in each task's final step.

## Out of scope — Dan's call, not this plan's

- **Republishing.** Cutting `1.1.10` from the fixed pipeline is a release action and stays Dan's decision (CLAUDE.md § Autonomy gates: publishing/releases always stop). This plan ends with a repo that would publish correctly on the next run, not with a run triggered.

  One input for that decision, since the plan cannot make it: `@egov-moldova/mud-web-components@latest` depends on `"^1.1.9"`, so every caret-ranged consumer moves from a development bundle to a minified production runtime on their next install, all at once. npm forbids reusing a version, so the only revert is another publish. A staged option exists — publish the first fixed version under `--tag next`, verify against one consumer, then `npm dist-tag add … latest`. That costs one pipeline variable and one manual promote step. Recommended, but it is a release decision, not a plan step.
- **Yanking or deprecating `1.0.0`-`1.1.9`.** Those versions ship a development bundle. Whether to `npm deprecate` them is a communication decision about existing consumers.
- **`npm publish --ignore-scripts`.** Would close the lifecycle-script window Task 6 Step 3 names, at the cost of changing what the publish step executes. One flag, but on the release path.
- **`@egov-moldova/mud-react` publishing.** Task 7 disarms the protocol hazard. Actually publishing the React adapter — and whether its `main`/`types` should stop pointing at raw `src/index.ts` — is separate work.
