# CSS Architecture — Slotted & Internal DOM Patterns

## Scope

Two CSS patterns for Stencil Shadow DOM components and key CSS rules. **Read when writing component CSS.**

---

## Pattern A: Shadow DOM + Slotted Content (mud-button style)

Use when the component wraps user-provided elements via `<slot />`.

```css
:host { display: inline-block; }

::slotted(*) {
  font-family: var(--button-font-family, var(--font-family-sans));
  padding: var(--button-padding-block) var(--button-padding-inline);
  border-radius: var(--button-border-radius, var(--border-radius-8));
  min-height: var(--button-size, var(--spacing-48));
}

/* Size variants via :host attribute selector */
:host([size='sm']) {
  ::slotted(*) {
    font-size: var(--button-sm-font-size, var(--font-size-12));
    min-height: var(--button-sm-size, var(--spacing-32));
  }
}

/* Variant + state */
:host([variant='primary']) {
  ::slotted(*:not(:disabled)) {
    background-color: var(--button-primary-default-background);
    color: var(--button-primary-default-color);
  }
  ::slotted(*:hover:not(:disabled)) {
    background-color: var(--button-primary-hover-background);
  }
  ::slotted(*:active:not(:disabled)) { /* ... */ }
  ::slotted(*:focus-visible:not(:disabled)) { /* ... */ }
  ::slotted(button:disabled),
  ::slotted(a[aria-disabled='true']),
  ::slotted(input:disabled) { /* ... */ }
}
```

---

## Pattern B: Internal DOM (mud-input style)

Use when the component renders its own internal markup.

```css
:host {
  --input-height: var(--input-lg-height);
  --input-padding-inline: var(--input-lg-padding-inline);
  display: flex;
  flex-direction: column;
}

.container {
  min-height: var(--input-height);
  padding-inline: var(--input-padding-inline);
  border: var(--input-border-width) solid var(--input-border-color-default);
  border-radius: var(--input-border-radius);
}

/* Size overrides reassign host-level vars */
:host([size='md']) {
  --input-height: var(--input-md-height);
  --input-padding-inline: var(--input-md-padding-inline);
}

/* State via host class (set by @State() in TSX) */
:host(.is-focused) .container {
  border-color: var(--input-border-color-focus);
}
```

---

## Key CSS Rules

- **PostCSS nested syntax** enabled — use `&` and nesting
- **`:host([attr])` for props** reflected to attributes (`@Prop({ reflect: true })`)
- **`:host(.class)` for internal state** managed by `@State()` + `class={{ 'is-focused': this.isFocused }}`
- **`::slotted([slot='name'])` for named slots**, `::slotted(*)` for default slot
- **Transitions**: `transition: property 150ms ease-in-out` — keep consistent
- **`:host([disabled])`**: `pointer-events: none` on container, `cursor: not-allowed` on host
- **Never use `!important`** — Shadow DOM encapsulation prevents conflicts
- **Slot defaults need dual selectors** — see `_agents/shadow-dom-patterns.md` (root)

---

## Common CSS / Slot-Architecture Mistakes

| Skill Says | Correct |
| --- | --- |
| `:host(.button--primary) .button` | `:host([variant='primary']) ::slotted(*)` |
| `:host(.button--small) .button` | `:host([size='sm']) ::slotted(*)` |
| `.button` class selector | `::slotted(*)` for slot-based components |
| `class={{ 'button--variant': true }}` | `@Prop({ reflect: true })` + `:host([variant])` CSS |
| `ds-` prefix | Always **`mud-`** prefix |
| `transition: 250ms ease` | `transition: property 150ms ease-in-out` |
