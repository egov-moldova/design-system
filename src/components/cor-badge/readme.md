# cor-badge



<!-- Auto Generated Below -->


## Overview

Badge component - a presentational status/label badge with icon and label support.

## Properties

| Property  | Attribute | Description                           | Type                                                                                                         | Default               |
| --------- | --------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------- |
| `size`    | `size`    | The size of the badge                 | `BadgeSize.MD \| BadgeSize.XS`                                                                               | `BadgeSize.MD`        |
| `status`  | `status`  | The semantic status of the badge      | `BadgeStatus.DEFAULT \| BadgeStatus.ERROR \| BadgeStatus.INFO \| BadgeStatus.SUCCESS \| BadgeStatus.WARNING` | `BadgeStatus.DEFAULT` |
| `variant` | `variant` | The visual style variant of the badge | `BadgeVariant.DOT \| BadgeVariant.FILLED \| BadgeVariant.MUTED \| BadgeVariant.PLAIN`                        | `BadgeVariant.FILLED` |


## Slots

| Slot     | Description                                                           |
| -------- | --------------------------------------------------------------------- |
|          | Default slot for text label content                                   |
| `"icon"` | Optional icon slot (accepts cor-icon only, not shown for dot variant) |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
