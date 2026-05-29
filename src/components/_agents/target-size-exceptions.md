# Target Size — WCAG Exceptions in `@age/design-system`

## What WCAG 2.1 AA Requires

**WCAG 2.1 Level AA does NOT mandate a minimum target size.**

The relevant criteria are:

| SC | Level | What |
|----|-------|------|
| **2.5.5 Target Size (Enhanced)** | **AAA** in WCAG 2.1 | ≥ 44 × 44 CSS pixels. Out of scope for our 2.1 AA target. |
| **2.5.8 Target Size (Minimum)** | AA in WCAG 2.2 (new) | ≥ 24 × 24 CSS pixels. NOT required by 2.1 AA. |

The design system targets **WCAG 2.1 Level AA**, so no target size criterion is technically required. We document existing dimensions below as conscious decisions, not violations.

## Project component dimensions below 44 × 44

These are intentional, design-driven sizes used by the project. They are **conformant with WCAG 2.1 AA**.

| Component | Variant | Visual size | Adjacent spacing | Notes |
|----|----|----|----|----|
| `mud-button` | `size='lg'` | 48 × 48 | n/a | ✅ Meets AAA 44×44 too |
| `mud-button` | `size='md'` | 32 × 32 | tokens enforce ≥ 8 px gap | Default size; conforms to 2.1 AA |
| `mud-button` | `size='sm'` | 32 × 32 | tokens enforce ≥ 8 px gap | Conforms to 2.1 AA; meets 2.2 AA (24×24) |
| `mud-button` | `size='xs'` | 24 × 24 | tokens enforce ≥ 8 px gap | Conforms to 2.1 AA; **exactly** meets 2.2 AA (24×24) |
| `mud-checkbox` | `size='md'` | 20 × 20 visual; hit area expanded via label wrapper | label provides additional click area | Conforms to 2.1 AA; hit area via label exceeds 24×24 |
| `mud-checkbox` | `size='sm'` | 16 × 16 visual; same label-wrapped hit area | label provides additional click area | Conforms to 2.1 AA |
| `mud-radio-button` | `md` / `sm` | same as checkbox | same as checkbox | Conforms to 2.1 AA |
| `mud-toggle` | — | per Figma | tokens enforce padding | Conforms to 2.1 AA |

**Note on hit areas:** Native HTML controls (`<input type="checkbox">`, `<input type="radio">`) are typically wrapped in a `<label>` that extends the interactive area to the surrounding text. This means the practical click/touch target is much larger than the visual indicator. WCAG 2.5.8 (when applicable) explicitly counts the effective hit area, not the rendered glyph.

## When to upgrade to ≥ 44 × 44

A consumer application can opt into stricter target sizes (WCAG 2.1 AAA or 2.2 AA) by:

1. **Using larger variants** — `mud-button size='lg'` (48×48) for primary actions on touch surfaces.
2. **Wrapping in larger containers** — use generous padding around small interactive elements.
3. **Increasing spacing** — `mud-button-group` and `mud-controls-group` already enforce minimum gaps.

If the **Figma project spec** (node 2753-5965) requires 44×44 for a specific component, that supersedes 2.1 AA — update tokens accordingly and remove the relevant row from this document.

## How to Verify

- `yarn audit:contrast` does not check target size — it is a contrast-only script.
- Storybook a11y addon (axe-core) does NOT enforce 44×44 by default (it follows 2.1 AA). To enable 2.2 AA target-size checks, add `target-size` to the `runOnly` rule list in `.storybook/preview.js`. Currently disabled by design.
- For pixel-perfect Figma checks, inspect `mud-button` height/min-height tokens in `tokens/core/components/button.tokens.json`.

## References

- WCAG 2.1: [2.5.5 Target Size (Enhanced) — Level AAA](https://www.w3.org/TR/WCAG21/#target-size)
- WCAG 2.2: [2.5.8 Target Size (Minimum) — Level AA](https://www.w3.org/TR/WCAG22/#target-size-minimum)
- Skill: [`accessibility-compliance`](../../../.claude/skills/accessibility-compliance/SKILL.md), Section 7 (Project-Specific Addendum)
