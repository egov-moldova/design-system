import { newSpecPage } from '@stencil/core/testing';
import { CorPaginationPageSize } from '../cor-pagination-page-size';

describe('cor-pagination-page-size', () => {
  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorPaginationPageSize],
      html: `<cor-pagination-page-size></cor-pagination-page-size>`,
    });
    expect(page.root).toBeTruthy();
  });

  it('renders the show label and cor-select', async () => {
    const page = await newSpecPage({
      components: [CorPaginationPageSize],
      html: `<cor-pagination-page-size></cor-pagination-page-size>`,
    });
    const typography = page.root?.shadowRoot?.querySelector('cor-typography');
    const select = page.root?.shadowRoot?.querySelector('cor-select');

    expect(typography?.textContent?.trim()).toBe('Show');
    expect(select).toBeTruthy();
  });

  it('renders cor-select-item elements from pageSizes', async () => {
    const page = await newSpecPage({
      components: [CorPaginationPageSize],
      html: `<cor-pagination-page-size page-sizes="9,12,24"></cor-pagination-page-size>`,
    });
    await page.waitForChanges();

    const select = page.root?.shadowRoot?.querySelector('cor-select');
    const items = select?.querySelectorAll('cor-select-item');

    expect(select).toBeTruthy();
    expect(items?.length).toBe(3);
    expect(items?.[0].getAttribute('value')).toBe('9');
    expect(items?.[0].getAttribute('variant')).toBe('label-only');
  });

  it('renders suffix when totalItems is provided', async () => {
    const page = await newSpecPage({
      components: [CorPaginationPageSize],
      html: `<cor-pagination-page-size total-items="100"></cor-pagination-page-size>`,
    });
    const suffix = page.root?.shadowRoot?.querySelector('.suffix');

    expect(suffix).toBeTruthy();
    expect(suffix?.textContent?.replace(/\s+/g, '').trim()).toContain('/100');
  });

  it('does not render suffix when totalItems is not provided', async () => {
    const page = await newSpecPage({
      components: [CorPaginationPageSize],
      html: `<cor-pagination-page-size></cor-pagination-page-size>`,
    });
    const suffix = page.root?.shadowRoot?.querySelector('.suffix');

    expect(suffix).toBeNull();
  });

  it('emits corPageSizeChange and updates pageSize when cor-select changes', async () => {
    const page = await newSpecPage({
      components: [CorPaginationPageSize],
      html: `<cor-pagination-page-size page-size="12" page-sizes="9,12,24"></cor-pagination-page-size>`,
    });
    const eventSpy = jest.fn();
    page.root?.addEventListener('corPageSizeChange', eventSpy);

    const select = page.root?.shadowRoot?.querySelector('cor-select');
    select?.dispatchEvent(
      new CustomEvent('corChange', {
        bubbles: true,
        composed: true,
        detail: { value: '9' },
      }),
    );
    await page.waitForChanges();

    expect(page.rootInstance.pageSize).toBe(9);
    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy.mock.calls[0][0].detail).toEqual({ pageSize: 9 });
  });

  it('reflects size attribute', async () => {
    const page = await newSpecPage({
      components: [CorPaginationPageSize],
      html: `<cor-pagination-page-size size="sm"></cor-pagination-page-size>`,
    });
    expect(page.root?.getAttribute('size')).toBe('sm');
  });

  it('reflects disabled attribute', async () => {
    const page = await newSpecPage({
      components: [CorPaginationPageSize],
      html: `<cor-pagination-page-size disabled></cor-pagination-page-size>`,
    });
    await page.waitForChanges();
    expect(page.root?.getAttribute('disabled')).not.toBeNull();
  });
});
