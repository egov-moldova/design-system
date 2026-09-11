import { render, h, describe, it, expect, vi } from '@stencil/vitest';

import '../mud-accordion-item';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

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
  it('takes back only the `disabled` it wrote (issue #17)', async () => {
    const { root, waitForChanges } = await render(
      <mud-accordion-item heading="Payment" disabled>
        <button slot="trailing" id="authored" disabled>
          Retry
        </button>
        <button slot="trailing" id="ours">
          Track
        </button>
        <div slot="trailing" id="wrapper">
          <button id="nested">Nested</button>
        </div>
      </mud-accordion-item>,
    );
    const authored = root!.querySelector('#authored')!;
    const ours = root!.querySelector('#ours')!;
    const nested = root!.querySelector('#nested')!;

    // While disabled: the write lands on the elements the consumer handed to the
    // slot, and on nothing below them.
    expect(ours.hasAttribute('disabled')).toBe(true);
    expect(authored.hasAttribute('disabled')).toBe(true);
    expect(nested.hasAttribute('disabled')).toBe(false);

    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();

    // The transition issue #17 broke. `ours` goes back because the component
    // recorded writing it; `authored` stays because it never entered that record.
    expect(ours.hasAttribute('disabled')).toBe(false);
    expect(authored.hasAttribute('disabled')).toBe(true);
  });

  it('gives the attribute back to a control unslotted while the item is disabled', async () => {
    const { root, waitForChanges } = await render(
      <mud-accordion-item heading="Payment" disabled>
        <button slot="trailing" id="leaver">
          Track
        </button>
      </mud-accordion-item>,
    );
    const leaver = root!.querySelector('#leaver')!;
    expect(leaver.hasAttribute('disabled')).toBe(true);

    // The consumer moves it out of the header. It is theirs, and it must not
    // leave carrying an attribute this component wrote.
    leaver.remove();
    root!.shadowRoot!.querySelector('slot[name="trailing"]')!.dispatchEvent(new Event('slotchange'));
    await waitForChanges();
    expect(leaver.hasAttribute('disabled')).toBe(false);
  });

  it('disables a control slotted in while the item is already disabled', async () => {
    const { root, waitForChanges } = await render(<mud-accordion-item heading="Payment" disabled></mud-accordion-item>);
    const late = document.createElement('button');
    late.setAttribute('slot', 'trailing');
    root!.appendChild(late);
    // mock-doc does not fire `slotchange` on appendChild the way a browser does,
    // but a dispatched one reaches the JSX-bound handler — measured. Emitting it
    // here tests the wiring; the browser story covers the native firing.
    root!.shadowRoot!.querySelector('slot[name="trailing"]')!.dispatchEvent(new Event('slotchange'));
    await waitForChanges();
    expect(late.hasAttribute('disabled')).toBe(true);

    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();
    expect(late.hasAttribute('disabled')).toBe(false);
  });
});
