---
name: audit-production
description: Full 9-phase production readiness audit (code quality, tokens, accessibility, performance, security, tests, stories, documentation, git hygiene). Use before graduating a component to production, before final pre-merge gate, or when comprehensive validation is needed. Returns categorized PASS/FAIL/WARN report.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_wait_for, mcp__image-compare__compare_images, Skill
model: opus
---

# Production Readiness Audit

Comprehensive validation that a component meets all production standards before merging to main. 9 phases. Returns categorized report. Does NOT auto-fix.

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

Agent(subagent_type="a11y-verifier", prompt="componentName=cor-<name>, storyId=atoms-cor-<name>--default")
Bash("yarn test --spec --findRelatedTests src/components/cor-<name>/test/cor-<name>.spec.tsx")
Bash("yarn build")
Bash("yarn audit")
Bash("git log --oneline -10")
Bash("git diff --stat main...HEAD -- src/components/cor-<name>/ tokens/core/components/")
Read("src/components/cor-<name>/cor-<name>.tsx")  // for JSDoc inspection
Read("src/components/cor-<name>/readme.md")
```

Collect all outputs before composing the final report (Phase 10).

If running without subagent support, fall back to the legacy serial 9-phase execution documented below.

## Prerequisites

- Component exists in `src/components/` or `src/hidden/`
- Storybook running on port 6007 (`yarn sp.dev.watch`)
- All tokens built (`yarn tokens.build`)
- Component builds without errors

## Phase 1: Code Quality & Architecture

### 1.1 File Structure

Check all required files exist:

```text
src/components/cor-[name]/
├── cor-[name].tsx          REQUIRED
├── cor-[name].css          REQUIRED
├── cor-[name].stories.ts   REQUIRED
├── cor-[name].spec.tsx     REQUIRED (unit tests)
├── cor-[name].e2e.ts       Recommended (disabled at this time)
├── cor-[name].types.ts     If component has custom types
├── cor-[name].enums.ts     If component has enums
├── cor-[name].constants.ts If component has constants
└── readme.md               REQUIRED (auto-generated)
```

### 1.2 TSX Member Order

Verify `cor-[name].tsx` follows strict order (see `src/components/AGENTS.md`):

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

**`@Watch()` rule**: forbidden for side effects or state cascades (use `@Listen()` instead). Allowed only for syncing native DOM properties not reflectable via attributes.

### 1.3 TypeScript Quality

```bash
yarn lint
yarn build
```

**Pass criteria**: Zero errors, zero warnings.

### 1.4 Prop Validation

For each `@Prop()`:

- JSDoc with description
- Correct TypeScript type (not `any`)
- `@default` tag if optional
- Enum props use imported enum types
- Boolean props default to `false`
- `@Watch()` used only for syncing native DOM properties

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

### 2.2 Dark Mode

DEFERRED. Skip until dark mode phase.

### 2.3 CSS Token Usage

Open `cor-[name].css` and verify:

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

**Slot-based (Pattern A — cor-button)**:

- `:host` for component container
- `::slotted(*)` for slot content
- `:host([variant])`, `:host([size])`, `:host([disabled])` attribute selectors

**Internal DOM (Pattern B — cor-input)**:

- `:host` for container
- `.input-wrapper`, `.input-field`, `.label` class selectors
- `.input-wrapper.focused`, `.input-wrapper.disabled` state classes
- No `::slotted()`

**Check**: component doesn't mix patterns.

## Phase 3: Accessibility Audit — WCAG 2.1 Level AA

**Canonical reference:** Skill [`accessibility-compliance`](../skills/accessibility-compliance/SKILL.md). For deepest audit delegate to `/audit-accessibility @cor-<name>`.

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

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-cor-[name]--default" })
mcp__playwright__browser_evaluate({ function: "() => { const el = document.querySelector('cor-[name]')?.shadowRoot?.querySelector('.target') || document.querySelector('cor-[name]'); const s = window.getComputedStyle(el); return { bg: s.backgroundColor, fg: s.color }; }" })
```

Toggle dark mode and repeat:

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

Check `cor-[name].stories.ts` includes:

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

- Imports from `@storybook/web-components` (NOT react)
- `component: 'cor-[name]'` (string tag, NOT JS reference)
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

### 5.1 Unit Tests

Check `cor-[name].spec.tsx` covers:

1. Rendering — no errors
2. Props — all apply correctly
3. Events — all `@Event()` emitters fire
4. Methods — all `@Method()` public methods work
5. States — internal state changes
6. Slots — slot content renders
7. Validation — `invalidSlottedTag()` rejects invalid content

```bash
yarn test --spec --findRelatedTests src/components/cor-[name]/cor-[name].spec.tsx
```

**Pass criteria**: all tests pass, coverage > 80%.

### 5.2 E2E Tests

DISABLED at this time. Skip.

### 5.3 Visual Regression

Run pixel-perfect comparison against Figma:

```text
mcp__playwright__browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-cor-[name]--default" })
mcp__playwright__browser_take_screenshot({ type: "png", filename: "current.png" })
mcp__image-compare__compare_images({
  image1_path: "figma-ref.png",
  image2_path: "current.png",
  diff_output_path: "diff.png"
})
```

**Pass criteria**: < 0.5% pixel difference for all states/variants.

## Phase 6: Performance

### 6.1 Bundle Size

```bash
yarn build
```

Check `dist/design-system/cor-[name].entry.js` size. **Warning threshold**: > 50KB.

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

## Phase 8: Documentation

### 8.1 JSDoc Completeness

Check `cor-[name].tsx`:

- Component-level JSDoc: `@description`, `@example`, `@slot` (if applicable)
- JSDoc for every `@Prop()` with `@default` if optional
- JSDoc for every `@Event()` with payload type
- JSDoc for every `@Method()` with `@param`, `@returns`

### 8.2 README.md

Verify `src/components/cor-[name]/readme.md` exists (auto-generated by Stencil) and includes:

- Component usage examples
- All props documented
- All events documented
- All methods documented
- All slots documented

### 8.3 Storybook Docs

Open `http://localhost:6007/?path=/docs/components-cor-[name]--docs` and verify:

- Component description is clear
- All props in Controls table
- All events in Actions panel
- Examples are interactive

## Phase 9: Git Hygiene

### 9.1 Branch Naming

- `feature/cor-[name]` for new components
- `fix/cor-[name]-[issue]` for bug fixes
- `refactor/cor-[name]` for refactors

### 9.2 Commit Messages (Conventional Commits)

```text
feat(cor-[name]): add new component
fix(cor-[name]): resolve focus trap issue
refactor(cor-[name]): align with AGENTS.md patterns
test(cor-[name]): add missing unit tests
docs(cor-[name]): update JSDoc
```

### 9.3 No Unrelated Changes

```bash
git diff main...HEAD
```

**Pass criteria**: only files related to this component are changed.

## Automated Audit Bundle

```bash
yarn lint
yarn test --spec
yarn build
yarn sp.build
yarn tokens.audit
yarn audit
```

## Final Report

Compile structured report:

```text
## Production Readiness Audit: cor-[name]

### Summary
- Phase 1 (Code Quality): PASS / FAIL / WARN
- Phase 2 (Tokens & CSS): PASS / FAIL / WARN
- Phase 3 (Accessibility): PASS / FAIL / WARN
- Phase 4 (Stories): PASS / FAIL / WARN
- Phase 5 (Testing): PASS / FAIL / WARN
- Phase 6 (Performance): PASS / FAIL / WARN
- Phase 7 (Security): PASS / FAIL / WARN
- Phase 8 (Documentation): PASS / FAIL / WARN
- Phase 9 (Git Hygiene): PASS / FAIL / WARN

### Critical Issues (must fix before merge)
1. ...

### Warnings (review)
1. ...

### Notes
- Bundle size: X KB (limit 50 KB)
- Test coverage: Y%
- Visual regression: Z% diff
```

**Pass/Fail criteria**:

- **PASS**: All automated checks pass + manual review complete + no blockers
- **FAIL**: lint/type/test failures, visual regression > 2%, accessibility violations, security vulnerabilities, missing documentation, unrelated git changes
- **WARN**: bundle > 50 KB, test coverage < 80%, visual regression 0.5–2%, long tasks

## Return to Main Agent

Present the report. Do NOT auto-fix. Wait for user instruction on which findings to address.
