---
type: Removed
title: `mud-segmented-control`'s reserved default slot
breaking: true
---

The slot was documented as "reserved for future declarative segments" and hid whatever it
received. Segments come from the `segments` prop only. Light-DOM children were never shown and
still are not; only the documented slot is gone.
