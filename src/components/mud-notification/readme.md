# mud-notification



<!-- Auto Generated Below -->


## Overview

Notification — semantic toast message (350px filled surface, 8px radius).

Renders a leading icon, an optional bold heading, the message body
(default slot), an optional inline action group (`actions` slot) and an
optional trailing close button.

Pattern B (atom-display + interactive close): the close affordance lives
inside shadow DOM so it participates in tab order with a real
`button` role. The body itself is not interactive.

`variant` selects the semantic color family — `info`, `warning`, `success`,
or `error` — each a filled toast surface with its own leading icon.

Live-region routing:
- `info` / `success` → `role="status"` + `aria-live="polite"`
- `warning` / `error` → `role="alert"` + `aria-live="assertive"`

## Properties

| Property     | Attribute     | Description                                                                                                                                                              | Type                                          | Default     |
| ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ----------- |
| `ariaLabel`  | `aria-label`  | Forwarded to the host as `aria-label`. Use this to give the entire notification an explicit accessible name when the body content alone is not descriptive enough.       | `string \| undefined`                         | `undefined` |
| `closable`   | `closable`    | When `true`, renders a trailing close button. Activating it emits `mudClose`; the consumer is responsible for removing the notification from the DOM.                    | `boolean`                                     | `false`     |
| `closeLabel` | `close-label` | Close-button accessible label. Defaults to the Romanian "Închide". Provide an alternative for non-Romanian locales.                                                      | `string`                                      | `'Închide'` |
| `iconName`   | `icon-name`   | Override the default `mud-icon` name for the variant (e.g. swap `circle-info-filled` for a custom glyph). When the `icon-start` slot is populated, this prop is ignored. | `string \| undefined`                         | `undefined` |
| `titleText`  | `title-text`  | Optional bold title rendered above the body.                                                                                                                             | `string \| undefined`                         | `undefined` |
| `variant`    | `variant`     | Semantic color family.                                                                                                                                                   | `"error" \| "info" \| "success" \| "warning"` | `'info'`    |


## Events

| Event      | Description                                                                                                                              | Type                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `mudClose` | Fires when the user activates the close button. Payload is `void` — the consumer is responsible for the dismiss animation / DOM removal. | `CustomEvent<void>` |


## Slots

| Slot           | Description                                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                | (default) The message body. Plain text or rich inline content.                                                                                              |
| `"actions"`    | Optional inline action group (typically `mud-button` or           `mud-link`). Aligned to the trailing edge before the close           button when present. |
| `"icon-start"` | Optional override for the leading icon. When supplied,              suppresses both the `iconName` prop and the per-variant              default icon.      |


## Dependencies

### Depends on

- [mud-icon](../mud-icon)

### Graph
```mermaid
graph TD;
  mud-notification --> mud-icon
  style mud-notification fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
