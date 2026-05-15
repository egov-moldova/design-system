/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { PaginationItemListPosition, PaginationItemSize, PaginationItemType } from './cor-pagination-item.enums';

const renderItem = (args: any) => {
  const selected = args.selected ? 'selected' : '';
  const disabled = args.disabled ? 'disabled' : '';
  const skeleton = args.skeleton ? 'skeleton' : '';

  return /*html*/ `
    <div style="padding: 24px; display: flex; gap: 8px; align-items: center;">
      <cor-pagination-item
        size="${args.size}"
        item-type="${args.itemType}"
        page="${args.page}"
        icon="${args.icon}"
        icon-label="${args.iconLabel}"
        list-position="${args.listPosition}"
        ${selected}
        ${disabled}
        ${skeleton}
      ></cor-pagination-item>
    </div>
  `;
};

const meta: Meta = {
  title: 'Atoms/Pagination Item',
  component: 'cor-pagination-item',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: Object.values(PaginationItemSize), description: 'Item size' },
    itemType: { control: 'select', options: Object.values(PaginationItemType), description: 'Item type' },
    page: { control: 'number', description: 'Page number' },
    icon: { control: 'text', description: 'Carbon icon name (for icon type)' },
    iconLabel: { control: 'text', description: 'Accessible label for icon buttons' },
    selected: { control: 'boolean', description: 'Selected/active page state' },
    disabled: { control: 'boolean', description: 'Disabled state' },
    skeleton: { control: 'boolean', description: 'Skeleton loading state' },
    listPosition: {
      control: 'select',
      options: Object.values(PaginationItemListPosition),
      description: 'Dropdown position for collapsed type',
    },
  },
  render: renderItem,
};
export default meta;

export const NumberItem: StoryObj = {
  args: {
    size: PaginationItemSize.LG,
    itemType: PaginationItemType.NUMBER,
    page: 5,
    icon: '',
    iconLabel: '',
    selected: false,
    disabled: false,
    skeleton: false,
    collapsedPages: [],
    listPosition: PaginationItemListPosition.AUTO,
  },
};

export const SelectedItem: StoryObj = {
  args: {
    size: PaginationItemSize.LG,
    itemType: PaginationItemType.NUMBER,
    page: 5,
    selected: true,
    disabled: false,
    skeleton: false,
    collapsedPages: [],
    listPosition: PaginationItemListPosition.AUTO,
  },
};

export const IconItem: StoryObj = {
  args: {
    size: PaginationItemSize.LG,
    itemType: PaginationItemType.ICON,
    page: 0,
    icon: 'carbon:chevron--right',
    iconLabel: 'Next page',
    selected: false,
    disabled: false,
    skeleton: false,
    collapsedPages: [],
    listPosition: PaginationItemListPosition.AUTO,
  },
};

export const CollapsedItem: StoryObj = {
  render: (args: any) => `
    <div style="padding: 48px; display: flex; justify-content: center;">
      <cor-pagination-item
        id="collapsed-item-story"
        size="${args.size}"
        item-type="collapsed"
        list-position="${args.listPosition}"
        data-collapsed-pages="${(args.collapsedPages ?? []).join(',')}"
      ></cor-pagination-item>
    </div>
  `,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const el = canvasElement.querySelector<HTMLElement & { collapsedPages: number[] }>('#collapsed-item-story');
    if (el) {
      const raw = el.getAttribute('data-collapsed-pages') ?? '';
      el.collapsedPages = raw ? raw.split(',').map(Number) : [];
    }
  },
  args: {
    size: PaginationItemSize.LG,
    itemType: PaginationItemType.COLLAPSED,
    listPosition: PaginationItemListPosition.AUTO,
    page: 0,
    icon: '',
    iconLabel: '',
    selected: false,
    disabled: false,
    skeleton: false,
    collapsedPages: [5, 6, 7, 8, 9],
  },
};

export const AllStates: StoryObj = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: 100px repeat(3, auto); gap: 16px; align-items: center; padding: 24px;">
      <div style="font-weight: 600; font-size: 12px;">State</div>
      <div style="font-weight: 600; font-size: 12px;">lg</div>
      <div style="font-weight: 600; font-size: 12px;">md</div>
      <div style="font-weight: 600; font-size: 12px;">sm</div>

      <div style="font-size: 12px;">Default</div>
      <cor-pagination-item size="lg" item-type="number" page="5"></cor-pagination-item>
      <cor-pagination-item size="md" item-type="number" page="5"></cor-pagination-item>
      <cor-pagination-item size="sm" item-type="number" page="5"></cor-pagination-item>

      <div style="font-size: 12px;">Selected</div>
      <cor-pagination-item size="lg" item-type="number" page="5" selected></cor-pagination-item>
      <cor-pagination-item size="md" item-type="number" page="5" selected></cor-pagination-item>
      <cor-pagination-item size="sm" item-type="number" page="5" selected></cor-pagination-item>

      <div style="font-size: 12px;">Disabled</div>
      <cor-pagination-item size="lg" item-type="number" page="5" disabled></cor-pagination-item>
      <cor-pagination-item size="md" item-type="number" page="5" disabled></cor-pagination-item>
      <cor-pagination-item size="sm" item-type="number" page="5" disabled></cor-pagination-item>

      <div style="font-size: 12px;">Skeleton</div>
      <cor-pagination-item size="lg" item-type="number" page="5" skeleton></cor-pagination-item>
      <cor-pagination-item size="md" item-type="number" page="5" skeleton></cor-pagination-item>
      <cor-pagination-item size="sm" item-type="number" page="5" skeleton></cor-pagination-item>

      <div style="font-size: 12px;">Icon</div>
      <cor-pagination-item size="lg" item-type="icon" icon="carbon:chevron--right" icon-label="Next"></cor-pagination-item>
      <cor-pagination-item size="md" item-type="icon" icon="carbon:chevron--right" icon-label="Next"></cor-pagination-item>
      <cor-pagination-item size="sm" item-type="icon" icon="carbon:chevron--right" icon-label="Next"></cor-pagination-item>

      <div style="font-size: 12px;">Collapsed</div>
      <cor-pagination-item id="all-states-collapsed-lg" size="lg" item-type="collapsed" data-collapsed-pages="3,4,5,6,7"></cor-pagination-item>
      <cor-pagination-item id="all-states-collapsed-md" size="md" item-type="collapsed" data-collapsed-pages="3,4,5,6,7"></cor-pagination-item>
      <cor-pagination-item id="all-states-collapsed-sm" size="sm" item-type="collapsed" data-collapsed-pages="3,4,5,6,7"></cor-pagination-item>
    </div>
  `,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    ['all-states-collapsed-lg', 'all-states-collapsed-md', 'all-states-collapsed-sm'].forEach(id => {
      const el = canvasElement.querySelector<HTMLElement & { collapsedPages: number[] }>(`#${id}`);
      if (el) {
        const raw = el.getAttribute('data-collapsed-pages') ?? '';
        el.collapsedPages = raw ? raw.split(',').map(Number) : [];
      }
    });
  },
};
