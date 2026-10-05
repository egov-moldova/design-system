---
type: Fixed
title: "`mud-tooltip` follows the Figma arrow, shadow and close target"
---

`mud-tooltip` now matches the Tooltip page (Figma 578:34361), pinned by a state manifest of five
states (style parity, every property exact).

- The arrow has Figma's own shape: a flat base that flares out of the bubble edge and a rounded tip, 32 x 12 on
  `size="lg"` (was a sharp 24 x 12 triangle) and 21.33 x 8 on `size="sm"` (was 16 x 8). It is a box painted
  through a mask of the Figma path, in all four directions, instead of a border triangle.
- The bubble carries Figma's Drop Shadow/200 (0 1px 3px, 0 3px 8px at 8% and a 0.5px hairline) instead of
  `dropShadow.100`. The foundation `dropShadow.200` token is an older value, so the tooltip holds the Figma
  one in `tooltip.container.shadow` until the foundation is aligned.
- The coach close button's hit target is 32px on pointer devices and 40px on touch (was 16px), centred on the
  16px glyph, which keeps its place. The new tokens are `tooltip.close.target` and `tooltip.close.touchTarget`
  (40px, was 24px and unused).

Token changes: `tooltip.arrow.width.sm` is `21.33px`, `tooltip.arrow.width.lg` is `32px`.
