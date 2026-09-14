# Changelog

## Unreleased

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
