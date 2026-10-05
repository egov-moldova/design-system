import { sanitizeSvgToElement } from './svg-sanitizer';

/**
 * A generated asset map (`src/generated/<kind>/index.ts`): key → a thunk that imports the one
 * ES module holding that drawing's markup. `Partial`, so a lookup by an arbitrary string is typed
 * as possibly missing.
 */
export type SvgModuleMap = Readonly<Partial<Record<string, () => Promise<{ default: string }>>>>;

/** The first wait before a drawing whose import failed is asked for again; it doubles per failure. */
export const SVG_RETRY_MS = 10_000;
/** The longest wait between two attempts, however many failed. */
export const SVG_RETRY_MAX_MS = 5 * 60_000;

/** Why the last `load` of a known key answered null. */
export interface SvgFailure {
  /** `import`: the module did not arrive (offline, a chunk a redeploy removed) — a retry may succeed.
   *  `rejected`: the drawing arrived and the sanitizer refused it — no retry can fix that. */
  kind: 'import' | 'rejected';
  /** The cause, for the owner's warning. */
  message: string;
}

export interface SvgLoader {
  /** A fresh clone of an already-loaded drawing, or undefined. Never imports. */
  cached(key: string): Element | undefined;
  /** Resolves through the cache, else through `map[key]`; null for an unknown key or a failed import. */
  load(key: string): Promise<Element | null>;
  /** Why the last `load` of a known key answered null; undefined once a later load succeeds. */
  failure(key: string): SvgFailure | undefined;
  /**
   * Milliseconds until a key whose import failed should be asked for again: 0 when it may be now
   * (or never failed), `Infinity` for a rejected drawing. The wait starts at `SVG_RETRY_MS` and
   * doubles with each consecutive failure, up to `SVG_RETRY_MAX_MS`. One policy for every owner.
   */
  retryDelay(key: string): number;
  /** Forgets every failure, so every key may be asked for at once (a user asked to see them). */
  clearFailures(): void;
}

interface FailureRecord extends SvgFailure {
  /** `performance.now()` at the failure: monotonic, so a clock change cannot stall a retry. */
  at: number;
  /** Consecutive failures of this key. */
  attempts: number;
}

/** One `clear` per loader ever created, so a spec can reset every cache between tests. */
const loaders = new Set<() => void>();

/** One loader per map: a key can only ever be looked up in the map it belongs to. */
export function createSvgLoader(map: SvgModuleMap): SvgLoader {
  /** Sanitized once at insertion; every read hands out a clone, never this element. */
  const parsed = new Map<string, Element>();
  /** The pending import per key, so concurrent loads of one key import it once. */
  const inflight = new Map<string, Promise<Element | null>>();
  /** Why the last load of a key answered null; a later successful load clears it. */
  const failures = new Map<string, FailureRecord>();
  const fail = (key: string, kind: SvgFailure['kind'], message: string) => {
    failures.set(key, { kind, message, at: performance.now(), attempts: (failures.get(key)?.attempts ?? 0) + 1 });
  };
  /** Bumped by every clear, so an import that started before one cannot repopulate the cache. */
  let generation = 0;

  loaders.add(() => {
    generation += 1;
    parsed.clear();
    inflight.clear();
    failures.clear();
  });

  const importOnce = (key: string): Promise<Element | null> => {
    const pending = inflight.get(key);
    if (pending) return pending;

    // Own keys only: a name such as `constructor` or `__proto__` must never reach a prototype
    // member. `hasOwnProperty.call`, not `Object.hasOwn`: the build does not polyfill, and
    // `Object.hasOwn` throws on Safari < 15.4 and Chrome < 93, which would blank every drawing.
    // The entry is read at call time, not captured, so a spec can spy on it.
    const thunk = Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
    if (typeof thunk !== 'function') return Promise.resolve(null);

    const started = generation;
    const promise = (async (): Promise<Element | null> => {
      try {
        // Called on a microtask, so even a thunk that throws synchronously settles after the
        // `inflight.set` below and its `finally` can evict it; called inline, the eviction would
        // run first and the rejected entry would stay cached for good.
        const module = await Promise.resolve().then(thunk);
        const element = sanitizeSvgToElement(module.default);
        if (started === generation) {
          if (element) {
            parsed.set(key, element);
            failures.delete(key);
          } else {
            fail(key, 'rejected', 'the drawing was rejected by the sanitizer');
          }
        }
        return element;
      } catch (error) {
        // Offline, or a chunk hash changed under a redeploy: answer null and keep nothing, so
        // the next call imports again instead of serving a cached failure.
        if (started === generation)
          fail(key, 'import', `the import failed: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      } finally {
        if (started === generation) inflight.delete(key);
      }
    })();
    inflight.set(key, promise);
    return promise;
  };

  return {
    cached(key) {
      const element = parsed.get(key);
      return element ? (element.cloneNode(true) as Element) : undefined;
    },
    async load(key) {
      const hit = parsed.get(key);
      if (hit) return hit.cloneNode(true) as Element;
      const element = await importOnce(key);
      return element ? (element.cloneNode(true) as Element) : null;
    },
    failure(key) {
      const record = failures.get(key);
      return record ? { kind: record.kind, message: record.message } : undefined;
    },
    retryDelay(key) {
      const record = failures.get(key);
      if (!record) return 0;
      if (record.kind === 'rejected') return Infinity;
      const wait = Math.min(SVG_RETRY_MS * 2 ** (record.attempts - 1), SVG_RETRY_MAX_MS);
      return Math.max(0, wait - (performance.now() - record.at));
    },
    clearFailures() {
      failures.clear();
    },
  };
}

/** Tests only: empties every loader's cache. */
export function clearSvgCaches(): void {
  loaders.forEach(clear => clear());
}
