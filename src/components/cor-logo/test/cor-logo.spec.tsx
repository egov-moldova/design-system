import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';
import { setAssetPath } from '@stencil/core';

import '../cor-logo';
import { clearLogoSvgCache, resolveLogoAssetUrl } from '../cor-logo.providers';
import { LOGO_NAMES, LOGO_VARIANTS } from '../cor-logo.types';

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

  it('renders with default props (name=mpay, variant=logomark-only)', async () => {
    const { root, waitForChanges } = await render(<cor-logo />);
    await waitForChanges();

    expect(root?.getAttribute('name')).toBe('mpay');
    expect(root?.getAttribute('variant')).toBe('logomark-only');
    expect(root?.shadowRoot?.querySelector('.logomark')).toBeTruthy();
  });

  it('reflects name + variant to the host attributes', async () => {
    const { root } = await render(<cor-logo name="mpass" variant="with-name" />);
    expect(root?.getAttribute('name')).toBe('mpass');
    expect(root?.getAttribute('variant')).toBe('with-name');
  });

  it('treats absent ariaLabel as decorative (aria-hidden on host)', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpay" />);
    await waitForChanges();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.hasAttribute('aria-label')).toBe(false);
  });

  it('announces with ariaLabel + role=img when provided', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpay" aria-label="Pay with MPay" />);
    await waitForChanges();
    expect(root?.getAttribute('aria-label')).toBe('Pay with MPay');
    expect(root?.getAttribute('role')).toBe('img');
    expect(root?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('renders inline SVG markup in shadow DOM for a known logo', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpay" variant="logomark-only" />);
    await waitForChanges();
    const inner = root?.shadowRoot?.querySelector('.logomark')?.innerHTML ?? '';
    expect(inner.toLowerCase()).toContain('<svg');
  });

  it('logs a warning and renders nothing when name is unknown', async () => {
    const { root, waitForChanges } = await render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <cor-logo name={'invalid-service' as any} />,
    );
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.children.length ?? 0).toBe(0);
  });

  it('logs a warning and renders nothing when variant is unknown', async () => {
    const { root, waitForChanges } = await render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <cor-logo name="mpay" variant={'banner' as any} />,
    );
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.children.length ?? 0).toBe(0);
  });

  it('with-name variant renders the service name text', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpass" variant="with-name" />);
    await waitForChanges();
    const textName = root?.shadowRoot?.querySelector('.text-name')?.textContent;
    expect(textName).toBe('mpass');
  });

  it('with-verb variant renders name + verb', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpay" variant="with-verb" />);
    await waitForChanges();
    expect(root?.shadowRoot?.querySelector('.text-name')?.textContent).toBe('mpay');
    expect(root?.shadowRoot?.querySelector('.text-verb')?.textContent).toBe('plătește');
  });

  it('with-long-name-medium variant renders 2-line description', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="msign" variant="with-long-name-medium" />);
    await waitForChanges();
    const description = root?.shadowRoot?.querySelector('.text-description');
    expect(description?.children.length).toBe(2);
  });

  it('cache hit: fetch called only once for two instances with the same name+variant', async () => {
    const renders = await Promise.all([
      render(<cor-logo name="mpay" variant="logomark-only" />),
      render(<cor-logo name="mpay" variant="logomark-only" />),
    ]);
    await renders[0].waitForChanges();
    await renders[1].waitForChanges();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('graceful degrade: fetch 404 → warn + .logomark empty', async () => {
    fetchSpy.mockRestore();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    const { root, waitForChanges } = await render(<cor-logo name="mpay" />);
    await waitForChanges();
    expect(warnSpy).toHaveBeenCalled();
    expect(root?.shadowRoot?.querySelector('.logomark')?.children.length ?? 0).toBe(0);
  });

  it('onNameChange: changing to a different service loads the new SVG', async () => {
    const { root, waitForChanges } = await render(<cor-logo name="mpay" variant="logomark-only" />);
    await waitForChanges();

    (root as unknown as { name: string }).name = 'mpass';
    await waitForChanges();

    const calls = fetchSpy.mock.calls.map((args: unknown[]) => String(args[0]));
    expect(calls.some((url: string) => url.includes('mpass-logo-logomark-only.svg'))).toBe(true);
  });

  it('all LOGO_NAMES × LOGO_VARIANTS resolve to valid asset URLs', () => {
    for (const name of LOGO_NAMES) {
      for (const variant of LOGO_VARIANTS) {
        const url = resolveLogoAssetUrl(name, variant);
        expect(url).toContain(`${name}-logo-${variant}.svg`);
      }
    }
  });
});
