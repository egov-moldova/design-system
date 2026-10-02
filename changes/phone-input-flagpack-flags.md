---
type: Changed
title: "`mud-phone-input` draws its country flags from the flagpack-core set"
---

The flags of the country picker are now the SVG files of
[flagpack-core](https://github.com/Yummygum/flagpack-core) (MIT, `svg/l`), vendored under
`assets/flags/` with their licence and the pinned upstream commit, and shown through an `<img>`.
They replace the hand-written drawings, including the Moldova flag that was embedded as a
`data:` image. All 254 flags of the set ship (about 0.7 MB in `dist/`), and a flag is requested
only when its country is on screen. The country list, dial codes and masks are unchanged.

Flagpack paints with its own, softer palette instead of each country's specification, so every flag
shifts slightly in colour (Ukraine's blue is `#3195F9` where it was `#0057B7`; the white of Russia
and France is `#F7FCFF`).

**Migration:** nothing to change when `dist/mud/` is served as one unit, which `mud-icon` already
needs. A strict Content-Security-Policy needs `img-src` to allow the origin that serves
`assets/flags/` (the origin of `mud.esm.js`); `img-src data:` is no longer needed for the Moldova
flag.
