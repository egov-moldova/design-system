---
type: Fixed
title: "`mud-sidebar-item` secondary label is readable on the active row"
---

The secondary label of an active `mud-sidebar-item` (the "Nou" in a row with `secondary`) was
`#757575` on the active surface `#E8F0FB`, which is 4.01:1 and fails WCAG 1.4.3 for 14px text. It now
uses the on-colour grey `#444444` (8.48:1) while the row is active; the label on an inactive row is
unchanged. The new token is `sidebar.item.secondary.colorActive`.

The active rail on the left is now a real element (`.rail`) instead of a `::before`. axe cannot read a
text background behind a pseudo-element and reported the label's contrast as "needs review", which
hid the failure above. The rail looks and sits the same.
