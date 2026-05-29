# Archetype Router — 7 Archetypes × Required Sections

Loaded by [`SKILL.md`](../SKILL.md) Step 1 once the archetype is classified. Each archetype declares its CSS Pattern (A/B/C), required sections, default props, and a11y baseline.

**Canonical archetype source:** [`_agents/reuse-architecture.md`](../../../../_agents/reuse-architecture.md) § "Architecture Decision Tree".

---

## 1. Decision tree — classify the archetype

```
Is this a form-associated element (input, select, textarea, checkbox, radio, switch)?
├─ YES → form-associated (Pattern C, formAssociated: true)
│
└─ NO → Has interaction (click, hover, focus state, keyboard)?
        ├─ NO + pure visual → atom-visual (Pattern B, internal DOM/SVG)
        │
        └─ NO + structural only (row/col/grid) → layout (Pattern B, no states)
        │
        └─ YES → Single interaction concern (one click target, no composition)?
                ├─ YES → atom-interactive (Pattern A — slot user-provided control)
                │
                └─ NO → Composes atoms?
                        ├─ Static composition (avatar, breadcrumb, label) → molecule (Pattern B)
                        ├─ Interactive composition (tab-button, accordion-header) → molecule-interactive (Pattern B with @State)
                        └─ Complex w/ internal state (modal, table, dropdown) → organism (Pattern B + @State + @Listen)
```

---

## 2. Per-archetype profile

### 2.1 atom-visual

> **Examples in legacy:** `mud-spinner`, `mud-badge`, `mud-icon`, `mud-skeleton`, `mud-separator`, `mud-divider`, `mud-illustration`, `mud-loading-*`.

**CSS Pattern:** B (internal DOM/SVG). **NO slots** by default.

**Required sections (`--mode=new` or `--mode=redesign`):**
- Goal (Figma node IDs, file/dir, atomic level)
- Architecture Constraints (CSS Pattern B explicit, no slots, internal SVG/DOM)
- API (size/color/variant props only)
- Behavior (animation spec if motion present; otherwise omit)
- Token Mapping (state × size × {bg, fg, border} as applicable)
- Acceptance Criteria (visual + a11y + stories)
- Stories (Default, AllSizes, AllVariants — no States since no interaction)

**Default API skeleton:**
```ts
@Prop({ reflect: true }) size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
@Prop({ reflect: true }) variant: <VariantEnum> = '<default>';
// optional:
@Prop() label?: string;  // accessible name for status indicators
```

**A11y baseline:**
- Status/loading indicators: `role="status"`, `aria-label`, `aria-live="polite"`
- Decorative: `aria-hidden="true"`
- Animation: `@media (prefers-reduced-motion: reduce)` MUST disable

**Stories required:** Default, AllSizes, AllVariants. No States story (no interactivity).

---

### 2.2 atom-interactive

> **Examples in legacy:** `mud-button`, `mud-link`, `mud-chip`.

**CSS Pattern:** A (slot-based — user passes the interactive root element). Style with `::slotted(*)` + `:host([variant])` + `:host([size])`.

**Required sections:**
- Goal
- Architecture Constraints (CSS Pattern A explicit, slot validation constant cited)
- API (variant, size, disabled, loading, shape — props only; slots described separately)
- Slots (default + named; empty-detection via `slotchange`)
- Behavior (state transitions, loading strategy, keyboard parity)
- Token Mapping (variant × state × {bg, fg, border} for all interactive states)
- Acceptance Criteria
- Stories (Default, AllVariants, AllSizes, States, AllStatesTable)

**Default API skeleton:**
```ts
@Prop({ reflect: true }) variant: <VariantEnum> = '<default>';
@Prop({ reflect: true }) size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
@Prop({ reflect: true }) disabled: boolean = false;
@Prop({ reflect: true }) loading: boolean = false;
@Prop({ reflect: true }) shape?: 'rectangular' | 'circular' = 'rectangular';
```

**Required slots:** default (interactive root), `leading-icon`, `trailing-icon` (canonical convention — NEVER `icon-left`/`icon-right`).

**Slot validation:** cite or extend constants from [`src/legacy/shared.constants.ts`](../../../../src/legacy/shared.constants.ts). Examples: `VALID_ICON_SLOT_TAGS`.

**A11y baseline:**
- Native `<button>`/`<a>` slotted; never custom click on `<div>`
- `:focus-visible` ring (canonical token from `canonical-defaults.md`)
- Loading: `aria-busy="true"` + `disabled=true` + `pointer-events: none`
- Disabled: `aria-disabled={String(this.disabled)}`
- Icon-only variant: `aria-label` mandatory; emit dev warning if missing

**Stories required:** Default, AllVariants, AllSizes, States, AllStatesTable (variant × state matrix).

---

### 2.3 form-associated

> **Examples in legacy:** `mud-input`, `mud-textarea`, `mud-select`, `mud-checkbox`, `mud-toggle`, `mud-radio-button`, `mud-datepicker`.

**CSS Pattern:** C (internal DOM, form-associated). MUST declare `formAssociated: true` and `@AttachInternals()`.

**Required sections:**
- Goal
- Architecture Constraints (Pattern C, `formAssociated: true`, all 4 form callbacks)
- API (value, name, disabled, required, invalid, size, helper-text — props + the form contract)
- Slots (icon-leading, icon-trailing, helper-text where applicable; validation constants cited)
- Behavior (validation pipeline, focus management, keyboard, ARIA)
- Token Mapping (state × {bg, fg, border, focus-ring} including invalid/disabled)
- Acceptance Criteria
- Stories (Default, AllSizes, States, Invalid, Skeleton if applicable)

**Default API skeleton:**
```ts
@Prop({ reflect: true }) value: string = '';
@Prop({ reflect: true }) name?: string;
@Prop({ reflect: true }) disabled: boolean = false;
@Prop({ reflect: true }) required: boolean = false;
@Prop({ reflect: true }) invalid: boolean = false;
@Prop({ reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
@Prop() helperText?: string;
@Prop() label?: string;
@Prop() placeholder?: string;
@State() isFocused: boolean = false;
@State() hasValue: boolean = false;
@AttachInternals() internals!: ElementInternals;
@Event({ composed: true, bubbles: true }) corChange!: EventEmitter<string>;
@Event({ composed: true, bubbles: true }) corInput!: EventEmitter<string>;
```

**Form callbacks MUST be present:**
- `formAssociated: true` in `@Component`
- `formResetCallback()` — reset to default
- `formDisabledCallback(disabled: boolean)` — propagate from `<form>`
- `formStateRestoreCallback(state, mode)` — restore on bfcache
- `setFormValue(value, state)` — both args, called on every change
- `updateValidity()` — called after every validation pipeline run

**A11y baseline:**
- `<label>` association via `for`+`id` OR `aria-labelledby`
- Errors: `aria-invalid="true"` + `aria-describedby` pointing to helper-text
- `:focus-visible` ring; never `:focus` alone
- Keyboard: native input semantics preserved

**Stories required:** Default, AllSizes, States (default/hover/focus/disabled/invalid/loading-skeleton), Invalid, Required, WithHelperText.

---

### 2.4 molecule

> **Examples in legacy:** `mud-avatar`, `mud-breadcrumbs`, `mud-pagination-item`, `mud-label`, `mud-modal-header`.

**CSS Pattern:** B (internal DOM, owns markup). Composes other `mud-*` atoms via internal `<mud-icon>` / `<mud-spinner>` calls, NOT user slots.

**Required sections:**
- Goal
- Architecture Constraints (Pattern B, list reused atoms)
- API (variant, size, content props)
- Slots (only if exposing content escape hatches — typically minimal)
- Behavior (composition logic, optional state)
- Token Mapping
- Acceptance Criteria
- Stories (Default, AllVariants, AllSizes)

**Reuse declaration mandatory:** Goal section must list which atoms are consumed (e.g., "consumes `mud-icon`, `mud-badge`").

**A11y baseline:** Inherits per-atom rules + the composition's accessible name (group label, etc.).

---

### 2.5 molecule-interactive

> **Examples in legacy:** `mud-tab-button`, `mud-accordion-header`, `mud-dropdown-item`.

**CSS Pattern:** B with `@State()` for interaction state.

**Required sections:** As `molecule` + Behavior section MUST cover state transitions + keyboard interactions.

**Default skeleton:**
```ts
@Prop({ reflect: true }) selected: boolean = false;
@Prop({ reflect: true }) disabled: boolean = false;
@State() isHovered: boolean = false;  // internal only — never @Prop
@Event() corSelect!: EventEmitter<{ value: string }>;
```

**A11y baseline:** ARIA states reflect props (`aria-selected`, `aria-expanded`, `aria-disabled`); keyboard arrows when part of a composite widget.

**Stories required:** Default, AllVariants, States, Selected, Disabled.

---

### 2.6 organism

> **Examples in legacy:** `mud-modal`, `mud-table`, `mud-datepicker`, `mud-dropdown`, `mud-accordion`, `mud-tabs`, `mud-pagination`, `mud-calendar`, `mud-tooltip`.

**CSS Pattern:** B with extensive `@State()` + `@Listen()` + `@Method()` for orchestrated child components.

**Required sections:**
- Goal
- Architecture Constraints (Pattern B, internal state list, public methods, sub-components composed)
- API (controlled vs uncontrolled props, events, public methods)
- Slots (typically composition slots like `header`, `body`, `footer`)
- Behavior (full state machine, keyboard interaction, focus management, escape/click-outside)
- Token Mapping
- Acceptance Criteria
- Stories (Default, Open, Closed, Loading, Empty, WithLongContent, Keyboard interaction docs)

**Control model decision MANDATORY in Architecture:**
- Fully controlled (consumer drives all state)
- Partially controlled (open state internal, content external)
- Uncontrolled (self-contained)

**A11y baseline:** Full ARIA pattern (dialog, listbox, menu, tablist per WAI-ARIA Authoring Practices); focus trap for dialogs; restore focus on close; `aria-expanded`/`aria-controls` for disclosure.

**Stories required:** Default + per state + Keyboard scenarios + Empty + Loading + Error.

---

### 2.7 layout

> **Examples in legacy:** `mud-row`, `mud-column`, `mud-grid`.

**CSS Pattern:** B (internal DOM, structural only).

**Required sections:**
- Goal
- API (gap, padding, alignment props mapped to spacing tokens)
- Acceptance Criteria (responsive behavior, RTL via logical properties)
- Stories (Default, gap variations, nested)

**No state, no events, no a11y states.** Forwarding ARIA roles only if consumer specifies.

**Many `layout` components in `src/legacy/` may NOT need redesign** — flag for `--mode=skip` and ask user.

---

## 3. Section gating matrix

| Section | atom-visual | atom-interactive | form-associated | molecule | molecule-interactive | organism | layout |
|---|---|---|---|---|---|---|---|
| Goal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scope | optional | optional | optional | optional | optional | ✓ | optional |
| Architecture Constraints | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | minimal |
| API | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | minimal |
| Slots | ✗ | ✓ | ✓ (icon/helper) | optional | optional | ✓ | ✗ |
| Behavior | only if animation | ✓ | ✓ | optional | ✓ | ✓ | ✗ |
| Token Mapping | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | minimal |
| Acceptance Criteria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Stories | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Build Order | only if dep | only if dep | only if dep | ✓ | ✓ | ✓ | ✗ |
| Migration | only redesign | only redesign | only redesign | only redesign | only redesign | only redesign | only redesign |

---

## 4. Common archetype-misroute red flags

- "spinner with slots" → atom-visual misrouted as atom-interactive — force Pattern B
- "input but no `<input>` inside" → form-associated misrouted as atom-interactive — force Pattern C
- "card that holds tabs and content" → organism misrouted as molecule — escalate
- "icon with onClick" → atom-interactive (it's a button), not atom-visual
- "row with gap prop only" → layout, not molecule

When in doubt: emit a `## Archetype Decision` block listing the routing + one-line rationale so the user can override with `--archetype=<level>`.
