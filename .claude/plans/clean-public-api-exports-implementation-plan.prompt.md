# Clean Public API Exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `dist/`-shaped subpaths in `@egov-moldova/mud`'s `exports` map with a clean public API, and move every mechanism that reads that map in the same commit.

**Architecture:** The `exports` map becomes the single public contract — eight keys, none exposing a build directory. Three mechanisms read that map and cannot lag behind it: the publish gate (`scripts/validate-package.mjs`), the React output target's generated import specifiers, and the in-repo Vite demo. A new check inside the publish gate then asserts that every public specifier actually *resolves* through Node's own algorithm — the property a key rename can silently break and that no existing check covers, because every current check grades targets rather than keys.

**Tech Stack:** Node 24, Yarn 4, Stencil 4.43.4, `@stencil/react-output-target` 1.5.x, `node:test` for the `scripts/` suite, Vite 8 for the demo.

**Spec:** https://github.com/egov-moldova/design-system/issues/2 — the issue states the intent. The Design Decisions section below supersedes its literal `exports` block wherever the two differ, and each difference names the evidence that admits it. There is no separate spec document: this plan is the single artifact both fresh-eyes rounds grade.

**Reviewed:** verify bfd384f — the implementation was graded by `/code-review high` and a `fresh-eyes-verify` round over `b36509e...HEAD`; seven findings between them, one converged across both lenses, all remediated. Before that, four rounds against this artifact id: round 1 preflight (two legs, FORTIFY/FORTIFY), rounds 2, 3 and 4 critic (FORTIFY high each). Twenty-nine findings, fourteen above the bar, all remediated in the revision you are reading.

Three things a reader should carry rather than infer. **Round 3 ran on Sonnet 5**, not the critic lane's Opus pin, because the session's Opus limit was reached — a real fresh-context round at less refutation depth. **The loop was stopped by its brake, not by a clean round**: rounds 3 and 4 raised only findings against text the review loop had itself written in an earlier round's remediation, which is the signal that the loop has started paying rent on its own prose. **And round 4's central finding was structural** — that enumerating instances was the wrong instrument for the recurring defect, because a hand-written path list and a hand-written `Files:` block are two copies of one fact. That is why the two acceptance greps now derive their scope from git and match the *form* of a module specifier rather than carrying an allowlist. The gate ledger reads OPEN because round 4's findings were fixed after it reported.

**Executor**: Opus 5 · high

**Dispatch verdict:** inline — no phase passes the brief-test. Each phase is a handful of edits in one repository, and the two judgment moments (the probe's design in Phase 2, the specifier-versus-physical-path distinction in Phase 3) are precisely what a dispatch brief would have to re-teach at greater cost than doing the work.

---

## The problem

A consumer installing `@egov-moldova/mud` has to name this package's build layout to use it. Every documented import reads `@egov-moldova/mud/dist/mud/...` — a path that exists because Stencil emits into `dist/<namespace>/`, which is an implementation detail the consumer neither chose nor can rely on. The `exports` map, which is the one place a package can decide what its public surface looks like, currently just mirrors that layout back, and the `./dist/mud/*` wildcard exposes 79 build chunks and 81 source maps alongside the four files anyone actually names.

The symptom this removes: the package has no public API distinct from its build output, so any change to how it is built is a change to what consumers wrote.

reuse-candidates: `CHANGELOG.md` — homes swept: repository root (`command ls *.md` → AGENTS, CODE_OF_CONDUCT, CONTRIBUTING, DESIGN, INTEGRATION, PRINCIPLES, PRODUCT, README, SECURITY, STACK, TESTING), plus `docs/` and `.specs/`. Repo-wide sweep: `find . -iname "CHANGELOG*" -o -iname "RELEASES*" -o -iname "HISTORY.md"` returns nothing outside `node_modules`. Nearest candidates: `.specs/PROJECT-SPECIFICATION.md` (match tier: none — a specification of what the system is, carrying no release history) and `web-components/README.md` (tier: none — consumer documentation with no version log). Verdict: **create**; this repository has no release log at any path, and a migration mapping has nowhere else to live.

---

## Global Constraints

- The package name is `@egov-moldova/mud`. The scope `@egovmd` **does not exist** — 0 occurrences in `yarn.lock` against 8 for `@egov-moldova`. Wherever it appears it is a defect, never a valid alias. **It appears across 68 files** — `grep -rln "egovmd" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.html" . | grep -v node_modules | wc -l` → `68`, which counts FILES; the occurrence count drifts as this plan itself is edited and is deliberately not stated. Most are in documentation this plan does not touch. Repairing all of them is a repo-wide scope rename and its own issue; this plan repairs only the occurrences in the files it edits, and the acceptance bar is scoped to match. **The matcher is `egovmd`, not `@egovmd`** — the scope also appears unprefixed, inside identifiers such as the Vite plugin name at `web-components/demo/vite.config.ts:41`.
- Node `>=24.0.0 <25.0.0`; Yarn 4 (`packageManager`); `@stencil/core` pinned `^4.43.4`.
- Every `exports` target must exist in the packed tarball. `yarn validate.package` enforces it and is the last step before `npm publish` in `pipline-mud-publish-npm.yml`.
- **No `require` condition on `./components`.** Stencil's `dist-custom-elements` target has no format option — `OutputTargetDistCustomElements` in `@stencil/core@4.43.4` (`internal/stencil-public-compiler.d.ts`) declares only `empty`, `externalRuntime`, `copy`, `includeGlobalScripts`, `minify`, `generateTypeDeclarations`, `customElementsExportBehavior`, `autoLoader` — so `dist/components/index.cjs.js` is not producible without new bundling machinery.
- Documentation examples that resolve **physically** — jsDelivr URLs and `<link href="/node_modules/...">` — keep their `dist/mud/...` paths. Only bare-specifier `import` statements move to the new names.
- **Version stays on the pipeline's `1.1$(Rev:.r)` scheme (`pipline-mud-publish-npm.yml:1`), and that scheme cannot express a major bump — `1.1` is hardcoded and only the revision increments.** This is an accepted, documented risk rather than an oversight: the change removes subpaths, which is breaking for any consumer that named them, and the release channel has no way to signal it in the version number. Three things bound that risk, and none of them is the version: the failure is loud and named at build time (`ERR_PACKAGE_PATH_NOT_EXPORTED`), the one consumer this repository can identify as affected is its own React workspace and Phase 1 repairs it in the same commit (Design Decision 10), and the recovery is additive — re-adding a key is not breaking, so a repair ships as an ordinary revision within the hour. The `!` in Phase 1's commit header is therefore addressed to a human reader of the history and the CHANGELOG, not to the pipeline, which does not parse commit messages. Changing the version scheme is out of scope for this plan and is a release-policy decision of its own.
- All authored content is English.

---

## Acceptance bar

**Zero tolerance — any one of these fails the plan, regardless of what else passed:**

- An `exports` key whose target is absent from the packed tarball.
- A `require` condition declared anywhere on `./components`.
- Any occurrence of the `@egovmd` scope left **in a file this plan edits** — import specifier or plain text alike. The scope appears across 68 files repo-wide (`grep -rln … | wc -l`); no occurrence total is stated here, because it drifts as this plan is itself edited. Repairing the rest is a separate issue, and a bar written against all of them would be unsatisfiable by these three phases.
- A bare-specifier `import` in documentation or source that still names a `dist/` path.
- A jsDelivr URL or a `<link href="/node_modules/...">` example rewritten to a public specifier — those resolve on the filesystem and would 404.
- A commit that leaves `yarn demo.web.build` failing, or that adds a TypeScript error to the React workspace. **`yarn build.react` may not be used as the evidence for the second** — `react/package.json:20` is `"tsc || true"`, so it exits 0 over a broken workspace. The instrument is `tsc --noEmit`, graded against a baseline captured before any edit.

| Check | Instrument | Tolerance |
| --- | --- | --- |
| Publish gate | `yarn validate.package` | no failing category reported |
| Scripts suite | `yarn test:scripts` | no failing test |
| Public specifiers resolve | `checkPublicSpecifiers` inside the publish gate | every key in `exports` resolves to a file the tarball contains — pattern keys via one representative each |
| Gate actually grades | rename a key, re-run `yarn validate.package` | the run fails and names the unresolvable specifier |
| React wrappers emitted | `grep -rn "@egov-moldova/mud/" react/src/components/stencil-generated` | every specifier reads `@egov-moldova/mud/components/`; no occurrence of `dist/components` |
| React wrappers **resolve** | `yarn workspace @egov-moldova/mud-react exec tsc --noEmit` | no error absent from the pre-change baseline — a `grep` proves the generator wrote the text, never that anything resolves it |
| Demo canary | `yarn demo.web.build` | build completes |
| Dead scope gone from edited files | `grep -n "egovmd" $(plan_scope)` — see below | no match |
| Build-path specifiers gone | `grep -nE "(from\|import\|require\()[[:space:]]*.@egov-moldova/mud/dist" $(plan_scope)` | no match |

### The scope both greps read, and why it is derived rather than written

Every earlier revision of these two rows authored their operand list by hand, and it drifted from the phases' `Files:` blocks three times in three review rounds — a grep scoped to committed files running before its own commit, a grep recursing into 41 demo HTML files no step edits, an allowlist of "seven" physical references that was really ten. A hand-written path list and a hand-written `Files:` block are **two copies of one fact**, and nothing forces them to agree. So the fact is taken from the only place that cannot be wrong about it — the tree:

```bash
plan_scope() {
  { git diff --name-only upstream/main...HEAD   # committed by this plan
    git diff --name-only HEAD                   # edited, not yet committed
    git ls-files -o --exclude-standard          # created, not yet tracked
  } | sort -u | grep -v '^\.claude/plans/'      # the plan quotes both patterns by design
}

COUNT=$(plan_scope | wc -l | tr -d ' ')
[ "$COUNT" -gt 0 ] || { echo "FAIL: nothing in scope — this check would examine zero files"; exit 1; }

# NUL-delimited into xargs, never "grep pattern $FILES".
plan_scope | tr '\n' '\0' | xargs -0 grep -n "<pattern>"
```

**Both halves of that are load-bearing, and the second was learned the hard way during execution.** The emptiness guard exists because `grep` with no file operands reads stdin, and in a pipeline that means it reports no match having read nothing — green on an examined set of zero. The `xargs -0` exists because **zsh does not word-split an unquoted parameter expansion**: `FILES=$(plan_scope); grep -n x $FILES` passes the whole newline-joined list to `grep` as ONE filename, which does not exist, so `grep` exits non-zero and any `|| echo clean` after it prints a pass. That is the same vacuous-green defect wearing a different disguise, and it survived into this plan because the command was written for `bash` semantics and this repository's shell is `zsh`. Measured 2026-09-10: the parameter form reported `clean` over zero files; the `xargs -0` form examined 13 and returned the same verdict for a real reason.

Prove the check is not vacuous before trusting a clean run, by asking it for something it should FIND:

```bash
plan_scope | tr '\n' '\0' | xargs -0 grep -c "@egov-moldova/mud/dist" | grep -v ':0$'
```

That must be NON-EMPTY and must include `react/src/index.ts` and `web-components/README.md` — the two files whose physical references are load-bearing (the runtime `assetPath` default; the dev-host and CDN `<link>` examples). Deliberately not stated as a count: the set grows with every document that quotes a `dist/` path, so a number rots into a false regression signal. Measured 2026-09-10 on the finished change: five files, seventeen references. A clean specifier grep beside an empty control is a check that examined nothing.

**The second grep needs no allowlist, and that is the point.** It matches the *form of a module specifier* — `from`, `import` or `require(` followed by a quote — rather than the path. A physical reference never takes that form: an `href=`, a `<script src>`, a `new URL('/node_modules/…')`, a prose comment. So the check states exactly what is forbidden and needs no list of exceptions to stay correct as lines move.

**Measured against this repository on 2026-09-10, before any edit.** Over `react/src/index.ts`, `web-components/README.md` and `react/README.md`, the matcher selected the five module specifiers — `index.ts:6`, `react/README.md:26,27`, `web-components/README.md:20,21` — and rejected all six physical references: `index.ts:14` and `:42` (the runtime `assetPath` default), the two dev-host `<link href>` lines at `README.md:39,43`, and the two jsDelivr `<link href>` lines at `:67,68`. Re-runnable both ways:

```bash
# what it selects
grep -nE "(from|import|require\()[[:space:]]*.@egov-moldova/mud/dist" react/src/index.ts web-components/README.md react/README.md
# what it rejects, from the same files
grep -n "@egov-moldova/mud/dist" react/src/index.ts web-components/README.md react/README.md \
  | grep -vE "(from|import|require\()[[:space:]]*.@egov-moldova/mud/dist"
```

A check nobody has watched discriminate is not known to discriminate; this is that observation, in both directions.

**What the executor still has to know, since the check cannot teach it.** The files this plan edits carry both kinds of reference, and the difference decides whether a path is rewritten or left alone:

| Kind | Where it appears here | Rule |
| --- | --- | --- |
| Module specifier — `import '…'`, `from '…'` | `react/src/index.ts`, both READMEs, `SKILL.md`, `PROJECT-SPECIFICATION.md`, `web-components/demo/main.ts`, `vite.config.ts`'s `optimizeDeps.exclude` | rewrite to the public name |
| Physical path — resolved by a filesystem, a dev server or a CDN, never by `exports` | `react/src/index.ts:42` (`new URL('/node_modules/…/dist/components/')`, the runtime default `assetPath`) and its comment at 14; `web-components/README.md` `<link href>` ×4; `SKILL.md`'s dev-server comment; `vite.config.ts`'s `urlPrefix` and the comments around it | keep the `dist/` path; repair only the scope |

`react/src/index.ts:42` is the one worth naming twice: rewriting it produces no build error, only a 404 on every icon at runtime.


---

## Execution matrix

| Phase | Model | Effort | Wave | Notes |
| --- | --- | --- | --- | --- |
| 1 exports contract + in-repo consumers | Opus 5 | high | A | atomic: the key rename and every consumer of it land in one commit |
| 2 resolution probe in the publish gate | Opus 5 | high | B | consumes Phase 1's map; also edits `validate-package.mjs`, so it cannot share Wave A |
| 3 documentation + CHANGELOG | Opus 5 | medium | C | consumes the final key names from Phase 1 |

Routing rationale: the plan executes inline, so this table routes effort rather than dispatch — the Model column is uniform because a mid-session model switch would recompute the whole prefix with no cache hits, which buys nothing on a three-phase plan. Phase 3 is priced below the others because its transform is decidable from the file: replace one specifier form with another, leaving physical URLs alone. Escalation: if a phase fails its acceptance criteria twice, restart it with fresh context one tier up rather than iterating in place.

---

### Options

The decision this plan locks in: what compatibility surface, if any, the old `dist/`-shaped keys keep.

| Option | Complexity added now | Cost to maintain | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- |
| **A — clean cut, no `./dist/*` key** | low — zero extra keys | low — nothing to track | low — re-adding a key is additive and non-breaking, shippable as a patch within the hour | a bundler consumer importing `@egov-moldova/mud/dist/mud/*.css` fails at build with `ERR_PACKAGE_PATH_NOT_EXPORTED`: loud, named, one find/replace to repair | the API the issue asks for, enforced by mechanism rather than by documentation |
| B — keep the `./dist/mud/*` wildcard | low — one key | med — 79 chunk files and 81 source maps remain public API by construction | high — removing it later is a breaking change needing a major release | none for consumers | compatibility only; contradicts the issue's own goal |
| C — narrow compat: three deprecated literal keys | med — three keys plus a deprecation lifecycle to remember and execute | med — a scheduled removal that survives across releases | med — the removal is breaking, but announced in advance | none for consumers | protects exactly the specifiers the READMEs taught, at the cost of two adaptations for the same people |

`Cost to build` is deleted from the table: all three options are a single edit to one block in `package.json` and score `low`, so the axis discriminates nothing.

**Recommendation: A.** Removal is cheap to reverse and the failure it risks is loud at build time. The expensive-to-reverse half of this change is the *introduction* of the new names, which all three options share equally — so caution belongs there, not on the cut.

---

## Design Decisions

Facts established before this plan was written. Each one founds a step below; each is re-runnable.

1. **Two of the issue's four removals are already no-ops.** `exports` today contains `"./dist/mud/*": "./dist/mud/*"`, which already covers `./dist/mud/mud.css` and `./dist/mud/tokens/*.css`. Deleting those two literal keys changes nothing on its own.
2. **The lazy bundle's chunks never need an export key.** The published `dist/mud/mud.esm.js` imports them relatively — its first line is `import { B as BUILD, ... } from './p-DckhwNz2.js';` — and `exports` gates only bare specifiers, never relative ones. The 79 `p-*.js` chunks, the 81 `.map` files and `index.esm.js` therefore have no consumer that names them.
3. **The React wrappers are internal.** `react/package.json` is `"private": true` and `npm view @egov-moldova/mud-react` returns 404. `@stencil/react-output-target` composes generated import specifiers as `${stencilPackageName}/${customElementsDir}/<component>.js`, with `customElementsDir` defaulting to `dist/components` and `stencil.config.ts` not overriding it — so the generated wrappers must be re-pointed when the key moves.

   **This is read from the pinned package, not from memory, and `node_modules` is not where it lives in this worktree** — nothing is installed here, so the copy read was the Yarn 4 global cache entry for the resolved version:

`yarn.lock` resolves `@stencil/react-output-target@npm:^1.5.2` to **1.5.3**, and 1.5.3 is the copy read:

   ```
   $ unzip -o -q ~/.yarn/berry/cache/@stencil-react-output-target-npm-1.5.3-81164f6bd5-10c0.zip
   $ grep -B2 "customElementsDir?: string" node_modules/@stencil/react-output-target/dist/index.d.ts
        * This value is automatically detected from the Stencil configuration file for the dist-custom-elements output target.
        * If you are working in an environment that uses absolute paths, consider setting this value manually.
        */
       customElementsDir?: string;
   $ grep -oE '"dist/components"' node_modules/@stencil/react-output-target/dist/index.js | head -1
   "dist/components"
   $ grep -oE '\$\{[a-zA-Z_$]{1,3}\}/\$\{[a-zA-Z_$]{1,3}\}[^`]{0,50}' node_modules/@stencil/react-output-target/dist/index.js
   ${n}/${a}";
   ${n}/${a}/${s}.js
   ${t}/${n}/index.js';
   ```

   The option is a directory *name* used to compose the specifier, not a path the generator reads from disk — which is what makes `customElementsDir: 'components'` legitimate while the physical output stays `dist/components/`. Re-run these three commands if `yarn.lock` has moved since 2026-09-10; the cache holds several versions and the lockfile decides which one is real.
4. **`standaloneBundleDir()` derives the physical directory from the export *target*, not from the key** (`scripts/validate-package.mjs:133-143`). It keeps returning `dist/components/` after the rename; only its key lookup changes, and `validate-package.spec.mjs:133` stays valid unchanged.
5. **Self-referencing resolution works and does not stat.** From inside the package, `node --input-type=module -e "console.log(import.meta.resolve('@egov-moldova/mud/dist/mud/mud.css'))"` prints a `file://` URL through the package's own `exports` map — for a file that does not exist in a clean worktree. An unexported subpath raises `ERR_PACKAGE_PATH_NOT_EXPORTED`. The Phase 2 probe therefore needs **both** a resolve and an existence check, and needs neither a symlink nor an extracted tarball.
6. **The published 1.1.9 is broken well beyond this issue.** Its tarball carries `dist/mud/` (582 files), `dist/types/` (165) and `loader/` (5) — and no `dist/index.js`, no `dist/index.cjs.js`, no `dist/components/`, no `dist/esm/`. `loader/index.js` re-exports `../dist/esm/loader.js`, which is absent. So `.`, `./loader` and `./dist/components` all fail to resolve in the published package today. This plan does not repair that — the gate added in PR #12 already refuses such a tarball — but it is why no consumer can be depending on those three subpaths.
7. **Two CI surfaces, and an earlier revision of this decision read only one of them.** `pipline-mud-publish-npm.yml` — the Azure PUBLISH pipeline — runs `tokens.build`, `build`, `build.web`, `test.dev`, `validate.package`, and `test:scripts` is not among them. From that alone this line claimed the scripts suite never runs in CI. **It was wrong:** `.github/workflows/ci.yml:214` runs `yarn test:scripts` on pull requests. Corrected 2026-09-10, after a review leg read the workflow this decision had not. What it founded still holds, for a narrower reason: the resolution check belongs inside `validate-package.mjs` because it must grade the TARBALL at publish time, and the publish pipeline is where the scripts suite genuinely does not run.
8. **The demo is already broken.** `web-components/demo/main.ts` imports `@egovmd/mud/...`, and `demo.web.build` is not in the pipeline, so nothing catches it. Phase 1 repairs it and thereby turns it into a live canary for the export map.
9. **External consumers cannot be enumerated, and this plan does not pretend otherwise.** Decisions 2, 3 and 6 rule out every consumer *visible from this repository or the registry* — the in-repo workspaces, the unpublished React package, and the three subpaths that do not resolve in the published 1.1.9 at all. They say nothing about a downstream application that imports `@egov-moldova/mud/dist/mud/mud.css` through a bundler, and **no read-only check can settle that**: npm publishes download counts, not importers. So the goal's phrase "without breaking any consumer that can be identified" is exact rather than loose — an unidentifiable consumer is out of its scope by construction. What bounds the residual risk is the recovery path in Global Constraints, not evidence of absence. The one-release overlap that would remove the risk entirely is Option C in the table above, considered and declined on the reversibility asymmetry.
10. **The repository's own React workspace IS an affected consumer, and it breaks silently.** `react/tsconfig.json:7` declares `"moduleResolution": "node"` — the node10 algorithm, which does not read `exports` at all — while the root `tsconfig.json:8` is `"bundler"`. Under node10, `react/src/index.ts:6`'s `@egov-moldova/mud/dist/components` resolves *physically*, through the workspace symlink, to a directory that exists on disk. After the rename the specifier is `@egov-moldova/mud/components`, for which no directory exists, and every generated wrapper importing `@egov-moldova/mud/components/<component>.js` fails the same way: `TS2307`. **And nothing would have reported it**: `react/package.json:20` is `"build": "tsc || true"`, so type errors exit 0 and a `yarn build.react` acceptance step passes over a broken workspace. Phase 1 therefore aligns `react/tsconfig.json` with the root and grades the workspace with `tsc --noEmit` against a baseline recorded before the change — not with the build script, which cannot fail.

---

## File Structure

| File | Responsibility after this change |
| --- | --- |
| `package.json` | the eight-key public contract |
| `scripts/validate-package.mjs` | publish gate; reads the map by key, and (new) proves every public specifier resolves to a file that exists |
| `scripts/__tests__/validate-package.spec.mjs` | unit coverage for the gate's pure functions |
| `stencil.config.ts` | React output target's `customElementsDir`, so generated specifiers match the new key |
| `react/tsconfig.json` | the workspace's module-resolution algorithm — `node` (node10) cannot read `exports`, so it must move to `bundler` for the new keys to resolve at all |
| `react/src/index.ts` | imports `setAssetPath` from the standalone bundle under its new name |
| `web-components/demo/main.ts` | the canary: a real bundler consuming the package by its public names |
| `web-components/demo/vite.config.ts` | dev-server asset interception, keyed on the physical serve path |
| `web-components/README.md`, `react/README.md`, `.claude/skills/mud-design/SKILL.md`, `.specs/PROJECT-SPECIFICATION.md` | teach the new specifiers; leave physical URLs alone |
| `CHANGELOG.md` *(new)* | the old→new mapping a consumer needs when the build error names only the old path |

---

## Phase 1: Exports contract and every in-repo consumer

**Executor**: Opus 5 · high · Wave A · inline

One phase, not three, because an export key and everything that names it are one atomic change. Splitting them would leave `yarn build.react` and `yarn demo.web.build` red at a landed commit, which every later `git bisect` or revert would cross.

**Files:**
- Modify: `package.json` — the `exports` block, lines 13-32 (the block's closing `},` is line 32; a replacement stopping at 30 leaves a dangling brace)
- Modify: `scripts/validate-package.mjs:134`
- Modify: `scripts/__tests__/validate-package.spec.mjs:27-44,63,67-70` (the fixture's `exports` block closes at 44)
- Modify: `stencil.config.ts:48` (a comment naming the old key) and `stencil.config.ts:70-77` (the `react()` call — **not** 58-65, which is the `dist-custom-elements` block)
- Modify: `react/tsconfig.json:7`
- Modify: `react/src/index.ts:6,30`
- Modify: `web-components/demo/main.ts:1-8,101,111,189,201`
- Modify: `web-components/demo/vite.config.ts:31,38,41,69,116`

**Interfaces:**
- Produces: the eight-key `exports` map every later phase reads, and `standaloneBundleDir(pkg)` keyed on `'./components'` returning `'dist/components/'` unchanged.

**Before Step 1 — capture the React workspace's type baseline, while the tree is still untouched.** The bar grades "no error absent from the baseline", so the baseline has to exist before the first edit; taking it later would fold this change's own breakage into it.

```bash
yarn install
yarn tokens.build && yarn build
yarn workspace @egov-moldova/mud-react exec tsc --noEmit 2>&1 | tee /tmp/react-tsc-baseline.txt; echo "exit=$?"
```

The build is required first: `tsc` resolves `@egov-moldova/mud/...` through the workspace symlink into `dist/`, so with no `dist/` every specifier fails and the baseline is meaningless. If the baseline is non-empty, it records pre-existing type debt this plan did not create and does not fix — say so in the completion report rather than repairing it here.

- [ ] **Step 1: Update the gate's fixture and assertions to the new contract (failing test first)**

In `scripts/__tests__/validate-package.spec.mjs`, replace the `exports` block of the `PKG` fixture (lines 27-44) with:

```js
  'exports': {
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
    './styles.css': './dist/mud/mud.css',
    './tokens/*.css': './dist/mud/tokens/*.css',
    './mud.esm.js': './dist/mud/mud.esm.js',
    './components': {
      types: './dist/components/index.d.ts',
      import: './dist/components/index.js',
    },
  },
```

Then update the two assertions that name old keys:

```js
    assert.ok(sources.includes('$.exports[./components][types]'));
```

```js
    const entry = collectDeclaredEntries(PKG).find(candidate => candidate.source === '$.exports[./styles.css]');
    assert.deepEqual(entry, {
      source: '$.exports[./styles.css]',
      target: './dist/mud/mud.css',
    });
```

- [ ] **Step 2: Run the scripts suite to verify it fails**

Run: `yarn test:scripts`
Expected: FAIL. `standaloneBundleDir` throws `validate-package: cannot locate the standalone bundle — exports["./dist/components"].import is missing or unusable`, because the fixture no longer carries that key. The two renamed-source assertions fail alongside it.

- [ ] **Step 3: Re-point the gate at the new key**

In `scripts/validate-package.mjs`, inside `standaloneBundleDir`, change the lookup only:

```js
  const target = pkg.exports?.['./components']?.import;
```

and update the throw message and the doc comment above it to name `exports["./components"]` instead of `exports["./dist/components"]`. Leave the returned value alone — it is derived from the target, so it still resolves to `dist/components/`.

- [ ] **Step 4: Run the scripts suite to verify it passes**

Run: `yarn test:scripts`
Expected: PASS, all tests.

- [ ] **Step 5: Write the new exports map**

In `package.json`, replace the whole `exports` block with:

```json
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs.js"
    },
    "./loader": {
      "types": "./loader/index.d.ts",
      "import": "./loader/index.js",
      "require": "./loader/index.cjs.js"
    },
    "./styles.css": "./dist/mud/mud.css",
    "./tokens/*.css": "./dist/mud/tokens/*.css",
    "./mud.esm.js": "./dist/mud/mud.esm.js",
    "./components": {
      "types": "./dist/components/index.d.ts",
      "import": "./dist/components/index.js"
    },
    "./components/mud-*.js": "./dist/components/mud-*.js"
  },
```

`./tokens/*.css` is deliberately narrower than `./tokens/*`: it leaves `./tokens` and `./tokens/*.json` free for a future JS/DTCG token surface without a breaking rename. Do not widen it.

- [ ] **Step 6: Re-point the React output target**

In `stencil.config.ts`, add `customElementsDir` to the `react()` call so the generated wrappers import the new key:

```ts
  outputTargets.push(
    react({
      outDir: 'react/src/components/stencil-generated',
      esModules: true,
      stencilPackageName: '@egov-moldova/mud',
      customElementsDir: 'components',
      excludeComponents: [],
    }),
  );
```

`customElementsDir` names the segment used to build the import specifier, not a directory on disk — the physical output stays `dist/components/`, which is what `./components/*` maps to.

In the same file, repair the comment at `stencil.config.ts:48`, which reads "`package.json` declares `exports["./dist/components"]` unconditionally". That key will not exist after Step 5, and this is the file doing the renaming — leaving it is comment rot introduced by the change itself.

- [ ] **Step 7: Re-point the React entry, and make its resolution algorithm able to see the new key**

In `react/src/index.ts:6`:

```ts
import { setAssetPath as setStandaloneAssetPath } from '@egov-moldova/mud/components';
```

Update the comment at line 30 that refers to "the standalone `dist/components/*` bundle" so it names the public specifier rather than the build path.

**Lines 14 and 42 of the same file keep their `dist/components/` path and must not be swept.** Line 42 is `opts?.assetPath ?? new URL('/node_modules/@egov-moldova/mud/dist/components/', window.location.origin).href` — the runtime default asset root, a URL a browser fetches from a dev host's `node_modules`, not a module specifier. Line 14 is its doc comment. Rewriting either to `@egov-moldova/mud/components` does not fail a build: it produces a 404 on every icon at runtime, silently. This file therefore contains both kinds of reference — one specifier to rename at line 6, two physical paths to leave — which is the same distinction the READMEs carry and the one a whole-file find/replace destroys.

**Then `react/tsconfig.json:7`, which is the load-bearing half of this step:**

```json
    "moduleResolution": "bundler",
```

It is `"node"` today — the node10 algorithm, which ignores `exports` entirely and resolves subpaths as physical directories. Under it, `@egov-moldova/mud/components` has no path on disk and every import of it fails with `TS2307`, including all generated wrappers. The root `tsconfig.json:8` is already `"bundler"`; this aligns the workspace with it. `react/tsconfig.json:4` is `"module": "ESNext"`, which `bundler` requires, so no second change follows from it.

- [ ] **Step 8: Repair and re-point the demo**

`web-components/demo/main.ts` currently imports the non-existent `@egovmd` scope. Replace lines 1-8 with:

```ts
import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/tokens/core.dark.tokens.css';
import '@egov-moldova/mud/styles.css';
import './demo.css';

// Import the lazy bundle entry directly so Stencil resolves `getAssetPath()`
// relative to dist/mud/ (where the SVG assets live) via import.meta.url.
import '@egov-moldova/mud/mud.esm.js';
```

**The imports are not the only occurrences in this file.** `@egovmd` also appears as plain text at lines 101, 111, 189 and 201 — a `document.title`, an `<h1>` label, a second `document.title` and a `console.info` — none of them an import, so a sweep aimed at import statements alone leaves them and the zero-tolerance bar item fails. Run `grep -n "egovmd" web-components/demo/main.ts` and repair every hit; the user-facing strings become `@egov-moldova/mud-web-components` and the console line `[demo] @egov-moldova/mud custom elements registered`.

- [ ] **Step 9: Re-point the demo's dev-server asset interception**

In `web-components/demo/vite.config.ts`, the URL prefix tracks where Vite *serves* the module from, which is still the physical path — only the scope was wrong. Line 38:

```ts
  const urlPrefix = '/node_modules/@egov-moldova/mud/dist/mud/';
```

Line 116 names the specifier as written in source, so it takes the new form:

```ts
    exclude: ['@egov-moldova/mud/mud.esm.js'],
```

Update the two comments at lines 31 and 69 that spell the old scope, **and the plugin identifier at line 41** — `name: 'serve-egovmd-mud-assets'` becomes `name: 'serve-mud-assets'`. That one carries no `@`, which is why the bar's matcher is `egovmd` rather than `@egovmd`: a matcher written with the prefix passes this occurrence while the item's stated intent is violated.

- [ ] **Step 10: Build and prove the whole contract**

Run, in order:

```bash
yarn tokens.build && yarn build
yarn validate.package
yarn build.react
yarn workspace @egov-moldova/mud-react exec tsc --noEmit 2>&1 | tee /tmp/react-tsc-after.txt; echo "exit=$?"
diff /tmp/react-tsc-baseline.txt /tmp/react-tsc-after.txt
yarn demo.web.build
```

Expected: `yarn validate.package` PASSES (it now reads `exports["./components"]`); the `diff` is empty — no type error that was not already in the baseline; `yarn demo.web.build` succeeds, which it did not before this phase.

**`yarn build.react` is run for its side effect — regenerating the wrappers — and its exit status proves nothing.** `react/package.json:20` is `"build": "tsc || true"`, so the workspace's own build cannot fail. The `tsc --noEmit` diff is the acceptance evidence; if it is non-empty, the resolution change in Step 7 is incomplete and the phase is not done.

- [ ] **Step 11: Confirm the generated React specifier**

Run: `grep -rn "@egov-moldova/mud/" react/src/components/stencil-generated | head -5`
Expected: every specifier reads `@egov-moldova/mud/components/...`; no occurrence of `dist/components`.

- [ ] **Step 12: Commit**

```bash
git add package.json scripts/validate-package.mjs scripts/__tests__/validate-package.spec.mjs stencil.config.ts react/tsconfig.json react/src/index.ts web-components/demo/main.ts web-components/demo/vite.config.ts
git commit -F - <<'EOF'
feat(exports)!: publish a clean public API surface

Replace the dist-shaped subpaths with named ones: ./styles.css,
./tokens/*.css, ./mud.esm.js and ./components*. The
dist/ paths are no longer exported.

No require condition on ./components: Stencil's dist-custom-elements
target has no format option, so dist/components/index.cjs.js is not
producible.

Move every in-repo consumer in the same commit — the publish gate's
key lookup, the React output target's customElementsDir, the React
entry, and the Vite demo, whose imports also named a scope
(@egovmd) that does not exist in this workspace.

Closes #2
EOF
```

---

## Phase 2: Prove the keys resolve, not just that the targets exist

**Executor**: Opus 5 · high · Wave B · inline

Every existing check in the gate grades *targets* — that a declared path is present in the tarball. None grades *keys*: whether a consumer writing the documented specifier gets a file. A rename is exactly the change that breaks the second while leaving the first green, so this phase closes that gap in the one place the pipeline actually runs.

**Files:**
- Modify: `scripts/validate-package.mjs` — add `PUBLIC_SPECIFIERS` and `checkPublicSpecifiers`, wire into `main`'s category list
- Modify: `scripts/__tests__/validate-package.spec.mjs` — cover the new pure helper
- Create: `scripts/__fixtures__/exports-pkg/package.json` — the fixture manifest those tests resolve against. This repository already keeps fixtures at `scripts/__fixtures__/<topic>/` (`sync-tokens` is the existing one), so the new fixture extends that home rather than opening `scripts/__tests__/fixtures/`.

**Interfaces:**
- Consumes: the `exports` map produced by Phase 1.
- Produces: `PUBLIC_SPECIFIERS` (a `string[]` of bare specifiers) and `checkPublicSpecifiers(specifiers, cwd)` returning `string[]` of human-readable failures — empty when every specifier resolves to an existing file.

**On pattern-key representatives.** `collectDeclaredEntries` skips patterns by design, so each pattern key needs one concrete member in `PUBLIC_SPECIFIERS` or it is graded by nothing. Pick a shape a consumer actually writes, not the cheapest string that matches — `index.js` for `./components/mud-*.js` would be graded already by the literal `./components` key and would test nothing new. And read the member out of a real tarball rather than the source tree when the build moves files: `yarn pack --dry-run --json | grep -o '"location":"<dir>/[^"]*"'`.

- [ ] **Step 1: Write the failing test**

The three new tests go in a fixture package, **not against the live manifest.** Create `scripts/__fixtures__/exports-pkg/package.json` holding only `"name": "@egov-moldova/mud"` and the eight-key `exports` block from Phase 1 Step 5, and point the tests' `cwd` at that directory. Every other test in this spec file grades the `PKG` fixture; binding these to the real `package.json` would make Step 6's own mutation redden the unit suite while it is in place, and would turn any future key rename into a failure of tests that are not about that key.

Add to `scripts/__tests__/validate-package.spec.mjs`:

```js
const FIXTURE_PKG = path.join(PROJECT_ROOT, 'scripts', '__fixtures__', 'exports-pkg');

describe('checkPublicSpecifiers', () => {
  it('reports a specifier that the exports map does not expose', () => {
    const failures = checkPublicSpecifiers(['@egov-moldova/mud/no-such-key'], FIXTURE_PKG, []);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /no-such-key/);
    assert.match(failures[0], /ERR_PACKAGE_PATH_NOT_EXPORTED/);
  });

  it('reports a specifier that resolves to a path the tarball does not carry', () => {
    const failures = checkPublicSpecifiers(['@egov-moldova/mud/styles.css'], FIXTURE_PKG, []);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /styles\.css/);
    assert.match(failures[0], /the tarball does not contain/);
  });

  it('passes a specifier whose resolved path is packed', () => {
    const failures = checkPublicSpecifiers(['@egov-moldova/mud/styles.css'], FIXTURE_PKG, ['dist/mud/mud.css']);
    assert.deepEqual(failures, []);
  });
});

describe('PUBLIC_SPECIFIERS covers the exports map', () => {
  // Not the tautology the derived-list idea would have been: this grades SET
  // MEMBERSHIP between two independently authored things, where `checkPublicSpecifiers`
  // grades resolution. It is the half that catches a key added to `exports` and
  // never given a specifier — the direction the resolve check is blind to.
  it('names every literal key and at least one representative per pattern key', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const covered = spec => PUBLIC_SPECIFIERS.includes(`@egov-moldova/mud${spec === '.' ? '' : spec.slice(1)}`);
    const missing = Object.keys(pkg.exports).filter(key =>
      key.includes('*')
        ? !PUBLIC_SPECIFIERS.some(s => new RegExp(`^@egov-moldova/mud${key.slice(1).replace('*', '.+')}$`).test(s))
        : !covered(key),
    );
    assert.deepEqual(missing, []);
  });
});
```

Add `checkPublicSpecifiers` and `PROJECT_ROOT` to the spec file's import list (lines 4-16), keeping it alphabetical. `PROJECT_ROOT` is already exported from `validate-package.mjs:18`; it is simply not imported by the spec yet.

- [ ] **Step 2: Run it to verify it fails**

Run: `yarn test:scripts`
Expected: FAIL with `SyntaxError: The requested module '../validate-package.mjs' does not provide an export named 'checkPublicSpecifiers'`. Verified 2026-09-10 against the current gate: `PROJECT_ROOT` resolves, so the error names only the missing function. Any other failure means the plan is wrong, not the implementation.

- [ ] **Step 3: Implement the check**

Add to `scripts/validate-package.mjs`. The list is authored, not derived from `exports`: deriving it would make the check tautological — it would re-ask the map the same question the map just answered. What it must encode is what the documentation *promises*, so that a key removed or renamed without a doc update fails here.

```js
/**
 * The specifiers the documentation promises a consumer can write. Authored
 * rather than derived from `exports`: a list generated from the map would
 * only ask the map about itself and would stay green through any rename.
 * This is the consumer's side of the contract.
 *
 * What enforces it and what does not, stated precisely because an earlier
 * revision of this comment claimed more than the code delivers. The resolve
 * check below fails when this list names something `exports` does not expose.
 * It CANNOT fail when `exports` gains a key nobody listed, and it never reads
 * a README. The first gap is closed by the set-membership test in
 * `validate-package.spec.mjs`; the second is not closed by anything, and the
 * READMEs staying in step with this list is a convention, not a mechanism.
 */
export const PUBLIC_SPECIFIERS = [
  '@egov-moldova/mud',
  '@egov-moldova/mud/loader',
  '@egov-moldova/mud/styles.css',
  // One representative per PATTERN key. `collectDeclaredEntries` skips patterns
  // by design (they resolve to many files), so without a representative the two
  // pattern keys — `./tokens/*.css` and `./components/mud-*.js` — have no check
  // at all. Each representative is a shape a consumer actually writes:
  // `mud-button.js` is what the generated React wrappers import, where
  // `index.js` is graded already by the literal `./components` key.
  '@egov-moldova/mud/tokens/core.tokens.css',
  '@egov-moldova/mud/tokens/core.dark.tokens.css',
  '@egov-moldova/mud/components/mud-button.js',
  '@egov-moldova/mud/mud.esm.js',
  '@egov-moldova/mud/components',
];

/**
 * Resolves each specifier through Node's own algorithm and confirms the PACKED
 * TARBALL contains what it resolved to. Both halves are needed: `import.meta.resolve`
 * applies the exports map but never stats, so a key pointing at a missing file
 * resolves happily.
 *
 * The membership test is against `packedFileList`, not `fs.existsSync`, for the
 * reason `checkDevSignature`'s own docstring gives one function up: a consumer
 * resolves against the published tarball, and a check that grades the working
 * tree is the one furthest from the consumer. A file present here and excluded
 * by `files` or an ignore rule would otherwise pass.
 *
 * Self-referencing (a package importing itself by name) is what makes this
 * work without a symlink or an extracted tarball — Node applies the package's
 * own `exports` map to a bare specifier used from inside it. The probe runs in
 * a child process because resolution is evaluated against the referring
 * module's URL, and that referrer has to sit inside the package.
 */
export function checkPublicSpecifiers(specifiers, cwd, packedFiles) {
  const probe = [
    'const specs = JSON.parse(process.argv[1]);',
    'const out = [];',
    'for (const spec of specs) {',
    '  try {',
    '    out.push({ spec, url: import.meta.resolve(spec) });',
    '  } catch (err) {',
    '    out.push({ spec, code: err.code ?? String(err) });',
    '  }',
    '}',
    'console.log(JSON.stringify(out));',
  ].join('\n');

  const raw = execFileSync(process.execPath, ['--input-type=module', '-e', probe, JSON.stringify(specifiers)], {
    cwd,
    encoding: 'utf8',
  });

  const packed = new Set(packedFiles);
  return JSON.parse(raw).flatMap(entry => {
    if (entry.code) {
      return [`${entry.spec} — does not resolve (${entry.code})`];
    }
    const file = path.posix.normalize(path.relative(cwd, fileURLToPath(entry.url)));
    return packed.has(file) ? [] : [`${entry.spec} — resolves to ${file}, which the tarball does not contain`];
  });
}
```

No new imports are needed: `execFileSync` (line 13), `path` (15) and `fileURLToPath` (16) are already imported by this file.

**The probe's own Node version matters and is not the one this was written on.** `engines` pins `>=24.0.0 <25.0.0` and the pipeline installs 24.x, while the machine this plan was drafted on runs `node v26.3.0`. `import.meta.resolve` and pattern-key resolution are both version-sensitive surfaces, so re-run the Design Decision 5 probe under Node 24 (`fnm use 24`) before relying on it here. Behaviour was confirmed identical on 26.3.0; that is evidence from the wrong version, not from none.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn test:scripts`
Expected: PASS.

- [ ] **Step 5: Wire the check into the gate**

In `main`, add to the `categories` array, after the declared-entries category:

```js
    ['public specifier does not resolve', checkPublicSpecifiers(PUBLIC_SPECIFIERS, cwd, files)],
```

`files` is the packed list `main` already computed on the line above the category array — the same list every other category grades against.

**Two categories beyond the one this phase set out to add, both found by review after the code was written and both proved by mutation.** The ESM probe exercises only the `import` condition, so a `require` condition dropped or mistyped on `.` or `./loader` passed the entire gate while every CommonJS consumer broke: `checkDeclaredEntries` confirms the CJS file is packed, and the ESM probe never asks. That is closed by running the same check a second time under `require`, over `REQUIRE_CAPABLE_SPECIFIERS` — **authored, not derived.** The derived form was written first and is tautological: deleting `exports["./loader"].require` removes the specifier from its own list, so the probe stays green over an empty set. Measured both ways — derived: PASS, authored: `FAIL — @egov-moldova/mud/loader (require) — does not resolve (ERR_PACKAGE_PATH_NOT_EXPORTED)`.

And the zero-tolerance item "no `require` condition on `./components`" had no mechanism at all — it was caught only by accident, when a `require` target happened to name a file the build cannot produce. `checkEsmOnlySubpaths` states it directly. Mutation: adding `"require": "./dist/index.cjs.js"` to `./components` yields `FAIL — ESM-only subpath declares a require condition`.


- [ ] **Step 6: Prove the gate catches a real rename**

Temporarily rename `"./styles.css"` to `"./style.css"` in `package.json`, then run `yarn validate.package`.
Expected: FAIL naming `@egov-moldova/mud/styles.css — does not resolve (ERR_PACKAGE_PATH_NOT_EXPORTED)`. Restore the key and re-run; expected PASS.

This mutation step is the phase's real acceptance evidence — a check that has never been observed failing has not been shown to grade anything.

- [ ] **Step 7: Commit**

```bash
git add scripts/validate-package.mjs scripts/__tests__/validate-package.spec.mjs
git commit -F - <<'EOF'
test(package): assert the public specifiers resolve, not only that targets exist

Every check in the gate graded declared targets — whether a path is
present in the tarball. None graded keys: whether a consumer writing
the documented specifier gets a file back. A key rename is precisely
the change that breaks the second while the first stays green.

The specifier list is authored rather than derived from exports. A
derived list would ask the map about itself and survive any rename;
this one encodes what the documentation promises, so a drift between
the two fails the gate.
EOF
```

---

## Phase 3: Documentation and the migration note

**Executor**: Opus 5 · medium · Wave C · inline

**Files:**
- Modify: `web-components/README.md:20-21` (bare-specifier imports only)
- Modify: `react/README.md:26-27`
- Modify: `.claude/skills/mud-design/SKILL.md:17-18`
- Modify: `.specs/PROJECT-SPECIFICATION.md:81`
- Modify: `package.json:40-43` — the `files` array
- Create: `CHANGELOG.md`

**Interfaces:**
- Consumes: the final key names from Phase 1 and the `PUBLIC_SPECIFIERS` list from Phase 2 — the READMEs and that list are two halves of one contract and must agree.

- [ ] **Step 1: Update the bare-specifier examples only**

In `web-components/README.md`, lines 20-21 become:

```ts
import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/styles.css';
```

**In `.claude/skills/mud-design/SKILL.md` and `.specs/PROJECT-SPECIFICATION.md`, sweep the whole file, not the quoted lines.** Both are opened for edit here, which puts them inside the zero-tolerance bar item, and both carry the dead scope well beyond their import examples: `SKILL.md` at lines 3, 8, 16, 17, 18, 22 and 122 (seven, including the skill's own `description` frontmatter, which is a routing trigger), and `PROJECT-SPECIFICATION.md` at lines 1, 5, 12, 41, 44, 56, 57, 79, 80 and 81 (ten, including its title). Run `grep -n "egovmd" <file>` on each and repair every hit:

- `@egovmd/mud` → `@egov-moldova/mud`
- `@egovmd/mud-web-components` → `@egov-moldova/mud-web-components`
- `@egovmd/mud-react` → `@egov-moldova/mud-react` (the availability caveat at `SKILL.md:122` stays — that package is `private` and unpublished)

Two of these are scope-only repairs and must not become specifier rewrites: `SKILL.md:22` names `/node_modules/@egovmd/mud/dist/components/`, a physical dev-server path, and `PROJECT-SPECIFICATION.md:79` names a `<script src>`. Both keep their `dist/` paths; only the scope changes. The bare-specifier imports at `SKILL.md:17-18` and `PROJECT-SPECIFICATION.md:81` take the new public names.

In `react/README.md`, lines 26-27 become the same two imports. Note that line 27 currently names `design-system.css`, which is not a file this package publishes — the global stylesheet is `mud.css`, now `./styles.css`. That is a pre-existing defect being corrected here, not a rename.

- [ ] **Step 2: Leave every physically-resolved example alone**

Do **not** touch `web-components/README.md:39,43` (`<link href="/node_modules/@egov-moldova/mud/dist/mud/...">`) or lines 67-68 (the jsDelivr URLs). Neither passes through `exports` — a dev server and a CDN both serve physical paths — so rewriting them to `/styles.css` would produce 404s.

- [ ] **Step 3: Verify no bare specifier still names a build path**

Run:

```bash
FILES=$(plan_scope)   # the function defined in the Acceptance bar section
[ -n "$FILES" ] || { echo "FAIL: nothing in scope — this check would examine zero files"; exit 1; }

grep -nE "(from|import|require\()[[:space:]]*.@egov-moldova/mud/dist" $FILES
grep -n "egovmd" $FILES
```

Expected from both: **no output.** The first matches the form of a module specifier, so the physical references — `<link href>`, `<script src>`, `new URL('/node_modules/…')`, prose comments — do not appear in it and need no allowlist. The second covers every file this plan touched, and only those.

**Do not re-write these operands by hand.** Three review rounds each found a different defect in a hand-written operand list for exactly these two checks, and every one of them was the same shape: the list and the phases' real file set were two copies of one fact. `plan_scope` derives it from git, which is the only copy that cannot disagree with the work.

Line citations verified 2026-09-10: `.claude/skills/mud-design/SKILL.md:17-18` and `.specs/PROJECT-SPECIFICATION.md:81` each carry the `@egovmd/mud/dist/mud/...` import form this step replaces.

- [ ] **Step 4: Write the migration note**

Create `CHANGELOG.md`. It must carry, and `CHANGELOG.md` in this repository is the single copy of the text — reproducing it here would be the two-copies-of-one-fact defect this plan's own acceptance greps were rebuilt to avoid:

- the old→new mapping for all six renamed specifier shapes, since `ERR_PACKAGE_PATH_NOT_EXPORTED` names the old path and not the new one;
- a statement that `.` and `./loader` are unchanged;
- what was removed with **no** replacement — `dist/mud/index.esm.js` and the `p-*.js` chunks, which the deleted `./dist/mud/*` wildcard exposed and no new key covers — and where a consumer who named them should go instead;
- that URLs are unaffected, because a `<link href>`, a jsDelivr URL and a copy step out of `node_modules` all resolve on a filesystem or over HTTP rather than through `exports`;
- that `./components` is ESM-only, and why;
- the node10 warning: `moduleResolution: "node"` does not read `exports` at all, so a consumer on it sees `TS2307` for every new name.

**Say what the React fix does and does not do.** It repairs resolution. It does not make the workspace typecheck — `dist/types/index.d.ts` does not export the `Components` and `Mud*CustomEvent` types the generated wrappers import, which is 210 pre-existing errors this plan neither created nor fixes. A note that reads as "the React workspace is fixed" is a claim the tree does not support.

- [ ] **Step 5: Ship the CHANGELOG in the tarball, or it is not a migration path**

`package.json` declares `files: ["dist/", "loader/"]`. npm force-includes `package.json`, `README`, `LICENSE` and nothing else — measured here: `yarn pack --dry-run --json` on this worktree packs exactly `LICENSE`, `README.md` and `package.json`. So a `CHANGELOG.md` written and committed is a file the consumer never receives, and the whole of Option A's risk argument rests on that consumer finding the old→new mapping after a build error that names only the old path.

```json
  "files": [
    "dist/",
    "loader/",
    "CHANGELOG.md"
  ],
```

Verify with `yarn pack --dry-run --json | grep CHANGELOG` — one line, or the migration path does not exist.

Note, not fixed here: `package.json` has no `repository`, `homepage` or `bugs` field, so the npm page offers no route back to this repository either. That is worth its own change and is not in this issue's scope.

- [ ] **Step 6: Commit**

```bash
git add web-components/README.md react/README.md .claude/skills/mud-design/SKILL.md .specs/PROJECT-SPECIFICATION.md package.json CHANGELOG.md
git commit -F - <<'EOF'
docs(exports): teach the public specifiers and record the migration

Bare-specifier imports move to the new names. Physically resolved
examples — the <link> tags and the jsDelivr URLs — keep their
dist/mud/ paths, because neither consults the exports map and
rewriting them would produce 404s.

Also corrects two pre-existing defects the sweep surfaced: the
@egovmd scope, which does not exist in this workspace, and a
reference to design-system.css, which this package does not publish.
EOF
```

---

## Self-Review

**Spec coverage.** The issue asks for four renames. `./dist/mud/mud.css` → `./styles.css` and `./dist/mud/tokens/*.css` → `./tokens/*.css` are Phase 1 Step 5; `./dist/components` → `./components` likewise; `./dist/components/*` is renamed AND narrowed to `./components/mud-*.js`, which publishes every component module and none of the 35 build chunks beside them — the argument the issue makes for removing `./dist/mud/*`, applied to the sibling key it did not mention.

The fourth item, `"require": "./dist/components/index.cjs.js"`, is deliberately **not** implemented: the file is not producible by `dist-custom-elements`, declaring it would reproduce issue #1's defect class, and `checkEsmOnlySubpaths` now refuses it mechanically. Recorded in Global Constraints and in the CHANGELOG so a reader of the issue finds the answer without re-deriving it.

One addition beyond the issue survives: `./mud.esm.js`, which gives the self-registering bundle entry a public name it would otherwise lose with the wildcard — `web-components/demo/main.ts` imports it. A second, `./assets/*`, was added and then **removed before merge**: assets are reached at runtime through `getAssetPath()`, or copied with a filesystem glob and pointed at with `setAssetPath()`, and neither path consults `exports`. Two independent review lenses found it had no consumer; the owner's call was to drop it rather than publish a name nobody writes, since adding a key later is additive and removing one after publishing is not.

**Placeholder scan.** No TBD, no "handle edge cases", no "similar to Phase N". Every code step carries the literal content.

**Type consistency.** `checkPublicSpecifiers(specifiers, cwd, packedFiles)` is defined in Phase 2 Step 3, tested with all three arguments in Step 1, and called with all three in Step 5. `PUBLIC_SPECIFIERS` is exported and consumed under the same name. `standaloneBundleDir` keeps its signature and return shape; only its key lookup changes.

**Known gap, deliberately out of scope.** Consumers cannot obtain token *values* — only CSS custom properties. `tokens/core/style-dictionary.config.json` declares a single `css` platform, and the DTCG sources under `tokens/core/**/*.tokens.json` are not published (`files` lists only `dist/` and `loader/`). A JS/JSON token surface, and the icon-delivery story for consumers that copy assets into a static root, are each their own issue. `./tokens/*.css` is scoped to `.css` specifically so those can be added later without a breaking rename.
