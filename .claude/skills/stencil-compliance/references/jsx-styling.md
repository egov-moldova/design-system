# JSX & Styling

**Aligned with:** Stencil 4.x.

Sections:
- [JSX templating](#jsx)
- [CSS / Styling](#styling)

---

## JSX

Reference: <https://stenciljs.com/docs/templating-jsx>.

### Core rules

| # | Rule | Verification |
|---|------|--------------|
| J1 | `h()` factory imported from `@stencil/core` (TS jsxFactory: 'h') | Read tsconfig + imports |
| J2 | `Fragment` from `@stencil/core` for grouping without wrapper | Read imports |
| J3 | Conditional render via JS expressions: `{this.open && <div>...</div>}` | Manual review |
| J4 | Lists rendered with `.map(...)` MUST have unique `key` attribute | Grep `\.map\(.*=>\s*<` and verify `key=` |
| J5 | `key` attribute also recommended for conditional swaps (preserves lifecycle) | Manual review |
| J6 | Event handlers MUST be arrow functions OR class field arrows to preserve `this` binding | Grep `on\w+=\{(?!this\.|\(\))` |
| J7 | Refs: `ref={(el) => this.x = el}` — UNSET in `disconnectedCallback` if you need cleanup | Manual review |
| J8 | `attr:` prefix forces attribute write: `<div attr:role="button">` (rare) | Manual review |
| J9 | `prop:` prefix forces property write: `<input prop:checked={this.checked}>` (rare; useful for native form elements) | Manual review |
| J10 | DON'T reuse JSX variable instances multiple times — create unique nodes or factory function | Manual review |
| J11 | `innerHTML` attribute = security risk (XSS) — only with sanitized input | Grep `innerHTML\s*=` |
| J12 | Multiple JSX root elements wrapped in `<Host>` or `<Fragment>` — NEVER return array of siblings directly (legal but discouraged) | Manual review |
| J13 | Comments inside JSX: `{/* comment */}` — not `<!-- -->` | Manual review |
| J14 | Boolean attributes: `<button disabled={this.disabled}>` (Stencil handles toggle) | Manual review |
| J15 | NEVER use inline `style={{ ... }}` — use CSS classes + custom properties (Anti-Pattern #2) | Grep `style=\{` |
| J16 | Use `class={...}` (NOT React's `className`) — Stencil follows native | Grep `className=` should be empty |
| J17 | `tabindex` lowercase (HTML), `tabIndex` camelCase in JSX both work; prefer `tabindex` for consistency with HTML | Manual review |
| J18 | `aria-*` attributes lowercase with dash (`aria-label`, `aria-disabled`) — JSX accepts both but kebab-case is standard | Manual review |
| J19 | Stencil auto-keys non-conditional JSX nodes; manual `key` needed for conditional branches | Manual review |
| J20 | TS strict: typed props on JSX components — `<cor-button variant={ButtonVariant.PRIMARY}>` | Manual review |
| J21 | NO direct DOM mutations from render — render is PURE | Anti-Pattern #1 |

### Examples

```tsx
// ✅ Conditional render
render() {
  return (
    <Host>
      {this.label && <label>{this.label}</label>}
      <input ref={(el) => this.inputElement = el} />
      {this.error && <span role="alert">{this.error}</span>}
    </Host>
  );
}

// ✅ List with keys
render() {
  return (
    <Host>
      <ul>
        {this.items.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </Host>
  );
}

// ✅ Arrow handler preserves `this`
private handleClick = (e: MouseEvent) => {
  this.corClick.emit({ value: this.value });
};

render() {
  return <button onClick={this.handleClick}>Click</button>;
}

// ❌ Method reference loses `this`
render() {
  return <button onClick={this.handleClick}>Click</button>;
  // works IF handleClick is class-field arrow; FAILS if it's a regular method
}

// ❌ Inline style
render() {
  return <Host style={{ color: 'red' }}>...</Host>;  // ← forbidden
}

// ❌ Reused JSX variable
const icon = <cor-icon name="alert" />;
return <Host>{icon}{icon}</Host>;  // ← second instance breaks lifecycle
// FIX: factory function
const renderIcon = () => <cor-icon name="alert" />;
return <Host>{renderIcon()}{renderIcon()}</Host>;
```

### Slots in JSX

```tsx
// Default slot
<Host>
  <slot />
</Host>

// Named slots
<Host>
  <div class="header"><slot name="header" /></div>
  <div class="body"><slot /></div>
</Host>

// Slot fallback content
<slot name="icon">
  <cor-icon name="default-icon" />
</slot>

// Slot detection (componentDidLoad)
componentDidLoad() {
  this.hasFooter = this.host.querySelectorAll('[slot=footer]').length > 0;
}
```

### Project-specific extras

- **NO `className=`** — Stencil uses native `class=` (React's `className` is JSX-specific and not the Stencil convention).
- **NO inline `style={{ }}`** — Anti-Pattern #2. Use CSS classes + `:host([attr])` selectors + CSS variables.
- **All slot-accepting components MUST validate slotted content** via `invalidSlottedTag()` utility — see `src/utils/invalid-slotted-tag` and `src/components/_agents/slot-patterns.md`.
- **Carbon-style icons** — use `<cor-icon name="...">`, NEVER inline SVG. See `carbon-icons` skill.

---

## Styling

Reference: <https://stenciljs.com/docs/styling>.

### Shadow DOM CSS rules

| # | Rule | Verification |
|---|------|--------------|
| ST1 | Every component MUST have `:host { display: ... }` (default is inline; usually wrong) | Grep `:host\s*\{` and verify `display:` |
| ST2 | Component-exposed CSS variables MUST be declared on `:host` for consumer access | Read CSS |
| ST3 | Use `:host([variant=primary])` for attribute-driven variants | Manual review |
| ST4 | Use `:host(.is-open)` for state-driven classes (set via `getHostClasses()`) | Manual review |
| ST5 | `::slotted(*)` for styling slot CHILDREN (Pattern A) | Manual review |
| ST6 | `::slotted()` selector has limitations: only first-level slotted descendants | Conceptual |
| ST7 | `::part(name)` exposes internal elements to consumer styling — opt-in API | Manual review |
| ST8 | `exportparts="inner-part: outer-part"` forwards parts through compound components | Manual review |
| ST9 | NEVER use `!important` without a comment explaining why | Grep `!important` |
| ST10 | NEVER use raw hex colors — always tokens | Grep `#[0-9a-fA-F]{3,8}` |
| ST11 | NEVER use raw `px` values for spacing/sizing — always tokens (except `0px`, `1px` for borders) | Grep `\d+px` |
| ST12 | `transition: 150ms ease-in-out <property>` — NEVER `transition: all` (perf + a11y) | Grep `transition:\s*all` |
| ST13 | `prefers-reduced-motion` handled globally in `src/assets/css/base/html.css` — don't duplicate | Manual review |
| ST14 | Global tokens (defined on `:root` in `dist/design-system/tokens/*.css`) penetrate shadow DOM | Conceptual |

### Two architectural patterns

#### Pattern A — Slot-based (e.g. `cor-button`)

```css
:host {
  display: inline-flex;
  /* host-level layout + variables */
}

:host([variant='primary']) {
  --button-bg: var(--color-background-brand-default);
}

::slotted(button),
::slotted(a) {
  background: var(--button-bg);
  padding: var(--button-padding-block) var(--button-padding-inline);
  color: var(--button-color);
}

::slotted(button:hover:not(:disabled)),
::slotted(a:hover:not([aria-disabled='true'])) {
  background: var(--button-bg-hover);
}
```

#### Pattern B — Internal DOM (e.g. `cor-input`)

```css
:host {
  display: block;
  --input-height: var(--input-md-height);
}

:host([size='lg']) {
  --input-height: var(--input-lg-height);
}

.input-wrapper {
  height: var(--input-height);
  border: 1px solid var(--input-border-color);
}

:host(.is-focused) .input-wrapper {
  border-color: var(--input-border-color-focus);
}
```

**Rule**: pick ONE pattern per component — don't mix `::slotted()` with internal `.class` selectors that style the same conceptual element.

### CSS Variables

| # | Rule | Verification |
|---|------|--------------|
| V1 | Component-specific tokens: `--{component}-{element}-{property}-{scale/state}` | Token-creation skill |
| V2 | Always fall back to semantic tokens: `var(--button-color, var(--color-text-base-default))` | Read CSS |
| V3 | Define variable on `:host` for external override (`--button-color` available via component selector) | Manual review |
| V4 | Consume but DON'T define `--color-*` palette tokens — palette is global | Manual review |
| V5 | Use `:host([size='md']) { --button-size: var(--button-md-size); }` to remap sized vars | Manual review |

### `::part()` exposure (advanced)

Use ONLY when consumer needs to restyle internal DOM AND token API isn't enough:

```css
/* Component CSS */
.input-wrapper { ... }
.error-message { color: var(--color-text-error); }
```

```tsx
// Component TSX
<Host>
  <div class="input-wrapper" part="wrapper">
    <input part="input" />
  </div>
  <span class="error-message" part="error">{this.error}</span>
</Host>
```

```css
/* Consumer CSS */
cor-input::part(input) { font-family: monospace; }
cor-input::part(error) { font-style: italic; }
```

For compound components (e.g. `cor-input` wrapping nested `cor-icon`), use `exportparts`:

```tsx
<cor-icon name="alert" exportparts="svg: icon-svg" />
```

Then consumer can target: `cor-input::part(icon-svg)`.

### Style Modes (Stencil feature — N/A for this project)

Stencil supports `styleUrls: { md: '...md.css', ios: '...ios.css' }` for multi-mode theming. The repo uses CSS-variable theming via `data-theme="dark"` instead. Don't introduce style modes without team consensus.

### Project-specific extras

- **`::slotted(*)`** is the canonical wildcard slot selector — use `::slotted(button)` for tag-specific styling.
- **Dual selector for slot defaults** — see `_agents/shadow-dom-patterns.md`:
  ```css
  ::slotted(*),
  > * {
    /* style applies to slotted content AND direct children fallback */
  }
  ```
- **PostCSS nesting** is enabled (`@stencil/postcss` with nested plugin). Use `&` for nesting:
  ```css
  :host {
    display: inline-flex;

    &([disabled]) {
      opacity: 0.5;
      pointer-events: none;
    }
  }
  ```
- **Tokens** consumed via `var(--token-name, var(--fallback))` — see `token-creation` skill for the 3-tier hierarchy.

### Anti-patterns

```css
/* ❌ Hardcoded colors */
.button { background: #1976d2; }

/* ❌ Hardcoded spacing */
.button { padding: 12px 16px; }

/* ❌ transition: all */
.button { transition: all 250ms; }

/* ❌ !important without justification */
.button { color: red !important; }

/* ❌ Palette token in component CSS */
.button { background: var(--palette-blue-500); }
/* ✅ Right — semantic token */
.button { background: var(--color-background-brand-default); }
```
