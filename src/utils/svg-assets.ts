import { sanitizeSvgToElement } from './svg-sanitizer';

/**
 * A generated asset map (`src/generated/<kind>/index.ts`): key → a thunk that imports the one
 * ES module holding that drawing's markup. `Partial`, so a lookup by an arbitrary string is typed
 * as possibly missing.
 */
export type SvgModuleMap = Readonly<Partial<Record<string, () => Promise<{ default: string }>>>>;

export interface SvgLoader {
  /** A fresh clone of an already-loaded drawing, or undefined. Never imports. */
  cached(key: string): Element | undefined;
  /** Resolves through the cache, else through `map[key]`; null for an unknown key or a failed import. */
  load(key: string): Promise<Element | null>;
}

/** One `clear` per loader ever created, so a spec can reset every cache between tests. */
const loaders = new Set<() => void>();

/** One loader per map: a key can only ever be looked up in the map it belongs to. */
export function createSvgLoader(map: SvgModuleMap): SvgLoader {
  /** Sanitized once at insertion; every read hands out a clone, never this element. */
  const parsed = new Map<string, Element>();
  /** The pending import per key, so concurrent loads of one key import it once. */
  const inflight = new Map<string, Promise<Element | null>>();
  /** Bumped by every clear, so an import that started before one cannot repopulate the cache. */
  let generation = 0;

  loaders.add(() => {
    generation += 1;
    parsed.clear();
    inflight.clear();
  });

  const importOnce = (key: string): Promise<Element | null> => {
    const pending = inflight.get(key);
    if (pending) return pending;

    // `Object.hasOwn` first: a name such as `constructor` or `__proto__` must never reach a
    // prototype member. The entry is read at call time, not captured, so a spec can spy on it.
    const thunk = Object.hasOwn(map, key) ? map[key] : undefined;
    if (typeof thunk !== 'function') return Promise.resolve(null);

    const started = generation;
    const promise = (async (): Promise<Element | null> => {
      try {
        // Called on a microtask, so even a thunk that throws synchronously settles after the
        // `inflight.set` below and its `finally` can evict it; called inline, the eviction would
        // run first and the rejected entry would stay cached for good.
        const module = await Promise.resolve().then(thunk);
        const element = sanitizeSvgToElement(module.default);
        if (element && started === generation) parsed.set(key, element);
        return element;
      } catch {
        // Offline, or a chunk hash changed under a redeploy: answer null and keep nothing, so
        // the next call imports again instead of serving a cached failure.
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
  };
}

/** Tests only: empties every loader's cache. */
export function clearSvgCaches(): void {
  loaders.forEach(clear => clear());
}
