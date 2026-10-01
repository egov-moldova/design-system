---
type: Fixed
title: "`mud-inline-message` success icon uses the Figma green"
---

The success glyph of `mud-inline-message` is `#039855` (`icon.positive.default`), as Figma draws it
(571:29793), instead of the darker `#027948`. The success text keeps `#027948`: Figma's `#039855`
gives 3.73:1 on white, below the 4.5:1 that WCAG 1.4.3 asks of body text, while the glyph only
needs 3:1. The component now has a Figma state manifest of 9 states (info, warning, success,
error in both sizes, and the icon-none variation).
