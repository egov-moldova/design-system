// The directories the framework output targets write their generated proxies into.
//
// ONE list, read by every consumer so a directory is added in one place:
//   - `stencil.config.ts` takes each target's `outDir` from `PROXY_DIRS`;
//   - `clean-proxy-dirs.mjs` empties every entry before the Stencil build writes it;
//   - the consumer-fixture runner's guard fails on a tracked file under any entry;
//   - `scripts/__tests__/validate-package.spec.mjs` asserts the wireit `build` `output`,
//     the `.gitignore` files and `.prettierignore` each carry every entry.
//
// Adding an adapter is one line below. Paths are repo-root relative, POSIX separators,
// no trailing slash.
//
// Erasable TypeScript only (no enums, namespaces or parameter properties): Stencil's
// config loader transpiles this file when `stencil.config.ts` imports it, and Node 24
// strips the types natively for the `.mjs` runner and the `node --test` specs.
export const PROXY_DIRS = {
  react: 'packages/react/src/components/stencil-generated',
} as const;

export const PROXY_OUT_DIRS: readonly string[] = Object.values(PROXY_DIRS);
