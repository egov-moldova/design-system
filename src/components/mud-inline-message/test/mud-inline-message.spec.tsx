import { render, h, describe, it, expect } from '@stencil/vitest';

import '../mud-inline-message';
import {
  INLINE_MESSAGE_DEFAULT_ICONS,
  INLINE_MESSAGE_VARIANTS,
  INLINE_MESSAGE_SIZES,
} from '../mud-inline-message.types';

describe('mud-inline-message', () => {
  it('renders with default props (variant=info, size=medium)', async () => {
    const { root, waitForChanges } = await render(<mud-inline-message>Message</mud-inline-message>);
    await waitForChanges();
    expect(root?.getAttribute('variant')).toBe('info');
    expect(root?.getAttribute('size')).toBe('medium');
    expect(root?.shadowRoot?.querySelector('.text')).toBeTruthy();
    expect(root?.shadowRoot?.querySelector('.icon')).toBeTruthy();
  });

  it.each(INLINE_MESSAGE_VARIANTS)('reflects variant="%s" to the host attribute', async variant => {
    const { root } = await render(<mud-inline-message variant={variant}>M</mud-inline-message>);
    expect(root?.getAttribute('variant')).toBe(variant);
  });

  it.each(INLINE_MESSAGE_SIZES)('reflects size="%s" to the host attribute', async size => {
    const { root } = await render(<mud-inline-message size={size}>M</mud-inline-message>);
    expect(root?.getAttribute('size')).toBe(size);
  });

  it('renders the default per-variant icon', async () => {
    for (const variant of INLINE_MESSAGE_VARIANTS) {
      const { root, waitForChanges } = await render(<mud-inline-message variant={variant}>M</mud-inline-message>);
      await waitForChanges();
      const icon = root?.shadowRoot?.querySelector('.icon mud-icon');
      expect(icon?.getAttribute('name')).toBe(INLINE_MESSAGE_DEFAULT_ICONS[variant]);
    }
  });

  it('passes a 16px icon for small and 20px for medium', async () => {
    const { root: sm, waitForChanges: wsm } = await render(<mud-inline-message size="small">M</mud-inline-message>);
    const { root: md, waitForChanges: wmd } = await render(<mud-inline-message size="medium">M</mud-inline-message>);
    await wsm();
    await wmd();
    expect(sm?.shadowRoot?.querySelector('.icon mud-icon')?.getAttribute('size')).toBe('16');
    expect(md?.shadowRoot?.querySelector('.icon mud-icon')?.getAttribute('size')).toBe('20');
  });

  it('honors the iconName override', async () => {
    const { root, waitForChanges } = await render(
      <mud-inline-message icon-name="sparkles-filled">M</mud-inline-message>,
    );
    await waitForChanges();
    expect(root?.shadowRoot?.querySelector('.icon mud-icon')?.getAttribute('name')).toBe('sparkles-filled');
  });

  it('suppresses the icon when hide-icon is set (icon-none)', async () => {
    const { root, waitForChanges } = await render(<mud-inline-message hide-icon>M</mud-inline-message>);
    await waitForChanges();
    expect(root?.hasAttribute('hide-icon')).toBe(true);
    expect(root?.shadowRoot?.querySelector('.icon')).toBeNull();
  });

  it('marks the leading icon decorative (aria-hidden)', async () => {
    const { root, waitForChanges } = await render(<mud-inline-message>M</mud-inline-message>);
    await waitForChanges();
    expect(root?.shadowRoot?.querySelector('.icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('is NOT an ARIA live region (plain in-flow text)', async () => {
    const { root, waitForChanges } = await render(<mud-inline-message variant="error">M</mud-inline-message>);
    await waitForChanges();
    expect(root?.hasAttribute('aria-live')).toBe(false);
    expect(root?.getAttribute('role')).toBeFalsy();
  });

  it('renders slotted text content', async () => {
    const { root, waitForChanges } = await render(
      <mud-inline-message>Error message displayed here</mud-inline-message>,
    );
    await waitForChanges();
    expect(root?.textContent).toContain('Error message displayed here');
  });

  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-inline-message') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
