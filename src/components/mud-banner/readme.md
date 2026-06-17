# mud-banner



<!-- Auto Generated Below -->


## Overview

Banner — full-width, top-of-page system message.

A persistent, non-contextual notification that spans the width of its
container and informs users of important system-wide events (scheduled
maintenance, outages, announcements). Draws attention without blocking
interaction; remains visible until dismissed or resolved.

Pattern B (atom-display + interactive close): the optional close affordance
lives in shadow DOM with a real `button` role. The body is not interactive
apart from the optional inline link.

`variant` selects the semantic color family — `info`, `warning`, or `error`
(Figma exposes no `success` for banners). `emphasis` selects the surface
treatment — `subtle` (tinted) or `strong` (filled, on-color foreground).

Live-region routing follows WCAG status/alert conventions:
- `info` → `role="status"` + `aria-live="polite"`
- `warning` / `error` → `role="alert"` + `aria-live="assertive"`

## Properties

| Property      | Attribute     | Description                                                                                                                                           | Type                             | Default     |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------- |
| `ariaLabel`   | `aria-label`  | Forwarded to the host as `aria-label`.                                                                                                                | `string \| undefined`            | `undefined` |
| `closeLabel`  | `close-label` | Close-button accessible label. Defaults to the Romanian "Închide".                                                                                    | `string`                         | `'Închide'` |
| `dismissible` | `dismissible` | When `true`, renders a trailing close (×) button. Activating it emits `mudDismiss`; the consumer is responsible for removing the banner from the DOM. | `boolean`                        | `false`     |
| `emphasis`    | `emphasis`    | Surface treatment: `subtle` (tinted background, dark text) or `strong` (filled background, on-color text).                                            | `"strong" \| "subtle"`           | `'subtle'`  |
| `iconName`    | `icon-name`   | Override the default `mud-icon` name for the variant. Ignored when the `icon-start` slot is populated.                                                | `string \| undefined`            | `undefined` |
| `linkHref`    | `link-href`   | Href for the optional inline link. Defaults to `#` when omitted.                                                                                      | `string \| undefined`            | `undefined` |
| `linkText`    | `link-text`   | Optional inline link text rendered after the message (the Figma "Click here" affordance). Pair with `linkHref` for a real destination.                | `string \| undefined`            | `undefined` |
| `variant`     | `variant`     | Semantic color family. Per Figma the banner exposes `info`, `warning`, and `error` (no `success`).                                                    | `"error" \| "info" \| "warning"` | `'info'`    |


## Events

| Event        | Description                                                                                                                | Type                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `mudDismiss` | Fires when the user activates the close button. Payload is `void` — the consumer owns the dismiss animation / DOM removal. | `CustomEvent<void>` |


## Slots

| Slot           | Description                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
|                | (default) The banner message. Plain text or rich inline content.                                                                                       |
| `"icon-start"` | Optional override for the leading icon. When supplied,              suppresses both the `iconName` prop and the per-variant              default icon. |


## Shadow Parts

| Part        | Description |
| ----------- | ----------- |
| `"close"`   |             |
| `"link"`    |             |
| `"message"` |             |


## Dependencies

### Depends on

- [mud-icon](../mud-icon)

### Graph
```mermaid
graph TD;
  mud-banner --> mud-icon
  style mud-banner fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
