import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';
import { setAssetPath } from '@stencil/core';
import fs from 'node:fs';
import path from 'node:path';

import '../mud-icon';
import manifest from '../assets/icons.manifest.json';
import { clearIconSvgCache, fetchIconSvg, resolveIconAsset } from '../mud-icon.providers';
import {
  hasIconVariant,
  ICON_NAMES,
  ICON_VARIANTS,
  type IconManifest,
  type IconName,
  type IconVariant,
} from '../mud-icon.types';

const REAL_MANIFEST = manifest as IconManifest;
const variantsOf = (name: IconName): readonly IconVariant[] => REAL_MANIFEST[name]?.variants ?? [];
const NAME_IN_BOTH_VARIANTS = ICON_NAMES.find(n => variantsOf(n).length === 2);
const FILLED_ONLY_NAME = ICON_NAMES.find(n => !variantsOf(n).includes('outlined'));

function makeFetchMock() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
    const match = String(url).match(/\/(outlined|filled)\/([^/]+)\.svg/);
    if (!match) return new Response('', { status: 404 });
    return new Response(`<svg data-name="${match[2]}" data-variant="${match[1]}"></svg>`, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  });
}

describe('mud-icon', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setAssetPath('http://localhost/');
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchSpy = makeFetchMock();
    clearIconSvgCache();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('renders with default props (size=16, variant=outlined)', async () => {
    const defaultName = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={defaultName} />);
    await waitForChanges();

    expect(root?.getAttribute('size')).toBe('16');
    expect(root?.getAttribute('variant')).toBe('outlined');
    expect(root?.getAttribute('color')).toBe('currentColor');
    expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeTruthy();
  });

  it('reflects size to the host attribute', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<mud-icon name={name} size={32} />);
    expect(root?.getAttribute('size')).toBe('32');
  });

  it('loads the filled drawing when variant=filled', async () => {
    const name = NAME_IN_BOTH_VARIANTS ?? ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} variant="filled" />);
    await waitForChanges();
    expect(root?.getAttribute('variant')).toBe('filled');
    expect(fetchSpy.mock.calls.some((args: unknown[]) => String(args[0]).includes(`/filled/${name}.svg`))).toBe(true);
  });

  it('falls back to the drawing that exists and warns when the variant is missing', async () => {
    if (!FILLED_ONLY_NAME) return;
    const { root, waitForChanges } = await render(<mud-icon name={FILLED_ONLY_NAME} variant="outlined" />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(
      fetchSpy.mock.calls.some((args: unknown[]) => String(args[0]).includes(`/filled/${FILLED_ONLY_NAME}.svg`)),
    ).toBe(true);
    const innerHTML = root?.shadowRoot?.querySelector('.svg-icon')?.innerHTML ?? '';
    expect(innerHTML).toContain('data-variant="filled"');
  });

  it('reflects interactive + disabled flags', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<mud-icon name={name} interactive disabled />);
    expect(root?.hasAttribute('interactive')).toBe(true);
    expect(root?.hasAttribute('disabled')).toBe(true);
  });

  it('treats absent ariaLabel as decorative (aria-hidden on host)', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} />);
    await waitForChanges();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.hasAttribute('aria-label')).toBe(false);
  });

  it('announces with ariaLabel when provided', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} aria-label="Confirm" />);
    await waitForChanges();
    expect(root?.getAttribute('aria-label')).toBe('Confirm');
    expect(root?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('adds button role + tabindex on host when interactive and not disabled', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive />);
    await waitForChanges();
    expect(root?.getAttribute('role')).toBe('button');
    expect(root?.getAttribute('tabindex')).toBe('0');
    expect(root?.hasAttribute('aria-disabled')).toBe(false);
  });

  it('announces aria-disabled and drops tabindex when interactive + disabled', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive disabled />);
    await waitForChanges();
    expect(root?.getAttribute('role')).toBe('button');
    expect(root?.getAttribute('aria-disabled')).toBe('true');
    expect(root?.getAttribute('tabindex')).toBeFalsy();
  });

  // Mock-doc does not propagate keyboard events to JSX-bound `onKeyDown` handlers. In
  // Stencil's custom-elements output the element IS the instance, so the arrow-function
  // field `handleKeyDown` is reachable directly on `root`.
  type Instance = { handleKeyDown: (ev: KeyboardEvent) => void };
  const getHandler = (root: Element): ((ev: KeyboardEvent) => void) => {
    const instance = root as unknown as Instance;
    return instance.handleKeyDown.bind(instance);
  };

  it('activates on Enter when interactive (preventDefault + click)', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    getHandler(root!)(ev);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('activates on Space when interactive', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    getHandler(root!)(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys (does not activate on Tab/ArrowDown)', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    const handler = getHandler(root!);
    handler(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    handler(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('keydown handler is a no-op when interactive + disabled', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} interactive disabled />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    getHandler(root!)(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('sets --icon-color on the host for a token name and removes it for currentColor', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} color="icon-brand-default" />);
    await waitForChanges();
    expect((root as HTMLElement).style.getPropertyValue('--icon-color')).toBe('var(--color-icon-brand-default)');

    (root as unknown as { color: string }).color = 'currentColor';
    await waitForChanges();
    expect((root as HTMLElement).style.getPropertyValue('--icon-color')).toBe('');
  });

  it('unknown name → warns, no SVG, but host stays decorative (aria-hidden)', async () => {
    const { root, waitForChanges } = await render(<mud-icon name={'this-icon-does-not-exist' as IconName} />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeNull();
    // Host must still be aria-hidden so screen readers don't traverse it as a
    // nameless generic element. (Same contract as mud-logo Issue 3.)
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it('omitted name → warns, no SVG, host stays decorative', async () => {
    const { root, waitForChanges } = await render(<mud-icon {...({} as { name: IconName })} />);
    await waitForChanges();
    expect(root?.hasAttribute('name')).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeNull();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__'])(
    'Object.prototype member name "%s" degrades like an unknown name',
    async prototypeName => {
      const { root, waitForChanges } = await render(<mud-icon name={prototypeName as IconName} />);
      await waitForChanges();
      expect(warnSpy).toHaveBeenCalled();
      expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeNull();
      expect(root?.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('renders inline SVG markup in shadow DOM for a known icon', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} size={24} />);
    await waitForChanges();
    const innerHtml = root?.shadowRoot?.querySelector('.svg-icon')?.innerHTML ?? '';
    expect(innerHtml.toLowerCase()).toContain('<svg');
  });

  it('cache hit: fetch called only once for two instances with the same name+size', async () => {
    const name = ICON_NAMES[0];
    // Render both instances concurrently; they share the same cache URL Promise.
    const renders = await Promise.all([
      render(<mud-icon name={name} size={16} />),
      render(<mud-icon name={name} size={16} />),
    ]);
    await renders[0].waitForChanges();
    await renders[1].waitForChanges();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('graceful degrade: fetch 404 → warn + .svg-icon empty', async () => {
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} size={16} />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    const container = root?.shadowRoot?.querySelector('.svg-icon');
    expect(container?.children.length ?? 0).toBe(0);
  });

  it('fetch rejects with network error → .catch() path → warn + .svg-icon empty', async () => {
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    const container = root?.shadowRoot?.querySelector('.svg-icon');
    expect(container?.children.length ?? 0).toBe(0);
  });

  it('cache eviction on failure: a transient 404 does not lock out future retries', async () => {
    fetchSpy.mockRestore();
    // First call: 404 → null → cache must evict
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 404 }));
    const url = 'http://localhost/16/test.svg';
    const first = await fetchIconSvg(url);
    expect(first).toBeNull();
    // Drain microtask so the eviction `.then` runs.
    await new Promise(r => setTimeout(r, 0));

    // Second call: backend recovered → must actually re-fetch (cache evicted)
    fetchSpy.mockResolvedValueOnce(
      new Response('<svg viewBox="0 0 16 16"></svg>', {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      }),
    );
    const second = await fetchIconSvg(url);
    expect(second).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('onNameChange: changing name to a different icon loads the new SVG', async () => {
    if (ICON_NAMES.length < 2) return;
    const [name1, name2] = ICON_NAMES;
    const { root, waitForChanges } = await render(<mud-icon name={name1} size={16} />);
    await waitForChanges();

    (root as unknown as { name: string }).name = name2;
    await waitForChanges();

    expect(fetchSpy.mock.calls.some((args: unknown[]) => String(args[0]).includes(`/${name2}.svg`))).toBe(true);
    const innerHTML = root?.shadowRoot?.querySelector('.svg-icon')?.innerHTML ?? '';
    expect(innerHTML.toLowerCase()).toContain('<svg');
  });

  it('onVariantChange: changing variant reloads the SVG from the other style', async () => {
    const name = NAME_IN_BOTH_VARIANTS ?? ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} variant="outlined" />);
    await waitForChanges();

    (root as unknown as { variant: string }).variant = 'filled';
    await waitForChanges();

    expect(fetchSpy.mock.calls.some((args: unknown[]) => String(args[0]).includes('/filled/'))).toBe(true);
  });

  it('changing size alone does not refetch — one drawing covers every size', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} size={16} />);
    await waitForChanges();
    fetchSpy.mockClear();

    (root as unknown as { size: number }).size = 32;
    await waitForChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(root?.getAttribute('size')).toBe('32');
  });

  it('onNameChange: same-value guard (newVal === oldVal) skips reload', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} />);
    await waitForChanges();
    clearIconSvgCache();
    fetchSpy.mockClear();

    // Invoke the watch handler directly with identical values to exercise the equality guard
    type WatchInstance = { onNameChange: (newVal: string, oldVal: string) => Promise<void> };
    await (root as unknown as WatchInstance).onNameChange(name, name);
    await waitForChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('onVariantChange: same-value guard (newVal === oldVal) skips reload', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<mud-icon name={name} />);
    await waitForChanges();
    clearIconSvgCache();
    fetchSpy.mockClear();

    type WatchInstance = { onVariantChange: (newVal: string, oldVal: string) => Promise<void> };
    await (root as unknown as WatchInstance).onVariantChange('outlined', 'outlined');
    await waitForChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('svgCacheKey guard: variant fallback to the already-loaded style skips fetch', async () => {
    if (!FILLED_ONLY_NAME) return;

    const { root, waitForChanges } = await render(<mud-icon name={FILLED_ONLY_NAME} variant="filled" />);
    await waitForChanges();
    // svgCacheKey is now "name|filled"
    fetchSpy.mockClear();

    // variant=outlined → resolveIconAsset falls back to filled → cacheKey unchanged → early return
    (root as unknown as { variant: string }).variant = 'outlined';
    await waitForChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('race condition guard: stale name-change fetch discarded when name changes again', async () => {
    if (ICON_NAMES.length < 3) return;
    const [nameA, nameB, nameC] = ICON_NAMES;

    const { root, waitForChanges } = await render(<mud-icon name={nameA} size={16} />);
    await waitForChanges();

    // Replace fetch: nameB hangs until explicitly resolved, nameC resolves immediately
    fetchSpy.mockRestore();
    clearIconSvgCache();
    let resolveBFetch!: (r: Response) => void;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: unknown) => {
      const match = String(url).match(/\/(outlined|filled)\/([^/]+)\.svg/);
      if (!match) return new Response('', { status: 404 });
      const [, variant, iconName] = match;
      if (iconName === nameB) {
        return new Promise<Response>(resolve => {
          resolveBFetch = resolve;
        });
      }
      return new Response(`<svg data-name="${iconName}" data-variant="${variant}"></svg>`, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      });
    });

    // Trigger nameB (fetch hangs), then immediately trigger nameC (resolves fast)
    (root as unknown as { name: string }).name = nameB;
    (root as unknown as { name: string }).name = nameC;
    await waitForChanges();

    // Resolve the stale nameB fetch — race condition guard must discard it
    resolveBFetch!(
      new Response(`<svg data-name="${nameB}"></svg>`, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      }),
    );
    await waitForChanges();

    const innerHTML = root?.shadowRoot?.querySelector('.svg-icon')?.innerHTML ?? '';
    expect(innerHTML).toContain(`data-name="${nameC}"`);
    expect(innerHTML).not.toContain(`data-name="${nameB}"`);
  });
});

describe('resolveIconAsset (provider URL builder)', () => {
  beforeEach(() => {
    setAssetPath('http://localhost/');
  });

  // Real names: the manifest type is keyed by IconName, so a made-up key no
  // longer type-checks — which is the point of keying it.
  const manifest: IconManifest = {
    sun: { variants: ['outlined', 'filled'] },
    moon: { variants: ['filled'] },
  };

  it('returns the requested style when the icon is drawn in it', () => {
    const r = resolveIconAsset('sun', 'filled', manifest);
    expect(r?.resolvedVariant).toBe('filled');
    expect(r?.url).toContain('/filled/sun.svg');
  });

  it('falls back to the only style the icon is drawn in', () => {
    const r = resolveIconAsset('moon', 'outlined', manifest);
    expect(r?.resolvedVariant).toBe('filled');
    expect(r?.url).toContain('/filled/moon.svg');
  });

  it('returns undefined for unknown names', () => {
    const r = resolveIconAsset('car', 'outlined', manifest);
    expect(r).toBeUndefined();
  });

  it('returns undefined when the entry lists no style', () => {
    const empty: IconManifest = { stamp: { variants: [] } };
    const r = resolveIconAsset('stamp', 'outlined', empty);
    expect(r).toBeUndefined();
  });

  // Sanity check against the real manifest — at least one icon should resolve.
  it('resolves a URL from the real manifest', () => {
    if (!ICON_NAMES.length) return;
    const name = NAME_IN_BOTH_VARIANTS ?? ICON_NAMES[0];
    const r = resolveIconAsset(name, 'outlined');
    expect(r?.url).toBeTruthy();
    expect(r?.url).toContain('/outlined/');
  });

  it('exercises the fallback against the real manifest', () => {
    if (!FILLED_ONLY_NAME) return;
    const r = resolveIconAsset(FILLED_ONLY_NAME, 'outlined');
    expect(r?.resolvedVariant).toBe('filled');
    expect(r?.url).toContain(`/filled/${FILLED_ONLY_NAME}.svg`);
  });
});

describe('hasIconVariant', () => {
  it('answers from the manifest for a name drawn in both styles', () => {
    const name = NAME_IN_BOTH_VARIANTS ?? ICON_NAMES[0];
    expect(hasIconVariant(name, 'outlined')).toBe(true);
    expect(hasIconVariant(name, 'filled')).toBe(true);
  });

  it('is false for the style an icon is not drawn in', () => {
    if (!FILLED_ONLY_NAME) return;
    expect(hasIconVariant(FILLED_ONLY_NAME, 'outlined')).toBe(false);
    expect(hasIconVariant(FILLED_ONLY_NAME, 'filled')).toBe(true);
  });

  it('is false for an absent name instead of throwing', () => {
    expect(hasIconVariant(undefined, 'filled')).toBe(false);
    expect(hasIconVariant('this-icon-does-not-exist' as IconName, 'filled')).toBe(false);
  });
});

describe('icons.manifest.json (public icon names)', () => {
  it('exposes the calendar family under the correct spelling', () => {
    expect(REAL_MANIFEST['calendar-add']?.variants).toEqual(['outlined']);
    expect(REAL_MANIFEST['calendar-remove']?.variants).toEqual(['outlined', 'filled']);
  });

  it('no longer exposes the misspelled "calender" names', () => {
    expect(ICON_NAMES.filter(n => n.includes('calender'))).toEqual([]);
  });

  it('no longer encodes the style in the name', () => {
    expect(ICON_NAMES.filter(n => /-(filled|fill|solid)$/.test(n))).toEqual([]);
  });
});

describe('icon asset shape (what `yarn svg:icons` normalizes to)', () => {
  const ASSETS_ROOT = path.resolve(__dirname, '../assets');

  const files = ICON_VARIANTS.flatMap(variant => {
    const dir = path.join(ASSETS_ROOT, variant);
    return fs
      .readdirSync(dir)
      .filter(name => name.endsWith('.svg'))
      .map(name => ({ rel: `${variant}/${name}`, source: fs.readFileSync(path.join(dir, name), 'utf8') }));
  });

  // Guards against a vacuous scan: a moved assets directory would make every
  // assertion below pass over an empty list.
  it('reads the whole icon set', () => {
    expect(files.length).toBe(Object.values(REAL_MANIFEST).reduce((n, e) => n + (e?.variants.length ?? 0), 0));
  });

  // `mud-icon` inlines the SVG into its shadow root, where `mud-icon.css`'s
  // `color: var(--icon-color, currentColor)` cascades into it. Paint that is not
  // `currentColor` or `none` wins over that cascade, so the icon stops answering
  // to the `color` prop — silently, and only in the themes that differ.
  it('carries no paint other than currentColor or none', () => {
    const offenders = files
      .filter(({ source }) =>
        [...source.matchAll(/\s(?:fill|stroke)="([^"]*)"/g)].some(
          ([, value]) => value !== 'currentColor' && value !== 'none',
        ),
      )
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  // The host element carries the size and the CSS stretches the svg to it, so a
  // root `width`/`height` is dead weight that contradicts the rendered size.
  it('carries no intrinsic size on the root element', () => {
    const offenders = files
      .filter(({ source }) => /<svg[^>]*\s(?:width|height)=/.test(source.slice(0, source.indexOf('>') + 1)))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  // Every drawing must scale from its viewBox alone — `size` is the only thing
  // that decides the rendered box now that the assets are style-keyed.
  it('carries a viewBox on every drawing', () => {
    const offenders = files
      .filter(({ source }) => !/<svg[^>]*\sviewBox="/.test(source.slice(0, source.indexOf('>') + 1)))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });
});
