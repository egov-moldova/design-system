---
type: Fixed
title: "`mud-sidebar-item` shows its `label` on an expandable item written over several lines"
---

An expandable `mud-sidebar-item` is written with its nested items on separate lines. The whitespace between
them is assigned to the default slot, which hid the `label` fallback: the row showed no text, and its button
had no accessible name (axe `button-name`, seen in the Expandable story). The label is now drawn by the item
itself unless the default slot holds real content (an element or non-blank text), so a label given as a prop
or as slotted text behaves the same however the markup is indented.
