---
type: Fixed
title: "`mud-breadcrumb` follows the Figma focus ring, spacing and overflow menu"
---

`mud-breadcrumb` now matches the Breadcrumb page (Figma 602:1933), pinned by 13 states in its manifest.

- The focus ring on a crumb and on the overflow trigger is Figma's Focus Ring/Small, a 1px white halo inside a blue
  band ending 3px out (it was the 2px / 5px Medium ring).
- A crumb has no inline padding any more (it had 2px each side): the label box is as wide as its text, the focus
  ring wraps it exactly, and a trail is about 4px per crumb shorter.
- The mobile back link has no gap between the 20px arrow and the label (it had 4px).
- The overflow dropdown is the Figma contextual menu: radius 16, Drop Shadow/300, no stroke, 4px between the
  options, and options padded 12px 24px 12px 16px with radius 8 and Medium #383838 text (it had radius 8, an old
  shadow, a 1px stroke, 8px 12px padding and Regular #121212 text).

Tokens: new `breadcrumb.focusRing.*` and `breadcrumb.menu.gap`; `breadcrumb.menu.border.*` is removed,
`breadcrumb.menu.border.radius` becomes `breadcrumb.menu.borderRadius`, and `breadcrumb.menu.item.padding.inline`
is split into `inlineStart` and `inlineEnd`; `breadcrumb.item.padding.inline` and `breadcrumb.back.gap` are `0`.
