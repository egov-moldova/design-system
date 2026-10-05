# Moldova UI Design System (MUD)

**Moldova UI Design System** is the official design system of the Republic of Moldova, developed and maintained by the [Electronic Governance Agency (Agenția de Guvernare Electronică — AGE)](https://egov.md). It provides a unified set of UI components, design tokens, and guidelines so that Moldovan government digital services share a consistent look, feel, and accessibility baseline.
This repository contains two npm packages:

> **Terminology:** **MUD** refers to the *Moldova UI Design
> System*.
 
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

## Packages

This repository is a monorepo containing the packages below. The core and the vanilla adapter are published; the React, Vue and Angular adapters are not yet published.

| Package                                                                                                       | Description                                                                                                           |
|---------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| [`@egov-moldova/mud`](https://www.npmjs.com/package/@egov-moldova/mud)                              | Core Stencil web components — framework-agnostic, Shadow DOM–isolated                                                 |
| [`@egov-moldova/mud-web-components`](https://www.npmjs.com/package/@egov-moldova/mud-web-components)| Vanilla HTML/JS adapter — thin re-export of the Stencil loader for script-tag usage                                   |
| `@egov-moldova/mud-react`                                                                           | ![In Progress](https://img.shields.io/badge/status-in%20progress-yellow)<br>React adapter — typed JSX wrapper components |
| `@egov-moldova/mud-vue`                                                                             | ![In Progress](https://img.shields.io/badge/status-in%20progress-yellow)<br>Vue adapter — typed wrapper components with `v-model` |
| `@egov-moldova/mud-angular`                                                                         | ![In Progress](https://img.shields.io/badge/status-in%20progress-yellow)<br>Angular adapter — typed standalone components and form value accessors |
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/mud@1.1.5/dist/mud/tokens/core.tokens.css">                                                                                                                                                                                                    
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/mud@1.1.5/dist/mud/tokens/core.dark.tokens.css">                                                                                                                                                                                               
                                                                                                                                                                                                                                                                                                                   
  <!-- Global styles (fonts, resets) -->                                                                                                                                                                                                                                                                           
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@egov-moldova/mud@1.1.5/dist/mud/mud.css">                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                                                                                   
  <!-- Self-registers every mud-* custom element on load — no import, no defineCustomElements() call -->                                                                                                                                                                                                           
  <script type="module" src="https://cdn.jsdelivr.net/npm/@egov-moldova/mud@1.1.5/dist/mud/mud.esm.js"></script>
```

`mud.esm.js` loads its component chunks, and every icon, logo and flag, from the folder it sits in, so the CDN path above is all it needs. Self-hosting it means serving the whole `dist/mud/` folder, not the one file: the chunks and the font live beside it.

**Option B — Import Map**

For a locally installed package (`yarn add @egov-moldova/mud`) served by a static server that exposes `node_modules/` — resolves the bare specifier via the browser's native import map instead of a bundler, while still using the explicit `defineCustomElements()` pattern.

```html
  <!-- Design tokens (light + dark) -->
  <link rel="stylesheet" href="/node_modules/@egov-moldova/mud/dist/mud/tokens/core.tokens.css">
  <link rel="stylesheet" href="/node_modules/@egov-moldova/mud/dist/mud/tokens/core.dark.tokens.css">

  <!-- Global styles (fonts, resets) -->
  <link rel="stylesheet" href="/node_modules/@egov-moldova/mud/dist/mud/mud.css">

  <script type="importmap">
  {
    "imports": {
      "@egov-moldova/mud/loader": "/node_modules/@egov-moldova/mud/loader/index.js"
    }
  }
  </script>
  <script type="module">
    import { defineCustomElements } from '@egov-moldova/mud/loader';
    defineCustomElements();
  </script>
```

#### With a bundler

Any bundler (Vite, webpack, esbuild, Angular CLI, …) that resolves bare imports.

**Step 1 — Install**

```bash
yarn add @egov-moldova/mud @egov-moldova/mud-web-components
```

**Step 2 — Usage**

```js
  // Design tokens as CSS custom properties — required by every component (light + dark themes)                                                                                                                                                                                                                    
  import '@egov-moldova/mud/tokens/core.tokens.css';
  import '@egov-moldova/mud/tokens/core.dark.tokens.css';
  
  // Global styles — fonts and resets shared across all components                                                                                                                                                                                                                                                 
  import '@egov-moldova/mud/styles.css';
  
  // Registers every mud-* custom element with the browser via bootstrapLazy.                                                                                                                                                                                                                                      
  // Bare import — requires a bundler to resolve; runs once at startup.                                                                                                                                                                                                                                            
  import { defineCustomElements } from '@egov-moldova/mud-web-components';
  defineCustomElements();
```

Icons, logos and flags need no step of their own: see [Icons, logos and flags](#icons-logos-and-flags).

> **Do not import `@egov-moldova/mud/mud.esm.js` from a bundled app.** It registers the elements, but the component chunks 404: the script-tag build resolves each `./<id>.entry.js` against its own URL, and a bundler never emits those files. In a bundler use `defineCustomElements()` as above, or a framework adapter below. `mud.esm.js` is for a `<script type="module">` tag, from a CDN or with the whole `dist/mud/` served.

#### Fonts

`styles.css` brings the Onest typeface with it — no `@font-face` of your own, no font files to copy. It declares one variable WOFF2 face (weights 100–900) referenced by a relative URL, so it resolves wherever `dist/mud/` goes:

- **Bundlers** (Vite, webpack, Angular CLI, Next.js) find `./assets/fonts/onest-variable.woff2` next to the stylesheet and emit it with your build. **esbuild** used directly needs a loader for it: `--loader:.woff2=file`.
- **CDN** — the font is fetched from the same CDN path as `mud.css`; jsDelivr and unpkg send the `Access-Control-Allow-Origin` header cross-origin fonts require.
- **Self-hosted** — serve `dist/mud/` as one directory; copying `mud.css` alone leaves the font behind.

With a Content Security Policy, `font-src` must allow wherever `mud.css` is served from (`'self'`, or the CDN origin).

Releases up to and including 1.1.9 ship three static faces (400/500/700) instead, so semibold text renders bold there — pin a later release in the CDN examples above to get the variable face (see the [changelog](CHANGELOG.md)).

#### Icons, logos and flags

`mud-icon`, `mud-logo` and the country flags of `mud-phone-input` load automatically, and only when they are shown: each drawing is a small JavaScript module that the component imports the first time it needs it. There is no asset step: no folder to copy, no path to set, no plugin or provider to install, and no SVG files in the package.

The drawings are hashed chunks named `p-<hash>.js`. If you serve `dist/mud/` yourself, keep the whole folder together (see [Without a bundler](#without-a-bundler)).

The country flags come from [flag-icons](https://github.com/lipis/flag-icons) (MIT). Its licence notice ships as `dist/mud/licenses/flag-icons.txt` and as a `/*! */` comment in the flag chunk.

**Service workers / PWA.** A service worker that precaches every file downloads every icon, logo and flag chunk (about 2.9 MB) when it installs, although a page shows only a few of them. The chunk names are hashed, so a file-name glob cannot single them out. Precache the app shell and route the remaining JavaScript chunks through runtime caching (in Workbox, a `CacheFirst` strategy), or filter the precache entries by content in `manifestTransforms`.

**Content Security Policy.** The drawings arrive as JavaScript modules, so `script-src` covers them, and they carry no `style` attribute. No `img-src` or `connect-src` entry is needed for them. Fonts are the exception: see [Fonts](#fonts).

#### React component wrappers
> Not yet published. `@egov-moldova/mud-react` is still in development — until it ships, consume the components as raw custom elements via [With a bundler](#with-a-bundler) above.

Typed wrapper components for React 18 and 19 (peers `react ^18 || ^19`, `react-dom ^18 || ^19`). Event handlers are props (`onMudInput`, `onMudChange`), not `addEventListener` calls. `mudInput` fires on every keystroke and `mudChange` on commit, so bind a controlled `value` to `onMudInput`.

```bash
yarn add @egov-moldova/mud @egov-moldova/mud-react
```

Import the design tokens and the global styles once, then render the components. There is no setup call: [icons, logos and flags](#icons-logos-and-flags) load on their own.

```tsx
// main.tsx
import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/styles.css';

import { createRoot } from 'react-dom/client';

import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

```tsx
// App.tsx
import { MudIcon, MudLogo, MudPhoneInput, MudSelect } from '@egov-moldova/mud-react';

export function App() {
  return (
    <main>
      <MudIcon data-testid="asset-icon" name="calendar" size={24} />
      <MudLogo data-testid="asset-logo" name="mpass-logo-with-name" />
      <MudPhoneInput data-testid="asset-phone" aria-label="Phone" />
      <MudSelect data-testid="asset-select" aria-label="Fruit">
        <option value="apple">Apple</option>
        <option value="pear">Pear</option>
      </MudSelect>
    </main>
  );
}
```

The `data-testid` attributes are how this repository's browser tests find each element; leave them out in your app.

**Each wrapper registers its own element when it is imported.** A raw `<mud-x>` tag written in JSX without its wrapper stays an unknown element. Import the wrapper, or call `defineCustomElement` from `@egov-moldova/mud/components/mud-x.js`. The adapter also re-exports `setNonce` for a Content Security Policy nonce.

#### Vue component wrappers
> Not yet published. `@egov-moldova/mud-vue` is still in development — until it ships, consume the components as raw custom elements via [With a bundler](#with-a-bundler) above.

Typed wrapper components for Vue 3 (peer `vue ^3.4.38`), with `v-model` on all 17 form controls. No `isCustomElement` option is needed, and no plugin to install: [icons, logos and flags](#icons-logos-and-flags) load on their own.

```bash
yarn add @egov-moldova/mud @egov-moldova/mud-vue
```

Type-checking the library's declarations without `skipLibCheck` also needs `vue-router` installed: the generated types import it.

```ts
// main.ts
import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/styles.css';

import { createApp } from 'vue';

import App from './App.vue';

createApp(App).mount('#app');
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import {
  MudIcon,
  MudLogo,
  MudPhoneInput,
  MudSelect,
} from '@egov-moldova/mud-vue';
</script>

<template>
  <main>
    <section>
      <MudIcon data-testid="asset-icon" name="calendar" :size="24" />
      <MudLogo data-testid="asset-logo" name="mpass-logo-with-name" />
      <MudPhoneInput data-testid="asset-phone" aria-label="Asset phone" />
      <MudSelect data-testid="asset-select" aria-label="Asset fruit">
        <option value="apple">Apple</option>
        <option value="pear">Pear</option>
      </MudSelect>
    </section>
  </main>
</template>
```

The `data-testid` attributes are how this repository's browser tests find each element; leave them out in your app. Bind a form control with `v-model`, for example `<MudSelect v-model="fruit" aria-label="Fruit">`.

Binding notes:

- `mud-numeric-input` is `null` when empty. Its `v-model` follows every keystroke and the clamped value on commit. Setting the model to `null` or `undefined` empties the field, never `0`. A string is parsed like Stencil (`parseFloat`), so `'5'` is read as 5 and `'12px'` as 12; `''`, `'abc'`, `NaN`, `±Infinity` and any other value empty the field.
- A `mud-phone-input` country switch updates the `v-model`.
- `MudNumericInput` and `MudPhoneInput` are hand-written wrappers that replace the generated ones under the same export names.

#### Angular component wrappers
> Not yet published. `@egov-moldova/mud-angular` is still in development — until it ships, consume the components as raw custom elements via [With a bundler](#with-a-bundler) above.

Typed standalone components and form value accessors for Angular `^20 || ^21 || ^22`. `@egov-moldova/mud`, `@angular/core`, `@angular/forms` and `rxjs` are peers.

```bash
yarn add @egov-moldova/mud @egov-moldova/mud-angular
```

In `angular.json`, under `build.options`, add the tokens and the global styles. There is nothing to copy into the build output, and no provider to add: [icons, logos and flags](#icons-logos-and-flags) load on their own.

```json
"styles": ["@egov-moldova/mud/tokens/core.tokens.css", "@egov-moldova/mud/styles.css"]
```

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';

bootstrapApplication(App).catch((error: unknown) => console.error(error));
```

```ts
// app.ts
import { Component } from '@angular/core';
import {
  MudIcon,
  MudLogo,
  MudPhoneInput,
  MudSelect,
} from '@egov-moldova/mud-angular';

@Component({
  selector: 'app-root',
  imports: [
    MudIcon,
    MudLogo,
    MudPhoneInput,
    MudSelect,
  ],
  templateUrl: './app.html',
})
export class App {
  // …
}
```

```html
<!-- app.html -->
<main>
  <section>
    <mud-icon data-testid="asset-icon" name="calendar" [size]="24"></mud-icon>
    <mud-logo data-testid="asset-logo" name="mpass-logo-with-name"></mud-logo>
    <mud-phone-input data-testid="asset-phone" aria-label="Asset phone"></mud-phone-input>
    <mud-select data-testid="asset-select" aria-label="Asset fruit">
      <option value="apple">Apple</option>
      <option value="pear">Pear</option>
    </mud-select>
  </section>
</main>
```

The `data-testid` attributes are how this repository's browser tests find each element; leave them out in your app.

**Import `MUD_FORM_ACCESSORS` in every component that binds a `mud-*` form control** with `[(ngModel)]` or `formControl`, next to `FormsModule` or `ReactiveFormsModule`. Without it they throw `No value accessor for form control`. Each accessor is also exported on its own (`TextValueAccessor`, `BooleanValueAccessor`, `SelectValueAccessor`, `NumericValueAccessor`, `ChipsValueAccessor`, `FilesValueAccessor`) if you want a narrower import.

Binding notes:

- `mud-numeric-input` is `null` when empty, and updates its model on every keystroke and again when it clamps the value on commit. A string is parsed like Stencil (`parseFloat`), so `'5'` is read as 5 and `'12px'` as 12; `''`, `'abc'`, `NaN`, `±Infinity` and any other value empty the field.
- A `mud-phone-input` country switch updates the model.
- A bare boolean attribute (`<mud-button disabled>`) compiles under `strictTemplates`.
- Every Angular bundle includes all the wrappers, whichever ones the app imports: each wrapper defines its custom element when its class loads, so the package cannot be marked side-effect free.

#### API

- `defineCustomElements(opts?)` — registers every Stencil custom element on the current document; returns a `Promise<void>`
- `setNonce(nonce: string)` — applies a CSP nonce to injected `<style>` tags
- Full element type augmentation (`HTMLMudButtonElement`, `HTMLMudTextInputElement`, …) and prop / event interfaces are re-exported via `export type *` from `@egov-moldova/mud`

#### Framework-specific usage

Because the components are native custom elements, they integrate with every modern framework without a wrapper layer:

- **React 18** sets every prop as a string attribute and does not bind `on*` handlers for custom events (`enableCustomElementPropertySupport` is off) — so pass objects/arrays and listen to `mud*` events through a `ref` and `addEventListener`, not through a prop.
- **React 19+** treats unknown lowercase tags as custom elements and forwards props/attributes directly. Use `ref` for imperative APIs and standard `addEventListener` for events.
- **Vue 3** (without the wrapper package) needs `app.config.compilerOptions.isCustomElement = tag => tag.startsWith('mud-')` (or via `vite-plugin-vue`'s `template.compilerOptions`).
- **Angular 14+** (without the wrapper package) needs `CUSTOM_ELEMENTS_SCHEMA` in the `NgModule`'s `schemas` array (or the standalone component's `schemas`). Use `(event)` bindings against the dispatched custom-event name.
- **Svelte**, **SolidJS**, **Lit** — work out of the box; no extra config required.

---

## Localization

Every component that ships built-in text (labels, `aria-label`s, screen-reader announcements, validation messages, empty states) carries a dictionary for three locales: `ro-MD` (Romanian, the default), `en-US` (English) and `ru-MD` (Russian). The English and Russian texts are machine-drafted and have not been reviewed by native speakers.

**Which locale a component uses** — the first that applies:

1. its own `locale` attribute or property (`<mud-pagination locale="ru-MD">`);
2. the closest ancestor `lang` attribute, crossing shadow roots (`<html lang="en">`, or `<section lang="ru">` around part of a page) — a `lang` on the component's own element is not read, use `locale` there;
3. `ro-MD`.

A component with an explicit `locale` sets `lang` on its own element while `locale` is set, so screen readers read its text in that language; content you place inside it inherits the same language, and so does any `mud-*` component nested in it. A component that renders another one passes its `locale` down, so setting `locale` once at the top of a group reaches all of it.

**Language matching** — the language subtag picks the dictionary, so `ro-RO`, `ro`, `ru`, `ru-RU`, `en` and `en-GB` are all accepted. Dates and numbers follow the tag you gave: a bare `ro` or `ru` takes the region of the matching locale (`ro-MD`, `ru-MD`), while `lang="en-GB"` keeps its region and formats dates as `15/05/2026`. A tag with no dictionary (`de-DE`) logs one `console.warn` and falls back to `ro-MD` — text and formatting alike, so a component never mixes Romanian labels with German dates.

**Overriding a string** — most built-in strings have an attribute of their own (`close-label`, `required-message`, …); each component's `readme.md` lists them with their `ro-MD` defaults. A non-empty value wins over the dictionary in every locale. An empty value (`close-label=""`) depends on what the string is:

- accessible names and validation messages fall back to the dictionary, because an empty `aria-label` names nothing and an empty validation message is invalid;
- a few visible optional captions render nothing: `mud-file-input` `supported-formats-text`, `max-size-text`, `cta-text` and `dropzone-active-text`, `mud-select` `empty-label`, and `mud-pagination` `prev-label` and `next-label`.

**Changing the language at runtime** — changing a `lang` attribute anywhere in the page (`<html>` or any element in the document) re-renders the components below it, including their validation messages, and so does changing a component's `locale`. A `lang` changed inside another component's shadow root is read by the components inside that shadow root on their next render only.

**Country list** — `mud-phone-input` lists Moldova first and the other countries alphabetically by their name in the active locale. A country list you pass in keeps your order.

Full translation tables for review can be generated with `yarn locale.report` (contributors).

---

## Additional Resources

- [Design](https://mud.egov.md/)
- [MUD Design System on npm](https://www.npmjs.com/package/@egov-moldova/mud)
- [Contributing and releases](CONTRIBUTING.md#publishing): building the library, and bumping its version with `yarn version.bump`
- [eGov Moldova — Agency for Electronic Governance](https://egov.md)
- [MDN — Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [Stencil documentation](https://stenciljs.com/docs/introduction)
