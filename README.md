# AGE Design System — Integration Guide

This document provides step-by-step instructions for building, publishing, and using the AGE Design System (`@age/design-system` Stencil web components + the `@age/web-components` vanilla adapter) in any application — bundler-based or plain HTML.

## Table of Contents

1. [Quick Start - General Steps](#quick-start---general-steps)
2. [Web Components (Vanilla HTML / JS) Build & Setup](#web-components-vanilla-html--js-build--setup)
3. [Publishing Options](#publishing-options)
4. [Installing in Applications](#installing-in-applications)
5. [Troubleshooting](#troubleshooting)
6. [Development Workflow](#development-workflow)
7. [Summary Checklist](#summary-checklist)
8. [Storybook](#storybook--development-production-build-and-preview)
9. [Tokens](#tokens--sync-audit-lint-and-developer-dx)
10. [Additional Resources](#additional-resources)

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

For any consumer — bundler-based or plain HTML — use `@age/web-components`. Because Stencil already compiles to native custom elements, this adapter is a *thin* re-export of the loader; no framework-specific build step is required.

### Step 1: Build Stencil Components

In the `age-design` project root:

```bash
yarn build
```

This produces `dist/`, `loader/`, and `dist/types/` — all the runtime files the vanilla adapter re-exports.

### Step 2: Build the `@age/web-components` Package

```bash
yarn build.web
```

This command:

- Depends on the base `build` (wireit handles the ordering)
- Runs `tsc` inside `web-components/` to compile `src/index.ts` → `dist/index.js` + `dist/index.d.ts`

The `web-components/dist/` folder will contain:

- `index.js` — re-exports `defineCustomElements` and `setNonce` from `@age/design-system/loader`
- `index.d.ts` — type declarations including full element type augmentation (`HTMLCorButtonElement`, …)

### Step 3: Run the local demo

```bash
yarn demo.web
```

Opens `http://localhost:5174` with a live `<mud-button>` showcase (variants + sizes) served by Vite from [`web-components/demo/index.html`](web-components/demo/index.html).

The demo proves the export is *complete* — every component is registered by `defineCustomElements()`, even though the demo only renders the button. Verify in the browser console:

```js
defineCustomElements().then(() =>
  console.log(Object.keys(window).filter(k => k.startsWith('HTMLCor')))
);
```

You should see the full list (`HTMLCorButtonElement`, `HTMLCorInputElement`, `HTMLCorIconElement`, …).

### Files

```text
web-components/
├── src/index.ts              # defineCustomElements + type re-exports
├── demo/
│   ├── index.html            # mud-button showcase
│   ├── main.ts               # CSS imports + defineCustomElements()
│   ├── demo.css              # @font-face for Onest + body font-family
│   └── vite.config.ts        # port 5174, allows fs access to portal-linked parent
├── package.json              # @age/web-components, portal:.. to @age/design-system
├── tsconfig.json             # ES2020, declaration: true
└── README.md
```

---

## Publishing Options

Two packages need to be published together: the Stencil core (`@age/design-system`) and the vanilla adapter (`@age/web-components`). Pick whichever registry option fits your team.

### Option A: Publish to GitLab Package Registry (Private)

The repo's `publishConfig` already points at GitLab — this is the default path.

```bash
# Stencil core
cd dist
yarn publish

# Vanilla adapter
cd ../web-components
yarn version --patch   # or --minor / --major
yarn publish
```

Configure authentication in `~/.npmrc`:

```bash
@age:registry=https://gitlab.com/api/v4/projects/44763899/packages/npm/
//gitlab.com/api/v4/projects/44763899/packages/npm/:_authToken=YOUR_GITLAB_DEPLOY_TOKEN
```

### Option B: Publish to npm Registry (Private or Public)

Update `publishConfig` in both `package.json` (root) and `web-components/package.json`:

```json
{
  "publishConfig": {
    "registry": "https://registry.npmjs.org/",
    "access": "restricted"
  }
}
```

Authenticate with `npm login`, then:

```bash
cd dist && yarn publish
cd ../web-components && yarn version --patch && yarn publish
```

### Option C: Publish to Bitbucket Package Registry (Private)

Configure `~/.npmrc` with a Bitbucket App Password (Repositories: Read+Write, Account: Read):

```bash
@YOUR_WORKSPACE:registry=https://api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/
//api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/:_password=YOUR_APP_PASSWORD
//api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/:username=YOUR_BITBUCKET_USERNAME
//api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/:email=YOUR_EMAIL
//api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/:always-auth=true
```

Update both packages' `publishConfig` to the same URL, rename the packages with your workspace prefix, then:

```bash
cd dist && yarn publish
cd ../web-components && yarn version --patch && yarn publish
```

### Option D: Local Development with `yarn link` (No Token Required)

```bash
# In age-design root
yarn build
cd dist && yarn link
cd ../web-components && yarn link && yarn build

# In your consuming app
yarn link @age/design-system
yarn link @age/web-components
```

### Option E: Install from Local Path (No Token Required)

```bash
yarn add file:/absolute/path/to/age-design/dist
yarn add file:/absolute/path/to/age-design/web-components
```

---

## Installing in Applications

### Vanilla HTML / Plain JS Application

`@age/web-components` is framework-agnostic — it works with any application that can load ES modules.

#### Step 1: Install Dependencies

```bash
yarn add @age/design-system @age/web-components
```

#### Step 2: Usage — with a bundler (Vite, webpack, esbuild, …)

```ts
import '@age/design-system/dist/design-system/tokens/core.tokens.css';
import '@age/design-system/dist/design-system/design-system.css';
import { defineCustomElements } from '@age/web-components';

defineCustomElements();
```

```html
<mud-button variant="primary"><button>Click me</button></mud-button>
```

#### Step 3: Usage — plain HTML with `<script type="importmap">`

When you have no bundler, resolve the bare specifiers via an import map:

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="/node_modules/@age/design-system/dist/design-system/tokens/core.tokens.css" />
    <link rel="stylesheet" href="/node_modules/@age/design-system/dist/design-system/design-system.css" />
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

#### Self-hosting the Onest font

The compiled `design-system.css` does **not** ship an `@font-face` declaration. If you want the design system's primary font (`Onest`), add one yourself — example pattern (matches the in-repo demo at [`web-components/demo/demo.css`](web-components/demo/demo.css)):

```css
@font-face {
  font-family: 'Onest';
  src: url('/assets/font/Onest/Onest-VariableFont_wght.ttf') format('truetype');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

html, body {
  font-family: 'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

You can copy the TTF from `node_modules/@age/design-system/assets/font/Onest/` or load Onest from Google Fonts (`https://fonts.googleapis.com/css2?family=Onest:wght@100..900&display=swap`).

#### API

- `defineCustomElements(opts?)` — registers every Stencil custom element on the current document; returns a `Promise<void>`
- `setNonce(nonce: string)` — applies a CSP nonce to injected `<style>` tags
- Full element type augmentation (`HTMLCorButtonElement`, `HTMLCorInputElement`, …) and prop / event interfaces are re-exported via `export type *` from `@age/design-system`

#### Framework-specific usage

Because the components are native custom elements, they integrate with every modern framework without a wrapper layer:

- **React 19+** treats unknown lowercase tags as custom elements and forwards props/attributes directly. Use `ref` for imperative APIs and standard `addEventListener` for events.
- **Vue 3** needs `app.config.compilerOptions.isCustomElement = tag => tag.startsWith('mud-')` (or via `vite-plugin-vue`'s `template.compilerOptions`).
- **Angular 14+** needs `CUSTOM_ELEMENTS_SCHEMA` in the `NgModule`'s `schemas` array (or the standalone component's `schemas`). Use `(event)` bindings against the dispatched custom-event name.
- **Svelte**, **SolidJS**, **Lit** — work out of the box; no extra config required.

---

## Troubleshooting

### Issue: TypeScript errors for component properties

**Cause:** Vanilla adapter not installed; type augmentation never registered.

**Solution:**

```bash
yarn add @age/design-system @age/web-components
```

Then ensure your `tsconfig.json`'s `compilerOptions.types` (or a global declaration file) imports the augmentation:

```ts
// src/types/age.d.ts
import type {} from '@age/web-components';
```

### Issue: Styles not applied

**Cause:** Core token CSS or design-system CSS not imported.

**Solution:** Import both at app startup, before calling `defineCustomElements()`:

```ts
import '@age/design-system/dist/design-system/tokens/core.tokens.css';
import '@age/design-system/dist/design-system/design-system.css';
```

### Issue: Components don't render in the DOM

**Cause:** `defineCustomElements()` was never called, or it ran after the elements were inserted.

**Solution:** Call `defineCustomElements()` once at the earliest startup point. The Stencil loader is async — components upgrade as soon as the call resolves, even if the markup is already in the DOM.

### Issue: Vite / esbuild can't resolve `@age/web-components`

**Cause:** Yarn workspaces resolve the package via a symlink/portal that some bundlers don't follow.

**Solution:** Set `optimizeDeps.include: ['@age/web-components', '@age/design-system/loader']` in your Vite config, or add the packages to esbuild's `external` list and use an import map for runtime resolution.

---

## Development Workflow

1. Edit Stencil components in `src/components/`.
2. Run `yarn dev` — Stencil + Storybook + token watch in parallel (services managed by Wireit).
3. For vanilla-adapter changes, run `yarn build && yarn build.web && yarn demo.web` to verify against the demo at `http://localhost:5174`.
4. Lint tokens before any token change: `yarn tokens.lint.all`.
5. Commit, push, open a PR — CI rebuilds, runs tests, and verifies no auto-generated files are stale.

---

## Summary Checklist

- [ ] Install dependencies: `yarn install`
- [ ] Build Stencil components: `yarn build`
- [ ] Build vanilla adapter: `yarn build.web`
- [ ] Visually verify demo: `yarn demo.web` (<http://localhost:5174>)
- [ ] Install in app: `yarn add @age/design-system @age/web-components`
- [ ] Import token CSS + design-system CSS, then call `defineCustomElements()` once at startup
- [ ] Lint tokens before any token change: `yarn tokens.lint.all`

---

## Storybook — development, production build, and preview

### Development (hot-reload)

Starts Stencil in watch mode and the Storybook dev server together. Waits for `dist/` to be ready before launching Storybook.

```bash
yarn dev
```

Storybook is available at `http://localhost:6007`.

### Production build

Compiles the full component library (`dist/`) then builds the static Storybook site (`storybook-static/`). Use this to verify the production output before deploying.

```bash
yarn sp.build
```

> `sp.build` is an alias for the same task — both are equivalent.

### Preview the production build locally

After `sp.build` completes, serve `storybook-static/` locally to inspect it exactly as it will appear in production:

```bash
yarn sp.serve
```

Opens at `http://localhost:6008` (port 6008 is intentionally one above the dev server so both can run side-by-side).

### Script reference

| Script | Output | Purpose |
| --- | --- | --- |
| `yarn dev` | — | Dev server with hot-reload (Stencil + Storybook) |
| `yarn sp.build` | `storybook-static/` | Full production build |
| `yarn sp.serve` | — | Serve `storybook-static/` at port 6008 |

---

## Tokens — sync, audit, lint, and developer DX

This project uses Style Dictionary tokens stored under `tokens/` and a Tokenhaus Figma export workflow. Follow these guidelines for syncing, testing, auditing, and consuming tokens.

- Recommended Figma plugin: "Tokenhaus — Variable Import/Export (with links)" (search the Figma Community). Use that plugin to export a Tokenhaus JSON file (the repo expects `tokens-tokenhaus.json` by default).

- Sync workflow (safe, review-first):
  1. In Figma install and run the Tokenhaus plugin and export variables to a JSON file (eg. `tokens-tokenhaus.json`).
  2. Run the built-in sync helper which converts the Tokenhaus export into the repo's Style Dictionary token files:

      ```bash
      yarn sync:tokens
      # or, directly:
      node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --output tokens/figma-export
      ```

  3. Generated files land in `tokens/figma-export/` (this script never overwrites `tokens/core/` or `tokens/core.dark/`). Review and diff the generated output carefully.
  4. Manually copy approved files from `tokens/figma-export/` into `tokens/core/` and `tokens/core.dark/` as appropriate, commit, then run the token build step.

- Sync script CLI (useful flags):
  - `--input <file>` — path to Tokenhaus JSON (default: `tokens-tokenhaus.json`)
  - `-o, --output <dir>` — output directory (default: `tokens/figma-export`)
  - `--brand <mode>` — optional brand/variant selector used by the script
  - `--dry-run` — validate and print actions without writing files
  - `--report <file>` — write a JSON report of mapping/warnings
  - `--strict` — fail on unresolved references or unexpected shapes

- Token build & watch
  - Rebuild tokens (dev): `yarn tokens.build`
  - Production token build (CSS + JSON used by dist): `yarn tokens.build.prod`
  - AGE-specific tokens: `yarn tokens.build.age`
  - Watch tokens during development: `yarn tokens.watch`

- Audit & lint commands (run before committing changes):
  - `yarn tokens.audit` — run a missing-reference audit for the light token config
  - `yarn tokens.audit.dark` — run the missing-reference audit for dark tokens
  - `yarn tokens.lint` — lint tokens under `tokens/core` (naming, references, schema)
  - `yarn tokens.lint.dark` — lint tokens under `tokens/core.dark`
  - `yarn tokens.lint.all` — lint both `tokens/core` and `tokens/core.dark`

What each does briefly:

- audit (`debug-missing-token-references.mjs`): scans Style Dictionary configs for references that can't be resolved and prints human-friendly context and file/line locations to help you fix missing or broken token links.
- lint (`scripts/tokens-lint.mjs`): validates token filename conventions, key naming, required fields, and other repo-specific rules; it returns non-zero on errors.

- Typical developer DX flow
  1. Export from Figma (Tokenhaus) → `tokens-tokenhaus.json`.
  2. Run `yarn sync:tokens` (or with `--dry-run`) → inspect `tokens/figma-export/`.
  3. Copy approved files into `tokens/core/` and/or `tokens/core.dark/`.
  4. Run `yarn tokens.lint` and `yarn tokens.audit` and fix issues.
  5. Run `yarn tokens.build` (or `yarn build` to run full product build).
  6. Verify generated CSS appears under `tokens/generated/` and that Storybook/previews pick up updated tokens.

- Where files land and what consumes them
  - Source token JSON: `tokens/core/**/*.tokens.json` and `tokens/core.dark/**/*.tokens.json`
  - Generated build outputs: `tokens/generated/` and `dist/design-system/tokens/` (used by Storybook and package consumers)
  - Storybook assets: `.storybook/stories/assets/core.tokens.json` and `core.dark.tokens.json`

- Helpful tips
  - Always run lint & audit before opening a PR that modifies tokens.
  - Use `--dry-run` when experimenting with the sync tool so you don't accidentally overwrite generated staging files.
  - When in doubt, keep token changes small and submit a separate PR for tokens only — tokens affect the entire design system and are easier to review when isolated.

---

## Additional Resources

- [MDN — Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [Stencil documentation](https://stenciljs.com/docs/introduction)
- [Import maps specification](https://github.com/WICG/import-maps)
