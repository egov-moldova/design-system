import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../cor-tooltip';

import { TOOLTIP_POSITIONS, TOOLTIP_SIZES, TOOLTIP_VARIANTS } from '../cor-tooltip.types';

const queryBubble = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.bubble') ?? null) as HTMLElement | null;

const queryArrow = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.arrow') ?? null) as HTMLElement | null;

const queryCloseButton = (root: Element | null | undefined): HTMLButtonElement | null =>
  (root?.shadowRoot?.querySelector('button.close') ?? null) as HTMLButtonElement | null;

const queryTriggerWrapper = (root: Element | null | undefined): HTMLElement | null =>
  (root?.shadowRoot?.querySelector('.trigger') ?? null) as HTMLElement | null;

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('cor-tooltip', () => {
  describe('defaults', () => {
    it('renders with default props reflected on the host', async () => {
      const { root } = await render(
        <cor-tooltip>
          <button slot="trigger" type="button">
            Detalii suplimentare
          </button>
          Ajutor: introdu codul de 13 cifre.
        </cor-tooltip>,
      );

      expect(root?.getAttribute('size')).toBe('sm');
      // Default placement is 'top' (with flipFallback on) to match legacy behavior.
      expect(root?.getAttribute('position')).toBe('top');
      expect(root?.getAttribute('variant')).toBe('default');
      expect(root?.hasAttribute('open')).toBe(false);
    });

    it('renders the bubble inside shadow DOM with role="tooltip"', async () => {
      const { root } = await render(
        <cor-tooltip>
          <button slot="trigger" type="button">
            Trigger
          </button>
          Body
        </cor-tooltip>,
      );

      const bubble = queryBubble(root);
      expect(bubble).toBeTruthy();
      expect(bubble?.getAttribute('role')).toBe('tooltip');
      expect(bubble?.getAttribute('aria-hidden')).toBe('true');
      expect(bubble?.id.startsWith('cor-tooltip-')).toBe(true);
    });

    it('renders an arrow inside the bubble', async () => {
      const { root } = await render(
        <cor-tooltip>
          <button slot="trigger" type="button">
            Trigger
          </button>
          Body
        </cor-tooltip>,
      );
      expect(queryArrow(root)).toBeTruthy();
    });

    it('does not render the close button on the default variant', async () => {
      const { root } = await render(
        <cor-tooltip>
          <button slot="trigger" type="button">
            Trigger
          </button>
          Body
        </cor-tooltip>,
      );
      expect(queryCloseButton(root)).toBeNull();
    });
  });

  describe('size prop', () => {
    it.each(TOOLTIP_SIZES)('reflects size="%s" on the host attribute', async size => {
      const { root } = await render(
        <cor-tooltip size={size}>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      expect(root?.getAttribute('size')).toBe(size);
    });
  });

  describe('position prop', () => {
    it.each(TOOLTIP_POSITIONS)('reflects position="%s" on the host attribute', async position => {
      const { root } = await render(
        <cor-tooltip position={position}>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      expect(root?.getAttribute('position')).toBe(position);
    });

    it('resolves auto position to a concrete placement class', async () => {
      const { root } = await render(
        <cor-tooltip position="auto" open>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      await flush();
      // Even when overflow detection runs in JSDOM with 0 width, the class is applied.
      const hasPositionClass = ['position-top', 'position-bottom', 'position-left', 'position-right'].some(c =>
        root?.classList.contains(c),
      );
      expect(hasPositionClass).toBe(true);
    });
  });

  describe('variant prop', () => {
    it.each(TOOLTIP_VARIANTS)('reflects variant="%s" on the host attribute', async variant => {
      const { root } = await render(
        <cor-tooltip variant={variant}>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      expect(root?.getAttribute('variant')).toBe(variant);
    });

    it('renders a close button with Romanian aria-label when variant="coach"', async () => {
      const { root } = await render(
        <cor-tooltip variant="coach" open>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      const close = queryCloseButton(root);
      expect(close).toBeTruthy();
      expect(close?.getAttribute('aria-label')).toBe('Închide tooltip-ul');
    });

    it('renders the Romanian Esc hint when variant="coach"', async () => {
      const { root } = await render(
        <cor-tooltip variant="coach" open>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      const hint = root?.shadowRoot?.querySelector('.hint');
      expect(hint?.textContent?.trim()).toBe('Apasă Esc pentru a închide.');
    });
  });

  describe('open prop + ARIA wiring', () => {
    it('mirrors open state on aria-hidden of the bubble', async () => {
      const { root } = await render(
        <cor-tooltip>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );

      expect(queryBubble(root)?.getAttribute('aria-hidden')).toBe('true');

      (root as HTMLElement).setAttribute('open', '');
      await flush();

      expect(queryBubble(root)?.getAttribute('aria-hidden')).toBe('false');
      expect(root?.hasAttribute('open')).toBe(true);
      expect(root?.classList.contains('is-open')).toBe(true);
    });

    it('applies aria-describedby on the slotted trigger when open', async () => {
      const { root } = await render(
        <cor-tooltip open>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      await flush();

      const slotted = root?.querySelector('[slot="trigger"]') as HTMLElement;
      const bubbleId = queryBubble(root)?.id;
      expect(slotted?.getAttribute('aria-describedby')).toBe(bubbleId ?? '');
    });

    it('removes aria-describedby when the tooltip closes', async () => {
      const { root } = await render(
        <cor-tooltip open>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      await flush();

      (root as HTMLElement).removeAttribute('open');
      await flush();

      const slotted = root?.querySelector('[slot="trigger"]') as HTMLElement;
      expect(slotted?.getAttribute('aria-describedby')).toBeNull();
    });
  });

  describe('hover trigger behavior', () => {
    it('opens on mouseenter and closes on mouseleave', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      // Zero delays to keep this assertion synchronous; the delayed flow has its
      // own test below.
      const { root } = await render(
        <cor-tooltip showDelay={0} hideDelay={0} onCorOpen={onOpen} onCorClose={onClose}>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );

      const wrapper = queryTriggerWrapper(root)!;
      wrapper.dispatchEvent(new MouseEvent('mouseenter'));
      await flush();
      expect(root?.hasAttribute('open')).toBe(true);
      expect(onOpen).toHaveBeenCalledTimes(1);

      wrapper.dispatchEvent(new MouseEvent('mouseleave'));
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);
      expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ detail: { reason: 'blur' } }));
    });

    it('respects show-delay before opening', async () => {
      const { root } = await render(
        <cor-tooltip showDelay={40}>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );

      const wrapper = queryTriggerWrapper(root)!;
      wrapper.dispatchEvent(new MouseEvent('mouseenter'));
      // Synchronously: tooltip is still closed because the delay timer is pending.
      expect(root?.hasAttribute('open')).toBe(false);

      await new Promise<void>(resolve => setTimeout(resolve, 80));
      await flush();
      expect(root?.hasAttribute('open')).toBe(true);
    });
  });

  describe('focus trigger behavior', () => {
    it('opens on focusin and closes on focusout', async () => {
      const { root } = await render(
        <cor-tooltip trigger="focus">
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );

      const wrapper = queryTriggerWrapper(root)!;
      wrapper.dispatchEvent(new FocusEvent('focusin'));
      await flush();
      expect(root?.hasAttribute('open')).toBe(true);

      wrapper.dispatchEvent(new FocusEvent('focusout'));
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);
    });
  });

  describe('keyboard contract', () => {
    it('closes on Escape when open', async () => {
      const onClose = vi.fn();
      const { root } = await render(
        <cor-tooltip open onCorClose={onClose}>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      await flush();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await flush();

      expect(root?.hasAttribute('open')).toBe(false);
      expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ detail: { reason: 'escape' } }));
    });

    it('ignores Escape when closed', async () => {
      const onClose = vi.fn();
      const { root } = await render(
        <cor-tooltip onCorClose={onClose}>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('coach variant behavior', () => {
    it('closes via close-button click with reason="close-button"', async () => {
      const onClose = vi.fn();
      const { root } = await render(
        <cor-tooltip variant="coach" open onCorClose={onClose}>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      await flush();

      queryCloseButton(root)!.click();
      await flush();

      expect(root?.hasAttribute('open')).toBe(false);
      expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ detail: { reason: 'close-button' } }));
    });

    it('does NOT close on mouseleave of trigger (coach is persistent)', async () => {
      const { root } = await render(
        <cor-tooltip variant="coach" open>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );
      await flush();

      const wrapper = queryTriggerWrapper(root)!;
      wrapper.dispatchEvent(new MouseEvent('mouseleave'));
      await flush();
      expect(root?.hasAttribute('open')).toBe(true);
    });
  });

  describe('manual trigger', () => {
    it('does not bind hover/focus listeners; visibility follows the prop', async () => {
      const { root } = await render(
        <cor-tooltip trigger="manual">
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );

      const wrapper = queryTriggerWrapper(root)!;
      wrapper.dispatchEvent(new MouseEvent('mouseenter'));
      await flush();
      expect(root?.hasAttribute('open')).toBe(false);

      (root as HTMLElement).setAttribute('open', '');
      await flush();
      expect(queryBubble(root)?.getAttribute('aria-hidden')).toBe('false');
    });
  });

  describe('maxWidth prop', () => {
    it('pushes maxWidth onto the host as `--_bubble-max-width` (CSP-friendly, no inline JSX styles)', async () => {
      const { root } = await render(
        <cor-tooltip maxWidth={320} open>
          <button slot="trigger" type="button">
            T
          </button>
          Body
        </cor-tooltip>,
      );

      // Bubble is never given inline styles; runtime geometry rides the host as CSS vars.
      const bubble = queryBubble(root)!;
      expect(bubble.style.maxWidth).toBe('');
      // Open + componentDidLoad triggers updateGeometry → host style is set.
      // Force an immediate geometry pass for the spec env.
      (root as unknown as { updateGeometry: () => void }).updateGeometry?.();
      expect((root as unknown as HTMLElement).style.getPropertyValue('--_bubble-max-width')).toBe('320px');
    });
  });

  describe('content prop fallback', () => {
    it('renders the content prop when default slot is empty', async () => {
      const { root } = await render(
        <cor-tooltip content="Ajutor: introdu codul">
          <button slot="trigger" type="button">
            T
          </button>
        </cor-tooltip>,
      );

      const bubble = queryBubble(root)!;
      expect(bubble.textContent?.trim()).toContain('Ajutor: introdu codul');
    });
  });
});
