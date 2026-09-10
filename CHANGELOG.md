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
| `@egov-moldova/mud/dist/mud/assets/<size>/<name>.svg` | `@egov-moldova/mud/assets/<size>/<name>.svg` |
| `@egov-moldova/mud/dist/components` | `@egov-moldova/mud/components` |
| `@egov-moldova/mud/dist/components/<file>` | `@egov-moldova/mud/components/<file>` |

`.` and `./loader` are unchanged.

**URLs are not affected.** A `<link href="/node_modules/@egov-moldova/mud/dist/mud/mud.css">`,
a jsDelivr URL, or a build step that copies files out of `node_modules` all
resolve on a filesystem or over HTTP rather than through the `exports` map, and
keep their `dist/mud/` paths.

`@egov-moldova/mud/components` is ESM-only — it has no `require` condition.
Stencil's `dist-custom-elements` output target cannot emit CommonJS. CommonJS
consumers use the package root, which does carry a `require` condition.

### Fixed

- The React workspace's `moduleResolution` was `node` (the node10 algorithm),
  which does not read `exports` at all. Any consumer on that setting resolves
  subpaths as physical directories and cannot see the new keys; switch to
  `bundler` or `node16`/`nodenext`.
- The publish gate now proves that every documented specifier resolves to a
  file the tarball actually contains, rather than only that each declared
  target exists.
