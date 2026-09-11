# Changelog

## Unreleased

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
touched. The record is also released when the item is removed from the document, so a
control you move elsewhere does not leave carrying an attribute you did not write.

**Three narrowings.** The attribute now reaches only elements assigned to a slot,
never their descendants: if you wrapped a control in `<div slot="trailing">`, that
inner control used to be disabled and no longer is. It reaches only the `trailing`
slot: `disabled` on an `<h3 slot="heading">` was invalid HTML and bought nothing, and
those two slots are greyed through inherited colour instead. And the dim the item used
to paint over all slotted header content — an `opacity` plus `filter: grayscale(1)` —
is gone, along with `--accordion-item-slotted-opacity-disabled`, which existed only on
an unreleased branch. Slotted controls render their own disabled state.

**What still reaches everything.** While the item is disabled, every element assigned
to the three header slots gets `tabindex="-1"`, restored to exactly the value you
authored when the item is enabled again. `disabled` does nothing to an `<a href>`, a
`<div tabindex>`, or a custom element that does not implement it — 23 of this
library's 48 components do, and `mud-tag` and `mud-badge` do not — so without this a
control would stay Tab-reachable and Enter-activatable while assistive technology was
told it was unavailable. The stylesheet also keeps `pointer-events: none` on assigned
elements.

**What is not covered, stated plainly.** A control NESTED inside a slotted wrapper
gets no attribute and no `tabindex`; it is blocked from the mouse only if it does not
set its own `pointer-events`, and it stays keyboard-reachable. `mud-tag` and
`mud-badge` render identically whether the item is disabled or not, because they have
no disabled design — unchanged from 1.0.6. And this state is a UX affordance, not an
authorization boundary: an action that must not be reachable while the item is
disabled needs its own guard, and server-side enforcement if it is security-sensitive.

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

### Internal

- The publish gate now proves that every documented specifier resolves to a file
  the tarball actually contains, under both the `import` and `require`
  conditions, rather than only that each declared target exists.
