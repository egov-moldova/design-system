# mud-select — native composition and filtering

## Goal

Let `mud-select` accept the markup a developer would write for a native `<select>` —
`<option>`, `<optgroup>`, `<hr>`, `selected` — and let the user filter a long list by typing,
without changing how the component looks.

## Spec/issue link

- Figma `Select Input` documentation page: [454:4192](https://www.figma.com/design/doJ7tDY0PlQ0PqMgbpFVIC/Components?node-id=454-4192&m=dev)
- Figma `select-input` component set `159:1112` — 20 variants (Style × State × Size)
- Figma `selection-menu` `172:3093` and `.menu-item-selection` `172:2946` — the custom dropdown
  the Behavior section points at ("a custom menu component from the Statewide Design System can be
  used to ensure visual consistency")
- Filtering follows [react-select](https://github.com/JedWatson/react-select); the specific
  behaviours borrowed are cited per task.

## Options

### How light-DOM options reach the component

| # | Approach | Trade-off |
|---|---|---|
| A | Keep reading light DOM as data; render our own rows in shadow DOM. Extend the reader to walk `<optgroup>` and `<hr>`. | Styling stays entirely ours. Options are a snapshot, so mutation needs an observer. **Chosen.** |
| B | Introduce `mud-option` / `mud-option-group` sub-components, as `mud-menu` does with `mud-menu-item`. | Reactive by construction and consistent with `mud-menu`, but it is the opposite of native markup, which is the point of this change. |
| C | Wrap a real `<select>` and style it with `appearance: base-select`. | Genuinely native, free accessibility and form participation. Chromium-only at time of writing; cannot match the design in Safari or Firefox. |

### Where the group heading and separator design comes from

| # | Approach | Trade-off |
|---|---|---|
| A | Mirror `menu.heading.*` into `select.group.*` / `select.separator.*`. | The values are already designed and already shipped in `mud-menu`; `select.*` and `menu.*` agree value-for-value today (panel 8/16, row 12/16 radius 8, Onest Medium 14/20). **Chosen.** |
| B | Move the select's listbox onto `mud-menu` itself, as the Figma Behavior section implies. | Removes the duplication the design intends to remove, but it is a large refactor of a shipped component for no visual gain, since the tokens already match. Recorded as future work. |
| C | Invent new values. | Rejected: there is a design, it just lives in the Menu component. |

### What "searchable" means

| # | Approach | Trade-off |
|---|---|---|
| A | Type-ahead only — typing jumps the highlight, as a native `<select>` does. | Free, no new UI. Does not help with a long list, which is the actual request. |
| B | A search field pinned above the option list. | Needs a design that does not exist, and splits focus between two controls. |
| C | The control itself is the text input, react-select style: typing filters the list in place. | Matches the requested model, adds no new UI box, and is the ARIA 1.2 combobox pattern. **Chosen.** |

## Decision

Option A for composition, A for the group/separator design, C for filtering.

The reader walks the light DOM and produces a flat `SelectEntry[]` of options, group headings and
separators. Rendering keeps the existing row visuals and adds two row kinds whose values mirror
`menu.heading.*`. The trigger changes from `<button role="combobox">` to `<input role="combobox">`;
when `searchable` is false the input carries `inputmode="none"` and `aria-readonly="true"` and
swallows input events, which is how react-select's `DummyInput` keeps a single code path without
raising a virtual keyboard.

`searchable` defaults to `false`. react-select defaults its equivalent to true, but `mud-select`
already ships, and turning every existing select into a text field is a behaviour change consumers
did not ask for.

## Global constraints

- Branch `feat/select-native-composition`, cut from `upstream/main`.
- One commit per task below; each task's verify command passes before its commit.
- Generated files (`src/components.d.ts`, `src/components/mud-select/readme.md`) are staged by
  explicit path in the commit whose source change regenerated them.
- No visual change to any state that exists today. Every current `select.*` token keeps its value;
  the new tokens are additive.
- `options` stays working. It is deprecated, not removed, and keeps its precedence over markup so
  existing callers do not change behaviour.
- Files never touched: `tokens/core/components/menu.tokens.json` and `src/components/mud-menu/**`.
  The menu is the reference for the new values, not a participant in this change.
- Out of scope, recorded rather than done: multi-select (Figma's `Chips` property on `159:1112`)
  and moving the listbox onto `mud-menu`.

## Tasks

- [x] **1. Group and separator tokens.** Add `select.group.*` (paddingInline `{spacing.16}`,
  paddingBlock `{spacing.4}`, gap `{spacing.4}`, fontFamily `{fontFamily.primary}`, fontSize
  `{fontSize.14}`, lineHeight `{lineHeight.20}`, fontWeight `{fontWeight.medium}`, color
  `{color.text.base.tertiary}`) and `select.separator.color` (`{color.border.base.default}`),
  mirroring `menu.heading.*`. Each token carries a `$comment` naming the Figma node it came from.
  Verify: `yarn tokens.build && yarn tokens.lint.all`

- [x] **2. `SelectEntry` model.** Replace `SelectOption[]` internally with a discriminated union of
  `{ kind: 'option' | 'group' | 'separator' }`. `SelectOption` stays exported for the deprecated
  `options` prop. Verify: `yarn test.dev src/components/mud-select`

- [x] **3. Light-DOM reader.** Walk `host.children`: `OPTION` becomes an option, `OPTGROUP` becomes
  a heading plus its `OPTION` descendants (inheriting the group's `disabled`), `HR` becomes a
  separator. Collapse separators that are leading, trailing, or adjacent to a heading — a native
  `<select>` renders no rule in those positions either. Verify: `yarn test.dev src/components/mud-select`

- [x] **4. Mutation observation.** `slotchange` does not fire when an `<option>` is added inside an
  `<optgroup>`, because the assigned node (the `optgroup`) did not change. Observe the host with
  `{ childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'label', 'disabled', 'selected'] }`
  plus `characterData: true`, since relabelling an option in place is neither a child-list nor an
  attribute change, and disconnect in `disconnectedCallback`. Verify:
  `node scripts/audit/run-all.mjs mud-select --only 02 --json` (`ANTIPATTERN-007-LIFECYCLE-LEAK`
  must be absent) — and a browser, per the note below.

- [x] **5. `selected` as a value source.** When the host has no `value` attribute, the first
  non-disabled `<option selected>` supplies the initial value. "Set no value" means a `value` that is
  both empty and absent as an attribute: an attribute check alone is not enough, because JSX and
  frameworks set the property before any attribute exists, and the markup selection would clobber
  it. Verify: `yarn test.dev src/components/mud-select`

- [x] **6. Deprecate `options`.** Mark the prop `@deprecated` in its JSDoc, naming markup as the
  replacement. Precedence is unchanged. Verify: `yarn build && git diff --stat src/components/mud-select/readme.md` (the
  `docs-readme` target only runs under `--docs`, which only the full build passes)

- [x] **7. Render groups and separators.** A group renders `role="group"` with `aria-labelledby`
  pointing at its heading; the heading itself is `role="presentation"` and carries the separator
  rule above its label, as `mud-menu-item` does. `<hr>` renders `role="separator"`. The group is a
  nested flex column repeating the listbox gap — not `display: contents`, whose role handling in
  assistive technology has been unreliable. Keyboard navigation continues to walk the flat option
  list. Verify: `node scripts/audit/run-all.mjs mud-select --only 09 --json`

- [x] **8. The control becomes an input.** Replace the trigger `<button>` with
  `<input role="combobox" aria-autocomplete="list" aria-expanded aria-controls aria-activedescendant>`.
  When `searchable` is false, add `inputmode="none"` and `aria-readonly="true"` and discard input
  events. Typography, padding and height are unchanged, so no state's rendering moves.
  Verify: style parity needs the manifest task 14 adds, so instead diff the built component
  against the previous build across placeholder, filled, disabled, invalid and large — the
  replacement is only safe if that comes back at zero differing pixels.

- [x] **9. Filtering.** Case- and diacritic-insensitive substring match over the option label
  and value joined by a space, which is react-select's default `stringify`. The remaining
  `createFilter` defaults are kept: `ignoreCase`, `ignoreAccents`, `trim`, `matchFrom: 'any'`.
  Diacritics are stripped with `normalize('NFD')` and a combining-mark regex
  rather than react-select's hand-written character map, which exists for browsers this project
  does not target. This matters for `ro-RO`: `stefan` must match `Ștefan` and `tandarei` must match
  `Țăndărei`, including the cedilla spellings (U+015F, U+0163) that legacy Romanian data still uses.
  A group whose options all fail the filter disappears along with its heading, as react-select's
  `buildCategorizedOptions` does. Verify: `yarn test.dev src/components/mud-select`

- [x] **10. Keyboard and input lifecycle.** ArrowDown/ArrowUp open the list or move the highlight;
  Home/End jump; Enter selects the highlighted option; Escape closes; Tab selects the highlighted
  option and closes, which is both react-select's `tabSelectsValue` default and what a native
  `<select>` does. Space selects only when the query is empty — with text typed it must insert a space, which is
  react-select's `case ' ': if (inputValue) return;`. The query clears on close and on selection.
  While a query is present the selected label is not drawn, so the field shows what is being typed.
  When `searchable` is false, typing drives type-ahead instead of a query. Verify:
  `yarn test.dev src/components/mud-select`

- [x] **11. Localised strings.** `'No options'`, `'Options'` and `'Selectați o opțiune.'` are
  literals today, which Critical Rule 13 forbids. Each becomes a `@Prop()` with a Romanian default
  and `@default` in its JSDoc: `empty-label`, `listbox-label`, `required-message`. Verify:
  `node scripts/audit/run-all.mjs mud-select --only 04 --json && yarn lint`

- [x] **12. Stories.** Add `WithGroups` (the classic food/fruit/vegetable markup), `Searchable`, and
  `NoResults`. Verify: `node scripts/audit/05-story-exports.mjs mud-select --json`

- [x] **13. Specs.** Cover the reader (optgroup nesting, hr collapsing, inherited disabled),
  `selected` precedence, mutation observation, filter normalisation including the two Romanian
  spellings, the space-key rule, and the ARIA group wiring. Verify:
  `yarn test.dev src/components/mud-select --coverage` at or above the 80% line floor

- [x] **14. Figma state manifest.** `mud-select` has never been pixel-verified — there is no
  `test/mud-select.figma.json`. Add one covering the 20 variants of `159:1112`, plus open states
  citing `172:3093`. Verify: `node scripts/audit/figma-refs.mjs mud-select --check --json`

## Not verified

- **Pixel diffs.** `FIGMA_TOKEN` is unset in this environment, so `figma-refs.mjs` cannot export
  references and `11-pixel-diff-states.mjs` will report `PIXEL-NO-REFERENCE`. Task 14 writes the
  manifest and task 8 runs style parity, which needs no token; the screenshot comparison stays
  unrun until someone with a token runs it.
- **Clicking a control whose input already has focus.** The browser's default focus handling on
  `mousedown` over a shadow host leaves an already-focused input unable to accept text: `keydown`
  and `beforeinput` fire, the edit never lands, and every measurable property — `readOnly`,
  `disabled`, `shadowRoot.activeElement` — reads normal. Found by clicking a searchable select
  twice; it is not reproducible on a bare shadow root, so it is ours to handle, and the control row
  now prevents the default and focuses the input itself, as react-select does. Six click and focus
  sequences were checked in Chromium; no spec covers it, because mock-doc has no layout and cannot
  dispatch a real `mousedown`.
- **Mutation observation, in the spec suite.** The spec environment is mock-doc, which has no
  `MutationObserver`; the component's `typeof` guard turns the observer into a no-op there, so no
  spec can exercise it. Verified instead in headless Chromium against the built component: an
  `<option>` appended inside an existing `<optgroup>`, and a `disabled` attribute toggled on an
  option, both reach the rendered rows — and both fail on the same page without the observer,
  which is what rules out relying on `slotchange` alone. Task 12's stories are the place to make
  this a standing browser-mode test rather than a one-off run.
- **Dark mode.** No task changes a colour value; the new tokens resolve through the same semantic
  references `menu.heading.*` already uses, which the dark theme covers. Not separately measured.
- **Screen-reader announcement of the filtered result count.** react-select ships a live region
  announcing "N results available". Not included: it would add strings and a live region to a
  component that has neither, and it is worth designing rather than porting.
- **The group `role="group"` nesting under a virtual-focus listbox.** The ARIA is correct by spec,
  but grouped listboxes with `aria-activedescendant` are announced inconsistently across screen
  readers. Task 7's verify covers the tree shape, not what any particular reader says.
