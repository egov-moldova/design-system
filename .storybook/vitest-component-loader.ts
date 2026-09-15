// Vitest-only replacement for `dist/mud/mud.esm.js`.
//
// Why this exists:
//   In normal Storybook dev/build, preview.js imports the pre-compiled lazy
//   bundle (`dist/mud/mud.esm.js`) to register all
//   `mud-*` custom elements. That bundle is opaque to coverage tooling —
//   browser-mode tests run by `@storybook/addon-vitest` then report 0%
//   for every component file even though stories execute correctly.
//
// What this does:
//   Glob-imports each component's source TSX. With `stencilVitestPlugin`
//   active on the `storybook` project, Vite compiles each TSX on-the-fly
//   (componentExport: 'customelement') and appends a `customElements.define()`
//   call to the transformed output, so the side-effect imports register
//   every element before any story renders. Coverage v8 / istanbul now sees
//   the real source files in the module graph and produces accurate numbers.
//
// Styles: each component's CSS reaches its shadow root only because the
//   `storybook` project passes `{ css: true }` to `stencilVitestPlugin`. Without
//   that option the elements still register and render, but UNSTYLED — and
//   nothing else fails (issue #28). `.storybook/vitest.setup.ts` imports this
//   file to assert the stylesheet is adopted before any story runs.
//
// Wired into Storybook tests via `resolve.alias` in `vitest.config.mts` —
// the alias rewrites `../dist/mud/mud.esm.js` (in
// `.storybook/preview.js`) to this file for the `storybook` project only.
// The dist bundle keeps powering regular Storybook dev / production builds.

const modules = import.meta.glob('../src/components/mud-*/mud-*.tsx', { eager: true });

// Reference the binding so tree-shakers don't drop the side-effect imports.
void modules;

export {};
