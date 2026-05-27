# Slot-First Content Refactor — Form-Input Family

**Status**: Backlog — needs design-system decision before scheduling
**Captured**: 2026-05-27
**Source**: cor-checkbox audit (this conversation)
**Detection rule**: `ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK` in [scripts/audit/02-stencil-antipatterns.mjs](../../scripts/audit/02-stencil-antipatterns.mjs)
**Canonical rule**: [src/components/_agents/slot-patterns.md](../../src/components/_agents/slot-patterns.md) → "No String Content Props as Slot Fallback"

---

## Problem

Reference atoms (`cor-button`, `cor-service-button`) treat visible content as **slot-only**. Their `label` prop, when declared, is used as `aria-label` for icon-only mode — never rendered as text.

The form-input family (17 components) does the opposite: declares a `label` (and/or `supportingText` / `placeholder`) `@Prop()` and renders it as the slot's fallback child via `<slot name="label">{labelText}</slot>`. Two ways to set the same content; the prop value can never live in light DOM, breaking light-DOM inspection, copy/paste, and `querySelector('[slot=label]')` discovery. Rich content needs the slot anyway.

The newly-added detector confirmed the gap is system-wide:

```
Total: 34 hits across 17 files
  src/components/cor-checkbox/cor-checkbox.tsx        lines [303, 308]
  src/components/cor-date-input/cor-date-input.tsx    lines [516, 578]
  src/components/cor-file-input/cor-file-input.tsx    lines [543, 577, 653]
  src/components/cor-file-item/cor-file-item.tsx      lines [119]
  src/components/cor-input-chip/cor-input-chip.tsx    lines [494, 577]
  src/components/cor-input/cor-input.tsx              lines [307, 373]
  src/components/cor-notification/cor-notification.tsx lines [174]
  src/components/cor-numeric-input/cor-numeric-input.tsx lines [532, 630]
  src/components/cor-phone-input/cor-phone-input.tsx  lines [865, 1012]
  src/components/cor-radio/cor-radio.tsx              lines [286, 292]
  src/components/cor-search-input-circular/cor-search-input-circular.tsx lines [412, 425, 508]
  src/components/cor-search-input-rectangular/cor-search-input-rectangular.tsx lines [410, 423, 506]
  src/components/cor-select-input/cor-select-input.tsx lines [483, 588]
  src/components/cor-switch/cor-switch.tsx            lines [226]
  src/components/cor-table/cor-table.tsx              lines [262, 274, 275]
  src/components/cor-tabs/cor-tabs.tsx                lines [275]
  src/components/cor-textarea/cor-textarea.tsx        lines [321, 376]
```

---

## Decision required (before scheduling)

The design system must pick ONE of:

### Option A — Refactor to match reference (slot-first everywhere)

- Remove `label` / `supportingText` / `placeholder` string props from all form components.
- Consumers slot content: `<cor-checkbox><span slot="label">Agree</span></cor-checkbox>`.
- Keep a separate ARIA-only prop (e.g. `accessibleName`) where required for icon-only or visually-hidden contexts.

**Pros**: codebase-wide consistency; matches platform `<label>` ergonomics; richer content for free; honest API surface.
**Cons**: breaking API across 17 components; verbose for the common simple-string case; all consumers + stories + tests need updating.

### Option B — Accept the form-input convention as a separate idiom

- Document that form inputs deviate intentionally because labels are almost always plain strings.
- Carve `cor-*input*`, `cor-*radio*`, `cor-checkbox`, `cor-switch`, `cor-textarea`, etc. out of the detector with an allow-list.
- Reference (button/service-button) keeps its slot-only convention.

**Pros**: zero breaking changes; matches Material UI / native form ergonomics.
**Cons**: two competing conventions in the same design system; the detector becomes weaker; the rule's existence becomes confusing.

### Option C — Hybrid, formally documented

- Allow content props on form inputs ONLY when the slot remains the override path (current state).
- Update slot-patterns.md to spell out the form-input carve-out as a first-class pattern, not a deviation.
- Detector severity for the form-input family: downgrade to `info` (visible signal, not a warning).

**Pros**: codifies what's already true; preserves both APIs; no breaking changes.
**Cons**: keeps the "two ways to set content" footgun for consumers.

---

## If Option A is chosen — execution sketch

Wave-based refactor; each wave is independently shippable.

| Wave | Components | Effort | Risk |
|------|-----------|--------|------|
| 1 | `cor-checkbox`, `cor-radio`, `cor-switch` (atomic form controls, lowest surface area) | S | Low — small consumer footprint inside the design system itself |
| 2 | `cor-input`, `cor-textarea`, `cor-numeric-input`, `cor-search-input-*` (text inputs — shared label/supporting/placeholder pattern) | M | Medium — likely widest external consumer use |
| 3 | `cor-date-input`, `cor-file-input`, `cor-phone-input`, `cor-select-input`, `cor-input-chip` (composite inputs) | M | Medium |
| 4 | `cor-file-item`, `cor-notification`, `cor-table`, `cor-tabs` (non-input but flagged) | M | Variable — inspect case-by-case |

Per component: drop string props, update render to plain `<slot>`, update stories (add slotted variants, remove arg controls), update tests, regenerate types via `yarn build`, run pixel-diff against Storybook to confirm visual parity.

---

## Out of scope for this captured item

- Token changes
- Behavioral changes (validity, events, focus)
- New components

---

## Pointers

- Detector: `ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK` in [02-stencil-antipatterns.mjs](../../scripts/audit/02-stencil-antipatterns.mjs)
- Pattern doc: [_agents/slot-patterns.md](../../src/components/_agents/slot-patterns.md)
- Audit Wave reference: [audit-component/SKILL.md](../../.claude/skills/audit-component/SKILL.md) Wave 2.8
- Reference impls to copy from: [cor-button](../../src/components/cor-button/cor-button.tsx), [cor-service-button](../../src/components/cor-service-button/cor-service-button.tsx)
- Conversation that surfaced this: cor-checkbox audit on 2026-05-27
