---
type: Deprecated
title: `mud-banner` `linkText` / `linkHref`, replaced by an `actions` slot
---

A link built from props could not take SPA routing, a click handler, `target` / `rel` or
analytics attributes, and `mud-info-box` and `mud-toast` already take their actions through a
slot. `mud-banner` now has an `actions` slot after the message. When it is filled, the link
props render nothing. Setting `linkText` warns once; both props go away in the next major.

**Migration:** `link-text="Details" link-href="/status"` becomes
`<mud-link slot="actions" href="/status" size="md">Details</mud-link>`, which is Figma's link
component (Primary, 16). On `emphasis="strong"`, add `variant="white"`.
