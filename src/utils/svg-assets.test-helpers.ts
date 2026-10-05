import { vi } from '@stencil/vitest';

/**
 * `vi.waitFor` for an assertion that settles only after an asset owner's `import()` of a generated
 * drawing. The spec lane transforms each drawing module on its first import; on a loaded host (the
 * pre-push hook runs the suites in parallel) that took longer than `vi.waitFor`'s 1 s default, and a
 * correct flag switch failed. Polling still ends at the first passing check, so a passing run pays
 * nothing for the longer ceiling.
 */
export const waitForAssetLoad = <T>(assertion: () => T | Promise<T>): Promise<T> =>
  vi.waitFor(assertion, { timeout: 10_000 });
