---
type: Fixed
title: "`mud-checkbox` error message follows Figma: 12/16, under the supporting text"
---

`mud-checkbox` now matches the Checkbox page (Figma 326:9851), pinned by additional states in its manifest.

- The error message (`error-text` on an `invalid` checkbox) is the inline-message Error, Size=Small: a 16px icon
  and Caption 12/16 text (was 14/20), 6px under the label or the supporting text (340:10854).
- The supporting text stays when there is an error message; it used to be replaced, and turned red. It keeps its
  `#757575`, and `aria-describedby` now lists the supporting text and then the error message.
- A checkbox with an error message and no supporting text centres its box on the label and message, as Figma
  draws it (340:10810).
- On touch devices the touch target of a checkbox with a label reaches 6px past the whole row (216 x 36 for the
  204 x 24 row), not only past the box.

Tokens: new `checkbox.error.*` (`fontSize`, `lineHeight`, `iconSize`, `gap`, `spacing`) and
`checkbox.container.touchRowInset`.
