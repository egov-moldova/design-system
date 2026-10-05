import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSvgCaches, createSvgLoader } from '../svg-assets';

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
    expect(loader.failure('outlined/f')).toBe('the import failed: Failed to fetch dynamically imported module');
    expect(await loader.load('outlined/f')).toBeNull();
    expect(loader.failure('outlined/f')).toBe('the drawing was rejected by the sanitizer');
    expect(await loader.load('outlined/f')).not.toBeNull();
    expect(loader.failure('outlined/f')).toBeUndefined();
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

  it('keeps two loaders apart even for the same key', async () => {
    const icons = createSvgLoader({ x: async () => ({ default: svg('x') }) });
    const logos = createSvgLoader({});
    await icons.load('x');
    expect(logos.cached('x')).toBeUndefined();
  });
});
