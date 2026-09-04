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
import '@egov-moldova/mud/dist/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/dist/mud/mud.css';
import { defineCustomElements } from '@egov-moldova/mud-web-components';

defineCustomElements();
```

```html
<mud-button variant="primary"><button>Click me</button></mud-button>
```

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

## Usage — CDN via jsDelivr

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/mud/dist/mud/tokens/core.tokens.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/mud/dist/mud/mud.css" />
<script type="module">
  import { defineCustomElements } from 'https://cdn.jsdelivr.net/npm/@egov-moldova/mud-web-components/dist/index.js';
  defineCustomElements();
</script>
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

Every component published by `@egov-moldova/mud` is registered. The full list is browseable in [Storybook](../.storybook/). Highlights include:

- `<mud-button>` — primary action button
- `<mud-text-input>`, `<mud-textarea>` — form fields
- `<mud-select>`, `<mud-date-picker>` — selection controls
- `<mud-pagination-item>`, `<mud-toast-notification>`, `<mud-avatar>` — and more

## API

`defineCustomElements(opts?: { resourcesUrl?: string; syncQueue?: boolean })` — registers every Stencil custom element on the current document. Returns a `Promise<void>` that resolves once all elements are registered.

`setNonce(nonce: string)` — set a CSP nonce that Stencil applies to injected `<style>` tags.

TypeScript users get full element type augmentation (`HTMLMudButtonElement`, `HTMLMudTextInputElement`, …) and prop interfaces via `export type *` from `@egov-moldova/mud`.
