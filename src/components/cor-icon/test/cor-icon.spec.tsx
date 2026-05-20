import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';
import { setAssetPath } from '@stencil/core';

import '../cor-icon';
import manifest from '../assets/icons.manifest.json';
import { clearIconSvgCache, resolveIconAsset } from '../cor-icon.providers';
import type { IconManifest } from '../cor-icon.types';

const ICON_NAMES = Object.keys(manifest);
const NAME_WITH_ALL_SIZES = ICON_NAMES.find(
  n => (manifest as Record<string, { sizes: number[] }>)[n].sizes.length === 4,
);
const NAME_PARTIAL_SIZES = ICON_NAMES.find(n => {
  const s = (manifest as Record<string, { sizes: number[] }>)[n].sizes;
  return s.length > 0 && s.length < 4;
});

function makeFetchMock() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
    const match = String(url).match(/\/(\d+)\/([^/]+)\.svg/);
    if (!match) return new Response('', { status: 404 });
    return new Response(`<svg data-name="${match[2]}" data-size="${match[1]}"></svg>`, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  });
}

describe('cor-icon', () => {
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

  it('renders with default props (size=16, name="check")', async () => {
    const defaultName = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={defaultName} />);
    await waitForChanges();

    expect(root?.getAttribute('size')).toBe('16');
    expect(root?.getAttribute('color')).toBe('icon-base-secondary');
    expect(root?.shadowRoot?.querySelector('.svg-icon')).toBeTruthy();
  });

  it('reflects size to the host attribute', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={name} size={24} />);
    expect(root?.getAttribute('size')).toBe('24');
  });

  it('reflects interactive + disabled flags', async () => {
    const name = ICON_NAMES[0];
    const { root } = await render(<cor-icon name={name} interactive disabled />);
    expect(root?.hasAttribute('interactive')).toBe(true);
    expect(root?.hasAttribute('disabled')).toBe(true);
  });

  it('treats absent ariaLabel as decorative (aria-hidden on host)', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} />);
    await waitForChanges();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.hasAttribute('aria-label')).toBe(false);
  });

  it('announces with ariaLabel when provided', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} aria-label="Confirm" />);
    await waitForChanges();
    expect(root?.getAttribute('aria-label')).toBe('Confirm');
    expect(root?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('adds button role + tabindex on host when interactive and not disabled', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} interactive />);
    await waitForChanges();
    expect(root?.getAttribute('role')).toBe('button');
    expect(root?.getAttribute('tabindex')).toBe('0');
    expect(root?.hasAttribute('aria-disabled')).toBe(false);
  });

  it('announces aria-disabled and drops tabindex when interactive + disabled', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} interactive disabled />);
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
    const { root, waitForChanges } = await render(<cor-icon name={name} interactive />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    getHandler(root!)(ev);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('activates on Space when interactive', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} interactive />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    getHandler(root!)(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys (does not activate on Tab/ArrowDown)', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} interactive />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    const handler = getHandler(root!);
    handler(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    handler(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('keydown handler is a no-op when interactive + disabled', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} interactive disabled />);
    await waitForChanges();
    const clickSpy = vi.spyOn(root as unknown as HTMLElement, 'click').mockImplementation(() => {});
    getHandler(root!)(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('sets --icon-color on the host for a token name and removes it for currentColor', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} color="icon-brand-default" />);
    await waitForChanges();
    expect((root as HTMLElement).style.getPropertyValue('--icon-color')).toBe('var(--color-icon-brand-default)');

    (root as unknown as { color: string }).color = 'currentColor';
    await waitForChanges();
    expect((root as HTMLElement).style.getPropertyValue('--icon-color')).toBe('');
  });

  it('logs a warning and renders nothing when the name is unknown', async () => {
    const { root, waitForChanges } = await render(<cor-icon name="this-icon-does-not-exist" />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.children.length ?? 0).toBe(0);
  });

  it('renders inline SVG markup in shadow DOM for a known icon', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} size={24} />);
    await waitForChanges();
    const innerHtml = root?.shadowRoot?.querySelector('.svg-icon')?.innerHTML ?? '';
    expect(innerHtml.toLowerCase()).toContain('<svg');
  });

  it('cache hit: fetch called only once for two instances with the same name+size', async () => {
    const name = ICON_NAMES[0];
    // Render both instances concurrently; they share the same cache URL Promise.
    const renders = await Promise.all([
      render(<cor-icon name={name} size={16} />),
      render(<cor-icon name={name} size={16} />),
    ]);
    await renders[0].waitForChanges();
    await renders[1].waitForChanges();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('graceful degrade: fetch 404 → warn + .svg-icon empty', async () => {
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} size={16} />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    const container = root?.shadowRoot?.querySelector('.svg-icon');
    expect(container?.children.length ?? 0).toBe(0);
  });

  it('fetch rejects with network error → .catch() path → warn + .svg-icon empty', async () => {
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    const container = root?.shadowRoot?.querySelector('.svg-icon');
    expect(container?.children.length ?? 0).toBe(0);
  });

  it('onNameChange: changing name to a different icon loads the new SVG', async () => {
    if (ICON_NAMES.length < 2) return;
    const [name1, name2] = ICON_NAMES;
    const { root, waitForChanges } = await render(<cor-icon name={name1} size={16} />);
    await waitForChanges();

    (root as unknown as { name: string }).name = name2;
    await waitForChanges();

    expect(fetchSpy.mock.calls.some((args: unknown[]) => String(args[0]).includes(`/${name2}.svg`))).toBe(true);
    const innerHTML = root?.shadowRoot?.querySelector('.svg-icon')?.innerHTML ?? '';
    expect(innerHTML.toLowerCase()).toContain('<svg');
  });

  it('onSizeChange: changing size reloads the SVG at the new size', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} size={16} />);
    await waitForChanges();

    (root as unknown as { size: number }).size = 24;
    await waitForChanges();

    expect(fetchSpy.mock.calls.some((args: unknown[]) => String(args[0]).includes('/24/'))).toBe(true);
  });

  it('onNameChange: same-value guard (newVal === oldVal) skips reload', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} />);
    await waitForChanges();
    clearIconSvgCache();
    fetchSpy.mockClear();

    // Invoke the watch handler directly with identical values to exercise the equality guard
    type WatchInstance = { onNameChange: (newVal: string, oldVal: string) => Promise<void> };
    await (root as unknown as WatchInstance).onNameChange(name, name);
    await waitForChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('onSizeChange: same-value guard (newVal === oldVal) skips reload', async () => {
    const name = ICON_NAMES[0];
    const { root, waitForChanges } = await render(<cor-icon name={name} size={16} />);
    await waitForChanges();
    clearIconSvgCache();
    fetchSpy.mockClear();

    type WatchInstance = { onSizeChange: (newVal: number, oldVal: number) => Promise<void> };
    await (root as unknown as WatchInstance).onSizeChange(16, 16);
    await waitForChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('svgCacheKey guard: size fallback to already-loaded resolved size skips fetch', async () => {
    // Find an icon that has 16px but not 12px; requesting 12 falls back to 16.
    const name = ICON_NAMES.find(n => {
      const s = (manifest as Record<string, { sizes: number[] }>)[n].sizes;
      return s.includes(16) && !s.includes(12);
    });
    if (!name) return;

    const { root, waitForChanges } = await render(<cor-icon name={name} size={16} />);
    await waitForChanges();
    // svgCacheKey is now "name|16"
    fetchSpy.mockClear();

    // size=12 → resolveIconAsset falls back to 16 → cacheKey === svgCacheKey → early return
    (root as unknown as { size: number }).size = 12;
    await waitForChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('race condition guard: stale name-change fetch discarded when name changes again', async () => {
    if (ICON_NAMES.length < 3) return;
    const [nameA, nameB, nameC] = ICON_NAMES;

    const { root, waitForChanges } = await render(<cor-icon name={nameA} size={16} />);
    await waitForChanges();

    // Replace fetch: nameB hangs until explicitly resolved, nameC resolves immediately
    fetchSpy.mockRestore();
    clearIconSvgCache();
    let resolveBFetch!: (r: Response) => void;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: unknown) => {
      const match = String(url).match(/\/(\d+)\/([^/]+)\.svg/);
      if (!match) return new Response('', { status: 404 });
      const [, size, iconName] = match;
      if (iconName === nameB) {
        return new Promise<Response>(resolve => {
          resolveBFetch = resolve;
        });
      }
      return new Response(`<svg data-name="${iconName}" data-size="${size}"></svg>`, {
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

  const manifest: IconManifest = {
    sun: { sizes: [16, 24] },
    moon: { sizes: [12] },
  };

  it('returns an exact-size URL when available', () => {
    const r = resolveIconAsset('sun', 16, manifest);
    expect(r?.resolvedSize).toBe(16);
    expect(r?.url).toContain('/16/sun.svg');
  });

  it('falls back UP to the next larger size when the requested size is missing', () => {
    // sun has 16 + 24; requesting 20 should pick 24
    const r = resolveIconAsset('sun', 20, manifest);
    expect(r?.resolvedSize).toBe(24);
    expect(r?.url).toContain('/24/sun.svg');
  });

  it('falls back DOWN to the largest smaller size when no larger size exists', () => {
    // moon only has 12; requesting 24 should pick 12
    const r = resolveIconAsset('moon', 24, manifest);
    expect(r?.resolvedSize).toBe(12);
    expect(r?.url).toContain('/12/moon.svg');
  });

  it('falls back UP rather than DOWN when both options exist', () => {
    // sun has 16 + 24; requesting 12 should prefer 16
    const r = resolveIconAsset('sun', 12, manifest);
    expect(r?.resolvedSize).toBe(16);
  });

  it('returns undefined for unknown names', () => {
    const r = resolveIconAsset('unknown', 16, manifest);
    expect(r).toBeUndefined();
  });

  it('returns undefined when entry has no usable size', () => {
    const empty: IconManifest = { ghost: { sizes: [] } };
    const r = resolveIconAsset('ghost', 16, empty);
    expect(r).toBeUndefined();
  });

  // Sanity check against the real manifest — at least one icon should resolve.
  it('resolves a URL from the real manifest', () => {
    if (!ICON_NAMES.length) return;
    const name = NAME_WITH_ALL_SIZES ?? ICON_NAMES[0];
    const r = resolveIconAsset(name, 24);
    expect(r?.url).toBeTruthy();
    expect(r?.url).toContain('/24/');
  });

  it('exercises fallback against the real manifest when partial sizes exist', () => {
    if (!NAME_PARTIAL_SIZES) return;
    const entry = (manifest as Record<string, { sizes: number[] }>)[NAME_PARTIAL_SIZES];
    if (!entry) return;
    const allSizes = [12, 16, 20, 24];
    const missing = allSizes.find(s => !entry.sizes.includes(s)) as 12 | 16 | 20 | 24 | undefined;
    if (!missing) return;
    const r = resolveIconAsset(NAME_PARTIAL_SIZES, missing);
    expect(r?.url).toBeTruthy();
    expect(r?.resolvedSize).not.toBe(missing);
  });
});
