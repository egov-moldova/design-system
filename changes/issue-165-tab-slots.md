---
type: Deprecated
title: `mud-tab`'s `icon-start` and `badge` slots
---

`mud-tab` took its icon through `iconName` and an `icon-start` slot, and its badge through
`badgeCount` and a `badge` slot. The props stay, since the `tabs` descriptor of `mud-tabs` carries
the same fields. The slots still render, warn once, and go away in the next major.

**Migration:** `<mud-icon slot="icon-start" name="filter">` becomes `icon-name="filter"` on the
tab; `<span slot="badge">7</span>` becomes `badge-count="7"`.
