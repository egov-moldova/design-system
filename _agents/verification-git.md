# Verification Checklist, Troubleshooting & Git Workflow

## Scope

Phased verification gates, common troubleshooting, change-scope and docs-audience rules, and git/PR conventions. **Read before claiming work complete or creating a PR.**

---

## Phased Verification Checklist

### Phase 1: Pre-Implementation

- [ ] Figma screenshot extracted and analyzed
- [ ] Component inventory created (✅/🟡/🔴 status)
- [ ] Existing components verified in Storybook vs Figma
- [ ] Build order generated (bottom-up: atoms → molecules → organisms)
- [ ] User approved inventory and build order

### Phase 2: Implementation (per component)

- [ ] Tokens created/updated in `tokens/core/components/` → rebuild per `_agents/environment-commands.md`
- [ ] Component `.tsx` + `.css` follow patterns in `src/components/AGENTS.md`
- [ ] All visual states implemented (default, hover, active, focus-visible, disabled, skeleton)
- [ ] Interactive elements are fully functional (not decorative)

**Accessibility — WCAG 2.1 Level AA** (canonical reference: Skill [`accessibility-compliance`](../.claude/skills/accessibility-compliance/SKILL.md))

- [ ] Semantic HTML used; ARIA only where native HTML insufficient (SC 4.1.2)
- [ ] Accessible name on every interactive element; visible text included in name (SC 2.5.3, 4.1.2)
- [ ] Keyboard navigation: Tab reachable, Enter/Space activates, Escape dismisses, arrow keys for composite widgets (SC 2.1.1, 2.1.2)
- [ ] `:focus-visible` ring rendered on keyboard focus, ≥ 3:1 contrast against background and adjacent (SC 2.4.7, 1.4.11)
- [ ] Color contrast 4.5:1 normal text / 3:1 large text / 3:1 UI verified in **light AND dark mode** (SC 1.4.3, 1.4.11) — run `yarn audit:contrast`
- [ ] No information conveyed by color alone (SC 1.4.1) — error states pair color + icon + text
- [ ] ARIA states correct: `aria-disabled`, `aria-invalid`, `aria-expanded`, `aria-selected`, `aria-checked`, `aria-required`, `aria-pressed` (SC 4.1.2)
- [ ] Dynamic status uses `role="status"` (polite) or `role="alert"` (assertive) (SC 4.1.3)
- [ ] `prefers-reduced-motion: reduce` honored — no override of global rule (SC 2.3.3)
- [ ] Text spacing tolerated: 1.5× line-height, 0.12em letter-spacing without layout break (SC 1.4.12)
- [ ] Target size: documented exception if below 24×24 — see `src/components/_agents/target-size-exceptions.md`
- [ ] Storybook a11y addon panel: zero violations in both light and dark mode

### Phase 3: Stories

- [ ] Story file created (CSF3, `@storybook/web-components-vite`, string tag names)
- [ ] Default + AllVariants + AllSizes + States stories present
- [ ] Responsive stories for molecules/organisms (375px, 768px, 1440px)

### Phase 4: Post-Implementation QA (production build gate)

**Skipped when `--fast` flag is used**

- [ ] **Build Verification Decision**: Ask user - proceed with full build verification or skip?
  - If user wants full verification: proceed with all Phase 4 checks
  - If user wants to skip: mark Phase 4 as complete and continue
- [ ] `yarn build` succeeds (full production build)
- [ ] `yarn lint` passes
- [ ] `yarn test` passes
- [ ] Storybook renders without console errors (`browser_console_messages({ level: "error" })`)
- [ ] Figma vs Storybook screenshot comparison done for every variant + state
- [ ] Computed styles match Figma specs
- [ ] Per-component summary shown to user and confirmed
- [ ] `yarn sp.build` succeeds (Storybook production build)

---

## Troubleshooting

| Problem | Cause | Solution |
| --- | --- | --- |
| Component blank in Storybook | Stencil not built | `yarn build` or ensure `yarn sp.dev.watch` running |
| Story missing from sidebar | Wrong `title` or extension | Verify `title: 'Atoms/CorButton'`, file ends `.stories.ts` |
| Token CSS var has no effect | Token not built or wrong name | `yarn tokens.build`, check `--var-name` in `dist/mud/tokens/*.css` |
| `::slotted(*)` not applying | Content not direct child | Ensure slotted element is direct child of `<mud-*>` |
| Figma extraction returns empty | Wrong node ID or deeply nested | Try parent node ID, verify with `figma_get_screenshot` first |
| Console error: element not defined | Component not built | `yarn build`, verify `@Component({ tag })` |
| Hot-reload not working | Watch mode not running | Ensure `yarn sp.dev.watch` is active |
| `:host([attr])` not matching | Prop not reflected | Add `@Prop({ reflect: true })` |
| Screenshot 1–2px diff | Sub-pixel rendering | Use `browser_evaluate` for exact computed values |

---

## Verification Flags

Control verification phases and Git workflow independently:

### `--fast` Flag

- **Purpose**: Skip heavy verification for rapid development
- **Phases Applied**: 1, 2, 3 (Pre-Implementation, Implementation, Stories)
- **Phases Skipped**: 4 (Post-Implementation QA)
- **Git Workflow**: Unaffected (controlled by `--git` flag)
- **Use Cases**: Quick iterations, prototypes, experimental features

### `--git` Flag

- **Purpose**: Enable Git & PR workflow requirements
- **Verification Phases**: Unaffected (all phases 1-4 apply unless `--fast` used)
- **Git Workflow**: Required when flag is present
- **Use Cases**: Work intended for PR/merge, team collaboration

### Flag Combinations

- **No flags**: Full verification (phases 1-4), no Git workflow
- **`--fast`**: Phases 1-3 only, no Git workflow
- **`--git`**: Full verification (phases 1-4) + Git workflow
- **`--fast --git`**: Phases 1-3 + Git workflow

---

## Change Scope Discipline (always active — not gated on `--git`)

**A PR contains only the files the task required.** Unrelated edits — above all
formatter noise — inflate the diff and make the reviewer guess which lines are a
real change and which are Prettier.

### The repo-wide formatter is safe only on a clean repo

`yarn format` ends in `prettier --write .`, and `yarn lint` checks the same scope
with `prettier --check .`. While `main` is green, `yarn format` is a no-op on
files you did not edit — that is why it is the sanctioned command in
[CONTRIBUTING.md](../CONTRIBUTING.md) and inside `yarn check`.

It becomes a scope problem the moment `main` is *not* clean: the formatter then
rewrites every drifted file in the repo. Observed on PR #12, where `main` was red
— `azure/deploy/chart/Chart.yaml` (`"1.0"` -> `'1.0'`),
`azure/deploy/values.dev.yaml` (list re-indent), `web-components/CDN_TEST.html`
(170 lines) — none of them touched by the task.

**Pre-existing drift is decided per file, by who owns it.** Reverting a drifted
file alone turns `yarn lint` red again, since it checks the same repo-wide scope,
so the revert and the ignore rule always travel together:

| The file is | Do | Because |
|---|---|---|
| This repo's own source — `src/`, `.storybook/`, build/test config | Keep it formatted, in an isolated `style:` commit, and say so in the PR description | It has to stay lint-clean; a `style:` commit the reviewer can skip is the honest form |
| Infrastructure or a hand-maintained artifact — `azure/`, Helm charts, CI pipelines, demo pages | Add it to `.prettierignore`, then `git checkout main -- <path>` | This repo's JS toolchain does not own those files, and formatting them is churn in someone else's review |

Resolved that way on PR #12: `azure/`, the root publish pipeline and
`web-components/CDN_TEST.html` are ignored and back to main's content; twelve
source files stayed formatted in two `style:` commits, because `yarn lint` is a
blocking CI step and was red on main.

To format only what you edited:

```bash
git diff --name-only --diff-filter=ACM main...HEAD | xargs -r npx prettier --write --ignore-unknown
```

### Pre-PR scope check

```bash
git diff --stat main...HEAD          # every listed file must be explainable by the task
git diff main...HEAD -- <suspect>    # inspect anything you don't recognise
git checkout main -- <path>          # revert a file the task never needed
```

- [ ] Every file in `git diff --stat main...HEAD` is one the task required
- [ ] No file whose entire diff is quoting, indentation, or shorthand changes
      (`"x"`→`'x'`, `#ffffff`→`#fff`, list re-indent)
- [ ] No config, pipeline, chart or fixture touched unless the task was about it

A file that genuinely *needs* reformatting gets its own commit (`style(scope): …`)
so the reviewer can skip it — never mixed into a feature or fix commit.

---

## Documentation Audience

Two documents, two readers. Putting contributor mechanics in the README makes the
consumer wade through build steps they will never run.

| File | Reader | Contains |
|------|--------|----------|
| `README.md` | Institutions/companies **consuming** `@egovmd/mud` | What the library is, install from the registry, import, framework usage, component overview, versioning/upgrade, links |
| `CONTRIBUTING.md` | Developers **working on** the library | Clone + `yarn install`, local builds (`yarn build`, `yarn tokens.build`), dev loop, Storybook, demo servers, tests, token workflow, commit conventions, publishing |

**Never add to README**: "Install Dependencies", "Build Stencil Components",
"Run the local demo", watch modes, Storybook ports, script reference, or
publishing steps. If such a section is needed, write it in `CONTRIBUTING.md` and
— only if a consumer really needs a pointer — leave one line in the README
linking to it.

- [ ] No local-build or dev-server instructions added to `README.md`
- [ ] Contributor-facing instructions landed in `CONTRIBUTING.md`

---

## Git & PR Workflow (--git flag only)

**Applies only when `--git` flag is specified.**

- **Branch**: `type/issue-key-description` (e.g., `rds-11-implement-select-component`)
- **Commits**: Conventional (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- **PR title**: `ISSUE TYPE :: KEY :: DESCRIPTION`
- **Review tags**: `[mountain]` (blocking, immediate), `[boulder]` (blocking, before merge)
- **Sequence**: tokens → component → stories → visual QA → PR

### Git Requirements (--git)

- [ ] **Branch Decision**: Ask user - create new branch or continue in current?
  - If user has existing branch with work: continue in current branch
  - If starting fresh: create new branch from main
- [ ] Feature branch created from main (if new)
- [ ] Conventional commits used throughout
- [ ] PR follows title format: `ISSUE TYPE :: KEY :: DESCRIPTION`
- [ ] Review tags added where needed
- [ ] All CI checks pass before merge
- [ ] Code review completed and approved
