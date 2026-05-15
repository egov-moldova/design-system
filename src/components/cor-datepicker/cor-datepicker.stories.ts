/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { DatepickerMode, DatepickerSize } from './cor-datepicker.enums';
import { CalendarWeekStart } from '../cor-calendar/cor-calendar.enums';

/**
 * Helper: Attach event listeners to datepicker element after render
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

type DatepickerArgs = {
  name: string;
  mode: string;
  value: string;
  rangeStart: string;
  rangeEnd: string;
  label: string;
  labelEnd: string;
  placeholder: string;
  size: string;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
  withClearButton: boolean;
  weekStartsOn: string;
  disabledDates: string[];
};

const defaultArgs: DatepickerArgs = {
  name: 'datepicker',
  mode: DatepickerMode.SINGLE,
  value: '',
  rangeStart: '',
  rangeEnd: '',
  label: 'Date',
  labelEnd: '',
  placeholder: 'YYYY-MM-DD',
  size: DatepickerSize.LG,
  disabled: false,
  invalid: false,
  required: false,
  withClearButton: true,
  weekStartsOn: CalendarWeekStart.SUN,
  disabledDates: [],
};

const renderDatepicker = (args: DatepickerArgs) => {
  const disabled = args.disabled ? 'disabled' : '';
  const invalid = args.invalid ? 'invalid' : '';
  const required = args.required ? 'required' : '';
  const withClearButton = args.withClearButton ? 'with-clear-button' : '';
  const value = args.value ? `value="${args.value}"` : '';
  const rangeStart = args.rangeStart ? `range-start="${args.rangeStart}"` : '';
  const rangeEnd = args.rangeEnd ? `range-end="${args.rangeEnd}"` : '';
  const label = args.label ? `label="${args.label}"` : '';
  const labelEnd = args.labelEnd ? `label-end="${args.labelEnd}"` : '';
  const needsDisabledDates = args.disabledDates && args.disabledDates.length > 0;
  const uniqueId = needsDisabledDates ? `story-dp-${Math.random().toString(36).substr(2, 9)}` : '';
  const maxWidth = args.mode === DatepickerMode.RANGE ? '600px' : '400px';

  // Set disabledDates property after render (array property, not attribute)
  if (needsDisabledDates) {
    setTimeout(() => {
      const el = document.getElementById(uniqueId);
      if (el) {
        (el as any).disabledDates = args.disabledDates;
      }
    }, 0);
  }

  return /*html*/ `
    <div style="padding: 24px; max-width: ${maxWidth};">
      <cor-datepicker
        ${uniqueId ? `id="${uniqueId}"` : ''}
        name="${args.name}"
        mode="${args.mode}"
        week-starts-on="${args.weekStartsOn}"
        size="${args.size}"
        placeholder="${args.placeholder}"
        ${value}
        ${rangeStart}
        ${rangeEnd}
        ${label}
        ${labelEnd}
        ${disabled}
        ${invalid}
        ${required}
        ${withClearButton}
      ></cor-datepicker>
    </div>
  `;
};

const meta: Meta<DatepickerArgs> = {
  title: 'Molecules/Datepicker',
  component: 'cor-datepicker',
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text', description: 'Form element name' },
    mode: {
      control: 'select',
      options: Object.values(DatepickerMode),
      description: 'Selection mode',
    },
    value: { control: 'text', description: 'Selected date ISO string (YYYY-MM-DD, single mode)' },
    rangeStart: {
      control: 'text',
      description: 'Range start ISO (YYYY-MM-DD)',
      if: { arg: 'mode', neq: DatepickerMode.SINGLE },
    },
    rangeEnd: {
      control: 'text',
      description: 'Range end ISO (YYYY-MM-DD)',
      if: { arg: 'mode', neq: DatepickerMode.SINGLE },
    },
    label: { control: 'text', description: 'Label for single/start input' },
    labelEnd: { control: 'text', description: 'Label for end input (range mode)' },
    placeholder: { control: 'text', description: 'Placeholder (date format hint)' },
    size: {
      control: 'select',
      options: Object.values(DatepickerSize),
      description: 'Input size',
    },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
    withClearButton: { control: 'boolean', description: 'Show clear button' },
    weekStartsOn: {
      control: 'select',
      options: Object.values(CalendarWeekStart),
      description: 'First day of the week',
    },
  },
  render: renderDatepicker,
  parameters: {
    docs: { description: { component: 'Input + popover calendar composite. Single date or date range selection.' } },
    actions: { handles: ['corChange', 'corRangeChange'] },
  },
};

export default meta;

export const Default: StoryObj = {
  args: defaultArgs,
};

export const SingleWithValue: StoryObj = {
  args: {
    ...defaultArgs,
    value: '2025-07-21',
  },
};

export const NoLabel: StoryObj = {
  args: {
    ...defaultArgs,
    label: '',
  },
};

export const Range: StoryObj = {
  args: {
    ...defaultArgs,
    mode: DatepickerMode.RANGE,
    label: 'Start date',
    labelEnd: 'End date',
  },
};

export const RangeWithValues: StoryObj = {
  args: {
    ...defaultArgs,
    mode: DatepickerMode.RANGE,
    rangeStart: '2025-07-08',
    rangeEnd: '2025-07-21',
    label: 'Start date',
    labelEnd: 'End date',
  },
};

export const RangeWithValuesSingleInput: StoryObj = {
  args: {
    ...defaultArgs,
    mode: DatepickerMode.RANGE_SINGLE_INPUT,
    rangeStart: '2025-07-08',
    rangeEnd: '2025-07-21',
    label: 'Date range',
  },
};

export const Disabled: StoryObj = {
  args: {
    ...defaultArgs,
    value: '2025-07-21',
    disabled: true,
  },
};

export const DisabledDates: StoryObj = {
  args: {
    ...defaultArgs,
    disabledDates: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - date.getDay() + i * 7 + (i % 2));
      return date.toISOString().split('T')[0];
    }),
  },
};

export const DisabledDatesRange: StoryObj = {
  args: {
    ...defaultArgs,
    mode: DatepickerMode.RANGE,
    label: 'Start date',
    labelEnd: 'End date',
    disabledDates: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - date.getDay() + i * 7 + (i % 2));
      return date.toISOString().split('T')[0];
    }),
  },
};

export const Invalid: StoryObj = {
  args: {
    ...defaultArgs,
    invalid: true,
  },
};

export const WithClearButton: StoryObj = {
  args: {
    ...defaultArgs,
    value: '2025-07-21',
  },
};

export const AllSizes: StoryObj = {
  parameters: {
    controls: { disable: true },
  },
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; padding: 24px; max-width: 400px;">
      <div>
        <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px; color: var(--color-neutral-text-weaker);">LG (default)</div>
        <cor-datepicker label="Date" size="lg" placeholder="YYYY-MM-DD"></cor-datepicker>
      </div>
      <div>
        <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px; color: var(--color-neutral-text-weaker);">MD</div>
        <cor-datepicker label="Date" size="md" placeholder="YYYY-MM-DD"></cor-datepicker>
      </div>
      <div>
        <div style="font-weight: 600; margin-bottom: 8px; font-size: 12px; color: var(--color-neutral-text-weaker);">SM</div>
        <cor-datepicker label="Date" size="sm" placeholder="YYYY-MM-DD"></cor-datepicker>
      </div>
    </div>
  `,
};

export const Interactive: StoryObj = {
  argTypes: {
    mode: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    value: '2025-07-21',
  },
  render: (args: Partial<DatepickerArgs>) => {
    const elementId = 'dp-interactive';
    const outputId = 'dp-output-content';

    // Attach event listener after render
    attachEventListeners(elementId, 'corChange', detail => {
      const el = document.getElementById(elementId) as any;
      const out = document.getElementById(outputId);
      if (el && out) {
        el.value = detail.value;
        out.textContent = detail.value || '—';
      }
    });

    const disabled = args.disabled ? 'disabled' : '';
    const invalid = args.invalid ? 'invalid' : '';
    const required = args.required ? 'required' : '';
    const withClearButton = args.withClearButton ? 'with-clear-button' : '';

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 24px; max-width: 400px;">
        <cor-datepicker
          id="${elementId}"
          mode="${args.mode}"
          week-starts-on="${args.weekStartsOn}"
          size="${args.size}"
          placeholder="${args.placeholder}"
          ${args.value ? `value="${args.value}"` : ''}
          ${args.rangeStart ? `range-start="${args.rangeStart}"` : ''}
          ${args.rangeEnd ? `range-end="${args.rangeEnd}"` : ''}
          ${args.label ? `label="${args.label}"` : ''}
          ${args.labelEnd ? `label-end="${args.labelEnd}"` : ''}
          ${disabled}
          ${invalid}
          ${required}
          ${withClearButton}
        ></cor-datepicker>

        <div id="dp-output" style="padding: 12px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px;">
          <span style="font-weight: 600;">corChange: </span>
          <span id="${outputId}">—</span>
        </div>
      </div>
    `;
  },
};

export const InteractiveRange: StoryObj = {
  argTypes: {
    mode: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    mode: DatepickerMode.RANGE,
    value: '2025-07-21',
    label: 'Start date',
    labelEnd: 'End date',
  },
  render: (args: Partial<DatepickerArgs>) => {
    const elementId = 'dp-range-interactive';
    const outputId = 'dp-range-output-content';

    // Attach event listener after render
    attachEventListeners(elementId, 'corRangeChange', detail => {
      const el = document.getElementById(elementId) as any;
      const out = document.getElementById(outputId);
      if (el && out) {
        el.rangeStart = detail.start || '';
        el.rangeEnd = detail.end || '';
        out.textContent = `${detail.start || '—'} → ${detail.end || '…'}`;
      }
    });

    const disabled = args.disabled ? 'disabled' : '';
    const invalid = args.invalid ? 'invalid' : '';
    const required = args.required ? 'required' : '';
    const withClearButton = args.withClearButton ? 'with-clear-button' : '';

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 24px; max-width: 600px;">
        <cor-datepicker
          id="${elementId}"
          mode="${args.mode}"
          week-starts-on="${args.weekStartsOn}"
          size="${args.size}"
          placeholder="${args.placeholder}"
          ${args.value ? `value="${args.value}"` : ''}
          ${args.rangeStart ? `range-start="${args.rangeStart}"` : ''}
          ${args.rangeEnd ? `range-end="${args.rangeEnd}"` : ''}
          ${args.label ? `label="${args.label}"` : ''}
          ${args.labelEnd ? `label-end="${args.labelEnd}"` : ''}
          ${disabled}
          ${invalid}
          ${required}
          ${withClearButton}
        ></cor-datepicker>

        <div id="dp-range-output" style="padding: 12px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px;">
          <span style="font-weight: 600;">corRangeChange: </span>
          <span id="${outputId}">—</span>
        </div>
      </div>
    `;
  },
};
