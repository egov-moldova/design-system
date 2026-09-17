# JSX & Styling

Load when writing or reviewing `render()` output or a component stylesheet. `enforced-by` grammar:
[`decorators.md`](decorators.md).

Sections:

- [JSX templating](#jsx)
- [CSS / Styling](#styling)

---

## JSX

Reference: <https://stenciljs.com/docs/templating-jsx>.

| #   | Rule                                                                                                               | enforced-by                                  |
| --- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| J1  | `h` is imported from `@stencil/core` (the `jsxFactory` in `tsconfig.json`)                                         | `tsc`                                        |
| J2  | Conditional render uses expressions: `{this.open && <div>…</div>}`                                                 | `manual`                                     |
| J3  | An element returned from a `.map()` callback carries a unique `key`                                                | `script-16:STENCIL-MAP-KEY`                  |
| J4  | A `key` on conditionally swapped siblings keeps each one's DOM and state apart                                     | `manual`                                     |
| J5  | Event handlers are class-field arrows (or inline arrows), so `this` stays bound                                    | `manual`                                     |
| J6  | Refs: `ref={el => (this.inputElement = el)}`                                                                       | `manual`                                     |
| J7  | `attr:` / `prop:` prefixes force an attribute or a property write (`<input prop:checked={…}>`); rare               | `manual`                                     |
| J8  | A JSX node stored in a variable is not rendered twice — use a render function                                      | `manual`                                     |
| J9  | No `innerHTML` assignment                                                                                          | `script-02:ANTIPATTERN-SECURITY-INNERHTML`   |
| J10 | No inline `style={…}`                                                                                              | `script-02:ANTIPATTERN-001-INLINE-STYLE`     |
| J11 | `class=`, never React's `className=`                                                                               | `script-02:ANTIPATTERN-023-CLASSNAME`        |
| J12 | `render()` is pure: no DOM writes, no state writes                                                                 | `manual`                                     |
| J13 | Icons render through `<mud-icon name="…">`, not inline `<svg>`                                                     | `script-02:ANTIPATTERN-021-RAW-SVG`          |

```tsx
// ✅ Keyed list
{this.items.map(item => (
  <li key={item.id}>{item.label}</li>
))}

// ✅ Class-field arrow keeps `this`
private handleClick = () => {
  this.mudClick.emit({ value: this.value });
};
render() {
  return <button onClick={this.handleClick}>Click</button>;
}

// ❌ Prototype method passed by reference — `this` is undefined when it runs
private handleClick() {
  this.mudClick.emit({ value: this.value });
}
render() {
  return <button onClick={this.handleClick}>Click</button>;
}

// ❌ One node rendered twice
const icon = <mud-icon name="alert" />;
return <Host>{icon}{icon}</Host>;
// ✅ Render function
const renderIcon = () => <mud-icon name="alert" />;
return <Host>{renderIcon()}{renderIcon()}</Host>;
```

### Slots

```tsx
<Host>
  <div class="header"><slot name="header" /></div>
  <div class="body"><slot /></div>
</Host>

// Fallback content
<slot name="icon">
  <mud-icon name="default-icon" />
</slot>
```

Slot APIs, validation of slotted content and slot detection:
[`slot-patterns.md`](../../../../src/components/_agents/slot-patterns.md). Visible content comes from
the slot, not from a prop rendered as its fallback (`script-02:ANTIPATTERN-026-PROP-CONTENT-SLOT-FALLBACK`).

---

## Styling

Reference: <https://stenciljs.com/docs/styling>.

| #    | Rule                                                                                                           | enforced-by                                               |
| ---- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| ST1  | The bare `:host { }` rule declares `display` (a custom element defaults to `inline`)                           | `script-02:ANTIPATTERN-HOST-DISPLAY`                      |
| ST2  | Custom properties meant for consumers are declared on `:host`                                                  | `manual`                                                  |
| ST3  | Attribute variants use `:host([variant='primary'])`; state classes use `:host(.is-open)`                        | `manual`                                                  |
| ST4  | `::slotted()` matches only top-level slotted elements, never default content rendered inside the shadow root   | `manual`                                                  |
| ST5  | `::part(name)` is an opt-in styling API; `exportparts` forwards a nested component's parts                     | `manual`                                                  |
| ST6  | No `!important`; a load-bearing exception carries `/* stylelint-disable-next-line declaration-no-important */` and a comment saying why | `stylelint:declaration-no-important`                      |
| ST7  | No `transition: all` / `transition-property: all` — list the properties                                        | `stylelint:declaration-property-value-disallowed-list`    |
| ST8  | `prefers-reduced-motion` is handled once, in `src/assets/css/base/html.css`                                     | `manual`                                                  |
| ST9  | Global tokens (`:root` in `dist/mud/tokens/*.css`) inherit into shadow roots                                    | `manual`                                                  |

Colour, spacing and token-tier rules are project rules, not Stencil rules: see
[`_agents/anti-patterns.md`](../../../../_agents/anti-patterns.md) and the
[`token-creation`](../../token-creation/SKILL.md) skill.

### Two patterns — pick one per component

#### Pattern A — slotted content (`mud-accordion-item` heading slots)

```css
:host([disabled]) slot[name='heading']::slotted(*) {
  pointer-events: none;
}
```

#### Pattern B — internal DOM (`mud-text-input`)

```css
:host {
  display: block;
}

:host(.is-focused:not(.is-disabled)) .control {
  border-color: var(--text-input-border-color-focus);
}
```

Don't style one conceptual element through both `::slotted()` and an internal class.

### Slot default content — dual selectors

`::slotted()` does not reach the fallback content inside `<slot>`. Style both with two selectors —
[`_agents/shadow-dom-patterns.md`](../../../../_agents/shadow-dom-patterns.md):

```css
::slotted(mud-icon) {
  --icon-color: var(--badge-icon-color);
}

.badge mud-icon {
  --icon-color: var(--badge-icon-color);
}
```

### `::part()`

Use only when consumers must restyle internal DOM and the custom-property API is not enough:

```tsx
<div class="input-wrapper" part="wrapper">
  <input part="input" />
</div>
```

```css
mud-text-input::part(input) {
  font-family: monospace;
}
```

### Nesting

Stylesheets compile with `postcss-nested` (`stencil-postcss.config.mjs`), so `&` nests:

```css
:host {
  display: inline-flex;

  &([disabled]) {
    opacity: 0.5;
  }
}
```

### Style modes

`styleUrls: { md: …, ios: … }` modes are not used; theming is CSS custom properties, with dark
values under `:root[data-theme="dark"]` (`tokens/generated/core.dark.tokens.css`).
