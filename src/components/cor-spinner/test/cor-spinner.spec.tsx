import { newSpecPage } from '@stencil/core/testing';
import { CorSpinner } from '../cor-spinner';
import { SpinnerSize } from '../cor-spinner.enums';

describe('cor-spinner', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [CorSpinner],
      html: `<cor-spinner></cor-spinner>`,
    });

    expect(page.root?.getAttribute('role')).toBe('status');
    expect(page.root?.getAttribute('aria-label')).toBe('Loading');
    expect(page.root?.getAttribute('aria-live')).toBe('polite');
    expect(page.root?.getAttribute('size')).toBe(SpinnerSize.XLG);
    expect(page.root?.shadowRoot?.querySelector('.spinner-container')).toBeTruthy();
  });

  it('renders with custom label', async () => {
    const page = await newSpecPage({
      components: [CorSpinner],
      html: `<cor-spinner label="Custom loading text"></cor-spinner>`,
    });

    expect(page.root?.getAttribute('role')).toBe('status');
    expect(page.root?.getAttribute('aria-label')).toBe('Custom loading text');
    expect(page.root?.getAttribute('aria-live')).toBe('polite');
    expect(page.root?.getAttribute('label')).toBe('Custom loading text');
    expect(page.root?.shadowRoot?.querySelector('.spinner-container')).toBeTruthy();
  });

  it('renders with different sizes', async () => {
    const sizes = Object.values(SpinnerSize);

    for (const size of sizes) {
      const page = await newSpecPage({
        components: [CorSpinner],
        html: `<cor-spinner size="${size}"></cor-spinner>`,
      });

      expect(page.root).toBeTruthy();
      expect(page.root?.getAttribute('size')).toBe(size);
    }
  });

  it('has correct accessibility attributes', async () => {
    const page = await newSpecPage({
      components: [CorSpinner],
      html: `<cor-spinner></cor-spinner>`,
    });

    const spinner = page.root;
    expect(spinner?.getAttribute('role')).toBe('status');
    expect(spinner?.getAttribute('aria-label')).toBe('Loading');
    expect(spinner?.getAttribute('aria-live')).toBe('polite');

    // Query shadow DOM for the container
    const shadowRoot = spinner?.shadowRoot;
    const container = shadowRoot?.querySelector('.spinner-container');
    expect(container?.getAttribute('aria-hidden')).toBe('true');
  });
});
