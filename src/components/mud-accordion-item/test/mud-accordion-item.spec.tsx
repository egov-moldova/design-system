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

    const wrapper = root!.querySelector('#wrapper')!;

    // While disabled: the write lands on the elements the consumer handed to the
    // slot, and on nothing below them. The wrapper is directly assigned, so it
    // is written to as well — a narrowing to "form-control-like tags only" must
    // fail here rather than pass silently.
    expect(ours.hasAttribute('disabled')).toBe(true);
    expect(authored.hasAttribute('disabled')).toBe(true);
    expect(wrapper.hasAttribute('disabled')).toBe(true);
    expect(nested.hasAttribute('disabled')).toBe(false);

    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();

    // The transition issue #17 broke. `ours` goes back because the component
    // recorded writing it; `authored` stays because it never entered that record.
    expect(ours.hasAttribute('disabled')).toBe(false);
    expect(wrapper.hasAttribute('disabled')).toBe(false);
    expect(authored.hasAttribute('disabled')).toBe(true);
    expect(nested.hasAttribute('disabled')).toBe(false);

    // A SECOND cycle. A ledger built once at connect-time rather than per
    // toggle would pass the first cycle and fail here.
    (root as HTMLElement).setAttribute('disabled', '');
    await waitForChanges();
    expect(ours.hasAttribute('disabled')).toBe(true);
    expect(authored.hasAttribute('disabled')).toBe(true);
    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();
    expect(ours.hasAttribute('disabled')).toBe(false);
    expect(authored.hasAttribute('disabled')).toBe(true);
  });

  it('writes `disabled` only on the control slot, never on the text slots', async () => {
    const { root } = await render(
      <mud-accordion-item disabled>
        <h3 slot="heading" id="head">
          Shipping
        </h3>
        <span slot="supporting" id="sup">
          Unavailable
        </span>
        <button slot="trailing" id="ctl">
          Track
        </button>
      </mud-accordion-item>,
    );
    // `disabled` on an <h3> or a <span> is invalid HTML and buys nothing; those
    // two slots are documented for text and are greyed by inherited colour.
    expect(root!.querySelector('#head')!.hasAttribute('disabled')).toBe(false);
    expect(root!.querySelector('#sup')!.hasAttribute('disabled')).toBe(false);
    expect(root!.querySelector('#ctl')!.hasAttribute('disabled')).toBe(true);

    // Keyboard reach is closed on all three regardless, which is why narrowing
    // the attribute leaves nothing operable.
    expect(root!.querySelector('#head')!.getAttribute('tabindex')).toBe('-1');
    expect(root!.querySelector('#sup')!.getAttribute('tabindex')).toBe('-1');
    expect(root!.querySelector('#ctl')!.getAttribute('tabindex')).toBe('-1');
  });

  it('suppresses and restores `tabindex` on slotted content (WCAG 4.1.2)', async () => {
    const { root, waitForChanges } = await render(
      <mud-accordion-item heading="Payment" disabled>
        <a slot="trailing" id="link" href="#go">
          Details
        </a>
        <button slot="trailing" id="focusable" tabindex="0">
          Track
        </button>
      </mud-accordion-item>,
    );
    const link = root!.querySelector('#link')!;
    const focusable = root!.querySelector('#focusable')!;

    // `disabled` does nothing to an <a href>. Without this, the element stays
    // Tab-reachable and Enter-activatable while the accessibility tree reports
    // it disabled — the contradiction WCAG 2.1 SC 4.1.2 forbids.
    expect(link.getAttribute('tabindex')).toBe('-1');
    expect(focusable.getAttribute('tabindex')).toBe('-1');

    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();

    // Restored exactly as authored: absent stays absent, `0` comes back as `0`.
    expect(link.hasAttribute('tabindex')).toBe(false);
    expect(focusable.getAttribute('tabindex')).toBe('0');
  });

  it('does not claim a control whose `disabled` is a property, not an attribute', async () => {
    const { root, waitForChanges } = await render(
      <mud-accordion-item heading="Payment">
        <button slot="trailing" id="prop">
          Track
        </button>
      </mud-accordion-item>,
    );
    const el = root!.querySelector('#prop')!;
    // A non-reflecting custom element is the real case — React 19 sets unknown
    // props on custom elements as properties. A native button with the accessor
    // shadowed is the reachable stand-in.
    el.removeAttribute('disabled');
    Object.defineProperty(el, 'disabled', { value: true, configurable: true });

    (root as HTMLElement).setAttribute('disabled', '');
    await waitForChanges();

    // Asserted MID-CYCLE, and that is the whole point: the guard's entire effect
    // is that it declines to WRITE. Checking `el.disabled` after a full cycle
    // passes either way, because the shadowed accessor never reads the attribute
    // — verified by deleting the guard and watching that version stay green.
    expect(el.hasAttribute('disabled')).toBe(false);

    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();
    expect((el as { disabled?: unknown }).disabled).toBe(true);
  });

  it('re-suppresses a `tabindex` written by anyone else during the disabled window', async () => {
    const { root, waitForChanges } = await render(
      <mud-accordion-item heading="Payment" disabled>
        <button slot="trailing" id="ctl">
          Track
        </button>
      </mud-accordion-item>,
    );
    const ctl = root!.querySelector('#ctl')!;
    expect(ctl.getAttribute('tabindex')).toBe('-1');

    // A framework re-render, a roving-tabindex component, the consumer's own
    // code. The `disabled` mirror re-asserts because it reads the live
    // attribute; the `tabindex` mirror has to do the same or the element is
    // Tab-reachable under a header the accessibility tree reports disabled.
    ctl.setAttribute('tabindex', '0');
    root!.shadowRoot!.querySelector('slot[name="trailing"]')!.dispatchEvent(new Event('slotchange'));
    await waitForChanges();
    expect(ctl.getAttribute('tabindex')).toBe('-1');

    // Restoration is still verbatim — what was authored when we first claimed
    // it, not what anyone wrote since. That residual is documented.
    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();
    expect(ctl.hasAttribute('tabindex')).toBe(false);
  });

  it('re-applies its writes when the item is reconnected while disabled', async () => {
    const { root, waitForChanges } = await render(
      <mud-accordion-item heading="Payment" disabled>
        <button slot="trailing" id="ctl">
          Track
        </button>
      </mud-accordion-item>,
    );
    const host = root as HTMLElement;
    const ctl = root!.querySelector('#ctl')!;
    expect(ctl.hasAttribute('disabled')).toBe(true);

    // `disconnectedCallback` hands everything back — correct, the writes live in
    // DOM that outlives the instance. The risk is the return trip: Stencil does
    // not re-run `componentDidLoad` on a second connect, and `disabled` never
    // changed, so nothing else would re-apply them.
    const parent = host.parentNode!;
    parent.removeChild(host);
    await waitForChanges();
    expect(ctl.hasAttribute('disabled')).toBe(false);
    expect(ctl.hasAttribute('tabindex')).toBe(false);

    parent.appendChild(host);
    await waitForChanges();
    expect(ctl.hasAttribute('disabled')).toBe(true);
    expect(ctl.getAttribute('tabindex')).toBe('-1');
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

  it('does not claim a control slotted in already disabled while the item is disabled', async () => {
    const { root, waitForChanges } = await render(<mud-accordion-item heading="Payment" disabled></mud-accordion-item>);
    const late = document.createElement('button');
    late.setAttribute('slot', 'trailing');
    late.setAttribute('disabled', '');
    root!.appendChild(late);
    root!.shadowRoot!.querySelector('slot[name="trailing"]')!.dispatchEvent(new Event('slotchange'));
    await waitForChanges();

    (root as HTMLElement).removeAttribute('disabled');
    await waitForChanges();
    // It arrived carrying the consumer's own value, so it never entered the
    // ledger and must survive the re-enable — issue #17 on the append path.
    expect(late.hasAttribute('disabled')).toBe(true);
  });
});
