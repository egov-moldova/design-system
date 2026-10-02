---
type: Fixed
title: "`mud-menu` and `mud-select` cut long labels after two lines"
---

A long option label in `mud-menu-item` and in the `mud-select` listbox was cut on one line. Figma
draws it on two lines with the ellipsis at the end of the second (797:42690, 797:42585,
797:42582), so such a row is 64px high instead of 44px. A long section heading in `mud-menu` gets
the same two-line cut, and before this it was not cut at all (2486:42613).

The section separator now takes Figma's 4px block (a 1px line centred in it) plus the 4px gap to
the label, which is 1px less than before. The new token `menu.heading.separatorInset` holds the
1.5px inset; `menu.heading.gap` is now used.
