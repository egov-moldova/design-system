# cor-table



<!-- Auto Generated Below -->


## Overview

Table component — orchestrator container that wraps cor-thead, cor-tbody, and cor-tfoot.
Propagates size via CSS custom properties. Purely presentational — no data management.

## Properties

| Property          | Attribute           | Description                                                              | Type                                           | Default        |
| ----------------- | ------------------- | ------------------------------------------------------------------------ | ---------------------------------------------- | -------------- |
| `ariaDescribedBy` | `aria-described-by` | ID of element that describes the table                                   | `string \| undefined`                          | `undefined`    |
| `ariaLabel`       | `aria-label`        | Accessible name for the table                                            | `string \| undefined`                          | `undefined`    |
| `ariaLabelledBy`  | `aria-labelled-by`  | ID of element that labels the table                                      | `string \| undefined`                          | `undefined`    |
| `bordered`        | `bordered`          | Enable outer border on the table container                               | `boolean`                                      | `false`        |
| `colCount`        | `col-count`         | Total number of columns (for column hiding)                              | `number \| undefined`                          | `undefined`    |
| `loading`         | `loading`           | Loading state for dynamic data (aria-busy only, no visual changes)       | `boolean \| undefined`                         | `undefined`    |
| `rowCount`        | `row-count`         | Total number of rows (for virtual scrolling/pagination)                  | `number \| undefined`                          | `undefined`    |
| `size`            | `size`              | Size variant controlling cell padding and min-height across all children | `TableSize.LG \| TableSize.MD \| TableSize.SM` | `TableSize.LG` |
| `zebra`           | `zebra`             | Enable alternating row background (zebra striping)                       | `boolean`                                      | `false`        |


## Slots

| Slot | Description                                      |
| ---- | ------------------------------------------------ |
|      | Default slot for cor-thead, cor-tbody, cor-tfoot |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
