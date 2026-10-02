---
type: Removed
title: "`mud-service-button`, replaced by `mud-button` with a `badge`"
breaking: true
---

`mud-service-button` is gone, together with its exports (`MudServiceButton`,
`SERVICE_BUTTON_APPEARANCES`, `SERVICE_BUTTON_TYPES`, `ServiceButtonAppearance`,
`ServiceButtonType`) and its `--service-button-*` tokens. It duplicated `mud-button` for one shape:
a 48px button with a service logo before the label. `mud-button` draws that with its `badge` prop
(or slot) and keeps every other `mud-button` feature.

**Migration:** `<mud-service-button appearance="neutral"><mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>Label</mud-service-button>`
becomes `<mud-button size="lg" variant="neutral" badge="mpay">Label</mud-button>`.
`appearance="primary"` becomes `variant="primary"`; `disabled`, `loading`, `full-width`, `href`,
`type`, `name` and `value` carry over unchanged. A logo outside the M-service list still goes in
the `badge` slot.
