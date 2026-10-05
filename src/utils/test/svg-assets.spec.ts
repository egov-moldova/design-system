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

  it('keeps two loaders apart even for the same key', async () => {
    const icons = createSvgLoader({ x: async () => ({ default: svg('x') }) });
    const logos = createSvgLoader({});
    await icons.load('x');
    expect(logos.cached('x')).toBeUndefined();
  });
});
