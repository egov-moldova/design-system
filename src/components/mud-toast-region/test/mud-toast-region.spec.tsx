import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-toast-region';
import '../../mud-toast/mud-toast';

import { describeLocales } from '../../../utils/locale.test-helpers';
import { TOAST_REGION_MESSAGES } from '../mud-toast-region.messages';
import type { ToastRegionMessages } from '../mud-toast-region.messages';
import { TOAST_REGION_DEFAULT_DURATION_MS } from '../mud-toast-region.types';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const flush = () => wait(0);

const region = (root: Element | null | undefined) => root as HTMLMudToastRegionElement;

/** Lets the slotchange land and the region start its timers. */
const settle = async (root: Element | null | undefined) => {
  region(root).shadowRoot?.querySelector('slot')?.dispatchEvent(new Event('slotchange'));
  await flush();
};

describe('mud-toast-region', () => {
  describe('landmark', () => {
    it('is not a landmark while it is empty', async () => {
      const { root } = await render(<mud-toast-region></mud-toast-region>);
      expect(root?.getAttribute('role')).toBeNull();
      expect(root?.getAttribute('aria-label')).toBeNull();
    });

    it('becomes a labelled region once it holds a toast', async () => {
      const { root, waitForChanges } = await render(<mud-toast-region locale="ro-MD"></mud-toast-region>);
      await region(root).show({ message: 'Salvat' });
      await settle(root);
      await waitForChanges();
      expect(root?.getAttribute('role')).toBe('region');
      expect(root?.getAttribute('aria-label')).toBe('Notificări');
    });
  });

  describe('show()', () => {
    it('adds a toast with the given variant, heading and text, and returns it', async () => {
      const { root } = await render(<mud-toast-region></mud-toast-region>);
      const toast = await region(root).show({
        variant: 'warning',
        titleText: 'Atenție',
        message: '<b>not markup</b>',
        closable: false,
      });
      expect(toast.parentElement).toBe(root);
      expect(toast.variant).toBe('warning');
      expect(toast.titleText).toBe('Atenție');
      expect(toast.closable).toBe(false);
      expect(toast.textContent).toBe('<b>not markup</b>');
      expect(toast.querySelector('b')).toBeNull();
    });

    it('defaults to an info toast with a close button', async () => {
      const { root } = await render(<mud-toast-region></mud-toast-region>);
      const toast = await region(root).show({ message: 'Salvat' });
      expect(toast.variant).toBe('info');
      expect(toast.closable).toBe(true);
    });
  });

  describe('dismissal', () => {
    it('removes a toast once it has closed', async () => {
      const { root } = await render(<mud-toast-region></mud-toast-region>);
      const toast = await region(root).show({ message: 'Salvat' });
      toast.dispatchEvent(new CustomEvent('mudClose', { bubbles: true, composed: true }));
      expect(toast.parentElement).toBeNull();
    });

    it('defaults the auto-dismiss delay to 5 seconds', async () => {
      const { root } = await render(<mud-toast-region></mud-toast-region>);
      expect(region(root).duration).toBe(TOAST_REGION_DEFAULT_DURATION_MS);
      expect(TOAST_REGION_DEFAULT_DURATION_MS).toBe(5000);
    });

    it.each(['info', 'success'] as const)('dismisses an %s toast after `duration`', async variant => {
      const { root } = await render(<mud-toast-region duration={30}></mud-toast-region>);
      const toast = await region(root).show({ variant, message: 'Gata' });
      const dismiss = vi.spyOn(toast, 'dismiss').mockResolvedValue();
      await settle(root);
      await wait(60);
      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it.each(['warning', 'error'] as const)('keeps a %s toast until the user closes it', async variant => {
      const { root } = await render(<mud-toast-region duration={30}></mud-toast-region>);
      const toast = await region(root).show({ variant, message: 'Problemă' });
      const dismiss = vi.spyOn(toast, 'dismiss').mockResolvedValue();
      await settle(root);
      await wait(60);
      expect(dismiss).not.toHaveBeenCalled();
    });

    it('keeps a toast with an action until the user closes it', async () => {
      const { root } = await render(<mud-toast-region duration={30}></mud-toast-region>);
      const toast = await region(root).show({ message: 'Document gata' });
      const link = document.createElement('a');
      link.setAttribute('slot', 'actions');
      toast.appendChild(link);
      const dismiss = vi.spyOn(toast, 'dismiss').mockResolvedValue();
      await settle(root);
      await wait(60);
      expect(dismiss).not.toHaveBeenCalled();
    });

    it('keeps every toast when `duration` is 0', async () => {
      const { root } = await render(<mud-toast-region duration={0}></mud-toast-region>);
      const toast = await region(root).show({ message: 'Salvat' });
      const dismiss = vi.spyOn(toast, 'dismiss').mockResolvedValue();
      await settle(root);
      await wait(40);
      expect(dismiss).not.toHaveBeenCalled();
    });

    it('pauses the timer while the pointer is over the region', async () => {
      const { root } = await render(<mud-toast-region duration={40}></mud-toast-region>);
      const toast = await region(root).show({ message: 'Salvat' });
      const dismiss = vi.spyOn(toast, 'dismiss').mockResolvedValue();
      await settle(root);
      root?.dispatchEvent(new Event('pointerenter'));
      await wait(80);
      expect(dismiss).not.toHaveBeenCalled();
      root?.dispatchEvent(new Event('pointerleave'));
      await wait(80);
      expect(dismiss).toHaveBeenCalledTimes(1);
    });

    it('pauses the timer while focus is inside the region', async () => {
      const { root } = await render(<mud-toast-region duration={40}></mud-toast-region>);
      const toast = await region(root).show({ message: 'Salvat' });
      const dismiss = vi.spyOn(toast, 'dismiss').mockResolvedValue();
      await settle(root);
      root?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await wait(80);
      expect(dismiss).not.toHaveBeenCalled();
      root?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      await wait(80);
      expect(dismiss).toHaveBeenCalledTimes(1);
    });
  });
});

describeLocales<ToastRegionMessages>('mud-toast-region', TOAST_REGION_MESSAGES, {
  render: async (props, ancestorLang) => {
    const attrs: Record<string, string> = {};
    if (props.locale !== undefined) attrs.locale = String(props.locale);
    if (props.label !== undefined) attrs.label = String(props.label);
    const { root } = await render(
      <mud-toast-region {...attrs}>
        <mud-toast>Mesaj</mud-toast>
      </mud-toast-region>,
      ancestorLang ? { stageAttrs: { lang: ancestorLang } } : undefined,
    );
    await settle(root);
    return root as Element;
  },
  read: (host, key) => {
    if (key === 'label') return host.getAttribute('aria-label');
    return null;
  },
  overrides: { label: 'label' },
});
