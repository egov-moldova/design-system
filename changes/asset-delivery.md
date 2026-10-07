---
type: Changed
title: icons, logos and flags load automatically; no asset path, no copied folder
breaking: true
---

`mud-icon`, `mud-logo` and the country flags of `mud-phone-input` now load each drawing as a small JavaScript module, imported the first time the component shows it. Nothing is fetched from a folder of SVG files, so there is no asset path to set, no `assets/` folder to copy next to the build, and no `img-src` or `connect-src` Content-Security-Policy entry to add: the drawings are JavaScript, covered by `script-src`, and carry no `style` attribute. The chunks are hashed (`p-<hash>.js`). A service worker that precaches every file downloads all of them (about 2.9 MB); the README's "Service workers / PWA" note says how to avoid that. Under a `require-trusted-types-for 'script'` policy the drawings still render empty, as they did before this change: the sanitizer parses them through `innerHTML`.

The core now declares `sideEffects` (its CSS, `mud.esm.js` and the loader entries), so a bundler leaves out every component the application does not import.

Removed:

- The published SVG files: no `dist/mud/assets/outlined`, `assets/filled`, `assets/flags` or logo SVG, and no `dist/components/assets`. The fonts under `dist/mud/assets/fonts/` stay.
- The adapter asset APIs, none of which was ever published: `setupMud`, `MudSetupOptions` and the React `defineCustomElements` (React keeps re-exporting `setNonce`), `toAssetBaseUrl`, `DefineCustomElementsOptions`, the Vue `Mud` plugin and `MudPluginOptions`, and the Angular `provideMud` and `MudOptions`.

The flag-icons licence notice ships as `dist/mud/licenses/flag-icons.txt` and as a comment in the flag chunk.

Do not import `@egov-moldova/mud/mud.esm.js` from a bundled app: it registers the elements, but its component chunks 404. A bundler uses `defineCustomElements()` from `@egov-moldova/mud-web-components`, or a framework adapter. `mud.esm.js` is for a `<script type="module">` tag with the whole `dist/mud/` served.

**Migration:** delete the copy step (the plugin, the `angular.json` `assets` entry, the `cp` command) and the asset-path setup: `assetPath`, `setupMud`, `app.use(Mud, …)`, `provideMud` and `resourcesUrl`. Replace any `<img src=".../assets/...svg">` with `<mud-icon>` or `<mud-logo>`. Keep serving the whole `dist/mud/` when you host the script-tag build yourself: the chunks and the font live in it.
