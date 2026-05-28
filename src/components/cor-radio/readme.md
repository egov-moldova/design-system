# cor-radio



<!-- Auto Generated Below -->


## Overview

Radio — single-select form input atom.

Pattern B (atom-interactive, form-associated): renders its own
`<input type="radio">` inside shadow DOM and paints the visual circle
with CSS. Form participation works via `formAssociated` +
`ElementInternals.setFormValue`. The component is the standalone radio
primitive; a future `cor-radio-group` molecule will manage roving focus
and `name`-based exclusivity across siblings.

## Properties

| Property         | Attribute         | Description                                                                                                                                                                                                                | Type                  | Default     |
| ---------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------- |
| `ariaLabel`      | `aria-label`      | Accessible name. Mirrors to the internal control's `aria-label` when no visible label is present.                                                                                                                          | `string \| undefined` | `undefined` |
| `ariaLabelledby` | `aria-labelledby` | ID of the element labelling the radio. Used when label content lives outside the component.                                                                                                                                | `string \| undefined` | `undefined` |
| `checked`        | `checked`         | Whether the radio is currently selected.                                                                                                                                                                                   | `boolean`             | `false`     |
| `disabled`       | `disabled`        | Disables interactivity. The internal control receives `aria-disabled` and the native `disabled` attribute.                                                                                                                 | `boolean`             | `false`     |
| `invalid`        | `invalid`         | Maps to Figma's "Error" state — border and selected dot turn red. Sets `aria-invalid` on the internal control.                                                                                                             | `boolean`             | `false`     |
| `label`          | `label`           | Accessible-name fallback. Used as `aria-label` on the internal input when no `label` slot is provided. Does NOT render visible text — use the `label` slot for that. Matches the `cor-button` / `cor-checkbox` convention. | `string \| undefined` | `undefined` |
| `name`           | `name`            | Form-control `name`. Used during form submission and for grouping radios.                                                                                                                                                  | `string \| undefined` | `undefined` |
| `readonly`       | `readonly`        | Renders the control read-only. It remains focusable but cannot be toggled.                                                                                                                                                 | `boolean`             | `false`     |
| `required`       | `required`        | Marks the field as mandatory. Sets `aria-required` on the internal control.                                                                                                                                                | `boolean`             | `false`     |
| `size`           | `size`            | Visual size rung.                                                                                                                                                                                                          | `"md" \| "sm"`        | `'md'`      |
| `supportingText` | `supporting-text` | Accessible-description fallback. Reserved for future use as `aria-describedby` source when no `supporting-text` slot is provided. Does NOT render visible text — use the `supporting-text` slot for that.                  | `string \| undefined` | `undefined` |
| `value`          | `value`           | Value submitted with the form when this radio is checked.                                                                                                                                                                  | `string \| undefined` | `undefined` |


## Events

| Event       | Description                                                                              | Type                             |
| ----------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| `corBlur`   | Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. | `CustomEvent<FocusEvent>`        |
| `corChange` | Fires whenever the checked state changes. `detail.checked` is the new state.             | `CustomEvent<RadioChangeDetail>` |
| `corFocus`  | Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. | `CustomEvent<FocusEvent>`        |


## Slots

| Slot                | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `"label"`           | Rich label content, replaces the `label` prop when present.            |
| `"supporting-text"` | Rich supporting text, replaces the `supportingText` prop when present. |


## Shadow Parts

| Part                | Description |
| ------------------- | ----------- |
| `"control"`         |             |
| `"dot"`             |             |
| `"label"`           |             |
| `"layout"`          |             |
| `"native"`          |             |
| `"supporting-text"` |             |
| `"text"`            |             |
| `"visual"`          |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
