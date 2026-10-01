// Every React wrapper @stencil/react-output-target generates into
// `./components/stencil-generated/` on each non-dev `yarn build` at the repo root. Each one
// imports its element from the standalone bundle (`@egov-moldova/mud/components/mud-*.js`)
// and registers it when its module is evaluated: the adapter loads one Stencil runtime, and
// never the lazy loader (#180).
export * from './components/stencil-generated/components';

export { defineCustomElements, setupMud } from './setup';
export type { DefineCustomElementsOptions, MudSetupOptions } from './setup';
export { setAssetPath, setNonce } from '@egov-moldova/mud/components';
