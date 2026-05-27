# Semantic-Tier Gap — `color.text.brand` Hover/Active

**Status**: Backlog — needs design + cross-component verification
**Captured**: 2026-05-27
**Source**: cor-link audit (deep token review)
**Affects**: at least `cor-link`, `cor-file-input`; potentially others that need brand-text hover/active treatments

---

## Problem

The semantic-tier text-brand block in [`tokens/core/color.tokens.json`](../../tokens/core/color.tokens.json) is incomplete + inconsistent:

| Token (light) | Current value | Issue |
|---|---|---|
| `color.text.brand.default` | `{palette.blue-sky.600}` | OK |
| `color.text.brand.default-hover` | `{palette.blue-sky.600}` | **Duplicates default** — no hover feedback |
| `color.text.brand.default-active` | **Missing** | No active-state semantic |
| `color.text.brand.visited` | `{palette.magenta.600}` | OK |

Dark-mode equivalents:

| Token (dark) | Current value |
|---|---|
| `color.text.brand.default` | `{palette.blue-sky.400}` |
| `color.text.brand.default-hover` | `{palette.blue-sky.700}` (darker — unusual direction in dark mode, but consistent with the dim-on-hover pattern used elsewhere) |
| `color.text.brand.default-active` | **Missing** |

### Downstream consequences

- `cor-link.tokens.json` is forced to reference `color.background.brand.default-hover/active` (background tokens used as text colors). The resolved values are visually correct (palette.blue-sky.700/800) but the semantic namespace is wrong.
- `cor-file-input.tokens.json` references `color.text.brand.default-hover` for its hover state — which currently resolves to the same value as default in light mode, meaning **no hover feedback at all in light mode**.

---

## Proposed fix

### Light mode — [`tokens/core/color.tokens.json`](../../tokens/core/color.tokens.json)

```diff
 "brand": {
   "default": { "$value": "{palette.blue-sky.600}" },
   "on-secondary": { "$value": "{palette.blue-sky.600}" },
-  "default-hover": { "$value": "{palette.blue-sky.600}" },
+  "default-hover": { "$value": "{palette.blue-sky.700}" },
+  "default-active": { "$value": "{palette.blue-sky.800}" },
   "visited": { "$value": "{palette.magenta.600}" }
 }
```

### Dark mode — [`tokens/core.dark/color.tokens.json`](../../tokens/core.dark/color.tokens.json)

Add `default-active` mirroring the existing convention. Open question: does dark mode want hover to go LIGHTER (palette.blue-sky.300) or DARKER (palette.blue-sky.500)? Current default-hover goes to .700 which is much darker — needs design review.

### After tokens are corrected

[`tokens/core/components/link.tokens.json`](../../tokens/core/components/link.tokens.json) reverts to text-semantic references:

```diff
 "primary": {
   "label": {
     "default": { "$value": "{color.text.brand.default}" },
-    "hover": { "$value": "{color.background.brand.default-hover}" },
-    "active": { "$value": "{color.background.brand.default-active}" },
+    "hover": { "$value": "{color.text.brand.default-hover}" },
+    "active": { "$value": "{color.text.brand.default-active}" },
     "visited": { "$value": "{color.text.brand.visited}" }
   }
 }
```

Remove the `$comment` justification.

---

## Open questions / blockers

1. **Dark-mode hover direction** — design call: lighter or darker? Current text-brand goes darker, but design-system convention for hover on dark surfaces is usually lighter.
2. **Visual regression test on `cor-file-input`** — its hover currently has zero feedback; fixing this WILL change rendering. Capture before/after screenshots.
3. **Audit other consumers** of `color.text.brand.default-hover` once it stops being a no-op.

---

## Pointers

- Current cor-link override: see `$comment` field in [`link.tokens.json` `primary.label`](../../tokens/core/components/link.tokens.json) for the documented deviation.
- Conversation that surfaced this: cor-link deep audit on 2026-05-27.
