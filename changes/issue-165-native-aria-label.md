---
type: Changed
title: `mud-button`, `mud-service-button` and `mud-chip` read the native `aria-label`
---

These three took an accessible name only through a `label` prop; a host `aria-label` stayed on
the host, which has no role, so it named nothing (`mud-button` only checked that it existed, to
silence its icon-only warning). They now move the host's `aria-label` onto their internal control
and follow later changes to it, as most other components already do. It wins over `label`.
