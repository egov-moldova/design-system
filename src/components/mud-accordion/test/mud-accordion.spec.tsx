import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-accordion';
import '../mud-accordion-item';

import { ACCORDION_APPEARANCES, ACCORDION_MODES } from '../mud-accordion.types';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('mud-accordion', () => {
  it('renders with default mode and appearance reflected on host', async () => {
    const { root } = await render(
      <mud-accordion>
        <mud-accordion-item heading="A"></mud-accordion-item>
        <mud-accordion-item heading="B"></mud-accordion-item>
      </mud-accordion>,
    );
    expect(root?.getAttribute('mode')).toBe('multiple');
    expect(root?.getAttribute('appearance')).toBe('default');
    expect(root?.getAttribute('role')).toBe('group');
  });

  describe('mode prop', () => {
    it.each(ACCORDION_MODES)('reflects mode="%s" to the host attribute', async mode => {
      const { root } = await render(
        <mud-accordion mode={mode}>
          <mud-accordion-item heading="A"></mud-accordion-item>
        </mud-accordion>,
      );
      expect(root?.getAttribute('mode')).toBe(mode);
    });
  });

  describe('appearance prop', () => {
    it.each(ACCORDION_APPEARANCES)('reflects appearance="%s" and forwards to items', async appearance => {
      const { root } = await render(
        <mud-accordion appearance={appearance}>
          <mud-accordion-item heading="A"></mud-accordion-item>
        </mud-accordion>,
      );
      expect(root?.getAttribute('appearance')).toBe(appearance);
      await flush();
      const item = root?.querySelector('mud-accordion-item');
      expect(item?.getAttribute('appearance')).toBe(appearance);
    });
  });

  describe('label prop', () => {
    it('sets aria-label on the host when label is provided', async () => {
      const { root } = await render(
        <mud-accordion label="Întrebări frecvente">
          <mud-accordion-item heading="A"></mud-accordion-item>
        </mud-accordion>,
      );
      expect(root?.getAttribute('aria-label')).toBe('Întrebări frecvente');
    });

    it('does not set aria-label when label is empty', async () => {
      const { root } = await render(
        <mud-accordion>
          <mud-accordion-item heading="A"></mud-accordion-item>
        </mud-accordion>,
      );
      expect(root?.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('single mode coordination', () => {
    it('collapses siblings when one item opens in single mode', async () => {
      const { root } = await render(
        <mud-accordion mode="single">
          <mud-accordion-item heading="A" open></mud-accordion-item>
          <mud-accordion-item heading="B"></mud-accordion-item>
          <mud-accordion-item heading="C"></mud-accordion-item>
        </mud-accordion>,
      );
      await flush();
      const items = root?.querySelectorAll('mud-accordion-item');
      const second = items?.[1] as HTMLElement | undefined;
      const header = second?.shadowRoot?.querySelector<HTMLButtonElement>('button.header');
      header?.click();
      await flush();
      expect(items?.[0]?.hasAttribute('open')).toBe(false);
      expect(items?.[1]?.hasAttribute('open')).toBe(true);
      expect(items?.[2]?.hasAttribute('open')).toBe(false);
    });

    it('allows independent open state in multiple mode', async () => {
      const { root } = await render(
        <mud-accordion mode="multiple">
          <mud-accordion-item heading="A" open></mud-accordion-item>
          <mud-accordion-item heading="B"></mud-accordion-item>
        </mud-accordion>,
      );
      await flush();
      const items = root?.querySelectorAll('mud-accordion-item');
      const second = items?.[1] as HTMLElement | undefined;
      const header = second?.shadowRoot?.querySelector<HTMLButtonElement>('button.header');
      header?.click();
      await flush();
      expect(items?.[0]?.hasAttribute('open')).toBe(true);
      expect(items?.[1]?.hasAttribute('open')).toBe(true);
    });
  });

  describe('mudChange event', () => {
    it('emits openIds with the active set after a toggle', async () => {
      const handler = vi.fn();
      const { root } = await render(
        <mud-accordion mode="multiple" onMudChange={handler}>
          <mud-accordion-item heading="A" item-id="a"></mud-accordion-item>
          <mud-accordion-item heading="B" item-id="b"></mud-accordion-item>
        </mud-accordion>,
      );
      await flush();
      const items = root?.querySelectorAll('mud-accordion-item');
      const first = items?.[0] as HTMLElement | undefined;
      first?.shadowRoot?.querySelector<HTMLButtonElement>('button.header')?.click();
      await flush();
      expect(handler).toHaveBeenCalled();
      const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0] as CustomEvent<{ openIds: string[] }>;
      expect(lastCall.detail.openIds).toEqual(['a']);
    });
  });

  it('renders declarative items from the `items` prop and ignores the default slot', async () => {
    const items = [
      { id: 'x', heading: 'X', supportingText: 's-x', content: 'cx' },
      { id: 'y', heading: 'Y', open: true, content: 'cy' },
    ];
    const { root } = await render(
      <mud-accordion mode="multiple" items={items}>
        <mud-accordion-item heading="SHOULD_NOT_RENDER"></mud-accordion-item>
      </mud-accordion>,
    );
    await flush();
    // Declarative items render inside the host's shadow root rather than as light children.
    const rendered = root?.shadowRoot?.querySelectorAll('mud-accordion-item');
    expect(rendered?.length).toBe(2);
    expect(rendered?.[0]?.getAttribute('item-id')).toBe('x');
    expect(rendered?.[1]?.getAttribute('item-id')).toBe('y');
    expect(rendered?.[1]?.hasAttribute('open')).toBe(true);
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-accordion') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});

describe('mud-accordion-item', () => {
  it('reflects open and disabled to the host', async () => {
    const { root } = await render(<mud-accordion-item heading="A" open disabled></mud-accordion-item>);
    expect(root?.hasAttribute('open')).toBe(true);
    expect(root?.hasAttribute('disabled')).toBe(true);
  });

  it('renders heading text from the prop when no slot is provided', async () => {
    const { root } = await render(<mud-accordion-item heading="MPay"></mud-accordion-item>);
    const headingEl = root?.shadowRoot?.querySelector('.heading');
    expect((headingEl?.textContent ?? '').trim()).toBe('MPay');
  });

  it('wires aria-expanded, aria-controls, and aria-labelledby correctly', async () => {
    const { root } = await render(<mud-accordion-item heading="A"></mud-accordion-item>);
    const header = root?.shadowRoot?.querySelector('button.header');
    const panel = root?.shadowRoot?.querySelector('.panel');
    expect(header?.getAttribute('aria-expanded')).toBe('false');
    const headerId = header?.getAttribute('id');
    const panelId = panel?.getAttribute('id');
    expect(headerId && panelId).toBeTruthy();
    expect(header?.getAttribute('aria-controls')).toBe(panelId ?? null);
    expect(panel?.getAttribute('aria-labelledby')).toBe(headerId ?? null);
    expect(panel?.getAttribute('role')).toBe('region');
  });

  it('toggles open on header click', async () => {
    const { root } = await render(<mud-accordion-item heading="A"></mud-accordion-item>);
    const header = root?.shadowRoot?.querySelector<HTMLButtonElement>('button.header');
    expect(root?.hasAttribute('open')).toBe(false);
    header?.click();
    await flush();
    expect(root?.hasAttribute('open')).toBe(true);
    expect(header?.getAttribute('aria-expanded')).toBe('true');
    header?.click();
    await flush();
    expect(root?.hasAttribute('open')).toBe(false);
  });

  it('does not toggle when disabled', async () => {
    const { root } = await render(<mud-accordion-item heading="A" disabled></mud-accordion-item>);
    const header = root?.shadowRoot?.querySelector<HTMLButtonElement>('button.header');
    header?.click();
    await flush();
    expect(root?.hasAttribute('open')).toBe(false);
    expect(header?.getAttribute('aria-disabled')).toBe('true');
  });

  it('emits mudToggle when the user activates the header', async () => {
    const handler = vi.fn();
    const { root } = await render(
      <mud-accordion-item heading="A" item-id="abc" onMudToggle={handler}></mud-accordion-item>,
    );
    const header = root?.shadowRoot?.querySelector<HTMLButtonElement>('button.header');
    header?.click();
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
    const ev = handler.mock.calls[0][0] as CustomEvent<{ open: boolean; itemId: string }>;
    expect(ev.detail.open).toBe(true);
    expect(ev.detail.itemId).toBe('abc');
  });

  it('emits arrow key intent for parent traversal', async () => {
    type Instance = { handleKeyDown: (ev: KeyboardEvent) => void };
    const handler = vi.fn();
    const { root } = await render(<mud-accordion-item heading="A" item-id="k"></mud-accordion-item>);
    root?.addEventListener('mudAccordionItemKey', handler);
    const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true });
    (root as unknown as Instance).handleKeyDown.call(root, ev);
    await flush();
    expect(handler).toHaveBeenCalled();
    const customEv = handler.mock.calls[0][0] as CustomEvent<{ key: string; itemId: string }>;
    expect(customEv.detail.key).toBe('ArrowDown');
    expect(customEv.detail.itemId).toBe('k');
  });

  it('auto-collapses when transitioned to disabled while open', async () => {
    const { root } = await render(<mud-accordion-item heading="A" open></mud-accordion-item>);
    expect(root?.hasAttribute('open')).toBe(true);
    (root as HTMLElement).setAttribute('disabled', '');
    await flush();
    expect(root?.hasAttribute('open')).toBe(false);
  });

  it('generates a stable item id when none is provided', async () => {
    const { root } = await render(<mud-accordion-item heading="A"></mud-accordion-item>);
    const id = root?.getAttribute('item-id');
    expect(id).toBeTruthy();
    expect(id?.startsWith('mud-accordion-item-')).toBe(true);
  });

  it('exposes setOpen() and focusHeader() as async methods', async () => {
    const { root } = await render(<mud-accordion-item heading="A"></mud-accordion-item>);
    const el = root as HTMLMudAccordionItemElement;
    await el.setOpen(true);
    await flush();
    expect(el.hasAttribute('open')).toBe(true);
    await el.setOpen(false);
    await flush();
    expect(el.hasAttribute('open')).toBe(false);
    await el.focusHeader();
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-accordion-item') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
