# Issue #23 — `yarn test.storybook` Lane Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `yarn test.storybook` reach and run its suite from a clean checkout, and make the two facts that broke it — the emitted React wrappers' specifiers, and the resolution of the bare specifier `react` — fail loudly instead of silently when they drift again.

**Architecture:** Two independent changes in two files. (1) The `storybook` Vitest project declares `resolve.alias` for `react`, so the root-level `react/` workspace directory stops shadowing the npm package and the adapter leaves the lane's module graph entirely. (2) `scripts/__tests__/validate-package.spec.mjs` grows an assertion that every `@egov-moldova/mud…` specifier under `react/src/` is declared by `package.json`'s `exports` map. The alias is kept honest by an outcome assertion inside the lane's own setup file, not by a check on the config's text.

**Tech Stack:** Yarn 4 workspaces, Vite 8.0.13 (rolldown), Vitest 4.1.6, `@storybook/addon-vitest` 10.4.0, Stencil 4.x, `node --test`.

**Spec:** https://github.com/egov-moldova/design-system/issues/23 — **read with the corrections in § Corrections to the issue below.** The issue contains two false statements that this plan supersedes; its remediation list is otherwise the spec.

**Reviewed:** preflight c0addf09, critic c0addf09 — both FORTIFY, all findings folded in; see § Review rounds.

**Status:** implemented — `8a0d5e6` (Task 1) and `1c1693c` (Task 2) on `fix/issue-23-storybook-vitest-lane`. Every acceptance-bar row was re-proven against the landed code, not the temporary patch the § Acceptance bar blocks were captured with; see § As built.

---

## Global Constraints

- Node `>=24.0.0 <25.0.0` (`package.json:engines`); this machine runs Node 26 locally and it is not a constraint the plan may relax.
- Vite is pinned to rolldown-vite `^8.0.13`; resolution behaviour described here was measured against that pin and must be re-measured if it moves.
- Everything authored into the repo is English: code, comments, commit messages.
- Do not touch `.github/` — CI wiring is deferred to #20 by decision (see § Scope).
- Do not touch `src/components/mud-accordion-item/mud-accordion-item.stories.ts` — PR#24 owns that file.
- Do not touch `scripts/audit/**` — PR#13 owns `regression-baseline.mjs`, `changed-components.mjs`, `10-contrast-pairs.mjs` and `README.md` there.
- `yarn build.react` is a **local prerequisite**, not a change to land: its output is git-ignored (`react/.gitignore:6`) and no commit can carry it.

---

## Context — what the investigation settled

Eight experiments, all run in an isolated worktree at `c0addf0` (`main`), each reverted afterwards.

| # | State | Lane | `react` resolved to |
| --- | --- | --- | --- |
| E0 | clean `main`, `stencil-generated/` holds only `.gitkeep` | **FAIL** `UNRESOLVED_IMPORT` in `react/src/index.ts` | — (dies first) |
| E1 | E0 + `yarn build.react` | PASS 47/47 · 469/469 | `<root>/react/src/index.ts` ❌ |
| E2 | `react/` → `packages/react/`, leaf name unchanged | PASS 47/47 · 469/469 | `node_modules/react` ✅ |
| E2b | E2 + `stencil-generated/` absent | PASS 47/47 · 469/469 | ✅ |
| E2c | E2 + `index.ts` replaced by invalid TypeScript | PASS 47/47 · 469/469 | ✅ |
| E4a | original layout + `resolve.alias` for `react` | PASS 47/47 · 469/469 | `node_modules/react` ✅ |
| E4b | E4a + `stencil-generated/` absent | PASS 47/47 · 469/469 | ✅ |
| E4c | E4a + `index.ts` replaced by invalid TypeScript | PASS 47/47 · 469/469 | ✅ |

**The mechanism.** A directory at the Vite root whose name matches an npm package shadows that package for a bare specifier. `react/` is exactly that. The signature is in the optimizer's own metadata: `react` resolved to `<root>/react/src/index.ts` (seven `../` in `_metadata.json`) while `react/jsx-runtime` — a subpath with no file under `<root>/react/` — resolved correctly into `node_modules` (six `../`). Storybook's own Vite (`sp.dev` / `sp.build`) never had this; only the Vitest project does.

Two independent proofs that the cause is the directory's **position**, not its name:
- Source: Vite's `rolldownScanPlugin` records `depImports[id] = resolved`, where `id` is the bare specifier verbatim — the optimizer's key is never derived from a directory name.
- Experiment: E2 moved the directory while keeping the leaf name `react`, and the resolution repaired.

**Why it surfaced only now.** The defect was born with the workspace in `1152e9e` (2026-06-25). It was inert: `react` pointing at the MUD adapter harms nothing while everything the adapter imports resolves. `27d81b9` (2026-09-10) narrowed the `exports` map, the emitted wrappers' `@egov-moldova/mud/dist/components/*` specifier stopped being declared, and the inert mis-resolution became fatal. Reverting `27d81b9` would not have fixed it — E0 shows a clean checkout of `main` dying with a different error and no stale specifier anywhere.

### Options

| Option | Complexity added now | Cost to build | Cost to reverse | Risk | Value |
| --- | --- | --- | --- | --- | --- |
| **Alias `react` in the `storybook` project** | low — one config entry, no new concept | low — one file | low — delete four lines | Works around a layout defect instead of removing it; a second root-level directory colliding with a package name would need a second alias | Fixes #23 now, blocked by nothing; proven on all three bars (E4a/E4b/E4c) |
| Move `react/` → `packages/react/` | med — introduces a `packages/` layout concept while `web-components/` stays at the root, leaving the layout half-migrated | med — 9 code/config files + 5 docs + `yarn.lock` + `Dockerfile` | med — a second move plus every path consumer again | Two **silent** failure modes: wireit cache-key paths in `package.json`, and `scripts/audit/07-integration-usage.mjs:227`'s path prefix which feeds the CI regression baseline; rebase against PR#13 | Removes the defect and matches Stencil's documented monorepo layout; proven on the same three bars (E2/E2b/E2c) |
| Regenerate the wrappers only (`yarn build.react`) | low | low | low | Green locally and still dead on the next fresh clone or CI run; E1 shows the mis-resolution surviving under a fully green suite | None as a fix — it is a local prerequisite, which is how this plan treats it |

**Recommendation: the alias.** Chosen by Dan on 2026-09-11 after the experiments above. It is the only option that is blocked by nothing, and the two options that actually fix the lane were measured as equivalent on every acceptance bar. The move is real work and worth doing — as its own change, after PR#13 lands, with its two silent failure modes verified rather than assumed. It is recorded in § Deferred below, not dropped.

### Corrections to the issue

The plan is the spec of record where it disagrees with #23:

1. #23 says Vite's dependency optimizer "crawls the whole repo root". **False.** Measured with `DEBUG=vite:deps`, the crawl entries are exactly `.storybook/preview.js`, `.storybook/vitest.setup.ts` and the 47 `*.stories.ts` files. The adapter enters through the bare specifier `react`, not through a directory crawl.
2. #23 says the lane has been dead "repo-wide since 2026-09-10". **True only for machines that had run `yarn build.react`.** For a fresh clone it has been dead since **2026-06-25** (`1152e9e`), because `react/src/index.ts:3` re-exports a directory only `yarn build.react` creates.

Updating the issue text itself is out of band and awaits Dan's go-ahead; it is not a task here.

---

## Scope

**In:** issue steps 2 (the guard) and 3 (decoupling).

**Out, with disposition:**
- Step 1, regenerate the wrappers — a local prerequisite whose output is git-ignored. Nothing to land.
- Step 4, wire the lane into CI — deferred to #20 by Dan's decision on 2026-09-11, because `ci.yml` is the file #20 rewrites and two PRs on it conflict by construction.
- The layout migration — see § Deferred.
- `mud-accordion-item.stories.ts:209` (`slot="heading"` still pointer-interactive) — owned by PR#24 on `fix/issue-17-accordion-item-slotted-disabled`; #23 itself records that whether it is a real gap or a lane artifact is unsettled. **Not fixed here; reported in the completion report.** Note the branch this matters on: that story does not exist on `main`, so it does not exist on this branch either (`grep -rn 'Slotted Disabled' src/components/mud-accordion-item/mud-accordion-item.stories.ts` → no output), and all four `derived` blocks above show `469 passed (469)`. The failure appears only after a rebase over PR#24. Until then rows 1 and 3 mean exactly what they say — `47 passed (47)`, no exceptions — and after such a rebase they must be re-derived rather than waived.
- A class-level guard refusing any root-level directory that collides with a declared dependency name. Considered and deferred: Task 2's in-lane assertion covers the live instance loudly, and a class guard would have to pin `react/` as a known deviation — a pin that the layout migration deletes outright. It belongs with that migration, not here.

---

## Acceptance bar

Zero-tolerance rows — any one failing means the plan is not done:

| # | Observable | Tolerance | Instrument |
| --- | --- | --- | --- |
| 1 | From a checkout whose `react/src/components/stencil-generated/` holds only `.gitkeep`, `yarn test.storybook` reaches and runs its suite | `Test Files  47 passed (47)`; no dependency-optimization error | Task 2 Step 6, bar-1 block (cold cache) |
| 2 | `yarn test:scripts` FAILS when one emitted wrapper is restored to `@egov-moldova/mud/dist/components`, naming that file and that specifier, and PASSES once restored | exactly 2 reported dead specifiers for the single reverted file | Task 1 Step 5 (the revert-and-run block), then Task 1 Step 6 `yarn test:scripts` |
| 3 | `yarn test.storybook` still runs its suite when `react/src/index.ts` is replaced by invalid TypeScript | `Test Files  47 passed (47)`; no dependency-optimization error | Task 2 Step 6, bar-3 block (cold cache) |
| 4 | In the `storybook` project, `react`, `react/jsx-runtime` and `react-dom/client` all resolve under the repo's own `node_modules/` | `scripts/check-lane-resolution.mjs` exits 0 and prints `node_modules` for all three | `react` and `react/jsx-runtime` on **every** run, via the two throws in `.storybook/vitest.setup.ts` (Task 2 Step 1); all three once, via that script in Task 2 Step 5 |
| 5 | The lane's `Test Files` count is unchanged by this plan's changes | 47 test files | `yarn test.storybook`'s own `Test Files` line, read in Task 2 Steps 5 and 6 |

Row 5 counts **test files**, not story files. `find src -name '*.stories.ts' | wc -l` is 101; the addon turns 47 of them into Vitest test files, and 47 is what the instrument prints. An earlier wording said "story files", where a reader grading the observable literally would have read 101 and failed a correct run.

**Row 4 states a containment, not a path depth.** An earlier draft compared `../` segment counts (`6`, never `7`) against `_metadata.json`'s relative `src`. That number is the distance from `node_modules/.cache/storybook/<storybookVersion>/<configHash>/sb-vitest/deps` to the repo root — it encodes Storybook's own cache layout, so a version bump would report FAILED on a correct resolution, and the comparison could not tell the bug apart from the fix anyway (both spell `(../)+react/`). Resolving `src` against the deps directory and asking whether the result is inside `<root>/node_modules/` is depth-independent and is the invariant the row actually claims.

Rows 1, 3, 4 and 5 are backed by runs in this worktree at `c0addf09`, each with the
optimizer cache cleared first. **The four blocks are NOT one capture, and the difference is
the whole evidence**: the first ran with the plan's changes absent, the other three with
them applied as a temporary patch. Each block names its state below. `scripts/check-lane-resolution.mjs`
did not exist on disk either — it was run from a scratch copy with the same body Task 2
Step 5 creates. Everything was reverted afterwards; `git status --porcelain` reports only
the untracked plan.

**Before the fix** — state: no alias in `vitest.config.mts`, no guard in `.storybook/vitest.setup.ts`, wrappers present, cache cold. This is the diagnosis itself, which until now lived only in a summary table:

```derived id=resolution-before-alias
$ rm -rf node_modules/.cache/storybook && yarn test.storybook 2>&1 | grep -E 'Test Files|Tests  '
 Test Files  47 passed (47)
      Tests  469 passed (469)
$ node scripts/check-lane-resolution.mjs "$(find "$PWD/node_modules/.cache/storybook" -name _metadata.json -path '*sb-vitest*' | head -1)" "$PWD"; echo "exit=$?"
react -> /Users/Dan/WORK/corlab/egov-moldova/design-system-issue-23/react/src/index.ts
react/jsx-runtime -> node_modules
react-dom/client -> node_modules
resolution check FAILED:
  react resolves outside node_modules: /Users/Dan/WORK/corlab/egov-moldova/design-system-issue-23/react/src/index.ts
exit=1
```

Read the two halves together: the suite is **green while the resolution is wrong**. That is
the whole shape of #23 — the mis-resolution is silent until the adapter's own imports stop
resolving, which is why a guard is part of this plan and not just the alias.

**After the fix — row 4.** State: alias and both setup-file guards applied, wrappers present, cache cold.

```derived id=resolution-after-alias
$ rm -rf node_modules/.cache/storybook && yarn test.storybook 2>&1 | grep -E 'Test Files|Tests  '
 Test Files  47 passed (47)
      Tests  469 passed (469)
$ node scripts/check-lane-resolution.mjs "$(find "$PWD/node_modules/.cache/storybook" -name _metadata.json -path '*sb-vitest*' | head -1)" "$PWD"; echo "exit=$?"
react -> node_modules
react/jsx-runtime -> node_modules
react-dom/client -> node_modules
resolution check OK
exit=0
```

**Row 1 — the generated wrappers moved out, the tracked `.gitkeep` left in place.** State: alias and guards applied, cache cold.

```derived id=bar1-fresh-clone
$ mv react/src/components/stencil-generated/mud-*.ts react/src/components/stencil-generated/components.ts "$BAK"/ && git status --porcelain react/src/components/stencil-generated/
$ rm -rf node_modules/.cache/storybook && yarn test.storybook 2>&1 | grep -E 'Test Files|Tests  '
 Test Files  47 passed (47)
      Tests  469 passed (469)
```

The empty `git status` is the point: moving the *contents* rather than the directory leaves
`.gitkeep` — which `react/.gitignore:7` deliberately keeps tracked — where it is.

**Row 3 — the adapter entry replaced by invalid TypeScript.** State: alias and guards applied, wrappers present, cache cold.

```derived id=bar3-broken-workspace
$ printf 'import { nothing } from "./this-module-does-not-exist";\nthis is not valid typescript !!!\n' > react/src/index.ts
$ rm -rf node_modules/.cache/storybook && yarn test.storybook 2>&1 | grep -E 'Test Files|Tests  '
 Test Files  47 passed (47)
      Tests  469 passed (469)
```

**Row 2 is the one row with no `derived` block, and that is correct rather than an omission:**
it asserts a failure of an assertion this plan has not written yet. It becomes derivable at
Task 1 Step 5, which is where it is graded.

The `Tests` number is deliberately NOT a bar row: PR#24 adds a story to
`mud-accordion-item.stories.ts` on another branch, so 469 moves for reasons this plan does
not control, while the file count does not.

Non-goals, explicitly outside the bar: CI executing the lane (#20), the failing
`Slotted Disabled Contract` story (PR#24), and `tsc --noEmit` in `react/` going green —
that is pre-existing debt this plan neither creates nor repairs.

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `scripts/validate-package.mjs` | Modify — add one exported helper | Owns the `exports`-map primitives the gate and its tests share. The new helper turns one `exports` key into the RegExp matching the specifiers it serves, so the escaping subtlety is written once. |
| `scripts/__tests__/validate-package.spec.mjs` | Modify — one new `describe`, one call site updated | Owns the package-surface assertions. The new block binds the emitted React wrappers to the `exports` map — the half the existing `customElementsDir` test at `:439` cannot see. |
| `vitest.config.mts` | Modify — `resolve.alias` on the `storybook` project; correct a false comment at `:95-96` | Owns the two Vitest projects. |
| `.storybook/vitest.setup.ts` | Modify — add the outcome assertion | Runs inside the `storybook` project, which is the only place the resolution is actually exercised. |
| `scripts/check-lane-resolution.mjs` | Create | Grades bar row 4 from the optimizer's own `_metadata.json`: resolves each recorded `src` against the deps directory and exits non-zero unless it lands inside `<root>/node_modules/`. A file rather than an inline `node -e` because the bar has to be re-runnable, and because the inline form had to be quoted through `yarn`, `find` and a heredoc at once — where the first draft acquired two defects at the same time (a relative path handed to `require`, and a shape test that could not tell the bug from the fix). |

---

### Task 1: Bind the emitted React wrappers to the `exports` map

**Files:**
- Modify: `scripts/validate-package.mjs` (add `exportsKeyPattern`)
- Modify: `scripts/__tests__/validate-package.spec.mjs:368-390` (use the helper) and after `:457` (new `describe`)
- Test: `scripts/__tests__/validate-package.spec.mjs` — this task's deliverable *is* the test

**Interfaces:**
- Produces: `exportsKeyPattern(key: string) => RegExp` from `scripts/validate-package.mjs` — takes one `package.json` `exports` key (`'.'`, `'./components'`, `'./components/mud-*.js'`) and returns the RegExp matching the full public specifiers that key serves (`/^@egov-moldova\/mud$/`, `/^@egov-moldova\/mud\/components$/`, `/^@egov-moldova\/mud\/components\/mud-.+\.js$/`).
- Consumes: `PROJECT_ROOT` from `scripts/validate-package.mjs` (already imported by the spec file).

**Design note — why `react/src/**` and not only the generated subtree, and what that does NOT buy.** #23 proposes skipping when `react/src/components/stencil-generated/` is empty. Scanning all of `react/src` removes the need for that skip: on a fresh clone the scan still grades `react/src/index.ts`, which is tracked and names `@egov-moldova/mud/loader` and `@egov-moldova/mud/components`, so the test never reports a pass over zero files.

State the limit plainly, because "never passes vacuously" overstates it: **where no build output is present — CI, and any machine that has not run `yarn build.react` — the 56 wrappers this guard exists for are not on disk, and the scan grades one file.** The config half of that binding is `validate-package.spec.mjs:439`'s job and always runs; the emitted half is graded wherever a build happens to be, which is every developer worktree and no CI job today. Making CI grade it means running `yarn build.react` before `yarn test:scripts`, which is a `.github/` change and out of scope here per § Global Constraints.

**Design note — the extraction regex, and the grammar it does not own.** The matcher anchors on a **quote immediately followed by `@egov-moldova/mud`**, with no keyword prefix. Keying it on `from`/`import` was the first draft and it was too narrow: `import("…")` puts no whitespace before the quote and `require("…")` uses neither keyword, so a wrapper that ever drifts into either form would pass vacuously — the exact silent miss this guard exists to end.

Dropping the keyword is safe here because the two false positives it could invite are not reachable in this workspace: `react/src/index.ts:14` is a doc comment and `:42` a runtime URL string, and **both spell the path as `/node_modules/@egov-moldova/mud/…`** — the character after the opening quote is `/`, not `@`, so neither matches. That distinction is deliberate — `27d81b9`'s own plan reasoned about it, and a whole-file find/replace destroys it.

What the matcher still cannot see, stated rather than discovered later: a specifier assembled at runtime from fragments (`'@egov-moldova/mud/' + dir`). No static check reads that, and `references/architecture-decisions.md` §7 is why this one does not try — the input it *can* own is a quoted literal, and it grades exactly that. Today every file under `react/src` is generator output or the one hand-written entry, so the literal form is the whole input distribution.

- [x] **Step 0: Generate the input this task's acceptance bar grades**

```bash
command ls react/src/components/stencil-generated | wc -l
# 1 (only .gitkeep) on a clean checkout → run the next line.
# 57 → already generated; skip it.
yarn build.react
command ls react/src/components/stencil-generated | wc -l
# Expected: 57 — 56 wrappers plus components.ts.
```

**Not optional, and easy to skip because the plan calls `yarn build.react` a "local prerequisite" everywhere else.** § Status declares this plan starts `unbuilt`, and on a clean checkout that directory holds only `.gitkeep` — in which case Step 5's `cp` finds no file, `perl -pi` rewrites nothing, `grep -c` prints 0, and bar row 2 cannot be graded at all. The prose prerequisite is real; this step is where it actually has to happen, because Task 1 runs first and nothing before it produces the input.

- [x] **Step 1: Add the shared helper to `scripts/validate-package.mjs`**

Append near the other exported helpers:

```js
/**
 * Turn one `exports` key into the RegExp matching the public specifiers it serves.
 *
 * Escape first, then substitute the wildcard. An unescaped key leaves `.` matching
 * any character, so `./tokens/*.css` would accept `.../tokens/coreXtokensYcss` — a
 * specifier no consumer could write — and a future key holding `+`, `(` or `?`
 * would throw here instead of matching. `replaceAll`, not `replace`: a key with
 * two wildcards would otherwise keep the second one literal. And `.*`, not `.+`:
 * Node's subpath-pattern `*` matches ZERO or more characters, `/` included, so
 * `.+` would quietly narrow the grammar this is a translation of.
 */
export function exportsKeyPattern(key) {
  const suffix = key === '.' ? '' : key.slice(1);
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  return new RegExp(`^@egov-moldova/mud${escaped.replaceAll(String.raw`\*`, '.*')}$`);
}
```

- [x] **Step 2: Point the existing test at the helper**

In `scripts/__tests__/validate-package.spec.mjs`, add `exportsKeyPattern` to the import list from `'../validate-package.mjs'`, then replace the body of the `PUBLIC_SPECIFIERS covers the exports map` test's `filter` callback so the escaping lives in one place:

```js
    const missing = Object.keys(pkg.exports).filter(key => {
      const suffix = key === '.' ? '' : key.slice(1);
      if (!key.includes('*')) {
        return !PUBLIC_SPECIFIERS.includes(`@egov-moldova/mud${suffix}`);
      }
      const shape = exportsKeyPattern(key);
      return !PUBLIC_SPECIFIERS.some(specifier => shape.test(specifier));
    });
```

The four-line comment above that `filter` explained the escaping; move it onto `exportsKeyPattern` (Step 1 already carries it) and delete it here rather than leaving two copies.

- [x] **Step 3: Run the existing suite to prove Step 2 changed nothing**

Run: `yarn test:scripts`
Expected: PASS, same test count as before the change. A failure here means the helper is not behaviour-identical to the inlined code it replaced.

- [x] **Step 4: Write the new failing test**

Append at the end of `scripts/__tests__/validate-package.spec.mjs` — the file is 455 lines, and the last `describe` (`the React output target names the exports key`) closes at `:455`:

```js
describe('the React workspace names only exported subpaths', () => {
  // `the React output target names the exports key` above binds the CONFIG
  // (`stencil.config.ts`'s `customElementsDir`) to the `exports` key. It cannot
  // see the files that config produced: those are git-ignored
  // (`react/.gitignore:6`), so a worktree whose last `yarn build.react` predates
  // an `exports` rename carries 56 wrappers holding a dead specifier that no
  // check reports. That is issue #23, and this is the half that reads the files.
  //
  // The scan covers all of `react/src`, not just the generated subtree, so it
  // never passes vacuously: on a fresh clone the generated directory holds only
  // `.gitkeep` and `react/src/index.ts` is still graded.
  const REACT_SRC = path.join(PROJECT_ROOT, 'react/src');
  // Anchored on the quote, not on `from`/`import`: `import("…")` has no space
  // before the quote and `require("…")` uses neither keyword, and a wrapper that
  // drifted into either would otherwise pass vacuously. Safe because the two
  // non-import mentions in `react/src/index.ts` both spell the path
  // `/node_modules/@egov-moldova/mud/…`, so the character after the quote is `/`.
  const SPECIFIER_RE = /["'](@egov-moldova\/mud(?:\/[^"']*)?)["']/g;
  const SOURCE_EXT = /\.tsx?$/;

  const walk = dir =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.isFile() && SOURCE_EXT.test(full) ? [full] : [];
    });

  it('every `@egov-moldova/mud` specifier under react/src resolves through the exports map', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const patterns = Object.keys(pkg.exports).map(exportsKeyPattern);

    const files = walk(REACT_SRC);
    assert.ok(files.length > 0, 'react/src holds no .ts/.tsx files — the scan would grade nothing');

    const dead = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const [, specifier] of source.matchAll(SPECIFIER_RE)) {
        if (!patterns.some(pattern => pattern.test(specifier))) {
          dead.push(`${path.relative(PROJECT_ROOT, file)}: ${specifier}`);
        }
      }
    }
    assert.deepEqual(dead, []);
  });
});
```

- [x] **Step 5: Prove the test FAILS on the condition it exists for**

This is acceptance bar 2 and it is not optional — a guard that has only ever been seen passing is not known to grade anything.

```bash
# `mktemp -d`, not a fixed /tmp name: this repo is worked in several sibling
# worktrees at once, and a shared /tmp/mud-accordion.ts.bak is one concurrent run
# away from restoring another worktree's file over this one.
BAK=$(mktemp -d)
trap 'cp "$BAK/mud-accordion.ts" react/src/components/stencil-generated/mud-accordion.ts 2>/dev/null; rm -rf "$BAK"' EXIT

# Reproduce the exact state that broke the lane: one wrapper on the old specifier.
cp react/src/components/stencil-generated/mud-accordion.ts "$BAK/mud-accordion.ts"
perl -pi -e 's{\@egov-moldova/mud/components}{\@egov-moldova/mud/dist/components}g' \
  react/src/components/stencil-generated/mud-accordion.ts
grep -c '@egov-moldova/mud/dist/components' react/src/components/stencil-generated/mud-accordion.ts
# Expected: 2 — two distinct lines (the `Components` type import and the element
# import). If it prints 0 the substitution did not land and the next step proves
# nothing; `perl -pi` writes the input back unchanged and exits 0, so this count
# is the only thing standing between a no-op and a false pass.

yarn test:scripts
# Expected: FAIL, naming exactly
#   react/src/components/stencil-generated/mud-accordion.ts: @egov-moldova/mud/dist/components
#   react/src/components/stencil-generated/mud-accordion.ts: @egov-moldova/mud/dist/components/mud-accordion.js

cp "$BAK/mud-accordion.ts" react/src/components/stencil-generated/mud-accordion.ts
grep -c '@egov-moldova/mud/dist/components' react/src/components/stencil-generated/mud-accordion.ts
# Expected: 0 — the file is restored.
```

- [x] **Step 6: Run the suite to verify it passes again**

Run: `yarn test:scripts`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add scripts/validate-package.mjs scripts/__tests__/validate-package.spec.mjs
git commit -F - <<'EOF'
test(package): read the emitted React specifiers, not just the config

`the React output target names the exports key` binds `customElementsDir` to
the `exports` key and stops there. The files that setting produces are
git-ignored, so a worktree whose last `yarn build.react` predates an `exports`
rename carried 56 wrappers naming a subpath the map no longer declares, and
nothing reported it — issue #23.

The scan covers all of `react/src`, so a fresh clone with an empty generated
directory still grades the tracked `index.ts` instead of passing vacuously.
`exportsKeyPattern` is extracted rather than copied: the escape-then-substitute
order is a correctness detail that must not be re-derived at a second call site.
EOF
```

---

### Task 2: Stop the root-level `react/` directory from shadowing the npm package

**Files:**
- Modify: `vitest.config.mts:1-2` (import), `:90-97` (the `storybook` project's `resolve`, and the false comment)
- Modify: `.storybook/vitest.setup.ts`
- Test: `.storybook/vitest.setup.ts` — the assertion runs on every `yarn test.storybook`

**Interfaces:**
- Consumes: nothing from Task 1. The two tasks are independent and either order works.
- Produces: no exported symbol. The contract is behavioural — in the `storybook` project, the bare specifier `react` resolves into `node_modules/react`.

**Design note — why the alias maps to a directory.** Vite's object-form `resolve.alias` matches an id that equals the key *or starts with the key plus `/`*, and replaces that prefix. Mapping `react` to the resolved entry file would rewrite `react/jsx-runtime` into `…/node_modules/react/index.js/jsx-runtime`, which cannot resolve. Mapping it to the package directory keeps subpaths working. Step 4 verifies that rather than assuming it.

**Design note — why the guard lives in the setup file.** The thing to protect is an outcome (what `react` resolves to), not a spelling (whether a config line exists). A test asserting the config's text would grade the fix's wording and pass over a fix that had stopped working; the `storybook` project's setup file is the one place the resolution is actually exercised, which is where the check belongs.

- [x] **Step 1: Write the failing assertion first**

Replace the whole of `.storybook/vitest.setup.ts` with the block below — header included. The header is not kept verbatim: its closing clause used to call the file "intentionally minimal", which would now sit directly above a load-bearing guard and tell the next reader the file is a placeholder. The Storybook 10.3 annotation fact in it is worth keeping, so the block carries it forward with the clause rewritten.

```ts
// Vitest setup for the Storybook addon-vitest project.
//
// Since Storybook 10.3 the addon applies preview annotations (decorators,
// parameters) automatically. This file carries no story setup for that reason —
// only the resolution guard below, which no story needs and the lane does. Add
// story hooks here only when one genuinely needs cross-test setup (timers,
// network mocks, etc.).

// Guard for the `react` alias in `vitest.config.mts` (issue #23). A directory at
// the Vite root whose name matches an npm package shadows that package for a bare
// specifier, and `react/` — the MUD React adapter workspace — is exactly that.
// Without the alias this project loads the adapter as `react`, which is SILENT
// while the adapter's git-ignored generated sources happen to resolve, and fatal
// on a clean checkout where they do not. Asserting the outcome here is the point:
// this is the only place the resolution is exercised, and a check on the config's
// text would grade the spelling of the fix rather than its effect.
// Both entries, because the alias maps `react` to a DIRECTORY and object-form
// aliases rewrite a matching prefix: `react` proves the alias fired, and
// `react/jsx-runtime` proves it did not break subpath resolution on the way.
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';

if (typeof React.createElement !== 'function') {
  throw new Error(
    'the `storybook` project resolved `react` to something that is not React — ' +
      'the `resolve.alias` in vitest.config.mts is missing or ineffective (issue #23)',
  );
}

if (typeof (ReactJsxRuntime as { jsx?: unknown }).jsx !== 'function') {
  throw new Error(
    'the `storybook` project resolved `react/jsx-runtime` to something that is not the ' +
      'JSX runtime — the `resolve.alias` in vitest.config.mts broke subpath resolution (issue #23)',
  );
}
```

- [x] **Step 2: Run the lane to verify it fails**

```bash
yarn build.react
rm -rf node_modules/.cache/storybook
yarn test.storybook
```

`yarn build.react` first because without it the adapter's barrel does not exist and the run dies with `UNRESOLVED_IMPORT` — a different failure that proves nothing about the assertion.

**`rm -rf node_modules/.cache/storybook` is load-bearing and not hygiene.** The mis-resolution happens during dependency pre-bundling, and a valid optimizer cache skips that step entirely — so a warm cache reproduces neither the bug nor the fix. This is measured, not theoretical: during the investigation a cache written by a later experiment sat in this worktree showing the *fixed* resolution while `vitest.config.mts` carried no alias at all, which is exactly the state that would make this step lie.

Expected: FAIL — the thrown message from Step 1, or a resolution error naming `react/src/…`.

A PASS here does **not** mean the fix is unnecessary. It means the cache was not actually cleared, or an alias is already present in the file; check both and re-run. Reading a pass as "Step 3 has nothing to add" is how a vacuous cache silently cancels this whole task.

- [x] **Step 3: Add the alias**

In `vitest.config.mts`, add the import:

```ts
import { createRequire } from 'node:module';
```

as the first line, above `import path from 'node:path';`.

Then, in the second project object, insert `resolve` between `extends: true,` and `plugins: [`:

```ts
      {
        extends: true,
        resolve: {
          // `react/` is a workspace directory at the Vite root, and a root-level
          // directory whose name matches an npm package shadows that package for a
          // bare specifier. Measured: this project resolved `react` to
          // `<root>/react/src/index.ts` — the MUD React adapter — while
          // `react/jsx-runtime`, a subpath with no file under `<root>/react/`,
          // resolved correctly into `node_modules`. That pulled the adapter's
          // git-ignored generated sources into the dep graph, where a clean
          // checkout has none, and `yarn test.storybook` died in pre-bundling
          // before running a test (#23). Storybook's own Vite (`sp.dev`,
          // `sp.build`) never had this — it resolves `react` to `node_modules`.
          //
          // The value is the package DIRECTORY, not its entry file: object-form
          // aliases replace a matching prefix, so an entry-file value would
          // rewrite `react/jsx-runtime` to `.../index.js/jsx-runtime`.
          //
          // `.storybook/vitest.setup.ts` asserts the outcome, so deleting this
          // fails the lane loudly instead of silently restoring the bug.
          alias: {
            react: path.dirname(createRequire(import.meta.url).resolve('react/package.json')),
          },
        },
        plugins: [
```

Then declare the dependency this line now consumes. The root `package.json` lists neither `react` nor `react-dom`; both hoist to the root `node_modules` from `react/package.json`'s own devDependencies, and `react` additionally arrives as an undeclared transitive of `@storybook/addon-docs`. That works today — verified, `createRequire(…).resolve('react/package.json')` lands in the root `node_modules` — but it is a resolution the *root config file* depends on, and any hoisting change turns it into a throw **at config load**, which takes out the `spec` project too, not just `storybook`. § Deferred plans exactly such a change. So:

```bash
yarn add --dev react@^18.3.1
git diff --stat package.json yarn.lock
# Expected: `react` appears in the root devDependencies and the lockfile records it.
# CI runs `yarn install --immutable` (ci.yml:197), so the lockfile must travel in
# the same commit as package.json.
```

A `try/catch` with a fallback path was considered and rejected: that is the fallback-anchor shape `~/.claude/CLAUDE.md` § Code standards forbids by name — the resolve would land somewhere nobody chose, and every check downstream would still pass.

- [x] **Step 4: Correct the false comment above the `pre` resolver**

Anchor on the text, not on a line range: Step 3 inserted about 25 lines above it, so any range cited here is already stale by the time this step runs. The block to replace is the comment ending `…plugin builds its own resolver chain that swallows aliases.` immediately above `name: 'age:redirect-dist-bundle-to-source-loader'`. That claim is false for bare-package aliases — Step 3 measured the opposite. Replace the block with:

```ts
          // Rewrite preview.js's lazy bundle import to the source loader so
          // coverage tooling sees the real component files. A `pre` resolver and
          // not a `resolve.alias` because this matches the END of a specifier:
          // object-form aliases match a prefix, which a path suffix cannot express.
          // (Bare-package aliases do work here — see the `react` entry above.)
          // The dist bundle is still used by regular Storybook dev / prod.
```

- [x] **Step 5: Write the resolution check, then run the lane and grade row 4 with it**

Create `scripts/check-lane-resolution.mjs`:

```js
// Grades acceptance-bar row 4 of
// `.claude/plans/2026-09-11-issue-23-storybook-lane-react-shadowing.md`: inside the
// `storybook` Vitest project, `react` and its neighbours must resolve into this repo's
// own `node_modules/`, never into the `react/` workspace directory at the Vite root.
//
// Reads the optimizer's own record rather than re-implementing resolution: whatever
// Vite actually resolved is what `_metadata.json` stored.
//
// It asks about CONTAINMENT, not path depth. An earlier draft counted `../` segments and
// required exactly 6 — that number is the distance from
// `node_modules/.cache/storybook/<version>/<hash>/sb-vitest/deps` to the repo root, so a
// Storybook cache-layout change would fail a correct resolution, and the count could not
// discriminate anyway: the bug state (`../../../../../../../react/src/index.ts`) and the
// fixed state (`../../../../../../react/index.js`) are both `(../)+react/`.
//
// Usage: node scripts/check-lane-resolution.mjs <path to _metadata.json> <repo root>
import fs from 'node:fs';
import path from 'node:path';

const [, , metaPath, repoRoot] = process.argv;
if (!metaPath || !repoRoot) {
  console.error('usage: node scripts/check-lane-resolution.mjs <_metadata.json> <repo root>');
  process.exit(2);
}

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const depsDir = path.dirname(metaPath);
const expected = path.join(repoRoot, 'node_modules') + path.sep;

// Two outcomes, two exit codes, because they mean different things. `bad` is the
// defect this check exists for: something resolved outside `node_modules/`. `missing`
// is not that — Vite simply did not pre-bundle the entry, which a Vite or Storybook
// bump can change on its own. Folding them together would report a correct lane as
// FAILED, which is the same cache-coupling this script was rewritten to remove.
const bad = [];
const missing = [];
for (const key of ['react', 'react/jsx-runtime', 'react-dom/client']) {
  const src = meta.optimized?.[key]?.src;
  if (!src) {
    console.log(`${key} -> not pre-bundled`);
    missing.push(key);
    continue;
  }
  // `src` is recorded relative to the deps directory; resolve before comparing.
  const abs = path.resolve(depsDir, src);
  console.log(`${key} -> ${abs.startsWith(expected) ? 'node_modules' : abs}`);
  if (!abs.startsWith(expected)) bad.push(`${key} resolves outside node_modules: ${abs}`);
}

if (bad.length) {
  console.error('resolution check FAILED:\n  ' + bad.join('\n  '));
  process.exit(1);
}
if (missing.length) {
  console.error(
    `not pre-bundled: ${missing.join(', ')} — no resolution to grade. This is an optimizer-set ` +
      'change, not a resolution failure; re-check the entry list before treating it as either.',
  );
  process.exit(3);
}
console.log('resolution check OK');
```

Then:

```bash
rm -rf node_modules/.cache/storybook
yarn test.storybook
# Expected: `Test Files  47 passed (47)`. On this branch there are no expected
# story failures — see § Scope for why, and for what changes after a rebase over
# PR#24. Pre-bundling must not fail and the Step 1 assertions must not throw.

F=$(find "$PWD/node_modules/.cache/storybook" -name _metadata.json -path '*sb-vitest*' | head -1)
test -n "$F" || { echo "no sb-vitest _metadata.json — the optimizer did not run"; exit 1; }
node scripts/check-lane-resolution.mjs "$F" "$PWD"
# Expected: three `-> node_modules` lines, `resolution check OK`, exit 0.
```

`"$PWD/node_modules/..."` and not `node_modules/...`: `find` echoes its start path verbatim, and a relative result was being handed to a reader that treats a path without a leading `./` as a bare package specifier — the first draft of this step could not execute at all. `test -n "$F"` covers the other half, an empty match.

`react-dom/client` is the control: the alias does not touch it, so a change there means the edit reached further than intended.

- [x] **Step 6: Prove the decoupling — acceptance bars 1 and 3**

```bash
GEN=react/src/components/stencil-generated
WRAPPERS=$(mktemp -d)   # the 56 git-ignored wrappers + components.ts
ENTRY=$(mktemp -d)      # react/src/index.ts, which is TRACKED
cp react/src/index.ts "$ENTRY/index.ts"

# Restore on ANY exit, including an interrupted run. TWO directories, and the split
# is the whole point: the wrappers are git-ignored and their loss costs a
# `yarn build.react`, but `react/src/index.ts` is TRACKED and bar 3 overwrites it —
# and a dispatched leg may not run the `git restore` that would bring it back
# (`~/.claude/CLAUDE.md` § Autonomy gates). A single directory holding both invites
# a restore glob that moves the entry file in among the wrappers and then has
# nothing left to put back; that is not hypothetical, it is what the first version
# of this trap did. Restore by explicit name, never by glob, and say so on failure
# rather than sending it to /dev/null.
restore() {
  # `cp -R <dir>/.`, not a glob: in zsh a glob that matches nothing ABORTS the
  # function, so on the second EXIT (backup already emptied) the tracked-file
  # restore on the next line would never run — the same class of defect round 3
  # found in the first version of this trap. Measured live on 2026-09-11.
  cp -R "$WRAPPERS"/. "$GEN"/ 2>/dev/null || true
  cp "$ENTRY/index.ts" react/src/index.ts \
    || echo "RESTORE FAILED: react/src/index.ts left modified — its backup is $ENTRY/index.ts" >&2
  rm -rf "$WRAPPERS" "$ENTRY"
}
trap restore EXIT
# `mktemp -d` rather than fixed /tmp names because this repo is worked in sibling
# worktrees concurrently, and a shared name is one overlapping run from restoring
# another worktree's file over this one.

# Bar 1 — the state a clean checkout is in: the directory holds only `.gitkeep`.
# Move the CONTENTS, not the directory: `.gitkeep` is TRACKED (`react/.gitignore:7`
# negates it), so moving the directory stages a deletion of a tracked file.
BEFORE=$(command ls "$GEN" | wc -l | tr -d ' ')   # measured, never a literal: the
                                                  # component count grows with the repo
mv "$GEN"/mud-*.ts "$GEN"/components.ts "$WRAPPERS"/
git status --porcelain "$GEN"      # Expected: no output — `.gitkeep` untouched.
rm -rf node_modules/.cache/storybook
yarn test.storybook                # Expected: `Test Files  47 passed (47)`.
mv "$WRAPPERS"/mud-*.ts "$WRAPPERS"/components.ts "$GEN"/
test "$(command ls "$GEN" | wc -l | tr -d ' ')" = "$BEFORE" \
  || { echo "restore incomplete: $GEN went from $BEFORE to $(command ls "$GEN" | wc -l)"; exit 1; }

# Bar 3 — the workspace is broken outright.
printf 'import { nothing } from "./this-module-does-not-exist";\nthis is not valid typescript !!!\n' > react/src/index.ts
rm -rf node_modules/.cache/storybook
yarn test.storybook                # Expected: `Test Files  47 passed (47)`.
cp "$ENTRY/index.ts" react/src/index.ts
git diff --stat react/src/index.ts # Expected: no output — the file is restored.
```

Both `rm -rf node_modules/.cache/storybook` lines are the same load-bearing step as in Step 2, and for the same measured reason: pre-bundling is the thing these two bars claim survives, and a warm cache skips pre-bundling, so without them both rows can pass having exercised nothing.

- [x] **Step 7: Commit**

```bash
git add vitest.config.mts .storybook/vitest.setup.ts scripts/check-lane-resolution.mjs package.json yarn.lock
git commit -F - <<'EOF'
fix(test): stop the `react/` workspace from shadowing React in the lane

A directory at the Vite root whose name matches an npm package shadows that
package for a bare specifier. The `storybook` Vitest project resolved `react`
to `<root>/react/src/index.ts` — the MUD React adapter — while
`react/jsx-runtime` resolved correctly into node_modules, which is the
signature. That pulled the adapter's git-ignored generated sources into the
dep graph; a clean checkout has none, so `yarn test.storybook` died in
pre-bundling before running a test.

The alias is kept by an assertion in the lane's own setup file rather than by a
check on this file's text: the contract is what `react` resolves to, and a
config-text check would pass over a fix that had stopped working.

Also corrects the claim above the `pre` resolver that aliases are swallowed
here. They are not; that resolver matches a path suffix, which a prefix alias
cannot express.

Closes #23
EOF
```

---

## Execution matrix

| Phase | Task | Shape | Model | Effort | Wave | Git |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Task 1 — the guard | implementer: one new assertion plus one extraction, both decided by this plan | sonnet | high | A | controller commits |
| 2 | Task 2 — the alias | implementer: three small edits plus one new script, with a measured acceptance bar | sonnet | high | B (after A completes) | controller commits |
| 3 | Grade | `code-review` then `dan-fresh-eyes` verify lane against this plan | per each skill's own pin | — | C | none |

**The two tasks are SEQUENTIAL, and the reason is their verification steps, not their edits.** Their *edits* are disjoint (`scripts/validate-package.mjs` + its spec, versus `vitest.config.mts` + `.storybook/**`), which is what an earlier draft of this matrix scored — and it put them in one wave on that basis. Their *verification* steps are not disjoint at all: Task 1 Step 5 rewrites and restores `react/src/components/stencil-generated/mud-accordion.ts`, while Task 2 Step 6 moves that whole directory's contents out and back. Interleaved, the `perl -pi` finds no file, or the restoring `cp` recreates one file into a tree that has been moved away, or one task's restore lands on top of the other's. Every file involved is git-ignored, so the recovery is not `git restore` — it is a full `yarn build.react`, and a dispatched leg may not run the discard commands that would otherwise clean up.

Both tasks also clear `node_modules/.cache/storybook`, which is a second shared resource: concurrently, one task deletes the cache the other is mid-run against.

One serialized step is the whole cost. It buys a bar-2 result that can be trusted and 56 generated files that cannot be silently corrupted.

---

## As built

Implemented 2026-09-11 as `8a0d5e6` (Task 1) and `1c1693c` (Task 2). Every bar row re-proven against the landed code:

| Row | Result |
| --- | --- |
| 1 | wrappers moved out, `.gitkeep` intact (`git status` over the directory: empty) → `Test Files  47 passed (47)` · `Tests  469 passed (469)` |
| 2 | one wrapper reverted to `dist/components` → `tests 340 · pass 339 · fail 1`, naming exactly the two expected dead specifiers; restored → `pass 340 · fail 0` |
| 3 | `react/src/index.ts` replaced by invalid TypeScript → `Test Files  47 passed (47)`; `git diff` after restore: empty |
| 4 | `scripts/check-lane-resolution.mjs` → three `-> node_modules` lines, `resolution check OK`, exit 0 |
| 5 | `Test Files  47 passed (47)`, unchanged |

**Two things the plan did not predict, both caught by the bar rather than by review.**

**The setup file may carry no TypeScript-only syntax.** The first version used a type assertion, `(ReactJsxRuntime as { jsx?: unknown }).jsx`. `@storybook/addon-vitest` re-exports the setup module through `dist/vitest-plugin/setup-file-with-project-annotations.js`, and on that path it is parsed as JavaScript: the run came back `Test Files  9 failed | 38 passed (47)` with `SyntaxError: Unexpected token ':'` attributed to the addon's own file. Nine of forty-seven, and the error pointing at a dependency, is a shape that reads as flakiness rather than as a syntax error in our file. The guard now uses a named import (`import { jsx } from 'react/jsx-runtime'`) and plain `typeof`, and the file says why.

**A restore glob that matches nothing aborts the function in zsh.** Task 2 Step 6's `restore()` used `cp "$WRAPPERS"/mud-*.ts …`. On the second EXIT — backup already emptied by the happy path — zsh's nomatch aborted `restore()` before the line that puts the tracked `react/src/index.ts` back. That is the same class round 3 found in this trap's first version, surviving its own fix in a different shell. Now `cp -R "$WRAPPERS"/. "$GEN"/`, which has no glob. Observed live; nothing was lost, because the explicit restore had already run.

Not verified: the `exit 3` branch of `check-lane-resolution.mjs` (a dependency Vite declines to pre-bundle) was never exercised — no state in this repo produces it today.

---

## Deferred

**Move `react/` and `web-components/` under `packages/`.** Stencil's own documentation (`stenciljs.com/docs/react`) puts both the Stencil library and each framework wrapper under `packages/`, and names the wrapper `react-library` rather than `react`. Measured cost: 9 code/config files (`package.json` workspaces + 7 wireit path entries, `stencil.config.ts:72`, `Dockerfile:10-11`, `scripts/audit/07-integration-usage.mjs:48-50,227`, `yarn.lock`) plus 5 documentation files (`CONTRIBUTING.md`, `react/README.md`, `STACK.md`, `INTEGRATION.md`, `_agents/verification-git.md`). Two of those fail loudly (`yarn install --immutable` in `ci.yml:197`, the Docker build in `ci.yml:157`) and two fail silently — the wireit entries are cache keys, and `07-integration-usage.mjs:227` classifies by path prefix into a report the CI regression baseline compares against. Do it after PR#13 lands, and verify the two silent ones explicitly. When it lands, the alias in `vitest.config.mts` becomes dead config and should be removed together with the setup-file assertion.

**Wire `yarn test.storybook` into CI.** Deferred to #20.

---

## Self-Review

**Spec coverage.** #23 lists four remediation steps. Its step 1 (regenerate) — local prerequisite, § Global Constraints, nothing to land. Its step 2 (bind emitted output to the map) — Task 1. Its step 3 (decouple the lane) — Task 2. Its step 4 (CI) — deferred to #20, § Scope. The requester's four acceptance bars — numbered here as **#23's**, which do not line up with this plan's own five-row § Acceptance bar: #23's bar 1 → Task 2 Step 6 (this plan's row 1); #23's bar 2 → Task 1 Step 5 (row 2); #23's bar 3 → Task 2 Step 6 (row 3); #23's bar 4 (CI) → deferred to #20, and it is the only one deferred. This plan's own rows 4 and 5 have no counterpart in #23 and are graded by Task 2 Step 5. Every item is either implemented or carries a disposition.

**Placeholder scan.** No "TBD", no "add appropriate error handling", no "similar to Task N". Every code step carries the literal text to write, and every verification step carries the command plus its expected output.

**Type consistency.** One symbol crosses a file boundary: `exportsKeyPattern(key) => RegExp`, defined in Task 1 Step 1 and consumed in Task 1 Steps 2 and 4 under that exact name. Task 2 exports nothing.

**Known deviation from the issue.** #23 proposes skip-when-empty for the guard; this plan scans all of `react/src` instead, which removes the vacuous-pass hazard the issue itself warns about. Recorded in Task 1's design note.

---

## Review rounds

**Round 1 — preflight, `c0addf09`, FORTIFY (high), 3 above-bar findings, `Suppressed: 0`.** All three folded into the plan; ledger rows appended under this plan's path as the artifact id.

| # | Finding | Fold |
| --- | --- | --- |
| 1 | Both commit templates carried a `Co-Authored-By: Claude …` trailer, which `~/.claude/CLAUDE.md` § Attribution forbids and says overrides any harness instruction | Trailer deleted from both heredocs (Task 1 Step 7, Task 2 Step 7) |
| 2 | `SPECIFIER_RE` keyed on `from`/`import` misses `import("…")` and `require("…")`, so a future drift passes vacuously | Matcher re-anchored on the quote, keyword dropped; the two non-import mentions in `index.ts` stay unmatched because both spell `/node_modules/@egov-moldova/mud/…`. The one remaining boundary — a specifier concatenated at runtime — is now stated in Task 1's design note rather than left to be discovered |
| 3 | Bar row 4 was proven only by a printed number an implementer had to eyeball | `.storybook/vitest.setup.ts` now also asserts `react/jsx-runtime`, so the subpath half is checked on every run; Task 2 Step 5's probe exits non-zero instead of printing. The bar table gained an Instrument column naming what grades each row |

The reviewer also noted, as unverified-but-checked, that `react/src` holds no `.tsx` today while `walk()` filtered on `.ts` only. Folded: `walk()` now accepts `.ts` and `.tsx`, so a future `.tsx` wrapper cannot slip past the same way.

The 3-findings-with-zero-suppressed pairing is the preflight lane's escalation trigger, so round 2 ran as a `fresh-eyes-critic` pass over the whole plan.

**Round 2 — critic, `c0addf09`, FORTIFY (high), 7 above-bar + 5 beyond-bar findings.** All twelve folded.

| # | Bar | Finding | Fold |
| --- | --- | --- | --- |
| 1 | above | Bar row 4's instrument could not execute: `find` emits a relative path and the reader treated it as a bare specifier, so the probe exited non-zero on every run — and the plan read non-zero as "wrong resolution" | The check moved into `scripts/check-lane-resolution.mjs`; the caller passes `"$PWD/node_modules/…"` and asserts `test -n "$F"` |
| 2 | above | The same probe could not discriminate the bug: both states spell `(../)+react/`, the `/node_modules/` substring test was always true against relative `src`, and only the segment count decided — which also fired on a correct absolute path | Replaced by containment: resolve `src` against the deps directory, require the result inside `<root>/node_modules/`. Depth-independent, and it is what row 4 actually claims |
| 3 | above | The central premise carried no captured output, and the only `_metadata.json` on disk showed the *fixed* state while the config held no alias — a leftover cache that nothing in the plan explained | Four `derived` blocks added under § Acceptance bar, captured in this worktree with a cold cache: before, after, and the two destructive bars |
| 4 | above | The execution matrix parallelized two tasks whose verification steps both mutate `stencil-generated/` and both clear the optimizer cache | Matrix made sequential, with the shared-resource reasoning recorded so the next reader does not re-parallelize on the disjoint-edits argument |
| 5 | above | Bar row 1's instrument moved the whole directory, deleting the **tracked** `.gitkeep`, with no restore on an interrupted run — and a dispatched leg may not `git restore` it back | Move the contents, keep the directory; `trap … EXIT`; `mktemp -d` instead of shared `/tmp` names; a post-restore count assertion |
| 6 | above | Only Step 5 cleared the optimizer cache. Step 2's whole purpose is observing a failure, and a warm cache skips pre-bundling — so it could report a pass and the plan told the implementer to skip the fix | Cold-cache line added to Step 2 and to both blocks in Step 6; Step 2's pass-interpretation rewritten to "check the cache was cleared", never "skip Step 3" |
| 7 | above | Two numbering defects: "append after `:457`" in a 455-line file, and a Self-Review line numbering #23's bars against this plan's own row 4 | Cite `:455` / end of file; Self-Review now prefixes every borrowed number with `#23's` |
| 8 | beyond | "Never passes vacuously" overstated the guard: where no build output exists — CI, and any machine that has not run `yarn build.react` — it grades one file, not the 56 wrappers | Design note now states the conditional coverage and names what would remove it (a `.github/` change, out of scope) |
| 9 | beyond | Step 4 cited `vitest.config.mts:93-97`, which Step 3 shifts by ~25 lines | Anchored on the comment's own text instead of a range |
| 10 | beyond | The kept header comment said the setup file is "intentionally minimal" directly above a load-bearing guard | Header rewritten to name the guard |
| 11 | beyond | `6` and `7` were bare literals encoding Storybook's cache-path depth, one of them written into the bar's Tolerance column | Removed entirely by finding 2's containment form |
| 12 | beyond | The root `package.json` declares neither `react` nor `react-dom`; the alias's `createRequire(…).resolve` depends on hoisting, and a hoisting change would throw at **config load**, taking out the `spec` project too | Task 2 Step 3 now declares `react` in the root devDependencies, with the lockfile in the same commit |

The reviewer's verdict body says "eight above-bar findings" while its own table marks seven — the table is what was folded, and the count is noted here rather than silently reconciled.

Refutations the plan survived, recorded so a later round does not re-spend them: the matcher was executed verbatim over `react/src` (58 files, 158 specifiers, 0 dead, 7 correct patterns); `index.ts:14` and `:42` stay unmatched; bar row 2's "exactly 2" is right; `react@18.3.1` does export `./package.json`; the project-level `resolve.alias` does not clobber `@stencil/vitest`'s injected one, which only the `spec` project needs; and `tsconfig.json:include` does not reach `.storybook/vitest.setup.ts`, so the React imports add no typecheck surface.

**Round 3 — critic, `c0addf09`, FORTIFY (high), 4 above-bar + 6 beyond-bar.** Dispatched with one question put to it directly: did any round-2 fold introduce a worse problem than the finding it closed? It answered yes, and was right.

| # | Bar | Finding | Fold |
| --- | --- | --- | --- |
| 1 | above | **The round-2 `trap` was worse than the defect it closed.** `$BAK` held `index.ts` *and* the moved wrappers, so the restore glob `mv "$BAK"/*.ts "$GEN"/` swept the entry file in among them and the next clause had nothing to copy back. Before the fold, an interrupt lost git-ignored output a `yarn build.react` regenerates; after it, an interrupt left the **tracked** `react/src/index.ts` holding invalid TypeScript, on a branch where a dispatched leg may not `git restore` | Two `mktemp -d` directories — the git-ignored wrappers in one, the tracked entry in the other — and a `restore()` that names every file explicitly and reports a failed restore on stderr instead of `2>/dev/null` |
| 2 | above | § Scope claimed `Slotted Disabled Contract` fails once the lane runs, while rows 1 and 3 demand `47 passed (47)` and four `derived` blocks show `469 passed (469)`. Both cannot hold. The story is on PR#24's branch and does not exist here | § Scope now states the claim as conditional on a rebase over PR#24, and Step 5 no longer licenses "story failures may exist" |
| 3 | above | Bar row 2's instrument ran before anything produced its input: `yarn build.react` appears as an executable command only in Task 2, which the sequencing fold put strictly *after* Task 1. On the clean checkout § Status declares, Task 1 Step 5's `cp` finds no file and `grep -c` prints 0 — whose own comment says the next step then proves nothing | Task 1 gained **Step 0**, which generates the wrappers and asserts the count, with the skip condition spelled out |
| 4 | above | The trap's own rationale — "everything moved below is git-ignored" — is false about `react/src/index.ts`, which is tracked and is the one file bar 3 overwrites. The wrong premise is what made finding 1 read as safe on review | Rationale corrected to name the two categories separately, which is also why the fix uses two directories |
| 5 | beyond | `= 57` is a bare component count in a blocking assertion whose `exit 1` fires the trap — the next component added turns a correct run into a spurious failure, and a spurious failure into real corruption. The same shape round 2 removed from the bar's Tolerance column | Captured into `$BEFORE` before the move and compared against that |
| 6 | beyond | `check-lane-resolution.mjs` reported a dependency Vite simply did not pre-bundle as a resolution FAILURE — re-introducing optimizer-set coupling as an assumption | `not pre-bundled` is now its own exit code 3 with its own message, distinct from exit 1 |
| 7 | beyond | Row 5's Observable said "47 story files"; `find src -name '*.stories.ts' \| wc -l` is 101. 47 is the `Test Files` count the instrument prints | Observable renamed to the `Test Files` count, with the 101-vs-47 distinction stated |
| 8 | beyond | Step 1 told the implementer to keep the existing header comment while the block below replaces it — following the prose restores the exact state round-2 fold 10 closed | "Replace the whole file with:", plus why the header is rewritten rather than kept |
| 9 | beyond | `exportsKeyPattern` maps `*` to `.+`, but Node's subpath-pattern `*` matches ZERO or more characters. Latent — no current key is affected | `.*`, with the reason in the doc comment |
| 10 | beyond | The four `derived` blocks did not record which config state each was captured under, while the prose presented all four as one capture — and one of them is deliberately the *opposite* state | Each block now names its state, and the intro says plainly that they are not one capture |

**The loop ends here.** Three rounds is the cap, and reaching it hands the artifact to Dan rather than buying a fourth round. The remaining `gate-ledger open` exit code reflects round 3's seven-plus-three finding count at append time, not unaddressed work: every one of the ten is folded above.
