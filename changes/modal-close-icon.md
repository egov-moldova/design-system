---
type: Fixed
title: "`mud-modal` close button uses the cross-large icon"
---

The close button of `mud-modal` drew the `cross-small` icon, a 7px cross, where Figma places
`16/cross-large` (109:2526), an 11px one. It now uses `cross-large` at 16px, which draws a 10px
cross (mud-icon scales its single 24px drawing to 16px, so it stays 1px short of Figma's own
16px drawing). The 32px pill, its colours and its position are unchanged.
