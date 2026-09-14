import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-accordion';
import '../../mud-accordion-item/mud-accordion-item';

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
