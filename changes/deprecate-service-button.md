---
type: Deprecated
title: `mud-service-button`, replaced by `mud-button` with a `badge`
---

`mud-service-button` duplicated `mud-button` for one shape: a 48px button with a logo before
the label. `mud-button` now does it with its `badge` prop (or slot), and keeps every other
`mud-button` feature. `mud-service-button` warns once per page and goes away in the next major.

**Migration:** `<mud-service-button appearance="neutral"><mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>Label</mud-service-button>`
becomes `<mud-button size="lg" variant="neutral" badge="mpay">Label</mud-button>`.
`appearance="primary"` becomes `variant="primary"`; `disabled`, `loading`, `full-width`,
`href`, `type`, `name` and `value` carry over unchanged. A logo outside the M-service list
still goes in the `badge` slot.
