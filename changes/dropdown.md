---
type: Added
title: "`mud-dropdown`, and popup state on `mud-button`"
---

`mud-dropdown` opens a `mud-menu` from a slotted trigger, 4px under it (Figma Menu › Dismissal, 430:25768), lined up
with the trigger's start or end (`align`). It closes on the trigger, on a choice, on a press outside, when focus
leaves it and on Escape, and emits `mudToggle`. The menu is fixed-positioned, so a scrolling table does not clip it.

`mud-button` moves `aria-expanded` and `aria-haspopup` from its host onto its inner control, so it can be a menu
button.
