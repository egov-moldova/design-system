import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-banner';

import { BANNER_EMPHASES, BANNER_VARIANTS } from '../mud-banner.types';

const queryClose = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.close') ?? null) as HTMLButtonElement | null;

const queryIcon = (root: Element | null | undefined): Element | null =>
  root?.shadowRoot?.querySelector('.icon mud-icon') ?? null;

const queryLink = (root: Element | null | undefined): HTMLAnchorElement | null =>
  (root?.shadowRoot?.querySelector('a.link') ?? null) as HTMLAnchorElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('mud-banner', () => {
  describe('defaults', () => {
    it('reflects default props with a polite status role', async () => {
      const { root } = await render(<mud-banner>Mesaj</mud-banner>);
      expect(root?.getAttribute('variant')).toBe('info');
      expect(root?.getAttribute('emphasis')).toBe('subtle');
      expect(root?.getAttribute('dismissible')).toBeNull();
      expect(root?.getAttribute('role')).toBe('status');
      expect(root?.getAttribute('aria-live')).toBe('polite');
      expect(root?.getAttribute('aria-atomic')).toBe('true');
    });

    it('renders no close button by default', async () => {
      const { root } = await render(<mud-banner>Mesaj</mud-banner>);
      expect(queryClose(root)).toBeNull();
    });

    it('renders no inline link by default', async () => {
      const { root } = await render(<mud-banner>Mesaj</mud-banner>);
      expect(queryLink(root)).toBeNull();
    });

    it('renders a leading icon', async () => {
      const { root } = await render(<mud-banner>Mesaj</mud-banner>);
      expect(queryIcon(root)).toBeTruthy();
    });
  });

  describe('variant + emphasis', () => {
    it.each(BANNER_VARIANTS)('reflects variant="%s"', async variant => {
      const { root } = await render(<mud-banner variant={variant}>M</mud-banner>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it.each(BANNER_EMPHASES)('reflects emphasis="%s"', async emphasis => {
      const { root } = await render(<mud-banner emphasis={emphasis}>M</mud-banner>);
      expect(root?.getAttribute('emphasis')).toBe(emphasis);
    });

    it('routes info to role="status" + aria-live="polite"', async () => {
      const { root } = await render(<mud-banner variant="info">M</mud-banner>);
      expect(root?.getAttribute('role')).toBe('status');
      expect(root?.getAttribute('aria-live')).toBe('polite');
    });

    it.each(['warning', 'error'] as const)('routes %s to role="alert" + aria-live="assertive"', async variant => {
      const { root } = await render(<mud-banner variant={variant}>M</mud-banner>);
      expect(root?.getAttribute('role')).toBe('alert');
      expect(root?.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('icon resolution', () => {
    it('uses the per-variant default icon', async () => {
      const { root } = await render(<mud-banner variant="error">M</mud-banner>);
      expect(queryIcon(root)?.getAttribute('name')).toBe('circle-error-filled');
    });

    it('honors the iconName override', async () => {
      const { root } = await render(<mud-banner icon-name="bell-filled">M</mud-banner>);
      expect(queryIcon(root)?.getAttribute('name')).toBe('bell-filled');
    });

    it('flags has-icon-start when the icon-start slot is filled', async () => {
      const { root } = await render(
        <mud-banner>
          <mud-icon slot="icon-start" name="custom"></mud-icon>
          Mesaj
        </mud-banner>,
      );
      await flush();
      expect(root?.classList.contains('has-icon-start')).toBe(true);
    });
  });

  describe('dismissible', () => {
    it('renders a close button when dismissible', async () => {
      const { root } = await render(<mud-banner dismissible>M</mud-banner>);
      expect(queryClose(root)).not.toBeNull();
    });

    it('emits mudDismiss on close click', async () => {
      const onDismiss = vi.fn();
      const { root } = await render(
        <mud-banner dismissible onMudDismiss={onDismiss}>
          M
        </mud-banner>,
      );
      queryClose(root)!.click();
      await flush();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('emits mudDismiss on Enter / Space via the key handler', async () => {
      const onDismiss = vi.fn();
      const { root } = await render(
        <mud-banner dismissible onMudDismiss={onDismiss}>
          M
        </mud-banner>,
      );
      // Invoke the handler directly: mock-doc does not route synthetic
      // KeyboardEvents through the JSX listener (mirrors the notification spec).
      type Instance = { handleCloseKeyDown: (ev: KeyboardEvent) => void };
      (root as unknown as Instance).handleCloseKeyDown.call(root, new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      (root as unknown as Instance).handleCloseKeyDown.call(root, new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      await flush();
      expect(onDismiss).toHaveBeenCalledTimes(2);
    });

    it('ignores non-activation keys (Tab)', async () => {
      const onDismiss = vi.fn();
      const { root } = await render(
        <mud-banner dismissible onMudDismiss={onDismiss}>
          M
        </mud-banner>,
      );
      type Instance = { handleCloseKeyDown: (ev: KeyboardEvent) => void };
      (root as unknown as Instance).handleCloseKeyDown.call(root, new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      await flush();
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('carries the default close label', async () => {
      const { root } = await render(<mud-banner dismissible>M</mud-banner>);
      expect(queryClose(root)?.getAttribute('aria-label')).toBe('Închide');
    });

    it('honors a custom close-label', async () => {
      const { root } = await render(
        <mud-banner dismissible close-label="Dismiss">
          M
        </mud-banner>,
      );
      expect(queryClose(root)?.getAttribute('aria-label')).toBe('Dismiss');
    });
  });

  describe('inline link', () => {
    it('renders the link with href + text when linkText is set', async () => {
      const { root } = await render(
        <mud-banner link-text="Click here" link-href="/status">
          M
        </mud-banner>,
      );
      const link = queryLink(root);
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('/status');
      expect(link?.textContent).toBe('Click here');
    });

    it('defaults the link href to #', async () => {
      const { root } = await render(<mud-banner link-text="Detalii">M</mud-banner>);
      expect(queryLink(root)?.getAttribute('href')).toBe('#');
    });
  });

  describe('content + aria-label', () => {
    it('projects the default-slot message', async () => {
      const { root } = await render(<mud-banner>Mentenanță programată</mud-banner>);
      expect(root?.textContent).toContain('Mentenanță programată');
    });

    it('forwards aria-label to the host', async () => {
      const { root } = await render(<mud-banner aria-label="System notice">M</mud-banner>);
      expect(root?.getAttribute('aria-label')).toBe('System notice');
    });
  });

  it('constructs via the custom-element registry (coverage guard)', async () => {
    await render(<mud-banner>M</mud-banner>);
    const Ctor = customElements.get('mud-banner') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    expect(Ctor).toBeTruthy();
    expect(new Ctor!(false)).toBeTruthy();
  });
});
