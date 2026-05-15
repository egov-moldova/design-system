/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { CalendarMode, CalendarWeekStart } from './cor-calendar.enums';
import type { CorCalendarEvent } from './cor-calendar.types';

/**
 * Helper: Set properties on element after render
 * Avoids inline scripts for property assignment
 */
const setElementProperties = (elementId: string, properties: Record<string, any>) => {
  setTimeout(() => {
    const el = document.getElementById(elementId) as any;
    if (el) {
      Object.entries(properties).forEach(([key, value]) => {
        el[key] = value;
      });
    }
  }, 0);
};

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

type CalendarArgs = {
  mode: string;
  value?: string;
  rangeStart?: string;
  rangeEnd?: string;
  month?: number;
  year?: number;
  disabled: boolean;
  skeleton: boolean;
  weekStartsOn: string;
  headerStyle: '1' | '2';
  events: CorCalendarEvent[];
  disabledDates: string[];
};

const sampleEvents: CorCalendarEvent[] = [
  { date: '2025-07-03', color: 'secondary' },
  { date: '2025-07-03' },
  { date: '2025-07-06' },
  { date: '2025-07-09', color: 'info' },
  { date: '2025-07-09' },
  { date: '2025-07-10', color: 'secondary' },
  { date: '2025-07-11', color: 'info' },
  { date: '2025-07-11' },
  { date: '2025-07-12' },
  { date: '2025-07-14', color: 'info' },
  { date: '2025-07-14' },
  { date: '2025-07-15' },
  { date: '2025-07-18', color: 'info' },
  { date: '2025-07-21', color: 'info' },
  { date: '2025-07-21' },
  { date: '2025-07-23', color: 'info', signType: 'diamond' },
  { date: '2025-07-23', color: 'secondary', signType: 'diamond' },
  { date: '2025-07-23', signType: 'diamond' },
  { date: '2025-07-24', color: 'info' },
  { date: '2025-07-24' },
  { date: '2025-07-27', color: 'info' },
  { date: '2025-07-27' },
  { date: '2025-07-27', color: 'secondary' },
  { date: '2025-07-27', color: 'primary-weakest', position: 'bottom' },
  { date: '2025-07-28', color: 'info' },
  { date: '2025-07-28' },
  { date: '2025-07-28', color: 'secondary' },
  { date: '2025-07-28', color: 'primary-weakest', position: 'bottom' },
  { date: '2025-07-29', color: 'secondary' },
];

const renderCalendar = (args: CalendarArgs) => {
  const disabled = args.disabled ? 'disabled' : '';
  const skeleton = args.skeleton ? 'skeleton' : '';
  const value = args.value ? `value="${args.value}"` : '';
  const rangeStart = args.rangeStart ? `range-start="${args.rangeStart}"` : '';
  const rangeEnd = args.rangeEnd ? `range-end="${args.rangeEnd}"` : '';
  const month = args.month !== undefined ? `month="${args.month}"` : '';
  const year = args.year !== undefined ? `year="${args.year}"` : '';
  const needsProperties =
    (args.events && args.events.length > 0) || (args.disabledDates && args.disabledDates.length > 0);
  const elementId = 'story-cal';

  // Set properties after render if needed
  if (needsProperties) {
    const properties: Record<string, any> = {};
    if (args.events && args.events.length > 0) {
      properties.events = args.events;
    }
    if (args.disabledDates && args.disabledDates.length > 0) {
      properties.disabledDates = args.disabledDates;
    }
    setElementProperties(elementId, properties);
  }

  return /*html*/ `
    <div style="padding: 24px;">
      <cor-calendar
        mode="${args.mode}"
        week-starts-on="${args.weekStartsOn}"
        header-style="${args.headerStyle ?? '1'}"
        ${value}
        ${rangeStart}
        ${rangeEnd}
        ${month}
        ${year}
        ${disabled}
        ${skeleton}
        ${needsProperties ? `id="${elementId}"` : ''}
      ></cor-calendar>
    </div>
  `;
};

const meta: Meta<CalendarArgs> = {
  title: 'Molecules/Calendar',
  component: 'cor-calendar',
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'radio',
      options: Object.values(CalendarMode),
      description: 'Selection mode',
    },
    value: { control: 'text', description: 'Selected date ISO string (single mode)' },
    rangeStart: {
      control: 'text',
      description: 'Range start ISO string',
      if: { arg: 'mode', eq: CalendarMode.RANGE },
    },
    rangeEnd: {
      control: 'text',
      description: 'Range end ISO string',
      if: { arg: 'mode', eq: CalendarMode.RANGE },
    },
    month: { control: 'number', description: 'Displayed month (1-12)' },
    year: { control: 'number', description: 'Displayed year' },
    disabled: { control: 'boolean', description: 'Disable all interaction' },
    skeleton: { control: 'boolean', description: 'Skeleton loading state' },
    weekStartsOn: {
      control: 'radio',
      options: Object.values(CalendarWeekStart),
      description: 'First day of the week',
    },
    headerStyle: {
      control: 'radio',
      options: ['1', '2'],
      description: 'Header layout variant',
    },
  },
  render: renderCalendar,
  parameters: {
    actions: { handles: ['corDateChange', 'corRangeChange'] },
    docs: { description: { component: 'Standalone calendar panel for single date or range selection.' } },
  },
};
export default meta;

export const Default: StoryObj = {
  args: {
    mode: CalendarMode.SINGLE,
    value: '2025-07-21',
    month: 7,
    year: 2025,
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    events: [],
    disabledDates: [],
    headerStyle: '1',
  },
};

export const Today: StoryObj = {
  args: {
    mode: CalendarMode.SINGLE,
    value: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    events: [],
    disabledDates: [],
  },
};

export const HeaderStyle2: StoryObj = {
  args: {
    mode: CalendarMode.SINGLE,
    value: '2025-07-21',
    month: 7,
    year: 2025,
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    headerStyle: '2',
    events: [],
    disabledDates: [],
  },
};

export const Interactive: StoryObj = {
  argTypes: {
    mode: {
      control: false,
    },
  },
  args: {
    mode: CalendarMode.SINGLE,
    value: '2025-07-21',
    month: 7,
    year: 2025,
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    events: [],
    disabledDates: [],
    headerStyle: '1',
  },
  render: (args: Partial<CalendarArgs>) => {
    const elementId = 'cal-interactive';
    const outputId = 'cal-output-content';
    const logContentId = 'cal-log-content';

    // Attach event listener after render
    attachEventListeners(elementId, 'corDateChange', detail => {
      const el = document.getElementById(elementId) as any;
      const output = document.getElementById(outputId);
      const logContent = document.getElementById(logContentId);

      if (el && output && logContent) {
        el.value = detail.date;
        output.textContent = detail.date;

        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] corDateChange (date: ${detail.date})<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 24px;">
      <cor-calendar
        id="${elementId}"
        mode="${args.mode}"
        month="${new Date().getMonth() + 1}"
        year="${new Date().getFullYear()}"
        week-starts-on="${args.weekStartsOn}"
        header-style="${args.headerStyle ?? '1'}"
        ${args.value ? `value="${args.value}"` : ''}
        ${args.rangeStart ? `range-start="${args.rangeStart}"` : ''}
        ${args.rangeEnd ? `range-end="${args.rangeEnd}"` : ''}
        ${args.month ? `month="${args.month}"` : ''}
        ${args.year ? `year="${args.year}"` : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      ></cor-calendar>

      <div style="font-size: 12px; color: var(--color-neutral-text-weaker);">Select a date — <code>corDateChange</code> is emitted. The consumer updates <code>value</code> externally.</div>

      <div id="cal-output" style="padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Current Value:</div>
        <div id="${outputId}">—</div>
      </div>

      <div id="cal-log" style="padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
        <div id="${logContentId}">Select a date to see events...</div>
      </div>
    </div>
  `;
  },
};

export const Range: StoryObj = {
  args: {
    mode: CalendarMode.RANGE,
    rangeStart: '2025-07-08',
    rangeEnd: '2025-07-21',
    month: 7,
    year: 2025,
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    events: [],
    disabledDates: [],
  },
};

export const InteractiveRange: StoryObj = {
  argTypes: {
    mode: {
      control: false,
    },
  },
  args: {
    mode: CalendarMode.RANGE,
    value: '2025-07-21',
    month: 7,
    year: 2025,
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    events: [],
    disabledDates: [],
    headerStyle: '1',
  },
  render: (args: Partial<CalendarArgs>) => {
    const elementId = 'cal-interactive-range';
    const outputId = 'cal-range-output-content';
    const logContentId = 'cal-range-log-content';

    // Attach event listener after render
    attachEventListeners(elementId, 'corRangeChange', detail => {
      const el = document.getElementById(elementId) as any;
      const output = document.getElementById(outputId);
      const logContent = document.getElementById(logContentId);

      if (el && output && logContent) {
        el.rangeStart = detail.start;
        el.rangeEnd = detail.end;
        output.textContent = `${detail.start || '—'} → ${detail.end || '…'}`;

        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] corRangeChange (start: ${detail.start || 'null'}, end: ${detail.end || 'null'})<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 24px;">
      <cor-calendar
        id="${elementId}"
        mode="${args.mode}"
        month="${new Date().getMonth() + 1}"
        year="${new Date().getFullYear()}"
        week-starts-on="${args.weekStartsOn}"
        header-style="${args.headerStyle ?? '1'}"
        ${args.value ? `value="${args.value}"` : ''}
        ${args.rangeStart ? `range-start="${args.rangeStart}"` : ''}
        ${args.rangeEnd ? `range-end="${args.rangeEnd}"` : ''}
        ${args.month ? `month="${args.month}"` : ''}
        ${args.year ? `year="${args.year}"` : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      ></cor-calendar>

      <div style="font-size: 12px; color: var(--color-neutral-text-weaker);">Select a range — <code>corRangeChange</code> is emitted.</div>

      <div id="cal-range-output" style="padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Current Range:</div>
        <div id="${outputId}">—</div>
      </div>

      <div id="cal-range-log" style="padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
        <div id="${logContentId}">Select a date range to see events...</div>
      </div>
    </div>
  `;
  },
};

export const WithEvents: StoryObj = {
  args: {
    mode: CalendarMode.SINGLE,
    value: '2025-07-21',
    month: 7,
    year: 2025,
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    events: sampleEvents,
    disabledDates: ['2025-07-28'],
  },
};

export const WeekStartMonday: StoryObj = {
  args: {
    mode: CalendarMode.SINGLE,
    value: '2026-03-21',
    month: 3,
    year: 2026,
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.MON,
    events: [],
    disabledDates: [],
  },
};

export const DisabledCalendar: StoryObj = {
  args: {
    mode: CalendarMode.SINGLE,
    value: '2025-07-21',
    month: 3,
    year: 2026,
    disabled: true,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    events: [],
    disabledDates: [],
  },
};

export const DisabledDates: StoryObj = {
  args: {
    mode: CalendarMode.SINGLE,
    month: 7,
    year: 2025,
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    events: [],
    disabledDates: [
      '2025-07-05',
      '2025-07-08',
      '2025-07-09',
      '2025-07-21',
      '2025-07-22',
      '2025-07-23',
      '2025-07-24',
      '2025-07-25',
    ],
  },
};

export const DisabledDatesRange: StoryObj = {
  args: {
    mode: CalendarMode.RANGE,
    month: 7,
    year: 2025,
    disabled: false,
    skeleton: false,
    weekStartsOn: CalendarWeekStart.SUN,
    events: [],
    disabledDates: [
      '2025-07-05',
      '2025-07-08',
      '2025-07-09',
      '2025-07-21',
      '2025-07-22',
      '2025-07-23',
      '2025-07-24',
      '2025-07-25',
    ],
  },
};

export const Skeleton: StoryObj = {
  args: {
    mode: CalendarMode.SINGLE,
    month: 7,
    year: 2025,
    disabled: false,
    skeleton: true,
    weekStartsOn: CalendarWeekStart.SUN,
    events: [],
    disabledDates: [],
  },
};

export const AllStates: StoryObj = {
  parameters: {
    controls: {
      disable: true,
    },
  },
  render: () => {
    const singleSelected = renderCalendar({
      mode: CalendarMode.SINGLE,
      value: '2026-03-21',
      month: 3,
      year: 2026,
      disabled: false,
      skeleton: false,
      weekStartsOn: CalendarWeekStart.SUN,
      headerStyle: '1',
      events: [],
      disabledDates: [],
    });

    const rangeSelection = renderCalendar({
      mode: CalendarMode.RANGE,
      rangeStart: '2026-03-08',
      rangeEnd: '2026-03-21',
      month: 3,
      year: 2026,
      disabled: false,
      skeleton: false,
      weekStartsOn: CalendarWeekStart.SUN,
      headerStyle: '1',
      events: [],
      disabledDates: [],
    });

    const withEvents = renderCalendar({
      mode: CalendarMode.SINGLE,
      month: 3,
      year: 2026,
      disabled: false,
      skeleton: false,
      weekStartsOn: CalendarWeekStart.SUN,
      headerStyle: '1',
      events: sampleEvents,
      disabledDates: [],
    });

    const disabledCal = renderCalendar({
      mode: CalendarMode.SINGLE,
      value: '2026-03-21',
      month: 3,
      year: 2026,
      disabled: true,
      skeleton: false,
      weekStartsOn: CalendarWeekStart.SUN,
      headerStyle: '1',
      events: [],
      disabledDates: [],
    });

    const skeletonCal = renderCalendar({
      mode: CalendarMode.SINGLE,
      month: 3,
      year: 2026,
      disabled: false,
      skeleton: true,
      weekStartsOn: CalendarWeekStart.SUN,
      headerStyle: '1',
      events: [],
      disabledDates: [],
    });

    return /*html*/ `
      <div style="display: flex; flex-wrap: wrap; gap: 32px; padding: 24px;">
        <div>
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">Single — Selected</div>
          ${singleSelected}
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">Range Selection</div>
          ${rangeSelection}
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">With Events</div>
          ${withEvents}
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">Disabled</div>
          ${disabledCal}
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">Skeleton</div>
          ${skeletonCal}
        </div>
      </div>
    `;
  },
};
