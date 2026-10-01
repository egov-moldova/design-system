---
type: Fixed
title: `mud-banner`'s close glyph is #444444 on the light fills
---

The close button took the message colour, `#121212`. In Figma's Banner page (670:5171 frames, 106:1052
and the 11 others) the × is `#444444` on every light fill, Subtle in each style and Strong Warning,
and white on the dark Strong Info and Error fills, as it already was. The glyph now takes the new
tokens `banner.close.color.default` (`color.icon.base.secondary-on-color`) and
`banner.close.color.onStrong` (`color.icon.base-inverse.on-color`), the same in the light and dark themes.

The hover tint, a 12% mix of the button's current colour, follows the glyph colour.
