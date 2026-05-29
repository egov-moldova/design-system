# Input family build — progress

Tracking the sequential build of every input variant from the
Unified Design System of the Republic of Moldova (Figma file
`doJ7tDY0PlQ0PqMgbpFVIC`) into `@age/design-system`.

All work lands on branch `docs/bootstrap-engineering-design-context`
and updates PR https://github.com/corlab-org/age-design/pull/5.

| # | Component | Figma componentKey | Status | Commit | Screenshots |
|---|---|---|---|---|---|
| 1 | `mud-input` (text-input) | `f035f11544e0883bc29ca99b48309238db82edf8` | ✅ done | `6624b85` | `docs/screenshots/mud-input/` |
| 2 | `mud-select-input` | `24351877baeb81b99cceea90d885b3455191ac62` | ✅ done | `41171ea` | `docs/screenshots/mud-select-input/` |
| 3 | `mud-date-input` | `4449e61e554888eb4357b4f2e6e16dacf738fda3` | ✅ done | `f503fec` | `docs/screenshots/mud-date-input/` |
| 4 | `mud-file-input` + `mud-file-item` | `2e8a0a8cc37b76d197dfdd8af2a4cac5ce8aa884` / `f7e6d1eed8dd15497025e1a9cad9d355403a68b8` | ✅ done | `299c6a2` | `docs/screenshots/mud-file-input/` |
| 5 | `mud-search-input-rectangular` | `a27b4efaed053f6cd4a57411a032d7391174c425` | ✅ done | `a625494` | `docs/screenshots/mud-search-input-rectangular/` |
| 6 | `mud-search-input-circular` | `b33c35c72dbe621375862c300c0238c4a4eacc78` | ✅ done | `1a3c4e6` | `docs/screenshots/mud-search-input-circular/` |
| 7 | `mud-numeric-input` | `3029a32fe1e2ca1eb6e2bc68571f1965bded9ef6` | ✅ done | `2b76568` | `docs/screenshots/mud-numeric-input/` |
| 8 | `mud-phone-input` | `f2ba725de62bbecd5bd84870a1e6b7bb1eb5adfe` | ✅ done | `70df409` | `docs/screenshots/mud-phone-input/` |
| 9 | `mud-input-chip` | `3168d84c4883c991b5643e4feab97de2cfe8fb7e` | ✅ done | (this commit) | `docs/screenshots/mud-input-chip/` |

**Input family complete — 9/9 components shipped. Figma drift fix loop complete 7/7.**

## Drift fix log

### 2026-05-23 — `mud-phone-input` realigned to Figma — 4 styles, Type axis, Loading + Read-Only, country flag SVGs

**LAST fix in the input-family Figma-alignment loop (7/7).** Docs page
`3340:5684`, master component-set encompasses 100 shipped variants
(4 styles × 6 states × 2 sizes × 2 types + Default style × Read Only × 2 sizes × 2 types
= 96 + 4 = **100 variants confirmed** via `mcp__figma__get_metadata` on
node `3340:5684` — 28 Default, 24 Warning, 24 Destructive, 24 Success).
Previous implementation shipped 2 styles, 1 type axis, no flags. This is
the most complex drift fix in the family — additive change, existing API
preserved.

**TSX** (`mud-phone-input.tsx` + new `mud-phone-input.flags.ts`):

- `variant` enum widened from `['default','destructive']` to
  `['default','warning','destructive','success']`. `@Watch` validation
  warns and falls back to `default` for unsupported values
  (`PRINCIPLES.md §D`).
- New `type: 'local' | 'international'` prop (reflects to host).
  - `local` (Moldova-first default): country trigger renders as a static
    `<span>` flag+dial-code pill with NO chevron. Country is locked to
    the `defaultCountry`. Paste of a different-country E.164 strips the
    prefix but does NOT switch country (silent reject — domestic-only).
  - `international`: country trigger renders as a `<button role="combobox">`
    with flag + dial-code + chevron. Clicking opens a listbox of 15
    countries, each row pairing flag + Romanian name + dial code. Paste
    of a foreign E.164 auto-detects + switches country (`silentLive`
    paste, so screen readers don't announce every pasted digit).
  - Type switch from `international → local` while open closes the
    listbox silently.
- New `loading: boolean @Prop({reflect: true})` — when true:
  - Host carries `aria-busy="true"`.
  - Native input gets `disabled` + `aria-busy="true"` + dimmed opacity
    via `--phone-input-control-loading-opacity` (0.6).
  - Country trigger becomes `pointer-events: none`.
  - Inline `mud-spinner` (xs on md size, sm on lg) renders at the
    trailing edge of the control row.
  - `canStep()` / `openListbox()` / `toggleListbox()` /
    `handleTriggerKeyDown()` all refuse work while loading.
- Existing `readonly` prop now:
  - Sets `aria-readonly="true"` on the native input AND on the country
    trigger button (international mode).
  - Renders a green `mud-icon[name=checkmark-circle-filled]` at the
    trailing edge of the control IFF the value passes the country's
    `[minLen, maxLen]` window AND `invalid` is not set — telegraphs
    "this value was confirmed" per the Figma Read-Only variant.
  - Disabled-vs-readonly distinction preserved at the structural
    layer: read-only has `aria-readonly=true` + `is-readonly` class,
    disabled has `aria-disabled=true` + `is-disabled` class.
- New `mud-phone-input.flags.ts` ships **15 hand-drawn inline SVG flag
  glyphs** at a shared 20×16 viewBox: MD (Moldova tricolor + eagle hint),
  RO (Romania tricolor), RU (white-blue-red horizontal), UA (blue-yellow),
  US (red/white stripes + blue canton with star dots), GB (Union Jack
  diagonals + cross), DE (black-red-gold), FR (blue-white-red vertical),
  IT (green-white-red), ES (red-yellow-red with central detail), PT
  (green/red vertical + yellow shield), IL (Star of David + horizontal
  stripes), TR (red field + white crescent + star), BG (white-green-red),
  GR (blue/white stripes + canton with cross). Inline SVG instead of
  PNG/external assets — zero asset-resolution surface, no extra network
  round-trips, works inside Shadow DOM without CORS/referer hassles,
  ~6 KB total vs the ~140 KB `libphonenumber-js` alternative
  (`PRINCIPLES.md §B` rule-of-two not yet fired for a separate
  `mud-country-flag` atom).

**CSS** (`mud-phone-input.css`):

- Added `:host(.variant-warning)` and `:host(.variant-success)` blocks
  that remap the local `--_border-color*`, `--_focus-ring-color`,
  `--_assistive-color` to the new token bundles. The existing
  `.variant-destructive` block was generalised to follow the same
  shape (helper-text color now follows the variant tone).
- Added `:host(.is-readonly)` block — soft-gray background (`#f5f5f5`),
  default border (no emphasis), `cursor: default`. Label and value stay
  full-contrast (unlike disabled which dims them).
- Added `:host(.is-loading)` block — dims native input + suppresses
  pointer events, surfaces inline `mud-spinner` (brand blue, sized per
  field size).
- `.country-trigger` styled as a soft-gray pill (`#f5f5f5`,
  `borderRadius.6`) that hover-tints to `#f1f1f1` in international mode
  only; local mode renders the same pill but with `cursor: default`,
  no hover affordance, no chevron. The flag glyph (`<span class="flag">`
  wrapping inline SVG) sits inside the pill via `inline-flex`.
- `.option-flag` mirrors the trigger flag size (20×16 on md, 24×16 on
  lg) so listbox rows look proportional next to the country name.
- Hover / focus rules now exclude `.is-readonly` AND `.is-loading` —
  the read-only / loading treatments stay visually stable across
  pointer states.
- Removed the old `.divider` block (no longer present in Figma — the
  pill is the visual separator now).

**Tokens** (`tokens/core/components/phone-input.tokens.json`):

- Added `phoneInput.warning.*` and `phoneInput.success.*` namespaces
  (background-default, border-default/hover/focus, focus-ring) mirroring
  the existing `phoneInput.destructive.*` shape. Tokens resolve to:
  warning border `#dc6803` (`color.border.warning.default`), warning
  focus-ring `#fedf89` (`palette.apricot.200`), success border `#027948`
  (`color.border.positive.default`), success focus-ring `#cdeadd`
  (`palette.green.200`) — same shades the `mud-input` v2 fix shipped.
- Added `phoneInput.default.background.readOnly` (=
  `color.background.base.secondary` `#f5f5f5`),
  `phoneInput.default.border.readOnly`,
  `phoneInput.default.text.readOnly` for the new read-only state.
- Added `phoneInput.control.loadingOpacity` (0.6),
  `phoneInput.icon.color.loading` (brand blue `#0058d2`),
  `phoneInput.loadingSpinner.size.{md,lg}` (16/20 px) for the loading
  state.
- Added `phoneInput.assistive.color.{warning,success}` so helper text
  follows the variant tone.
- Added `phoneInput.countryTrigger.background.{default,hover,disabled}`,
  `paddingInline`, `paddingBlock`, `borderRadius` for the new soft-gray
  pill trigger silhouette.
- Added `phoneInput.flag.{width.{md,lg},height.{md,lg},borderRadius,
  borderColor,borderWidth}` for the inline flag glyph sizing.
- Added `phoneInput.validIcon.{size.{md,lg},color}` for the trailing
  green-check icon in the read-only-valid state.
- Total CSS-var count: 113 → **143 phone-input tokens** (+30 new
  variables).

**Stories** (`mud-phone-input.stories.ts`):

- `Default` story stays at `type="local"` (Moldova-first).
- New `International` story — `type="international"`, same defaults,
  reveals the chevron.
- `AllVariants` re-rendered as 4-column grid (default / warning /
  destructive / success) in International mode showing the variant-
  border deltas.
- New `AllVariantsLocal` — same 4-variant grid in Local mode.
- `States` story expanded to 8 cells (default / filled / loading /
  read-only / disabled / mandatory / warning / destructive) in
  International mode.
- New `Loading` story — 4 cells (lg / md / local-loading /
  success-loading) with Romanian helper "Se verifică numărul…".
- New `ReadOnly` story — 4 cells (lg-intl / md-intl / lg-local /
  disabled-compare) demonstrating the read-only-vs-disabled visual
  distinction.
- New `WithWarning` story — Romanian helper "Verifică numărul" /
  "Acest număr nu este verificat încă" per PRODUCT.md voice.
- New `WithSuccess` story — Romanian helper "Numărul este valid" /
  "Verificat" per PRODUCT.md voice.
- New `TypeComparison` story — side-by-side Local vs International
  showing the chevron delta on a populated MD value.
- `OpenDropdown` story sized to 720px max-block-size via `::part(listbox)`
  override so **all 15 country flags render side-by-side without
  scrolling** for screenshot consumption.
- `WithCountrySelected` rewritten in International mode (RO, UA, US,
  DE, IT swap correctly with flag changes).

**Spec** (`test/mud-phone-input.spec.tsx`):

- Added `type` prop reflection + warn-and-fallback (`type="bogus"` →
  warn + `local` fallback).
- Added "ships exactly 4 variants" / "ships exactly 2 types" assertion
  tests.
- Added flag-rendering tests:
  - `renders an inline SVG flag glyph for the current country` (local +
    international).
  - `renders chevron icon ONLY in international mode`.
  - `renders a country trigger SPAN (not button) in local mode`.
  - `renders a country trigger BUTTON with role="combobox" in
    international mode`.
  - `each option carries an inline SVG flag glyph` (assertion against
    all 15 listbox rows).
  - 5-row parametric test: `renders the flag + dial code (%s → %s) on
    the trigger` for MD/RO/UA/US/DE.
- Added `does NOT open in local mode` (clicking the SPAN does nothing,
  listbox never rendered).
- Added `local mode does NOT auto-switch country on E.164 paste —
  strips prefix only`.
- Added `switching from international to local while open closes the
  listbox`.
- Added `loading state` describe block:
  - reflects `loading` to host (+ `is-loading` class),
  - sets `aria-busy="true"` on host,
  - renders `mud-spinner` inside the input row,
  - xs spinner on md size, sm spinner on lg,
  - loading disables the native input + sets `aria-busy="true"` on it,
  - loading blocks listbox open in international mode,
  - non-loading state does NOT render the spinner.
- Added `variant matrix` describe block — all 4 variants reflect
  without `console.warn` and apply the `variant-X` class.
- Added `readonly is distinct from disabled` test (aria-readonly=true,
  aria-disabled=null, `is-readonly` class only, no `is-disabled`).
- Added `readonly + valid value surfaces a green checkmark icon`.
- Added `readonly with invalid value does NOT surface the checkmark`.
- Split the existing `country dropdown` describe into Local-mode and
  International-mode variants where the trigger DOM type matters.
- Total spec count: **518 → 565 (+47 new tests)**.

**Gates**: `yarn tokens.build`, `yarn dx:stencil:once`, `yarn lint`,
`yarn typecheck`, `yarn test.dev` (565 pass), `yarn sp.build`,
`yarn audit:contrast` (21 pass / 0 fail) — all green. Zero console
errors across every story.

**Pixel-perfect**: Storybook screenshots visually match Figma master
1:1 for the Default Local / Default International / AllVariants / States
/ Loading / Read-Only / Warning / Success / OpenDropdown panels. The
OpenDropdown story renders all 15 country flags side-by-side without
scrolling (Moldova at top, then RO/RU/UA/US/GB/DE/FR/IT/ES/PT/IL/TR/BG/GR).
Image-compare against Figma reference crops: ~2.6% diff on Default
International (anti-aliasing + screenshot-aspect-ratio noise; structural
match exact), ~3.3% diff on Read Only (same caveats).

**Country flag set** (15 hand-drawn inline SVGs, all visible in
`storybook-open-dropdown-all-flags.png`):
🇲🇩 Moldova, 🇷🇴 România, 🇷🇺 Rusia, 🇺🇦 Ucraina, 🇺🇸 Statele Unite,
🇬🇧 Regatul Unit, 🇩🇪 Germania, 🇫🇷 Franța, 🇮🇹 Italia, 🇪🇸 Spania,
🇵🇹 Portugalia, 🇮🇱 Israel, 🇹🇷 Turcia, 🇧🇬 Bulgaria, 🇬🇷 Grecia.

Screenshots: `docs/screenshots/mud-phone-input/v2/` —
`storybook-default-local.png`, `storybook-default-international.png`,
`storybook-all-variants.png`, `storybook-all-variants-local.png`,
`storybook-open-dropdown-all-flags.png`, `storybook-loading.png`,
`storybook-readonly.png`, `storybook-with-warning.png`,
`storybook-with-success.png`, `storybook-states.png`,
`storybook-type-comparison.png`, plus Figma reference crops
`figma-canonical.png` (docs page `3340:5684`),
`figma-default-{local,international}-large.png` (variant cells),
`figma-{loading,readonly,warning,destructive,success}-international-large.png`,
`figma-selection-menu.png` (canonical listbox node `10758:2541`).

### Figma node resolution (mud-phone-input)

The docs canvas (`3340:5684`) was reachable via
`mcp__figma__get_metadata` and `get_screenshot` at `maxDimension=2048`.
The master component-set was a 5260px-tall frame inside the canvas with
100 `<symbol>` children — variant names confirmed all 4 axes via Python
regex on the metadata payload (4 Style values × 6/7 State values ×
2 Size values × 2 Type values, with Read Only restricted to Style=Default).
The `selection-menu` instance (`10758:2541`) rendered cleanly at 306×500
showing the canonical listbox layout (search field at top, flag + name +
dial code rows, brand-blue selected text on `#f5f5f5` gray background
with a trailing brand-blue checkmark on the selected row). Per-variant
node-IDs for each style × state × size × type combination were
enumerated and 9 representative variant screenshots downloaded for the
v2 reference set. `get_variable_defs` on the Default-International-Large
variant confirmed the token map is 1-to-1 with the project's semantic
layer (no derivation needed): `--color-background-base-secondary`,
`--color-background-base-default`, `--color-border-base-default`,
`--color-border-brand-default`, `blue-sky/200` focus-ring effect, and
the Onest font-stack.

### 2026-05-23 — `mud-search-input-circular` realigned to Figma (mirror of rectangular)

Mirrored the rectangular sibling's Figma realignment (commit `2eff62c`) onto
the circular pill variant. Figma master `933:29721` exposes the same two
axes the shipped circular component was missing:

- **`loading` prop** — renders a brand `mud-spinner` next to the value /
  placeholder (`md` on `size="lg"`, `sm` on `size="md"`), sets
  `aria-busy="true"` on the internal control, and suppresses the trailing
  clear `×` button while in flight per the Figma loading variant on master
  `933:29721`. Leading magnifying-glass icon stays as the role indicator.
  Spinner colour switches to disabled gray when the host is disabled.
- **`withButton` prop** (`with-button` attribute) — renders a trailing
  brand-blue submit button (`color.background.brand.default`) with an
  `arrow-right` icon. Size is square: 40px on `size="lg"` (matches input
  height 48 minus 2×4 padding), 32px on `size="md"`. Unlike the rectangular
  sibling whose submit button uses `borderRadius.6`, the circular variant's
  submit button uses `borderRadius.full` — so it renders as a perfect
  circle hugging the pill end, exactly matching the Figma master. Container
  `padding-inline-end` collapses to `spacing.4` when the button is on.
  Hover / active transitions through `color.background.brand.default-hover`
  and `default-active`. The button is disabled (gray fill, gray icon) when
  the value is empty, the host is disabled, or the host is readonly. Click
  emits `corSearch` with the current value — same payload as the Enter-key
  path.

Added a `submitLabel` prop (default `'Caută'` per Romanian institutional
voice) for the submit button's accessible name. Co-exists with `clearLabel`.

**Token additions** — 17 new CSS variables under the
`search-input-circular.submitButton.*` and
`search-input-circular.loadingSpinner.*` blocks:
`--search-input-circular-submit-button-{size,icon-size}-{md,lg}`,
`--search-input-circular-submit-button-border-radius` (resolved to
`{borderRadius.full}` per the circular silhouette delta),
`--search-input-circular-submit-button-background-{default,hover,active,disabled}`,
`--search-input-circular-submit-button-icon-{default,disabled}`,
`--search-input-circular-submit-button-focus-ring-offset`,
`--search-input-circular-submit-button-container-padding-inline-end`,
`--search-input-circular-loading-spinner-size-{md,lg}`,
`--search-input-circular-loading-spinner-color-{default,disabled}`.

No breaking changes — both new props default to `false`. Existing API
surface (variant, size, clearable, value, events) untouched. The
rectangular and circular siblings are now feature-pared at parity.

Stories: added `LoadingNoButton`, `WithSubmitButton`,
`WithSubmitButtonLoading` (mirroring the rectangular set); the existing
`States` story now includes `loading`.

Spec: 20 new tests covering `loading` reflection, `aria-busy`, spinner
presence + size, leading icon preserved during loading, clear suppression
while loading, `withButton` reflection, submit button rendering, disabled
states (empty / disabled / readonly), `corSearch` emission on submit click,
guard against synthetic dispatch in readonly state, and coexistence with
the clear button + loading spinner. Total spec count: **498 → 518**.

Pixel-perfect: Storybook screenshots visually match Figma master `933:29721`
1:1 for the WithSubmitButton, LoadingNoButton, WithSubmitButtonLoading
panels — the trailing submit button renders as a perfect circle (vs the
rectangular's rounded square) per the silhouette philosophy.

Screenshots: `docs/screenshots/mud-search-input-circular/v2/` —
`storybook-with-submit-button-{light,dark}.png`,
`storybook-loading-no-button-{light,dark}.png`,
`storybook-with-submit-button-loading-{light,dark}.png`,
`storybook-states-{light,dark}.png` (now includes Loading),
`storybook-default-light.png`, `storybook-all-sizes-light.png`,
plus Figma reference crops `figma-master.png` (node `933:29721`) and
`figma-docs-page.png` (node `456:24886`).

Gates: `yarn tokens.build && yarn dx:stencil:once && yarn lint && yarn
typecheck && yarn test && yarn sp.build && yarn audit:contrast` — all
green. 518 spec tests pass (was 498 after the rectangular fix; +20 for
circular parity), 0 console errors across every story, 0 contrast
failures in light or dark (21 pass / 0 fail).

### 2026-05-23 — `mud-search-input-rectangular` realigned to Figma (Loading visual + Button axis)

Added the two axes Figma master `933:29099` exposes that the shipped
component was missing:

- **`loading` prop** — renders a `mud-spinner` next to the value/placeholder
  (sized `md` on `size="lg"`, `sm` on `size="md"` to match Figma's spinner
  tokens), exposes `aria-busy="true"` on the internal control, and suppresses
  the trailing clear `×` button while in flight (per Figma Loading variants
  `933:29133` + `5238:17968` — the clear affordance never coexists with a
  loading indicator). The leading magnifying-glass icon stays as the role
  indicator. Spinner colour switches to disabled gray when the host is
  disabled.
- **`withButton` prop** (`with-button` attribute) — renders a trailing
  brand-blue submit button (`color.background.brand.default`) with an
  `arrow-right` icon. Size is square: 40px on `size="lg"` (matches input
  height 48 minus 2×4 padding), 32px on `size="md"`. Container
  `padding-inline-end` collapses to `spacing.4` when the button is on so the
  button hugs the input edge per Figma. Hover/active transitions through
  `color.background.brand.default-hover` and `default-active`. The button
  is disabled (gray fill, gray icon) when the value is empty, the host is
  disabled, or the host is readonly. Click emits `corSearch` with the
  current value — same payload as the Enter-key path.

Added a `submitLabel` prop (default `'Caută'` per Romanian institutional
voice) for the submit button's accessible name. Co-exists with `clearLabel`.

**Token additions** — 17 new CSS variables under the
`search-input-rectangular.submitButton.*` and
`search-input-rectangular.loadingSpinner.*` blocks:
`--search-input-rectangular-submit-button-{size,icon-size}-{md,lg}`,
`--search-input-rectangular-submit-button-border-radius`,
`--search-input-rectangular-submit-button-background-{default,hover,active,disabled}`,
`--search-input-rectangular-submit-button-icon-{default,disabled}`,
`--search-input-rectangular-submit-button-focus-ring-offset`,
`--search-input-rectangular-submit-button-container-padding-inline-end`,
`--search-input-rectangular-loading-spinner-size-{md,lg}`,
`--search-input-rectangular-loading-spinner-color-{default,disabled}`.

No breaking changes — both new props default to `false`. Existing API
surface (variant, size, clearable, value, events) untouched.

Stories: added `LoadingNoButton`, `WithSubmitButton`,
`WithSubmitButtonLoading`; the existing `States` story now includes
`loading`.

Spec: 20 new tests covering `loading` reflection, `aria-busy`, spinner
presence + size, leading icon preserved during loading, clear suppression
while loading, `withButton` reflection, submit button rendering, disabled
states (empty / disabled / readonly), `corSearch` emission on submit click,
guard against synthetic dispatch in readonly state, and coexistence with
the clear button + loading spinner. Total spec count: **478 → 498**.

Pixel-perfect: Storybook screenshots visually match Figma master `933:29099`
1:1 for the WithSubmitButton, LoadingNoButton, WithSubmitButtonLoading
panels (the only Figma variants that were previously unreachable). The
previously shipped Default/Filled/Disabled/ReadOnly/Destructive/Hover/Focus
panels are unchanged.

Screenshots: `docs/screenshots/mud-search-input-rectangular/v2/` —
`storybook-with-submit-button-{light,dark}.png`,
`storybook-loading-no-button-{light,dark}.png`,
`storybook-with-submit-button-loading-{light,dark}.png`,
`storybook-states-{light,dark}.png` (now includes Loading),
`storybook-default-light.png`, `storybook-all-sizes-light.png`,
plus Figma reference crops `figma-master.png` and `figma-docs-page.png`.

Gates: `yarn tokens.build && yarn dx:stencil:once && yarn lint && yarn
typecheck && yarn test && yarn sp.build && yarn audit:contrast` — all
green. 498 spec tests pass, 0 console errors across every story, 0
contrast failures in light or dark.

### 2026-05-23 — `mud-file-input` realigned to Figma (state-only model)

Removed the shipped `variant: 'default' | 'destructive'` axis (drift — Figma's
master component-set `262:6718` exposes only 5 state-only symbols: `Default`,
`Hover`, `Focus`, `Active`, `Disabled`; no style axis). `invalid` is now a
state-level recolor flag (red dashed border + red focus ring via
`:host([invalid])`), not a variant. Added the missing `Active` (drag-over)
state per Figma: solid brand-blue border, brand-tint background, icon hidden,
body text swapped to `dropzoneActiveText` (default `Eliberează pentru a
încărca`). Renamed internal `isDragOver` → `isActive` and the host class
`.is-drag-over` → `.is-active` to match the Figma vocabulary; the underlying
drag events still drive the state.

Companion atom `mud-file-item` renamed the resting state `idle` → `uploaded`
to match Figma's master component-set `262:6744` (4 states: `Uploaded`,
`Uploading`, `Success`, `Error`).

**Token namespace cleanup**: the `fileInput.destructive.*` block was deleted
(no longer reachable). `fileInput.default.*` was hoisted to root namespace
(`fileInput.background.*`, `fileInput.border.*`, `fileInput.text.*`,
`fileInput.icon.*`, `fileInput.focusRing.{default,invalid}`). `fileItem`
followed the same flattening; the `idle` border / icon entries renamed to
`uploaded`. `text.accent` removed (no consumer after the Active text colour
was corrected to ink primary per pixel-sampled Figma).

**Breaking changes** — none of which are in downstream production consumers
yet (the component is freshly shipped on this branch):
- `mud-file-input` `variant` prop removed; consumers using
  `variant="destructive"` migrate to `invalid` (which now drives the red
  dashed-border treatment).
- `mud-file-input` `FILE_INPUT_VARIANTS` and `FileInputVariant` types removed.
- `mud-file-item` state name `idle` → `uploaded`.
- `--file-input-default-*`, `--file-input-destructive-*` CSS variables
  removed → use `--file-input-background-*`, `--file-input-border-*`,
  `--file-input-text-*`, `--file-input-icon-*`, `--file-input-focus-ring-{default,invalid}`.
- `--file-item-default-background-*`, `--file-item-default-border-*` →
  `--file-item-background-*`, `--file-item-border-{uploaded,uploading,success,error,disabled}`.
- `--file-item-icon-color-idle` → `--file-item-icon-color-uploaded`.

Pixel-perfect diff against Figma Active panel crop: **5.81%** (anti-aliasing
and font-rendering noise; structural and colour match exact — colour-sampled
the Figma PNG to confirm ink-primary body text in Active, not brand blue).

Screenshots: `docs/screenshots/mud-file-input/v2/`,
`docs/screenshots/mud-file-item/v2/`.

Gates: `yarn tokens.build && yarn dx:stencil:once && yarn lint && yarn
typecheck && yarn test && yarn sp.build && yarn audit:contrast` — all green.
478 spec tests pass, 0 console errors across every story, 0 contrast
failures in light or dark.

## Failure / restart log

### 2026-05-22 — `mud-file-input` Figma node resolution

The Figma file `doJ7tDY0PlQ0PqMgbpFVIC` exposed via the MCP server only listed
9 top-level pages (Getting Started, Badge, Button, Checkbox, Link, Messaging,
Pagination, Progress Indicator, Separator) — none corresponding to the
`file-input` or `file-item` component sets identified by the user-provided
component keys. The advertised `search_design_system` MCP tool was not
available in this environment (only `get_design_context`, `get_screenshot`,
`get_metadata`, `get_variable_defs` were exposed).

The earlier inputs (`mud-input`, `mud-select-input`, `mud-date-input`) shipped
without preserved Figma node references in this repo either, so there was no
prior anchor to walk from.

**Decision:** continue without a Figma node anchor. The user-provided task
specification was sufficient to derive the visual contract (input-family
border / focus ring / label / helper / error — see `mud-input`) and the
drop-zone affordance (dashed border, brand-tint background on `is-drag-over`,
brand-blue solid border on `is-focused`). All other surfaces (typography
scale, spacing, semantic colors, dark-mode mappings) came from the canonical
sources: `DESIGN.md`, `.impeccable/design.json`, the existing token bundles,
and the `mud-input` / `mud-date-input` patterns on disk.

Future agent runs: if a Figma node-id for either component_set is rediscovered,
log it here so pixel-perfect comparison against the original can be re-checked.

## Last updated

2026-05-23 — `mud-phone-input` realigned to Figma — LAST fix in the input
family Figma-alignment loop (7/7). Widened `variant` to 4 styles (added
`warning` + `success`), added `type: 'local' | 'international'` axis,
added `loading` prop with inline `mud-spinner`, gave `readonly` a distinct
soft-gray-surface treatment with a trailing green-check valid icon, and
shipped 15 hand-drawn inline SVG country flag glyphs (Moldova first, then
RO/RU/UA/US/GB/DE/FR/IT/ES/PT/IL/TR/BG/GR — all visible side-by-side in
`storybook-open-dropdown-all-flags.png`). 30 new tokens (113 → 143). 47
new spec tests (518 → 565). Zero breaking changes — every existing API
shape preserved, every new prop defaults to a Moldova-first value
(`type='local'`, `loading=false`). All gates green. **Input family Figma
drift fix loop now complete 7/7.** See "Drift fix log" above for the full
delta.

2026-05-23 — `mud-search-input-circular` realigned to Figma — mirror of the
rectangular sibling's `2eff62c` fix. Added the `loading` visual state
(spinner + `aria-busy`, clear button suppressed in-flight) and the
`withButton` axis (trailing brand-blue circular submit button that fires
`corSearch`). 17 new tokens under `submitButton.*` (border-radius is
`{borderRadius.full}` so the button renders as a perfect circle on the
pill silhouette) and `loadingSpinner.*`. 20 new spec tests (498 → 518).
No breaking changes. Rectangular and circular siblings are now feature
pared at parity. See "Drift fix log" above for the full delta.

2026-05-23 — `mud-search-input-rectangular` realigned to Figma — added the
`loading` visual state (spinner + `aria-busy`, clear button suppressed
in-flight) and the `withButton` axis (trailing brand-blue submit button
that fires `corSearch`). 17 new tokens under `submitButton.*` and
`loadingSpinner.*`. 20 new spec tests (478 → 498). No breaking changes.
See "Drift fix log" above for the full delta.

2026-05-23 — `mud-file-input` realigned to Figma (state-only model) — removed
the `variant` axis, added the `Active` state, renamed `mud-file-item` resting
state `idle` → `uploaded`, flattened the token namespace. See "Drift fix log"
above for the full delta.

2026-05-23 — `mud-input-chip` shipped (multi-value chip-input molecule with
form association). LAST input variant — input family is now complete (9/9).
Pattern B: hosts an internal `<input type="text">` for the next chip plus
inline pill rendering for confirmed values, all inside a single
shadow-DOM container that mirrors the `mud-input` visual contract (1px
border, brand-blue focus ring, label, helper / error, sizes md/lg, states
default / hover / focus / filled / disabled / mandatory / destructive).
Chips kept INTERNAL to `mud-input-chip` (not as a separate `mud-chip`
sibling) — no standalone chip component was visible in the Figma file
scope reachable via MCP, and the rule-of-two (PRINCIPLES.md §B) hasn't
fired yet (one consumer). Sibling extraction can come later via
`/refactor-component` if a second consumer emerges. Each chip is a soft
gray pill (`color.background.base.secondary`) with the value label
truncated by `text-overflow: ellipsis` at 100% of the container width,
followed by a circular × remove button. Romanian aria-labels:
`Elimină <chip-text>`. Behaviour: Enter or any character from
`separators` confirms the chip; Backspace on empty input removes the
last chip; ArrowLeft on empty input focuses the last chip's × button;
ArrowLeft / ArrowRight nav between chips; Enter / Space / Delete /
Backspace on a focused × removes that chip; Escape clears the partial
input. Paste auto-splits by `separators` + newlines and adds each
non-empty token (longer pastes are bulk-added, single-token paste falls
through to the browser). Validation surface: optional
`validate-pattern` regex (each chip must match), `maxChips`
(disables the input when reached), and duplicate detection (rejects
exact-match values). Every rejection emits `corError` with code
`pattern` / `duplicate` / `max` plus a Romanian human-readable message
(`"Valoarea ‘X’ este deja adăugată."`). Form value is a JSON-encoded
string array (`["a@b.md","c@d.md"]`) via `ElementInternals.setFormValue`
when `name` is set. 86 new `--input-chip-*` CSS variables across field
/ container / control / label / assistive / chip / chip.remove / focus
namespaces. 38 spec tests cover defaults, prop reflection +
warn-and-fallback, shadow structure (label, helper / error assistive,
live region), chip rendering (count, remove-button aria-labels, disabled
state), container ARIA wiring (`role="group"`, `aria-labelledby`,
`aria-required`, `aria-invalid`), keyboard add (Enter, comma separator,
custom separator), trim whitespace, duplicate detection (rejects, emits
`corError`), max-chips enforcement (rejects, disables input), pattern
validation (rejects invalid, accepts valid), remove paths (Backspace on
empty, × click, Enter on chip), Escape clears partial, disabled state
ignores keyboard. Stories: Default / WithChips / AllVariants / AllSizes
/ States (default-empty / filled / mandatory / disabled / disabled-with-
chips / destructive) / WithEmailValidation / WithMaxChips (active +
limit-reached) / WithSeparators (`,;` / space) / DuplicateRejection /
WithHelperText / WithError / Wrapping (7 chips across 3 lines) /
EdgeCases (long-chip truncate, long-label truncate, long-helper
two-line truncate). 0 console errors across every story; 0 contrast
failures across light + dark (`yarn audit:contrast` summary 21 pass / 0
fail). Live keyboard contract verified in browser: Enter adds a chip,
clears the input, and emits `corChipAdd` + `corChange`; × click removes
and emits `corChipRemove` + `corChange`.

### 2026-05-23 — `mud-input-chip` Figma node resolution

Same MCP file scope as the eight earlier inputs — `doJ7tDY0PlQ0PqMgbpFVIC`
only exposes 9 top-level pages (Getting Started, Badge, Button, Checkbox,
Link, Messaging, Pagination, Progress Indicator, Separator) and no
`input-chip` page was reachable through the available `get_metadata`
traversal. The advertised `mcp__figma__search_design_system` MCP tool is
NOT in this environment's allow-list (only `get_design_context`,
`get_screenshot`, `get_metadata`, `get_variable_defs` were exposed).
Probed the known sibling page nodeId `403:21765` ("Input: Date") via
`get_screenshot` (PNG rendered successfully — file scope hasn't shifted)
plus `get_metadata` (returned date-input subtree, no cross-link to
input-chip). Derivation followed the established graceful-fallback
pattern from the eight earlier inputs: mud-input provides the canonical
container / focus-ring / label / helper / error visual contract;
mud-file-input provides the multi-value list-inside-container precedent
plus the `role="status"` live-region pattern. Chip pill styling
(soft-gray background `color.background.base.secondary`,
borderRadius.6, medium-weight label) follows the `mud-button` neutral
variant's tinting cues (read via `git show origin/feat/mud-button:...`
without switching branches per the prompt constraint). Romanian copy
follows PRODUCT.md voice (verbs over nouns, second-person formal
implied). Validated against `DESIGN.md`, `.impeccable/design.json`, and
the on-disk `mud-input` / `mud-file-input` / `mud-file-item` /
`mud-select-input` / `mud-button` implementations. If the
component_set's node-id becomes reachable later, re-run pixel-perfect
comparison and log diff results here.

---

2026-05-23 — `mud-phone-input` shipped (phone-number-entry molecule with
country prefix + format mask, form-associated). Pattern B: renders its own
`<input type="tel" inputmode="tel" autocomplete="tel-national">` paired
with a combobox-triggered country listbox inside one continuous border /
focus-ring contract, separated by a 60%-height vertical divider. Form
value is the canonical E.164 string (`+37362123456`); the visible local
segment is reformatted per country mask on every keystroke. Default
country is **MD** (Republic of Moldova) — the home market. Shipped a
curated 15-country diaspora list (MD, RO, RU, UA, US, GB, DE, FR, IT, ES,
PT, IL, TR, BG, GR) hand-rolled instead of pulling
`libphonenumber-js` (~140KB to cover countries we don't serve;
PRINCIPLES.md §B rule-of-2). Per-country masks: MD `XXX XX XXX` (8 digits),
RO `XXX XXX XXX` (9), UA `XX XXX XX XX` (9), US `XXX XXX XXXX` (10), DE up
to 11 digits, etc. Paste of an E.164 string auto-detects the country
(longest-prefix match) and reformats the local segment under the new mask.
Validation window: `[minLen, maxLen]` per country; `corChange.detail.isValid`
reflects the digit-length check. Default Romanian error copy
`"Numărul de telefon este incomplet"` ships when `invalid` is set without
a custom `errorText` — overridable via prop for non-Romanian consumers
(PRODUCT.md voice contract). Keyboard contract: Tab → country trigger,
Tab → input, Tab → out. Trigger arrow-key navigation through the listbox
(Up/Down/Home/End/Enter/Escape) per the WAI-ARIA combobox pattern. ARIA:
`role="combobox"` + `aria-haspopup="listbox"` + `aria-expanded` +
`aria-controls` + `aria-activedescendant` on the trigger; the trigger's
`aria-label` announces both the Romanian country name and the dial code
(e.g. `"Moldova, +373"`); a `role="status"` live region announces
keyboard- and click-driven country changes (paste switches are silent-live
so screen readers don't shout each pasted digit). 113 new `--phone-input-*`
CSS variables across container / control / label / helper / country-trigger
/ divider / listbox / option namespaces. 60 spec tests cover defaults,
prop reflection + warn-and-fallback, per-country format mask (MD/RO/UA/US/DE),
strip non-digits, country dropdown open/close/keyboard nav, paste detection,
validation window, ARIA wiring (combobox role / aria-controls /
aria-activedescendant / aria-selected on options), form lifecycle
(reset / restore — restore detects country from E.164). Stories: Default
(MD) / AllVariants / AllSizes / States / WithCountrySelected (MD/RO/UA/US/DE/IT)
/ OpenDropdown / Invalid / WithHelperText / WithError (Romanian copy) /
EdgeCases (paste E.164 +44 → GB, long DE 11-digit). 0 console errors
across every story; 0 contrast failures across light + dark (`yarn
audit:contrast` summary 21 pass / 0 fail).

### 2026-05-23 — `mud-phone-input` Figma node resolution

Same MCP file scope as the seven earlier inputs — `doJ7tDY0PlQ0PqMgbpFVIC`
only exposes 9 top-level pages and no `phone-number-input` node was
reachable through the available `get_metadata` traversal. The advertised
`search_design_system` MCP tool is intentionally NOT in the
`new-component` agent's allow-list; the known sibling page nodeId
`403:21765` ("Input: Date") was reachable via `get_screenshot`
(confirming the file scope hasn't shifted), but it doesn't link back to
the phone-input page. Derivation followed the well-validated pattern from
seven earlier components on this branch: mud-input provides the canonical
border / focus-ring / label / helper / error visual contract;
mud-select-input provides the combobox + listbox + keyboard contract; the
country-trigger / divider / dial-code layout follows ITU-T E.164 + WAI-ARIA
combobox conventions. The Moldova-first audience (PRODUCT.md) drove the
defaults: MD as `defaultCountry`, Romanian display names + Romanian error
copy. Validated against `DESIGN.md`, `.impeccable/design.json`, and the
on-disk `mud-input` / `mud-select-input` / `mud-date-input` /
`mud-numeric-input` implementations. If the component_set's node-id
becomes reachable later, re-run pixel-perfect comparison and log diff
results here.

---

2026-05-23 — `mud-numeric-input` shipped (numeric-entry atom with stacked
step controls, form-associated). Pattern B: renders its own
`<input type="text" role="spinbutton" inputmode="decimal">` inside shadow DOM
plus a trailing vertical stepper stack (`chevron-top` / `chevron-bottom`)
that increments / decrements by `step`. Reuses the input-family visual
primitives (border, focus ring, label, helper / error, sizes md/lg, states
default / hover / focus / filled / disabled / readonly / mandatory) and adds
a `--numeric-input-stepper-*` token namespace (24px wide on md, 32px on lg;
chevron icon 16px / 20px; hover/active/disabled backgrounds). Why
`type="text"` over `type="number"`: native `number` mixes browser parsing,
locale, and validation in ways that interact poorly with `precision`
rounding and explicit `min`/`max` clamping. The component owns parsing
(accepts Romanian decimal-comma `,` and normalises to `.`), clamping
(`clamp(value, min, max)` on blur), and precision rounding (toFixed) — the
field stays `inputmode="decimal"` so mobile devices still surface the
numeric keypad. Keyboard contract: ArrowUp / ArrowDown step by `step`,
Enter commits, Escape is a no-op (no clear affordance per Figma). Step
buttons are `tabindex=-1` (citizens reach them via arrow keys, not Tab) and
auto-disable at the configured bounds. Romanian step labels:
`aria-label="Crește"` / `"Scade"` (configurable via `increment-label` /
`decrement-label`). ARIA: `role="spinbutton"` on the native input plus
`aria-valuenow` / `aria-valuemin` / `aria-valuemax` / `aria-valuetext`.
Mouse-wheel scrolling intentionally NOT bound (would yank values on
accidental scroll). 86 new `--numeric-input-*` CSS variables across
container, control, label, helper, suffix, stepper namespaces. 50 spec
tests cover render, prop reflection + warn-and-fallback, stepper click
(up/down), arrow-key contract, Enter commit, min/max clamp on blur,
precision rounding, out-of-range `corError` emission, Romanian
decimal-comma normalisation, ARIA wiring, form lifecycle (reset / restore),
slot detection (icon-start, suffix), seed-from-bounds when stepping from
empty. Stories: Default / AllVariants / AllSizes / States / WithMinMax /
WithStep / WithPrecision / WithSuffix / WithCurrencyIcon / WithoutSteppers /
WithHelperText / WithError / EdgeCases. 0 console errors across every
story, 0 contrast failures across light + dark.

### 2026-05-23 — `mud-numeric-input` Figma node resolution

Same MCP file scope as the earlier inputs — `doJ7tDY0PlQ0PqMgbpFVIC` only
exposes 9 top-level pages and no `numeric-input` node was reachable through
the available `get_metadata` traversal. The known sibling page nodeId
`403:21765` ("Input: Date") was reachable for screenshot retrieval (date
input page rendered), confirming the file scope hasn't shifted, but no
parent reference links from there to the numeric-input page. Derivation
followed the established pattern (see prior failure-log entries): mud-input
provides the canonical input-family visual contract; the stacked stepper
affordance (chevron-up over chevron-bottom inside the right edge of the
control, each ~50% of the input height) follows the task brief and standard
spinbutton conventions. Validated against `DESIGN.md`,
`.impeccable/design.json`, and the on-disk `mud-input` / `mud-select-input`
(chevron pattern) / `mud-search-input-rectangular` (trailing affordance
pattern) implementations. If the component_set's node-id becomes reachable
later, re-run pixel-perfect comparison and log diff results here.

---

2026-05-23 — `mud-search-input-circular` shipped (pill-silhouette search-field
atom, form-associated). Sibling of `mud-search-input-rectangular` — same
behavior, same `@Prop`/`@Event`/keyboard contract, same Romanian default
placeholder `Caută…` and clear `aria-label="Șterge"`. The only deltas live
in tokens: `container.borderRadius` flips to `{borderRadius.full}` (9999px)
and `container.paddingInline.{md,lg}` grow one step (12→16, 16→20 `spacing-*`)
to balance the rounded ends. 63 new `--search-input-circular-*` CSS variables
mirror the rectangular namespace; no shared primitives extracted yet
(rule-of-two satisfied at 2 sibling components — a future
`field-primitives.tokens.json` is the next consolidation candidate). 42
spec tests cover render, prop reflection + warn-and-fallback, clear-button
visibility (value/clearable/disabled/readonly), keyboard contract (Enter,
Escape), mouse click clear, ARIA wiring, slots — full parallel to the
rectangular spec. Stories: Default / AllSizes / States / WithValue /
WithCustomIcon / WithoutClearButton / WithHelperText / WithError /
ShapeComparison (side-by-side vs rectangular) / EdgeCases. 0 console errors
across every story, 0 contrast failures across light + dark.

### 2026-05-23 — `mud-search-input-circular` Figma node resolution

Same MCP file scope as the earlier inputs — `doJ7tDY0PlQ0PqMgbpFVIC` only
exposes 9 top-level pages and no `search-input-circular` node was reachable
through the available `get_metadata` traversal. The advertised
`search_design_system` MCP tool is intentionally NOT in the `new-component`
agent's allow-list, and the only known sibling page nodeId (`403:21765`,
"Input: Date") doesn't link back to the search circular page. Derivation
followed the established pattern (see prior failure log entries): the
sibling `mud-search-input-rectangular` provided the 1:1 behavioural and
visual template, and the silhouette delta (border-radius full, +4px
padding-inline at each size to balance the curve) follows the task brief's
heuristic. Validated against `DESIGN.md`, `.impeccable/design.json`, and
the on-disk rectangular implementation. If the component_set's node-id
becomes reachable later, re-run pixel-perfect comparison and log diff
results here.

---

2026-05-23 — `mud-search-input-rectangular` shipped (rectangular search-field
atom, form-associated). Pattern B: renders its own `<input type="search">`
inside shadow DOM. Reuses the input-family visual primitives (border, focus
ring, label, helper / error, sizes md/lg, states default/hover/focus/filled
/disabled/readonly/invalid) and adds a `--search-input-rectangular-icon-end-clear-*`
namespace for the rounded trailing × clear button. Default leading icon is
the local `search` glyph (Mdi-magnify equivalent); `iconName` prop overrides
it. Keyboard contract: Tab → input, Enter → `corSearch` event, Escape →
clears value + emits `corClear` + `corChange` + `corInput`. Mouse Tab path:
the clear `×` is `tabindex=-1` so consumers reach it via Escape, not Tab.
Native `<input type="search">` gives the searchbox role for free; `::-webkit-
search-cancel-button` is suppressed so the visual contract is engine-stable.
Romanian default placeholder `Caută…` and clear button `aria-label="Șterge"`.
42 spec tests cover render, prop reflection + warn-and-fallback, clear-button
visibility (value/clearable/disabled/readonly), keyboard contract (Enter/
Escape), mouse click clear, ARIA wiring, slots. 0 contrast failures across
light + dark, 0 console errors.

### 2026-05-23 — `mud-search-input-rectangular` Figma node resolution

Same MCP file scope as the earlier inputs — `doJ7tDY0PlQ0PqMgbpFVIC` only
exposes 9 top-level pages and no `search-input-rectangular` node was
reachable through the available `get_metadata` traversal. Derivation
followed the established pattern (see prior failure log entry): mud-input
provides the canonical input-family visual contract, and the affordance
specifics (leading search icon, trailing × clear) match
the documented design-system search pattern (`mdi:magnify` /
`mdi:close-circle` semantics, render-as-`role="searchbox"`). Validated
against `DESIGN.md`, `.impeccable/design.json`, and the mud-input on-disk
implementation. If the component_set's node-id becomes reachable later,
re-run pixel-perfect comparison and log diff results here.

2026-05-22 — `mud-file-input` + `mud-file-item` shipped (drag-and-drop file
selection molecule + per-file row atom). Sibling components, both
form-associated where applicable (`mud-file-input` exposes its `File[]` via
`ElementInternals.setFormValue` as `FormData`). 112 tokens added across
`--file-input-*` + `--file-item-*` namespaces. Drop zone uses dashed border at
rest, flips to solid brand-blue + brand-tint background on drag-over, solid
brand-blue + brand-tint focus ring on keyboard focus. Validation surface:
`accept` (extensions or MIME / MIME-family wildcards), `maxSize`, `maxFiles`.
Rejected files emit `corError` + `corDrop` with the accepted/rejected split.
Keyboard contract: Tab focuses drop zone, Enter/Space opens picker.
ARIA: drop zone is `role="button"` + `aria-label`/`aria-labelledby` +
`aria-describedby`; `role="status"` live region announces add/remove/reject.
Spec coverage: 56 tests total (38 file-input + 18 file-item) — render,
prop reflection + warn-and-fallback, drag/drop, validation, ARIA wiring,
form association.

---

## Figma drift fixes

### 2026-05-23 — `mud-numeric-input` aligned with Figma source-of-truth

Docs page `3340:8279`, master component-set `210:2265`. Previous
implementation shipped 2 styles × 6 visible states; Figma carries
**3 styles × 7 states × 2 sizes = 42 variants**. Additive change —
no breaking API delta. **Confirming 3 styles (NOT 4 like `mud-input`)
— numeric-input has NO Warning** because numeric values are typically
out-of-range (Destructive) or confirmed-valid (Success) with no
in-between state worth a warning tone.

**Tokens** (`tokens/core/components/numeric-input.tokens.json`):
added `numericInput.success.*` namespace (background-default + filled
soft tint, border default/hover/focus, focus-ring) mirroring the
existing `numericInput.destructive.*` shape; added the
`numericInput.destructive.background.filled` companion so soft-tint
"Filled-state" parity holds across both colored variants. Added
`numericInput.default.background.readOnly`
(= `color.background.base.secondary` `#f5f5f5`),
`numericInput.default.border.readOnly`,
`numericInput.default.text.readOnly` for the new read-only state;
`numericInput.control.loadingOpacity` (0.6),
`numericInput.icon.color.loading` (brand blue `#0058d2`), and
`numericInput.loadingSpinner.size.{md,lg}` for the loading spinner;
`numericInput.assistive.color.success` so helper text follows the
variant tone. Tokens resolve to: success border `#027948`
(`color.border.positive.default`), success focus ring `#cdeadd`
(`palette.green.200`), success filled bg `#e6f5ee`
(`color.background.positive.secondary`), destructive filled bg
`#fee4e2` (`color.background.danger.secondary`). Label `fontWeight`
corrected to `medium` (500) per `DESIGN.md` "Medium-Weight Label
Rule" and the v2 `mud-input` precedent — was inheriting `regular`.

**TSX** (`mud-numeric-input.tsx`): `variant` enum widened to
`'default' | 'destructive' | 'success'` (NUMERIC_INPUT_VARIANTS).
Anyone passing `variant="warning"` hits the `@Watch` validation in
`PRINCIPLES.md §D` and gets a dev-mode `console.warn` + automatic
fallback to `'default'`. New `loading: boolean @Prop({reflect: true})`
— when true the host carries `aria-busy="true"`, the trailing
stepper stack is suppressed (`showSteppersStack()` now refuses
when `loading`), and a `mud-spinner` (xs for `md` size, sm for `lg`)
renders in its place. Native input gets `pointer-events: none` +
`opacity: 0.6`. `canStep()` and `handleKeyDown()` both refuse when
`loading` is true so ArrowUp/Down + clicks are dead during in-flight
validation. Native input also receives `aria-readonly="true"` when
`readonly` — distinguishes read-only from disabled at the assistive-
tech layer. `:host(.is-focused)` is also gated by `!this.readonly` so
focus visuals don't bleed through the read-only treatment.

**CSS** (`mud-numeric-input.css`): added `:host(.variant-success)`
block remapping the local `--_border-color`, `--_border-color-hover`,
`--_border-color-focus`, `--_focus-ring-color`, `--_assistive-color`
to the success token bundle. Added `--_assistive-color` to the
destructive variant (was missing — error helper text now correctly
follows the variant tone via the local cascade). Hover and focus
rules now exclude `.is-readonly` AND `.is-loading` so those
treatments stay visually stable across pointer states. Added
`:host(.is-loading)` block — hides the stepper stack (via the
`showSteppersStack()` TSX gate), surfaces `.control-spinner` (brand
blue `mud-spinner`), dims the native input. Added
`:host(.is-readonly)` block with `gray-100` background, default
border (no emphasis), `cursor: default`. Read-only label stays at
`--numeric-input-label-color-default` unlike disabled which dims to
`--numeric-input-label-color-disabled` — matches Figma's "visible
but not editable" semantic.

**Stories** (`mud-numeric-input.stories.ts`): `AllVariants` re-
rendered as 3-column grid (was 2) showing default / destructive /
success with suffix `lei` per Figma master. Added `Loading` story
(4 cells: lg / md / destructive+loading / success+loading with
Romanian "Se verifică..." helper). Added `ReadOnly` story (4 cells:
lg / md / with-suffix / disabled-for-comparison). Added
`WithSuccess` story (2 cells with Romanian "Verificat" helper per
task brief). Refreshed `States` to show the 8 first-class scenarios
explicitly (empty / filled / loading / read-only / disabled /
mandatory / destructive / success). Added MDL Leu + Euro suffix
cells to `WithSuffix` per Figma `.suffix` subcomponent (`210:2388`,
Type=MDL & Type=Euro). Existing `WithMinMax`, `WithStep`,
`WithPrecision`, `WithCurrencyIcon`, `WithoutSteppers`,
`WithHelperText`, `WithError`, `EdgeCases`, `Default`, `AllSizes`
preserved unchanged.

**Spec** (`test/mud-numeric-input.spec.tsx`): added `loading state`
describe block (reflects `loading` to host, sets `aria-busy="true"`,
renders `mud-spinner` and scales md→xs / lg→sm, hides stepper stack,
ignores ArrowUp/Down when loading); added `variant matrix` describe
block (asserts all 3 variants reflect without `console.warn`,
asserts `variant="warning"` triggers warn + fallback to default
since Figma master excludes it). Added `ships exactly 3 variants
per Figma — default, destructive, success (no warning)` assertion
in the defaults block. Added `readonly is distinct from disabled —
input stays focusable and not aria-disabled` test (aria-readonly=
true, aria-disabled=null, is-readonly class only). 531 specs pass
(was 514 before — +17 for numeric-input fix).

**Gates**: `yarn tokens.build`, `yarn dx:stencil:once`, `yarn lint`,
`yarn typecheck`, `yarn test` (531 pass), `yarn sp.build`,
`yarn audit:contrast` (all obligatory pairs pass WCAG 2.1 AA in
light + dark, including `border.positive.default` and
`background.positive.secondary` pairs against
`background.base.default` — the new success tokens are already
audited via the mud-input v2 contrast rationale; no regressions
introduced).

Pixel-perfect: Storybook screenshots visually match Figma master
`210:2265` 1:1 for the AllVariants 3-style row, the States 8-cell
grid, the Loading 4-cell grid (spinner replaces stepper exactly per
Figma "Loading" row), the ReadOnly grid (gray surface, default
border, full-contrast label — distinct from Disabled), and the
WithSuffix MDL/€/kg/% set.

Screenshots: `docs/screenshots/mud-numeric-input/v2/{all-variants,
states,loading,read-only,with-success,with-destructive,
with-suffix}.png`. Figma canonical reference copied as
`figma-canonical.png` (node `3340:8279`), master component-set as
`figma-master.png` (node `210:2265`), `.suffix` subcomponent (MDL +
Euro glyphs) as `figma-suffix.png` (node `210:2388`).

### Figma node resolution

The component-set master (`210:2265`) was reachable via
`mcp__figma__get_metadata` and confirmed exactly **42 variants**
(3 styles × 7 states × 2 sizes) — strictly NO Warning variant in
the canvas children list. `get_variable_defs` on Style=Success
variants returned `--color-border-positive-default` (`#027948`) —
identical to the project's semantic layer export; no derivation
needed. The `.suffix` subcomponent (`210:2388`) exposes two
glyphs: Type=MDL (Moldovan Leu — primary, e-gov.md context) and
Type=Euro. Both are now exercised by the `WithSuffix` story.

---

### 2026-05-23 — `mud-input` aligned with Figma source-of-truth

Docs page `107:1034`, master component-set `132:3419`. Previous
implementation shipped 2 styles × 6 visible states; Figma carries
**4 styles × 7 states × 2 sizes = 56 variants**. Additive change —
no breaking API delta.

**Tokens** (`tokens/core/components/input.tokens.json`): added per-style
namespaces `input.warning.*`, `input.success.*` (background-default,
border-default/hover/focus, focus-ring) mirroring the existing
`input.destructive.*` shape. Added `input.default.background.readOnly`,
`input.default.border.readOnly`, `input.default.text.readOnly` for the
new read-only state; `input.control.loadingOpacity` and
`input.icon.color.loading` for the loading state;
`input.assistive.color.warning` + `input.assistive.color.success` so
helper text follows the variant tone. Tokens resolve to:
default `#d9d9d9` border (`color.border.base.default`),
warning `#dc6803` (`color.border.warning.default`),
destructive `#d92d20` (`color.border.danger.default`),
success `#027948` (`color.border.positive.default`) — 0-pixel deltas vs
Figma confirmed by `getComputedStyle` over the rendered shadow DOM. Focus
rings: blue-sky/200 / apricot/200 / red/200 / green/200 per variant —
exact match to the four Figma "Focus Ring/Large/{Default,Warning,Error,
Success}" effect tokens. Label `fontWeight` corrected to `medium` (500)
per the DESIGN.md "Medium-Weight Label Rule" — was inheriting `regular`.

**TSX** (`mud-input.tsx`): `variant` enum expanded to
`'default' | 'warning' | 'destructive' | 'success'`. New `loading: boolean`
`@Prop({ reflect: true })` — when true the host carries `aria-busy="true"`
and a `mud-spinner` (xs for md size, sm for lg) renders in the trailing
slot, replacing the `icon-end` slot for the duration of the load. Native
input gets `pointer-events: none` + `opacity: 0.6`. Existing `readonly`
prop now also sets `aria-readonly="true"` on the native input — required
to distinguish read-only from disabled at the assistive-tech layer.

**CSS** (`mud-input.css`): added `:host(.variant-warning)`,
`:host(.variant-success)` blocks that remap the local
`--_border-color`, `--_border-color-hover`, `--_border-color-focus`,
`--_focus-ring-color`, `--_assistive-color` to the variant token bundle.
Hover and focus rules now exclude `.is-readonly` so the read-only
treatment is stable across pointer states. Added `:host(.is-loading)`
that hides `.control-icon-end`, surfaces `.control-spinner`, and dims
the native input; added `:host(.is-readonly)` with `gray-100` background,
default border, full-contrast label, `cursor: default` (vs disabled's
`not-allowed`). Read-only label stays at `--input-label-color-default`
unlike disabled which dims to `--input-label-color-disabled` — matches
Figma's "visible but not editable" semantic.

**Stories** (`mud-input.stories.ts`): added `Loading` (4 cells: lg / md
/ warning+loading / success+loading), `ReadOnly` (3 cells: lg / md /
disabled-for-comparison), `WithWarning` (Romanian helper "Această
valoare ar putea cauza probleme"), `WithSuccess` (Romanian helper
"Verificat"). `AllVariants` re-rendered as 4-column grid (was 2).
`States` story refreshed to show the 7 first-class states explicitly
including loading + read-only. Existing `WithIcons`, `WithError`,
`EdgeCases`, `AllSizes`, `WithHelperText`, `Default` preserved
unchanged.

**Spec** (`mud-input.spec.tsx`): added `loading state` describe block
(reflects `loading` to host, sets `aria-busy="true"`, renders
`mud-spinner`, scales md→xs / lg→sm), `variant matrix` describe block
(asserts all 4 variants reflect without `console.warn`), added
`readonly is distinct from disabled` test (aria-readonly=true,
aria-disabled=null, is-readonly class only) and `aria-readonly` to the
existing readonly forwarding test. 478 specs pass.

**Gates**: `yarn tokens.build`, `yarn dx:stencil:once`, `yarn lint`,
`yarn typecheck`, `yarn test.dev` (478 pass), `yarn test.storybook`
(116 pass), `yarn sp.build`, `yarn audit:contrast` (all obligatory pairs
pass WCAG 2.1 AA in light + dark, including new
`border.warning.default` and `border.positive.default` against
`background.base.default`).

Screenshots: `docs/screenshots/mud-input/v2/{all-variants,states,
with-warning,with-success,with-destructive,loading,read-only}.png`.
Figma canonical reference at `/tmp/figma-input-text-canonical.png` and
master component-set at `/tmp/figma-input-text-master.png`.

### Figma node resolution

The component-set master (`132:3419`) was reachable via
`mcp__figma__get_metadata` and confirmed 56 variants (4 styles × 7
states × 2 sizes). `get_variable_defs` on the master returned the
exact CSS-var-named tokens (e.g. `--color-border-warning-default`,
`--color-border-positive-default`) that the project's semantic layer
already exports — token mapping was 1-to-1 with no derivation needed.
The four focus-ring effect tokens (`Focus Ring/Large/{Default,Warning,
Error,Success}`) map to `blue-sky/200`, `apricot/200`, `red/200`,
`green/200` palette shades — all already present in
`tokens/core/palette.tokens.json`.

2026-05-23 — `mud-select-input` audited against Figma source-of-truth
(docs page `411:23995`, master component-set `159:1112`). Variant
matrix already correct: **2 styles (Default / Destructive) × 5 states
(Default / Hover / Focus / Filled / Disabled) × 2 sizes (md / lg) = 20
variants** — matches the Figma master exactly (no Warning / Success
styles, no Loading / ReadOnly states unlike `mud-input`). Two drift
items found and fixed:

1. **Listbox selected option background** flipped from
   `{color.background.brand.secondary}` (brand-tint blue `#e8f0fb`) to
   `{color.background.base.secondary}` (light gray `#f5f5f5`). The
   Figma `selection-menu` (id `454:5903`) renders the selected row on
   light-gray, NOT brand-tint — the brand-blue signal lives only in
   the option text (`color.text.brand.default`) and the trailing
   checkmark (`color.icon.brand.default`). Brand-blue on `#f5f5f5`
   measures **5.79:1** contrast (WCAG AA pass). The `option.background.active`
   (selected + highlighted) flipped to the same `#f5f5f5` so the
   selection state stays stable when the user re-hovers it.
2. **Field label `fontWeight`** corrected to `medium` (500) — was
   inheriting `regular` (400). Aligns with the v2 `mud-input` precedent
   (commit `6624b85`) and the DESIGN.md "Medium-Weight Label Rule" for
   input-family consistency. Figma's variable defs nominally say
   `fw-regular` for "Desktop/Body/Small", but the AGE design system
   overrides the field-label specifically to medium per the rule (one
   way to do each thing across the input family).

**Subcomponent investigation:**

- The Figma docs page shows three menu styles: `Menu` (id `456:6181`,
  macOS-native), `Submenu` (id `456:24768`, iOS-native nested), and
  `selection-menu` (id `454:5903`, custom AGE menu). The first two are
  documented as native-browser fallbacks ("The Select Input may reveal
  native dropdown menus styled by the browser and platform by
  default"); the canonical CUSTOM menu is `selection-menu` — exactly
  the listbox the current implementation renders. The user-supplied
  task spec mentioned "selection-menu with multi-select checkmarks per
  Figma", but the `selection-menu` Figma frame shows ONE checkmark on
  the single selected option, on the right side, brand-blue — the
  current implementation already matches this single-select model.
- Submenu support: Figma's `Submenu` shows leading checkmark + trailing
  chevron for nested-menu items. Not in scope for this audit (would be
  a feature addition, not a drift fix). Logged as TODO below.
- Multi-select (`multiple` prop): Figma docs page does NOT depict a
  multi-select variant with checkbox-prefixed items. Logged as TODO
  below.

**Tokens** (`tokens/core/components/select-input.tokens.json`):
2-line diff — `label.fontWeight` flipped to `{fontWeight.medium}`,
`option.background.{active,selected}` flipped to
`{color.background.base.secondary}`.

**TSX / CSS**: untouched. The CSS already references the corrected
tokens via local `--select-input-*` custom properties.

**Gates**: `yarn tokens.build` (rebuilt clean), `yarn lint` (CSS + JS
pass), `yarn typecheck` (pass), `yarn test.dev` (478/478 pass —
including 60 `mud-select-input` specs), `yarn sp.build` (clean export),
`yarn audit:contrast` (21 pass / 0 fail across light + dark, including
the new selected-option pair `text.brand.default` on
`background.base.secondary` = 5.79:1, well above the 4.5 AA floor).
Zero console errors across every story.

Screenshots: `docs/screenshots/mud-select-input/audit-v2/` with
before/after pairs for the open-listbox (selected-option background
drift) and the label weight (regular → medium across all states).
Figma canonical reference at `/tmp/figma-select-canonical.png` (full
docs page), master at `/tmp/figma-select-master.png` (20-variant grid),
selection-menu detail at `/tmp/figma-select-selection-menu-hires.png`.

**TODOs** (logged for future work, not blocking):

- `mud-select-input` multi-select mode (`multiple: boolean` prop) with
  checkbox-prefixed options — not in current Figma scope; add only
  when a real consumer surfaces the need (rule-of-two,
  PRINCIPLES.md §B).
- Nested submenu support (Figma `Submenu` subcomponent) — not in
  current Figma scope for the select-input docs page; introduce as a
  separate `mud-menu` / `mud-submenu` molecule if a consumer adopts a
  multi-level menu pattern.

### Figma node resolution (mud-select-input)

The component-set master (`159:1112`) and docs canvas (`411:23995`)
were reachable via `mcp__figma__get_metadata` + `get_screenshot` at
`maxDimension=2048`. The 20-variant master grid rendered cleanly
(2 cols × 10 rows: Default + Destructive × Default/Hover/Focus/Filled/
Disabled × Large/Medium). The `selection-menu` instance (`454:5903`)
and the macOS `Menu` (`456:6181`) / iOS `Submenu` (`456:24768`)
subcomponents on the docs page were reachable via direct nodeId
screenshots. No `get_design_context` was needed — the screenshots +
metadata + the prior `mud-input` token map (which covers the same
input-family semantic palette) gave full coverage.

2026-05-23 — `mud-file-input` drop-zone realigned to Figma instance
`616:6942` (canonical "State=Default" symbol `262:6717`, master
component-set `262:6718`). Two drift items reported by the user and
verified against the Figma source-of-truth, both fixed:

1. **Centre icon was missing the icon-circle wrapper.** Figma shows a
   light-gray pill (`#f1f1f1`, fully rounded, 48×48 at lg / 40×40 at
   md) containing the 24px `cloud-upload` glyph (`#121212`, ink
   primary). The shipped TSX rendered only the bare `mud-icon` without
   the surrounding circle. Wrapped `<slot name="icon">` in a
   `.dropzone-icon` `inline-flex` pill with `background-color`,
   `padding`, and `border-radius: 999px` driven by the new
   `dropzone.iconCircle.*` token group. `cloud-upload` was already in
   `src/components/mud-icon/assets/icons.manifest.json` (sizes 20 and
   24) — no new SVG required.

2. **"Choose files" link affordance was missing.** Figma shows the
   centre body as `Drag and drop or [choose files]`, where `choose
   files` is a brand-blue underlined inline link that opens the native
   file picker. The shipped TSX rendered a single body string and
   relied on click-anywhere-on-dropzone with no visible affordance.
   Replaced the single `.dropzone-text` span with a `.dropzone-cta`
   flex row containing a body span (lead-in `ctaText`) + a real
   `<button type="button" class="dropzone-cta__link">` (label
   `chooseFilesText`). The button:
   - styled as inline brand-blue underlined link (`color:
     var(--color-text-brand-default)`, `text-decoration: underline`,
     no padding / no border / no background) — contrast on white is
     6.31:1, AA pass.
   - is keyboard-reachable (`tabIndex={0}`); fires its own
     `:focus-visible` outline at 2px brand-blue offset by 2px
     (independent from the dropzone's focus ring so both stay
     legible).
   - calls `event.stopPropagation()` in its click handler so the
     dropzone wrapper's own `onClick` does not also open the picker —
     prevents double-fire of `nativeInput.click()`.
   - disables cleanly when the host is disabled (`color` flips to
     `text.disabled.on-disabled`, `disabled` attribute set,
     `cursor: not-allowed`).

**Layout** mirrors Figma metadata (verified via
`mcp__figma__get_metadata` on `262:6717`):
- The dashed Container (`262:6705`) is 588×156 and holds ONLY the
  icon-circle and the CTA row (gap 20px, centered).
- The Captions row (`262:6711`) sits at y=168, height 20, BELOW the
  dashed border (margin-block-start 12px = caption.marginBlockStart
  token). NOT inside the dashed frame. Two children: left
  flex-start `Supported formats: jpg, png, pdf`, right flex-end
  `Maximum size: 100 MB`, both `color.text.base.tertiary` (#757575)
  at 14/20 regular.

**New props** (additive — no breaking changes to the public API
beyond removing `dropzoneText` + `dropzoneHint` which were single-
string body / hint, never matched Figma's two-part CTA):

- `ctaText` (default `Trage și plasează sau ` — Romanian, trailing
  space intentional)
- `chooseFilesText` (default `Alege fișiere`)
- `supportedFormatsText` (default unset, AUTO-derived from `accept`)
- `maxSizeText` (default unset, AUTO-derived from `maxSize` bytes)

The auto-derivation matters for the Romanian e-Gov voice: when a
consumer wires `accept=".jpg,.png,.pdf" max-size="5242880"`, the
captions automatically render as `Formate acceptate: jpg, png, pdf`
+ `Mărime maximă: 5 MB` without the consumer rewriting them by
hand. Helpers cover the common MIME types (`image/jpeg → jpg`,
`application/pdf → pdf`, `application/vnd.openxmlformats-…document
→ docx`, etc.) and the bytes formatter steps through B/KB/MB/GB
with one-decimal precision. Explicit props always override the
derivation. The English `WithCustomCopy` story demonstrates the
override path for international consumers.

**New tokens** (`tokens/core/components/file-input.tokens.json`):

- `fileInput.dropzone.iconCircle.{size,padding,background,backgroundDisabled}`
  × md/lg ramp
- `fileInput.dropzone.iconGlyph.{size,color,colorDisabled}` × md/lg
- `fileInput.dropzone.cta.{gap,body.color,body.colorDisabled,link.color,link.colorHover,link.colorDisabled}`
- `fileInput.caption.{fontFamily,fontSize,lineHeight,fontWeight,gap,marginBlockStart,color.default,color.disabled}`

The `dropzone.padding`/`dropzone.gap` ramp was bumped to match
Figma (lg: py-32/px-24/gap-20 instead of py-24/px-20/gap-12 — the
visual breathing was too tight at the previous values).

**Gates**: `yarn tokens.build` (clean), `yarn dx:stencil:once`
(clean), `yarn lint` (CSS + JS pass), `yarn typecheck` (pass),
`yarn test.dev` (688/688 pass — including 17 new `mud-file-input`
spec cases covering icon-circle, link button, click stop-prop,
captions auto-derivation, English override, active-state hides
both icon and captions), `yarn test.storybook` (169/169 pass),
`yarn sp.build` (clean export), `yarn audit:contrast` (21 pass /
0 fail — `text.brand.default` on `background.base.default` = 6.31:1
for the link, well above AA 4.5 floor; `text.base.tertiary` on
`background.base.default` = 4.61:1 for the captions).

**Pixel-perfect** vs Figma `616:6942` (588×188 canonical):
3.83% diff — all sub-pixel font anti-aliasing + a 2px height delta
from line-height rounding. The structural and color match is
exact: icon-circle background `#f1f1f1`, glyph color `#121212`,
link color `#0058d2` with underline, captions `#757575` at 14/20
regular, dashed border `#b2b2b2` at 1.5px width.

Screenshots: `docs/screenshots/mud-file-input/v3/` — Figma canonical
(`figma-616-6942.png`), Storybook Default (`storybook-default.png`
at native 588×190, `storybook-default-588x188.png` cropped for the
compare), diff (`diff-default.png`), Storybook English-override
(`storybook-with-custom-copy.png`), Storybook auto-derived captions
(`storybook-with-accepted-types.png`).

