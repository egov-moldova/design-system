/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { PaginationPageSizeSize } from './cor-pagination-page-size.enums';

/**
 * Helper: Attach event listeners to element after render
 * Avoids inline scripts and __bound hacks
 */
const attachEventListeners = (elementId: string, eventName: string, callback: (detail: any) => void) => {
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (el) {
      el.addEventListener(eventName, ((e: CustomEvent) => callback(e.detail)) as EventListener);
    }
  }, 0);
};

const DEFAULT_PAGE_SIZES = [9, 12, 24, 36, 48];

type PaginationPageSizeStoryArgs = {
  disabled: boolean;
  pageSize: number;
  pageSizes: number[];
  size: PaginationPageSizeSize;
  totalItems?: number;
};

const renderPaginationPageSize = (args: PaginationPageSizeStoryArgs) => {
  const disabled = args.disabled ? 'disabled' : '';
  const totalItems = args.totalItems !== undefined ? `total-items="${args.totalItems}"` : '';
  const pageSizesAttr = `page-sizes="${args.pageSizes.join(',')}"`;

  // Ensure pageSize is always a valid value from pageSizes array
  const validPageSize = args.pageSizes.includes(args.pageSize) ? args.pageSize : args.pageSizes[0];

  return /*html*/ `
    <cor-pagination-page-size
      size="${args.size}"
      page-size="${validPageSize}"
      ${pageSizesAttr}
      ${totalItems}
      ${disabled}
    ></cor-pagination-page-size>
  `;
};

const meta: Meta<PaginationPageSizeStoryArgs> = {
  title: 'Molecules/Pagination Page Size',
  component: 'cor-pagination-page-size',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: Object.values(PaginationPageSizeSize), description: 'Component size' },
    pageSize: {
      control: 'select',
      options: DEFAULT_PAGE_SIZES,
      description: 'Currently selected page size (must be from pageSizes array)',
    },
    pageSizes: {
      control: 'object',
      description: 'Available page size options',
    },
    totalItems: { control: 'number', description: 'Total number of items (optional)' },
    disabled: { control: 'boolean', description: 'Disables the selector' },
  },
  render: renderPaginationPageSize,
  parameters: {
    actions: { handles: ['corPageSizeChange'] },
  },
};
export default meta;

type PaginationPageSizeStory = StoryObj<PaginationPageSizeStoryArgs>;

export const Default: PaginationPageSizeStory = {
  args: {
    size: PaginationPageSizeSize.LG,
    pageSize: 12,
    pageSizes: DEFAULT_PAGE_SIZES,
    totalItems: 100,
    disabled: false,
  },
};

export const NoTotal: PaginationPageSizeStory = {
  args: {
    size: PaginationPageSizeSize.LG,
    pageSize: 12,
    pageSizes: DEFAULT_PAGE_SIZES,
    disabled: false,
  },
};

export const Disabled: PaginationPageSizeStory = {
  args: {
    size: PaginationPageSizeSize.LG,
    pageSize: 12,
    pageSizes: DEFAULT_PAGE_SIZES,
    totalItems: 100,
    disabled: true,
  },
};

export const EventLogging: PaginationPageSizeStory = {
  args: {
    size: PaginationPageSizeSize.LG,
    pageSize: 12,
    pageSizes: DEFAULT_PAGE_SIZES,
    totalItems: 100,
    disabled: false,
  },
  render: (args: PaginationPageSizeStoryArgs) => {
    // Ensure pageSize is always a valid value from pageSizes array
    const validPageSize = args.pageSizes.includes(args.pageSize) ? args.pageSize : args.pageSizes[0];
    const elementId = 'pagination-page-size-demo';
    const logContentId = 'page-size-log-content';

    // Attach event listener after render
    attachEventListeners(elementId, 'corPageSizeChange', detail => {
      const paginationPageSize = document.getElementById(elementId);
      const logContent = document.getElementById(logContentId);
      if (paginationPageSize && logContent) {
        const ts = new Date().toLocaleTimeString();
        const currentValue = paginationPageSize.getAttribute('page-size') || detail.pageSize;
        logContent.innerHTML = `[${ts}] Page Size Change: event.pageSize=${detail.pageSize}, component.pageSize=${currentValue}<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <cor-pagination-page-size
        id="${elementId}"
        size="${args.size}"
        page-size="${validPageSize}"
        page-sizes="${args.pageSizes.join(',')}"
        ${args.totalItems !== undefined ? `total-items="${args.totalItems}"` : ''}
        ${args.disabled ? 'disabled' : ''}
      ></cor-pagination-page-size>

      <div id="page-size-log" style="padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 320px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
        <div id="${logContentId}">Change page size to see events...</div>
      </div>
    </div>
  `;
  },
};

export const AllSizes: PaginationPageSizeStory = {
  argTypes: {
    size: {
      control: false,
    },
  },
  args: {
    pageSize: 12,
    pageSizes: DEFAULT_PAGE_SIZES,
    totalItems: 100,
    disabled: false,
    size: PaginationPageSizeSize.LG,
  },
  render: (args: PaginationPageSizeStoryArgs) => {
    // Ensure pageSize is always a valid value from pageSizes array
    const validPageSize = args.pageSizes.includes(args.pageSize) ? args.pageSize : args.pageSizes[0];

    return /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center;">
      <div style="font-weight: 600;">Size</div>
      <div style="font-weight: 600;">Component</div>

      <div>lg</div>
      <cor-pagination-page-size
        size="lg"
        page-size="${validPageSize}"
        page-sizes="${args.pageSizes.join(',')}"
        ${args.totalItems ? `total-items="${args.totalItems}"` : ''}
        ${args.disabled ? 'disabled' : ''}
      ></cor-pagination-page-size>

      <div>md</div>
      <cor-pagination-page-size
        size="md"
        page-size="${validPageSize}"
        page-sizes="${args.pageSizes.join(',')}"
        ${args.totalItems ? `total-items="${args.totalItems}"` : ''}
        ${args.disabled ? 'disabled' : ''}
      ></cor-pagination-page-size>

      <div>sm</div>
      <cor-pagination-page-size
        size="sm"
        page-size="${validPageSize}"
        page-sizes="${args.pageSizes.join(',')}"
        ${args.totalItems ? `total-items="${args.totalItems}"` : ''}
        ${args.disabled ? 'disabled' : ''}
      ></cor-pagination-page-size>
    </div>
  `;
  },
};
