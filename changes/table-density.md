---
type: Changed
title: "`mud-table` follows the denser Figma table"
---

The header is 36px and rows are 40px tall (they were 48px), as in the current Figma table (647:3531, 649:4296), and
cells no longer pad their content vertically, so a 32px control fits a row. One-line text stays centred exactly as
before.

**Migration:** none, unless a page relied on the 48px rows or the cell's 8px block padding around slotted content.
