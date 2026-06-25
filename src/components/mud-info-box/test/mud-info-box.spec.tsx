import { render, h, describe, it, expect } from '@stencil/vitest';

import '../mud-info-box';
import { INFO_BOX_DEFAULT_ICONS, INFO_BOX_VARIANTS, INFO_BOX_EMPHASES } from '../mud-info-box.types';

describe('mud-info-box', () => {
  it('renders with default props (variant=info, emphasis=subtle)', async () => {
    const { root, waitForChanges } = await render(<mud-info-box>Body</mud-info-box>);
    await waitForChanges();
    expect(root?.getAttribute('variant')).toBe('info');
    expect(root?.getAttribute('emphasis')).toBe('subtle');
    expect(root?.shadowRoot?.querySelector('.body')).toBeTruthy();
    expect(root?.shadowRoot?.querySelector('.icon')).toBeTruthy();
  });

  it.each(INFO_BOX_VARIANTS)('reflects variant="%s" to the host attribute', async variant => {
    const { root } = await render(<mud-info-box variant={variant}>Body</mud-info-box>);
    expect(root?.getAttribute('variant')).toBe(variant);
  });

  it.each(INFO_BOX_EMPHASES)('reflects emphasis="%s" to the host attribute', async emphasis => {
    const { root } = await render(<mud-info-box emphasis={emphasis}>Body</mud-info-box>);
    expect(root?.getAttribute('emphasis')).toBe(emphasis);
  });

  it('renders the default per-variant icon', async () => {
    for (const variant of INFO_BOX_VARIANTS) {
      const { root, waitForChanges } = await render(<mud-info-box variant={variant}>Body</mud-info-box>);
      await waitForChanges();
      const icon = root?.shadowRoot?.querySelector('.icon mud-icon');
      expect(icon?.getAttribute('name')).toBe(INFO_BOX_DEFAULT_ICONS[variant]);
    }
  });

  it('info and info-moderate share the circle-info glyph (colour differs via tokens)', async () => {
    const { root: a, waitForChanges: wa } = await render(<mud-info-box variant="info">B</mud-info-box>);
    const { root: b, waitForChanges: wb } = await render(<mud-info-box variant="info-moderate">B</mud-info-box>);
    await wa();
    await wb();
    expect(a?.shadowRoot?.querySelector('.icon mud-icon')?.getAttribute('name')).toBe('circle-info-filled');
    expect(b?.shadowRoot?.querySelector('.icon mud-icon')?.getAttribute('name')).toBe('circle-info-filled');
  });

  it('honors the iconName override', async () => {
    const { root, waitForChanges } = await render(<mud-info-box icon-name="sparkles-filled">Body</mud-info-box>);
    await waitForChanges();
    expect(root?.shadowRoot?.querySelector('.icon mud-icon')?.getAttribute('name')).toBe('sparkles-filled');
  });

  it('suppresses the icon when hide-icon is set', async () => {
    const { root, waitForChanges } = await render(<mud-info-box hide-icon>Body</mud-info-box>);
    await waitForChanges();
    expect(root?.hasAttribute('hide-icon')).toBe(true);
    expect(root?.shadowRoot?.querySelector('.icon')).toBeNull();
  });

  it('renders the heading when title-text is provided', async () => {
    const { root, waitForChanges } = await render(<mud-info-box title-text="Heading here">Body</mud-info-box>);
    await waitForChanges();
    const title = root?.shadowRoot?.querySelector('.title');
    expect(title).toBeTruthy();
    expect(title?.textContent).toBe('Heading here');
    expect(root?.classList.contains('has-title')).toBe(true);
  });

  it('omits the heading when title-text is absent', async () => {
    const { root, waitForChanges } = await render(<mud-info-box>Body</mud-info-box>);
    await waitForChanges();
    expect(root?.shadowRoot?.querySelector('.title')).toBeNull();
    expect(root?.classList.contains('has-title')).toBe(false);
  });

  it('is NOT an ARIA live region (static in-flow content)', async () => {
    const { root, waitForChanges } = await render(<mud-info-box variant="error">Body</mud-info-box>);
    await waitForChanges();
    expect(root?.hasAttribute('aria-live')).toBe(false);
    expect(root?.getAttribute('role')).toBeFalsy();
  });

  it('marks the leading icon decorative (aria-hidden)', async () => {
    const { root, waitForChanges } = await render(<mud-info-box>Body</mud-info-box>);
    await waitForChanges();
    expect(root?.shadowRoot?.querySelector('.icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the close button only when closable', async () => {
    const { root: a, waitForChanges: wa } = await render(<mud-info-box>Body</mud-info-box>);
    const { root: b, waitForChanges: wb } = await render(<mud-info-box closable>Body</mud-info-box>);
    await wa();
    await wb();
    expect(a?.shadowRoot?.querySelector('.close')).toBeNull();
    expect(b?.shadowRoot?.querySelector('.close')).toBeTruthy();
  });

  it('forwards close-label to the close button aria-label (default "Închide")', async () => {
    const { root, waitForChanges } = await render(<mud-info-box closable>Body</mud-info-box>);
    await waitForChanges();
    expect(root?.shadowRoot?.querySelector('.close')?.getAttribute('aria-label')).toBe('Închide');
  });

  it('emits mudClose when the close button is clicked', async () => {
    const { root, waitForChanges, spyOnEvent } = await render(<mud-info-box closable>Body</mud-info-box>);
    await waitForChanges();
    const close = spyOnEvent('mudClose');
    (root?.shadowRoot?.querySelector('.close') as HTMLButtonElement).click();
    await waitForChanges();
    expect(close).toHaveReceivedEventTimes(1);
  });

  // Mock-doc does not propagate keyboard events to JSX-bound onKeyDown handlers,
  // so invoke the instance handler directly (same approach as the mud-icon spec).
  type KeyInstance = { handleCloseKeyDown: (ev: KeyboardEvent) => void };
  const getKeyHandler = (root: Element): ((ev: KeyboardEvent) => void) => {
    const instance = root as unknown as KeyInstance;
    return instance.handleCloseKeyDown.bind(instance);
  };

  it('emits mudClose on Enter and Space keydown', async () => {
    const { root, waitForChanges, spyOnEvent } = await render(<mud-info-box closable>Body</mud-info-box>);
    await waitForChanges();
    const close = spyOnEvent('mudClose');
    const handler = getKeyHandler(root!);
    handler(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    handler(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    await waitForChanges();
    expect(close).toHaveReceivedEventTimes(2);
  });

  it('does not emit mudClose for other keys', async () => {
    const { root, waitForChanges, spyOnEvent } = await render(<mud-info-box closable>Body</mud-info-box>);
    await waitForChanges();
    const close = spyOnEvent('mudClose');
    getKeyHandler(root!)(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    await waitForChanges();
    expect(close).toHaveReceivedEventTimes(0);
  });

  it('renders slotted body content', async () => {
    const { root, waitForChanges } = await render(<mud-info-box>Important inline message</mud-info-box>);
    await waitForChanges();
    expect(root?.textContent).toContain('Important inline message');
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-info-box') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
