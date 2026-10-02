---
type: Changed
title: the `mud-accordion-item` panel adds no padding
breaking: true
---

Figma's Accordion page (670:5171) draws the open panel as a Content Slot that runs edge to edge:
the content spaces itself (`.accordion-content` pads 12px at the bottom, each `.service-item`
row 24px). The panel padded its body 24px at the start, 48px at the end and 32px at the bottom,
which the design does not have. It now adds none, so slotted content is 996px wide in a 996px
item (it was 924px) and the item is 32px shorter below its content. The expanded states are
compared pixel by pixel now (the manifest fixture slots an empty block as the design master does).

The tokens `accordion.item.panel.paddingBlockEnd`, `paddingInlineStart` and `paddingInlineEnd` are
gone, with `--accordion-item-panel-padding-block-end`, `-inline-start` and `-inline-end`. The
`trail-sites` appearance is not on that page, so it keeps its panel inset under new tokens,
`accordion.item.panel.trailSites.paddingBlockEnd` and `paddingInlineEnd`.

**Migration:** if the panel's content relied on that inset, give the content its own padding
(`padding-inline: …`), or style the panel with `mud-accordion-item::part(panel)`.
Plain text now sits flush with the heading, as the heading does.
