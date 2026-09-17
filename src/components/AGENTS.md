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
| `_agents/component-structure.md` | File layout per component, TSX class member order, `@Watch` rule, common Stencil mistake corrections | **When scaffolding a new component** |

### Styling & Stories

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/css-architecture.md` | Pattern A (slotted `::slotted(*)`), Pattern B (internal DOM), key CSS rules, common CSS/slot mistake corrections | **When writing component CSS** |
| `_agents/storybook-stories.md` | CSF3 format, shared render functions, grid comparison stories, docs generator, storybook corrections | **When writing `.stories.ts` files** |

### Composition & Testing

| File | What It Covers | When to Load |
|------|---------------|--------------|
| `_agents/composition-interactive.md` | Organism/template section mapping, interactive component states & behaviors table | **When building molecules, organisms, or interactive components** |
| `_agents/testing.md` | Spec tests with Vitest + `@stencil/vitest`: run commands, spec template, coverage rules, `RenderResult` API, reaching 100% branches | **Before writing any `*.spec.tsx`** |
| `_agents/e2e-testing.md` | Browser tests against shadow roots: Playwright shadow-piercing locators, `page.evaluate()` with `shadowRoot`, custom-event listeners, decision matrix | **When writing E2E tests** |
| `_agents/a11y-testing.md` | WCAG 2.1 AA in three layers: structural contract in `.spec.tsx`, axe via Storybook `addon-a11y`, browser-driven axe via Playwright MCP; coverage matrix per component type | **When writing accessibility assertions or running an accessibility audit** |

---

## Cross-References to Root `_agents/`

These topics have their **canonical location** in the root `_agents/` folder
(paths below are relative to this file):

| Topic | Canonical File | Summary |
|-------|---------------|---------|
| TypeScript strict mode (7 rules) | `../../_agents/typescript-strict.md` | `!` assertions, `Record<>`, `?? ''`, `import type` |
| Shadow DOM dual selectors | `../../_agents/shadow-dom-patterns.md` | `::slotted()` + direct child for slot defaults |
| Anti-patterns (25 rules) | `../../_agents/anti-patterns.md` | All forbidden patterns |
| Pixel-perfect QA | `../../_agents/pixel-perfect-qa.md` + `pixel-perfect` skill | Figma state manifest (`test/<name>.figma.json`), style parity, screenshot diff |
| Token-CSS validation | `../../_agents/pre-implementation.md` | camelCase → kebab-case verification |

---

## Quick Reference — File Structure

```text
src/components/mud-[name]/
├── mud-[name].tsx              # Component class
├── mud-[name].css              # Styles (PostCSS nested)
├── mud-[name].types.ts         # TypeScript interfaces
├── mud-[name].enums.ts         # Enum values for props
├── mud-[name].constants.ts     # Static constants
├── mud-[name].stories.ts       # Storybook CSF3 stories
├── readme.md                   # Auto-generated
└── test/
    ├── mud-[name].spec.tsx     # Unit tests
    └── mud-[name].e2e.ts      # E2E tests
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

## Stencil Compliance

Every `mud-*` component conforms to the [`stencil-compliance` skill](../../.claude/skills/stencil-compliance/SKILL.md).

Run `yarn audit:antipatterns <component>` and `yarn audit:stencil-contract <component>` first; the skill says what remains for judgment.

---

## Accessibility — WCAG 2.1 Level AA

Every `mud-*` component must conform to **WCAG 2.1 Level AA** in both light and dark mode. Canonical guide: Skill [`accessibility-compliance`](../../.claude/skills/accessibility-compliance/SKILL.md). Project-specific spec: Figma [node 2753-5965](https://www.figma.com/design/doJ7tDY0PlQ0PqMgbpFVIC/Components?node-id=2753-5965&m=dev).

**Five essential rules** (full details in the Skill):

1. **Accessible name** on every interactive element — text content, `aria-label`, or `aria-labelledby`. Visible text must be included in the name (SC 2.5.3).
2. **Keyboard parity** — every action triggerable via mouse must also work via Tab, Enter/Space, Escape, and arrow keys for composite widgets (SC 2.1.1, 2.1.2, 2.4.3).
3. **`:focus-visible` ring** — always rendered on keyboard focus, ≥ 3:1 contrast against background AND adjacent enabled elements (SC 2.4.7, 1.4.11). Never use bare `:focus` without `-visible`.
4. **Contrast ratios** — 4.5:1 normal text, 3:1 large text, 3:1 UI components & focus rings. Verified in BOTH light and dark mode via `yarn audit:contrast` and Storybook a11y addon (SC 1.4.3, 1.4.11).
5. **ARIA states reflect reality** — `aria-disabled`, `aria-invalid`, `aria-expanded`, `aria-selected`, `aria-checked` mirror actual component state. Dynamic status uses `role="status"` (polite) or `role="alert"` (assertive) (SC 4.1.2, 4.1.3).

**Target size exceptions:** button sm/xs (32/24 px) and checkbox sm/md (16/20 px) are below 24×24. WCAG 2.1 AA does NOT require 24×24 (that is 2.2 SC 2.5.8). See [`_agents/target-size-exceptions.md`](_agents/target-size-exceptions.md) for the documented rationale.

**Verification:** `/audit-accessibility @mud-<name>` deep audit; `/audit-component @mud-<name>` for category-level pass; Storybook a11y addon during dev; `yarn audit:contrast` for token-level light + dark.
