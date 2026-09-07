# Moldova UI Design System (MUD)

**Moldova UI Design System** is the official design system of the Republic of Moldova, developed and maintained by the [Electronic Governance Agency (Agenția de Guvernare Electronică — AGE)](https://egov.md). It provides a unified set of UI components, design tokens, and guidelines so that Moldovan government digital services share a consistent look, feel, and accessibility baseline.
This repository contains two npm packages:

| Package | Description |
| --- | --- |
| [`@egov-moldova/mud`](https://www.npmjs.com/package/@egov-moldova/mud) | Core Stencil web components — framework-agnostic, Shadow DOM–isolated |
| [`@egov-moldova/mud-web-components`](https://www.npmjs.com/package/@egov-moldova/mud-web-components) | Vanilla HTML/JS adapter — thin re-export of the Stencil loader for script-tag usage |

> **Who should use this?** Any team building a Moldovan e-government product or service. The components implement the MUD visual language and WCAG 2.1 AA accessibility requirements out of the box.

> **Terminology:** **MUD** refers to the *Moldova UI Design System*.

---

## Table of Contents

1. [Motivation](#motivation)
2. [Quick Start - General Steps](#quick-start---general-steps)
3. [Web Components (Vanilla HTML / JS) Build & Setup](#web-components-vanilla-html--js-build--setup)
4. [Publishing](#publishing)
5. [Getting Started](#getting-started)
6. [Additional Resources](#additional-resources)

---

## Motivation

Citizens interact with dozens of Moldovan government digital services — tax filings,
civil registry requests, business licensing, healthcare portals — each historically
built by different teams, on different stacks, with different visual languages.
The result is a fragmented experience: a button doesn't look or behave the same way
twice, form validation patterns differ from one service to the next, and accessibility
is implemented (or not) inconsistently across properties.

This fragmentation has real costs:

- **Cognitive load for citizens** — every new service requires relearning how to
  interact with it, instead of transferring familiarity from services they've already used
- **Duplicated effort for teams** — each product team re-solves the same UI problems
  (accessible form controls, responsive layouts, error states) from scratch
- **Inconsistent accessibility** — WCAG compliance becomes optional and team-dependent,
  rather than guaranteed by default
- **Slower delivery** — building and QA-ing UI primitives from zero adds weeks to every
  new service launch

Moldova UI Design System solves this by providing a single, framework-agnostic
source of truth for the components and visual language used across e-government
properties. Built on Web Components with Shadow DOM isolation, MUD works identically
whether a team is using React, Vue, plain HTML, or anything else — so consistency isn't
contingent on every team adopting the same framework.

A citizen who learns how to fill out a form on one government site should already know
how to fill out a form on the next one. That consistency is not a cosmetic nicety —
it's a measurable reduction in support burden, abandonment rates, and time-to-completion
across public services.

---

## Quick Start - General Steps

### Step 1: Install Dependencies (First Time Only)

In the `age-design` project root:

```bash
yarn install
```

### Step 2: Build Stencil Components (Regular Build)

```bash
yarn build
```

This command will:

- Clean and regenerate design tokens
- Build Stencil components
- Generate distribution files (`dist/`, `loader/`, `dist/types/`)

---

## Web Components (Vanilla HTML / JS) Build & Setup

For any consumer — bundler-based or plain HTML — use `@egov-moldova/mud-web-components`. Because Stencil already compiles to native custom elements, this adapter is a *thin* re-export of the loader; no framework-specific build step is required.

### Step 1: Build Stencil Components

In the `age-design` project root:

```bash
yarn build
```

This produces `dist/`, `loader/`, and `dist/types/` — all the runtime files the vanilla adapter re-exports.

### Step 2: Build the `@egov-moldova/mud-web-components` Package

```bash
yarn build.web
```

This command:

- Depends on the base `build` (wireit handles the ordering)
- Runs `tsc` inside `web-components/` to compile `src/index.ts` → `dist/index.js` + `dist/index.d.ts`

The `web-components/dist/` folder will contain:

- `index.js` — re-exports `defineCustomElements` and `setNonce` from `@egov-moldova/mud/loader`
- `index.d.ts` — type declarations including full element type augmentation (`HTMLMudButtonElement`, …)

### Step 3: Run the local demo

```bash
yarn demo.web
```

Opens `http://localhost:5174` with a live `<mud-button>` showcase (variants + sizes) served by Vite from [`web-components/demo/index.html`](web-components/demo/index.html).

The demo proves the export is *complete* — every component is registered by `defineCustomElements()`, even though the demo only renders the button. Verify in the browser console:

```js
defineCustomElements().then(() =>
  console.log(Object.keys(window).filter(k => k.startsWith('HTMLMud')))
);
```

You should see the full list (`HTMLMudButtonElement`, `HTMLMudInputElement`, `HTMLMudIconElement`, …).

### Files

```text
web-components/
├── src/index.ts              # defineCustomElements + type re-exports
├── demo/
│   ├── index.html            # mud-button showcase
│   ├── main.ts               # CSS imports + defineCustomElements()
│   ├── demo.css              # @font-face for Onest + body font-family
│   └── vite.config.ts        # port 5174, allows fs access to portal-linked parent
├── package.json              # @egov-moldova/mud-web-components
├── tsconfig.json             # ES2020, declaration: true
└── README.md
```

---

## Publishing

Both packages are published to the public npm registry under the `@egov-moldova` scope. Publishing is handled automatically by the Azure Pipelines CI on each run — a new build number is used as the version.

CI runs `yarn validate.package` immediately before publishing, and the run fails rather than shipping if the tarball does not match what `package.json` declares. The gate checks that every declared entrypoint is present, that no source map or development-mode runtime ships, that no build-machine path leaks into the type declarations, that the standalone custom-elements bundle carries its assets, and that `yarn pack` and `npm pack` still resolve the same file list — the gate measures the first, CI publishes the second. Run it yourself after `yarn build` before any manual publish.

To publish manually (requires an npm token with write access to `@egov-moldova`):

```bash
# Stencil core
yarn build && yarn validate.package
npm config set //registry.npmjs.org/:_authToken YOUR_NPM_TOKEN
npm publish --access public

# Vanilla adapter
cd web-components
npm config set //registry.npmjs.org/:_authToken YOUR_NPM_TOKEN
npm publish --access public
```

For local development without publishing, use local path installs:

```bash
yarn add file:/absolute/path/to/age-design
yarn add file:/absolute/path/to/age-design/web-components
```

---

## Getting Started

### Prerequisites

- Node.js `>=24.0.0 <25.0.0`
- Yarn (this monorepo uses Yarn workspaces)

### Installation

Two categories, depending on whether your project has a JS bundler.

#### Without a bundler

No npm install, no build step. Two ways to wire it up — pick one.

> ⚠️ Pin a version — replace `1.1.5` below with the release you need (see [npm versions](https://www.npmjs.com/package/@egov-moldova/mud?activeTab=versions)). Omitting the version defaults to `@latest`, which can silently break on a future major release.

**Option A — Script Tag (CDN)**

Paste directly into any HTML page's `<head>` — it self-registers every `mud-*` element on load, no `import` statement needed.

```html
  <!-- Design tokens (light + dark) -->                                                                                                                                                                                                                                                                            
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/design-system@1.1.5/dist/mud/tokens/core.tokens.css">                                                                                                                                                                                                    
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/design-system@1.1.5/dist/mud/tokens/core.dark.tokens.css">                                                                                                                                                                                               
                                                                                                                                                                                                                                                                                                                   
  <!-- Global styles (fonts, resets) -->                                                                                                                                                                                                                                                                           
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/design-system@1.1.5/dist/mud/mud.css">                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                                                                                   
  <!-- Self-registers every mud-* custom element on load — no import, no defineCustomElements() call -->                                                                                                                                                                                                           
  <script type="module" src="https://cdn.jsdelivr.net/npm/@egov-moldova/design-system@1.1.5/dist/mud/mud.esm.js"></script>
```

**Option B — Import Map**

For a locally installed package (`yarn add @egov-moldova/design-system`) served by a static server that exposes `node_modules/` — resolves the bare specifier via the browser's native import map instead of a bundler, while still using the explicit `defineCustomElements()` pattern.

```html
  <!-- Design tokens (light + dark) -->
  <link rel="stylesheet" href="/node_modules/@egov-moldova/design-system/dist/mud/tokens/core.tokens.css">
  <link rel="stylesheet" href="/node_modules/@egov-moldova/design-system/dist/mud/tokens/core.dark.tokens.css">

  <!-- Global styles (fonts, resets) -->
  <link rel="stylesheet" href="/node_modules/@egov-moldova/design-system/dist/mud/mud.css">

  <script type="importmap">
  {
    "imports": {
      "@egov-moldova/design-system/loader": "/node_modules/@egov-moldova/design-system/loader/index.js"
    }
  }
  </script>
  <script type="module">
    import { defineCustomElements } from '@egov-moldova/design-system/loader';
    defineCustomElements();
  </script>
```

#### With a bundler

Any bundler (Vite, webpack, esbuild, Angular CLI, …) that resolves bare imports.

**Step 1 — Install**

```bash
yarn add @egov-moldova/design-system @egov-moldova/design-system-web-components
```

**Step 2 — Usage**

```js
  // Design tokens as CSS custom properties — required by every component (light + dark themes)                                                                                                                                                                                                                    
  import '@egov-moldova/tokens/core.tokens.css';
  import '@egov-moldova/tokens/core.dark.tokens.css';
  
  // Global styles — fonts and resets shared across all components                                                                                                                                                                                                                                                 
  import '@egov-moldova/styles.css';
  
  // Registers every mud-* custom element with the browser via bootstrapLazy.                                                                                                                                                                                                                                      
  // Bare import — requires a bundler to resolve; runs once at startup.                                                                                                                                                                                                                                            
  import { defineCustomElements } from '@egov-moldova/mud-web-components';
  defineCustomElements();
```

####  React component wrappers
> Not yet published. `@egov-moldova/design-system-react` is still in development — until it ships, consume the components as raw custom elements via [With a bundler](#with-a-bundler) above.

#### API

- `defineCustomElements(opts?)` — registers every Stencil custom element on the current document; returns a `Promise<void>`
- `setNonce(nonce: string)` — applies a CSP nonce to injected `<style>` tags
- Full element type augmentation (`HTMLMudButtonElement`, `HTMLMudInputElement`, …) and prop / event interfaces are re-exported via `export type *` from `@egov-moldova/mud`

#### Framework-specific usage

Because the components are native custom elements, they integrate with every modern framework without a wrapper layer:

- **React 19+** treats unknown lowercase tags as custom elements and forwards props/attributes directly. Use `ref` for imperative APIs and standard `addEventListener` for events.
- **Vue 3** needs `app.config.compilerOptions.isCustomElement = tag => tag.startsWith('mud-')` (or via `vite-plugin-vue`'s `template.compilerOptions`).
- **Angular 14+** needs `CUSTOM_ELEMENTS_SCHEMA` in the `NgModule`'s `schemas` array (or the standalone component's `schemas`). Use `(event)` bindings against the dispatched custom-event name.
- **Svelte**, **SolidJS**, **Lit** — work out of the box; no extra config required.

---

## Additional Resources

- [Design](https://mud.egov.md/)
- [MUD Design System on npm](https://www.npmjs.com/package/@egov-moldova/mud)
- [eGov Moldova — Agency for Electronic Governance](https://egov.md)
- [MDN — Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [Stencil documentation](https://stenciljs.com/docs/introduction)
