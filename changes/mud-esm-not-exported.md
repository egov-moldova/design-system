---
type: Removed
title: "`@egov-moldova/mud/mud.esm.js` is no longer a package export"
breaking: true
---

The `./mud.esm.js` key of `exports` is removed. Only the `1.2.0-dev.1` to `1.2.0-dev.3` prereleases had that key. Stable releases up to 1.1.9 reached the same file as `@egov-moldova/mud/dist/mud/mud.esm.js`, which the "public API surface" change in this release also removes; its row in that entry's table names the replacement. `mud.esm.js` is the script-tag build: it loads each component chunk from its own URL, where a bundler such as Vite emits nothing, so a bundled `import '@egov-moldova/mud/mud.esm.js'` registered every element and rendered none, with the failure visible only as 404s in the network panel. The same import now fails the build with a "not exported" error.

Script tags, CDN URLs and import maps that point at `dist/mud/mud.esm.js` by URL do not read `exports` and are not affected. A dev server that resolves bare imports from `node_modules` without bundling (`@web/dev-server`, for example) could load the file by name; it now needs one of the replacements below.

**Migration:** wherever imports are resolved, call `defineCustomElements()` from `@egov-moldova/mud-web-components` (or from `@egov-moldova/mud/loader`), or use a framework adapter. Without a bundler, keep `mud.esm.js` in a `<script type="module" src=".../dist/mud/mud.esm.js">` tag.
