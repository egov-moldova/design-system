---
type: Changed
title: `mud-checkbox`, `mud-radio` and `mud-switch` render `label` visibly
breaking: true
---

`label` (and `supportingText` on `mud-checkbox` and `mud-radio`) were an accessible name only: `<mud-checkbox
label="Accept the terms">` showed a bare box, unlike every other form field. They now render as
visible text, named through `aria-labelledby` and described through `aria-describedby`; a filled
`label` / `supporting-text` slot still replaces them. The host's native `aria-label` overrides
the accessible name. `mud-radio` and `mud-switch` no longer copy slotted text onto their input's
`aria-label`.

**Migration:** anyone passing `label` alone now gets visible text, which moves layout. For an
accessible name without visible text, use `aria-label` instead. `mud-table`'s selection checkboxes
already do.
