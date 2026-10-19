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

/**
 * Holds every `setTimeout` of at least `minMs` (an owner's retry, scheduled from the loader's
 * `retryDelay`) instead of scheduling it, so a spec fires each one when it chooses. Shorter timers
 * pass through: `vi.useFakeTimers` cannot be used here, because Stencil's own render loop runs on
 * `setTimeout` and stalls under it. `vi.waitFor` keeps working: it runs on Vitest's saved timers.
 */
export function holdRetryTimers(minMs = 1000): { held: Array<{ ms: number; fire: () => void }>; restore: () => void } {
  const held: Array<{ ms: number; fire: () => void }> = [];
  const real = globalThis.setTimeout;
  const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
    handler: (...args: unknown[]) => void,
    ms?: number,
    ...args: unknown[]
  ) => {
    if (typeof handler === 'function' && (ms ?? 0) >= minMs) {
      held.push({ ms: ms ?? 0, fire: () => handler(...args) });
      return 0;
    }
    return real(handler, ms, ...args);
  }) as unknown as typeof setTimeout);
  return { held, restore: () => spy.mockRestore() };
}
