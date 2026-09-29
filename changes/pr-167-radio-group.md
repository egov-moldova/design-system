---
type: Added
title: `mud-radio-group`, and an error message on `mud-radio`
---

`mud-radio-group` wraps `mud-radio` children in a `role="radiogroup"` with one Tab stop: the
arrow keys move the selection and focus, wrap around and skip disabled options. It takes a
visible `label`, `name`, `value`, `size`, `orientation` (`vertical` or `horizontal`),
`disabled`, `invalid`, `required` and `error-text`, and emits `mudChange` once per selection with
`{ value }`.

`mud-radio` takes an `error-text`, shown under the label and supporting text while `invalid` is
set (Figma radio-label Error) and wired to the input through `aria-describedby`.
