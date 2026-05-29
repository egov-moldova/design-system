import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-modal';
import { MODAL_CLOSE_REASONS, MODAL_SIZES, MODAL_VARIANTS } from '../mud-modal.types';
import type { ModalCloseEvent, ModalCloseReason } from '../mud-modal.types';

// Helpers ------------------------------------------------------------------

const queryDialog = (root: Element | null | undefined): HTMLDialogElement | null =>
  (root?.shadowRoot?.querySelector('dialog.dialog') ?? null) as HTMLDialogElement | null;

const querySurface = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.surface') ?? null) as HTMLElement | null;

const queryHeader = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.header') ?? null) as HTMLElement | null;

const queryTitle = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.title') ?? null) as HTMLElement | null;

const queryCloseButton = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.close') ?? null) as HTMLButtonElement | null;

const queryFooter = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.footer') ?? null) as HTMLElement | null;

const queryBody = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.body') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// Stencil mock-doc does not propagate `keydown` / `cancel` / synthetic `click`
// events to JSX-attached handlers via dispatchEvent. The pattern used across
// the design system (see mud-input-chip, mud-chip, mud-select-input specs) is
// to invoke the registered handler off the component instance directly. The
// arrow-function class properties on `MudModal` are visible on the host
// element instance, so we cast through `unknown` to access them.
type ModalInstance = {
  handleCloseButtonKeyDown: (ev: KeyboardEvent) => void;
  handleDialogCancel: (ev: Event) => void;
  handleBackdropClick: (ev: MouseEvent) => void;
};

const pressKeyOnClose = (root: Element | null | undefined, key: string) => {
  const instance = root as unknown as ModalInstance;
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  instance.handleCloseButtonKeyDown(ev);
  return ev;
};

const fireCancel = (root: Element | null | undefined) => {
  const instance = root as unknown as ModalInstance;
  const ev = new Event('cancel', { cancelable: true });
  instance.handleDialogCancel(ev);
  return ev;
};

const fireBackdropClick = (root: Element | null | undefined, target: Element, x = 0, y = 0) => {
  const instance = root as unknown as ModalInstance;
  const ev = new MouseEvent('click', { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(ev, 'target', { value: target, configurable: true });
  instance.handleBackdropClick(ev);
  return ev;
};

describe('mud-modal', () => {
  describe('defaults + prop reflection', () => {
    it('renders with default props reflected on host', async () => {
      const { root } = await render(<mud-modal title-text="x"></mud-modal>);
      expect(root?.getAttribute('open')).toBeNull();
      expect(root?.getAttribute('size')).toBe('md');
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.getAttribute('closable')).toBe('');
      expect(root?.getAttribute('destructive')).toBeNull();
    });

    it('exposes the canonical size, variant and reason constants', () => {
      expect(MODAL_SIZES).toEqual(['sm', 'md', 'lg']);
      expect(MODAL_VARIANTS).toEqual(['default', 'with-image', 'with-icon']);
      expect(MODAL_CLOSE_REASONS).toEqual(['backdrop', 'escape', 'close-button', 'action']);
    });

    it.each(MODAL_SIZES)('reflects size="%s" to host', async size => {
      const { root } = await render(<mud-modal size={size} title-text="x"></mud-modal>);
      expect(root?.getAttribute('size')).toBe(size);
    });

    it.each(MODAL_VARIANTS)('reflects variant="%s" to host', async variant => {
      const { root } = await render(<mud-modal variant={variant} title-text="x"></mud-modal>);
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it('reflects destructive to host', async () => {
      const { root } = await render(<mud-modal destructive title-text="x"></mud-modal>);
      expect(root?.getAttribute('destructive')).toBe('');
      const surface = querySurface(root);
      expect(surface).toBeTruthy();
    });

    it('reflects closable="false" by removing the attribute', async () => {
      const { root } = await render(<mud-modal closable={false} title-text="x"></mud-modal>);
      expect(root?.getAttribute('closable')).toBeNull();
    });
  });

  describe('shadow structure', () => {
    it('renders an internal <dialog> with role="dialog" semantics', async () => {
      const { root } = await render(<mud-modal title-text="Confirm"></mud-modal>);
      const dialog = queryDialog(root);
      expect(dialog).toBeTruthy();
      expect(dialog?.tagName).toBe('DIALOG');
    });

    it('marks the dialog with aria-modal="true"', async () => {
      const { root } = await render(<mud-modal title-text="Confirm"></mud-modal>);
      const dialog = queryDialog(root);
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });

    it('wires aria-labelledby to the rendered heading id', async () => {
      const { root } = await render(<mud-modal title-text="Confirm"></mud-modal>);
      const dialog = queryDialog(root);
      const heading = root?.shadowRoot?.querySelector('.heading') as HTMLElement | null;
      expect(heading?.id).toMatch(/^modal-title-/);
      expect(dialog?.getAttribute('aria-labelledby')).toBe(heading?.id);
    });

    it('wires aria-describedby to the body id', async () => {
      const { root } = await render(<mud-modal title-text="Confirm">Body copy.</mud-modal>);
      const dialog = queryDialog(root);
      const body = queryBody(root);
      expect(body?.id).toMatch(/^modal-body-/);
      expect(dialog?.getAttribute('aria-describedby')).toBe(body?.id);
    });

    it('renders the heading text via `title-text` prop', async () => {
      const { root } = await render(<mud-modal title-text="Confirmă plata"></mud-modal>);
      const title = queryTitle(root);
      expect(title?.textContent).toContain('Confirmă plata');
    });

    it('renders the close button by default', async () => {
      const { root } = await render(<mud-modal title-text="x"></mud-modal>);
      expect(queryCloseButton(root)).toBeTruthy();
    });

    it('omits the close button when `closable=false`', async () => {
      const { root } = await render(<mud-modal title-text="x" closable={false}></mud-modal>);
      expect(queryCloseButton(root)).toBeNull();
    });

    it('uses the close-label prop as the close button accessible name', async () => {
      const { root } = await render(<mud-modal title-text="x" close-label="Închide dialogul"></mud-modal>);
      expect(queryCloseButton(root)?.getAttribute('aria-label')).toBe('Închide dialogul');
    });

    it('defaults the close button accessible name to the Romanian "Închide"', async () => {
      const { root } = await render(<mud-modal title-text="x"></mud-modal>);
      expect(queryCloseButton(root)?.getAttribute('aria-label')).toBe('Închide');
    });

    it('renders a header section in default variant', async () => {
      const { root } = await render(<mud-modal title-text="x"></mud-modal>);
      expect(queryHeader(root)).toBeTruthy();
    });

    it('renders a footer container reserved for the actions slot', async () => {
      const { root } = await render(<mud-modal title-text="x"></mud-modal>);
      const footer = queryFooter(root);
      expect(footer).toBeTruthy();
      expect(footer?.querySelector('slot[name="actions"]')).toBeTruthy();
    });
  });

  describe('variant axis', () => {
    it('default variant exposes a standard header bar', async () => {
      const { root } = await render(<mud-modal variant="default" title-text="x"></mud-modal>);
      const header = root?.shadowRoot?.querySelector('.header');
      expect(header).toBeTruthy();
      expect(header?.classList.contains('header-image')).toBe(false);
    });

    it('with-image variant renders the image header container', async () => {
      const { root } = await render(<mud-modal variant="with-image" title-text="x"></mud-modal>);
      const headerImage = root?.shadowRoot?.querySelector('.header.header-image');
      expect(headerImage).toBeTruthy();
      expect(headerImage?.querySelector('slot[name="image"]')).toBeTruthy();
    });

    it('with-icon variant skips the top header bar and exposes the icon slot in the body', async () => {
      const { root } = await render(<mud-modal variant="with-icon" title-text="x"></mud-modal>);
      const topBar = root?.shadowRoot?.querySelector('.header:not(.header-image):not(.header-icon-close)');
      expect(topBar).toBeNull();
      const icon = root?.shadowRoot?.querySelector('.icon slot[name="icon"]');
      expect(icon).toBeTruthy();
    });

    it('with-icon variant hides the floating close affordance when closable=false', async () => {
      const { root } = await render(<mud-modal variant="with-icon" title-text="x" closable={false}></mud-modal>);
      expect(root?.shadowRoot?.querySelector('.header-icon-close')).toBeNull();
    });

    it('with-image variant drops aria-labelledby when no title is provided', async () => {
      const { root } = await render(<mud-modal variant="with-image"></mud-modal>);
      const dialog = queryDialog(root);
      expect(dialog?.getAttribute('aria-labelledby')).toBeNull();
    });
  });

  describe('host class state', () => {
    it('adds is-destructive class when destructive is set', async () => {
      const { root } = await render(<mud-modal destructive title-text="x"></mud-modal>);
      expect(root?.classList.contains('is-destructive')).toBe(true);
    });

    it('adds is-closable class by default', async () => {
      const { root } = await render(<mud-modal title-text="x"></mud-modal>);
      expect(root?.classList.contains('is-closable')).toBe(true);
    });

    it('drops is-closable when closable=false', async () => {
      const { root } = await render(<mud-modal title-text="x" closable={false}></mud-modal>);
      expect(root?.classList.contains('is-closable')).toBe(false);
    });

    it('adds has-title class when titleText is provided', async () => {
      const { root } = await render(<mud-modal title-text="Confirm"></mud-modal>);
      expect(root?.classList.contains('has-title')).toBe(true);
    });
  });

  describe('open/close lifecycle', () => {
    it('reflects open attribute when the prop is set', async () => {
      const { root } = await render(<mud-modal open title-text="x"></mud-modal>);
      await flush();
      expect(root?.hasAttribute('open')).toBe(true);
    });

    it('drops the open attribute after dismiss()', async () => {
      const { root } = await render(<mud-modal open title-text="x"></mud-modal>);
      await flush();
      const closeBtn = queryCloseButton(root)!;
      closeBtn.click();
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);
    });

    it('opens via the imperative openModal() method', async () => {
      const { root } = await render(<mud-modal title-text="x"></mud-modal>);
      await (root as unknown as { openModal: () => Promise<void> }).openModal();
      await flush();
      expect(root?.hasAttribute('open')).toBe(true);
    });

    it('closes via the imperative closeModal() method with default reason', async () => {
      const events: ModalCloseEvent[] = [];
      const { root } = await render(
        <mud-modal
          open
          title-text="x"
          onMudClose={(e: CustomEvent<ModalCloseEvent>) => events.push(e.detail)}
        ></mud-modal>,
      );
      await flush();
      await (root as unknown as { closeModal: (r?: ModalCloseReason) => Promise<void> }).closeModal();
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ reason: 'action' });
    });

    it('closeModal() accepts a custom dismiss reason', async () => {
      const events: ModalCloseEvent[] = [];
      const { root } = await render(
        <mud-modal
          open
          title-text="x"
          onMudClose={(e: CustomEvent<ModalCloseEvent>) => events.push(e.detail)}
        ></mud-modal>,
      );
      await flush();
      await (root as unknown as { closeModal: (r?: ModalCloseReason) => Promise<void> }).closeModal('escape');
      await flush();
      expect(events[0]).toEqual({ reason: 'escape' });
    });

    it('closeModal() is a no-op when already closed', async () => {
      const events: ModalCloseEvent[] = [];
      const { root } = await render(
        <mud-modal title-text="x" onMudClose={(e: CustomEvent<ModalCloseEvent>) => events.push(e.detail)}></mud-modal>,
      );
      await flush();
      await (root as unknown as { closeModal: () => Promise<void> }).closeModal();
      await flush();
      expect(events).toHaveLength(0);
    });
  });

  describe('event emissions', () => {
    it('emits mudOpen when the dialog becomes visible', async () => {
      const onOpen = vi.fn();
      const { root } = await render(<mud-modal title-text="x" onMudOpen={onOpen}></mud-modal>);
      await (root as unknown as { openModal: () => Promise<void> }).openModal();
      await flush();
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('emits mudClose with reason="close-button" when the × is clicked', async () => {
      const onClose = vi.fn();
      const { root } = await render(<mud-modal open title-text="x" onMudClose={onClose}></mud-modal>);
      await flush();
      const closeBtn = queryCloseButton(root)!;
      closeBtn.click();
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onClose.mock.calls[0][0].detail).toEqual({ reason: 'close-button' });
    });

    it('emits mudClose with reason="close-button" when Enter is pressed on the ×', async () => {
      const onClose = vi.fn();
      const { root } = await render(<mud-modal open title-text="x" onMudClose={onClose}></mud-modal>);
      await flush();
      pressKeyOnClose(root, 'Enter');
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onClose.mock.calls[0][0].detail).toEqual({ reason: 'close-button' });
    });

    it('emits mudClose with reason="close-button" when Space is pressed on the ×', async () => {
      const onClose = vi.fn();
      const { root } = await render(<mud-modal open title-text="x" onMudClose={onClose}></mud-modal>);
      await flush();
      pressKeyOnClose(root, ' ');
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onClose.mock.calls[0][0].detail).toEqual({ reason: 'close-button' });
    });

    it('ignores irrelevant keys on the × button', async () => {
      const onClose = vi.fn();
      const { root } = await render(<mud-modal open title-text="x" onMudClose={onClose}></mud-modal>);
      await flush();
      pressKeyOnClose(root, 'a');
      await flush();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('emits mudClose with reason="escape" when the dialog cancel event fires and closeOnEscape=true', async () => {
      const onClose = vi.fn();
      const { root } = await render(<mud-modal open title-text="x" onMudClose={onClose}></mud-modal>);
      await flush();
      const cancelEvent = fireCancel(root);
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onClose.mock.calls[0][0].detail).toEqual({ reason: 'escape' });
      expect(cancelEvent.defaultPrevented).toBe(true);
    });

    it('suppresses ESC dismissal when closeOnEscape=false', async () => {
      const onClose = vi.fn();
      const { root } = await render(<mud-modal open title-text="x" onMudClose={onClose}></mud-modal>);
      // Set via property instead of attribute — Stencil mock-doc attribute
      // coercion treats the string "false" as truthy.
      (root as unknown as { closeOnEscape: boolean }).closeOnEscape = false;
      await flush();
      const cancelEvent = fireCancel(root);
      await flush();
      expect(onClose).not.toHaveBeenCalled();
      expect(cancelEvent.defaultPrevented).toBe(true);
    });
  });

  describe('closeOnBackdrop behavior', () => {
    it('emits mudClose with reason="backdrop" when the dialog itself is clicked outside the surface', async () => {
      const onClose = vi.fn();
      const { root } = await render(<mud-modal open title-text="x" onMudClose={onClose}></mud-modal>);
      await flush();
      const dialog = queryDialog(root)!;
      // Force a deterministic rect for the dialog so we can synthesize a click
      // outside it. mock-doc returns zeros for getBoundingClientRect by default.
      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 200,
        left: 100,
        right: 200,
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        toJSON: () => ({}),
      } as DOMRect);
      fireBackdropClick(root, dialog, 0, 0);
      await flush();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onClose.mock.calls[0][0].detail).toEqual({ reason: 'backdrop' });
    });

    it('does NOT dismiss when the click lands inside the dialog rect', async () => {
      const onClose = vi.fn();
      const { root } = await render(<mud-modal open title-text="x" onMudClose={onClose}></mud-modal>);
      await flush();
      const dialog = queryDialog(root)!;
      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        bottom: 200,
        left: 0,
        right: 200,
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        toJSON: () => ({}),
      } as DOMRect);
      fireBackdropClick(root, dialog, 100, 100);
      await flush();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('suppresses backdrop dismissal when closeOnBackdrop=false', async () => {
      const onClose = vi.fn();
      const { root } = await render(<mud-modal open title-text="x" onMudClose={onClose}></mud-modal>);
      // Set via property — attribute coercion treats "false" string as truthy.
      (root as unknown as { closeOnBackdrop: boolean }).closeOnBackdrop = false;
      await flush();
      const dialog = queryDialog(root)!;
      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 200,
        left: 100,
        right: 200,
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        toJSON: () => ({}),
      } as DOMRect);
      fireBackdropClick(root, dialog, 0, 0);
      await flush();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does NOT dismiss when the click target is a descendant of the dialog (e.g. body content)', async () => {
      const onClose = vi.fn();
      const { root } = await render(
        <mud-modal open title-text="x" onMudClose={onClose}>
          Inside content
        </mud-modal>,
      );
      await flush();
      const surface = querySurface(root)!;
      fireBackdropClick(root, surface, 100, 100);
      await flush();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('open prop watcher', () => {
    it('does not re-emit when open is set to its current value', async () => {
      const onOpen = vi.fn();
      const { root } = await render(<mud-modal title-text="x" onMudOpen={onOpen}></mud-modal>);
      (root as unknown as { open: boolean }).open = false;
      await flush();
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('emits mudOpen exactly once per true transition', async () => {
      const onOpen = vi.fn();
      const { root } = await render(<mud-modal title-text="x" onMudOpen={onOpen}></mud-modal>);
      (root as unknown as { open: boolean }).open = true;
      await flush();
      (root as unknown as { open: boolean }).open = true;
      await flush();
      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('aria-label fallback', () => {
    it('forwards the consumer aria-label onto the internal <dialog>', async () => {
      const { root } = await render(<mud-modal aria-label="Confirmare plată"></mud-modal>);
      // Stripped from the host on connect (avoids the Stencil attribute observer
      // render-loop) and re-emitted on the dialog where the dialog role lives.
      expect(root?.getAttribute('aria-label')).toBe(null);
      const dialog = root?.shadowRoot?.querySelector('dialog');
      expect(dialog?.getAttribute('aria-label')).toBe('Confirmare plată');
    });

    it('uses aria-labelledby pointing at the title when a title is present', async () => {
      const { root } = await render(<mud-modal title-text="Detalii"></mud-modal>);
      const dialog = root?.shadowRoot?.querySelector('dialog');
      expect(dialog?.getAttribute('aria-labelledby')).toMatch(/^modal-title-\d+$/);
      expect(dialog?.getAttribute('aria-label')).toBe(null);
    });
  });

  describe('coverage guard', () => {
    it('can be constructed via the registered constructor', () => {
      const Ctor = customElements.get('mud-modal') as unknown as (new (registerHost?: boolean) => unknown) | undefined;
      expect(Ctor).toBeTruthy();
      const instance = new Ctor!(false);
      expect(instance).toBeTruthy();
    });
  });
});
