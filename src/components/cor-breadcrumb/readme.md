# cor-breadcrumb-item



<!-- Auto Generated Below -->


## Overview

A single crumb inside `cor-breadcrumb`. Renders an anchor when `href` is set,
otherwise plain text. The active crumb renders as text with `aria-current="page"`,
regardless of `href`.

Use this directly when the markup variant of the breadcrumb is preferred over
the `items` prop on `cor-breadcrumb`. Both APIs are equivalent in behavior.

## Properties

| Property   | Attribute  | Description                                                                                                                                            | Type                  | Default     |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ----------- |
| `active`   | `active`   | Marks this crumb as the current page. Adds `aria-current="page"`, switches to medium font weight, and disables navigation (renders as text).           | `boolean`             | `false`     |
| `disabled` | `disabled` | Disables interaction and applies the disabled text color.                                                                                              | `boolean`             | `false`     |
| `href`     | `href`     | Optional navigation target. Renders as `<a>` when set, otherwise as `<span>`. Ignored when `active` is true (active crumb is always rendered as text). | `string \| undefined` | `undefined` |
| `label`    | `label`    | Accessible name override — required when the default slot is empty.                                                                                    | `string \| undefined` | `undefined` |
| `loading`  | `loading`  | Replaces the label with a spinner while keeping the crumb width. Used for async navigation where the parent page hasn't loaded yet.                    | `boolean`             | `false`     |
| `visited`  | `visited`  | Visited link styling — text turns magenta (`--color-text-brand-visited`). Maps to the CSS pseudo-state for declarative use cases.                      | `boolean`             | `false`     |


## Events

| Event       | Description                                                                                                                                        | Type                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `corSelect` | Fired when the crumb is activated (click or Enter/Space on a non-link crumb). Cancelable — `preventDefault()` lets the consumer handle navigation. | `CustomEvent<{ label: string; href?: string \| undefined; }>` |


## Slots

| Slot | Description                                                                        |
| ---- | ---------------------------------------------------------------------------------- |
|      | (default) Label content. Use plain text or inline elements (`<strong>`, `<span>`). |


## Dependencies

### Depends on

- [cor-spinner](../cor-spinner)

### Graph
```mermaid
graph TD;
  cor-breadcrumb-item --> cor-spinner
  style cor-breadcrumb-item fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
