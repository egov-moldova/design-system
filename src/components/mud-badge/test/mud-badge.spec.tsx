import { render, h, describe, it, expect } from '@stencil/vitest';

// Side-effect import: stencilVitestPlugin appends a customElements.define call
// so the element is registered before render().
import '../mud-badge';

import type { BadgeSize, BadgeType, BadgeVariant } from '../mud-badge.types';

const TYPES: BadgeType[] = ['numbered', 'dot'];
const VARIANTS: BadgeVariant[] = ['default', 'brand', 'positive', 'warning', 'danger'];
const SIZES: BadgeSize[] = ['sm', 'md'];

describe('mud-badge', () => {
  it('renders with default props', async () => {
    const { root } = await render(<mud-badge />);

    expect(root?.getAttribute('role')).toBe('status');
    expect(root?.getAttribute('aria-live')).toBe('polite');
    expect(root?.getAttribute('type')).toBe('numbered');
    expect(root?.getAttribute('variant')).toBe('danger');
    expect(root?.getAttribute('size')).toBe('md');
  });

  it.each(TYPES)('reflects type="%s" to the host attribute', async type => {
    const { root } = await render(<mud-badge type={type} />);
    expect(root?.getAttribute('type')).toBe(type);
  });

  it.each(VARIANTS)('reflects variant="%s" to the host attribute', async variant => {
    const { root } = await render(<mud-badge variant={variant} />);
    expect(root?.getAttribute('variant')).toBe(variant);
  });

  it.each(SIZES)('reflects size="%s" to the host attribute', async size => {
    const { root } = await render(<mud-badge size={size} />);
    expect(root?.getAttribute('size')).toBe(size);
  });

  it('renders the visible count text inside an aria-hidden span', async () => {
    const { root } = await render(<mud-badge count={3} />);

    const span = root?.shadowRoot?.querySelector('.badge-count');
    expect(span).toBeTruthy();
    expect(span?.textContent).toBe('3');
    expect(span?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders zero count when count=0', async () => {
    const { root } = await render(<mud-badge count={0} />);

    expect(root?.shadowRoot?.querySelector('.badge-count')?.textContent).toBe('0');
  });

  it('clamps count above max to "{max}+" using the default max=99', async () => {
    const { root } = await render(<mud-badge count={250} />);
    expect(root?.shadowRoot?.querySelector('.badge-count')?.textContent).toBe('99+');
  });

  it('clamps count above a custom max', async () => {
    const { root } = await render(<mud-badge count={15} max={9} />);
    expect(root?.shadowRoot?.querySelector('.badge-count')?.textContent).toBe('9+');
  });

  it('renders an empty count span when count is undefined for numbered type', async () => {
    const { root } = await render(<mud-badge type="numbered" />);
    const span = root?.shadowRoot?.querySelector('.badge-count');
    expect(span).toBeTruthy();
    expect(span?.textContent).toBe('');
  });

  it('does not render the count span for dot type', async () => {
    const { root } = await render(<mud-badge type="dot" count={5} />);
    expect(root?.shadowRoot?.querySelector('.badge-count')).toBeFalsy();
  });

  it('uses the visible count as the accessible name when no ariaLabel is set', async () => {
    const { root } = await render(<mud-badge count={3} />);
    expect(root?.getAttribute('aria-label')).toBe('3');
  });

  it('falls back to "Notification" for dot type with no ariaLabel', async () => {
    const { root } = await render(<mud-badge type="dot" />);
    expect(root?.getAttribute('aria-label')).toBe('Notification');
  });

  it('falls back to "Notification" for numbered type with no count and no ariaLabel', async () => {
    const { root } = await render(<mud-badge type="numbered" />);
    expect(root?.getAttribute('aria-label')).toBe('Notification');
  });

  it('honors a custom ariaLabel override', async () => {
    const { root } = await render(<mud-badge count={5} ariaLabel="5 unread messages" />);
    expect(root?.getAttribute('aria-label')).toBe('5 unread messages');
  });

  it('exposes the WCAG-required live-status contract', async () => {
    const { root } = await render(<mud-badge count={1} ariaLabel="1 notification" />);

    expect(root?.getAttribute('role')).toBe('status');
    expect(root?.getAttribute('aria-live')).toBe('polite');
    expect(root?.getAttribute('aria-label')).toBe('1 notification');
    expect(root?.shadowRoot?.querySelector('.badge-count')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('treats NaN count as empty (does not crash)', async () => {
    const { root } = await render(<mud-badge count={Number.NaN} />);
    expect(root?.shadowRoot?.querySelector('.badge-count')?.textContent).toBe('');
  });

  // Coverage guard — exercises the stencilVitestPlugin-injected constructor
  // branch (`if (registerHost !== false) { ... }`). Without this, coverage
  // for the compiled constructor branches caps at 50%.
  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-badge') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
