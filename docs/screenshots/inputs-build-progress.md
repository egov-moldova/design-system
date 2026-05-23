# Input family build — progress

Tracking the sequential build of every input variant from the
Unified Design System of the Republic of Moldova (Figma file
`doJ7tDY0PlQ0PqMgbpFVIC`) into `@age/design-system`.

All work lands on branch `docs/bootstrap-engineering-design-context`
and updates PR https://github.com/corlab-org/age-design/pull/5.

| # | Component | Figma componentKey | Status | Commit | Screenshots |
|---|---|---|---|---|---|
| 1 | `cor-input` (text-input) | `f035f11544e0883bc29ca99b48309238db82edf8` | ✅ done | `6624b85` | `docs/screenshots/cor-input/` |
| 2 | `cor-select-input` | `24351877baeb81b99cceea90d885b3455191ac62` | ✅ done | `41171ea` | `docs/screenshots/cor-select-input/` |
| 3 | `cor-date-input` | `4449e61e554888eb4357b4f2e6e16dacf738fda3` | ✅ done | `f503fec` | `docs/screenshots/cor-date-input/` |
| 4 | `cor-file-input` + `cor-file-item` | `2e8a0a8cc37b76d197dfdd8af2a4cac5ce8aa884` / `f7e6d1eed8dd15497025e1a9cad9d355403a68b8` | ✅ done | `299c6a2` | `docs/screenshots/cor-file-input/` |
| 5 | `cor-search-input-rectangular` | `a27b4efaed053f6cd4a57411a032d7391174c425` | ✅ done | `a625494` | `docs/screenshots/cor-search-input-rectangular/` |
| 6 | `cor-search-input-circular` | `b33c35c72dbe621375862c300c0238c4a4eacc78` | ✅ done | `1a3c4e6` | `docs/screenshots/cor-search-input-circular/` |
| 7 | `cor-numeric-input` | `3029a32fe1e2ca1eb6e2bc68571f1965bded9ef6` | ✅ done | `2b76568` | `docs/screenshots/cor-numeric-input/` |
| 8 | `cor-phone-input` | `f2ba725de62bbecd5bd84870a1e6b7bb1eb5adfe` | ✅ done | `70df409` | `docs/screenshots/cor-phone-input/` |
| 9 | `cor-input-chip` | `3168d84c4883c991b5643e4feab97de2cfe8fb7e` | ✅ done | (this commit) | `docs/screenshots/cor-input-chip/` |

**Input family complete — 9/9 components shipped.**

## Drift fix log

### 2026-05-23 — `cor-search-input-circular` realigned to Figma (mirror of rectangular)

Mirrored the rectangular sibling's Figma realignment (commit `2eff62c`) onto
the circular pill variant. Figma master `933:29721` exposes the same two
axes the shipped circular component was missing:

- **`loading` prop** — renders a brand `cor-spinner` next to the value /
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

Screenshots: `docs/screenshots/cor-search-input-circular/v2/` —
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

### 2026-05-23 — `cor-search-input-rectangular` realigned to Figma (Loading visual + Button axis)

Added the two axes Figma master `933:29099` exposes that the shipped
component was missing:

- **`loading` prop** — renders a `cor-spinner` next to the value/placeholder
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

Screenshots: `docs/screenshots/cor-search-input-rectangular/v2/` —
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

### 2026-05-23 — `cor-file-input` realigned to Figma (state-only model)

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

Companion atom `cor-file-item` renamed the resting state `idle` → `uploaded`
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
- `cor-file-input` `variant` prop removed; consumers using
  `variant="destructive"` migrate to `invalid` (which now drives the red
  dashed-border treatment).
- `cor-file-input` `FILE_INPUT_VARIANTS` and `FileInputVariant` types removed.
- `cor-file-item` state name `idle` → `uploaded`.
- `--file-input-default-*`, `--file-input-destructive-*` CSS variables
  removed → use `--file-input-background-*`, `--file-input-border-*`,
  `--file-input-text-*`, `--file-input-icon-*`, `--file-input-focus-ring-{default,invalid}`.
- `--file-item-default-background-*`, `--file-item-default-border-*` →
  `--file-item-background-*`, `--file-item-border-{uploaded,uploading,success,error,disabled}`.
- `--file-item-icon-color-idle` → `--file-item-icon-color-uploaded`.

Pixel-perfect diff against Figma Active panel crop: **5.81%** (anti-aliasing
and font-rendering noise; structural and colour match exact — colour-sampled
the Figma PNG to confirm ink-primary body text in Active, not brand blue).

Screenshots: `docs/screenshots/cor-file-input/v2/`,
`docs/screenshots/cor-file-item/v2/`.

Gates: `yarn tokens.build && yarn dx:stencil:once && yarn lint && yarn
typecheck && yarn test && yarn sp.build && yarn audit:contrast` — all green.
478 spec tests pass, 0 console errors across every story, 0 contrast
failures in light or dark.

## Failure / restart log

### 2026-05-22 — `cor-file-input` Figma node resolution

The Figma file `doJ7tDY0PlQ0PqMgbpFVIC` exposed via the MCP server only listed
9 top-level pages (Getting Started, Badge, Button, Checkbox, Link, Messaging,
Pagination, Progress Indicator, Separator) — none corresponding to the
`file-input` or `file-item` component sets identified by the user-provided
component keys. The advertised `search_design_system` MCP tool was not
available in this environment (only `get_design_context`, `get_screenshot`,
`get_metadata`, `get_variable_defs` were exposed).

The earlier inputs (`cor-input`, `cor-select-input`, `cor-date-input`) shipped
without preserved Figma node references in this repo either, so there was no
prior anchor to walk from.

**Decision:** continue without a Figma node anchor. The user-provided task
specification was sufficient to derive the visual contract (input-family
border / focus ring / label / helper / error — see `cor-input`) and the
drop-zone affordance (dashed border, brand-tint background on `is-drag-over`,
brand-blue solid border on `is-focused`). All other surfaces (typography
scale, spacing, semantic colors, dark-mode mappings) came from the canonical
sources: `DESIGN.md`, `.impeccable/design.json`, the existing token bundles,
and the `cor-input` / `cor-date-input` patterns on disk.

Future agent runs: if a Figma node-id for either component_set is rediscovered,
log it here so pixel-perfect comparison against the original can be re-checked.

## Last updated

2026-05-23 — `cor-search-input-circular` realigned to Figma — mirror of the
rectangular sibling's `2eff62c` fix. Added the `loading` visual state
(spinner + `aria-busy`, clear button suppressed in-flight) and the
`withButton` axis (trailing brand-blue circular submit button that fires
`corSearch`). 17 new tokens under `submitButton.*` (border-radius is
`{borderRadius.full}` so the button renders as a perfect circle on the
pill silhouette) and `loadingSpinner.*`. 20 new spec tests (498 → 518).
No breaking changes. Rectangular and circular siblings are now feature
pared at parity. See "Drift fix log" above for the full delta.

2026-05-23 — `cor-search-input-rectangular` realigned to Figma — added the
`loading` visual state (spinner + `aria-busy`, clear button suppressed
in-flight) and the `withButton` axis (trailing brand-blue submit button
that fires `corSearch`). 17 new tokens under `submitButton.*` and
`loadingSpinner.*`. 20 new spec tests (478 → 498). No breaking changes.
See "Drift fix log" above for the full delta.

2026-05-23 — `cor-file-input` realigned to Figma (state-only model) — removed
the `variant` axis, added the `Active` state, renamed `cor-file-item` resting
state `idle` → `uploaded`, flattened the token namespace. See "Drift fix log"
above for the full delta.

2026-05-23 — `cor-input-chip` shipped (multi-value chip-input molecule with
form association). LAST input variant — input family is now complete (9/9).
Pattern B: hosts an internal `<input type="text">` for the next chip plus
inline pill rendering for confirmed values, all inside a single
shadow-DOM container that mirrors the `cor-input` visual contract (1px
border, brand-blue focus ring, label, helper / error, sizes md/lg, states
default / hover / focus / filled / disabled / mandatory / destructive).
Chips kept INTERNAL to `cor-input-chip` (not as a separate `cor-chip`
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

### 2026-05-23 — `cor-input-chip` Figma node resolution

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
pattern from the eight earlier inputs: cor-input provides the canonical
container / focus-ring / label / helper / error visual contract;
cor-file-input provides the multi-value list-inside-container precedent
plus the `role="status"` live-region pattern. Chip pill styling
(soft-gray background `color.background.base.secondary`,
borderRadius.6, medium-weight label) follows the `cor-button` neutral
variant's tinting cues (read via `git show origin/feat/cor-button:...`
without switching branches per the prompt constraint). Romanian copy
follows PRODUCT.md voice (verbs over nouns, second-person formal
implied). Validated against `DESIGN.md`, `.impeccable/design.json`, and
the on-disk `cor-input` / `cor-file-input` / `cor-file-item` /
`cor-select-input` / `cor-button` implementations. If the
component_set's node-id becomes reachable later, re-run pixel-perfect
comparison and log diff results here.

---

2026-05-23 — `cor-phone-input` shipped (phone-number-entry molecule with
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

### 2026-05-23 — `cor-phone-input` Figma node resolution

Same MCP file scope as the seven earlier inputs — `doJ7tDY0PlQ0PqMgbpFVIC`
only exposes 9 top-level pages and no `phone-number-input` node was
reachable through the available `get_metadata` traversal. The advertised
`search_design_system` MCP tool is intentionally NOT in the
`new-component` agent's allow-list; the known sibling page nodeId
`403:21765` ("Input: Date") was reachable via `get_screenshot`
(confirming the file scope hasn't shifted), but it doesn't link back to
the phone-input page. Derivation followed the well-validated pattern from
seven earlier components on this branch: cor-input provides the canonical
border / focus-ring / label / helper / error visual contract;
cor-select-input provides the combobox + listbox + keyboard contract; the
country-trigger / divider / dial-code layout follows ITU-T E.164 + WAI-ARIA
combobox conventions. The Moldova-first audience (PRODUCT.md) drove the
defaults: MD as `defaultCountry`, Romanian display names + Romanian error
copy. Validated against `DESIGN.md`, `.impeccable/design.json`, and the
on-disk `cor-input` / `cor-select-input` / `cor-date-input` /
`cor-numeric-input` implementations. If the component_set's node-id
becomes reachable later, re-run pixel-perfect comparison and log diff
results here.

---

2026-05-23 — `cor-numeric-input` shipped (numeric-entry atom with stacked
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

### 2026-05-23 — `cor-numeric-input` Figma node resolution

Same MCP file scope as the earlier inputs — `doJ7tDY0PlQ0PqMgbpFVIC` only
exposes 9 top-level pages and no `numeric-input` node was reachable through
the available `get_metadata` traversal. The known sibling page nodeId
`403:21765` ("Input: Date") was reachable for screenshot retrieval (date
input page rendered), confirming the file scope hasn't shifted, but no
parent reference links from there to the numeric-input page. Derivation
followed the established pattern (see prior failure-log entries): cor-input
provides the canonical input-family visual contract; the stacked stepper
affordance (chevron-up over chevron-bottom inside the right edge of the
control, each ~50% of the input height) follows the task brief and standard
spinbutton conventions. Validated against `DESIGN.md`,
`.impeccable/design.json`, and the on-disk `cor-input` / `cor-select-input`
(chevron pattern) / `cor-search-input-rectangular` (trailing affordance
pattern) implementations. If the component_set's node-id becomes reachable
later, re-run pixel-perfect comparison and log diff results here.

---

2026-05-23 — `cor-search-input-circular` shipped (pill-silhouette search-field
atom, form-associated). Sibling of `cor-search-input-rectangular` — same
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

### 2026-05-23 — `cor-search-input-circular` Figma node resolution

Same MCP file scope as the earlier inputs — `doJ7tDY0PlQ0PqMgbpFVIC` only
exposes 9 top-level pages and no `search-input-circular` node was reachable
through the available `get_metadata` traversal. The advertised
`search_design_system` MCP tool is intentionally NOT in the `new-component`
agent's allow-list, and the only known sibling page nodeId (`403:21765`,
"Input: Date") doesn't link back to the search circular page. Derivation
followed the established pattern (see prior failure log entries): the
sibling `cor-search-input-rectangular` provided the 1:1 behavioural and
visual template, and the silhouette delta (border-radius full, +4px
padding-inline at each size to balance the curve) follows the task brief's
heuristic. Validated against `DESIGN.md`, `.impeccable/design.json`, and
the on-disk rectangular implementation. If the component_set's node-id
becomes reachable later, re-run pixel-perfect comparison and log diff
results here.

---

2026-05-23 — `cor-search-input-rectangular` shipped (rectangular search-field
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

### 2026-05-23 — `cor-search-input-rectangular` Figma node resolution

Same MCP file scope as the earlier inputs — `doJ7tDY0PlQ0PqMgbpFVIC` only
exposes 9 top-level pages and no `search-input-rectangular` node was
reachable through the available `get_metadata` traversal. Derivation
followed the established pattern (see prior failure log entry): cor-input
provides the canonical input-family visual contract, and the affordance
specifics (leading search icon, trailing × clear) match
the documented design-system search pattern (`mdi:magnify` /
`mdi:close-circle` semantics, render-as-`role="searchbox"`). Validated
against `DESIGN.md`, `.impeccable/design.json`, and the cor-input on-disk
implementation. If the component_set's node-id becomes reachable later,
re-run pixel-perfect comparison and log diff results here.

2026-05-22 — `cor-file-input` + `cor-file-item` shipped (drag-and-drop file
selection molecule + per-file row atom). Sibling components, both
form-associated where applicable (`cor-file-input` exposes its `File[]` via
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

2026-05-23 — `cor-input` aligned with Figma source-of-truth (docs page
`107:1034`, master component-set `132:3419`). Previous implementation
shipped 2 styles × 6 visible states; Figma carries **4 styles × 7 states
× 2 sizes = 56 variants**. Additive change — no breaking API delta.

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

**TSX** (`cor-input.tsx`): `variant` enum expanded to
`'default' | 'warning' | 'destructive' | 'success'`. New `loading: boolean`
`@Prop({ reflect: true })` — when true the host carries `aria-busy="true"`
and a `cor-spinner` (xs for md size, sm for lg) renders in the trailing
slot, replacing the `icon-end` slot for the duration of the load. Native
input gets `pointer-events: none` + `opacity: 0.6`. Existing `readonly`
prop now also sets `aria-readonly="true"` on the native input — required
to distinguish read-only from disabled at the assistive-tech layer.

**CSS** (`cor-input.css`): added `:host(.variant-warning)`,
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

**Stories** (`cor-input.stories.ts`): added `Loading` (4 cells: lg / md
/ warning+loading / success+loading), `ReadOnly` (3 cells: lg / md /
disabled-for-comparison), `WithWarning` (Romanian helper "Această
valoare ar putea cauza probleme"), `WithSuccess` (Romanian helper
"Verificat"). `AllVariants` re-rendered as 4-column grid (was 2).
`States` story refreshed to show the 7 first-class states explicitly
including loading + read-only. Existing `WithIcons`, `WithError`,
`EdgeCases`, `AllSizes`, `WithHelperText`, `Default` preserved
unchanged.

**Spec** (`cor-input.spec.tsx`): added `loading state` describe block
(reflects `loading` to host, sets `aria-busy="true"`, renders
`cor-spinner`, scales md→xs / lg→sm), `variant matrix` describe block
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

Screenshots: `docs/screenshots/cor-input/v2/{all-variants,states,
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

2026-05-23 — `cor-select-input` audited against Figma source-of-truth
(docs page `411:23995`, master component-set `159:1112`). Variant
matrix already correct: **2 styles (Default / Destructive) × 5 states
(Default / Hover / Focus / Filled / Disabled) × 2 sizes (md / lg) = 20
variants** — matches the Figma master exactly (no Warning / Success
styles, no Loading / ReadOnly states unlike `cor-input`). Two drift
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
   inheriting `regular` (400). Aligns with the v2 `cor-input` precedent
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
including 60 `cor-select-input` specs), `yarn sp.build` (clean export),
`yarn audit:contrast` (21 pass / 0 fail across light + dark, including
the new selected-option pair `text.brand.default` on
`background.base.secondary` = 5.79:1, well above the 4.5 AA floor).
Zero console errors across every story.

Screenshots: `docs/screenshots/cor-select-input/audit-v2/` with
before/after pairs for the open-listbox (selected-option background
drift) and the label weight (regular → medium across all states).
Figma canonical reference at `/tmp/figma-select-canonical.png` (full
docs page), master at `/tmp/figma-select-master.png` (20-variant grid),
selection-menu detail at `/tmp/figma-select-selection-menu-hires.png`.

**TODOs** (logged for future work, not blocking):

- `cor-select-input` multi-select mode (`multiple: boolean` prop) with
  checkbox-prefixed options — not in current Figma scope; add only
  when a real consumer surfaces the need (rule-of-two,
  PRINCIPLES.md §B).
- Nested submenu support (Figma `Submenu` subcomponent) — not in
  current Figma scope for the select-input docs page; introduce as a
  separate `cor-menu` / `cor-submenu` molecule if a consumer adopts a
  multi-level menu pattern.

### Figma node resolution (cor-select-input)

The component-set master (`159:1112`) and docs canvas (`411:23995`)
were reachable via `mcp__figma__get_metadata` + `get_screenshot` at
`maxDimension=2048`. The 20-variant master grid rendered cleanly
(2 cols × 10 rows: Default + Destructive × Default/Hover/Focus/Filled/
Disabled × Large/Medium). The `selection-menu` instance (`454:5903`)
and the macOS `Menu` (`456:6181`) / iOS `Submenu` (`456:24768`)
subcomponents on the docs page were reachable via direct nodeId
screenshots. No `get_design_context` was needed — the screenshots +
metadata + the prior `cor-input` token map (which covers the same
input-family semantic palette) gave full coverage.

