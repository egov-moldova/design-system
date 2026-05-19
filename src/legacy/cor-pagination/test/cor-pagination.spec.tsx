import type { SpecPage } from '@stencil/core/testing';
import { newSpecPage } from '@stencil/core/testing';

import { CorPagination } from '../cor-pagination';
import { CorPaginationItem } from '../../cor-pagination-item/cor-pagination-item';
import { PaginationStyle } from '../cor-pagination.enums';

describe('cor-pagination', () => {
  const getPaginationItems = (page: SpecPage): CorPaginationItem[] =>
    Array.from(page.root?.shadowRoot?.querySelectorAll('cor-pagination-item') ?? []).map(
      item => item as unknown as CorPaginationItem,
    );

  const getNumberItems = (page: SpecPage): CorPaginationItem[] =>
    getPaginationItems(page).filter(item => item.itemType === 'number');

  it('renders with default props', async () => {
    const page = await newSpecPage({
      components: [CorPagination, CorPaginationItem],
      html: `<cor-pagination></cor-pagination>`,
    });

    expect(page.root).toBeTruthy();
    expect(page.root?.shadowRoot?.querySelector('nav')).toBeTruthy();
  });

  it('normalizes invalid currentPage, totalPages, and shown values for style 1', async () => {
    const page = await newSpecPage({
      components: [CorPagination, CorPaginationItem],
      html: `<cor-pagination current-page="0" total-pages="0" shown="0"></cor-pagination>`,
    });

    const numberItems = getNumberItems(page);
    const selectedItem = numberItems.find(item => item.selected);

    expect(numberItems).toHaveLength(1);
    expect(numberItems[0].page).toBe(1);
    expect(selectedItem?.page).toBe(1);
  });

  it('clamps currentPage to totalPages when currentPage is too large', async () => {
    const page = await newSpecPage({
      components: [CorPagination, CorPaginationItem],
      html: `<cor-pagination current-page="99" total-pages="5" shown="4"></cor-pagination>`,
    });

    const items = getPaginationItems(page);
    const numberItems = getNumberItems(page);
    const selectedItem = numberItems.find(item => item.selected);
    const nextButton = items[items.length - 1] as unknown as HTMLElement;

    expect(selectedItem?.page).toBe(5);
    expect(nextButton.getAttribute('disabled')).not.toBeNull();
  });

  it('renders a sliding window for style 2 using normalized values', async () => {
    const page = await newSpecPage({
      components: [CorPagination, CorPaginationItem],
      html: `<cor-pagination pagination-style="${PaginationStyle.STYLE_2}" current-page="-3" total-pages="6" shown="0"></cor-pagination>`,
    });

    const numberItems = getNumberItems(page);
    const pages = numberItems.map(item => item.page);
    const selectedItem = numberItems.find(item => item.selected);

    expect(pages).toEqual([1, 2]);
    expect(selectedItem?.page).toBe(1);
  });

  it('emits corPageChange with a clamped page when an out-of-range page item is clicked', async () => {
    const page = await newSpecPage({
      components: [CorPagination, CorPaginationItem],
      html: `<cor-pagination current-page="1" total-pages="5" shown="4"></cor-pagination>`,
    });

    const eventSpy = jest.fn();
    page.root?.addEventListener('corPageChange', eventSpy);

    const targetItem = getNumberItems(page)[0] as unknown as HTMLElement;
    targetItem.dispatchEvent(
      new CustomEvent('corItemClick', {
        bubbles: true,
        composed: true,
        detail: { page: 99 },
      }),
    );
    await page.waitForChanges();

    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy.mock.calls[0][0].detail).toEqual({ page: 5 });
    expect(page.root?.currentPage).toBe(1);
  });

  it('moves to the previous page from a normalized currentPage', async () => {
    const page = await newSpecPage({
      components: [CorPagination, CorPaginationItem],
      html: `<cor-pagination current-page="9" total-pages="5" shown="4"></cor-pagination>`,
    });

    const eventSpy = jest.fn();
    page.root?.addEventListener('corPageChange', eventSpy);

    const prevButton = getPaginationItems(page)[0] as unknown as HTMLElement;
    prevButton?.dispatchEvent(
      new CustomEvent('corItemClick', {
        bubbles: true,
        composed: true,
        detail: { page: 0 },
      }),
    );
    await page.waitForChanges();

    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy.mock.calls[0][0].detail).toEqual({ page: 4 });
    expect(page.root?.currentPage).toBe(9);
  });
});
