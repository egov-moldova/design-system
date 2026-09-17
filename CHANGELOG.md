# Changelog

## Unreleased

### Changed — icon style is a `variant` prop, and the size scale is 16 / 20 / 24 / 32

The style used to live inside the name (`car-filled`) and the size used to pick a
different drawing (`assets/24/car.svg`). Both are props now, and the assets are
keyed by style: `assets/outlined/car.svg` and `assets/filled/car.svg`, one drawing
each, scaled through `size`.

```html
<!-- before -->              <!-- after -->
<mud-icon name="car-filled" size="24"></mud-icon>
<mud-icon name="car" variant="filled" size="24"></mud-icon>
```

**Migration:** drop the `-filled` suffix from every icon name and pass
`variant="filled"`. `size="12"` is gone — the scale is `16 | 20 | 24 | 32`, and
`32` is new. `ICON_VARIANTS`, `ICON_SIZES`, `IconVariant`, `IconSize` and
`hasIconVariant(name, variant)` are exported from the package root.

142 of the 174 icons are drawn in one style only. Asking for the style an icon
does not have renders the one it does and logs a warning; `hasIconVariant` answers
the question up front when you want the filled drawing only where one exists.

**`mud-sidebar-item`'s `icon-active` attribute is removed.** It existed to name a
second icon for the active row, which is what `variant` expresses now — an active
item renders the filled style of `icon` when that icon has one.

### Changed — icon names are typed as `IconName`, and `mud-icon` requires `name`

Every prop and data field that names an icon was typed `string`, so a misspelled or
removed name compiled and rendered nothing. They are now typed `IconName`, the union
of the names `mud-icon` ships: `mud-icon`'s `name`; `iconName` on `mud-toast`,
`mud-banner`, `mud-info-box`, `mud-inline-message`, `mud-tab`, `mud-avatar` and
`mud-search-input`; `icon` on `mud-menu-item`; `icon` on `mud-sidebar-item`
(`iconActive` was typed here too, and is removed by the entry above); and
`StepperStep.iconName`, `TabDescriptor.iconName`,
`SegmentedControlSegment.iconName` and `BreadcrumbItem.iconStart`.

**If you pass a plain `string`, TypeScript now rejects it.** Type the value as
`IconName`, or narrow a value that arrives untyped (CMS content, JSON) with
`isIconName(value)`. `ICON_NAMES`, `IconName` and `isIconName` are exported from the
package root. Nothing changes at runtime: HTML attributes still accept any string,
and an unknown name still logs `[mud-icon] Icon not found` and renders nothing.

**`mud-icon` no longer defaults `name` to `'check'`.** No `check` icon exists, so
that default only ever rendered an empty icon; `name` is now required.

### Fixed — `mud-icon` no longer throws on names like `constructor`

A `name` matching an `Object.prototype` member (`constructor`, `toString`,
`__proto__`…) passed the known-icon check and threw a `TypeError` while loading.
Such names now behave like any other unknown name.

### Changed — `mud-accordion-item` renders the `trailing` slot beside its header button

The `trailing` slot used to render inside the header `<button>`. Controls placed there —
the slot is documented for `mud-button` — were interactive content inside a button,
which is invalid HTML. It is now rendered as a sibling of the button, after it.
`part="header"` stays on the button and still covers the whole row: its box,
background, hover tint and focus ring are unchanged. `heading`, `supporting` and
`icon-start` stay inside the button.

What you can observe:

- **Accessible name.** The header's name no longer includes trailing content. A test
  that asserts the old name (heading followed by badge text) needs updating.
- **Tab order.** A trailing control is its own tab stop, after the header.
- **Clicks.** Clicking trailing content no longer toggles the item or emits `mudToggle`.
  A `mud-button` there no longer needs `stopPropagation` to keep the item still.
- **Keyboard.** Arrow, Home and End pressed while a trailing control has focus no longer
  reach the header, so they do not move between items.
- **Font.** Plain text in `trailing` inherits the item's font instead of the browser's
  default `<button>` font (13.33px in Chromium). `mud-badge` and `mud-button` set their
  own and are unaffected.
- **`::part(header)` styles stop at the button.** Trailing content is no longer inside
  it, so a `::part(header):hover` rule no longer applies while the pointer is over
  trailing content, and with `icon-position="left"` an inline padding override does
  not move trailing content away from the row's end.
- **Without `subgrid`** (Chromium before 117, Safari before 16) the header falls back to
  a flex row, with the open/close icon before trailing content instead of after it.

### Changed — `mud-accordion-item` no longer writes `disabled` past the slot

While an item is disabled it sets `disabled` on the controls you place directly in
its `trailing` slot. It used to set it on every element in `heading`, `supporting`
and `trailing` AND on all of their descendants, and then remove it from everything
when the item was re-enabled. It kept no record of what it had written, so it could
not tell your attributes from its own — a control you shipped as
`<mud-button slot="trailing" disabled>` came back enabled with the item, with no
event and no warning.

**Your `disabled` now survives.** The item records the elements it writes to, and on
re-enable removes the attribute only from those. A control that already carried
`disabled` — as an attribute or as a property — never enters that record and is never
touched. A `mud-*` control carrying `disabled="false"` reads that as not disabled, so
the item does claim it. The record is also released when the item is removed from the document, so a
control you move elsewhere does not leave carrying an attribute you did not write.

**Two narrowings.** The attribute now reaches only elements assigned to a slot, never
their descendants: if you wrapped a control in `<div slot="trailing">`, that inner
control used to be disabled and no longer is. And it reaches only the `trailing` slot —
`disabled` on an `<h3 slot="heading">` was invalid HTML and bought nothing, and those
two slots are greyed through inherited colour instead.

**What still reaches everything.** While the item is disabled, every element assigned
to the three header slots gets `tabindex="-1"`, restored to exactly the value you
authored when the item is enabled again. `disabled` does nothing to an `<a href>`, a
`<div tabindex>`, or a custom element that does not implement it, so without this a
control would stay Tab-reachable and Enter-activatable while assistive technology was
told it was unavailable. The stylesheet also keeps `pointer-events: none` on assigned
elements.

**One small addition.** While the item is disabled, `.trailing` takes the header's
own disabled colour, so a plain `<span slot="trailing">label</span>` greys with the
rest of the row instead of staying at full contrast. It is scoped to the disabled
state only — your trailing content's colour is untouched in every other state.

**What is not covered, stated plainly.** A control NESTED inside a slotted wrapper
gets no attribute and no `tabindex`; it is blocked from the mouse only if it does not
set its own `pointer-events`, and it stays keyboard-reachable. And this state is a UX
affordance, not an authorization boundary: an action that must not be reachable while the item is
disabled needs its own guard, and server-side enforcement if it is security-sensitive.

The `pointer-events` guard is deliberately not overridable — measured, a declaration
in this component's shadow tree wins even against an inline `!important` on your own
element. If you have a legitimate affordance that must stay clickable under a disabled
item (an "unlock", a "why is this disabled?" trigger), open an issue rather than
fighting the cascade; there is no escape hatch today.

### Fixed — semibold text rendered as bold

`styles.css` shipped static Onest faces for weights 400, 500 and 700, while the
tokens also use 600 (`--font-weight-semibold`). A weight with no face renders with
the nearest one, so every semibold label rendered bold, and consumers declared
their own `@font-face` to work around it. `styles.css` now declares one variable
face covering 100–900, and that workaround can be deleted. esbuild consumers
need `--loader:.woff2=file`; see the README's Fonts section.

### Changed — font files in `dist/mud/assets/fonts/`

The font is one WOFF2 file, `dist/mud/assets/fonts/onest-variable.woff2`
(57.5 KB), replacing `onest-regular.ttf`, `onest-medium.ttf` and `onest-bold.ttf`
(176.7 KB together). Those three paths were never `exports` keys, but they were
published, so a page that linked one directly from a CDN — rather than through
`styles.css` — now gets a 404 and must link `styles.css` instead.

### Changed — public API surface (breaking for deep imports)

The `exports` map no longer exposes build directories. Bare specifiers that
named `dist/` now fail to resolve with `ERR_PACKAGE_PATH_NOT_EXPORTED`, which
names the old path but not the new one — the mapping is below.

| Before | After |
| --- | --- |
| `@egov-moldova/mud/dist/mud/mud.css` | `@egov-moldova/mud/styles.css` |
| `@egov-moldova/mud/dist/mud/tokens/<name>.css` | `@egov-moldova/mud/tokens/<name>.css` |
| `@egov-moldova/mud/dist/mud/mud.esm.js` | `@egov-moldova/mud/mud.esm.js` |
| `@egov-moldova/mud/dist/components` | `@egov-moldova/mud/components` |
| `@egov-moldova/mud/dist/components/mud-<name>.js` | `@egov-moldova/mud/components/mud-<name>.js` |

`.` and `./loader` are unchanged.

**Removed with no replacement**, deliberately. The old `./dist/mud/*` wildcard
also exposed `dist/mud/index.esm.js`, the `p-*.js` chunk files and everything
under `dist/mud/assets/`. None of those is API:

- The chunks and `index.esm.js` are loaded by the bundle itself through relative
  imports, which never consult the `exports` map. If you named either, use
  `@egov-moldova/mud/mud.esm.js` — the self-registering bundle entry — or
  `defineCustomElements()` from `@egov-moldova/mud/loader`.
- **Icons and other assets are not module imports.** `<mud-icon>` fetches its
  SVG at runtime through Stencil's `getAssetPath()`, which builds a URL relative
  to the loaded bundle and never goes through module resolution. To serve assets
  from your own origin instead, copy `dist/mud/assets/**` with a filesystem glob
  and point `setAssetPath()` at the destination — a build step, not an `import`.

The `./dist/components/*` wildcard is likewise not re-published in full: only
`./components/mud-*.js` is, which is every component module and none of the 35
build chunks beside them.

**URLs are not affected, and the new names are not URLs.** Both directions
matter. A `<link href="/node_modules/@egov-moldova/mud/dist/mud/mud.css">`, a
jsDelivr URL, or a build step that copies files out of `node_modules` resolves on
a filesystem or over HTTP rather than through the `exports` map, and keeps its
`dist/mud/` path. Equally: the names in the table above resolve **only** through
`import` or `require`. Writing `/node_modules/@egov-moldova/mud/styles.css` in a
`<link>`, a `<script src>` or a `new URL()` produces a 404 — the mapping is a
module-resolution contract, not a path rewrite.

`@egov-moldova/mud/components` is ESM-only — it has no `require` condition.
Stencil's `dist-custom-elements` output target cannot emit CommonJS. CommonJS
consumers use the package root, which does carry a `require` condition.

### For consumers on node10 module resolution

`moduleResolution: "node"` — TypeScript's node10 algorithm — does not read
`exports` at all; it resolves subpaths as physical directories. Under it the new
names have no path on disk and every import of them fails with `TS2307`. Move to
`bundler`, `node16` or `nodenext`.

This repository's own React workspace was on node10 and has been moved. That
change fixes *resolution* only; the workspace still does not typecheck, and a
consumer moving to `bundler` should expect the same two error classes:

- `TS2305` — `@egov-moldova/mud/components` does not export `Components`
  (`dist/components/index.d.ts` carries only `getAssetPath`, `setAssetPath`,
  `setNonce` and the element classes), and `@egov-moldova/mud` does not export
  the `Mud*CustomEvent` types.
- `TS2344` — element types declare `ariaLabel` as optional where `HTMLElement`
  requires it.

That debt predates this release and is unchanged by it. It is invisible in CI
because the workspace's build script is `tsc || true`.

### Changed — `mud-icon` names (breaking)

Three icon names were published misspelled and are now corrected. The old names
are removed with no alias: `<mud-icon>` logs `Icon not found` and renders nothing.

| Before | After |
| --- | --- |
| `calender-add` | `calendar-add` |
| `calender-remove` | `calendar-remove` |
| `calender-remove-filled` | `calendar-remove-filled` |

The static assets move with them: `assets/<size>/calender-*.svg` is now
`assets/<size>/calendar-*.svg`.

### Added

- `mud-tag` and `mud-badge` take a `disabled` prop that renders a disabled
  design, replacing every `type` × `semantic` / `variant` color. The prop is
  visual only and adds no ARIA; the container announces the state.
  `mud-sidebar-item` passes its `disabled` to its own tag, and a tag or badge
  slotted directly into a disabled `mud-accordion-item`'s `trailing` slot is
  disabled by the item — leave `disabled` off it there, since the item never
  removes an attribute it did not write. In the item's `heading` or
  `supporting` slots, and in any other container, set `disabled` on the tag or
  badge alongside the container's.

### Internal

- The publish gate now proves that every documented specifier resolves to a file
  the tarball actually contains, under both the `import` and `require`
  conditions, rather than only that each declared target exists.
