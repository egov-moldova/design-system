/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { PaginationGoToSize } from './cor-pagination-go-to.enums';

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

type PaginationGoToStoryArgs = {
  size: PaginationGoToSize;
  page: number;
  minPage: number;
  maxPage: number;
  disabled: boolean;
};

const renderPaginationGoTo = (args: PaginationGoToStoryArgs) => {
  const disabled = args.disabled ? 'disabled' : '';
  const maxPage = isFinite(args.maxPage) ? `max-page="${args.maxPage}"` : '';

  return /*html*/ `
    <cor-pagination-go-to
      size="${args.size}"
      page="${args.page}"
      min-page="${args.minPage}"
      ${maxPage}
      ${disabled}
    ></cor-pagination-go-to>
  `;
};

const meta: Meta<PaginationGoToStoryArgs> = {
  title: 'Molecules/Pagination Go To',
  component: 'cor-pagination-go-to',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: Object.values(PaginationGoToSize), description: 'Component size' },
    page: { control: 'number', description: 'Current page number' },
    minPage: { control: 'number', description: 'Minimum allowed page number' },
    maxPage: { control: 'number', description: 'Maximum allowed page number (use large number for infinity)' },
    disabled: { control: 'boolean', description: 'Disables the input and button' },
  },
  render: renderPaginationGoTo,
  parameters: {
    actions: { handles: ['corGoToPage'] },
  },
};
export default meta;

type PaginationGoToStory = StoryObj<PaginationGoToStoryArgs>;

export const Default: PaginationGoToStory = {
  args: {
    size: PaginationGoToSize.LG,
    page: 1,
    minPage: 1,
    maxPage: 100,
    disabled: false,
  },
};

export const Disabled: PaginationGoToStory = {
  args: {
    size: PaginationGoToSize.LG,
    page: 1,
    minPage: 1,
    maxPage: 100,
    disabled: true,
  },
};

export const EventLogging: PaginationGoToStory = {
  args: {
    size: PaginationGoToSize.LG,
    page: 1,
    minPage: 1,
    maxPage: 100,
    disabled: false,
  },
  render: (args: PaginationGoToStoryArgs) => {
    const maxPage = isFinite(args.maxPage) ? `max-page="${args.maxPage}"` : '';
    const elementId = 'pagination-go-to-demo';
    const logContentId = 'go-to-log-content';

    // Attach event listener after render
    attachEventListeners(elementId, 'corGoToPage', detail => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] Go To Page: event.page=${detail.page}<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <cor-pagination-go-to
        id="${elementId}"
        size="${args.size}"
        page="${args.page}"
        min-page="${args.minPage}"
        ${maxPage}
        ${args.disabled ? 'disabled' : ''}
      ></cor-pagination-go-to>

      <div id="go-to-log" style="padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 320px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
        <div id="${logContentId}">Click Go to see events...</div>
      </div>
    </div>
  `;
  },
};

export const AllSizes: PaginationGoToStory = {
  argTypes: {
    size: { control: false },
  },
  args: {
    page: 1,
    minPage: 1,
    maxPage: 100,
    disabled: false,
    size: PaginationGoToSize.LG,
  },
  render: (args: PaginationGoToStoryArgs) => {
    const maxPage = isFinite(args.maxPage) ? `max-page="${args.maxPage}"` : '';
    return /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center;">
      <div style="font-weight: 600;">Size</div>
      <div style="font-weight: 600;">Component</div>

      <div>lg</div>
      <cor-pagination-go-to
        size="lg"
        page="${args.page}"
        min-page="${args.minPage}"
        ${maxPage}
        ${args.disabled ? 'disabled' : ''}
      ></cor-pagination-go-to>

      <div>md</div>
      <cor-pagination-go-to
        size="md"
        page="${args.page}"
        min-page="${args.minPage}"
        ${maxPage}
        ${args.disabled ? 'disabled' : ''}
      ></cor-pagination-go-to>

      <div>sm</div>
      <cor-pagination-go-to
        size="sm"
        page="${args.page}"
        min-page="${args.minPage}"
        ${maxPage}
        ${args.disabled ? 'disabled' : ''}
      ></cor-pagination-go-to>
    </div>
  `;
  },
};
