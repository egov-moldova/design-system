---
name: audit-production
description: Full production-readiness audit (code quality, Stencil compliance, tokens, accessibility, performance, security, tests, stories, documentation, git hygiene). Use before graduating a component to production, before final pre-merge gate, or when comprehensive validation is needed. Delegates structural/decorator checks to the `audit-component` skill and Stencil rules to `stencil-compliance`. Accepts `--e2e` flag for E2E test audit (default: unit-only). Returns categorized PASS/FAIL/WARN report.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_wait_for, mcp__image-compare__compare_images, Skill
model: opus
---

# Production Readiness Audit

Comprehensive validation that a component meets all production standards before merging to main. **11 phases** (9 legacy + Phase 5 split into 5a/5b/5c + Phase 10 Stencil compliance). Returns a categorized report. Does NOT auto-fix.

## Inputs

- Component name: `mud-<name>` (folder in `src/components/` or `src/hidden/`)
- Optional flags:
  - `--e2e` — include Phase 5b E2E test audit (default: unit-only)
  - `--skip-visual` — skip Phase 5c Visual Regression (when Figma references not available)

## Delegation Strategy (NEW)

This agent delegates to specialized skills/commands where they exist; it adds the production-only gates (visual regression, bundle size, documentation, git hygiene, Stencil compliance summary).

| Phase | Delegates to | What it adds |
|-------|--------------|--------------|
| 1 — Code Quality | [`audit-component` skill](../skills/audit-component/SKILL.md) (`--deep`) | Stencil compliance via [`stencil-compliance`](../skills/stencil-compliance/SKILL.md) |
| 2 — Tokens & CSS | `yarn tokens.validate` + [`token-validator` agent](token-validator.md) | Dark mode parity check |
| 3 — Accessibility | [`/audit-accessibility`](../commands/audit-accessibility.md) | WCAG 2.1 AA deep, light + dark |
| 4 — Stories | `audit-component --deep` Wave 2.9 | Storybook build pass |
| 5a — Unit Tests | `audit-component --deep` Wave 2.10.1 | Coverage > 80% target |
| 5b — E2E Tests | `audit-component --deep --e2e` (when flag set) | (future) — Stencil E2E patterns |
| 5c — Visual Regression | `mcp__image-compare__compare_images` | Pixel diff against Figma reference |
| 6 — Performance | Local checks | Bundle size + runtime perf |
| 7 — Security | `audit-component` Wave 2 grep gates + `yarn audit` | npm advisories + CSP compliance |
| 8 — Documentation | Local checks | JSDoc + readme.md + Storybook docs |
| 9 — Git Hygiene | Local checks | Conventional commits + no unrelated diff |
| 10 — Stencil Compliance summary | Surfaces `audit-component --deep` findings under their own header | — |

## Fast Path — single orchestrator call (preferred)

Before dispatching the per-phase work below, run the local audit orchestrator
ONCE and consume its JSON envelope. It covers most of Phase 1 (structure +
anti-patterns + JSDoc), Phase 4 (story exports), Phase 5a (test coverage),
Phase 6.1 (bundle size), and Phase 9 (git hygiene) deterministically and in
parallel:

```bash
# All non-browser checks for one component (Wave A + B of the orchestrator)
node scripts/audit/run-all.mjs mud-<name> --no-browser --json

# With browser checks (a11y tree, contrast, console errors) — requires Storybook + Playwright
yarn sp.dev.watch
node scripts/audit/run-all.mjs mud-<name> --json
```

The envelope has `summary`, `blockers`, and `findingsByTool` keys. After
reading it, only the JUDGMENT-heavy phases remain for AI:

- **Phase 3.x** — interpreting ARIA correctness from the captured a11y tree
- **Phase 3.3** — picking the right remediation when contrast fails (token re-map vs design exception)
- **Phase 7** — security review beyond `yarn audit` (CSP nuances, sensitive data leakage)
- **Phase 8.3** — Storybook docs quality review (script only verifies JSDoc presence)
- **Phase 10** — synthesizing the Stencil compliance findings under a separate header

The legacy per-phase Bash + Read instructions below remain valid as a fallback
when the orchestrator is unavailable (CI without Node 22+, etc.).

## Parallel Execution Model (recommended)

Phases 1–2 must run sequentially (data collection precedes analysis). Phases 3–9 are LOGICALLY INDEPENDENT and SHOULD be dispatched in parallel for ~50% wall-clock reduction:

- **Phase 3 (Accessibility)** — delegate to the `a11y-verifier` subagent in parallel
- **Phase 5 (Testing)** — run `yarn test --spec` in parallel
- **Phase 6 (Performance)** — run `yarn build` in parallel; check bundle size
- **Phase 7 (Security)** — run `yarn audit` + grep anti-patterns in parallel
- **Phase 8 (Documentation)** — read JSDoc + README in parallel
- **Phase 9 (Git Hygiene)** — run `git log` + `git diff --stat` in parallel with everything else

Dispatch pattern:

```
[After Phase 2 completes, send one message with parallel tool calls:]

Agent(subagent_type="a11y-verifier", prompt="componentName=mud-<name>, storyId=atoms-mud-<name>--default")
Bash("yarn test --spec --findRelatedTests src/components/mud-<name>/test/mud-<name>.spec.tsx")
Bash("yarn build")
Bash("yarn audit")
Bash("git log --oneline -10")
Bash("git diff --stat main...HEAD -- src/components/mud-<name>/ tokens/core/components/")
Read("src/components/mud-<name>/mud-<name>.tsx")  // for JSDoc inspection
Read("src/components/mud-<name>/readme.md")
```

Collect all outputs before composing the final report (Phase 10).

If running without subagent support, fall back to the legacy serial 9-phase execution documented below.

## Prerequisites

- Component exists in `src/components/` or `src/hidden/`
- Storybook running on port 6007 (`yarn sp.dev.watch`)
- All tokens built (`yarn tokens.build`)
- Component builds without errors

## Phase 1: Code Quality & Architecture

**Invoke**: `Skill('audit-component', { args: '<componentName> --deep' })` to run the full 3-wave audit with the [`stencil-compliance`](../skills/stencil-compliance/SKILL.md) deep pass. The phase 1 report inherits the audit-component output (Critical/High/Medium/Low buckets).

Additionally verify these production-only items below.

### 1.1 File Structure

Covered by Fast Path script `01-component-structure.mjs` —
`findingsByTool.structure` lists every missing required file. No manual check
needed; just confirm the script reported `errors: 0`.

### 1.2 TSX Member Order

Verify `mud-[name].tsx` follows strict order (see `src/components/AGENTS.md`):

1. `@Prop({ reflect: true })` — public props (with JSDoc, defaults, enums)
2. `@State()` — internal reactive state
3. `@Element()` — host element reference
4. `@AttachInternals()` — form internals (form elements only)
5. `@Event()` — custom events
6. `@Watch()` — prop watchers (rule below)
7. `@Listen()` — DOM event listeners
8. Lifecycle: `componentWillLoad` → `componentDidLoad` → `componentDidUpdate`
9. Private methods and refs
10. `render()` — always last

**`@Watch()` rule**: forbidden for side effects or state cascades (use `@Listen()` instead). Allowed only for syncing native DOM properties not reflectable via attributes. See [`stencil-compliance/references/decorators.md#watch`](../skills/stencil-compliance/references/decorators.md#watch).

### 1.2.1 + 1.2.2 Lifecycle Cleanup + Reactivity Mutation

Both covered by Fast Path script `02-stencil-antipatterns.mjs`:

- `ANTIPATTERN-007-LIFECYCLE-LEAK` — paired check (setInterval / setTimeout /
  addEventListener / ResizeObserver / MutationObserver / IntersectionObserver
  without disconnectedCallback)
- `ANTIPATTERN-005-ARRAY-MUTATION` — push/pop/shift/unshift/splice/sort/reverse
  on `this.*`

Any match in `findingsByTool.antipatterns` with these codes = **Critical**.
References: [`stencil-compliance/references/lifecycle-host.md#lifecycle`](../skills/stencil-compliance/references/lifecycle-host.md#lifecycle) (LC1),
[`stencil-compliance/references/form-reactivity.md#reactive`](../skills/stencil-compliance/references/form-reactivity.md#reactive).

### 1.3 TypeScript Quality

```bash
yarn lint
yarn build
```

**Pass criteria**: Zero errors, zero warnings.

### 1.4 Prop Validation

Mechanical part covered by Fast Path scripts:

- `04-jsdoc-completeness` reports per-prop JSDoc presence + `@default` tag
- `02-stencil-antipatterns` flags `: any`
- `14-component-contract` exposes the full prop list with types + defaults

Judgment that STAYS here: are enum props using the right enum type? Do
booleans default to `false` (project convention, not script-enforced)? Is
`@Watch()` used only for syncing native DOM properties (not state cascades)?

### 1.5 Slot Validation

If component uses `<slot>`:

- Implements `invalidSlottedTag()` validation
- `::slotted(*)` CSS rules for slot content styling
- Story demonstrates slot usage
- JSDoc documents expected content

## Phase 2: Token & CSS Architecture

### 2.1 Token File

Check `tokens/core/components/[name].tokens.json` exists. **DTCG format**: `$value` / `$type`.

**CRITICAL — root wrapper**: root key MUST be the component name (`"button"`, `"input"`). A `"components"` wrapper is forbidden — it generates `--components-[name]-*` prefixed variables.

**CRITICAL — naming**: scale/state segments MUST be last: `{component}-{element}-{property}-{scale/state}`.

- PASS: `--label-font-size-md`, `--input-border-color-focus`, `--button-size-sm`
- FAIL: `--label-md-font-size`, `--input-focus-border-color`, `--button-sm-size`
- JSON: `{ "fontSize": { "md": ... } }` NOT `{ "md": { "fontSize": ... } }`

### 2.2 Dark Mode Parity (REACTIVATED)

Project has `tokens/core.dark/` and `data-theme="dark"` global toggle in Storybook. Dark mode is no longer deferred — it's a production gate.

Run:

```bash
yarn tokens.validate     # detects light tokens with no dark override
yarn audit:contrast      # contrast on token pairs in BOTH modes
```

Both must exit 0. Manual Storybook check: toggle `Mode → Dark` and verify component renders correctly (no white-on-white, no missing variables).

### 2.3 CSS Token Usage

Open `mud-[name].css` and verify:

- Zero hardcoded colors — all use `var(--[name]-*)` component tokens or `var(--color-*)` semantic tokens
- Zero hardcoded spacing — use `var(--spacing-*)` / `var(--space-*)`
- Zero hardcoded typography — use `var(--font-*)`
- Zero magic numbers
- No `!important` (unless absolutely necessary with comment)
- No `var(--palette-*)` usage — use `--color-*` semantic instead

Run token reference audit:

```bash
yarn tokens.audit
```

**Pass criteria**: Zero missing token references.

### 2.4 CSS Architecture Pattern

Component follows ONE of:

**Slot-based (Pattern A — mud-button)**:

- `:host` for component container
- `::slotted(*)` for slot content
- `:host([variant])`, `:host([size])`, `:host([disabled])` attribute selectors

**Internal DOM (Pattern B — mud-input)**:

- `:host` for container
- `.input-wrapper`, `.input-field`, `.label` class selectors
- `.input-wrapper.focused`, `.input-wrapper.disabled` state classes
- No `::slotted()`

**Check**: component doesn't mix patterns.

## Phase 3: Accessibility Audit — WCAG 2.1 Level AA

**Canonical reference:** Skill [`accessibility-compliance`](../skills/accessibility-compliance/SKILL.md). For deepest audit delegate to `/audit-accessibility @mud-<name>`.

**Mandatory automated checks before completing Phase 3:**

```bash
yarn audit:contrast   # token-level contrast, light + dark
```

Storybook a11y addon panel: open every modified component story in both `Mode → Light` and `Mode → Dark` — zero violations.

### 3.1 Keyboard Navigation

Test in Storybook:

- Tab navigation: focus in logical order
- Enter/Space: activates interactive elements
- Arrow keys: navigate within component (select, radio, tabs)
- Escape: closes modals/dropdowns
- Focus visible: clear indicator on all interactive elements

For deep keyboard testing → delegate to `/audit-accessibility` slash command.

### 3.2 ARIA Compliance

Check TSX:

- `role` attribute if semantic HTML insufficient
- `aria-label` / `aria-labelledby` for all interactive elements
- `aria-describedby` for error messages, hints
- `aria-disabled="true"` when `disabled` is true
- `aria-invalid="true"` when `invalid` is true
- `aria-required="true"` for required fields
- `aria-expanded`, `aria-controls` for expandable UI

No `aria-*` on non-interactive elements unless they have `role`.

### 3.3 Color Contrast (SC 1.4.3 + 1.4.11) — both modes

Covered by Fast Path script `10-contrast-pairs.mjs` which captures computed
fg/bg/border for every interactive element in both themes and applies the
WCAG 2.1 AA thresholds (4.5:1 normal, 3:1 large/UI, disabled exempt).

Cross-reference with `yarn audit:contrast` (token-level). Both must exit 0;
any runtime FAIL that token-level didn't catch indicates the component CSS
picked the wrong token (fix the component); any token-level FAIL that
runtime didn't catch indicates a token mapping issue (fix the token).

For one-off spot checks at a specific selector, the legacy MCP path still
works:

```text
mcp__playwright__browser_evaluate({ function: "() => { document.documentElement.dataset.theme = 'dark'; return new Promise(r => requestAnimationFrame(() => r(true))); }" })
```

**Pass criteria** (WCAG 2.1 AA):

- Normal text: 4.5:1 minimum
- Large text (≥ 18pt or ≥ 14pt bold): 3:1 minimum
- UI components, borders, focus rings, icons: 3:1 against adjacent
- Verified in BOTH light AND dark mode
- Disabled elements: exempt (per WCAG 1.4.3 inherent exemption)

Run `yarn audit:contrast` for token-level verification of every documented pair.

### 3.4 Screen Reader Testing

Use `mcp__playwright__browser_snapshot()` for accessibility tree:

- Interactive elements have accessible names
- Form fields have labels
- Error messages announced
- State changes announced (loading, success, error)

## Phase 4: Storybook Stories

### 4.1 Story Coverage

Check `mud-[name].stories.ts` includes:

1. Default — component with default props
2. AllVariants — one per variant (if has variants)
3. AllSizes — one per size (if has sizes)
4. States — hover, focus, active, disabled
5. Error state — invalid, error message (form components)
6. Loading state — skeleton/spinner (if applicable)
7. With icon — if component supports icons
8. Responsive — mobile/tablet/desktop (layout components)

### 4.2 Story Format (CSF3)

Verify:

- Imports from `@storybook/web-components-vite` (NOT react / not the bare `@storybook/web-components` renderer)
- `component: 'mud-[name]'` (string tag, NOT JS reference)
- `render` function with HTML template strings
- `/*html*/` prefix for IDE syntax highlighting
- `title` follows atomic hierarchy: `Atoms/CorName`, `Molecules/CorName`, etc.
- No `tags: ['autodocs']`

### 4.3 ArgTypes Completeness

For each `@Prop()`:

- Corresponding `argTypes` entry
- `control` type (select, boolean, text, number)
- `options` array for enum props
- `description` text
- `table.defaultValue` if prop has default

### 4.4 Storybook Build

```bash
yarn sp.build
```

**Pass criteria**: build succeeds, no console errors, component renders.

## Phase 5: Testing

Default: unit tests only. With `--e2e` flag also audit E2E tests.

### 5a. Unit Tests (DEFAULT — always audited)

Check `test/mud-[name].spec.tsx` covers:

1. Rendering — `render()` from `@stencil/vitest` resolves without errors
2. Props — all `@Prop` reflect correctly to host attributes / JSX output
3. Events — all `@Event()` emitters fire with correct payload (via `eventSpy`)
4. Methods — all `@Method()` public methods work (returning Promise)
5. States — internal `@State` transitions
6. Slots — slot content renders
7. Validation — `invalidSlottedTag()` rejects invalid content
8. ARIA — proper attributes present in rendered DOM
9. Form-associated (if applicable):
   - `formResetCallback` resets value + validity
   - `formDisabledCallback` updates `disabled`
   - `formStateRestoreCallback` restores from state
   - `setFormValue(value, state)` called on change (2-arg)
   - `setValidity` reflects flags

```bash
yarn test --spec --findRelatedTests src/components/mud-[name]/test/mud-[name].spec.tsx
```

**Pass criteria**: all tests pass, coverage > 80% (target — not enforced by tooling).

### 5b. E2E Tests (GATED on `--e2e` flag)

If `--e2e` flag is NOT set: emit `INFO: E2E audit skipped (use --e2e to enable)` and continue.

When `--e2e` set, check `test/mud-[name].e2e.ts`:

1. `newE2EPage` setup
2. Hydration: component gets `.hydrated` class
3. Shadow DOM access: `page.find('mud-x >>> .target')` combinator
4. Event spies: `page.spyOnEvent('corChange')`
5. Focus/blur: `page.evaluate()` to trigger native focus
6. Form-associated: form submission produces correct FormData
7. Cross-reference [`src/components/_agents/e2e-testing.md`](../../src/components/_agents/e2e-testing.md)

```bash
yarn test --e2e --findRelatedTests src/components/mud-[name]/test/mud-[name].e2e.ts
```

**Pass criteria**: all E2E pass; no flakes.

### 5c. Visual Regression

Skipped if `--skip-visual` flag set.


Run pixel-perfect comparison against Figma:

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-mud-[name]--default" })
mcp__playwright__browser_take_screenshot({ type: "png", filename: ".playwright-mcp/current.png" })
mcp__image-compare__compare_images({
  image1_path: ".playwright-mcp/figma-ref.png",
  image2_path: ".playwright-mcp/current.png",
  diff_output_path: ".playwright-mcp/diff.png"
})
```

**Pass criteria**: < 0.5% pixel difference for all states/variants.

## Phase 6: Performance

### 6.1 Bundle Size

```bash
yarn build
```

Check `dist/design-system/mud-[name].entry.js` size. **Warning threshold**: > 50KB.

### 6.2 Runtime Performance

Test in Storybook with DevTools:

1. Open component story
2. Record interaction (click, type, hover)
3. Check for:
   - No layout thrashing
   - No long tasks (> 50ms)
   - No memory leaks (heap stable after interactions)

### 6.3 Render Performance

- `@State()` variables only update when value actually changes
- No inline object/array creation in `render()`
- Event handlers use arrow functions or `.bind(this)` (not inline)

## Phase 7: Security

### 7.1 Safe DOM Insertion

Check TSX for unsafe patterns. Reject:

- Raw HTML insertion APIs (use `textContent` or sanitize)
- Stencil equivalent of unsafe HTML injection props
- User input rendered without escaping
- URLs set on `href` / `src` without validation

### 7.2 Sensitive Data

Component must not:

- Log sensitive data to console
- Expose sensitive data in DOM attributes
- Store sensitive data in `@State()` without encryption

### 7.3 Dependencies

```bash
yarn audit
```

- No known vulnerable dependencies
- All dependencies actively maintained
- No unnecessary dependencies

### 7.4 CSP Compliance (NEW)

- No inline `style={{ }}` (violates CSP `style-src`)
- No dynamic code-execution constructors (violates CSP `script-src`)
- No `javascript:` URLs on `href` or `src`
- No `innerHTML` assignment without sanitization

## Phase 8: Documentation

### 8.1 JSDoc Completeness

Check `mud-[name].tsx`:

- Component-level JSDoc: `@description`, `@example`, `@slot` (if applicable)
- JSDoc for every `@Prop()` with `@default` if optional
- JSDoc for every `@Event()` with payload type
- JSDoc for every `@Method()` with `@param`, `@returns`

### 8.2 README.md

Verify `src/components/mud-[name]/readme.md` exists (auto-generated by Stencil) and includes:

- Component usage examples
- All props documented
- All events documented
- All methods documented
- All slots documented

### 8.3 Storybook Docs

Open `http://localhost:6007/?path=/docs/components-mud-[name]--docs` and verify:

- Component description is clear
- All props in Controls table
- All events in Actions panel
- Examples are interactive

## Phase 9: Git Hygiene

Entirely covered by Fast Path script `03-git-hygiene.mjs`:

- `GIT-BRANCH-NAMING` — branch matches `type/desc` convention
- `GIT-COMMIT-CONVENTIONAL` — last N commits follow Conventional Commits
- `GIT-COMMIT-WIP` — no `wip` / `fixup!` / `squash!` left in the log
- `GIT-STAGED-*` — no `dist/`, `node_modules/`, `.stencil/`, `tokens/generated/`,
  `.env`, or `*.log` staged
- Branch types accepted: `feat`, `fix`, `refactor`, `redesign`, `test`,
  `docs`, `chore`, `build`, `ci`, `perf`, `style`

Cross-reference with manual `git diff main...HEAD` only when the script
surfaces an unexpected change; otherwise trust the envelope.

## Phase 10: Stencil Compliance Deep Pass

The `audit-component --deep` invocation in Phase 1 already covers the 14-section Stencil rule pass. This phase surfaces the findings explicitly in the production report under their own header so reviewers see them grouped.

Sections audited (delegated to [`stencil-compliance`](../skills/stencil-compliance/SKILL.md)):

1. `@Component` decorator options
2. `@Prop()` (mutability, reflection, types, defaults)
3. `@State()` (mutation patterns)
4. `@Event()` / `@Listen()` (composed, cancelable, target)
5. `@Method()` (async / Promise contract)
6. Lifecycle hooks (cleanup, async patterns)
7. `<Host>` & `@Element()` (declarative pattern)
8. JSX / Templating (keys, refs, event handlers)
9. CSS / Styling (`::part`, `:host`, tokens)
10. Form-Associated (full callback set)
11. Reactive Data (no direct mutation)
12. Serialization (when complex props)
13. Functional Components (if used)
14. Public API (imports, `readTask`/`writeTask`)

For component-level deep audit (interactive), invoke `/audit-component @mud-<name> --deep`.

## Automated Audit Bundle

```bash
yarn lint
yarn test --spec
yarn build
yarn sp.build
yarn tokens.audit
yarn tokens.validate
yarn audit:contrast
yarn audit
```

Plus the `audit-component --deep` skill invocation in Phase 1.

## Phase 11.5: Layer 2 Verification (interactive only — skipped in CI)

For local runs (where `run-all.mjs` envelope has `meta.layer2Required: true`),
execute Layer 2 of the `audit-component` skill: §BX (mandatory MCP browser
checklist) + §CX (archetype-specific checks) + §DX (discretionary).

See [`.claude/skills/audit-component/SKILL.md`](../skills/audit-component/SKILL.md) §Layer 2 for the canonical procedure. The archetype is read from
`envelope.findingsByTool['component-contract'][...].meta.contract.archetype.value`
(emitted by script 14). Surface BX/CX/DX results in the final report's Check
Matrix; a failing BX row escalates the overall verdict to "Block".

Skip in CI runs (`envelope.meta.ciDetected === true`) — those produce a
Layer-1-only verdict and the matrix shows L2 rows as ⏭️ with reason `--ci`.

## Phase 11: Final Report

```text
## Production Readiness Audit: mud-[name]
**Flags**: <list active flags, e.g. --e2e, --skip-visual>

### Summary
- Phase 1  (Code Quality):       PASS / FAIL / WARN — <issue count>
- Phase 2  (Tokens & CSS):       PASS / FAIL / WARN
- Phase 3  (Accessibility):      PASS / FAIL / WARN
- Phase 4  (Stories):            PASS / FAIL / WARN
- Phase 5a (Unit Tests):         PASS / FAIL / WARN — <coverage>%
- Phase 5b (E2E Tests):          PASS / FAIL / SKIP
- Phase 5c (Visual Regression):  PASS / FAIL / SKIP — <%diff>
- Phase 6  (Performance):        PASS / FAIL / WARN — <bundle KB>
- Phase 7  (Security):           PASS / FAIL / WARN
- Phase 8  (Documentation):      PASS / FAIL / WARN
- Phase 9  (Git Hygiene):        PASS / FAIL / WARN
- Phase 10 (Stencil Compliance): PASS / FAIL / WARN — <issue count>

### Critical Issues (must fix before merge)
1. ...

### High Issues
1. ...

### Warnings (review)
1. ...

### Stencil Compliance Findings (from audit-component --deep)
- Section 1 @Component: ...
- Section 2 @Prop: ...
- ... (only show non-PASS sections)

### Notes
- Bundle size: X KB (limit 50 KB)
- Test coverage: Y%
- Visual regression: Z% diff
- Lifecycle cleanup: <verified | N/A | MISSING>
- Reactivity mutations detected: <count>
```

**Pass/Fail criteria**:

- **PASS**: All automated checks pass + manual review complete + no blockers
- **FAIL**: lint/type/test failures, visual regression > 2%, accessibility violations, security vulnerabilities, missing documentation, unrelated git changes, ANY critical Stencil compliance issue (lifecycle leak, reactivity bug, missing form callback)
- **WARN**: bundle > 50 KB, test coverage < 80%, visual regression 0.5–2%, long tasks, non-critical Stencil compliance issues

## Return to Main Agent

Present the report. Do NOT auto-fix. Wait for user instruction on which findings to address.

For component-level deep audit, suggest `/audit-component @mud-<name> --deep`.
For accessibility-only deep audit, suggest `/audit-accessibility @mud-<name>`.
