import { render, h, describe, it, expect, vi, beforeEach, afterEach } from '@stencil/vitest';

import '../mud-logo';
import { LOGO_MODULES } from '../../../generated/logos';
import { SVG_RETRY_MS, clearSvgCaches } from '../../../utils/svg-assets';
import { holdRetryTimers, waitForAssetLoad } from '../../../utils/svg-assets.test-helpers';
import { LOGO_NAMES } from '../mud-logo.types';

type ModuleThunks = Record<string, () => Promise<{ default: string }>>;
const modules = LOGO_MODULES as ModuleThunks;

const marker = (root: Element | null | undefined) =>
  root?.shadowRoot?.querySelector('svg')?.getAttribute('data-mud-asset');

describe('mud-logo', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    clearSvgCaches();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.restoreAllMocks();
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
    const { root } = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForAssetLoad(() => expect(marker(root)).toBe('logo:mpay-logo-logomark-only'));
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

  it('renders the drawing of a valid name', async () => {
    const { root } = await render(<mud-logo name="mpass-logo-with-name" />);
    await waitForAssetLoad(() => expect(marker(root)).toBe('logo:mpass-logo-with-name'));
  });

  it('emits mudLogoError with reason="fetch-failed" when the import fails (Issue 7)', async () => {
    vi.spyOn(modules, 'mpay-logo-logomark-only').mockRejectedValueOnce(new Error('offline'));
    const errorSpy = vi.fn();
    document.addEventListener('mudLogoError', errorSpy);

    await render(<mud-logo name="mpay-logo-logomark-only" />);

    document.removeEventListener('mudLogoError', errorSpy);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const detail = (errorSpy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ name: 'mpay-logo-logomark-only', reason: 'fetch-failed' });
  });

  it('emits mudLogoError with reason="rejected" when the sanitizer refuses the drawing, and never retries it', async () => {
    vi.spyOn(modules, 'mpay-logo-logomark-only').mockResolvedValueOnce({ default: '<p>not a drawing</p>' });
    const errorSpy = vi.fn();
    document.addEventListener('mudLogoError', errorSpy);
    const timers = holdRetryTimers();
    try {
      await render(<mud-logo name="mpay-logo-logomark-only" />);
      await waitForAssetLoad(() => expect(errorSpy).toHaveBeenCalledTimes(1));
      expect((errorSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({
        name: 'mpay-logo-logomark-only',
        reason: 'rejected',
      });
      expect(timers.held).toHaveLength(0);
    } finally {
      timers.restore();
      document.removeEventListener('mudLogoError', errorSpy);
    }
  });

  it('retries a failed import on its own after the loader backoff, reporting the run of failures once', async () => {
    const logo = vi
      .spyOn(modules, 'mpay-logo-logomark-only')
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'));
    const errorSpy = vi.fn();
    document.addEventListener('mudLogoError', errorSpy);
    const timers = holdRetryTimers();
    try {
      const { root } = await render(<mud-logo name="mpay-logo-logomark-only" />);
      await waitForAssetLoad(() => expect(timers.held).toHaveLength(1));
      timers.held[0].fire();
      await waitForAssetLoad(() => expect(timers.held).toHaveLength(2));
      expect(timers.held[1].ms).toBeGreaterThan(2 * SVG_RETRY_MS - 1000);
      timers.held[1].fire();
      await waitForAssetLoad(() => expect(marker(root)).toBe('logo:mpay-logo-logomark-only'));
      expect(logo).toHaveBeenCalledTimes(3);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      timers.restore();
      document.removeEventListener('mudLogoError', errorSpy);
    }
  });

  it('graceful degrade: a failed import warns once and leaves .svg-logo empty', async () => {
    vi.spyOn(modules, 'mpay-logo-logomark-only').mockRejectedValueOnce(new Error('offline'));

    const { root } = await render(<mud-logo name="mpay-logo-logomark-only" />);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('Failed to load SVG');
    expect(root?.shadowRoot?.querySelector('.svg-logo')?.children.length ?? 0).toBe(0);
  });

  it('a failed import is not cached: the next render imports again and draws', async () => {
    vi.spyOn(modules, 'mpay-logo-logomark-only').mockRejectedValueOnce(new Error('offline'));
    const first = await render(<mud-logo name="mpay-logo-logomark-only" />);
    expect(marker(first.root)).toBeUndefined();

    const second = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForAssetLoad(() => expect(marker(second.root)).toBe('logo:mpay-logo-logomark-only'));
  });

  it('never lets a superseded import replace the latest name', async () => {
    const { root, waitForChanges } = await render(<mud-logo name="mpass-logo-with-name" />);
    await waitForAssetLoad(() => expect(marker(root)).toBe('logo:mpass-logo-with-name'));
    let release!: (m: { default: string }) => void;
    vi.spyOn(modules, 'mcloud-logo-with-name').mockReturnValueOnce(new Promise(r => (release = r)));
    root!.setAttribute('name', 'mcloud-logo-with-name');
    root!.setAttribute('name', 'msign-logo-with-name');
    await waitForAssetLoad(() => expect(marker(root)).toBe('logo:msign-logo-with-name'));
    release({ default: '<svg xmlns="http://www.w3.org/2000/svg" data-mud-asset="logo:mcloud-logo-with-name"></svg>' });
    await new Promise(r => setTimeout(r, 0));
    await waitForChanges();
    expect(marker(root)).toBe('logo:msign-logo-with-name');
  });

  it('renders a second instance of a loaded logo without importing again', async () => {
    const first = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForAssetLoad(() => expect(marker(first.root)).toBe('logo:mpay-logo-logomark-only'));
    const spy = vi.spyOn(modules, 'mpay-logo-logomark-only');
    const { root } = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForAssetLoad(() => expect(marker(root)).toBe('logo:mpay-logo-logomark-only'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('onNameChange: changing to a different name draws the new logo', async () => {
    const { root } = await render(<mud-logo name="mpay-logo-logomark-only" />);
    await waitForAssetLoad(() => expect(marker(root)).toBe('logo:mpay-logo-logomark-only'));

    (root as unknown as { name: string }).name = 'mpass-logo-logomark-only';
    await waitForAssetLoad(() => expect(marker(root)).toBe('logo:mpass-logo-logomark-only'));
  });

  it('every LOGO_NAMES entry has a generated module', () => {
    for (const name of LOGO_NAMES) {
      expect(Object.hasOwn(LOGO_MODULES, name)).toBe(true);
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
