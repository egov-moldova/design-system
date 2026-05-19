# cor-cell



<!-- Auto Generated Below -->


## Overview

Table cell — purely presentational wrapper for body cell content.
Renders any slotted content with proper padding and alignment.

## Properties

| Property      | Attribute     | Description                                                             | Type                                                    | Default          |
| ------------- | ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- | ---------------- |
| `active`      | `active`      | Applies active/edit-mode styling (red border + tinted background)       | `boolean`                                               | `false`          |
| `align`       | `align`       | Horizontal alignment of cell content                                    | `CellAlign.CENTER \| CellAlign.LEFT \| CellAlign.RIGHT` | `CellAlign.LEFT` |
| `colIndex`    | `col-index`   | 1-based column index for column hiding scenarios                        | `number \| undefined`                                   | `undefined`      |
| `interactive` | `interactive` | Makes the cell focusable via Tab and shows focus ring on keyboard focus | `boolean`                                               | `false`          |
| `minWidth`    | `min-width`   | Optional minimum width for the cell                                     | `string \| undefined`                                   | `undefined`      |
| `width`       | `width`       | Optional fixed width for the cell (e.g., '200px', '25%')                | `string \| undefined`                                   | `undefined`      |


## Slots

| Slot | Description                                                        |
| ---- | ------------------------------------------------------------------ |
|      | Default slot for cell content (text, icons, badges, avatars, etc.) |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
