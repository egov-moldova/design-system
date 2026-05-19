import { render, h, describe, it, expect } from '@stencil/vitest';

// stencilVitestPlugin compiles the source on import and appends a
// customElements.define(...) call — this side-effect import is what
// registers the element before `render()` is called.
import '../cor-spinner';

import type { SpinnerSize, SpinnerVariant } from '../cor-spinner.types';

const SIZES: SpinnerSize[] = ['xs', 'sm', 'md', 'lg'];
const VARIANTS: SpinnerVariant[] = ['brand', 'dark', 'light', 'light-on-color'];

describe('cor-spinner', () => {
  it('renders with default props', async () => {
    const { root } = await render(<cor-spinner />);

    expect(root?.getAttribute('role')).toBe('status');
    expect(root?.getAttribute('aria-label')).toBe('Loading');
    expect(root?.getAttribute('aria-live')).toBe('polite');
    expect(root?.getAttribute('size')).toBe('md');
    expect(root?.getAttribute('variant')).toBe('brand');
  });

  it('reflects a custom label to aria-label', async () => {
    const { root } = await render(<cor-spinner label="Fetching data" />);

    expect(root?.getAttribute('aria-label')).toBe('Fetching data');
  });

  it.each(SIZES)('reflects size="%s" to the host attribute', async size => {
    const { root } = await render(<cor-spinner size={size} />);

    expect(root?.getAttribute('size')).toBe(size);
  });

  it.each(VARIANTS)('reflects variant="%s" to the host attribute', async variant => {
    const { root } = await render(<cor-spinner variant={variant} />);

    expect(root?.getAttribute('variant')).toBe(variant);
  });

  it('renders an aria-hidden arc layer in shadow DOM', async () => {
    const { root } = await render(<cor-spinner />);

    const arc = root?.shadowRoot?.querySelector('.arc');
    expect(arc).toBeTruthy();
    expect(arc?.getAttribute('aria-hidden')).toBe('true');
  });

  // Note: axe runs against Stencil's mock-doc Element fail the axe-core
  // `instanceof Node` check (mock-doc nodes aren't instances of real Node).
  // Visual axe verification happens in Storybook (a11y addon) and in pre-PR
  // /audit-accessibility runs against the live browser. The structural assertion
  // below covers the static-DOM contract.
  it('exposes the WCAG-required status-role contract', async () => {
    const { root } = await render(<cor-spinner label="Saving" />);

    expect(root?.getAttribute('role')).toBe('status');
    expect(root?.getAttribute('aria-live')).toBe('polite');
    expect(root?.getAttribute('aria-label')).toBe('Saving');

    const arc = root?.shadowRoot?.querySelector('.arc');
    expect(arc?.getAttribute('aria-hidden')).toBe('true');
  });

  // `stencilVitestPlugin` injects a constructor guard into every compiled
  // Stencil component: `if (registerHost !== false) { this.__registerHost(); }`.
  // The standard `render(...)` path always hits the "true" branch (no arg).
  // Instantiating via the registered constructor with `registerHost = false`
  // exercises the "else" branch so coverage reports 100% instead of 50%.
  // We pull the constructor off the custom-element registry because the
  // plugin doesn't re-export the class as a named export.
  it('constructs without registering a host when registerHost=false', () => {
    const Ctor = customElements.get('cor-spinner') as unknown as new (registerHost: boolean) => unknown;
    expect(Ctor).toBeTruthy();
    const instance = new Ctor(false);
    expect(instance).toBeTruthy();
  });
});
