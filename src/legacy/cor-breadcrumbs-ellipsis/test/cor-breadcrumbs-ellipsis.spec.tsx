import { newSpecPage } from '@stencil/core/testing';

import { CorBreadcrumbsEllipsis } from '../cor-breadcrumbs-ellipsis';

describe('cor-breadcrumbs-ellipsis', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const btn = page.root?.shadowRoot?.querySelector('.ellipsis-btn');
    expect(btn).not.toBeNull();
  });

  it('reflects disabled attribute', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis disabled></cor-breadcrumbs-ellipsis>`,
    });
    expect(page.root?.getAttribute('disabled')).toBe('');
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    expect(btn?.hasAttribute('disabled')).toBe(true);
  });

  it('dropdown is hidden by default', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const dropdown = page.root?.shadowRoot?.querySelector('.dropdown');
    expect(dropdown).toBeNull();
  });

  it('opens dropdown on button click', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();
    const dropdown = page.root?.shadowRoot?.querySelector('.dropdown');
    expect(dropdown).not.toBeNull();
  });

  it('button has aria-expanded=false by default', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const btn = page.root?.shadowRoot?.querySelector('.ellipsis-btn');
    expect(btn?.getAttribute('aria-expanded')).toBe('false');
  });

  it('button has aria-expanded=true when open', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();
    expect(btn?.getAttribute('aria-expanded')).toBe('true');
  });

  it('does not open when disabled', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis disabled></cor-breadcrumbs-ellipsis>`,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();
    const dropdown = page.root?.shadowRoot?.querySelector('.dropdown');
    expect(dropdown).toBeNull();
  });

  it('host has is-open class when open', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();
    expect(page.root?.classList.contains('is-open')).toBe(true);
  });

  it('emits corEllipsisOpen when opened', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corEllipsisOpen', spy);
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('emits corEllipsisClose when closed', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const spy = jest.fn();
    page.root?.addEventListener('corEllipsisClose', spy);
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');

    // Open
    btn?.click();
    await page.waitForChanges();

    // Close
    btn?.click();
    await page.waitForChanges();

    expect(spy).toHaveBeenCalled();
  });

  it('closes on Escape key', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();

    expect(page.root?.classList.contains('is-open')).toBe(true);

    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await page.waitForChanges();

    expect(page.root?.classList.contains('is-open')).toBe(false);
  });

  it('navigates items with arrow keys', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `
        <cor-breadcrumbs-ellipsis>
          <cor-select-item value="1" label="Item 1"></cor-select-item>
          <cor-select-item value="2" label="Item 2"></cor-select-item>
        </cor-breadcrumbs-ellipsis>
      `,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();

    const items = page.root?.querySelectorAll('cor-select-item');

    // Initially no item is focused (focusedIndex = -1)
    expect(items?.[0].hasAttribute('focused')).toBe(false);
    expect(items?.[1].hasAttribute('focused')).toBe(false);

    // ArrowDown focuses first item
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await page.waitForChanges();
    expect(items?.[0].hasAttribute('focused')).toBe(true);
    expect(items?.[1].hasAttribute('focused')).toBe(false);

    // ArrowDown to second item
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await page.waitForChanges();
    expect(items?.[0].hasAttribute('focused')).toBe(false);
    expect(items?.[1].hasAttribute('focused')).toBe(true);

    // ArrowUp back to first item
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await page.waitForChanges();
    expect(items?.[0].hasAttribute('focused')).toBe(true);
    expect(items?.[1].hasAttribute('focused')).toBe(false);

    // ArrowUp clears focus (back to -1)
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await page.waitForChanges();
    expect(items?.[0].hasAttribute('focused')).toBe(false);
    expect(items?.[1].hasAttribute('focused')).toBe(false);
  });

  it('navigates to first item with Home key', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `
        <cor-breadcrumbs-ellipsis>
          <cor-select-item value="1" label="Item 1"></cor-select-item>
          <cor-select-item value="2" label="Item 2"></cor-select-item>
          <cor-select-item value="3" label="Item 3"></cor-select-item>
        </cor-breadcrumbs-ellipsis>
      `,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();

    // Move to last via ArrowDown x2
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await page.waitForChanges();

    const items = page.root?.querySelectorAll('cor-select-item');
    expect(items?.[2].hasAttribute('focused')).toBe(true);

    // Home moves to first
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    await page.waitForChanges();
    expect(items?.[0].hasAttribute('focused')).toBe(true);
    expect(items?.[2].hasAttribute('focused')).toBe(false);
  });

  it('navigates to last item with End key', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `
        <cor-breadcrumbs-ellipsis>
          <cor-select-item value="1" label="Item 1"></cor-select-item>
          <cor-select-item value="2" label="Item 2"></cor-select-item>
          <cor-select-item value="3" label="Item 3"></cor-select-item>
        </cor-breadcrumbs-ellipsis>
      `,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();

    const items = page.root?.querySelectorAll('cor-select-item');

    // End moves directly to last
    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    await page.waitForChanges();
    expect(items?.[0].hasAttribute('focused')).toBe(false);
    expect(items?.[2].hasAttribute('focused')).toBe(true);
  });

  it('dropdown has no aria-hidden attribute when open', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();

    const dropdown = page.root?.shadowRoot?.querySelector('.dropdown');
    expect(dropdown?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('Tab key closes the dropdown', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();
    expect(page.root?.classList.contains('is-open')).toBe(true);

    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    await page.waitForChanges();
    expect(page.root?.classList.contains('is-open')).toBe(false);
  });

  it('emits corEllipsisClose on Escape', async () => {
    const page = await newSpecPage({
      components: [CorBreadcrumbsEllipsis],
      html: `<cor-breadcrumbs-ellipsis></cor-breadcrumbs-ellipsis>`,
    });
    const closeSpy = jest.fn();
    page.root?.addEventListener('corEllipsisClose', closeSpy);

    const btn = page.root?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
    await page.waitForChanges();

    page.root?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await page.waitForChanges();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
