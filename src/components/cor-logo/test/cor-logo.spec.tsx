import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';
import { setAssetPath } from '@stencil/core';

import '../cor-logo';
import { clearLogoSvgCache, resolveLogoAssetUrl } from '../cor-logo.providers';
import { LOGO_NAMES } from '../cor-logo.types';

function makeFetchMock() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
    const match = String(url).match(/([a-z-]+)\.svg$/);
    if (!match) return new Response('', { status: 404 });
    return new Response(`<svg data-name="${match[1]}" viewBox="0 0 40 40"></svg>`, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  });
}

describe('cor-logo', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setAssetPath('http://localhost/');
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchSpy = makeFetchMock();
    clearLogoSvgCache();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('renders with the default name (mpay-logo-logomark-only)', async () => {
    const { root, waitForChanges } = await render(<cor-logo />);
    await waitForChanges();

    expect(root?.getAttribute('name')).toBe('mpay-logo-logomark-only');
    expect(root?.shadowRoot?.querySelector('.svg-logo')).toBeTruthy();
  });

  it('reflects name to the host attribute', async () => {
    const { root } = await render(<cor-logo name="mpass-logo-with-name" />);
    expect(root?.getAttribute('name')).toBe('mpass-logo-with-name');
  });

  it('treats absent ariaLabel as decorative (aria-hidden on host)', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpay-logo-logomark-only" />);
    await waitForChanges();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.hasAttribute('aria-label')).toBe(false);
  });

  it('announces with ariaLabel + role=img when provided', async () => {
    const { root, waitForChanges } = await render(
      <cor-logo name="mpay-logo-logomark-only" aria-label="Pay with MPay" />,
    );
    await waitForChanges();
    expect(root?.getAttribute('aria-label')).toBe('Pay with MPay');
    expect(root?.getAttribute('role')).toBe('img');
    expect(root?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('renders inline SVG markup in shadow DOM for a known logo', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpay-logo-logomark-only" />);
    await waitForChanges();
    const inner = root?.shadowRoot?.querySelector('.svg-logo')?.innerHTML ?? '';
    expect(inner.toLowerCase()).toContain('<svg');
  });

  it('renders only the .svg-logo container — no separate text nodes', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpay-logo-with-verb" />);
    await waitForChanges();
    const shadowChildren = root?.shadowRoot?.children;
    expect(shadowChildren?.length ?? 0).toBe(1);
    expect(shadowChildren?.[0].className).toBe('svg-logo');
  });

  it('logs a warning and renders nothing when name is unknown', async () => {
    const { root, waitForChanges } = await render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <cor-logo name={'totally-fake-logo' as any} />,
    );
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.children.length ?? 0).toBe(0);
  });

  it('cache hit: fetch called only once for two instances with the same name', async () => {
    const renders = await Promise.all([
      render(<cor-logo name="mpay-logo-logomark-only" />),
      render(<cor-logo name="mpay-logo-logomark-only" />),
    ]);
    await renders[0].waitForChanges();
    await renders[1].waitForChanges();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('graceful degrade: fetch 404 → warn + .svg-logo empty', async () => {
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    const { root, waitForChanges } = await render(<cor-logo name="mpay-logo-logomark-only" />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.querySelector('.svg-logo')?.children.length ?? 0).toBe(0);
  });

  it('onNameChange: changing to a different name loads the new SVG', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpay-logo-logomark-only" />);
    await waitForChanges();

    (root as unknown as { name: string }).name = 'mpass-logo-logomark-only';
    await waitForChanges();

    const calls = fetchSpy.mock.calls.map((args: unknown[]) => String(args[0]));
    expect(calls.some((url: string) => url.includes('mpass-logo-logomark-only.svg'))).toBe(true);
  });

  it('every LOGO_NAMES entry resolves to a valid asset URL', () => {
    for (const name of LOGO_NAMES) {
      const url = resolveLogoAssetUrl(name);
      expect(url).toContain(`${name}.svg`);
    }
  });

  it('exposes 55 names (11 services × 5 layouts)', () => {
    expect(LOGO_NAMES.length).toBe(55);
    expect(LOGO_NAMES).toContain('mpay-logo-logomark-only');
    expect(LOGO_NAMES).toContain('mcloud-logo-with-verb');
    expect(LOGO_NAMES).toContain('msign-logo-with-long-name-large');
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('cor-logo') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
