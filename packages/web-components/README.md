# @egov-moldova/mud-web-components

Vanilla HTML / JavaScript adapter for the **MUD Design System** — the official UI component library of the Republic of Moldova, developed by the [Agency for Electronic Governance (eGov)](https://egov.md).

This package registers every Stencil-compiled MUD custom element (`<mud-button>`, `<mud-text-input>`, …) so they can be used in any HTML page or non-framework application. It is a thin re-export of the `@egov-moldova/mud` Stencil loader — no framework-specific build step is required.

> For the full component source, design tokens, and Storybook, see the root [`@egov-moldova/mud`](https://www.npmjs.com/package/@egov-moldova/mud) package.

## Install

```bash
yarn add @egov-moldova/mud-web-components @egov-moldova/mud
# or
npm install @egov-moldova/mud-web-components @egov-moldova/mud
```

## Usage — with a bundler (Vite, webpack, esbuild, …)

```ts
import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/styles.css';
import { defineCustomElements } from '@egov-moldova/mud-web-components';

defineCustomElements();
```

```html
<mud-button variant="primary"><button>Click me</button></mud-button>
```

Icons, logos and country flags load on their own, only when shown: there is nothing to copy or configure. In a bundler, register the elements with `defineCustomElements()` from this package. `@egov-moldova/mud/mud.esm.js` is not an import: it is not a package export, and the build fails on it. That file is the core's script-tag build, referenced by URL; see the root README's [With a bundler](../../README.md#with-a-bundler) section.

`styles.css` also loads the Onest font (`assets/fonts/onest-variable.woff2`, next to it in the package) — do not declare an `@font-face` of your own. Vite, webpack and Angular CLI emit the font automatically; esbuild used directly needs `--loader:.woff2=file`. See the root README's [Fonts](../../README.md#fonts) section.

## Usage — plain HTML with import map

```html
<!DOCTYPE html>
<html>
  <head>
    <link
      rel="stylesheet"
      href="/node_modules/@egov-moldova/mud/dist/mud/tokens/core.tokens.css"
    />
    <link
      rel="stylesheet"
      href="/node_modules/@egov-moldova/mud/dist/mud/mud.css"
    />
    <script type="importmap">
      {
        "imports": {
          "@egov-moldova/mud-web-components": "/node_modules/@egov-moldova/mud-web-components/dist/index.js",
          "@egov-moldova/mud/loader": "/node_modules/@egov-moldova/mud/loader/index.js"
        }
      }
    </script>
  </head>
  <body>
    <mud-button variant="primary"><button>Click me</button></mud-button>
    <script type="module">
      import { defineCustomElements } from '@egov-moldova/mud-web-components';
      defineCustomElements();
    </script>
  </body>
</html>
```

Serve `node_modules/@egov-moldova/mud/dist/mud/` as a whole: `mud.css` requests its font from `assets/fonts/` beside it. Icons, logos and flags are chunks in the same loader build and need no folder of their own.

## Usage — CDN, no install

This package is not needed for a CDN page. Its `dist/index.js` imports `@egov-moldova/mud/loader` by name, which a browser cannot resolve from a CDN URL without an import map: importing it from jsDelivr fails with a module-resolution error (in Chrome: `Failed to resolve module specifier "@egov-moldova/mud/loader"`). Load the core's script-tag build instead: it registers every element on its own. Replace `<version>` with the release you pin, as the root README's [Option A — Script Tag (CDN)](../../README.md#without-a-bundler) shows. For production, read [CDN alternative](../../INTEGRATION.md#cdn-alternative-no-copy-step) in INTEGRATION.md first: it covers Subresource Integrity, and why self-hosting is safer.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/mud@<version>/dist/mud/tokens/core.tokens.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/mud@<version>/dist/mud/mud.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@egov-moldova/mud@<version>/dist/mud/mud.esm.js"></script>
```

## Local demo

From the repo root:

```bash
yarn build       # one-time: produces dist/ and loader/ for @egov-moldova/mud
yarn build.web   # compile @egov-moldova/mud-web-components
yarn demo.web    # serve the demo at http://localhost:5174
```

The demo lives in [`demo/index.html`](./demo/index.html) and showcases `<mud-button>` variants + sizes.

## Available components

Every component published by `@egov-moldova/mud` is registered. The full list is browseable in [Storybook](../../.storybook/). Highlights include:

- `<mud-button>` — primary action button
- `<mud-text-input>`, `<mud-textarea>` — form fields
- `<mud-select>`, `<mud-date-picker>` — selection controls
- `<mud-pagination-item>`, `<mud-toast-notification>`, `<mud-avatar>` — and more

## API

`defineCustomElements(opts?: { resourcesUrl?: string; syncQueue?: boolean })` — registers every Stencil custom element on the current document. Returns a `Promise<void>` that resolves once all elements are registered.

MUD's own assets need no base URL, so call it with no argument.

`setNonce(nonce: string)` — set a CSP nonce that Stencil applies to injected `<style>` tags.

TypeScript users get full element type augmentation (`HTMLMudButtonElement`, `HTMLMudTextInputElement`, …) and prop interfaces via `export type *` from `@egov-moldova/mud`.
