---
type: Added
title: `mud-button` draws an M-service logomark: the `badge` prop and slot
---

`mud-button` draws a service logomark 24×24 before the label (Figma button-badge-filled,
2925:4606). Pick the service with the `badge` prop, typed as `ButtonBadge` and listed in the
exported `BUTTON_BADGES`: `<mud-button size="lg" variant="primary" badge="mpay">Plătește cu
mpay</mud-button>`. The `badge` slot replaces it with any other logo. The logo keeps its
colours, dims to 30% when disabled and hides while loading. With a badge, `variant="neutral"`
sits on `background.base.secondary`, as the design draws it.
