import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-toast';

import { TOAST_VARIANTS } from '../mud-toast.types';

const queryClose = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.close') ?? null) as HTMLButtonElement | null;

const queryIconHost = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.icon') ?? null) as HTMLElement | null;

const queryTitle = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.title') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('mud-toast', () => {
  describe('defaults', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-toast>Mesaj</mud-toast>);

      expect(root?.getAttribute('variant')).toBe('info');
      // Figma `toast`: Close = true by default.
      expect(root?.hasAttribute('closable')).toBe(true);
      expect(root?.getAttribute('role')).toBe('status');
      expect(root?.getAttribute('aria-live')).toBe('polite');
      expect(root?.getAttribute('aria-atomic')).toBe('true');
    });

    it('renders a close button by default', async () => {
      const { root } = await render(<mud-toast>Mesaj</mud-toast>);
      expect(queryClose(root)).toBeTruthy();
    });

    it('omits the close button when closable is false', async () => {
      const { root } = await render(<mud-toast closable={false}>Mesaj</mud-toast>);
      expect(queryClose(root)).toBeNull();
    });

    it('does not render a title element when title-text is empty', async () => {
      const { root } = await render(<mud-toast>Mesaj</mud-toast>);
      expect(queryTitle(root)).toBeNull();
    });

    it('renders a leading icon container in shadow DOM', async () => {
      const { root } = await render(<mud-toast>Mesaj</mud-toast>);
      expect(queryIconHost(root)).toBeTruthy();
    });
  });

  describe('variant prop', () => {
    it.each(TOAST_VARIANTS)('reflects variant="%s" on the host', async variant => {
      const { root } = await render(<mud-toast variant={variant}>Mesaj</mud-toast>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it('uses role="status" + aria-live="polite" for non-urgent variants', async () => {
      const politeVariants = ['info', 'success'] as const;
      for (const variant of politeVariants) {
        const { root } = await render(<mud-toast variant={variant}>Mesaj</mud-toast>);
        expect(root?.getAttribute('role')).toBe('status');
        expect(root?.getAttribute('aria-live')).toBe('polite');
      }
    });

    it('uses role="alert" + aria-live="assertive" for warning and error', async () => {
      const assertiveVariants = ['warning', 'error'] as const;
      for (const variant of assertiveVariants) {
        const { root } = await render(<mud-toast variant={variant}>Mesaj</mud-toast>);
        expect(root?.getAttribute('role')).toBe('alert');
        expect(root?.getAttribute('aria-live')).toBe('assertive');
      }
    });
  });

  describe('closable behaviour', () => {
    it('renders a close button when closable is set', async () => {
      const { root } = await render(<mud-toast closable>Mesaj</mud-toast>);
      const close = queryClose(root);
      expect(close).toBeTruthy();
      expect(close?.getAttribute('type')).toBe('button');
    });

    it('uses the Romanian "Închide" aria-label by default', async () => {
      const { root } = await render(<mud-toast closable>Mesaj</mud-toast>);
      expect(queryClose(root)?.getAttribute('aria-label')).toBe('Închide');
    });

    it('honors a custom close-label prop', async () => {
      const { root } = await render(
        <mud-toast closable close-label="Dismiss">
          Message
        </mud-toast>,
      );
      expect(queryClose(root)?.getAttribute('aria-label')).toBe('Dismiss');
    });

    it('emits mudClose on click', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-toast closable onMudClose={handler}>
          Mesaj
        </mud-toast>,
      );

      queryClose(root)?.click();
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits mudClose on Enter keypress', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-toast closable onMudClose={handler}>
          Mesaj
        </mud-toast>,
      );

      type Instance = { handleCloseKeyDown: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      (root as unknown as Instance).handleCloseKeyDown.call(root, ev);
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits mudClose on Space keypress', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-toast closable onMudClose={handler}>
          Mesaj
        </mud-toast>,
      );

      type Instance = { handleCloseKeyDown: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      (root as unknown as Instance).handleCloseKeyDown.call(root, ev);
      await flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not emit mudClose on unrelated key presses', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-toast closable onMudClose={handler}>
          Mesaj
        </mud-toast>,
      );

      type Instance = { handleCloseKeyDown: (ev: KeyboardEvent) => void };
      const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      (root as unknown as Instance).handleCloseKeyDown.call(root, ev);
      await flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it('reflects is-closable class on the host when closable is set', async () => {
      const { root } = await render(<mud-toast closable>Mesaj</mud-toast>);
      expect(root?.classList.contains('is-closable')).toBe(true);
    });
  });

  describe('titleText prop', () => {
    it('renders the title element when title-text is provided', async () => {
      const { root } = await render(
        <mud-toast title-text="Plată reușită">Tranzacția a fost confirmată.</mud-toast>,
      );
      const title = queryTitle(root);
      expect(title).toBeTruthy();
      expect(title?.textContent).toContain('Plată reușită');
    });

    it('adds has-title class to the host when title-text is provided', async () => {
      const { root } = await render(<mud-toast title-text="Plată reușită">Mesaj</mud-toast>);
      expect(root?.classList.contains('has-title')).toBe(true);
    });

    it('does not add has-title class when title-text is empty string', async () => {
      const { root } = await render(<mud-toast title-text="">Mesaj</mud-toast>);
      expect(root?.classList.contains('has-title')).toBe(false);
    });
  });

  describe('iconName prop', () => {
    it('forwards iconName to the default mud-icon when slot is empty', async () => {
      const { root } = await render(<mud-toast icon-name="receipt-check-filled">Bon fiscal</mud-toast>);
      const icon = root?.shadowRoot?.querySelector('mud-icon');
      expect(icon?.getAttribute('name')).toBe('receipt-check-filled');
    });

    it('falls back to the per-variant default icon when iconName is unset', async () => {
      const { root } = await render(<mud-toast variant="error">Eroare</mud-toast>);
      const icon = root?.shadowRoot?.querySelector('mud-icon');
      expect(icon?.getAttribute('name')).toBe('circle-error-filled');
    });

    it('uses circle-checkmark-filled for success variant', async () => {
      const { root } = await render(<mud-toast variant="success">OK</mud-toast>);
      const icon = root?.shadowRoot?.querySelector('mud-icon');
      expect(icon?.getAttribute('name')).toBe('circle-checkmark-filled');
    });

    it('uses warning-filled for warning variant', async () => {
      const { root } = await render(<mud-toast variant="warning">Atenție</mud-toast>);
      const icon = root?.shadowRoot?.querySelector('mud-icon');
      expect(icon?.getAttribute('name')).toBe('warning-filled');
    });
  });

  describe('label rendering', () => {
    it('renders default-slot text content', async () => {
      const { root } = await render(<mud-toast>Mesaj important</mud-toast>);
      expect((root?.textContent ?? '').trim()).toContain('Mesaj important');
    });

    it('supports Romanian diacritics in the body', async () => {
      const { root } = await render(<mud-toast>Înălțime mărită — așteaptă confirmarea</mud-toast>);
      expect((root?.textContent ?? '').trim()).toContain('Înălțime mărită');
    });

    it('supports Romanian diacritics in the title', async () => {
      const { root } = await render(
        <mud-toast title-text="Sesiunea a expirat">Reconectați-vă</mud-toast>,
      );
      expect(queryTitle(root)?.textContent).toContain('Sesiunea a expirat');
    });
  });

  describe('WCAG live-region contract', () => {
    it('exposes role + aria-live + aria-atomic on the host', async () => {
      const { root } = await render(<mud-toast>Mesaj</mud-toast>);
      expect(root?.getAttribute('role')).toBe('status');
      expect(root?.getAttribute('aria-live')).toBe('polite');
      expect(root?.getAttribute('aria-atomic')).toBe('true');
    });

    it('keeps the leading icon decorative (aria-hidden)', async () => {
      const { root } = await render(<mud-toast>Mesaj</mud-toast>);
      const iconWrap = queryIconHost(root);
      expect(iconWrap?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('constructor branch coverage', () => {
    it('constructs without registering a host when registerHost=false', () => {
      const Ctor = customElements.get('mud-toast') as unknown as
        | (new (registerHost: boolean) => unknown)
        | undefined;
      expect(Ctor).toBeTruthy();
      const instance = new (Ctor as new (registerHost: boolean) => unknown)(false);
      expect(instance).toBeTruthy();
    });
  });
});
