# cor-switch



<!-- Auto Generated Below -->


## Overview

Switch — binary on/off toggle atom (form-associated).

Pattern B (atom-interactive, form-associated): renders its own
`<input type="checkbox" role="switch">` inside shadow DOM and paints the
visual track + thumb with CSS. Implements the WAI-ARIA switch pattern, not
the checkbox pattern — `role="switch"` with `aria-checked="true|false"`.
Space toggles per native checkbox semantics; the role swap does not break
keyboard activation.

The visible track is 48 × 28px; the hit area expands to 32px on
pointer-devices and 40px on touch-devices (via `pointer: coarse`) per the
Figma "Target Sizes" spec, achieved with a `::before` pseudo-element so the
visual footprint stays untouched.

## Properties

| Property         | Attribute         | Description                                                                                                | Type                  | Default     |
| ---------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- | --------------------- | ----------- |
| `ariaLabel`      | `aria-label`      | Accessible name. Mirrors to the internal control's `aria-label` when no visible label is present.          | `string \| undefined` | `undefined` |
| `ariaLabelledby` | `aria-labelledby` | ID of the element labelling the switch. Used when label content lives outside the component.               | `string \| undefined` | `undefined` |
| `checked`        | `checked`         | Whether the switch is currently on.                                                                        | `boolean`             | `false`     |
| `disabled`       | `disabled`        | Disables interactivity. The internal control receives `aria-disabled` and the native `disabled` attribute. | `boolean`             | `false`     |
| `label`          | `label`           | Plain-text label. Use the `label` slot for richer content.                                                 | `string \| undefined` | `undefined` |
| `name`           | `name`            | Form-control `name`. Used during form submission.                                                          | `string \| undefined` | `undefined` |
| `required`       | `required`        | Marks the field as mandatory. Sets `aria-required` on the internal control.                                | `boolean`             | `false`     |
| `value`          | `value`           | Value submitted with the form when this switch is on.                                                      | `string \| undefined` | `undefined` |


## Events

| Event       | Description                                                                              | Type                              |
| ----------- | ---------------------------------------------------------------------------------------- | --------------------------------- |
| `corBlur`   | Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. | `CustomEvent<FocusEvent>`         |
| `corChange` | Fires whenever the checked state changes. `detail.checked` is the new state.             | `CustomEvent<SwitchChangeDetail>` |
| `corFocus`  | Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. | `CustomEvent<FocusEvent>`         |


## Slots

| Slot      | Description                                                 |
| --------- | ----------------------------------------------------------- |
| `"label"` | Rich label content, replaces the `label` prop when present. |


## Shadow Parts

| Part        | Description |
| ----------- | ----------- |
| `"control"` |             |
| `"label"`   |             |
| `"layout"`  |             |
| `"native"`  |             |
| `"text"`    |             |
| `"thumb"`   |             |
| `"track"`   |             |


## Dependencies

### Used by

 - [cor-cookie-banner](../cor-cookie-banner)

### Graph
```mermaid
graph TD;
  cor-cookie-banner --> cor-switch
  style cor-switch fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
