# Component Development — AGENTS.md

**Scope**: `src/components/**` — Stencil web component implementation patterns, slot architecture, CSS, stories, E2E tests.

**Parent**: See root `AGENTS.md` for global rules, token-first principles, and pixel-perfect QA workflow.

**Modular documentation**: Detailed patterns live in `_agents/*.md` subfiles. Load on-demand based on what you're doing.

---

## Subfile Index — When to Load Each

### Component Design & Architecture

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/form-associated.md` | Stencil doc checks, `formAssociated: true` pattern, ElementInternals API | **When building form elements** (input, select, textarea, checkbox, radio) |
| `_agents/slot-patterns.md` | Slot validation guards, shared constants, no-boolean-props rule, CSS `:empty` vs slot detection | **When designing slot APIs or validating slotted elements** |
| `_agents/component-structure.md` | File layout per component, TSX class member order, `@Watch` rule, stenciljs skill corrections | **When scaffolding a new component** |

### Styling & Stories

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/css-architecture.md` | Pattern A (slotted `::slotted(*)`), Pattern B (internal DOM), key CSS rules, stencil-atomic corrections | **When writing component CSS** |
| `_agents/storybook-stories.md` | CSF3 format, shared render functions, grid comparison stories, docs generator, storybook corrections | **When writing `.stories.ts` files** |

### Composition & Testing

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/composition-interactive.md` | Organism/template section mapping, interactive component states & behaviors table | **When building molecules, organisms, or interactive components** |
| `_agents/e2e-testing.md` | Shadow DOM `>>>` combinator, `page.evaluate()` patterns, test skeleton, decision matrix | **When writing E2E tests** |

---

## Cross-References to Root `_agents/`

These topics have their **canonical location** in the root `_agents/` folder:

| Topic | Canonical File | Summary |
|-------|---------------|---------|
| TypeScript strict mode (7 rules) | `_agents/typescript-strict.md` | `!` assertions, `Record<>`, `?? ''`, `import type` |
| Shadow DOM dual selectors | `_agents/shadow-dom-patterns.md` | `::slotted()` + direct child for slot defaults |
| Anti-patterns (25 rules) | `_agents/anti-patterns.md` | All forbidden patterns |
| Pixel-perfect QA | `_agents/pixel-perfect-qa.md` | Full 8-step visual comparison loop |
| Token-CSS validation | `_agents/pre-implementation.md` | camelCase → kebab-case verification |

---

## Quick Reference — File Structure

```text
src/components/cor-[name]/
├── cor-[name].tsx              # Component class
├── cor-[name].css              # Styles (PostCSS nested)
├── cor-[name].types.ts         # TypeScript interfaces
├── cor-[name].enums.ts         # Enum values for props
├── cor-[name].constants.ts     # Static constants
├── cor-[name].stories.ts       # Storybook CSF3 stories
├── readme.md                   # Auto-generated
└── test/
    ├── cor-[name].spec.tsx     # Unit tests
    └── cor-[name].e2e.ts      # E2E tests
```

## Quick Reference — TSX Member Order

1. `@Prop({ reflect: true })` — public props
2. `@State()` — internal state
3. `@Element()` — host reference
4. `@AttachInternals()` — form internals
5. `@Event()` — custom events
6. `@Watch()` — prop watchers (restricted use)
7. `@Listen()` — DOM listeners
8. Lifecycle methods
9. Private methods
10. `render()` — always last

---

## Accessibility — WCAG 2.1 Level AA

Every `cor-*` component must conform to **WCAG 2.1 Level AA** in both light and dark mode. Canonical guide: Skill [`accessibility-compliance`](../../.claude/skills/accessibility-compliance/SKILL.md). Project-specific spec: Figma [node 2753-5965](https://www.figma.com/design/doJ7tDY0PlQ0PqMgbpFVIC/Components?node-id=2753-5965&m=dev).

**Five essential rules** (full details in the Skill):

1. **Accessible name** on every interactive element — text content, `aria-label`, or `aria-labelledby`. Visible text must be included in the name (SC 2.5.3).
2. **Keyboard parity** — every action triggerable via mouse must also work via Tab, Enter/Space, Escape, and arrow keys for composite widgets (SC 2.1.1, 2.1.2, 2.4.3).
3. **`:focus-visible` ring** — always rendered on keyboard focus, ≥ 3:1 contrast against background AND adjacent enabled elements (SC 2.4.7, 1.4.11). Never use bare `:focus` without `-visible`.
4. **Contrast ratios** — 4.5:1 normal text, 3:1 large text, 3:1 UI components & focus rings. Verified in BOTH light and dark mode via `yarn audit:contrast` and Storybook a11y addon (SC 1.4.3, 1.4.11).
5. **ARIA states reflect reality** — `aria-disabled`, `aria-invalid`, `aria-expanded`, `aria-selected`, `aria-checked` mirror actual component state. Dynamic status uses `role="status"` (polite) or `role="alert"` (assertive) (SC 4.1.2, 4.1.3).

**Target size exceptions:** button sm/xs (32/24 px) and checkbox sm/md (16/20 px) are below 24×24. WCAG 2.1 AA does NOT require 24×24 (that is 2.2 SC 2.5.8). See [`_agents/target-size-exceptions.md`](_agents/target-size-exceptions.md) for the documented rationale.

**Verification:** `/audit-accessibility @cor-<name>` deep audit; `/audit-component @cor-<name>` for category-level pass; Storybook a11y addon during dev; `yarn audit:contrast` for token-level light + dark.
