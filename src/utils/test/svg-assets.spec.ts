import { afterEach, describe, expect, it, vi } from 'vitest';

import { SVG_RETRY_MAX_MS, SVG_RETRY_MS, clearSvgCaches, createSvgLoader } from '../svg-assets';

const svg = (k: string) => `<svg xmlns="http://www.w3.org/2000/svg" data-mud-asset="icon:${k}"></svg>`;

describe('createSvgLoader', () => {
  afterEach(() => clearSvgCaches());

  it('serves a loaded drawing synchronously afterwards, as a fresh clone each time', async () => {
    const loader = createSvgLoader({ 'outlined/a': async () => ({ default: svg('outlined/a') }) });
    await loader.load('outlined/a');
    const one = loader.cached('outlined/a');
    expect(one?.getAttribute('data-mud-asset')).toBe('icon:outlined/a');
    expect(loader.cached('outlined/a')).not.toBe(one);
  });

  it('dedupes concurrent loads of one key', async () => {
    const load = vi.fn(async () => ({ default: svg('outlined/b') }));
    const loader = createSvgLoader({ 'outlined/b': load });
    await Promise.all([loader.load('outlined/b'), loader.load('outlined/b')]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('answers null for an unknown or prototype-shaped key without throwing', async () => {
    const loader = createSvgLoader({});
    expect(await loader.load('constructor')).toBeNull();
    expect(await loader.load('__proto__')).toBeNull();
  });

  it('evicts a failed import so the next call retries', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ default: svg('outlined/c') });
    const loader = createSvgLoader({ 'outlined/c': load });
    expect(await loader.load('outlined/c')).toBeNull();
    expect((await loader.load('outlined/c'))?.getAttribute('data-mud-asset')).toBe('icon:outlined/c');
  });

  it('names why a load answered null, and forgets it once a retry succeeds', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce({ default: '<p>not a drawing</p>' })
      .mockResolvedValueOnce({ default: svg('outlined/f') });
    const loader = createSvgLoader({ 'outlined/f': load });
    expect(await loader.load('outlined/f')).toBeNull();
    expect(loader.failure('outlined/f')).toEqual({
      kind: 'import',
      message: 'the import failed: Failed to fetch dynamically imported module',
    });
    expect(await loader.load('outlined/f')).toBeNull();
    expect(loader.failure('outlined/f')).toEqual({
      kind: 'rejected',
      message: 'the drawing was rejected by the sanitizer',
    });
    expect(await loader.load('outlined/f')).not.toBeNull();
    expect(loader.failure('outlined/f')).toBeUndefined();
  });

  it('names no cause for an unknown key, and names a rejection that is not an Error', async () => {
    const loader = createSvgLoader({ 'outlined/i': () => Promise.reject('chunk gone') });
    expect(await loader.load('outlined/nope')).toBeNull();
    expect(loader.failure('outlined/nope')).toBeUndefined();
    expect(await loader.load('outlined/i')).toBeNull();
    expect(loader.failure('outlined/i')?.message).toBe('the import failed: chunk gone');
  });

  it('does not record the failure of an import that started before a clear', async () => {
    let reject!: (reason: Error) => void;
    const load = vi.fn(() => new Promise<{ default: string }>((_, r) => (reject = r)));
    const loader = createSvgLoader({ 'outlined/j': load });
    const stale = loader.load('outlined/j');
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    clearSvgCaches();
    reject(new Error('offline'));
    await stale;
    expect(loader.failure('outlined/j')).toBeUndefined();
  });

  it('evicts a thunk that throws synchronously, so the next call retries', async () => {
    let calls = 0;
    const loader = createSvgLoader({
      'outlined/g': () => {
        calls += 1;
        if (calls === 1) throw new Error('sync');
        return Promise.resolve({ default: svg('outlined/g') });
      },
    });
    expect(await loader.load('outlined/g')).toBeNull();
    expect((await loader.load('outlined/g'))?.getAttribute('data-mud-asset')).toBe('icon:outlined/g');
  });

  it('does not let an import that started before a clear repopulate the cache', async () => {
    let resolve!: (value: { default: string }) => void;
    const load = vi
      .fn()
      .mockImplementationOnce(() => new Promise(r => (resolve = r)))
      .mockResolvedValueOnce({ default: svg('outlined/h') });
    const loader = createSvgLoader({ 'outlined/h': load });
    const stale = loader.load('outlined/h');
    // The thunk runs on a microtask (see `importOnce`), so the import has started only after this.
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    clearSvgCaches();
    resolve({ default: svg('outlined/h') });
    await stale;
    expect(loader.cached('outlined/h')).toBeUndefined();
    await loader.load('outlined/h');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('waits SVG_RETRY_MS after a failed import, doubling per failure up to the cap, and 0 once it loads', async () => {
    let clock = 1000;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => clock);
    try {
      const load = vi.fn().mockRejectedValue(new Error('offline'));
      const loader = createSvgLoader({ 'outlined/k': load });
      expect(loader.retryDelay('outlined/k')).toBe(0);
      await loader.load('outlined/k');
      expect(loader.retryDelay('outlined/k')).toBe(SVG_RETRY_MS);
      clock += 4000;
      expect(loader.retryDelay('outlined/k')).toBe(SVG_RETRY_MS - 4000);
      await loader.load('outlined/k');
      expect(loader.retryDelay('outlined/k')).toBe(2 * SVG_RETRY_MS);
      for (let i = 0; i < 10; i += 1) await loader.load('outlined/k');
      expect(loader.retryDelay('outlined/k')).toBe(SVG_RETRY_MAX_MS);
      load.mockResolvedValue({ default: svg('outlined/k') });
      await loader.load('outlined/k');
      expect(loader.retryDelay('outlined/k')).toBe(0);
    } finally {
      now.mockRestore();
    }
  });

  it('never asks again for a drawing the sanitizer rejected, until clearFailures', async () => {
    const loader = createSvgLoader({ 'outlined/l': async () => ({ default: '<p>not a drawing</p>' }) });
    await loader.load('outlined/l');
    expect(loader.retryDelay('outlined/l')).toBe(Infinity);
    loader.clearFailures();
    expect(loader.retryDelay('outlined/l')).toBe(0);
    expect(loader.failure('outlined/l')).toBeUndefined();
  });

  it('keeps two loaders apart even for the same key', async () => {
    const icons = createSvgLoader({ x: async () => ({ default: svg('x') }) });
    const logos = createSvgLoader({});
    await icons.load('x');
    expect(logos.cached('x')).toBeUndefined();
  });
});
