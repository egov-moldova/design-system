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

**Removed with no replacement**, deliberately. The old `./dist/mud/*` wildcard
also exposed `dist/mud/index.esm.js` and the `p-*.js` chunk files. Those are
build output, not API: the chunks are loaded by the bundle itself through
relative imports, which never consult the `exports` map, and `index.esm.js` has
no documented use. If you import either by name, use
`@egov-moldova/mud/mud.esm.js` — the self-registering bundle entry — or
`defineCustomElements()` from `@egov-moldova/mud/loader`.

**URLs are not affected.** A `<link href="/node_modules/@egov-moldova/mud/dist/mud/mud.css">`,
a jsDelivr URL, or a build step that copies files out of `node_modules` all
resolve on a filesystem or over HTTP rather than through the `exports` map, and
keep their `dist/mud/` paths.

`@egov-moldova/mud/components` is ESM-only — it has no `require` condition.
Stencil's `dist-custom-elements` output target cannot emit CommonJS. CommonJS
consumers use the package root, which does carry a `require` condition.

### For consumers on node10 module resolution

`moduleResolution: "node"` — TypeScript's node10 algorithm — does not read
`exports` at all; it resolves subpaths as physical directories. Under it the new
names have no path on disk and every import of them fails with `TS2307`. Move to
`bundler`, `node16` or `nodenext`.

This repository's own React workspace was on node10 and has been moved. That
change fixes *resolution* only: the workspace still does not typecheck, because
`dist/types/index.d.ts` does not export the `Components` and `Mud*CustomEvent`
types the generated wrappers import. That debt predates this release and is
unchanged by it — and it is invisible in CI, because the workspace's build script
is `tsc || true`.

### Internal

- The publish gate now proves that every documented specifier resolves to a file
  the tarball actually contains, under both the `import` and `require`
  conditions, rather than only that each declared target exists.
