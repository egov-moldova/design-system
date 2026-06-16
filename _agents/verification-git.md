# Verification Checklist, Troubleshooting & Git Workflow

## Scope

Phased verification gates, common troubleshooting, and git/PR conventions. **Read before claiming work complete or creating a PR.**

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
