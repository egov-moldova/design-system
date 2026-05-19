# cor-breadcrumbs-ellipsis



<!-- Auto Generated Below -->


## Overview

Breadcrumbs ellipsis button — renders a "..." button with a dropdown of hidden breadcrumb items.

## Properties

| Property       | Attribute       | Description                                           | Type                                                                                                                    | Default                                |
| -------------- | --------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `disabled`     | `disabled`      | Disables the ellipsis button and all dropdown items.  | `boolean`                                                                                                               | `false`                                |
| `listPosition` | `list-position` | Position of the dropdown list relative to the button. | `BreadcrumbsEllipsisListPosition.AUTO \| BreadcrumbsEllipsisListPosition.BOTTOM \| BreadcrumbsEllipsisListPosition.TOP` | `BreadcrumbsEllipsisListPosition.AUTO` |


## Events

| Event                  | Description                              | Type                                             |
| ---------------------- | ---------------------------------------- | ------------------------------------------------ |
| `corEllipsisClose`     | Emitted when the dropdown closes.        | `CustomEvent<void>`                              |
| `corEllipsisItemClick` | Emitted when a dropdown item is clicked. | `CustomEvent<BreadcrumbsEllipsisItemClickEvent>` |
| `corEllipsisOpen`      | Emitted when the dropdown opens.         | `CustomEvent<void>`                              |


## Slots

| Slot        | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
| `"default"` | cor-select-item elements with variant="label-only" and value attribute |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
