import { newSpecPage } from '@stencil/core/testing';

import { CorSpinner } from '../cor-spinner';
import type { SpinnerSize, SpinnerVariant } from '../cor-spinner.types';

const SIZES: SpinnerSize[] = ['xs', 'sm', 'md', 'lg'];
const VARIANTS: SpinnerVariant[] = ['brand', 'dark', 'light', 'light-on-color'];

describe('cor-spinner', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorSpinner],
      html: `<cor-spinner></cor-spinner>`,
    });

    expect(page.root?.getAttribute('role')).toBe('status');
    expect(page.root?.getAttribute('aria-label')).toBe('Loading');
    expect(page.root?.getAttribute('aria-live')).toBe('polite');
    expect(page.root?.getAttribute('size')).toBe('md');
    expect(page.root?.getAttribute('variant')).toBe('brand');
  });

  it('reflects a custom label to aria-label', async () => {
    const page = await newSpecPage({
      components: [CorSpinner],
      html: `<cor-spinner label="Fetching data"></cor-spinner>`,
    });

    expect(page.root?.getAttribute('aria-label')).toBe('Fetching data');
  });

  it.each(SIZES)('reflects size="%s" to the host attribute', async size => {
    const page = await newSpecPage({
      components: [CorSpinner],
      html: `<cor-spinner size="${size}"></cor-spinner>`,
    });

    expect(page.root?.getAttribute('size')).toBe(size);
  });

  it.each(VARIANTS)('reflects variant="%s" to the host attribute', async variant => {
    const page = await newSpecPage({
      components: [CorSpinner],
      html: `<cor-spinner variant="${variant}"></cor-spinner>`,
    });

    expect(page.root?.getAttribute('variant')).toBe(variant);
  });

  it('renders an aria-hidden arc layer in shadow DOM', async () => {
    const page = await newSpecPage({
      components: [CorSpinner],
      html: `<cor-spinner></cor-spinner>`,
    });

    const arc = page.root?.shadowRoot?.querySelector('.arc');
    expect(arc).toBeTruthy();
    expect(arc?.getAttribute('aria-hidden')).toBe('true');
  });

  // Note: jest-axe runs against Stencil's mock-doc Element fail the axe-core
  // `instanceof Node` check (mock-doc nodes aren't instances of real Node).
  // Visual axe verification happens in Storybook (a11y addon) and in pre-PR
  // /audit-accessibility runs against the live browser. The structural assertion
  // below covers the static-DOM contract.
  it('exposes the WCAG-required status-role contract', async () => {
    const page = await newSpecPage({
      components: [CorSpinner],
      html: `<cor-spinner label="Saving"></cor-spinner>`,
    });

    expect(page.root?.getAttribute('role')).toBe('status');
    expect(page.root?.getAttribute('aria-live')).toBe('polite');
    expect(page.root?.getAttribute('aria-label')).toBe('Saving');

    const arc = page.root?.shadowRoot?.querySelector('.arc');
    expect(arc?.getAttribute('aria-hidden')).toBe('true');
  });
});
