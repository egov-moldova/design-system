# Generated Files — How Conflicts Are Prevented

## Scope
Governs the tracked auto-generated files (component/hidden `readme.md`) and how their merges, pushes and setup are handled, plus the git-ignored `src/components.d.ts`. **Read before touching a generated file, resolving a merge conflict in one, or setting up a new machine.**

---

`src/components.d.ts` is **git-ignored**. Stencil rewrites it on every build, and the published package ships its own copy in `dist/types/components.d.ts`, so a tracked copy served no consumer and made every pair of open PRs conflict on GitHub. `yarn typecheck` runs `types.ensure` first (`scripts/ensure-components-dts.mjs`), which generates the file with `stencil build --dev` (~15 s) only when it is missing — a fresh clone or a CI checkout — so the pre-commit typecheck stays as fast as before. In a fresh clone, run `yarn typecheck` or `yarn build` once so your editor resolves the `mud-*` JSX types; after changing a component's API, `yarn build` refreshes it, as it did when the file was tracked. `yarn audit:git-hygiene` flags a force-added copy (`GIT-STAGED-COMPONENTS-DTS-STAGED`).

The repo runs **parallel agent worktrees** where several components are built/redesigned simultaneously. Each worktree runs `yarn sp.build`, which regenerates the same tracked files. Without coordination, PR merges would conflict on every parallel branch.

## How conflicts are prevented

| Layer | File | Role |
| --- | --- | --- |
| Filesystem isolation | `git worktree` | Each agent runs in its own git worktree — no in-flight write collisions |
| Merge strategy | `.gitattributes` (`merge=ours`) + `merge.ours.driver` (registered by `scripts/git/setup-merge-drivers.mjs`) | Local merges and rebases silently keep the current side — no conflict markers. GitHub never runs a custom driver, so a PR still shows these files as conflicting once another PR lands on `main` |
| Pre-merge sync | `yarn sync:main` (`scripts/git/sync-main.mjs`) | Rebases onto `upstream/main` (warns and uses `origin/main` when there is no `upstream`). A `merge=ours` path takes main's copy, or stays deleted when either side deleted it; a CHANGELOG hunk where both sides only added lines keeps both, the branch's first (transitional — see [Changelog](#changelog-fragments-not-edits)). Then `yarn install` if `yarn.lock` moved, `yarn build`, a commit of only the regenerated files, and `yarn lint` + `yarn typecheck` + `yarn test`. Any other conflict — including a CHANGELOG line both sides edited — stops the run with the rebase left in progress and every mechanical file already resolved; resume with `yarn sync:main --continue`. A branch with merge commits is refused. It never pushes |
| Push-time gate | `.husky/pre-push` | Runs `yarn build`, then fails the push if the rebuilt generated files (component/hidden `readme.md`) differ from the committed copy — they must be committed together with the change that regenerates them |
| Merge hint | `.husky/post-merge` | Prints a `yarn build` reminder when a merge touched a generated file |
| Canonical regeneration | `.github/workflows/ci.yml` (`Tokens validation` job) | Rebuilds and fails when a tracked generated file differs from the build — the same check as `.husky/pre-push`, but not skippable |

## Changelog: fragments, not edits

A PR never edits `CHANGELOG.md`. It adds its own file under `changes/` (format: `changes/README.md`), so two open PRs never touch the same path. At release, `yarn changelog.release <x.y.z>` folds the fragments into `CHANGELOG.md` and deletes them. CI's `Changelog fragments` job runs `yarn changelog.check`, which rejects a malformed fragment and, on a pull request, a commit marked breaking (`type!:` or a `BREAKING CHANGE:` footer) when the PR adds no fragment with `breaking: true`.

`yarn sync:main` still resolves add-only `CHANGELOG.md` hunks, but only for branches opened before fragments existed. Remove that step, and this paragraph, once none of those branches is still open.

No hook unstages or force-removes these files: they are committed in the same commit as the source change that regenerates them, staged explicitly (`git add <paths>`), never via a broad `git add -A`/`git add .`.

## Setup (runs automatically)

`yarn install` runs the private `react` workspace's `postinstall`, which runs `scripts/git/install-hooks.mjs`: `husky`, then `setup-merge-drivers.mjs`. Yarn never runs a root `prepare` on install, and a root install script would ship in the manifest `npm publish` sends for `@egov-moldova/mud`, so the private workspace is the activation point. `setup-merge-drivers.mjs` registers `merge.ours.driver` (`git config merge.ours.driver true`), since `merge=ours` is not a git built-in.

### Manual setup (only if install scripts did not run, e.g. `yarn install --mode=skip-build` or `enableScripts: false`)

```bash
node scripts/git/install-hooks.mjs
```

### Verify the setup

```bash
git config --get merge.ours.driver
# expect: true — `git check-attr merge` prints `merge: ours` even when no driver is registered
```

## What contributors and agents must NEVER do

- Hand-edit `src/components.d.ts`, `src/components/*/readme.md`, `.storybook/custom-elements.json`, `tokens/generated/**`.
- Stage these files with a broad `git add -A`/`git add .`. Stage explicit paths so a stray local change to a generated file is never swept into an unrelated commit — no hook unstages it for you, and `.husky/pre-push` only catches a stale copy at push time (skippable with `--no-verify`).
- Resolve a merge conflict in any of these by hand-editing. Run `yarn build` instead.

## Why `merge=ours` (and not a custom regenerate driver)

A custom driver that ran `yarn build` on every 3-way merge would add 60–120 s per file per merge and would fail in IDE/GUI git clients that don't load the project environment. The registered `merge.ours.driver` is instant; CI's `Tokens validation` job is the single canonical regeneration point and the hard gate that prevents stale content from reaching `main`.
