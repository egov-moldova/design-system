# Generated Files — How Conflicts Are Prevented

## Scope
Governs the tracked auto-generated files (`src/components.d.ts`, component/hidden `readme.md`) and how their merges, pushes and setup are handled. **Read before touching a generated file, resolving a merge conflict in one, or setting up a new machine.**

---

The repo runs **parallel agent worktrees** where several components are built/redesigned simultaneously. Each worktree runs `yarn sp.build`, which regenerates the same tracked files. Without coordination, PR merges would conflict on every parallel branch.

## How conflicts are prevented

| Layer | File | Role |
| --- | --- | --- |
| Filesystem isolation | `git worktree` | Each agent runs in its own git worktree — no in-flight write collisions |
| Merge strategy | `.gitattributes` (`merge=ours`) + `merge.ours.driver` (registered by `scripts/git/setup-merge-drivers.mjs`) | Cross-branch merges silently keep current branch — no conflict markers |
| Push-time gate | `.husky/pre-push` | Runs `yarn build`, then fails the push if the rebuilt generated files (`src/components.d.ts`, component/hidden `readme.md`) differ from the committed copy — they must be committed together with the change that regenerates them |
| Merge hint | `.husky/post-merge` | Prints a `yarn build` reminder when a merge touched a generated file |
| Canonical regeneration | `.github/workflows/ci.yml` (`Tokens validation` job) | Rebuilds and fails when a tracked generated file differs from the build — the same check as `.husky/pre-push`, but not skippable |

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
