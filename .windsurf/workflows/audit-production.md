---
description: Full production readiness audit — code quality, tokens, accessibility, performance, security, tests, stories, documentation
---

# Production Readiness Audit Workflow

**Purpose**: Comprehensive validation that a component meets all production standards before merging to main.

**When to use**: Before marking a component as production-ready, before graduating from `src/hidden/`, or as a final pre-merge gate.

---

## Prerequisites

- Component exists in `src/components/` or `src/hidden/`
- Storybook running on port 6007 (`yarn sp.dev.watch`)
- All tokens built (`yarn tokens.build`)
- Component builds without errors

---

## Audit Phases

### Phase 1: Code Quality & Architecture

#### 1.1 File Structure Validation

Check that all required files exist:

```text
src/components/cor-[name]/
├── cor-[name].tsx          ✅ Required
├── cor-[name].css          ✅ Required
├── cor-[name].stories.ts   ✅ Required
├── cor-[name].spec.tsx     ✅ Required (unit tests)
├── cor-[name].e2e.ts       ⚠️  Recommended (E2E tests - disabled at this time)
├── cor-[name].types.ts     ⚠️  If component has custom types
├── cor-[name].enums.ts     ⚠️  If component has enums
├── cor-[name].constants.ts ⚠️  If component has constants
└── readme.md               ✅ Required (auto-generated)
```

#### 1.2 TSX Member Order Compliance

Verify `cor-[name].tsx` follows strict member order (see `src/components/AGENTS.md` → TSX member order):

1. `@Prop({ reflect: true })` — public props (with JSDoc, defaults, enums)
2. `@State()` — internal reactive state
3. `@Element()` — host element reference
4. `@AttachInternals()` — form internals (form elements only)
5. `@Event()` — custom events
6. `@Watch()` — prop watchers (if any; see rule below)
7. `@Listen()` — DOM event listeners
8. Lifecycle: `componentWillLoad` → `componentDidLoad` → `componentDidUpdate`
9. Private methods and private refs
10. `render()` — always last

**`@Watch()` rule**: Forbidden for triggering side effects or state cascades (use `@Listen()` instead). Allowed only for syncing native DOM properties that cannot be reflected via attributes (e.g., `inputElement.indeterminate = newValue`, `inputElement.checked = newValue`).

#### 1.3 TypeScript Quality

Run linter and type checker:

```bash
# Cross-platform command
yarn lint
yarn build
```

**Pass criteria**: Zero errors, zero warnings.

#### 1.4 Prop Validation

For each `@Prop()`:

- Has JSDoc comment with description
- Has correct TypeScript type (not `any`)
- Has `@default` tag in JSDoc if optional
- Enum props use imported enum types (not string literals)
- Boolean props default to `false` (implicit or explicit)
- `@Watch()` only used for syncing native DOM properties (e.g., `inputElement.indeterminate`), NOT for side effects or state cascades

#### 1.5 Slot Validation

If component uses `<slot>`:

- Implements `invalidSlottedTag()` validation (see `cor-button` pattern)
- Has `::slotted(*)` CSS rules for slot content styling
- Story demonstrates slot usage with example content
- JSDoc documents what content is expected in slot

---

### Phase 2: Token & CSS Architecture

#### 2.1 Token File Exists

Check `tokens/core/components/[name].tokens.json` exists and follows structure:

```json
{
  "[name]": {
    "default": {
      "background": { "value": "{color.background.primary}", "type": "color" },
      "text": { "value": "{color.text.primary}", "type": "color" }
    },
    "hover": { ... },
    "focus": { ... },
    "disabled": { ... }
  }
}
```

**CRITICAL — Token JSON wrapper check**: The root key MUST be the component name (e.g., `"button"`, `"input"`). A `"components"` wrapper is **forbidden** — it causes Style Dictionary to generate `--components-[name]-*` prefixed variables instead of `--[name]-*`.

**CRITICAL — Token naming convention**: Scale/state segments MUST be last: `{component}-{element}-{property}-{scale/state}`
- ✅ `--label-font-size-md`, `--input-border-color-focus`, `--button-size-sm`
- ❌ `--label-md-font-size`, `--input-focus-border-color`, `--button-sm-size`
- Size/scale keys nest under the property: `{ "font-size": { "md": ... } }` NOT `{ "md": { "font-size": ... } }`

```json
// ❌ WRONG — adds unwanted --components- prefix to all CSS vars
{ "components": { "[name]": { ... } } }

// ✅ CORRECT — generates --[name]-* CSS vars
{ "[name]": { ... } }
```

#### 2.2 Dark Mode Token Coverage

> ⏸️ **DEFERRED — Dark Mode**: Dark mode tokens (`tokens/core.dark/`) are out of scope until the final project phase. Skip this check.

#### 2.3 CSS Token Usage

Open `cor-[name].css` and verify:

- **Zero hardcoded colors** — all colors use `var(--[name]-*)` component tokens or `var(--color-*)` semantic tokens (e.g., `var(--button-primary-default-background)`, `var(--color-neutral-text-weak)`)
- **Zero hardcoded spacing** — use `var(--spacing-*)` or `var(--space-*)` tokens
- **Zero hardcoded typography** — use `var(--font-*)` tokens
- **Zero magic numbers** — all values are tokens or documented exceptions
- No `!important` rules (unless absolutely necessary with comment explaining why)
- **No `var(--palette-*)` usage** — forbidden in component CSS; use `--color-*` semantic tokens instead (see `tokens/AGENTS.md` → semantic token hierarchy)

Run token reference audit:

```bash
# Windows (PowerShell)
yarn tokens.audit

# macOS / Linux (Unix)
yarn tokens.audit
```

**Pass criteria**: Zero missing token references for this component.

#### 2.4 CSS Architecture Pattern

Verify component follows correct CSS pattern:

**Slot-based (cor-button pattern)**:

- `:host` styles for component container
- `::slotted(*)` styles for slot content
- `:host([variant])` attribute selectors for variants
- `:host([size])` attribute selectors for sizes
- `:host([disabled])` for disabled state

**Internal DOM (cor-input pattern)**:

- `:host` styles for component container
- `.input-wrapper`, `.input-field`, `.label` class selectors
- `.input-wrapper.focused`, `.input-wrapper.disabled` state classes
- No `::slotted()` (component manages internal DOM)

**Check**: Component doesn't mix patterns (pick one).

---

### Phase 3: Accessibility Audit

#### 3.1 Keyboard Navigation

Test in browser (Storybook):

1. **Tab navigation**: Component receives focus in logical order
2. **Enter/Space**: Activates interactive elements (buttons, checkboxes)
3. **Arrow keys**: Navigate within component (select options, radio groups, tabs)
4. **Escape**: Closes modals/dropdowns if applicable
5. **Focus visible**: Clear focus indicator on all interactive elements

**Tool**: Use `/accessibility-audit` workflow for deep keyboard testing.

#### 3.2 ARIA Compliance

Check TSX for proper ARIA attributes:

- `role` attribute if semantic HTML isn't sufficient
- `aria-label` or `aria-labelledby` for all interactive elements
- `aria-describedby` for error messages, hints
- `aria-disabled="true"` when `disabled` prop is true
- `aria-invalid="true"` when `invalid` prop is true
- `aria-required="true"` for required form fields
- `aria-expanded`, `aria-controls` for expandable UI (dropdowns, accordions)

**No `aria-*` on non-interactive elements** (divs, spans) unless they have `role`.

#### 3.3 Color Contrast

Run contrast audit via Playwright:

```powershell
# Check all component states in light mode
browser_navigate({ url: "http://localhost:6007/iframe.html?id=atoms-cor-[name]--default" })
browser_evaluate({ function: "() => { const el = document.querySelector('cor-[name]')?.shadowRoot?.querySelector('.target') || document.querySelector('cor-[name]'); const s = window.getComputedStyle(el); return { bg: s.backgroundColor, fg: s.color }; }" })
```

**Pass criteria**:

- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- Interactive elements: 3:1 against background

<!-- ⏸️ DEFERRED: Repeat for dark mode (`?globals=theme:dark`) — skip until dark mode phase. -->

#### 3.4 Screen Reader Testing

Use `browser_snapshot()` to get accessibility tree:

- All interactive elements have accessible names
- Form fields have associated labels
- Error messages are announced
- State changes are announced (loading, success, error)

---

### Phase 4: Storybook Stories

#### 4.1 Story Coverage

Check `cor-[name].stories.ts` includes:

1. **Default story** — component with default props
2. **All variants** — one story per variant (if component has variants)
3. **All sizes** — one story per size (if component has sizes)
4. **Interactive states** — hover, focus, active, disabled
5. **Error state** — invalid, error message (for form components)
6. **Loading state** — skeleton or spinner (if applicable)
7. **With icon** — if component supports icons
8. **Responsive** — mobile/tablet/desktop viewports (for layout components)

#### 4.2 Story Format (CSF3)

Verify stories follow CSF3 format:

```typescript
/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { ComponentVariant, ComponentSize } from './cor-[name].enums';

const meta: Meta = {
  title: 'Atoms/Cor[Name]',  // Atomic hierarchy: Atoms | Molecules | Organisms
  component: 'cor-[name]',   // String tag name — NOT a JS reference
  argTypes: {
    variant: { control: 'select', options: Object.values(ComponentVariant), description: 'Visual variant' },
    size:    { control: 'select', options: Object.values(ComponentSize), description: 'Component size' },
    disabled:{ control: 'boolean', description: 'Disables the component' },
  },
  render: renderComponent,
};
export default meta;

type Story = StoryObj;

// ✅ MANDATORY: Type render args (prefer a component-specific args type)
type ComponentArgs = { size: string };
const renderComponent = (args: ComponentArgs) => /*html*/ `<cor-[name] size="${args.size}"></cor-[name]>`;

export const Default: Story = { args: { size: 'md' } };
export const AllVariants: Story = { render: () => /*html*/ `...` };
export const AllSizes: Story = { render: () => /*html*/ `...` };
export const States: Story = { render: () => /*html*/ `...` };
```

**Key rules**: `@storybook/web-components` (NOT react), string tag names, `render` function with HTML template strings, `/*html*/` prefix for IDE syntax highlighting, no `tags: ['autodocs']`.

#### 4.3 ArgTypes Completeness

For each `@Prop()`:

- Has corresponding `argTypes` entry
- Has `control` type (select, boolean, text, number)
- Has `options` array for enum props
- Has `description` text
- Has `table.defaultValue` if prop has default

#### 4.4 Storybook Build

Test production Storybook build:

// turbo

```bash
# Windows (PowerShell)
yarn sp.build

# macOS / Linux (Unix)
yarn sp.build
```

**Pass criteria**: Build succeeds, no errors in console, component renders in built Storybook.

---

### Phase 5: Testing

#### 5.1 Unit Tests

Check `cor-[name].spec.tsx` includes tests for:

1. **Rendering** — component renders without errors
2. **Props** — all props apply correctly
3. **Events** — all `@Event()` emitters fire correctly
4. **Methods** — all `@Method()` public methods work
5. **States** — internal state changes work correctly
6. **Slots** — slot content renders (if applicable)
7. **Validation** — `invalidSlottedTag()` rejects invalid content (if applicable)

Run unit tests:

// turbo

```bash
# Windows (PowerShell)
yarn test --spec --findRelatedTests src/components/cor-[name]/cor-[name].spec.tsx

# macOS / Linux (Unix)
yarn test --spec --findRelatedTests src/components/cor-[name]/cor-[name].spec.tsx
```

**Pass criteria**: All tests pass, coverage >80% for component file.

<!-- #### 5.2 E2E Tests (Recommended) - Disabled for now

**Reference:** `src/components/_agents/e2e-testing.md` → when writing new E2E tests, debugging flaky tests, or establishing test patterns.

If `cor-[name].e2e.ts` exists, run:

```bash
# Windows (PowerShell)
yarn test --e2e --findRelatedTests src/components/cor-[name]/cor-[name].e2e.ts

# macOS / Linux (Unix)
yarn test --e2e --findRelatedTests src/components/cor-[name]/cor-[name].e2e.ts
```

**Pass criteria**: All E2E tests pass. -->

#### 5.3 Visual Regression (Pixel-Perfect)

Run pixel-perfect comparison against Figma:

```powershell
# Follow _agents/pixel-perfect-qa.md workflow
# See full 8-step loop for Figma vs Storybook comparison
```

**Pass criteria**: <0.5% pixel difference for all states/variants.

---

### Phase 6: Performance

#### 6.1 Bundle Size

Check component bundle impact:

```powershell
yarn build
# Check dist/design-system/cor-[name].entry.js size
```

**Warning threshold**: >50KB (investigate if larger).

#### 6.2 Runtime Performance

Test in Storybook with browser DevTools:

1. Open component story
2. Open Performance tab
3. Record interaction (click, type, hover)
4. Check for:
   - No layout thrashing (multiple reflows)
   - No long tasks (>50ms)
   - No memory leaks (heap size stable after interactions)

#### 6.3 Render Performance

Check for unnecessary re-renders:

- `@State()` variables only update when value actually changes
- No inline object/array creation in `render()` (causes re-renders)
- Event handlers use arrow functions or `.bind(this)` (not inline)

---

### Phase 7: Security

#### 7.1 XSS Prevention

Check TSX for:

- No `innerHTML` usage (use `textContent` or sanitize)
- No `dangerouslySetInnerHTML` (Stencil equivalent)
- User input is escaped before rendering
- URLs are validated before setting `href` or `src`

#### 7.2 Sensitive Data

Check component doesn't:

- Log sensitive data to console
- Expose sensitive data in DOM attributes
- Store sensitive data in `@State()` without encryption

#### 7.3 Dependencies

Check `package.json` for:

- No known vulnerable dependencies (run `yarn audit`)
- All dependencies are actively maintained
- No unnecessary dependencies

---

### Phase 8: Documentation

#### 8.1 JSDoc Completeness

Check `cor-[name].tsx` has:

- Component-level JSDoc with `@description`, `@example`, `@slot` (if applicable)
- JSDoc for every `@Prop()` with `@default` if optional
- JSDoc for every `@Event()` with event payload type
- JSDoc for every `@Method()` with `@param`, `@returns`

#### 8.2 README.md

Verify `src/components/cor-[name]/readme.md` exists (auto-generated by Stencil).

Check it includes:

- Component usage examples
- All props documented
- All events documented
- All methods documented
- All slots documented

#### 8.3 Storybook Docs

Open Storybook docs page:

```text
http://localhost:6007/?path=/docs/components-cor-[name]--docs
```

Verify:

- Component description is clear
- All props show in Controls table
- All events show in Actions panel
- Examples are interactive

---

### Phase 9: Git Hygiene

#### 9.1 Branch Naming

Check branch follows convention:

- `feature/cor-[name]` for new components
- `fix/cor-[name]-[issue]` for bug fixes
- `refactor/cor-[name]` for refactors

#### 9.2 Commit Messages

Check commits follow Conventional Commits:

```text
feat(cor-[name]): add new component
fix(cor-[name]): resolve focus trap issue
refactor(cor-[name]): align with AGENTS.md patterns
test(cor-[name]): add missing unit tests
docs(cor-[name]): update JSDoc
```

#### 9.3 No Unrelated Changes

Check git diff:

```bash
# Windows (PowerShell)
git diff main...HEAD

# macOS / Linux (Unix)
git diff main...HEAD
```

**Pass criteria**: Only files related to this component are changed (no accidental commits).

---

## Final Checklist

Before marking component as production-ready, verify:

- [ ] **Phase 1**: Code quality — linter passes, member order correct, TypeScript clean
- [ ] **Phase 2**: Tokens — token file exists, zero hardcoded values *(dark mode coverage ⏸️ deferred)*
- [ ] **Phase 3**: Accessibility — keyboard nav works, ARIA correct, contrast passes
- [ ] **Phase 4**: Stories — all variants covered, CSF3 format, argTypes complete, build passes
- [ ] **Phase 5**: Tests — unit tests pass (>80% coverage), E2E passes (if exists - disabled at this time), visual regression <0.5%
- [ ] **Phase 6**: Performance — bundle <50KB, no long tasks, no memory leaks
- [ ] **Phase 7**: Security — no XSS risks, no sensitive data exposure, dependencies clean
- [ ] **Phase 8**: Documentation — JSDoc complete, README exists, Storybook docs clear
- [ ] **Phase 9**: Git — branch named correctly, commits follow convention, no unrelated changes

---

## Automated Audit Command

Run all automated checks:

// turbo

```powershell
# Lint + type check
yarn lint

# Unit tests
yarn test --spec

# Build (includes token build)
yarn build

# Storybook build
yarn sp.build

# Token reference audit
yarn tokens.audit

# Security audit
yarn audit
```

---

## Manual Review Checklist

Print this checklist and review manually:

1. **Visual QA**: Open all stories in Storybook, verify against Figma

2. **Keyboard QA**: Tab through component, test all keyboard shortcuts

3. **Screen reader QA**: Use NVDA/JAWS/VoiceOver to navigate component

4. **Responsive QA**: Test on 375px, 768px, 1440px viewports

5. ~~**Dark mode QA**~~: ⏸️ DEFERRED — skip until dark mode phase.

6. **Cross-browser QA**: Test in Chrome, Firefox, Safari, Edge

7. **Code review**: Read through TSX/CSS line-by-line for anti-patterns

---

## Pass/Fail Criteria

**PASS**: All automated checks pass + manual review complete + no blockers

**FAIL**: Any of:

- Linter errors
- Type errors
- Test failures
- Visual regression >2%
- Accessibility violations (WCAG AA)
- Security vulnerabilities
- Missing documentation
- Unrelated git changes

**WARN**: Any of:

- Bundle size >50KB
- Test coverage <80%
- Visual regression 0.5-2%
<!-- - Missing E2E tests (disabled for now) --> 
- Performance issues (long tasks)

---

## Related Workflows

- `/pre-pr-check` — Quick pre-PR validation (subset of this audit)
- `/audit-accessibility` — Deep accessibility testing
- `/audit-component` — Component-specific audit (similar but less comprehensive)

---

## Notes

- This audit should take 30-60 minutes for a typical component
- Run this audit before requesting PR review
- If component fails, fix issues and re-run audit
- Document any exceptions (e.g., "bundle >50KB because of icon library")
