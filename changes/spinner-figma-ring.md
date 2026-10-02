---
type: Fixed
title: "`mud-spinner` draws Figma's ring: 2.5px and 3.75px strokes, #121212 for Dark"
---

`mud-spinner` now matches the Progress Indicator page (Figma 724:41243), pinned by a state manifest of 16
states (4 sizes x 4 styles); the seven states with a visible colour on white also compare pixels and are
identical to the Figma exports.

- The Small ring is 2.5px thick (was 2px) and the Large ring 3.75px (was 4px). The ring is drawn as a conic
  fill cut by a radial mask instead of a CSS border, because a border cannot be 2.5px or 3.75px. The 270deg
  arc, its flat ends and the gap in the top-right quarter are unchanged.
- The `dark` variant is `#121212` (`color.icon.base.default`), as Figma draws it, instead of `#1E1E1E`.

Tokens: `spinner.stroke.width.sm` is `2.5px`, `spinner.stroke.width.lg` is `3.75px`, and `spinner.arc.color.dark`
points to `color.icon.base.default`.
