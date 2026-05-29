import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';
import { setAssetPath } from '@stencil/core';

import '../mud-logo';
import { clearLogoSvgCache, fetchLogoSvg, resolveLogoAssetUrl } from '../mud-logo.providers';
import { LOGO_NAMES } from '../mud-logo.types';

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

describe('mud-logo', () => {
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
    const { root, waitForChanges } = await render(<mud-logo />);
    await waitForChanges();

    expect(root?.getAttribute('name')).toBe('mpay-logo-logomark-only');
    expect(root?.shadowRoot?.querySelector('.svg-logo')).toBeTruthy();
  });

  it('reflects name to the host attribute', async () => {
    const { root } = await render(<mud-logo name="mpass-logo-with-name" />);
    expect(root?.getAttribute('name')).toBe('mpass-logo-with-name');
  });

  it('treats absent ariaLabel as decorative (aria-hidden on host)', async () => {
    const { root, waitForChanges } = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForChanges();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.hasAttribute('aria-label')).toBe(false);
  });

  it('treats whitespace-only ariaLabel as decorative (Issue 2)', async () => {
    const { root, waitForChanges } = await render(<mud-logo name="mpay-logo-logomark-only" aria-label="   " />);
    await waitForChanges();
    // Whitespace-only ariaLabel must NOT promote the host to role=img — that
    // would surface a nameless image to screen readers. `aria-hidden` wins.
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.getAttribute('role')).toBeNull();
  });

  it('announces with ariaLabel + role=img when provided', async () => {
    const { root, waitForChanges } = await render(
      <mud-logo name="mpay-logo-logomark-only" aria-label="Pay with MPay" />,
    );
    await waitForChanges();
    expect(root?.getAttribute('aria-label')).toBe('Pay with MPay');
    expect(root?.getAttribute('role')).toBe('img');
    expect(root?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('renders inline SVG markup in shadow DOM for a known logo', async () => {
    const { root, waitForChanges } = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForChanges();
    const inner = root?.shadowRoot?.querySelector('.svg-logo')?.innerHTML ?? '';
    expect(inner.toLowerCase()).toContain('<svg');
  });

  it('renders only the .svg-logo container — no separate text nodes', async () => {
    const { root, waitForChanges } = await render(<mud-logo name="mpay-logo-with-verb" />);
    await waitForChanges();
    const shadowChildren = root?.shadowRoot?.children;
    expect(shadowChildren?.length ?? 0).toBe(1);
    expect(shadowChildren?.[0].className).toBe('svg-logo');
  });

  it('unknown name → warns, no SVG, but host stays decorative (Issue 3)', async () => {
    const { root, waitForChanges } = await render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <mud-logo name={'totally-fake-logo' as any} />,
    );
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.querySelector('.svg-logo')).toBeNull();
    // Host must still be aria-hidden so screen readers don't traverse it as a
    // nameless generic element.
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it('emits mudLogoError with reason="unknown" when name is unknown (Issue 7)', async () => {
    const errorSpy = vi.fn();
    document.addEventListener('mudLogoError', errorSpy);

    await render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <mud-logo name={'nope' as any} />,
    );

    document.removeEventListener('mudLogoError', errorSpy);
    // Event fires during componentWillLoad on initial mount; listener attached
    // on document captures bubbled custom events.
    expect(errorSpy).toHaveBeenCalled();
    const detail = (errorSpy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ name: 'nope', reason: 'unknown' });
  });

  it('emits mudLogoError with reason="fetch-failed" when the SVG cannot be loaded (Issue 7)', async () => {
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    const errorSpy = vi.fn();
    document.addEventListener('mudLogoError', errorSpy);

    const { waitForChanges } = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForChanges();

    document.removeEventListener('mudLogoError', errorSpy);
    expect(errorSpy).toHaveBeenCalled();
    const detail = (errorSpy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ name: 'mpay-logo-logomark-only', reason: 'fetch-failed' });
  });

  it('cache hit: fetch called only once for two instances with the same name', async () => {
    const renders = await Promise.all([
      render(<mud-logo name="mpay-logo-logomark-only" />),
      render(<mud-logo name="mpay-logo-logomark-only" />),
    ]);
    await renders[0].waitForChanges();
    await renders[1].waitForChanges();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('graceful degrade: fetch 404 → warn + .svg-logo empty', async () => {
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    const { root, waitForChanges } = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.querySelector('.svg-logo')?.children.length ?? 0).toBe(0);
  });

  it('cache eviction on failure: a transient 404 does not lock out future retries (Issue 1)', async () => {
    // First call: 404 → null result → cache must evict
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 404 }));
    // `resolveLogoAssetUrl` is `string | null` to absorb getAssetPath URL
    // parse errors in non-lazy-bundle hosts (e.g. vitest browser-mode). The
    // mock-doc spec env always returns a string, so the non-null assertion
    // is safe here.
    const url = resolveLogoAssetUrl('mpay-logo-logomark-only')!;
    const first = await fetchLogoSvg(url);
    expect(first).toBeNull();
    // Drain microtask so the cache-eviction `.then` runs.
    await new Promise(r => setTimeout(r, 0));

    // Second call: backend recovered → should re-fetch (cache was evicted).
    fetchSpy.mockResolvedValueOnce(
      new Response('<svg viewBox="0 0 40 40"></svg>', {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      }),
    );
    const second = await fetchLogoSvg(url);
    expect(second).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('onNameChange: changing to a different name loads the new SVG', async () => {
    const { root, waitForChanges } = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForChanges();

    (root as unknown as { name: string }).name = 'mpass-logo-logomark-only';
    await waitForChanges();

    const calls = fetchSpy.mock.calls.map((args: unknown[]) => String(args[0]));
    expect(calls.some((url: string) => url.includes('mpass-logo-logomark-only.svg'))).toBe(true);
  });

  it('every LOGO_NAMES entry resolves to a valid asset URL', () => {
    for (const name of LOGO_NAMES) {
      // `resolveLogoAssetUrl` is `string | null` in non-lazy-bundle hosts; in
      // the mock-doc spec env it always returns a string — assert that.
      const url = resolveLogoAssetUrl(name);
      expect(url).not.toBeNull();
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
    const Ctor = customElements.get('mud-logo') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
