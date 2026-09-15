# mud-numeric-input



<!-- Auto Generated Below -->


## Overview

Numeric Input — numeric-entry control with stacked step buttons.

Pattern B (atom-interactive, form-associated): renders its own `<input>`
inside shadow DOM and pairs it with a trailing stepper stack (chevron-up
over chevron-bottom). Shares the visual primitives of `mud-text-input` (border,
focus ring, label, helper / error, sizes, states) and adds a
`--numeric-input-stepper-*` token namespace for the increment / decrement
affordance.

Why `<input type="text" inputmode="decimal">` instead of
`<input type="number">`: native `type="number"` mixes parsing, locale, and
UI affordances in ways that interact poorly with `precision` rounding and
`min`/`max` clamping. The component delegates parsing + clamping to its own
logic and exposes `inputmode="decimal"` so mobile devices still surface the
numeric keypad.

## Properties

| Property         | Attribute         | Description                                                                                                                                                                                                                                                                                                 | Type                                      | Default     |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------- |
| `allowDecimal`   | `allow-decimal`   | Allow fractional input. When `false` the field is integer-only: typing a decimal separator is blocked and any fractional part is truncated on commit.                                                                                                                                                       | `boolean`                                 | `true`      |
| `allowNegative`  | `allow-negative`  | Allow negative input. When `false` the field is positive-only: typing `-` is blocked and negative entries are rejected on commit.                                                                                                                                                                           | `boolean`                                 | `true`      |
| `ariaLabel`      | `aria-label`      | Accessible name. Mirrors to the internal control's `aria-label` when no visible label is present. Setting `aria-label` directly on the host also works — captured on connect into `resolvedAriaLabel` and stripped to avoid Stencil's attribute-observer / render-loop antipattern.                         | `string \| undefined`                     | `undefined` |
| `ariaValuetext`  | `aria-valuetext`  | Human-readable value announcement for screen readers (e.g. `"5 lei"`). Maps to the native `aria-valuetext` on the spinbutton. Same capture-and-strip pattern as `ariaLabel`.                                                                                                                                | `string \| undefined`                     | `undefined` |
| `clearLabel`     | `clear-label`     | Accessible label for the clear button. Defaults to the Romanian "Șterge".                                                                                                                                                                                                                                   | `string`                                  | `'Șterge'`  |
| `clearable`      | `clearable`       | When `true`, renders a trailing clear (×) button while the field holds a value. Activating it clears the value and emits `mudChange` with `null`.                                                                                                                                                           | `boolean`                                 | `false`     |
| `decrementLabel` | `decrement-label` | Accessible label for the decrement button. Defaults to Romanian "Scade".                                                                                                                                                                                                                                    | `string`                                  | `'Scade'`   |
| `disabled`       | `disabled`        | Disables interactivity. The internal control receives `aria-disabled` and the native `disabled` attribute. Stepper buttons are also disabled.                                                                                                                                                               | `boolean`                                 | `false`     |
| `errorText`      | `error-text`      | Plain-text error message shown below the control when `invalid` is set. When present it replaces `helperText` and pairs with the error icon.                                                                                                                                                                | `string \| undefined`                     | `undefined` |
| `helperText`     | `helper-text`     | Plain-text helper / hint shown below the control.                                                                                                                                                                                                                                                           | `string \| undefined`                     | `undefined` |
| `incrementLabel` | `increment-label` | Accessible label for the increment button. Defaults to Romanian "Crește" per the institutional voice.                                                                                                                                                                                                       | `string`                                  | `'Crește'`  |
| `invalid`        | `invalid`         | Forces destructive visuals regardless of `variant`. Sets `aria-invalid`. Use together with `errorText` to surface the message.                                                                                                                                                                              | `boolean`                                 | `false`     |
| `label`          | `label`           | Plain-text label. Use the `label` slot for richer content.                                                                                                                                                                                                                                                  | `string \| undefined`                     | `undefined` |
| `loading`        | `loading`         | Loading state. When true the control becomes uninteractive and a brand `mud-spinner` replaces the trailing stepper stack. The host carries `aria-busy="true"` for assistive technologies.                                                                                                                   | `boolean`                                 | `false`     |
| `locale`         | `locale`          | BCP-47 locale used to group the displayed value with thousands separators and to parse grouped input back (e.g. `ro-MD` → `1.250,00`). When unset the value displays ungrouped. Grouping is applied while the field is not being edited; on focus the raw editable number is shown so the caret stays sane. | `string \| undefined`                     | `undefined` |
| `max`            | `max`             | Inclusive upper bound. Stepper-up disables at this value; manual entries above clamp on blur.                                                                                                                                                                                                               | `number \| undefined`                     | `undefined` |
| `maxLength`      | `maxlength`       | Maximum number of characters accepted by the field (native `maxlength`). When set, a character counter renders in the assistive row unless `show-counter` is `false`.                                                                                                                                       | `number \| undefined`                     | `undefined` |
| `min`            | `min`             | Inclusive lower bound. Stepper-down disables at this value; manual entries below clamp on blur.                                                                                                                                                                                                             | `number \| undefined`                     | `undefined` |
| `name`           | `name`            | Form-control `name`. Used during form submission.                                                                                                                                                                                                                                                           | `string \| undefined`                     | `undefined` |
| `placeholder`    | `placeholder`     | Placeholder shown when the control is empty.                                                                                                                                                                                                                                                                | `string \| undefined`                     | `undefined` |
| `precision`      | `precision`       | Decimal precision applied on blur (number of decimal places). When unset the value is preserved as typed (subject to clamping).                                                                                                                                                                             | `number \| undefined`                     | `undefined` |
| `readonly`       | `readonly`        | Renders the field read-only. The control remains focusable; steppers are suppressed.                                                                                                                                                                                                                        | `boolean`                                 | `false`     |
| `required`       | `required`        | Marks the field as mandatory. Adds a red asterisk to the label and sets `aria-required` on the internal control.                                                                                                                                                                                            | `boolean`                                 | `false`     |
| `showCounter`    | `show-counter`    | Force the character counter to show or hide. Auto-shows when `maxlength` is set; pass `false` to suppress it.                                                                                                                                                                                               | `boolean`                                 | `true`      |
| `showSteppers`   | `show-steppers`   | Show the trailing stacked stepper (chevron-up / chevron-bottom) buttons. Off by default per Figma master, which renders the canonical numeric input without steppers (suffix-only). Opt in via `show-steppers` for compact quantity / rating fields where stepper affordance is valuable.                   | `boolean`                                 | `false`     |
| `size`           | `size`            | Visual size rung.                                                                                                                                                                                                                                                                                           | `"lg" \| "md"`                            | `'md'`      |
| `step`           | `step`            | Increment / decrement amount applied by the stepper buttons and arrow keys.                                                                                                                                                                                                                                 | `number`                                  | `1`         |
| `value`          | `value`           | Current numeric value. `undefined` represents an empty field. Reflects to the host attribute when set.                                                                                                                                                                                                      | `number \| undefined`                     | `undefined` |
| `variant`        | `variant`         | Color treatment. `destructive` is forced when `invalid` is set. Numeric inputs ship 3 styles per Figma (no Warning) — invalid numeric values are typically out-of-range (Destructive) or confirmed-valid (Success); there is no in-between state worth a Warning tone.                                      | `"default" \| "destructive" \| "success"` | `'default'` |


## Events

| Event       | Description                                                                                                                   | Type                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `mudBlur`   | Fires when the internal control loses focus.                                                                                  | `CustomEvent<FocusEvent>`               |
| `mudChange` | Fires when the value is committed (blur / Enter / stepper). `detail.value` is the clamped, precision-rounded value or `null`. | `CustomEvent<NumericInputChangeDetail>` |
| `mudClear`  | Fires when the clear button empties the field. `detail.value` is `null`.                                                      | `CustomEvent<NumericInputChangeDetail>` |
| `mudError`  | Fires when validation rejects the current input (out-of-range, NaN).                                                          | `CustomEvent<NumericInputErrorDetail>`  |
| `mudFocus`  | Fires when the internal control gains focus.                                                                                  | `CustomEvent<FocusEvent>`               |
| `mudInput`  | Fires on every keystroke. `detail.value` is the parsed current value or `null`.                                               | `CustomEvent<NumericInputChangeDetail>` |
| `mudStep`   | Fires when a stepper button (or arrow key) bumps the value.                                                                   | `CustomEvent<NumericInputStepDetail>`   |


## Slots

| Slot           | Description                                                                                                                                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"helper"`     | Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.                                                                                                                                                                                                        |
| `"icon-start"` | Leading icon (a `mud-icon`, icon-leading variant) rendered before the prefix / value. Sized to the square icon box.                                                                                                                                                                                            |
| `"label"`      | Rich label content, replaces the `label` prop when present.                                                                                                                                                                                                                                                    |
| `"prefix"`     | Leading unit / currency symbol rendered before the value (e.g. `€`, `$`, `MDL`). Shares the suffix's text styling — auto-width rather than the fixed icon box, so multi-character symbols don't clip. Distinct from `icon-start`, mirroring the Figma master's separate `prefix` and `leadingIcon` properties. |
| `"suffix"`     | Trailing unit text rendered after the value (e.g. `lei`, `kg`). Sits before the stepper stack.                                                                                                                                                                                                                 |


## Shadow Parts

| Part              | Description |
| ----------------- | ----------- |
| `"clear-button"`  |             |
| `"control"`       |             |
| `"counter"`       |             |
| `"error"`         |             |
| `"helper"`        |             |
| `"label"`         |             |
| `"native"`        |             |
| `"prefix"`        |             |
| `"required-mark"` |             |
| `"spinner"`       |             |
| `"stepper"`       |             |
| `"stepper-down"`  |             |
| `"stepper-up"`    |             |
| `"suffix"`        |             |


## Dependencies

### Depends on

- [mud-spinner](../mud-spinner)
- [mud-icon](../mud-icon)

### Graph
```mermaid
graph TD;
  mud-numeric-input --> mud-spinner
  mud-numeric-input --> mud-icon
  style mud-numeric-input fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
