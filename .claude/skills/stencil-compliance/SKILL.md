---
name: stencil-compliance
description: Use when designing, implementing, auditing, or modifying any `mud-*` Stencil component to ensure conformance with Stencil 4.x best practices. Covers @Component decorator options, @Prop/@State/@Event/@Listen/@Method/@Watch decorators, lifecycle hooks, Host element + @Element(), JSX/templating, shadow DOM styling, form-associated custom elements, reactive data, serialization, functional components, and public API surface. Required reference for all `mud-*` components.
---

# Stencil Compliance — Stencil 4.x Best Practices

**Target standard:** Stencil 4.x (aligned with the official docs at <https://stenciljs.com/docs>). Every `mud-*` component must conform.

**Project source of truth:** [`AGENTS.md`](../../../AGENTS.md) (root) and [`src/components/AGENTS.md`](../../../src/components/AGENTS.md) — project-specific overlays (`mud-` prefix, member order, slot patterns) take precedence where stricter than Stencil docs.

**Companion skill:** [`accessibility-compliance`](../accessibility-compliance/SKILL.md) — WCAG 2.1 AA rules. Cross-referenced from this skill for ARIA/role rules (SC 4.1.2 overlaps with `@Prop` reflectarea ARIA, focus handling overlaps cu `delegatesFocus`, etc.).

> When Stencil docs and project AGENTS.md conflict, AGENTS.md wins. This file flags such overrides explicitly.

---

## 1. Gateway — 14 Compliance Areas

Each section below maps to one reference file. Load on-demand based on what you're auditing or building.

| # | Area | Reference file | Stencil doc | Key rule count |
|---|------|----------------|-------------|----------------|
| 1 | `@Component` decorator | [`references/decorators.md#component`](references/decorators.md#component) | [docs/component](https://stenciljs.com/docs/component) | 8 |
| 2 | `@Prop()` | [`references/decorators.md#prop`](references/decorators.md#prop) | [docs/properties](https://stenciljs.com/docs/properties) | 24 |
| 3 | `@State()` | [`references/decorators.md#state`](references/decorators.md#state) | [docs/state](https://stenciljs.com/docs/state) | 11 |
| 4 | `@Event()` & `@Listen()` | [`references/decorators.md#event-listen`](references/decorators.md#event-listen) | [docs/events](https://stenciljs.com/docs/events) | 15 |
| 5 | `@Method()` | [`references/decorators.md#method`](references/decorators.md#method) | [docs/methods](https://stenciljs.com/docs/methods) | 10 |
| 6 | Lifecycle hooks | [`references/lifecycle-host.md#lifecycle`](references/lifecycle-host.md#lifecycle) | [docs/component-lifecycle](https://stenciljs.com/docs/component-lifecycle) | 12 |
| 7 | `<Host>` & `@Element()` | [`references/lifecycle-host.md#host-element`](references/lifecycle-host.md#host-element) | [docs/host-element](https://stenciljs.com/docs/host-element) | 10 |
| 8 | JSX / Templating | [`references/jsx-styling.md#jsx`](references/jsx-styling.md#jsx) | [docs/templating-jsx](https://stenciljs.com/docs/templating-jsx) | 21 |
| 9 | CSS / Styling | [`references/jsx-styling.md#styling`](references/jsx-styling.md#styling) | [docs/styling](https://stenciljs.com/docs/styling) | 12 |
| 10 | Form-Associated | [`references/form-reactivity.md#form-associated`](references/form-reactivity.md#form-associated) | [docs/form-associated](https://stenciljs.com/docs/form-associated) | 11 |
| 11 | Reactive Data | [`references/form-reactivity.md#reactive`](references/form-reactivity.md#reactive) | [docs/reactive-data](https://stenciljs.com/docs/reactive-data) | 12 |
| 12 | Serialization | [`references/form-reactivity.md#serialization`](references/form-reactivity.md#serialization) | [docs/serialization](https://stenciljs.com/docs/serialization) | 9 |
| 13 | Functional Components | [`references/functional-api.md#functional`](references/functional-api.md#functional) | [docs/functional-components](https://stenciljs.com/docs/functional-components) | 11 |
| 14 | Public API | [`references/functional-api.md#api`](references/functional-api.md#api) | [docs/api](https://stenciljs.com/docs/api) | 14 |

**Top 25 anti-patterns with fixes:** [`references/anti-patterns.md`](references/anti-patterns.md).

---

## 2. Top-10 Must-Check Rules (Quick Audit)

When running a fast pass, verify these first — they catch the highest-impact issues.

| # | Rule | Severity | Detection |
|---|------|----------|-----------|
| Q1 | `@Component` has `tag: 'mud-<name>'` and `shadow: true` (never `scoped: true`) | Critical | Read TSX `@Component({...})` block |
| Q2 | All `@Method()` are `async` or return `Promise<T>` | Critical | Grep `@Method\(\)\s+\w+\([^)]*\)\s*:\s*(?!Promise)` |
| Q3 | All `@Event() corX!: EventEmitter<T>` are typed with non-empty `<T>` | High | Grep `EventEmitter(\W|$)` (no `<`) |
| Q4 | `@Event({ composed: true })` for events that must cross shadow boundaries (DEFAULT) | High | Manual: shadow:true component emits user-visible event without composed |
| Q5 | No direct mutation of `@State`/`@Prop` arrays/objects (`push`, `splice`, `obj.x = y`) | Critical | Grep `this\.\w+\.(push\|pop\|shift\|unshift\|splice)\(` |
| Q6 | Components with `setInterval`/`addEventListener`/`*Observer` have `disconnectedCallback()` cleanup | Critical | Pair grep: any of these without `disconnectedCallback` in same file |
| Q7 | No `this.host.classList.add/remove()` — use `<Host class={...}>` declarative pattern | High | Grep `this\.host\.classList\.(add\|remove)` (Anti-Pattern #26) |
| Q8 | Form-associated components have `@AttachInternals()`, `formResetCallback`, `formDisabledCallback`, `formStateRestoreCallback` | Critical | Read TSX for `formAssociated: true` then verify callbacks present |
| Q9 | `setFormValue(value, state)` called with BOTH args for restoration support (state = serializable form value) | High | Grep `internals\.setFormValue\(` and check arity |
| Q10 | All decoratori with `!` assertion: `@Element() host!`, `@Event() corX!`, `@AttachInternals() internals!` | Medium | Grep `@(Element\|Event\|AttachInternals)\([^)]*\)\s+\w+(?!!)` |

For full rule inventory, jump to the reference file matching the area you're auditing.

---

## 3. Verification Commands

Repo-specific commands that automate parts of this skill:

```bash
# TypeScript strict + ESLint (catches most decorator typing issues)
yarn lint

# Stencil compilation (catches @Method signatures, JSX errors, decorator misuse)
yarn build

# Token-level anti-patterns (caught by separate skill but related)
yarn tokens.validate
yarn tokens.lint

# Storybook a11y addon (catches ARIA + contrast — companion skill)
yarn sp.dev.watch   # then open http://localhost:6007
```

### Useful grep patterns

```bash
# @Method must be async (Stencil docs §methods rule 2)
rg "@Method\(\)\s+\w+\([^)]*\)\s*:\s*(?!Promise|void)" src/components --type ts

# Direct mutation = reactivity bug (Stencil docs §reactive-data rules 9-12)
rg "this\.\w+\.(push|pop|shift|unshift|splice)\(" src/components --type ts

# Imperative host class manipulation = Anti-Pattern #26
rg "this\.host\.classList\.(add|remove|toggle)" src/components --type ts

# Bare EventEmitter without type parameter
rg "EventEmitter[^<]" src/components --type ts | rg -v "EventEmitter<"

# innerHTML usage (CSP / XSS concern)
rg "innerHTML\s*=" src/components --type ts
```

---

## 4. Cross-References to Other Skills

| Topic | Canonical location | Why |
|-------|-------------------|-----|
| ARIA roles/states on `@Prop` | [`accessibility-compliance/SKILL.md`](../accessibility-compliance/SKILL.md) §4 | WCAG SC 4.1.2 — reflectarea state-ului ca ARIA atribute |
| Color contrast on focus rings (delegatesFocus) | [`accessibility-compliance/SKILL.md`](../accessibility-compliance/SKILL.md) §2 | WCAG SC 1.4.11 |
| `prefers-reduced-motion` (CSS) | [`accessibility-compliance/SKILL.md`](../accessibility-compliance/SKILL.md) §5 | WCAG SC 2.3.3 |
| Token validation (3-tier hierarchy) | [`token-creation/SKILL.md`](../token-creation/SKILL.md) | 3-tier rule precedes CSS audit |
| Component scaffolding | [`src/components/_agents/component-structure.md`](../../../src/components/_agents/component-structure.md) | Member order is the project-specific overlay |
| Anti-patterns (project-specific) | [`src/components/_agents/anti-patterns.md`](../../../src/components/_agents/anti-patterns.md) | 25 forbidden patterns; complements Stencil docs |

---

## 5. Verification Workflow

When implementing or modifying a component:

1. **Before coding** — read this Skill's Section 2 (Top-10) + relevant reference file for the decorator/feature you're using.
2. **During coding** — apply the rule tables from the reference file; cross-check with [`anti-patterns.md`](references/anti-patterns.md).
3. **Before commit** — `yarn lint && yarn build` must pass; grep checks from Section 3 should return zero hits.
4. **Before PR** — run `/audit-component @mud-<name> --deep` (invokes this skill + `accessibility-compliance`).
5. **Production gate** — `audit-production` (agent) runs the full 11-phase audit; Phase 1 delegates here for decorator/lifecycle checks.

---

## 6. Versioning

This skill is **aligned with Stencil 4.x** (as of repo `@stencil/core` version in `package.json`).

When Stencil ships a major version bump (5.x), review:
- New decorators (e.g. additional `@AttrDeserialize`/`@PropSerialize` patterns)
- Deprecated APIs (e.g. `componentShouldUpdate` semantics)
- New `@Component` options
- Updated JSX runtime (`jsxImportSource`)

Update reference files accordingly and bump the "Aligned with" line at the top of each reference.

---

## 7. Out-of-Scope (Not Covered Here)

- **Build configuration** — `stencil.config.ts` (output targets, plugins) — see [`stencil.config.ts`](../../../stencil.config.ts) directly
- **Testing infrastructure** — see `vitest.config.ts`, `vitest-setup.ts`, `_agents/e2e-testing.md`, audit-component Phase 5
- **Design tokens** — see `token-creation` skill
- **Figma extraction** — see `new-component` agent
- **WCAG 2.1 AA** — see `accessibility-compliance` skill (referenced where overlap)
- **Storybook configuration** — see `.storybook/main.mjs`, `_agents/storybook-stories.md`

---

## References (External)

- [Stencil Docs — Components index](https://stenciljs.com/docs/api)
- [Stencil Docs — Component](https://stenciljs.com/docs/component)
- [Stencil Docs — Properties](https://stenciljs.com/docs/properties)
- [Stencil Docs — State](https://stenciljs.com/docs/state)
- [Stencil Docs — Events](https://stenciljs.com/docs/events)
- [Stencil Docs — Methods](https://stenciljs.com/docs/methods)
- [Stencil Docs — Lifecycle](https://stenciljs.com/docs/component-lifecycle)
- [Stencil Docs — Host Element](https://stenciljs.com/docs/host-element)
- [Stencil Docs — Templating / JSX](https://stenciljs.com/docs/templating-jsx)
- [Stencil Docs — Styling](https://stenciljs.com/docs/styling)
- [Stencil Docs — Form-Associated](https://stenciljs.com/docs/form-associated)
- [Stencil Docs — Reactive Data](https://stenciljs.com/docs/reactive-data)
- [Stencil Docs — Serialization](https://stenciljs.com/docs/serialization)
- [Stencil Docs — AttachInternals](https://stenciljs.com/docs/attach-internals)
- [Stencil Docs — Functional Components](https://stenciljs.com/docs/functional-components)
