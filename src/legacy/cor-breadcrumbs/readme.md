# cor-breadcrumbs



<!-- Auto Generated Below -->


## Overview

Breadcrumbs navigation molecule — renders a semantic nav/ol with separators and optional ellipsis.

## Properties

| Property   | Attribute   | Description                                                               | Type      | Default         |
| ---------- | ----------- | ------------------------------------------------------------------------- | --------- | --------------- |
| `disabled` | `disabled`  | Disables all child breadcrumb items (cor-link, cor-breadcrumbs-ellipsis). | `boolean` | `false`         |
| `navLabel` | `nav-label` | Accessible label for the nav landmark.                                    | `string`  | `'Breadcrumbs'` |


## Events

| Event                    | Description                                  | Type                                    |
| ------------------------ | -------------------------------------------- | --------------------------------------- |
| `corBreadcrumbItemClick` | Emitted when any breadcrumb item is clicked. | `CustomEvent<BreadcrumbItemClickEvent>` |


## Slots

| Slot        | Description                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| `"default"` | Breadcrumb items: cor-link, cor-breadcrumbs-ellipsis, or plain text elements |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
