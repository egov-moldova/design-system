# cor-spinner



<!-- Auto Generated Below -->


## Overview

Spinner — animated circular loading indicator.

Pattern B (atom-visual): renders a CSS-only rotating arc.
No slots, no events, no interactivity.

## Properties

| Property  | Attribute | Description                          | Type                                               | Default     |
| --------- | --------- | ------------------------------------ | -------------------------------------------------- | ----------- |
| `label`   | `label`   | Accessible label for screen readers. | `string`                                           | `'Loading'` |
| `size`    | `size`    | Visual size rung.                    | `"lg" \| "md" \| "sm" \| "xs"`                     | `'md'`      |
| `variant` | `variant` | Color treatment.                     | `"brand" \| "dark" \| "light" \| "light-on-color"` | `'brand'`   |


## Dependencies

### Used by

 - [cor-button](../cor-button)
 - [cor-service-button](../cor-service-button)

### Graph
```mermaid
graph TD;
  cor-button --> cor-spinner
  cor-service-button --> cor-spinner
  style cor-spinner fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
