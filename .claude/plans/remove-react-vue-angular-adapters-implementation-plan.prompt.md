# Remove React / Vue / Angular Adapters — Implementation Plan (v2, revised 2026-05-17)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.
>
> **NOTE — supersedes the v1 plan.** v1 is preserved in git history. Task 0 is a no-op once this v2 is committed.

**Goal:** Delete `angular-design-system/`, `react-design-system/`, `vue-design-system/` workspace packages plus every operational reference (build scripts, CI steps, merge-driver rules, skill/agent invocations) so `@egovmd/mud-web-components` becomes the only adapter. Skills, agents, and docs may keep *contextual* mentions of past adapter support — but must not instruct or invoke adapter build scripts.

**Architecture:** Pure removal — no new code. After this plan: build graph = `build` + `build.web` + `demo.web` + tokens/storybook; published surface = `@egovmd/mud` + `@egovmd/mud-web-components`; CI green; no skill/agent runs `yarn build.react` and friends.

**Tech Stack:** Yarn 4 workspaces, Wireit, Stencil 4.43, Docker, GitHub Actions, Markdown.

---

## Context

`@egovmd/mud-web-components` (the vanilla HTML / JS adapter at [`web-components/`](web-components/)) has been built, demoed (`yarn demo.web` → http://localhost:5174), and documented. It registers every Stencil custom element via a single `defineCustomElements()` call and works with bundlers, plain HTML import maps, and TS type augmentation.

The three legacy framework adapters (`react-design-system/`, `vue-design-system/`, `angular-design-system/`) are now redundant. Keeping them imposes carrying costs: extra dependencies, longer build pipelines, parallel-worktree merge conflicts (`.gitattributes` `merge=ours` rules), four extra CI steps per PR, and the misleading implication that those packages remain supported.

**Why this revision (v2):** The v1 plan was authored at an earlier point. Subsequent commits added:
- A `.github/workflows/ci.yml` validation pipeline that runs `yarn build.{react,angular,vue}` + a `git diff --exit-code` "Verify no stale generated files" gate covering all three adapter output paths.
- A `.gitattributes` block (lines 17–37) with `merge=ours linguist-generated=true` rules for the adapter-generated TypeScript proxies — added to suppress conflicts when parallel agent worktrees (Cline Kanban) rebuild concurrently.
- Five `.claude/agents/*.md` files (`custom-component`, `new-component`, `refactor-component`, `redesign-component`, plus `commands/migrate-component`) and `_agents/environment-commands.md` that instruct running `yarn build && yarn build.react && yarn build.angular && yarn build.vue` as the canonical "verify auto-generated files" step.
- `.claude/skills/parallel-aux-tasks/SKILL.md` references adapter outputs in its regenerated-files list.

If we skip these new edits the cleanup will break CI on the first PR push, mislead agentic workers into running non-existent scripts, and leave dead merge-driver rules. v2 adds an explicit CI/`.gitattributes` task (Task 8) and an explicit skills/agents stripping task (Task 2).

**User directive applied:** Instructional context in skills/agents may mention that React/Vue/Angular *were* supported historically, but operational invocations of those build scripts must be removed (no broken commands). Full deprecation comments in code are not required — clean removal of the invocations is sufficient; git history is the historical record.

---

## Scope & Inventory

After re-verification on 2026-05-17, **nothing in the original plan had been executed yet** at the time of revision; the three adapter folders, all 3 build scripts, all wireit entries, all stencil.config.ts branches, the Dockerfile COPY lines, and the AGENTS.md / README.md sections were all still present.

### Files / folders to delete outright

- `angular-design-system/` — entire directory (~1,752 items, includes `src/`, `package.json`, `scripts/`)
- `react-design-system/` — entire directory (~37 items)
- `vue-design-system/` — entire directory (~34 items)
- `components/` (root) — auto-generated ng-packagr shim folder (~70 `mud-*.{js,d.ts}` re-export pairs, only consumed by Angular wrapper)
- `scripts/generate-component-shims.mjs` — only used by `build.angular`

### Files to edit

| File | What to change | New in v2? |
| --- | --- | --- |
| [`stencil.config.ts`](../../stencil.config.ts) | Strip 3 output-target imports (lines 3–5) + 3 `if (args?.find…)` branches (lines 43–106) + PERF comment (lines 35–37) | — |
| [`package.json`](../../package.json) | Drop 3 workspaces (lines 38–43), 3 `build.X` scripts (lines 54–56), 3 wireit blocks (lines 233–303), 5 dead `exports` entries (lines 27–36), 9 devDeps (`@stencil/{react,angular,vue}-output-target`, `@types/react{,-dom}`, `eslint-plugin-react`, `react`, `react-dom`, `vue`) | — |
| [`Dockerfile`](../../Dockerfile) | Replace 3 adapter `COPY` lines (10–12) with one `COPY web-components/package.json` line | — |
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | Delete steps "Build React adapter"/"Build Angular adapter"/"Build Vue adapter" (lines 194–201). Rewrite "Verify no stale generated files" step (lines 209–226) to drop adapter paths from the `git diff --exit-code` list and update the error message | **YES** |
| [`.gitattributes`](../../.gitattributes) | Delete lines 24–34 (3 adapter `merge=ours` blocks). Trim the top comment (lines 4–8) to drop the "regenerating these tracked files" phrasing about `sp.build` since the only remaining auto-gen targets are `src/components.d.ts`, per-component `readme.md`, `.storybook/custom-elements.json`, `tokens/generated/**` | **YES** |
| [`AGENTS.md`](../../AGENTS.md) (root) | Remove `yarn build.react` / `yarn build.angular` lines (116–117 per re-verification). Add `yarn build.web` + `yarn demo.web`. Also drop adapter mentions at lines 179–181 (merge-conflict resolution notes) | — |
| [`_agents/environment-commands.md`](../../_agents/environment-commands.md) | Strip lines 147–148 (`yarn build.react` / `yarn build.angular` documentation) | **YES** |
| [`.claude/agents/custom-component.md`](../agents/custom-component.md) | Replace `yarn build && yarn build.react && yarn build.angular && yarn build.vue` with `yarn build` (line ~189) | **YES** |
| [`.claude/agents/new-component.md`](../agents/new-component.md) | Same edit (line ~244) | **YES** |
| [`.claude/agents/refactor-component.md`](../agents/refactor-component.md) | Same edit (line ~211) | **YES** |
| [`.claude/agents/redesign-component.md`](../agents/redesign-component.md) | Same edit (line ~305) | **YES** |
| [`.claude/commands/migrate-component.md`](../commands/migrate-component.md) | Same edit (line ~136) | **YES** |
| [`.claude/skills/parallel-aux-tasks/SKILL.md`](../skills/parallel-aux-tasks/SKILL.md) | Drop adapter outputs from the regenerated-files list (line ~12) | **YES** |
| [`README.md`](../../README.md) (root) | Largest doc edit — see Task 9 for full per-section instructions | — |

### References to KEEP (verified non-adapter)

- [`.storybook/preview.js`](../../.storybook/preview.js) lines 2–3 — `react` / `react-dom` imports power the `agentation` feedback toolbar, **not** the React adapter.
- [`.storybook/main.mjs`](../../.storybook/main.mjs) line 39 — `reactDocgen: false` is a Storybook docgen perf setting, unrelated.
- [`src/components/_agents/*.md`](../../src/components/_agents/) mentions of "reactive" / "@storybook/react" — Storybook authoring patterns, unrelated.
- `yarn.lock` — regenerated by `yarn install` after workspace removal; no manual edit.
- Conversational context-only mentions in agents/commands README files (none flagged as operational by the survey).

### What about `react`, `react-dom`, `vue` in devDeps if Storybook needs them?

The Storybook preview uses `react` + `react-dom` for the agentation feedback toolbar via direct `import`. After removing them from root `package.json` devDeps the toolbar will fail to compile. **Task 4 must verify storybook still builds after `yarn install`** — if it errors on missing `react`/`react-dom`, restore those two packages (only) and re-commit, documenting in [AGENTS.md](../../AGENTS.md) that they support the agentation toolbar, not the removed adapter. Leave `vue` removed regardless.

---

## Critical Files to Reference

- [`x:\WORK\corlab\age-design\package.json`](../../package.json) — lines 27–43 (exports + workspaces), 54–58 (scripts), 231–303 (wireit), 540–593 (devDeps)
- [`x:\WORK\corlab\age-design\stencil.config.ts`](../../stencil.config.ts) — lines 3–5 (imports), 35–37 (PERF comment), 43–106 (adapter branches)
- [`x:\WORK\corlab\age-design\Dockerfile`](../../Dockerfile) — lines 10–12
- [`x:\WORK\corlab\age-design\.github\workflows\ci.yml`](../../.github/workflows/ci.yml) — lines 194–226
- [`x:\WORK\corlab\age-design\.gitattributes`](../../.gitattributes) — lines 1–37
- [`x:\WORK\corlab\age-design\AGENTS.md`](../../AGENTS.md) — lines 100–117, 179–181
- [`x:\WORK\corlab\age-design\README.md`](../../README.md) — sections enumerated in Task 9

---

## Task 0: Overwrite the in-repo plan file

Once this v2 is committed, Task 0 is a no-op.

- [x] **Step 1:** Overwrite this file with v2 content. _(Done as part of the revision commit.)_
- [x] **Step 2:** Commit the v2 plan. _(Done as part of the revision commit.)_

---

## Task 1: Pre-flight — confirm `@egovmd/mud-web-components` works

Safety net. If the vanilla adapter has any regression, we cannot detect it after deletion (no way to compare).

- [ ] **Step 1: Clean and full rebuild**

```bash
yarn dx:clean
yarn build
yarn build.web
```

Expected: both succeed; `dist/index.js`, `loader/index.js`, `web-components/dist/index.js` exist.

- [ ] **Step 2: Run demo and visually verify**

```bash
yarn demo.web
```

Open http://localhost:5174. Confirm:
- All `<mud-button>` variants and sizes render with Onest font.
- DevTools console: `[demo] @egovmd/mud-web-components registered all custom elements`.
- DevTools console: `Object.keys(window).filter(k => k.startsWith('HTMLCor')).length` returns > 30.

- [ ] **Step 3: Stop the dev server** (Ctrl-C).

---

## Task 2: Strip operational adapter references from skills, agents, AGENTS.md

Edit instructional docs first — these don't affect builds, so we can iterate freely without rebuilds. Per user directive: remove only the **operational invocations** (script names, commands). Don't add deprecation comments; git history is the record.

**Files modified (8):**
- [`AGENTS.md`](../../AGENTS.md)
- [`_agents/environment-commands.md`](../../_agents/environment-commands.md)
- [`.claude/agents/custom-component.md`](../agents/custom-component.md)
- [`.claude/agents/new-component.md`](../agents/new-component.md)
- [`.claude/agents/refactor-component.md`](../agents/refactor-component.md)
- [`.claude/agents/redesign-component.md`](../agents/redesign-component.md)
- [`.claude/commands/migrate-component.md`](../commands/migrate-component.md)
- [`.claude/skills/parallel-aux-tasks/SKILL.md`](../skills/parallel-aux-tasks/SKILL.md)

- [ ] **Step 1: Root `AGENTS.md`** — in the build quick-reference block (~lines 100–117), replace:

```bash
yarn build                     # Full production build …
yarn build.react               # Production build with React output target
yarn build.angular             # Production build with Angular output target
yarn sp.build                  # Storybook static export …
yarn sp.docker                 # Docker-optimized Storybook build
```

With:

```bash
yarn build                     # Full production build with tokens, custom-elements, and docs
yarn build.web                 # Build @egovmd/mud-web-components vanilla adapter
yarn demo.web                  # Serve the @egovmd/mud-web-components demo (http://localhost:5174)
yarn sp.build                  # Storybook static export (validates everything)
yarn sp.docker                 # Docker-optimized Storybook build
```

Also delete any adapter-specific merge-conflict resolution guidance at lines 179–181.

- [ ] **Step 2: `_agents/environment-commands.md`** — delete the two lines (147–148) that document `yarn build.react` and `yarn build.angular`. If a header section becomes empty, collapse it.

- [ ] **Step 3: Five `.claude` agent/command files** — In each, find the verification step that reads:

```bash
yarn build && yarn build.react && yarn build.angular && yarn build.vue
```

Replace with:

```bash
yarn build
```

Apply to:
- `.claude/agents/custom-component.md` (Step 10, line ~189)
- `.claude/agents/new-component.md` (Step 10, line ~244)
- `.claude/agents/refactor-component.md` (Step 8, line ~211)
- `.claude/agents/redesign-component.md` (Step 9, line ~305)
- `.claude/commands/migrate-component.md` (Step 10b, line ~136)

Where adjacent prose says "to regenerate all adapter outputs", rewrite to "to regenerate `src/components.d.ts`, per-component `readme.md`, and `.storybook/custom-elements.json`".

- [ ] **Step 4: `.claude/skills/parallel-aux-tasks/SKILL.md`** — in the regenerated-files list (~line 12), remove the bullet/entries referring to `(react|angular|vue)-design-system/**/stencil-generated/**` and `angular-design-system/src/directives/` and `components/**`. Keep entries for `src/components.d.ts`, `src/components/*/readme.md`, `.storybook/custom-elements.json`, `tokens/generated/**`.

- [ ] **Step 5: Verify no broken cross-references**

```bash
git grep -nE "build\.(react|angular|vue)" -- '.claude/' '_agents/' 'AGENTS.md' ':!.claude/plans/'
```

Expected: zero matches.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md _agents/environment-commands.md .claude/agents/*.md .claude/commands/migrate-component.md .claude/skills/parallel-aux-tasks/SKILL.md
git commit -m "docs(agents,skills): strip yarn build.{react,angular,vue} from instructional docs"
```

---

## Task 3: Strip `stencil.config.ts`

**Files:** [`stencil.config.ts`](../../stencil.config.ts)

- [ ] **Step 1:** Remove the three adapter output-target imports (lines 3–5):

```ts
import { reactOutputTarget as react } from '@stencil/react-output-target';
import { angularOutputTarget as angular } from '@stencil/angular-output-target';
import { vueOutputTarget as vue } from '@stencil/vue-output-target';
```

- [ ] **Step 2:** Delete the three `if (args?.find(arg => arg === '--react' | '--angular' | '--vue'))` branches (lines 43–106). After deletion, the file goes straight from the `hasDocs` block (lines 38–41) to `export const config: Config = {`.

- [ ] **Step 3:** Update the PERF comment at lines 35–37:

```ts
// PERF: The base build only needs 'dist' (lazy). www output is unused —
// skip it entirely. docs-readme only on --docs.
```

- [ ] **Step 4: Verify config parses** — `yarn dx:clean && yarn build`. Expected: succeeds; produces `dist/`, `loader/`, `dist/types/`. (`build.web` / `build.react` etc. will still fail because root `package.json` still references them — fixed in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add stencil.config.ts
git commit -m "chore(stencil): drop --react/--angular/--vue branches from stencil.config"
```

---

## Task 4: Clean root `package.json` + reinstall

**Files:** [`package.json`](../../package.json), `yarn.lock` (regenerated).

- [ ] **Step 1: Trim `workspaces` array (lines 38–43)** to `["web-components"]`.

- [ ] **Step 2: Remove `build.react` / `build.angular` / `build.vue` from `scripts` block (lines 54–56).**

- [ ] **Step 3: Remove the three wireit blocks** `build.react`, `build.angular`, `build.vue` (lines 233–303).

- [ ] **Step 4: Trim `exports` map (lines 27–36)** — delete every `./dist/components*` and `./components*` entry. Keep only:

```json
".": { … },
"./loader": { … },
"./dist/design-system/design-system.css": "./dist/design-system/design-system.css",
"./dist/design-system/tokens/*.css": "./dist/design-system/tokens/*.css"
```

- [ ] **Step 5: Remove these nine devDependencies** (exact lines vary slightly after prior edits):

```
@stencil/angular-output-target
@stencil/react-output-target
@stencil/vue-output-target
@types/react
@types/react-dom
eslint-plugin-react
react
react-dom
vue
```

(Do NOT touch `lit`, `@storybook/web-components*`, `agent-browser`, `agentation`.)

- [ ] **Step 6: Reinstall** — `yarn install`. Lockfile regenerates without the 9 packages.

- [ ] **Step 7: Verify base + web-components + storybook all still work**

```bash
yarn dx:clean
yarn build
yarn build.web
yarn demo.web   # spot-check at http://localhost:5174, Ctrl-C
yarn sp.build
```

**Storybook gotcha:** If `sp.build` errors on missing `react`/`react-dom` (the agentation toolbar uses them — see Scope notes), restore exactly `react` + `react-dom` to devDeps with a comment in [AGENTS.md](../../AGENTS.md) explaining they support the agentation toolbar, not the removed adapter. Re-run `yarn install`. Leave `vue` removed regardless.

- [ ] **Step 8: Commit**

```bash
git add package.json yarn.lock AGENTS.md
git commit -m "chore: drop adapter workspaces, scripts, wireit, exports, devDeps from root manifest"
```

---

## Task 5: Delete the three adapter workspaces

**Files deleted:** `angular-design-system/`, `react-design-system/`, `vue-design-system/`.

- [ ] **Step 1:** `rm -rf angular-design-system react-design-system vue-design-system`

- [ ] **Step 2: Confirm no other code path still references them**

```bash
git grep -nE "angular-design-system|react-design-system|vue-design-system" -- ':!yarn.lock' ':!docs/superpowers/' ':!.claude/plans/'
```

Expected: only matches in `.gitattributes`, `Dockerfile`, `.github/workflows/ci.yml`, `README.md` — files this plan still edits in Tasks 7–9. **Anything else is a missed reference; fix before continuing.**

- [ ] **Step 3: Commit**

```bash
git add -A angular-design-system react-design-system vue-design-system
git commit -m "chore: remove angular/react/vue adapter workspaces"
```

---

## Task 6: Delete adapter-only root artifacts

**Files deleted:** `components/` (root), `scripts/generate-component-shims.mjs`.

- [ ] **Step 1: Sanity-check no live consumer of the shim folder**

```bash
git grep -nE "from '@egovmd/mud/components/" -- ':!components/' ':!dist/' ':!yarn.lock'
git grep -nE "components/mud-.*\.js" -- ':!components/' ':!dist/' ':!yarn.lock' ':!src/'
```

Expected: zero matches.

- [ ] **Step 2:** `rm -rf components && rm scripts/generate-component-shims.mjs`

- [ ] **Step 3: Verify base build still works** — `yarn dx:clean && yarn build`. `components/` is not regenerated (no output target asks for it).

- [ ] **Step 4: Commit**

```bash
git add -A components scripts/generate-component-shims.mjs
git commit -m "chore: remove ng-packagr shim folder and generator script"
```

---

## Task 7: Dockerfile

**Files:** [`Dockerfile`](../../Dockerfile).

- [ ] **Step 1:** Replace lines 10–12:

```dockerfile
COPY angular-design-system/package.json ./angular-design-system/
COPY react-design-system/package.json ./react-design-system/
COPY vue-design-system/package.json ./vue-design-system/
```

With:

```dockerfile
COPY web-components/package.json ./web-components/
```

- [ ] **Step 2: Verify image builds** (if Docker available; otherwise skip):

```bash
docker build --target builder -t age-design-test .
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "chore(docker): drop adapter COPY lines, add web-components workspace COPY"
```

---

## Task 8: CI workflow + `.gitattributes` (NEW in v2)

These files were authored after the v1 plan and would silently break (CI red on first push, dead merge-driver rules) without explicit cleanup.

**Files:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), [`.gitattributes`](../../.gitattributes).

- [ ] **Step 1: `ci.yml`** — Delete steps "Build React adapter", "Build Angular adapter", "Build Vue adapter" (lines 194–201). The block becomes:

```yaml
      - name: Build (Stencil)
        run: yarn build

      - name: Lint
        run: yarn lint
```

- [ ] **Step 2: `ci.yml`** — Rewrite the "Verify no stale generated files" step (lines 209–226). Remove adapter paths from the `git diff --exit-code` list and rewrite the error message:

```yaml
      - name: Verify no stale generated files
        # Auto-generated files are tracked with `merge=ours` in .gitattributes;
        # this step proves the committed snapshots match what the build produces.
        run: |
          git diff --exit-code -- \
            src/components.d.ts \
            'src/components/*/readme.md' 'src/hidden/*/readme.md' \
            .storybook/custom-elements.json \
            tokens/generated/ \
          || (echo "::error::Generated files are stale. Run 'yarn build' locally and commit the diff." && exit 1)
```

- [ ] **Step 3: `.gitattributes`** — Delete lines 24–34 (the 3 adapter `merge=ours` blocks + their header comments):

```
# React adapter generated outputs (build.react wireit target)
react-design-system/src/components/stencil-generated/**       merge=ours linguist-generated=true

# Angular adapter generated outputs (build.angular wireit target)
angular-design-system/src/directives/proxies.ts               merge=ours linguist-generated=true
angular-design-system/src/directives/index.ts                 merge=ours linguist-generated=true
angular-design-system/src/public-api.ts                       merge=ours linguist-generated=true
components/**                                                 merge=ours linguist-generated=true

# Vue adapter generated outputs (build.vue wireit target)
vue-design-system/src/components/stencil-generated/**         merge=ours linguist-generated=true
```

- [ ] **Step 4: `.gitattributes`** — Trim the top comment (lines 4–8): the WHY still applies to remaining auto-gen targets (`src/components.d.ts`, per-component `readme.md`, `.storybook/custom-elements.json`, `tokens/generated/**`) but phrase generically — drop the `sp.build` and adapter examples.

- [ ] **Step 5: Verify CI YAML still parses** (locally if `actionlint` is available):

```bash
actionlint .github/workflows/ci.yml  # optional; CI itself will catch on push
```

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml .gitattributes
git commit -m "ci: drop adapter build steps + merge-driver rules; trim stale-file diff to web-components only"
```

---

## Task 9: Rewrite `README.md`

**Files:** [`README.md`](../../README.md). Largest edit — re-verify line numbers before each delete; line numbers shift as edits land.

Heading map (verified 2026-05-17; 1939 total lines):

| Lines | Heading | Action |
| --- | --- | --- |
| 1–17 | Title, description, TOC | rewrite (single web-components path) |
| 19–43 | Quick Start | keep |
| 46–91 | `## Angular Build & Setup` | **delete entire section** |
| 93–137 | `## React Build & Setup` | **delete entire section** |
| 139–182 | `## Vue Build & Setup` | **delete entire section** |
| 185–246 | `## Web Components (Vanilla HTML / JS) Build & Setup` | keep (becomes the only build section) |
| 248–532 | `## Publishing Options` | trim — rewrite per-adapter `yarn publish` examples to point at `web-components/` |
| 535 | `## Installing in Applications` | keep heading |
| 537–977 | `### Angular Application` + Configuration & Usage (Angular) | **delete** |
| 1017–1303 | `### React Application` + subsections | **delete** |
| 1307–1577 | `### Vue Application` + subsections | **delete** |
| 1580–1659 | `### Vanilla HTML / Plain JS Application` | keep — becomes the only "Installing" subsection |
| 1661–1775 | `## Troubleshooting` | trim — delete Angular-specific entries, keep generic |
| 1778–1808 | `## Development Workflow` | rewrite around `yarn dev` + `yarn build.web` |
| 1810–1826 | `## Summary Checklist` | rewrite around web-components workflow |
| 1828–1871 | `## Storybook` | keep |
| 1873–1933 | `## Tokens` | keep |
| 1935+ | `## Additional Resources` | replace Angular-specific links with MDN custom elements + Stencil + import-maps spec |

- [ ] **Step 1: Rewrite intro + TOC (lines 1–17)**:

```markdown
# MUD Design System — Integration Guide

This document provides step-by-step instructions for building, publishing, and using the MUD Design System (`@egovmd/mud` web components + the `@egovmd/mud-web-components` vanilla adapter) in any application — bundler-based or plain HTML.

## Table of Contents

1. [Quick Start - General Steps](#quick-start---general-steps)
2. [Web Components (Vanilla HTML / JS) Build & Setup](#web-components-vanilla-html--js-build--setup)
3. [Publishing Options](#publishing-options)
4. [Installing in Applications](#installing-in-applications)
5. [Troubleshooting](#troubleshooting)
```

- [ ] **Step 2: Delete lines 46–183** (3 `Build & Setup` sections + trailing `---`).

- [ ] **Step 3: After step 2, re-locate sections by heading search** (line numbers shifted). Delete `### Angular Application` through the line just before `### React Application`.

- [ ] **Step 4: Delete `### React Application`** through the line just before `### Vue Application`.

- [ ] **Step 5: Delete `### Vue Application`** through the line just before `### Vanilla HTML / Plain JS Application`.

- [ ] **Step 6: Trim Troubleshooting** — delete:
  - `### Issue: "Custom element not defined"` (Angular-only)
  - `### Issue: NG0203 — inject() must be called from an injection context`
  - `### Issue: ngModel not working`
  - `### Issue: Build errors after updating components` (Angular-only)
  - `### Issue: Module not found errors` (Angular `yarn link` recipe)

  Keep `### Issue: TypeScript errors for component properties` (rewrite solution to recommend `yarn add @egovmd/mud @egovmd/mud-web-components`) and `### Issue: Styles not applied` (rewrite token import paths to `@egovmd/mud/dist/design-system/tokens/core.tokens.css`).

- [ ] **Step 7: Rewrite Development Workflow + Summary Checklist**:

```markdown
## Development Workflow

1. Edit Stencil components in `src/components/`.
2. Run `yarn dev` — Stencil + Storybook + token watch in parallel.
3. For vanilla adapter changes, run `yarn build && yarn build.web && yarn demo.web` to verify.
4. Commit, push, open a PR.

## Summary Checklist

- [ ] Install dependencies: `yarn install`
- [ ] Build Stencil components: `yarn build`
- [ ] Build vanilla adapter: `yarn build.web`
- [ ] Visually verify demo: `yarn demo.web` (http://localhost:5174)
- [ ] Install in app: `yarn add @egovmd/mud @egovmd/mud-web-components`
- [ ] Import tokens + global CSS, then call `defineCustomElements()`
- [ ] Lint tokens before any token change: `yarn tokens.lint.all`
```

- [ ] **Step 8: Update Additional Resources**:

```markdown
## Additional Resources

- [MDN — Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [Stencil documentation](https://stenciljs.com/docs/introduction)
- [Import maps specification](https://github.com/WICG/import-maps)
```

- [ ] **Step 9: Trim Publishing Options** — rewrite every `cd angular-design-system` / `cd react-design-system` / `cd vue-design-system` block to `cd web-components` (or delete redundant per-adapter publish blocks — keep one canonical block per registry option).

- [ ] **Step 10: Sanity-check** — open in editor, confirm every TOC anchor matches a heading; no orphaned `###` under deleted `##`; no unclosed code fence.

- [ ] **Step 11: Commit**

```bash
git add README.md
git commit -m "docs(readme): rewrite around @egovmd/mud-web-components; drop adapter sections"
```

---

## Task 10: Full verification

End-to-end test that the cleaned repo still produces a working design system.

- [ ] **Step 1: Fresh dependency resolution**

```bash
yarn install
```

Expected: succeeds; no missing-workspace warnings; no React/Vue/Angular adapter packages installed (`react`/`react-dom` may be present if Task 4 restored them for the agentation toolbar).

- [ ] **Step 2: Clean rebuild**

```bash
yarn dx:clean
yarn build
yarn build.web
```

Expected: both succeed.

- [ ] **Step 3: Storybook build**

```bash
yarn sp.build
```

Expected: produces `storybook-static/`.

- [ ] **Step 4: Vanilla demo**

```bash
yarn demo.web
```

Open http://localhost:5174. Confirm `<mud-button>` variants render with Onest font; console reports registration; `Object.keys(window).filter(k => k.startsWith('HTMLCor')).length` > 30.

- [ ] **Step 5: Final dangling-reference scan**

```bash
git grep -nE "angular-design-system|react-design-system|vue-design-system|build\.react|build\.angular|build\.vue|@stencil/(react|angular|vue)-output-target" -- ':!yarn.lock' ':!.claude/plans/' ':!CHANGELOG*' ':!docs/superpowers/'
```

Expected: **zero matches** outside the archived plan file itself. Anything else is a missed reference; fix before merging.

- [ ] **Step 6: Confirm Wireit graph valid**

```bash
yarn wireit
```

(Or any wireit-driven command — `yarn build` already exercised it. Confirm no "script X depends on undefined script Y" errors.)

- [ ] **Step 7: Push and watch CI**

```bash
git push origin <branch>
gh pr create  # or open via web UI
```

Watch the GitHub Actions run. Expected: green (no "Build React adapter" / "Build Angular adapter" / "Build Vue adapter" steps; "Verify no stale generated files" step covers only web-components paths).

---

## Out of Scope

- Communicating the deprecation externally (npm deprecation tags, blog post, customer migration guide) — separate communications PR.
- Bumping `@egovmd/mud` to a new major version to signal the breaking change — separate version-management PR.
- Re-tagging old commits or rewriting history of adapter folders — the adapters live in git history forever; no cleanup needed.
- Adding `// react/react-dom kept for agentation toolbar` JSON5 comments to `package.json` — JSON doesn't support comments and the rationale belongs in [AGENTS.md](../../AGENTS.md) anyway (handled inline in Task 4 Step 7 fallback).
