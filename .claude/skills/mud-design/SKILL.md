---
name: mud-design
description: Use when building UI in any project that consumes the MUD Design System (Stencil `mud-*` components via `@egov-moldova/mud`). Triggers on tasks like "build a form", "add a button", "make a card", "show a status", "tabs", "modal", "footer", "loading state", "table row", "list view" — anywhere you might be tempted to write a styled `<div>` or roll a custom UI element. Refuses to invent components when an MUD one fits; surfaces the right `<mud-name>` and shows the import + minimal example.
---

# MUD Design System — Usage Skill

You are working in a project that consumes the **MUD Design System** (`@egov-moldova/mud`). MUD is the brand and visual contract; new patterns get contributed to MUD, not invented downstream.

**Before writing any UI primitive yourself — button, chip, card, tabs, modal, badge, input — check this catalog first.** If an MUD component fits, use it. If none fits, document the gap in the consuming project's `MUD-COMPONENTS.md` (or local equivalent) **and** justify in the PR description why you diverged. "I didn't know it existed" is not a justification.

## Setup contract (consumer-side)

```ts
// once, near app startup (e.g. main.tsx before ReactDOM.createRoot)
import { defineCustomElements } from '@egov-moldova/mud-web-components';
import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/styles.css';

defineCustomElements();
// Optional: defineCustomElements({ assetPath: '/your-prod-asset-path/' })
// In Vite dev hosts the default `/node_modules/@egov-moldova/mud/dist/components/`
// works automatically. See AGE PR #32 for the asset-path mechanism.
```

Tokens are CSS custom properties. Use them in your own CSS:

```css
.my-thing {
  padding: var(--spacing-24);
  border-radius: var(--border-radius-12);
  font-size: var(--font-size-16);
  line-height: var(--line-height-24);
  color: var(--color-text-base-default);
}
```

**Never hard-code** font sizes, spacing, radii, or colors. If you find yourself writing `padding: 14px` or `color: #5d4e8a`, you are violating the contract — pick the nearest token or contribute the missing token upstream.

## Component catalog

Each row lists the React export, what it represents, and when to reach for it. **Pick a component by what the user needs, not by what looks closest.**

### Action

| Component | What it is | When to use |
|---|---|---|
| `CorButton` | Primary action button. Variants `primary`/`secondary`/`strict`/`neutral`/`destructive` × `sm`/`md`/`lg` × `rectangular`/`circular`. Slots for icon-start / icon-end. Supports `loading` state. | Every clickable action. CTAs, form submits, dialog actions, toolbar items. **Never** roll a `<button class="primary">` from scratch. |
| `CorButtonGroup` | Container for related buttons, horizontal or vertical. | Toolbars where buttons are siblings (e.g. Save / Cancel), not for mutually-exclusive choices (use `CorSegmentedControl` or radios). |
| `CorServiceButton` | Large "open service" tile with optional badge slot. Appearance `primary`/`neutral`. | Home-screen action tiles on service portals. **Has semantic weight** — don't use it as a generic card. |
| `CorLink` | Inline or standalone link. Variants, underline rules, external-indicator. | Every `<a>` that isn't a button. Internal nav, external references, "learn more". |

### Form input

| Component | What it is | When to use |
|---|---|---|
| `CorInput` | Text input with label, helper text, error state, optional icons, variants. | Any plain text field. Names, identifiers, references. |
| `CorNumericInput` | Numeric input with optional steppers, min/max/step/precision. | Quantities, money, counts. **Not** for numeric codes (use `CorInput` to preserve leading zeros). |
| `CorTextarea` | Multi-line text input with optional character counter. | Long-form text — comments, justifications, reasons. |
| `CorPhoneInput` | Phone field with country selector and masking. | Phone numbers. Never hand-roll masking. |
| `CorDateInput` | Date entry field (typed input, no calendar). | Date fields without picker. |
| `CorDatePicker` | Calendar picker (single date or range). | Date fields with picker, range selection (e.g. report interval). |
| `CorSelectInput` | Dropdown with options array. | Single-select dropdowns. Language switchers, scope selectors. |
| `CorCheckbox` | Tri-state checkbox (`checked` / `indeterminate` / unchecked). | Boolean form fields, bulk-select-all on tables. |
| `CorRadio` | Single radio (use a group via `name` for mutually-exclusive choice). | Mutually-exclusive choice from a small set. |
| `CorSwitch` | On/off toggle. | Settings toggles. **Not** for form fields that need a submit step — use `CorCheckbox`. |
| `CorFileInput` + `CorFileItem` | File picker with drop zone + per-file display (idle/loading/error/done). | Uploads. Excel imports. Documents. |
| `CorSearchInputRectangular` | Search input shaped like a form field. | Search bars in lists, tables, filter rails. |
| `CorSearchInputCircular` | Search input shaped as a pill. | Top-nav search, hero search. |
| `CorInputChip` | Input that converts entries to chips on `Enter` or separator. | Tag entry, comma-separated values, "type and tag". |
| `CorSegmentedControl` | Mutually-exclusive segments. | Small choice with ≤4 options where dropdown feels heavy. Time-range toggles, density toggles. |

### Navigation

| Component | What it is | When to use |
|---|---|---|
| `CorTabs` + `CorTab` | Tablist with ARIA + keyboard + overflow handling. | Top-level page nav, sub-section switching, detail-view tabs. Use one `CorTabs` per group; nest panels via named slots `panel-{value}`. |
| `CorBreadcrumb` + `CorBreadcrumbItem` | Hierarchical trail with separators + responsive collapse. | Multi-level pages: List → Detail → Edit. |
| `CorPagination` | Page navigator with prev/next + sibling/boundary controls. | Tables and lists with paged data. Connect to your data loader. |

### Display

| Component | What it is | When to use |
|---|---|---|
| `CorTable` | Data table with sort, select, hover, configurable header/row styles. | Every list view with structured rows. **Don't** roll a `<table>` by hand. |
| `CorTag` | Static label (neutral / semantic variants like positive/danger/warning/info). | Status badges on table rows. State markers next to inline content. |
| `CorChip` | Compact pill — `type="filter"` (toggle, emits `corSelect`) or `type="input"` (static value, optionally `removable`). | Active-filter chips on a filter rail. Role chips, tag tokens, removable selections. |
| `CorBadge` | Tiny count or dot on icons / nav items. | Notification beacon on nav items. Unread counts. |
| `CorAvatar` | Initials, image, or icon avatar. Sizes from xs to lg. | User menus, audit logs, comment authors. |
| `CorIcon` | Token-driven SVG icon resolved by registry name. | Anywhere you'd want an inline SVG. **Never inline SVG** in app code; never use PNG icons. |
| `CorLogo` | Brand-mark SVG by service name (`mpass-logo-with-name`, `mpay-…`, `mconnect-…`, `msign-…`, etc.). | Logo lockups for AGE-family services. **Not** for arbitrary brand assets — use `<img>` for those. |
| `CorSeparator` | Horizontal / vertical divider with variants and optional label. | Section breaks. Always prefer over hand-rolling `border-top`. |
| `CorReceipt` | Pre-shaped financial receipt card (sender, recipient, amount, QR, actions). | Payment outcomes, settlement summaries. |
| `CorAccordion` + `CorAccordionItem` | Disclosure list (single or multi-open). | Collapsible filters, FAQ, "show more" sections. |

### Feedback

| Component | What it is | When to use |
|---|---|---|
| `CorNotification` | Inline status (info / positive / warning / danger / neutral × subtle / strong, optional close). | Banners. Toast-like inline messages. Row-level errors. Save-confirmation feedback. |
| `CorSpinner` | Loading spinner with size / variant / label. | Async actions when `CorButton`'s built-in `loading` state isn't enough. |
| `CorProgressTracker` | Multi-step progress (horizontal / vertical, interactive). | Multi-step forms. Long-running jobs (bulk uploads). |
| `CorTooltip` | Hover / focus tooltip with position + size + variant. | Affordance hints. Use sparingly — if information is mandatory, use a real label. |
| `CorModal` | Modal dialog with sizes, variants, destructive flag, multiple slots. | Save confirmations. Destructive confirms. Justification prompts. |
| `CorCookieBanner` | Opinionated cookie / consent banner. | Public surfaces that need statutory consent. Don't roll your own. |

### Chrome (page-level)

| Component | What it is | When to use |
|---|---|---|
| `CorFooter` | Full eGov footer. Variant `simple` (single-line copyright + accessibility) or `evo` (sections, contact, social, partners, locale switcher). | Every page-level footer. Pass `variant="evo"` for public surfaces; `simple` for app shells. |

## How to investigate a component

Each component lives at `src/components/<name>/`:

- `<name>.tsx` — implementation (read `@Prop`, `@Event`, slots, lifecycle)
- `<name>.types.ts` — variant unions, public types, defaults
- `<name>.stories.ts` — Storybook examples; the canonical "how to use it" reference
- `readme.md` — auto-generated prop tables

In React: use the components directly from `@egov-moldova/mud-web-components` (see vanilla usage) or the dedicated `@egov-moldova/mud-react` package (if available). Events become `onMud<Event>` props; their payload is the Stencil `EventEmitter` detail.

Live Storybook: `yarn storybook` in age-design (port 6007). Look at stories before writing wrappers.

## Common traps (don't do these)

1. **Hand-rolling a button.** `<button class="primary">` is a code smell. `CorButton`.
2. **Hand-rolling a tab strip.** `<nav><a class="active">` is a code smell. `CorTabs` + `CorTab` with `value`/`onCorChange`.
3. **Hand-rolling a chip / tag.** `<span class="badge">` is a code smell. `CorChip` (interactive / toggleable) or `CorTag` (static).
4. **Inline SVGs.** `<svg>...</svg>` in JSX is a code smell. `CorIcon name="…"` resolves from the registry.
5. **Hard-coded sizes / spacing / colors.** `padding: 16px` is a contract violation. `padding: var(--spacing-16)`.
6. **Bypassing `defineCustomElements`.** Every AGE component depends on the registration call.
7. **Styling AGE component internals from outside.** Beyond what `::part(…)` exposes, you can't. If you can't theme it, ask AGE to expose the part — don't `!important` your way in.
8. **ICU plurals in i18n strings.** AGE-consuming apps typically use `FormatSimple`. Use two keys (`*_none` + `*_count`) until consumers explicitly enable `FormatIcu`.
9. **Inventing a "card" with `CorServiceButton`.** ServiceButton has semantic weight (it's a service-tile). For neutral content cards, build a local composite and propose `CorCard` upstream.
10. **Using `CorLogo` for non-AGE-family brands.** It only resolves `mpass`/`mpay`/`mconnect`/`mdelivery`/`mdocs`/`mlearn`/`mlog`/`mnotify`/`mpower`/`msign`/`mcloud`. For your own brand, use `<img>` to a project-local SVG/PNG.

## Adding a missing component

If the gap is genuine:

1. **Document it** in the consumer's `AGE-COMPONENTS.md` (or local equivalent), with: name of the local composite, why it exists, whether it's an upstream candidate.
2. **Justify in the PR description** — what AGE component you considered and rejected, and why.
3. **Open an issue / PR upstream in age-design** to propose the component. Local composites should be temporary unless they're truly project-specific domain logic.

## Reference (per-component deep dives)

For deeper guidance on individual components — variant tradeoffs, accessibility contracts, edge cases — see [`reference/`](reference/) (per-component pages will be added as patterns emerge).

## Maintenance

- Update this skill whenever AGE ships a new component or significantly changes an existing one.
- Don't let it drift — when a `Cor<New>` lands in `src/components/`, add a row in the appropriate category table.
- When a consumer-side composite is promoted to AGE, remove its row from the consumer's Gaps section and link to the AGE PR.
