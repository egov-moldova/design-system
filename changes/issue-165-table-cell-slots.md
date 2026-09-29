---
type: Fixed
title: `mud-table` cell slots reach every row, and follow the row
---

A custom cell was slotted by column alone (`cell-{key}`) or by row position
(`cell-{key}-{rowIndex}`). Every row rendered a slot named `cell-{key}`, and the DOM assigns a
slot name to the first slot carrying it, so all `cell-{key}` content landed in the first row. The
position form worked, but stayed put when the consumer sorted or filtered `rows`.

Cells are now slotted by row id: `cell-{key}-{rowId}`, where `rowId` is the row's `rowIdField`
value (`id` by default), or its index when the row has none. The content follows its row.

**Migration:**

- `slot="cell-{key}"` is no longer rendered; the table warns once when it finds one. Use
  `cell-{key}-{rowId}`.
- `slot="cell-{key}-{rowIndex}"` still works in this release and warns once that it is
  deprecated; it goes away in the next major. Use `cell-{key}-{rowId}`.
- **Numeric row ids that start at 1 shift index-addressed cells.** When a slot name matches both
  one row's id and another row's index, the id wins: with rows `{ id: 1 }`, `{ id: 2 }`, …,
  `slot="cell-status-1"` now goes to the first row (id 1), not the second (index 1), and no
  warning is printed because the name is a valid id. Move such tables to row ids.
