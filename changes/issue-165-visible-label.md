---
type: Changed
title: `mud-checkbox` and `mud-switch` render `label` visibly
breaking: true
---

`label` (and `supportingText` on `mud-checkbox`) were an accessible name only: `<mud-checkbox
label="Accept the terms">` showed a bare box, unlike every other form field. They now render as
visible text, named through `aria-labelledby` and described through `aria-describedby`; a filled
`label` / `supporting-text` slot still replaces them. The host's native `aria-label` overrides
the accessible name. `mud-switch` no longer copies slotted text onto its input's `aria-label`.

**Migration:** anyone passing `label` alone now gets visible text, which moves layout. For an
accessible name without visible text, use `aria-label` instead. `mud-table`'s selection checkboxes
already do. `mud-radio` follows in a later change.
