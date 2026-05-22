---
name: AGE Design System
description: The visual substrate of the Moldovan e-Government ecosystem — calm, civic, exact.
colors:
  primary-brand: "#0058d2"
  primary-brand-hover: "#0046a8"
  primary-brand-active: "#00357e"
  primary-brand-tint: "#e8f0fb"
  primary-brand-tint-hover: "#ccdef6"
  visited-magenta: "#aa18ce"
  positive: "#039855"
  positive-tint: "#e6f5ee"
  warning: "#fdb022"
  warning-tint: "#feefc6"
  danger: "#d92d20"
  danger-strong: "#b32318"
  danger-tint: "#fee4e2"
  ink-primary: "#121212"
  ink-secondary: "#383838"
  ink-tertiary: "#757575"
  ink-disabled: "#b2b2b2"
  surface-canvas: "#ffffff"
  surface-secondary: "#f5f5f5"
  surface-tertiary: "#f1f1f1"
  surface-inverse: "#1e1e1e"
  border-default: "#d9d9d9"
  border-strong: "#121212"
typography:
  display:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: "56px"
    letterSpacing: "normal"
  headline:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "36px"
    letterSpacing: "normal"
  title:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "normal"
  body:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "normal"
  label:
    fontFamily: "Onest, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  "4": "4px"
  "6": "6px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "32": "32px"
  "40": "40px"
  "48": "48px"
  "56": "56px"
  "64": "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary-brand}"
    textColor: "{colors.surface-canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-brand-hover}"
    textColor: "{colors.surface-canvas}"
  button-primary-active:
    backgroundColor: "{colors.primary-brand-active}"
    textColor: "{colors.surface-canvas}"
  button-secondary:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-strict:
    backgroundColor: "{colors.ink-primary}"
    textColor: "{colors.surface-canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-destructive:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface-canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-outlined-primary:
    backgroundColor: "transparent"
    textColor: "{colors.primary-brand}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-text-primary:
    backgroundColor: "transparent"
    textColor: "{colors.primary-brand}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
---

# Design System: AGE Design System

## 1. Overview

**Creative North Star: "The Civic Counter"**

The system is the digital equivalent of a calm, well-lit counter in a modern public service office. Every surface is recognisable. Every label is in its expected place. Every interaction tells you exactly what just happened and what comes next. The institution is present in the page, not as a flag or a seal, but as a felt sense of order and restraint.

This is service software, not marketing. The visual language is deliberate and small: one font (Onest), one institutional blue (`#0058d2`) used sparingly as primary CTA weight, a single 8pt rhythm, soft ambient shadows, and motion that exists only to confirm state changes. The system rejects the SaaS-landing reflex and the bureaucratic-form reflex in equal measure. It does not look like a startup; it does not look like a 1998 government form. It looks like a well-designed modern public utility that respects the citizen's time.

Every choice here serves the Moldovan e-Government ecosystem — MPay, MPass, MSign, MPower, MDelivery, and the FOD front-office portal — so a citizen who learns one service has already learned the rest.

**Key Characteristics:**
- Restrained color: one brand blue, used on ≤10% of any screen.
- Single typeface (Onest) across the entire system; hierarchy through weight and size, never through font swap.
- Generous spacing on an 8pt rhythm with 4pt and 6pt micro-steps for inline composition.
- Soft ambient elevation (low-alpha shadows under `rgba(40, 46, 55, 0.04–0.06)`); never directional, never dark.
- Romanian-first voice with multilingual headroom (±20% string growth, full diacritic support).
- WCAG 2.1 AA is the floor, enforced by the audit pipeline.

## 2. Colors

The palette is grouped by role. The brand carries one voice; semantic colors (positive, warning, danger) carry only state.

### Primary
- **Institutional Blue** (`#0058d2`, palette `blue-sky.600`): the brand. Primary CTAs, brand icon fills, focus indicators, active link state. Used rarely on purpose — its rarity is the signal.
- **Institutional Blue Hover** (`#0046a8`, `blue-sky.700`): hover on filled primary surfaces.
- **Institutional Blue Active** (`#00357e`, `blue-sky.800`): active/pressed on filled primary surfaces.
- **Institutional Blue Tint** (`#e8f0fb`, `blue-sky.100`): selected/active row backgrounds, soft brand surfaces, hover tint on text/outlined buttons.

### Secondary
- **Visited Magenta** (`#aa18ce`, `magenta.600`): visited links and visited brand icons only. A deliberate departure from blue that tells the citizen they've been here before.

### Tertiary (semantic state)
- **Civic Green** (`#039855`, `green.600`): positive state — success, completion, valid input.
- **Civic Apricot** (`#fdb022`, `apricot.400`): warning state — caution, slow path, needs review.
- **Civic Red** (`#d92d20`, `red.600`) / **Strong Red** (`#b32318`, `red.700`): danger state — error, destructive action, failed submission.

### Neutral
- **Ink** (`#121212`, `black.1000`): primary text, strict-variant button background.
- **Ink Secondary** (`#383838`, `gray.700`): secondary text, label text.
- **Ink Tertiary** (`#757575`, `gray.400`): supporting text, placeholders.
- **Ink Disabled** (`#b2b2b2`, `gray.300`): disabled text, disabled icon.
- **Surface Canvas** (`#ffffff`): default page surface.
- **Surface Secondary** (`#f5f5f5`, `gray.100`): card and panel surfaces, neutral button fill.
- **Surface Tertiary** (`#f1f1f1`, `gray.200`): nested panel surfaces, disabled button fill.
- **Surface Inverse** (`#1e1e1e`, `gray.900`): inverse surfaces for dark contexts.
- **Border Default** (`#d9d9d9`, `gray.250`): default field and divider borders.
- **Border Strong** (`#121212`): emphasis borders, focus outline base.

### Named Rules

**The One Brand Blue Rule.** Only `#0058d2` carries primary CTA weight. Secondary buttons take gray; "strict" emphasis takes black; destructive takes red. Brand blue is never used decoratively — no blue heros, no blue icons "for fun". If brand blue covers more than 10% of any screen, the screen is wrong.

**The Visited Magenta Rule.** Visited links and visited brand-icon states flip to `#aa18ce`. This is the only sanctioned use of magenta in the system. Magenta is not a brand color and may not be used as a CTA, accent, or decoration.

**The No Pure Black or White Surface Rule.** Body text is `#121212`, not `#000`. Backgrounds are `#ffffff` in the canvas role only; all other surfaces step into the warm-gray ramp. The system avoids the optical harshness of `#000`/`#fff` against each other.

## 3. Typography

**Display Font:** Onest (with `system-ui, -apple-system, Segoe UI, sans-serif` fallback)
**Body Font:** Onest (same stack)
**Label/Mono Font:** Onest (one family, no mono fallback)

**Character:** Onest is a contemporary geometric sans with high x-height and unambiguous letterforms — purpose-built for screen reading at small sizes and across Latin diacritic sets (ă, â, î, ș, ț for Romanian; Cyrillic support for Russian). It carries authority without weight, neutrality without coldness. The system uses one family across every surface; hierarchy comes from size and weight, never from font swap.

### Hierarchy

- **Display** (semibold 600, 48px / 56px line-height): hero headings on landing/service-entry pages, top of major service flows. Use once per page.
- **Headline** (semibold 600, 28px / 36px): section headers inside a service flow, modal titles.
- **Title** (semibold 600, 20px / 28px): card titles, form-section labels, table column headers.
- **Body** (regular 400, 16px / 24px): main reading copy. Cap line length at 65–75ch where applicable.
- **Body Small** (regular 400, 14px / 20px): supporting copy, dense table rows, helper text.
- **Label** (medium 500, 14px / 20px on sm+md buttons; 16px / 24px on lg buttons): control labels, button text, field labels. Medium weight — never bold, never regular — is the contract.

### Named Rules

**The Single Onest Rule.** Onest is the only font face in the system. No serif accent, no monospace block, no display contrast font. Hierarchy is created with the four weights (400 regular, 500 medium, 600 semibold, 700 bold) and the type scale.

**The Medium-Weight Label Rule.** All interactive controls — buttons, segmented controls, tabs, chips — render their text label in `fontWeight: 500` (medium). Bold (700) is reserved for emphasis inside body copy. Regular (400) is for prose only.

**The 65–75ch Body Rule.** Long-form body text is capped at 65–75 characters per line. Service-flow body copy that exceeds this breaks the calm reading rhythm.

## 4. Elevation

Elevation is used **sparingly and ambiently**. The system is flat by default. Shadows appear only to lift a transient layer above its parent (popovers, dropdowns, modals, raised cards in a list). Shadows are always soft, low-alpha, and non-directional; they suggest the presence of a surface above without drawing attention to themselves.

The system does not use directional shadows ("light from above" with a hard offset), bevels, or any decorative depth treatment.

### Shadow Vocabulary

- **Elevation 100** (`box-shadow: 0px 2px 8px 0px rgba(19,22,29,0.06), 0px 4px 8px 1px rgba(19,22,29,0.04)`): hover lift on resting cards; subtle hint of interactivity.
- **Elevation 200** (`box-shadow: 0px 4px 8px 2px rgba(40,46,55,0.06), 0px 2px 4px 0px rgba(40,46,55,0.04)`): dropdown menus, popovers, tooltips when shown.
- **Elevation 300** (`box-shadow: 0px 8px 12px 4px rgba(40,46,55,0.06), 0px 2px 4px 0px rgba(40,46,55,0.06)`): floating action elements, sticky toolbars when scrolled.
- **Elevation 400** (`box-shadow: 0px 12px 16px 6px rgba(40,46,55,0.06), 0px 4px 6px 0px rgba(40,46,55,0.06)`): modal cards, side sheets.
- **Elevation 500** (`box-shadow: 0px 16px 20px 6px rgba(40,46,55,0.06), 0px 4px 8px 0px rgba(40,46,55,0.06)`): full-screen overlays, command palettes, image previews.

### Named Rules

**The Ambient Shadow Rule.** Every shadow in the system uses low-alpha values between `0.04` and `0.06` against blue-tinged dark base colors (`rgba(19,22,29)` and `rgba(40,46,55)`). Shadows never reach `0.10` or higher. They are felt, not seen.

**The Flat-By-Default Rule.** Surfaces at rest are flat. Elevation is a response to state — a popover opening, a card lifting on hover, a modal appearing — never a static stylistic choice. If a card has a shadow in its default state and you cannot articulate why, remove the shadow.

## 5. Components

The system is intentionally small. As of this DESIGN.md, the inventory is five atoms and one molecule, each with a tight contract. New components join only when the existing primitives cannot compose the use case.

### Buttons (`cor-button`)

- **Shape:** rectangular by default (`rounded.sm` = 6px for sm/md, `rounded.md` = 8px for lg). Circular variant exists for icon-only floating actions (`rounded.full` = 9999px).
- **Sizes:** `sm` (32px height, 14px label), `md` (40px height, 14px label), `lg` (48px height, 16px label). Minimum width is the touch target — never narrower than 40px at md.
- **Variants:** `primary` (institutional blue fill), `secondary` (gray fill, neutral emphasis), `strict` (black fill, strong emphasis), `neutral` (light gray, subdued), `destructive` (civic red fill).
- **Appearances:** `filled` (default), `outlined` (1.5px border, transparent fill at rest; hover/active converge to filled), `text` (no border, transparent fill at rest, tinted hover/active background). Outlined and text only support primary/strict/destructive; other variants fall back to primary with a dev-time `console.warn`.
- **States:** default → hover → active → focus-visible → disabled → loading. Focus indicator uses brand blue at 1.5px outline plus 2px offset; visible against every surface.
- **Hover / Focus:** 150ms `ease-out` transition on background, border, and label color. No transform, no scale, no shadow change.
- **Loading:** centered `cor-spinner` (xs on sm, sm on md/lg) replaces label; `aria-busy="true"`, control remains in tab order but does not fire activation.
- **Icon-only:** square footprint, equal padding, `slot="icon"`, requires `label` prop for screen readers.

### Button Group (`cor-button-group`)

- **Horizontal** (default) or **vertical** orientation; `full-width` mode distributes children equally across the container.
- **Label slot** at the top of vertical groups for form composition.
- **Sizing:** children may mix sizes, but the group does not normalize them — the consumer chooses.

### Icons (`cor-icon`)

- **Sizes** match the 8pt scale; default 20px (matches md button label).
- **Color** inherits via `currentColor`; never carries hardcoded fill.
- **Source** is the curated local SVG library (`src/assets/images/icons`), pre-processed by `yarn svg:icons` to strip size and fill.

### Logo (`cor-logo`)

- **Brand set:** `mpay`, `mpass`, `msign`, `mpower`, `mdelivery` — one component per Moldovan e-Government service.
- **Variants:** `logomark-only`, `with-name`, `with-long-name-medium`, `with-long-name-large`, `with-verb`. The `with-verb` variant pairs the wordmark with its Romanian-language service verb (`plătește`, `loghează-te`, `semnează`, `împuternicește`, `solicită și primește`).
- **Color:** the institutional blue is baked into the SVG path; the logo is not recolorable.

### Service Button (`cor-service-button`)

- **Purpose:** entry-point tile for one of the five `mpay`/`mpass`/`msign`/`mpower`/`mdelivery` services from a portal landing page.
- **Composition:** logo + verb + optional description, on a tinted-brand surface (`primary-brand-tint` background, `primary-brand` typography).
- **Appearance:** larger than a button, smaller than a card; sits between the two in the hierarchy.

### Spinner (`cor-spinner`)

- **Variants** carry tone (`brand`, `neutral`, `on-color`); never used for decoration.
- **Sizes** align to surrounding components: `xs` inside a `sm` button, `sm` inside `md`/`lg` buttons, `md`+ for page-level loading.

### Inputs / Fields (not yet implemented)

The component inventory will grow. When inputs land:
- **Style:** 1px `border-default` stroke, `rounded.sm` (6px), `surface-canvas` fill, 16px body type.
- **Focus:** 1.5px `border-strong` plus 2px offset focus ring in brand blue.
- **Error:** border flips to `danger`, helper text turns `danger-strong`, leading icon stays neutral.

### Navigation (not yet implemented)

When implemented, navigation follows the same restraint: medium-weight labels, ambient hover background tint, brand blue only on the active item, no large color blocks.

## 6. Do's and Don'ts

### Do:

- **Do** use Institutional Blue `#0058d2` only as primary CTA, brand icon fill, or focus indicator; cap its coverage at ≤10% of any screen.
- **Do** render all control labels in Onest at `fontWeight: 500` (medium).
- **Do** keep buttons on the three-size scale (32 / 40 / 48px). Do not invent a 36px or 44px button to fit a layout.
- **Do** use 1.5px borders for outlined buttons; never 1px (looks fragile) or 2px (looks heavy).
- **Do** use the 150ms `ease-out` transition for every interactive state change. Consistency in motion is part of the brand.
- **Do** keep shadows ambient: low-alpha (`0.04–0.06`) and non-directional. Use them only on transient lifted layers.
- **Do** write copy in Romanian first, second-person formal, verbs over nouns, no exclamation marks.
- **Do** plan for ±20% string growth (Russian / English translations) and full Romanian diacritics (`ă â î ș ț`).
- **Do** validate every new color pair with `yarn audit:contrast` against the WCAG 2.1 AA threshold, in both light and dark themes.

### Don't:

- **Don't** use brand blue decoratively — no blue heros, no blue accent stripes, no blue icons "for fun".
- **Don't** introduce a second font. Onest is the only typeface.
- **Don't** use `#000` for text or `#fff` against `#000`. The ink is `#121212`; surfaces step into the warm-gray ramp.
- **Don't** ship SaaS-landing aesthetics: gradient heros, "Sign up free" CTAs, glassmorphism cards, hero-metric templates.
- **Don't** ship admin-template aesthetics: Bootstrap-default forms, hardcoded sidebars, gray-on-white density without rhythm.
- **Don't** mimic Material You, iOS, or Liquid Glass language. These belong to other vendors' identities.
- **Don't** use directional shadows, bevels, or any decorative depth treatment.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored side stripe on cards, list items, callouts, or alerts. Rewrite with full borders, background tints, or leading icons.
- **Don't** use `background-clip: text` gradient text. Emphasis comes from weight and size.
- **Don't** animate layout properties (`width`, `height`, `top`, `left`). Transform and opacity only.
- **Don't** add a button variant that looks different without behaving different. One way to do each thing.
- **Don't** put a shadow on a resting card. Shadows are a state response, not a default style.
- **Don't** use em dashes in UI copy. Use commas, colons, semicolons, periods, or parentheses.
