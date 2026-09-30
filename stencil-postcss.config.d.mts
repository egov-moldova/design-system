// Types for `stencil-postcss.config.mjs`, which `stencil.config.ts` imports under
// `yarn typecheck`. The module stays JavaScript so Vite can load it from
// `vitest.config.mts` without compiling a TypeScript import.
import type { AcceptedPlugin } from 'postcss';

export declare const stencilPostcssPlugins: () => AcceptedPlugin[];
