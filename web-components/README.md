# @age/web-components

Vanilla HTML / JavaScript adapter for the AGE Design System. Registers every
Stencil-compiled custom element (`<mud-button>`, `<mud-input>`, …) so they can
be used in any HTML page or non-framework app.

## Install

```bash
yarn add @age/web-components @age/design-system
```

## Usage — with a bundler (Vite, webpack, esbuild, …)

```ts
import '@age/design-system/dist/design-system/tokens/core.tokens.css';
import '@age/design-system/dist/design-system/design-system.css';
import { defineCustomElements } from '@age/web-components';

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
      href="/node_modules/@age/design-system/dist/design-system/tokens/core.tokens.css"
    />
    <link
      rel="stylesheet"
      href="/node_modules/@age/design-system/dist/design-system/design-system.css"
    />
    <script type="importmap">
      {
        "imports": {
          "@age/web-components": "/node_modules/@age/web-components/dist/index.js",
          "@age/design-system/loader": "/node_modules/@age/design-system/loader/index.js"
        }
      }
    </script>
  </head>
  <body>
    <mud-button variant="primary"><button>Click me</button></mud-button>
    <script type="module">
      import { defineCustomElements } from '@age/web-components';
      defineCustomElements();
    </script>
  </body>
</html>
```

## Local demo

From the repo root:

```bash
yarn build       # one-time: produces dist/ and loader/ for @age/design-system
yarn build.web   # compile @age/web-components
yarn demo.web    # serve the demo at http://localhost:5174
```

The demo lives in [`demo/index.html`](./demo/index.html) and showcases
`<mud-button>` variants + sizes.

## Available components

Every component published by `@age/design-system` is registered. The full list
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
`@age/design-system`.
