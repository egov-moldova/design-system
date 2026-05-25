# cor-table



<!-- Auto Generated Below -->


## Overview

Table — data table molecule for tabular content with optional sorting,
selection, and responsive mobile collapse.

Pattern B (molecule, internal DOM): renders a native `<table>` inside
shadow DOM for full a11y semantics (`role="table"`, `role="columnheader"`,
`aria-sort`, `aria-selected`). Composes existing primitives — `cor-checkbox`
for the selection column, `cor-icon` for sort chevrons. Status badges and
row actions are projected via named slots so consumers can drop in
`cor-tag`, `cor-button`, or any custom content per cell.

Below the `--breakpoint-mobile` (≤640 px) container query, every row
collapses to a vertical key:value card stack — each `<td>` becomes a
labelled line with the column title rendered inline before its value.

## Properties

| Property        | Attribute        | Description                                                                                                                                                                                                                      | Type                                   | Default     |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------- |
| `ariaLabel`     | `aria-label`     | Accessible label propagated to the rendered `<table>` element.                                                                                                                                                                   | `string \| undefined`                  | `undefined` |
| `columns`       | --               | Column definitions. Each entry maps a row field (`key`) to a header `label`, an optional `sortable` flag, alignment, and width.                                                                                                  | `TableColumn[] \| undefined`           | `undefined` |
| `headerStyle`   | `header-style`   | Header treatment. `default` is the subtle gray header used on light surfaces; `inverted` is the strong dark-on-light header for emphasis.                                                                                        | `"default" \| "inverted"`              | `'default'` |
| `hoverable`     | `hoverable`      | Enables hover highlight on rows. Independent of selection.                                                                                                                                                                       | `boolean`                              | `false`     |
| `rowIdField`    | `row-id-field`   | Field used to uniquely identify a row. Used for selection state and stable React-like keys.                                                                                                                                      | `string`                               | `'id'`      |
| `rowStyle`      | `row-style`      | Row treatment. - `divided` (default) — horizontal divider line below every row. - `zebra` — alternating row backgrounds (no dividers). - `borderless` — flat rows, no dividers, no zebra.                                        | `"borderless" \| "divided" \| "zebra"` | `'divided'` |
| `rows`          | --               | Row data. Each row is keyed by the field declared in `rowIdField` (defaults to `id`). Missing IDs fall back to row index.                                                                                                        | `TableRowData[] \| undefined`          | `undefined` |
| `selectable`    | `selectable`     | Renders a leading checkbox column for multi-row selection.                                                                                                                                                                       | `boolean`                              | `false`     |
| `selectedRows`  | --               | Selected row IDs (controlled). Each entry must correspond to a row's `rowIdField` value (stringified). Toggling rows or the master checkbox emits `corSelectionChange` — the consumer reflects the new array back via this prop. | `string[] \| undefined`                | `undefined` |
| `sortColumn`    | `sort-column`    | Currently sorted column key (controlled). When unset no sort glyph is highlighted.                                                                                                                                               | `string \| undefined`                  | `undefined` |
| `sortDirection` | `sort-direction` | Sort direction for `sortColumn`. Ignored when `sortColumn` is unset.                                                                                                                                                             | `"asc" \| "desc" \| undefined`         | `undefined` |


## Events

| Event                | Description                                                            | Type                                      |
| -------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| `corRowClick`        | Emitted when a row body is clicked (excluding the selection checkbox). | `CustomEvent<TableRowClickDetail>`        |
| `corSelectionChange` | Emitted when the selection set changes.                                | `CustomEvent<TableSelectionChangeDetail>` |
| `corSort`            | Emitted when the user activates a sortable header.                     | `CustomEvent<TableSortChangeDetail>`      |


## Slots

| Slot                  | Description                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"cell-{key}"`        | Custom rendering for cells in a specific column. Useful for              status tags, action buttons, or any non-text content. The              consumer is responsible for providing one slotted element              per row (matched in order to `rows`). |
| `"empty"`             | Custom empty-state content when `rows` is empty or undefined.                                                                                                                                                                                                |
| `"header-cell-{key}"` | Custom rendering for a specific column header.                      Replaces the auto-rendered label + sort affordance.                                                                                                                                      |


## Dependencies

### Depends on

- [cor-icon](../cor-icon)
- [cor-checkbox](../cor-checkbox)

### Graph
```mermaid
graph TD;
  cor-table --> cor-icon
  cor-table --> cor-checkbox
  style cor-table fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
