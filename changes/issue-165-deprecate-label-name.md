---
type: Deprecated
title: `label` as an accessible name on `mud-button` and `mud-chip`
---

Everywhere else in the library `label` is visible text. On these two it only named the control.
Setting it warns once; it goes away in the next major.

**Migration:** `label="Edit"` becomes `aria-label="Edit"`. The icon-only warning of `mud-button`
now asks for an `aria-label`.
