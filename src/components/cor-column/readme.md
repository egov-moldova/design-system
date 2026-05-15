# cor-column



<!-- Auto Generated Below -->


## Overview

Table column header cell — renders a header label with optional action slots.
Actions (sort, filter, etc.) should be provided via cor-column-action components in slots.
Sort and filter actions are event-driven; the DS never sorts or filters data internally.

## Properties

| Property   | Attribute   | Description                                                                   | Type                                                          | Default            |
| ---------- | ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------ |
| `active`   | `active`    | Sets the column to active state                                               | `boolean`                                                     | `false`            |
| `align`    | `align`     | Horizontal alignment of header content                                        | `ColumnAlign.CENTER \| ColumnAlign.LEFT \| ColumnAlign.RIGHT` | `ColumnAlign.LEFT` |
| `colIndex` | `col-index` | 1-based column index for column hiding scenarios                              | `number \| undefined`                                         | `undefined`        |
| `field`    | `field`     | Field identifier — used in sort/filter event payloads to identify this column | `string`                                                      | `''`               |
| `minWidth` | `min-width` | Optional minimum width for the column                                         | `string \| undefined`                                         | `undefined`        |
| `width`    | `width`     | Optional fixed width for the column (e.g., '200px', '25%')                    | `string \| undefined`                                         | `undefined`        |


## Slots

| Slot             | Description                                              |
| ---------------- | -------------------------------------------------------- |
|                  | Default slot for column header label text                |
| `"action-left"`  | Optional action before the label (use cor-column-action) |
| `"action-right"` | Optional action after the label (use cor-column-action)  |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
