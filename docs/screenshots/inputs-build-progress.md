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
| 8 | `cor-phone-input` | `f2ba725de62bbecd5bd84870a1e6b7bb1eb5adfe` | ✅ done | _pending commit_ | `docs/screenshots/cor-phone-input/` |
| 9 | `cor-input-chip` | `3168d84c4883c991b5643e4feab97de2cfe8fb7e` | ⏳ pending | — | — |

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
