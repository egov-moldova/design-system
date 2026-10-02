---
type: Changed
title: "`mud-phone-input` draws its country flags from the flag-icons set"
---

The flags of the country picker are now the SVG files of
[flag-icons](https://github.com/lipis/flag-icons) (MIT, `flags/4x3`, v7.5.0), vendored under
`assets/flags/` with their licence and the pinned upstream commit, and shown through an `<img>`.
It is the set the Figma Foundations "Flags" frame is made of. They replace the hand-written
drawings, including the Moldova flag that was embedded as a `data:` image. All 271 flags of the
set ship (about 1.9 MB in `dist/`), and a flag is requested only when its country is on screen
(the 15 listed flags are about 24 KB compressed). The country list, dial codes and masks are
unchanged.

**Migration:** nothing to change when `dist/mud/` is served as one unit, which `mud-icon` already
needs. A strict Content-Security-Policy needs `img-src` to allow the origin that serves
`assets/flags/` (the origin of `mud.esm.js`); `img-src data:` is no longer needed for the Moldova
flag.
