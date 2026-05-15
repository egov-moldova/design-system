/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { PaginationSize, PaginationStyle } from './cor-pagination.enums';

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

type PaginationArgs = {
  currentPage: number;
  disabled: boolean;
  paginationStyle: PaginationStyle;
  shown: number;
  size: PaginationSize;
  skeleton: boolean;
  totalPages: number;
};

const defaultArgs: PaginationArgs = {
  size: PaginationSize.LG,
  paginationStyle: PaginationStyle.STYLE_1,
  currentPage: 1,
  totalPages: 24,
  shown: 4,
  skeleton: false,
  disabled: false,
};

const generateDocumentationCode = (args: PaginationArgs) => {
  const attributes = [
    `size="${args.size}"`,
    `pagination-style="${args.paginationStyle}"`,
    `current-page="${args.currentPage}"`,
    `total-pages="${args.totalPages}"`,
    `shown="${args.shown}"`,
  ];

  if (args.skeleton) attributes.push('skeleton');
  if (args.disabled) attributes.push('disabled');

  return /*html*/ `<cor-pagination\n  ${attributes.join('\n  ')}\n></cor-pagination>`;
};

const renderPagination = (args: PaginationArgs) => {
  const skeleton = args.skeleton ? 'skeleton' : '';
  const disabled = args.disabled ? 'disabled' : '';

  return /*html*/ `
    <div style="padding: 24px;">
      <cor-pagination
        size="${args.size}"
        pagination-style="${args.paginationStyle}"
        current-page="${args.currentPage}"
        total-pages="${args.totalPages}"
        shown="${args.shown}"
        ${skeleton}
        ${disabled}
      ></cor-pagination>
    </div>
  `;
};

const meta: Meta<PaginationArgs> = {
  title: 'Molecules/Pagination',
  component: 'cor-pagination',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: Object.values(PaginationSize), description: 'Component size' },
    paginationStyle: {
      control: 'select',
      options: Object.values(PaginationStyle),
      description: 'Visual style variant',
    },
    currentPage: { control: 'number', description: 'Currently selected page (1-indexed)' },
    totalPages: { control: 'number', description: 'Total number of pages' },
    shown: { control: 'number', description: 'Max visible page number buttons' },
    skeleton: { control: 'boolean', description: 'Skeleton loading state' },
    disabled: { control: 'boolean', description: 'Disables all interactions' },
  },
  render: renderPagination,
  parameters: {
    docs: {
      source: {
        transform: (_src: string, ctx: { args: PaginationArgs }) => generateDocumentationCode(ctx.args),
      },
    },
    actions: { handles: ['corPageChange'] },
  },
};
export default meta;

export const Default: StoryObj<PaginationArgs> = {
  args: defaultArgs,
};

export const Style1Default: StoryObj<PaginationArgs> = {
  name: 'Style 1 — Default',
  args: defaultArgs,
};

export const Style1Middle: StoryObj<PaginationArgs> = {
  name: 'Style 1 — Middle Page',
  args: {
    ...defaultArgs,
    currentPage: 10,
  },
};

export const Style1Last: StoryObj<PaginationArgs> = {
  name: 'Style 1 — Last Page',
  args: {
    ...defaultArgs,
    currentPage: 24,
  },
};

export const Style2Default: StoryObj<PaginationArgs> = {
  name: 'Style 2 — Default',
  args: {
    ...defaultArgs,
    paginationStyle: PaginationStyle.STYLE_2,
    currentPage: 10,
  },
};

export const SkeletonState: StoryObj<PaginationArgs> = {
  name: 'Skeleton',
  args: {
    ...defaultArgs,
    skeleton: true,
  },
};

export const DisabledState: StoryObj<PaginationArgs> = {
  name: 'Disabled',
  args: {
    ...defaultArgs,
    currentPage: 10,
    disabled: true,
  },
};

export const AllVariants: StoryObj<PaginationArgs> = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 24px; align-items: center; padding: 24px;">
      <div style="font-weight: 600;">Variant</div>
      <div style="font-weight: 600;">Start</div>
      <div style="font-weight: 600;">Middle</div>

      <div>Style 1</div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="1" current-page="1" total-pages="24" shown="4"></cor-pagination></div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="1" current-page="10" total-pages="24" shown="4"></cor-pagination></div>

      <div>Style 2</div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="2" current-page="1" total-pages="24" shown="4"></cor-pagination></div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="2" current-page="10" total-pages="24" shown="4"></cor-pagination></div>
    </div>
  `,
};

export const AllSizes: StoryObj<PaginationArgs> = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 24px; align-items: center; padding: 24px;">
      <div style="font-weight: 600;">Size</div>
      <div style="font-weight: 600;">Style 1</div>
      <div style="font-weight: 600;">Style 2</div>

      <div>lg</div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="1" current-page="10" total-pages="24" shown="4"></cor-pagination></div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="2" current-page="10" total-pages="24" shown="4"></cor-pagination></div>

      <div>md</div>
      <div style="width: 420px;"><cor-pagination size="md" pagination-style="1" current-page="10" total-pages="24" shown="4"></cor-pagination></div>
      <div style="width: 420px;"><cor-pagination size="md" pagination-style="2" current-page="10" total-pages="24" shown="4"></cor-pagination></div>

      <div>sm</div>
      <div style="width: 420px;"><cor-pagination size="sm" pagination-style="1" current-page="10" total-pages="24" shown="4"></cor-pagination></div>
      <div style="width: 420px;"><cor-pagination size="sm" pagination-style="2" current-page="10" total-pages="24" shown="4"></cor-pagination></div>
    </div>
  `,
};

export const States: StoryObj<PaginationArgs> = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr 1fr; gap: 24px; align-items: center; padding: 24px;">
      <div style="font-weight: 600;">State</div>
      <div style="font-weight: 600;">Default</div>
      <div style="font-weight: 600;">Disabled</div>
      <div style="font-weight: 600;">Skeleton</div>

      <div>Style 1</div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="1" current-page="10" total-pages="24" shown="4"></cor-pagination></div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="1" current-page="10" total-pages="24" shown="4" disabled></cor-pagination></div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="1" current-page="10" total-pages="24" shown="4" skeleton></cor-pagination></div>

      <div>Style 2</div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="2" current-page="10" total-pages="24" shown="4"></cor-pagination></div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="2" current-page="10" total-pages="24" shown="4" disabled></cor-pagination></div>
      <div style="width: 420px;"><cor-pagination size="lg" pagination-style="2" current-page="10" total-pages="24" shown="4" skeleton></cor-pagination></div>
    </div>
  `,
};

export const FewPages: StoryObj<PaginationArgs> = {
  name: 'Few Pages (no collapse)',
  args: {
    ...defaultArgs,
    currentPage: 2,
    totalPages: 5,
  },
};

export const EventLog: StoryObj<PaginationArgs> = {
  name: 'Interactive - Event Log',
  args: {
    ...defaultArgs,
  },
  render: (args: PaginationArgs) => {
    const skeleton = args.skeleton ? 'skeleton' : '';
    const disabled = args.disabled ? 'disabled' : '';
    const elementId = 'pagination-event-demo';
    const logContentId = 'pagination-log-content';

    // Attach event listener after render
    attachEventListeners(elementId, 'corPageChange', detail => {
      const pagination = document.getElementById(elementId);
      const logContent = document.getElementById(logContentId);
      if (pagination && logContent) {
        const ts = new Date().toLocaleTimeString();
        pagination.setAttribute('current-page', String(detail.page));
        logContent.innerHTML = `[${ts}] corPageChange: event.page=${detail.page}<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start; padding: 24px;">
        <cor-pagination
          id="${elementId}"
          size="${args.size}"
          pagination-style="${args.paginationStyle}"
          current-page="${args.currentPage}"
          total-pages="${args.totalPages}"
          shown="${args.shown}"
          ${skeleton}
          ${disabled}
        ></cor-pagination>

        <div id="pagination-log" style="padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
          <div id="${logContentId}">Click a page to see events...</div>
        </div>
      </div>
    `;
  },
};
