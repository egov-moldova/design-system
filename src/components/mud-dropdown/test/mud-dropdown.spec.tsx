import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-dropdown';
import '../../mud-menu/mud-menu';
import '../../mud-menu/mud-menu-item';

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const fixture = () => (
  <mud-dropdown>
    <button slot="trigger" type="button">
      Acțiuni
    </button>
    <mud-menu type="contextual" aria-label="Acțiuni">
      <mud-menu-item value="view">Vizualizează</mud-menu-item>
      <mud-menu-item value="delete">Șterge</mud-menu-item>
    </mud-menu>
  </mud-dropdown>
);

const parts = (root: Element | null | undefined) => {
  const host = root as HTMLMudDropdownElement;
  return {
    host,
    trigger: host.querySelector('[slot="trigger"]') as HTMLButtonElement,
    menu: host.querySelector('mud-menu') as HTMLMudMenuElement,
  };
};

describe('mud-dropdown', () => {
  it('starts closed: the menu is hidden and the trigger names its popup', async () => {
    const { root } = await render(fixture());
    const { host, trigger, menu } = parts(root);
    expect(host.open).toBe(false);
    expect(menu.open).toBe(false);
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens and closes from the trigger, mirroring the state onto the menu and the trigger', async () => {
    const { root, waitForChanges } = await render(fixture());
    const { host, trigger, menu } = parts(root);
    trigger.click();
    await waitForChanges();
    expect(host.open).toBe(true);
    expect(menu.open).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    trigger.click();
    await waitForChanges();
    expect(host.open).toBe(false);
    expect(menu.open).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on ArrowDown on the trigger', async () => {
    const { root, waitForChanges } = await render(fixture());
    const { host, trigger } = parts(root);
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await waitForChanges();
    expect(host.open).toBe(true);
  });

  it('closes when an item is chosen', async () => {
    const { root, waitForChanges } = await render(fixture());
    const { host, menu } = parts(root);
    host.open = true;
    await waitForChanges();
    menu.dispatchEvent(new CustomEvent('mudSelect', { detail: { value: 'view' }, bubbles: true, composed: true }));
    await waitForChanges();
    expect(host.open).toBe(false);
  });

  it('closes when the menu asks to (Escape)', async () => {
    const { root, waitForChanges } = await render(fixture());
    const { host, menu } = parts(root);
    host.open = true;
    await waitForChanges();
    menu.dispatchEvent(new CustomEvent('mudClose', { bubbles: true, composed: true }));
    await waitForChanges();
    expect(host.open).toBe(false);
  });

  it('closes on a press outside it', async () => {
    const { root, waitForChanges } = await render(fixture());
    const { host } = parts(root);
    host.open = true;
    await waitForChanges();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    await waitForChanges();
    expect(host.open).toBe(false);
    outside.remove();
  });

  it('closes when focus leaves it, but not when a press inside drops focus to the page', async () => {
    const { root, waitForChanges } = await render(fixture());
    const { host, menu } = parts(root);
    host.open = true;
    await waitForChanges();
    host.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    menu.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true, relatedTarget: null }));
    await waitForChanges();
    expect(host.open).toBe(true);
    host.dispatchEvent(new Event('pointerup', { bubbles: true }));
    menu.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true, relatedTarget: null }));
    await waitForChanges();
    expect(host.open).toBe(false);
  });

  it('emits mudToggle on every change', async () => {
    const onToggle = vi.fn();
    const { root, waitForChanges } = await render(fixture());
    const { host } = parts(root);
    host.addEventListener('mudToggle', (ev: Event) => onToggle((ev as CustomEvent<{ open: boolean }>).detail));
    host.open = true;
    await waitForChanges();
    host.open = false;
    await waitForChanges();
    expect(onToggle.mock.calls).toEqual([[{ open: true }], [{ open: false }]]);
  });

  it('reflects align and falls back to start for an unknown value', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { root, waitForChanges } = await render(fixture());
    const { host } = parts(root);
    expect(host.getAttribute('align')).toBe('start');
    (host as unknown as { align: string }).align = 'middle';
    await waitForChanges();
    await flush();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('align="middle"'));
    expect(host.align).toBe('start');
    warn.mockRestore();
  });
});
