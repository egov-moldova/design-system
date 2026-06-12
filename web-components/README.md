# @egovmd/mud-web-components

Vanilla HTML / JavaScript adapter for the MUD Design System. Registers every
Stencil-compiled custom element (`<mud-button>`, `<mud-input>`, …) so they can
be used in any HTML page or non-framework app.

## Install

```bash
yarn add @egovmd/mud-web-components @egovmd/mud
```

## Usage — with a bundler (Vite, webpack, esbuild, …)

```ts
import '@egovmd/mud/dist/design-system/tokens/core.tokens.css';
import '@egovmd/mud/dist/design-system/design-system.css';
import { defineCustomElements } from '@egovmd/mud-web-components';

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
      href="/node_modules/@egovmd/mud/dist/design-system/tokens/core.tokens.css"
    />
    <link
      rel="stylesheet"
      href="/node_modules/@egovmd/mud/dist/design-system/design-system.css"
    />
    <script type="importmap">
      {
        "imports": {
          "@egovmd/mud-web-components": "/node_modules/@egovmd/mud-web-components/dist/index.js",
          "@egovmd/mud/loader": "/node_modules/@egovmd/mud/loader/index.js"
        }
      }
    </script>
  </head>
  <body>
    <mud-button variant="primary"><button>Click me</button></mud-button>
    <script type="module">
      import { defineCustomElements } from '@egovmd/mud-web-components';
      defineCustomElements();
    </script>
  </body>
</html>
```

## Local demo

From the repo root:

```bash
yarn build       # one-time: produces dist/ and loader/ for @egovmd/mud
yarn build.web   # compile @egovmd/mud-web-components
yarn demo.web    # serve the demo at http://localhost:5174
```

The demo lives in [`demo/index.html`](./demo/index.html) and showcases
`<mud-button>` variants + sizes.

## Available components

Every component published by `@egovmd/mud` is registered. The full list
is browseable in [Storybook](../.storybook/). Highlights include:

- `<mud-button>` — primary action button
- `<mud-input>`, `<mud-textarea>` — form fields
- `<mud-select>`, `<mud-pagination-item>`, `<mud-toast-notification>`, `<mud-avatar>` — …

## API

`defineCustomElements(opts?: { resourcesUrl?: string; syncQueue?: boolean })` —
registers every Stencil custom element on the current document. Returns a
`Promise<void>` that resolves once polyfills (if any) are loaded.

`setNonce(nonce: string)` — set a CSP nonce that Stencil applies to injected
`<style>` tags.

TypeScript users also get full element type augmentation (`HTMLCorButtonElement`,
`HTMLCorInputElement`, …) and prop interfaces via `export type *` from
`@egovmd/mud`.
