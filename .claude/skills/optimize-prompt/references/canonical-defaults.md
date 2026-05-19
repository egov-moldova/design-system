# Canonical Defaults — DS Auto-Injection

These defaults are auto-injected by [`SKILL.md`](../SKILL.md) into every spec, so users do not repeat them per prompt. Each default has an opt-out flag for the rare case where a component genuinely diverges.

**Source of truth:** Verified against [`tokens/AGENTS.md`](../../../../tokens/AGENTS.md), [`src/components/AGENTS.md`](../../../../src/components/AGENTS.md), and [`_agents/anti-patterns.md`](../../../../_agents/anti-patterns.md).

---

## 1. Size scale

**Canonical:** `xs | sm | md | lg | xl` (5 trepte). Default `md` (or first available rung if `md` is intentionally omitted).

- Components emit only the rungs they use as enum members.
- Naming convention: enum named `<Component>Size` exported from `<component>.types.ts`.
- Token suffix uses the same rungs: `--cor-<component>-<element>-<property>-<size>` (e.g., `--cor-button-container-height-md`).

**Opt-out:** `--size-scale=single` — for atoms that have no size axis (some illustration-style atoms). Emit a single literal value, no enum.

**Rationale:** Legacy chaos (XS/SM/MD/LG vs SM/MD/LG vs XS/MD). Canonical 5-trepte gives one mental model; components opt out per-rung instead of inventing scales.

---

## 2. Focus ring

Always rendered on `:focus-visible`, **never** on `:focus`. Forbidden: `outline: none` without an explicit replacement (anti-pattern #14 in [`_agents/anti-patterns.md`](../../../../_agents/anti-patterns.md)).

```css
:focus-visible {
  outline: var(--cor-focus-ring-width, 2px) solid var(--cor-focus-ring-color, var(--color-border-focus-default));
  outline-offset: var(--cor-focus-ring-offset, 2px);
}
```

**Tokens** (canonical names — emit in Token Mapping when missing):
- `--cor-focus-ring-width`
- `--cor-focus-ring-color`
- `--cor-focus-ring-offset`

**Contrast:** Focus ring MUST achieve ≥ 3:1 against both adjacent surfaces (component + background). Verified in both light and dark mode.

**Opt-out:** none. Focus ring is non-negotiable for interactive archetypes.

---

## 3. Motion baseline

```
Standard transition:  150ms ease-in-out  (--motion-duration-fast, --motion-easing-standard)
Spinner / loader:     800ms linear infinite  (--motion-duration-spin, --motion-easing-spin)
Modal / drawer:       250ms ease-out         (--motion-duration-medium, --motion-easing-decelerate)
Tooltip / popover:    100ms ease-out         (--motion-duration-quick, --motion-easing-decelerate)
```

**Forbidden:**
- `transition: all` — list exact properties (anti-pattern #19)
- Hardcoded ms values in CSS — always token references
- Missing `prefers-reduced-motion` fallback (anti-pattern #20)

**Required for every animated/transitioned component:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Opt-out:** none. Reduced-motion is a WCAG SC 2.3.3 requirement.

---

## 4. Theme — light + dark

Every Token Mapping table has **both** a `light` and a `dark` column. When Figma extraction is unavailable (current state — OAuth offline), `dark` cell = `TBD`, never omitted.

**Reflected in audit:** [`audit-component` skill](../../audit-component/SKILL.md) verifies both modes via Storybook `mode: light` and `mode: dark` globals.

**Token wiring:** Light is default; dark is applied via `[data-mode="dark"]` selector on `<html>` per [`tokens/AGENTS.md`](../../../../tokens/AGENTS.md).

**Opt-out:** `--theme=light-only` — only for atoms that are theme-invariant (e.g., a brand-color illustration). Rare.

---

## 5. Accessibility baseline (WCAG 2.1 AA)

**Auto-emitted block in Acceptance Criteria** for every interactive archetype:

```
A11y (WCAG 2.1 AA, per src/components/AGENTS.md):
- Accessible name on every interactive element (SC 2.5.3, 4.1.2)
- Keyboard parity: Tab + Enter/Space + Escape (+ arrows for composite widgets) (SC 2.1.1, 2.4.3)
- :focus-visible ring ≥ 3:1 contrast against adjacent surfaces (SC 2.4.7, 1.4.11)
- Color contrast: 4.5:1 text, 3:1 UI components + focus rings (SC 1.4.3, 1.4.11)
- ARIA states reflect props: aria-disabled, aria-invalid, aria-expanded, aria-selected, aria-checked, aria-busy (SC 4.1.2)
- Honor prefers-reduced-motion (SC 2.3.3)
- Verified in BOTH light and dark mode
```

For **atom-visual** with status meaning (spinner, loader):

```
- role="status"
- aria-label (required prop) describing the loading context
- aria-live="polite"
- Honor prefers-reduced-motion
```

For **layout** archetype:

```
- Logical properties (padding-inline, margin-block) so RTL works automatically
- No fixed widths that break at 320 CSS px reflow (SC 1.4.10)
```

**Opt-out:** `--no-a11y-block` — only when emitting `tokens` mode. Never for component modes.

---

## 6. i18n posture

**LTR-first, RTL-deferred.** CSS uses logical properties (`padding-inline`, `margin-block`, `inset-inline-start`) so RTL works automatically when consumers flip `dir="rtl"`.

**Forbidden:**
- `padding-left` / `padding-right` / `margin-left` / `margin-right` in component CSS
- `text-align: left` / `text-align: right` — use `text-align: start` / `text-align: end`
- `left:` / `right:` positioning — use `inset-inline-start:` / `inset-inline-end:`

**Required note in spec:** "RTL not required for v1. Logical properties used throughout so RTL works automatically when consumer flips `dir=`."

**Opt-out:** none — logical properties are pure CSS and have no cost.

---

## 7. Event naming + payload

**Canonical event name format:** `cor<PascalComponent><PascalAction>`. Examples: `corClick`, `corChange`, `corOpen`, `corClose`, `corSelect`, `corDismiss`, `corNavigate`.

**Payload type MUST be exported** from `<component>.types.ts` as `<Component><Action>Detail`. Even single-value payloads use a typed interface, not raw `string` / `number`.

```ts
// cor-button.types.ts
export interface ButtonClickDetail {
  variant: ButtonVariant;
  size: ButtonSize;
}

// cor-button.tsx
@Event({ composed: true, bubbles: true }) corClick!: EventEmitter<ButtonClickDetail>;
```

**Opt-out:** native events (`click`, `change`, `input`) when the component is Pattern A and the slotted element bubbles them naturally. Document the choice in API → Events.

---

## 8. Form contract (form-associated only)

Every form-associated component MUST declare:

```ts
@Component({
  tag: 'cor-<name>',
  styleUrl: 'cor-<name>.css',
  shadow: true,
  formAssociated: true,  // ← mandatory
})
export class Cor<Name> {
  @AttachInternals() internals!: ElementInternals;

  @Prop({ reflect: true }) value: string = '';
  @Prop({ reflect: true }) name?: string;
  @Prop({ reflect: true }) disabled: boolean = false;
  @Prop({ reflect: true }) required: boolean = false;
  @Prop({ reflect: true }) invalid: boolean = false;

  formResetCallback() { /* reset to default */ }
  formDisabledCallback(disabled: boolean) { /* propagate */ }
  formStateRestoreCallback(state: string, mode: 'restore' | 'autocomplete') { /* restore */ }

  private updateValue(next: string) {
    this.value = next;
    this.internals.setFormValue(next, next);  // BOTH args, always
    this.updateValidity();
  }

  private updateValidity() { /* set validity based on required/invalid */ }
}
```

**Opt-out:** none. Form-associated archetype is defined by this contract.

---

## 9. Slot naming (canonical convention)

| Use | Slot name |
|---|---|
| Icon at the start | `leading-icon` |
| Icon at the end | `trailing-icon` |
| Helper text below input | `helper-text` |
| Label above input | `label-text` (when not using `label` prop) |
| Composition header | `header` |
| Composition footer | `footer` |
| Default content | unnamed `<slot />` |

**Forbidden:** `icon-left`, `icon-right`, `prefix`, `suffix`, `start`, `end` (legacy/non-canonical names). When redesigning legacy components that use these, emit a Migration block mapping old → new.

**Slot validation:** Cite a constant from [`src/legacy/shared.constants.ts`](../../../../src/legacy/shared.constants.ts) (e.g., `VALID_ICON_SLOT_TAGS`). If no fit exists, declare a new constant in `## New Constants` block — never inline a literal array of tags.

**Empty detection:** `slotchange` event + CSS class on host. **Never** a boolean prop `showIcon` — that's anti-pattern #12.

---

## 10. Host class management

**Required pattern:** declarative `<Host class={getHostClasses()}>` driven by a private `getHostClasses(): string` method.

**Forbidden:** `this.host.classList.add()` / `.remove()` / `.toggle()` in lifecycle hooks or event handlers (anti-pattern #26 in [`_agents/anti-patterns.md`](../../../../_agents/anti-patterns.md)).

```tsx
// ✓ Correct
render() {
  return <Host class={this.getHostClasses()}>...</Host>;
}
private getHostClasses(): string {
  return [
    this.isFocused && 'is-focused',
    this.hasValue && 'has-value',
    this.disabled && 'is-disabled',
  ].filter(Boolean).join(' ');
}
```

---

## 11. CSS variable naming

**Regex:** `^--cor-<component>(-<element>)?-<property>(-<state>)?$`

Components → kebab-case. Properties → kebab-case. State suffix LAST.

Examples:
- `--cor-button-container-height-md` (size as state)
- `--cor-button-primary-background-default` (variant + state)
- `--cor-button-primary-background-hover`
- `--cor-input-icon-color-focus`

**Forbidden:** ALL-CAPS, camelCase, or `--Button-...` (no `cor-` prefix). Validated by `yarn lint.tokens`.

---

## 12. Truncation default (for components with bounded text)

```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

Per-size `min-width` declared via token (e.g., `--cor-button-container-min-width-sm: 52px`). Per-size `max-width` typically not enforced; emit only if Figma defines one.

---

## 13. Shape primitives

- `rectangular` (default): `border-radius: var(--cor-radius-<size>)` per Figma scale
- `circular`: `aspect-ratio: 1; border-radius: 50%;`
- `pill`: `border-radius: 9999px;`

Components opt into shapes via `shape` prop (atom-interactive only typically).

---

## 14. Disabled state contract

When a component has `disabled: boolean`:
- `@Prop({ reflect: true }) disabled: boolean = false;`
- Render `aria-disabled={String(this.disabled)}` on host (per anti-pattern #12 corollary)
- CSS: `:host([disabled]) { pointer-events: none; cursor: not-allowed; opacity: <token>; }` — opacity via token, never hardcoded
- For form-associated: `disabled` also blocks `setFormValue` calls

---

## 15. Loading state contract (interactive components)

When a component has `loading: boolean`:
- `@Prop({ reflect: true }) loading: boolean = false;`
- Render `aria-busy={String(this.loading)}` on host
- Internally apply `disabled` semantics (`pointer-events: none`, click prevented)
- Render `cor-spinner` overlay with `color` matching the text token
- Visually hide the original content but keep it for screen readers (`opacity: 0` or `visibility: hidden` with width preserved)
