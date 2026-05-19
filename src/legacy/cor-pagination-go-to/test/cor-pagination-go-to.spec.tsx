import { newSpecPage } from '@stencil/core/testing';
import { CorPaginationGoTo } from '../cor-pagination-go-to';

describe('cor-pagination-go-to', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorPaginationGoTo],
      html: `<cor-pagination-go-to></cor-pagination-go-to>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('renders the Go to page label, cor-input, and cor-button', async () => {
    const page = await newSpecPage({
      components: [CorPaginationGoTo],
      html: `<cor-pagination-go-to></cor-pagination-go-to>`,
    });
    const typography = page.root?.shadowRoot?.querySelector('cor-typography');
    const input = page.root?.shadowRoot?.querySelector('cor-input');
    const button = page.root?.shadowRoot?.querySelector('cor-button');

    expect(typography?.textContent?.trim()).toBe('Go to page');
    expect(input).toBeTruthy();
    expect(button).toBeTruthy();
  });

  it('renders cor-input with page value', async () => {
    const page = await newSpecPage({
      components: [CorPaginationGoTo],
      html: `<cor-pagination-go-to page="5"></cor-pagination-go-to>`,
    });
    const input = page.root?.shadowRoot?.querySelector('cor-input');

    expect(input?.getAttribute('value')).toBe('5');
  });

  it('emits corGoToPage when Go button is clicked with different page', async () => {
    const page = await newSpecPage({
      components: [CorPaginationGoTo],
      html: `<cor-pagination-go-to page="3"></cor-pagination-go-to>`,
    });
    const eventSpy = jest.fn();
    page.root?.addEventListener('corGoToPage', eventSpy);

    // Change the input value first, then click Go
    page.rootInstance.inputValue = 5;
    await page.waitForChanges();

    const goButton = page.root?.shadowRoot?.querySelector('button');
    goButton?.click();
    await page.waitForChanges();

    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy.mock.calls[0][0].detail).toEqual({ page: 5 });
  });

  it('updates inputValue on corInput event and emits updated page on Go click', async () => {
    const page = await newSpecPage({
      components: [CorPaginationGoTo],
      html: `<cor-pagination-go-to page="1"></cor-pagination-go-to>`,
    });
    const eventSpy = jest.fn();
    page.root?.addEventListener('corGoToPage', eventSpy);

    const input = page.root?.shadowRoot?.querySelector('cor-input');
    input?.dispatchEvent(
      new CustomEvent('corInput', {
        bubbles: true,
        composed: true,
        detail: '7',
      }),
    );
    await page.waitForChanges();

    const goButton = page.root?.shadowRoot?.querySelector('button');
    goButton?.click();
    await page.waitForChanges();

    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy.mock.calls[0][0].detail).toEqual({ page: 7 });
  });

  it('reflects size attribute', async () => {
    const page = await newSpecPage({
      components: [CorPaginationGoTo],
      html: `<cor-pagination-go-to size="sm"></cor-pagination-go-to>`,
    });
    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  it('reflects disabled attribute', async () => {
    const page = await newSpecPage({
      components: [CorPaginationGoTo],
      html: `<cor-pagination-go-to disabled></cor-pagination-go-to>`,
    });
    await page.waitForChanges();
    expect(page.root?.getAttribute('disabled')).not.toBeNull();
  });

  it('uses body-sm typography variant for sm size', async () => {
    const page = await newSpecPage({
      components: [CorPaginationGoTo],
      html: `<cor-pagination-go-to size="sm"></cor-pagination-go-to>`,
    });
    const typography = page.root?.shadowRoot?.querySelector('cor-typography');
    expect(typography?.getAttribute('variant')).toBe('body-sm');
  });

  it('uses body-md typography variant for lg size', async () => {
    const page = await newSpecPage({
      components: [CorPaginationGoTo],
      html: `<cor-pagination-go-to size="lg"></cor-pagination-go-to>`,
    });
    const typography = page.root?.shadowRoot?.querySelector('cor-typography');
    expect(typography?.getAttribute('variant')).toBe('body-md');
  });
});
