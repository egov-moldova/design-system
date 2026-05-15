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
