/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { SortingSize } from './cor-sorting.enums';

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

type CorSortingArgs = {
  label: string;
  value: string;
  size: SortingSize;
  disabled: boolean;
};

const DEFAULT_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Option 1', value: 'option-1' },
  { label: 'Option 2', value: 'option-2' },
  { label: 'Option 3', value: 'option-3' },
];

const renderOptions = () =>
  DEFAULT_OPTIONS.map(
    o => `<cor-select-item variant="label-only" value="${o.value}" label="${o.label}"></cor-select-item>`,
  ).join('\n      ');

const bindSortingChange = (id: string) => {
  attachEventListeners(id, 'corSortingChange', detail => {
    const el = document.getElementById(id) as any;
    if (el) {
      el.value = detail;
    }
  });
};

const renderSorting = (args: CorSortingArgs) => {
  const disabled = args.disabled ? 'disabled' : '';
  const elementId = 'sorting-default';

  // Bind sorting change event after render
  bindSortingChange(elementId);

  return /*html*/ `
    <div style="padding: 24px; display: flex; align-items: center; gap: 16px;">
      <cor-sorting
        id="${elementId}"
        label="${args.label}"
        value="${args.value}"
        size="${args.size}"
        ${disabled}
      >
        ${renderOptions()}
      </cor-sorting>
    </div>
  `;
};

const meta: Meta = {
  title: 'Molecules/Sorting',
  component: 'cor-sorting',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text', description: 'Label text shown before the selected value' },
    value: {
      control: 'select',
      options: DEFAULT_OPTIONS.map(o => o.value),
      description: 'Currently selected option value (controlled)',
    },
    size: { control: 'select', options: Object.values(SortingSize), description: 'Size variant' },
    disabled: { control: 'boolean', description: 'Disabled state' },
  },
  render: (args: Partial<CorSortingArgs>) => renderSorting(args as CorSortingArgs),
  parameters: {
    actions: { handles: ['corSortingChange'] },
  },
};
export default meta;

export const Default: StoryObj = {
  args: {
    label: 'Label',
    value: DEFAULT_OPTIONS[0].value,
    size: SortingSize.MD,
    disabled: false,
  },
};

export const SizeMd: StoryObj = {
  args: {
    label: 'Sort by',
    value: DEFAULT_OPTIONS[0].value,
    size: SortingSize.MD,
    disabled: false,
  },
};

export const SizeSm: StoryObj = {
  args: {
    label: 'Sort by',
    value: DEFAULT_OPTIONS[0].value,
    size: SortingSize.SM,
    disabled: false,
  },
};

export const Disabled: StoryObj = {
  args: {
    label: 'Label',
    value: DEFAULT_OPTIONS[0].value,
    size: SortingSize.MD,
    disabled: true,
  },
};

export const NoLabel: StoryObj = {
  args: {
    label: '',
    value: 'option-2',
    size: SortingSize.MD,
    disabled: false,
  },
};

export const AllSizes: StoryObj = {
  argTypes: {
    size: { control: false },
  },
  args: {
    ...Default.args,
  },
  render: (args: Partial<CorSortingArgs>) => {
    // Bind sorting change events after render
    bindSortingChange('sort-md');
    bindSortingChange('sort-sm');

    return /*html*/ `
    <div style="padding: 24px; display: flex; flex-direction: column; gap: 24px;">
      <div style="display: flex; align-items: center; gap: 32px;">
        <span style="font-family: var(--font-family-primary); font-size: 12px; color: var(--color-text-base-secondary); width: 40px;">MD</span>
        <cor-sorting id="sort-md" label="${args.label}" value="${args.value}" size="md" ${args.disabled ? 'disabled' : ''}>
          ${renderOptions()}
        </cor-sorting>
      </div>
      <div style="display: flex; align-items: center; gap: 32px;">
        <span style="font-family: var(--font-family-primary); font-size: 12px; color: var(--color-text-base-secondary); width: 40px;">SM</span>
        <cor-sorting id="sort-sm" label="${args.label}" value="${args.value}" size="sm" ${args.disabled ? 'disabled' : ''}>
          ${renderOptions()}
        </cor-sorting>
      </div>
    </div>
  `;
  },
};

export const AllStates: StoryObj = {
  argTypes: {
    disabled: { control: false },
  },
  args: {
    ...Default.args,
  },
  render: (args: Partial<CorSortingArgs>) => {
    // Bind sorting change event after render
    bindSortingChange('state-default');

    return /*html*/ `
    <div style="padding: 24px; display: flex; flex-direction: column; gap: 24px;">
      <div style="display: flex; align-items: center; gap: 32px;">
        <span style="font-family: var(--font-family-primary); font-size: 12px; color: var(--color-text-base-secondary); width: 80px;">Default</span>
        <cor-sorting id="state-default" label="${args.label}" value="${args.value}" size="${args.size}">
          ${renderOptions()}
        </cor-sorting>
      </div>
      <div style="display: flex; align-items: center; gap: 32px;">
        <span style="font-family: var(--font-family-primary); font-size: 12px; color: var(--color-text-base-secondary); width: 80px;">Disabled</span>
        <cor-sorting id="state-disabled" label="${args.label}" value="${args.value}" size="${args.size}" disabled>
          ${renderOptions()}
        </cor-sorting>
      </div>
    </div>
  `;
  },
};

export const Open: StoryObj = {
  name: 'Open (options visible)',
  args: {
    label: 'Sort by',
    value: DEFAULT_OPTIONS[0].value,
    size: SortingSize.MD,
    disabled: false,
  },
  render: (args: Partial<CorSortingArgs>) => /*html*/ `
    <div style="padding: 24px; display: flex; align-items: flex-start;">
      <cor-sorting
        id="sorting-open"
        label="${args.label}"
        value="${args.value}"
        size="${args.size}"
      >
        ${renderOptions()}
      </cor-sorting>
    </div>
  `,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const el = canvasElement.querySelector<HTMLElement>('#sorting-open');
    if (!el) return;
    await new Promise<void>(resolve => {
      const check = () => {
        if (el.shadowRoot?.querySelector('.trigger')) {
          (el.shadowRoot.querySelector('.trigger') as HTMLButtonElement).click();
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  },
};

export const Interactive: StoryObj = {
  args: {
    ...Default.args,
  },
  render: (args: Partial<CorSortingArgs>) => {
    const elementId = 'sorting-interactive';
    const outputId = 'sorting-output-content';
    const logContentId = 'sorting-log-content';

    // Attach event listener after render
    attachEventListeners(elementId, 'corSortingChange', detail => {
      const el = document.getElementById(elementId) as any;
      const output = document.getElementById(outputId);
      const logContent = document.getElementById(logContentId);

      if (el && output && logContent) {
        el.value = detail;
        output.textContent = detail;

        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] corSortingChange (value: ${detail})<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 24px;">
      <cor-sorting
        id="${elementId}"
        label="${args.label}"
        value="${args.value}"
        size="${args.size}"
        ${args.disabled ? 'disabled' : ''}
      >
        ${renderOptions()}
      </cor-sorting>

      <div style="font-size: 12px; color: var(--color-text-base-tertiary);">Select an option — <code>corSortingChange</code> is emitted. The consumer updates <code>value</code> externally.</div>

      <div id="sorting-output" style="padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Current Value:</div>
        <div id="${outputId}">${args.value}</div>
      </div>

      <div id="sorting-log" style="padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
        <div id="${logContentId}">Select an option to see events...</div>
      </div>
    </div>
  `;
  },
};
