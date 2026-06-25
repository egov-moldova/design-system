// Re-export every generated React wrapper produced by @stencil/react-output-target.
// The proxy file is regenerated on every `yarn build.react` from the AGE root.
export * from './components/stencil-generated/components';

import { defineCustomElements as stencilDefineCustomElements } from '@egov-moldova/mud/loader';
import { setAssetPath as setStandaloneAssetPath } from '@egov-moldova/mud/dist/components';

let registered = false;

export type DefineCustomElementsOptions = {
  /**
   * Base URL where the AGE component assets (mud-logo SVGs, etc.) are served
   * from. Must point at the directory whose immediate child is `assets/`.
   * When omitted, defaults to `<window.origin>/node_modules/@egov-moldova/mud/dist/components/`
   * which works in Vite-served dev environments where node_modules is exposed
   * at the URL root. In production / non-Vite hosts, pass the public path your
   * bundler resolves AGE assets to.
   */
  assetPath?: string;
};

/**
 * Idempotently registers every Stencil-compiled `cor-*` custom element with the
 * current document. Safe to call multiple times — subsequent calls are no-ops.
 *
 * Call once near app startup (e.g. in `main.tsx` before `ReactDOM.createRoot`).
 *
 * Also wires up Stencil's asset path so asset-driven components (cor-logo,
 * future icons/illustrations) can resolve their SVGs. The React wrappers
 * consume the standalone `dist/components/*` bundle whose `getAssetPath`
 * throws unless a base URL is registered (see `cor-logo.providers.ts`).
 * Resolving this here means consumers don't need to know any of that;
 * production builds can override via `opts.assetPath`.
 *
 * @returns Promise that resolves once Stencil's runtime is ready.
 */
export function defineCustomElements(opts?: DefineCustomElementsOptions): Promise<void> {
  if (registered) return Promise.resolve();
  registered = true;
  if (typeof window !== 'undefined') {
    const assetPath =
      opts?.assetPath ?? new URL('/node_modules/@egov-moldova/mud/dist/components/', window.location.origin).href;
    setStandaloneAssetPath(assetPath);
  }
  return stencilDefineCustomElements() ?? Promise.resolve();
}

export { setNonce } from '@egov-moldova/mud/loader';
export { setStandaloneAssetPath as setAssetPath };
