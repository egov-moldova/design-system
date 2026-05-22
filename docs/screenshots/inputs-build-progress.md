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
| 7 | `cor-numeric-input` | `3029a32fe1e2ca1eb6e2bc68571f1965bded9ef6` | ⏳ pending | — | — |
| 8 | `cor-phone-input` | `f2ba725de62bbecd5bd84870a1e6b7bb1eb5adfe` | ⏳ pending | — | — |
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
