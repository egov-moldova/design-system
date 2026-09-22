# mud-select



<!-- Auto Generated Below -->


## Overview

Select — single-select dropdown atom.

Matches the Figma `select-input` component (page "Select (Dropdown)",
node 411:23995) — kept here under the shorter `mud-select` name. Size rungs
follow Figma's own names: `medium` (40px) and `large` (48px).

Pattern B (atom-interactive, form-associated): renders a custom-styled
trigger button and a listbox popover inside shadow DOM. Form participation
works via `formAssociated` + `ElementInternals`. Shares the visual primitives
of `mud-text-input` (border, focus ring, label, helper / error text, sizes,
states) and adds a trailing chevron icon, listbox menu, and keyboard
navigation (ArrowUp/Down/Home/End/Enter/Escape) per the WAI-ARIA combobox
pattern.

## Properties

| Property      | Attribute     | Description                                                                                                                                                                                                                                                                                                                                                                                                                         | Type                          | Default     |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------- |
| `disabled`    | `disabled`    | Disables interactivity. The trigger receives `aria-disabled` and the hidden native `<select>` receives the `disabled` attribute.                                                                                                                                                                                                                                                                                                    | `boolean`                     | `false`     |
| `errorText`   | `error-text`  | Plain-text error message shown below the control when `invalid` is set. When present it replaces `helperText` and pairs with the error icon.                                                                                                                                                                                                                                                                                        | `string \| undefined`         | `undefined` |
| `helperText`  | `helper-text` | Plain-text helper / hint shown below the control.                                                                                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |
| `invalid`     | `invalid`     | Forces destructive visuals regardless of `variant`. Sets `aria-invalid`. Use together with `errorText` to surface the message.                                                                                                                                                                                                                                                                                                      | `boolean`                     | `false`     |
| `label`       | `label`       | Plain-text label. Use the `label` slot for richer content.                                                                                                                                                                                                                                                                                                                                                                          | `string \| undefined`         | `undefined` |
| `name`        | `name`        | Form-control `name`. Used during form submission.                                                                                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |
| `open`        | `open`        | Reflects the open state of the listbox popover. Read-only externally — use `mudOpen` / `mudClose` to react to changes.                                                                                                                                                                                                                                                                                                              | `boolean`                     | `false`     |
| `options`     | --            | <span style="color:red">**[DEPRECATED]**</span> Write the options as markup instead — `<option>`, `<optgroup>` and `<hr>` children, the same list a native `<select>` takes. Markup also expresses grouping and `selected`, which this array cannot. Still honoured, and still wins over markup when both are present, so existing callers keep working; scheduled for removal in the next major.<br/><br/>Declarative option list. | `SelectOption[] \| undefined` | `undefined` |
| `placeholder` | `placeholder` | Placeholder shown when no option is selected.                                                                                                                                                                                                                                                                                                                                                                                       | `string \| undefined`         | `undefined` |
| `readonly`    | `readonly`    | Renders the field read-only. The trigger remains focusable but the listbox cannot be opened.                                                                                                                                                                                                                                                                                                                                        | `boolean`                     | `false`     |
| `required`    | `required`    | Marks the field as mandatory. Adds a red asterisk to the label and sets `aria-required` on the trigger.                                                                                                                                                                                                                                                                                                                             | `boolean`                     | `false`     |
| `size`        | `size`        | Visual size rung.                                                                                                                                                                                                                                                                                                                                                                                                                   | `"large" \| "medium"`         | `'medium'`  |
| `value`       | `value`       | Selected value. Reflects to the host attribute. Set to empty string when no option is selected.                                                                                                                                                                                                                                                                                                                                     | `string`                      | `''`        |
| `variant`     | `variant`     | Color treatment. `destructive` is forced when `invalid` is set.                                                                                                                                                                                                                                                                                                                                                                     | `"default" \| "destructive"`  | `'default'` |


## Events

| Event       | Description                                                                     | Type                              |
| ----------- | ------------------------------------------------------------------------------- | --------------------------------- |
| `mudBlur`   | Fires when the trigger loses focus. The native `FocusEvent` is forwarded as-is. | `CustomEvent<FocusEvent>`         |
| `mudChange` | Fires when the selected value changes. `detail.value` is the new value.         | `CustomEvent<SelectChangeDetail>` |
| `mudClose`  | Fires when the listbox closes.                                                  | `CustomEvent<void>`               |
| `mudFocus`  | Fires when the trigger gains focus. The native `FocusEvent` is forwarded as-is. | `CustomEvent<FocusEvent>`         |
| `mudOpen`   | Fires when the listbox opens.                                                   | `CustomEvent<void>`               |


## Slots

| Slot           | Description                                                                                                                                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                | (default) The option list, written as the markup a native `<select>` takes: `<option>`, `<optgroup label="…">` and `<hr>`. Not rendered directly — each option's `value`, text, `disabled` and `selected` are read, and re-read whenever the markup changes. Used unless the deprecated `options` prop is set. |
| `"helper"`     | Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.                                                                                                                                                                                                        |
| `"icon-start"` | Leading `mud-icon` rendered inside the control row.                                                                                                                                                                                                                                                            |
| `"label"`      | Rich label content, replaces the `label` prop when present.                                                                                                                                                                                                                                                    |


## Shadow Parts

| Part              | Description |
| ----------------- | ----------- |
| `"control"`       |             |
| `"error"`         |             |
| `"helper"`        |             |
| `"label"`         |             |
| `"listbox"`       |             |
| `"required-mark"` |             |
| `"trigger"`       |             |


## Dependencies

### Depends on

- [mud-icon](../mud-icon)

### Graph
```mermaid
graph TD;
  mud-select --> mud-icon
  style mud-select fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
