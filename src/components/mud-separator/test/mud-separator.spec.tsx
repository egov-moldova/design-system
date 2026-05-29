import { render, h, describe, it, expect } from '@stencil/vitest';

// stencilVitestPlugin compiles the source on import and appends a
// customElements.define(...) call — this side-effect import is what
// registers the element before `render()` is called.
import '../mud-separator';

import type { SeparatorOrientation, SeparatorSize, SeparatorVariant } from '../mud-separator.types';

const ORIENTATIONS: SeparatorOrientation[] = ['horizontal', 'vertical'];
const SIZES: SeparatorSize[] = ['extra-thin', 'thin', 'medium', 'thick'];
const VARIANTS: SeparatorVariant[] = ['subtle', 'mild', 'strong'];

describe('mud-separator', () => {
  it('renders with default props and the WCAG separator role', async () => {
    const { root } = await render(<mud-separator />);

    expect(root?.getAttribute('role')).toBe('separator');
    expect(root?.getAttribute('orientation')).toBe('horizontal');
    expect(root?.getAttribute('size')).toBe('thin');
    expect(root?.getAttribute('variant')).toBe('subtle');
    // Horizontal is the implicit ARIA default — must NOT be exposed.
    expect(root?.hasAttribute('aria-orientation')).toBe(false);
  });

  it('renders a hidden line element when no label is provided', async () => {
    const { root } = await render(<mud-separator />);

    const line = root?.shadowRoot?.querySelector('.line');
    expect(line).toBeTruthy();
    expect(line?.getAttribute('aria-hidden')).toBe('true');
    // No layout wrapper when there is no label.
    expect(root?.shadowRoot?.querySelector('.layout')).toBeFalsy();
    expect(root?.shadowRoot?.querySelector('.label')).toBeFalsy();
  });

  it.each(ORIENTATIONS)('reflects orientation="%s" to the host attribute', async orientation => {
    const { root } = await render(<mud-separator orientation={orientation} />);

    expect(root?.getAttribute('orientation')).toBe(orientation);
  });

  it.each(SIZES)('reflects size="%s" to the host attribute', async size => {
    const { root } = await render(<mud-separator size={size} />);

    expect(root?.getAttribute('size')).toBe(size);
  });

  it.each(VARIANTS)('reflects variant="%s" to the host attribute', async variant => {
    const { root } = await render(<mud-separator variant={variant} />);

    expect(root?.getAttribute('variant')).toBe(variant);
  });

  it('reflects the inset prop as a boolean attribute', async () => {
    const { root } = await render(<mud-separator inset />);

    expect(root?.hasAttribute('inset')).toBe(true);
  });

  it('exposes aria-orientation="vertical" when orientation is vertical', async () => {
    const { root } = await render(<mud-separator orientation="vertical" />);

    expect(root?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('renders a labeled layout when label prop is provided', async () => {
    const { root } = await render(<mud-separator label="sau" />);

    const layout = root?.shadowRoot?.querySelector('.layout');
    expect(layout).toBeTruthy();
    // Two flanking lines + the label between them.
    expect(root?.shadowRoot?.querySelectorAll('.line').length).toBe(2);
    const label = root?.shadowRoot?.querySelector('.label');
    expect(label?.textContent).toContain('sau');
  });

  it('applies the has-label class when a label is provided', async () => {
    const { root } = await render(<mud-separator label="sau" />);

    expect(root?.classList.contains('has-label')).toBe(true);
  });

  it('does not apply the has-label class when no label is provided', async () => {
    const { root } = await render(<mud-separator />);

    expect(root?.classList.contains('has-label')).toBe(false);
  });

  it('exposes aria-label when provided', async () => {
    const { root } = await render(<mud-separator aria-label="Section break" />);

    expect(root?.getAttribute('aria-label')).toBe('Section break');
  });

  it('renders without aria-label when not provided', async () => {
    const { root } = await render(<mud-separator />);

    expect(root?.hasAttribute('aria-label')).toBe(false);
  });

  // Coverage of the slot-detection branch: when slotted children exist, the
  // label layout should activate even without the `label` prop.
  it('switches to the labeled layout when default slot has child elements', async () => {
    const { root } = await render(
      <mud-separator>
        <span>icon-content</span>
      </mud-separator>,
    );

    expect(root?.shadowRoot?.querySelector('.layout')).toBeTruthy();
    expect(root?.shadowRoot?.querySelectorAll('.line').length).toBe(2);
    expect(root?.classList.contains('has-label')).toBe(true);
  });

  it('switches to the labeled layout when default slot has non-empty text', async () => {
    const { root } = await render(<mud-separator>continuă</mud-separator>);

    expect(root?.shadowRoot?.querySelector('.layout')).toBeTruthy();
    expect(root?.classList.contains('has-label')).toBe(true);
  });

  it('stays in the plain layout when default slot contains only whitespace', async () => {
    const { root } = await render(<mud-separator>{'   '}</mud-separator>);

    expect(root?.shadowRoot?.querySelector('.layout')).toBeFalsy();
    expect(root?.classList.contains('has-label')).toBe(false);
  });

  // The accessible-name contract is required by the WCAG separator pattern:
  // - role must be `separator`
  // - orientation should be exposed only when non-default (vertical)
  // - decorative inner lines must be hidden from AT
  it('exposes the WCAG-required separator-role contract', async () => {
    const { root } = await render(<mud-separator orientation="vertical" />);

    expect(root?.getAttribute('role')).toBe('separator');
    expect(root?.getAttribute('aria-orientation')).toBe('vertical');
    const line = root?.shadowRoot?.querySelector('.line');
    expect(line?.getAttribute('aria-hidden')).toBe('true');
  });

  // `stencilVitestPlugin` injects a constructor guard into every compiled
  // Stencil component: `if (registerHost !== false) { this.__registerHost(); }`.
  // The standard `render(...)` path always hits the "true" branch. Constructing
  // with `registerHost=false` exercises the "else" branch for full coverage.
  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('mud-separator') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
