---
type: Changed
title: "`mud-phone-input` draws its country flags from the flag-icons set"
---

The flags of the country picker are now the SVG files of
[flag-icons](https://github.com/lipis/flag-icons) (MIT, `flags/4x3`, v7.5.0), vendored with their
licence and the pinned upstream commit, and drawn inline. How they are delivered is in the
`asset-delivery` entry: each flag is a lazy-loaded JavaScript module, not a published SVG file.
It is the set the Figma Foundations "Flags" frame is made of. They replace the hand-written
drawings, including the Moldova flag that was embedded as a `data:` image. All 271 flags of the
set ship, and a flag is requested only when its country is on screen. The country list, dial
codes and masks are unchanged.

The Moldova flag is the exception: the coat of arms in flag-icons (and in the Figma frame) is a
rough drawing, so it is replaced by the Wikimedia Commons *Flag of Moldova* (public domain, drawn
after Law no. 217 of 2010), with the bands in `#0046AE`, `#FFD200` and `#CC092F`.

**Migration:** nothing to change. No `img-src` entry is needed for the flags, and `img-src data:`
is no longer needed for the Moldova flag.
