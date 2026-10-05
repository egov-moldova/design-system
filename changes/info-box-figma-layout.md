---
type: Changed
title: "`mud-info-box` follows the Figma Desktop and Mobile layouts"
---

`mud-info-box` now matches the Informational Box page (Figma 574:30339), pinned by a state
manifest of 15 states (style parity 197/197, pixel diff against every state).

- Desktop: a 24px icon in its own column, 24px block padding around the text, a 16/24 body in
  `text.base.secondary`, an 18/26 heading with -0.01em tracking, and 6px between heading and
  body. A button in the `actions` slot sits 8px lower than a link.
- Mobile (`max-width: 640px`): radius 12, a 20px icon, 20px block padding and a 14/20 body.
- The close button keeps its 32px target but is offset 10px from the top and right edges.
- The neutral icon uses `icon.base.tertiary` (#757575) instead of the near-black default, and the
  close glyph keeps `icon.base.secondary-on-color` in the dark theme.
- The text now sits in a `.text` wrapper, so heading and body are one block above the actions.

Tokens: `infoBox.container.padding*`/`stackGap`/`headingGap` are replaced by
`container.paddingInlineStart`, `container.textGap`, `icon.padding*`, `content.*` and the
`*Mobile` variants. Consumers that override the old `--info-box-container-padding-block`,
`--info-box-container-padding-inline`, `--info-box-container-stack-gap` or
`--info-box-container-heading-gap` must switch to the new names.
