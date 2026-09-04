# mud-search-input-rectangular



<!-- Auto Generated Below -->


## Overview

Search Input (rectangular) — single-line search-entry control.

Pattern B (atom-interactive, form-associated): renders its own
`<input type="search">` inside shadow DOM. Adds a leading magnifying-glass
icon and an optional trailing clear `×` button that appears whenever the
control carries a value. Visual primitives (border, focus ring, label,
helper / error, sizes, states) are shared with `mud-text-input`; specific
affordances (icon-start, icon-end-clear, submit-button) live in the
`--search-input-rectangular-*` token namespace.

Rectangular shape is the default sibling of `mud-search-input-circular`
(pill). The two ship as distinct components per the Figma component-set
separation in the Republic of Moldova Unified Design System library.

Optional axes per Figma master `933:29099`:
- `loading` — async query is in flight; a trailing spinner appears next to
  the value/placeholder and the control is announced as `aria-busy`.
- `with-button` — adds a trailing brand-blue submit button that fires
  `mudSearch` on click. Coexists with the clear button and the loading
  spinner.

## Properties

| Property       | Attribute      | Description                                                                                                                                                                                                                                                                                                                                                                                    | Type                         | Default     |
| -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------- |
| `ariaLabel`    | `aria-label`   | Accessible name. Mirrors to the internal control's `aria-label` when no visible label is present. Captured into `resolvedAriaLabel` on mount and the host attribute is stripped to avoid Stencil's auto-reflection loop.                                                                                                                                                                       | `string \| undefined`        | `undefined` |
| `autocomplete` | `autocomplete` | Native `autocomplete` attribute forwarded to the internal control.                                                                                                                                                                                                                                                                                                                             | `string \| undefined`        | `undefined` |
| `clearLabel`   | `clear-label`  | Accessible label for the trailing clear button. Defaults to Romanian "Șterge" per the institutional voice.                                                                                                                                                                                                                                                                                     | `string`                     | `'Șterge'`  |
| `clearable`    | `clearable`    | Shows the trailing clear `×` button when a value is present. Set to `false` to suppress the affordance entirely (useful for read-only or always-on filters).                                                                                                                                                                                                                                   | `boolean`                    | `true`      |
| `disabled`     | `disabled`     | Disables interactivity. The internal control receives `aria-disabled` and the native `disabled` attribute.                                                                                                                                                                                                                                                                                     | `boolean`                    | `false`     |
| `errorText`    | `error-text`   | Plain-text error message shown below the control when `invalid` is set. When present it replaces `helperText` and pairs with the error icon.                                                                                                                                                                                                                                                   | `string \| undefined`        | `undefined` |
| `helperText`   | `helper-text`  | Plain-text helper / hint shown below the control.                                                                                                                                                                                                                                                                                                                                              | `string \| undefined`        | `undefined` |
| `iconName`     | `icon-name`    | Icon name for the leading icon (rendered via the local SVG library). Override by providing an element to the `icon-start` slot.                                                                                                                                                                                                                                                                | `string`                     | `'search'`  |
| `invalid`      | `invalid`      | Forces destructive visuals regardless of `variant`. Sets `aria-invalid`. Use together with `errorText` to surface the message.                                                                                                                                                                                                                                                                 | `boolean`                    | `false`     |
| `label`        | `label`        | Plain-text label. Use the `label` slot for richer content.                                                                                                                                                                                                                                                                                                                                     | `string \| undefined`        | `undefined` |
| `loading`      | `loading`      | Indicates an in-flight query. Keeps the leading magnifying-glass icon as the role indicator and reveals a trailing brand-coloured `mud-spinner` next to the value; the clear `×` is suppressed while the query is in flight and the control is announced as `aria-busy`. The field stays focusable; emitting `mudSearch` while loading is the consumer's responsibility (typically debounced). | `boolean`                    | `false`     |
| `maxLength`    | `maxlength`    | Native `maxlength` constraint.                                                                                                                                                                                                                                                                                                                                                                 | `number \| undefined`        | `undefined` |
| `minLength`    | `minlength`    | Native `minlength` constraint.                                                                                                                                                                                                                                                                                                                                                                 | `number \| undefined`        | `undefined` |
| `name`         | `name`         | Form-control `name`. Used during form submission.                                                                                                                                                                                                                                                                                                                                              | `string \| undefined`        | `undefined` |
| `placeholder`  | `placeholder`  | Placeholder shown when the control is empty.                                                                                                                                                                                                                                                                                                                                                   | `string \| undefined`        | `undefined` |
| `readonly`     | `readonly`     | Renders the field read-only. The control remains focusable; the clear affordance is suppressed.                                                                                                                                                                                                                                                                                                | `boolean`                    | `false`     |
| `required`     | `required`     | Marks the field as mandatory. Adds a red asterisk to the label and sets `aria-required` on the internal control.                                                                                                                                                                                                                                                                               | `boolean`                    | `false`     |
| `size`         | `size`         | Visual size rung.                                                                                                                                                                                                                                                                                                                                                                              | `"lg" \| "md"`               | `'md'`      |
| `submitLabel`  | `submit-label` | Accessible label for the trailing submit button. Defaults to Romanian "Caută" per the institutional voice.                                                                                                                                                                                                                                                                                     | `string`                     | `'Caută'`   |
| `value`        | `value`        | Current value of the control. Reflects to the host attribute.                                                                                                                                                                                                                                                                                                                                  | `string`                     | `''`        |
| `variant`      | `variant`      | Color treatment. `destructive` is forced when `invalid` is set.                                                                                                                                                                                                                                                                                                                                | `"default" \| "destructive"` | `'default'` |
| `withButton`   | `with-button`  | Renders a trailing brand-blue submit button (the Figma "Button=True" axis). Clicking the button — or pressing Enter inside the input — dispatches `mudSearch` with the current value. When the field is empty or disabled, the button enters a disabled visual state and does not fire the event.                                                                                              | `boolean`                    | `false`     |


## Events

| Event       | Description                                                                                     | Type                                              |
| ----------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `mudBlur`   | Fires when the internal control loses focus.                                                    | `CustomEvent<FocusEvent>`                         |
| `mudChange` | Fires when the value is committed (typically on `blur`). `detail.value` is the committed value. | `CustomEvent<SearchInputRectangularChangeDetail>` |
| `mudClear`  | Fires when the value is cleared by the user (clear button or Escape key).                       | `CustomEvent<void>`                               |
| `mudFocus`  | Fires when the internal control gains focus.                                                    | `CustomEvent<FocusEvent>`                         |
| `mudInput`  | Fires on every keystroke. `detail.value` is the current control value.                          | `CustomEvent<SearchInputRectangularChangeDetail>` |
| `mudSearch` | Fires when the user submits the query (Enter key). `detail.value` is the submitted query.       | `CustomEvent<SearchInputRectangularSearchDetail>` |


## Slots

| Slot           | Description                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `"helper"`     | Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown. |
| `"icon-end"`   | Trailing slot. Suppresses the built-in clear `×` button when content is assigned here.                  |
| `"icon-start"` | Leading icon override. Defaults to `mud-icon[name="search"]`.                                           |
| `"label"`      | Rich label content, replaces the `label` prop when present.                                             |


## Shadow Parts

| Part              | Description |
| ----------------- | ----------- |
| `"clear-button"`  |             |
| `"control"`       |             |
| `"error"`         |             |
| `"helper"`        |             |
| `"label"`         |             |
| `"native"`        |             |
| `"required-mark"` |             |
| `"spinner"`       |             |
| `"submit-button"` |             |


## Dependencies

### Depends on

- [mud-icon](../mud-icon)
- [mud-spinner](../mud-spinner)

### Graph
```mermaid
graph TD;
  mud-search-input-rectangular --> mud-icon
  mud-search-input-rectangular --> mud-spinner
  style mud-search-input-rectangular fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
