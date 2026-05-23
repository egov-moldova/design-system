import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { DATE_PICKER_BREAKPOINTS, DATE_PICKER_MODES } from './cor-date-picker.types';
import type { DatePickerBreakpoint, DatePickerMode } from './cor-date-picker.types';

type DatePickerArgs = {
  mode: DatePickerMode;
  breakpoint: DatePickerBreakpoint;
  value: string;
  rangeStart: string;
  rangeEnd: string;
  min: string;
  max: string;
  disabledDates: string;
  locale: string;
  hideTodayShortcut: boolean;
  firstDayOfWeek: number;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderDatePicker = (args: DatePickerArgs) => /*html*/ `
  <cor-date-picker
    mode="${args.mode}"
    breakpoint="${args.breakpoint}"
    ${args.value ? `value="${args.value}"` : ''}
    ${args.rangeStart ? `range-start="${args.rangeStart}"` : ''}
    ${args.rangeEnd ? `range-end="${args.rangeEnd}"` : ''}
    ${args.min ? `min="${args.min}"` : ''}
    ${args.max ? `max="${args.max}"` : ''}
    ${args.disabledDates ? `disabled-dates='${args.disabledDates}'` : ''}
    locale="${args.locale}"
    first-day-of-week="${args.firstDayOfWeek}"
    ${args.hideTodayShortcut ? 'hide-today-shortcut' : ''}
  ></cor-date-picker>
`;

const meta: Meta<DatePickerArgs> = {
  title: 'Molecules/Date Picker',
  component: 'cor-date-picker',
  argTypes: {
    mode: {
      control: 'select',
      options: DATE_PICKER_MODES,
      description: 'Selection mode.',
      table: { defaultValue: { summary: 'single' } },
    },
    breakpoint: {
      control: 'select',
      options: DATE_PICKER_BREAKPOINTS,
      description: 'Visual breakpoint / placement.',
      table: { defaultValue: { summary: 'desktop' } },
    },
    value: { control: 'text', description: 'ISO YYYY-MM-DD (single) or comma-separated list (multi).' },
    rangeStart: { control: 'text', description: 'Range mode: ISO start date.' },
    rangeEnd: { control: 'text', description: 'Range mode: ISO end date.' },
    min: { control: 'text', description: 'Inclusive lower bound (ISO).' },
    max: { control: 'text', description: 'Inclusive upper bound (ISO).' },
    disabledDates: { control: 'text', description: 'JSON-encoded array of ISO dates to disable.' },
    locale: { control: 'text', description: 'BCP-47 locale tag (e.g. ro-RO, en-US).' },
    firstDayOfWeek: { control: 'number', description: '0=Sunday, 1=Monday (default).' },
    hideTodayShortcut: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<DatePickerArgs>;

export const Default: Story = {
  render: renderDatePicker,
  args: {
    mode: 'single',
    breakpoint: 'desktop',
    value: '',
    rangeStart: '',
    rangeEnd: '',
    min: '',
    max: '',
    disabledDates: '',
    locale: 'ro-RO',
    firstDayOfWeek: 1,
    hideTodayShortcut: false,
  },
};

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8); align-items: flex-start;">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const Single: Story = {
  name: 'Single',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24);">
      <cor-date-picker mode="single" value="2026-05-23" locale="ro-RO"></cor-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: { story: 'Single-date selection — Romanian locale by default. Click any day to select.' },
    },
  },
};

export const Range: Story = {
  name: 'Range',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24);">
      <cor-date-picker mode="range" range-start="2026-05-10" range-end="2026-05-18" locale="ro-RO"></cor-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Range mode renders the two endpoints solid and the in-range days with the brand-secondary background. Click a date to start a new range, click again to set the end.',
      },
    },
  },
};

export const Multi: Story = {
  name: 'Multi',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24);">
      <cor-date-picker mode="multi" value='["2026-05-02","2026-05-09","2026-05-16","2026-05-23"]' locale="ro-RO"></cor-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { description: { story: 'Multi-date selection — click any day to toggle. Value is a JSON array.' } },
  },
};

export const WithMinMax: Story = {
  name: 'WithMinMax',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24);">
      <cor-date-picker
        mode="single"
        value="2026-05-15"
        min="2026-05-10"
        max="2026-05-25"
        locale="ro-RO"
      ></cor-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Bounded picker. All dates outside `min` (May 10) and `max` (May 25) are disabled and unfocusable via keyboard.',
      },
    },
  },
};

export const WithDisabledDates: Story = {
  name: 'WithDisabledDates',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24);">
      <cor-date-picker
        mode="single"
        value="2026-05-15"
        disabled-dates='["2026-05-09","2026-05-10","2026-05-16","2026-05-17","2026-05-23","2026-05-24"]'
        locale="ro-RO"
      ></cor-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Arbitrary disabled dates (e.g. holidays, blackout dates). The `disabled-dates` prop accepts a JSON array of ISO strings.',
      },
    },
  },
};

export const Mobile: Story = {
  name: 'Mobile',
  render: () => /*html*/ `
    <div style="max-width: 375px; padding: var(--spacing-16); background: var(--color-background-base-secondary, #f5f5f5);">
      <cor-date-picker mode="single" breakpoint="mobile" value="2026-05-23" locale="ro-RO"></cor-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Full-width bottom-sheet variant with a drag handle. Use inside a sheet/dialog and pin to the bottom of the viewport on mobile.',
      },
    },
  },
};

export const Docked: Story = {
  name: 'Docked',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 360px;">
      <cor-date-input label="Selectează data" value="23/05/2026"></cor-date-input>
      <div style="margin-top: var(--spacing-4);">
        <cor-date-picker mode="single" breakpoint="docked" value="2026-05-23" locale="ro-RO"></cor-date-picker>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Compact docked variant intended to attach beneath a `cor-date-input`. No drop shadow — the input + picker share a single visual surface.',
      },
    },
  },
};

export const ComposedWithDateInput: Story = {
  name: 'ComposedWithDateInput',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 360px;" id="composed-host">
      <cor-date-input id="composed-input" label="Selectează data" placeholder="ZZ/LL/AAAA"></cor-date-input>
      <div style="margin-top: var(--spacing-8);">
        <cor-date-picker id="composed-picker" mode="single" breakpoint="desktop" locale="ro-RO"></cor-date-picker>
      </div>
    </div>
    <script>
      (function () {
        requestAnimationFrame(() => {
          const input = document.getElementById('composed-input');
          const picker = document.getElementById('composed-picker');
          if (!input || !picker) return;
          picker.addEventListener('corChange', ev => {
            const iso = ev.detail.value;
            if (typeof iso !== 'string') return;
            const [y, m, d] = iso.split('-');
            input.value = d + '/' + m + '/' + y;
          });
        });
      })();
    </script>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Composition with `cor-date-input` — the picker emits `corChange` with the canonical ISO date, the host wires that back into the input as a `DD/MM/YYYY` display value.',
      },
    },
  },
};

export const RomanianLocale: Story = {
  name: 'RomanianLocale',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); display: flex; gap: var(--spacing-32); flex-wrap: wrap;">
      ${cell(
        'ro-RO (default)',
        /*html*/ `<cor-date-picker mode="single" value="2026-05-23" locale="ro-RO"></cor-date-picker>`,
      )}
      ${cell(
        'en-US',
        /*html*/ `<cor-date-picker mode="single" value="2026-05-23" locale="en-US" first-day-of-week="0"></cor-date-picker>`,
      )}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'All weekday + month names come from `Intl.DateTimeFormat` — switching the `locale` prop swaps the language without code changes. Romanian (ro-RO) starts weeks on Monday; en-US on Sunday.',
      },
    },
  },
};

export const EdgeCases: Story = {
  name: 'EdgeCases',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); display: grid; grid-template-columns: repeat(2, 320px); gap: var(--spacing-32);">
      ${cell(
        'Feb 2024 (leap year — 29 days)',
        /*html*/ `<cor-date-picker mode="single" value="2024-02-29" locale="ro-RO"></cor-date-picker>`,
      )}
      ${cell(
        'Feb 2026 (non-leap year — 28 days)',
        /*html*/ `<cor-date-picker mode="single" value="2026-02-28" locale="ro-RO"></cor-date-picker>`,
      )}
      ${cell(
        'Month boundary spillover (Dec → Jan)',
        /*html*/ `<cor-date-picker mode="single" value="2026-12-31" locale="ro-RO"></cor-date-picker>`,
      )}
      ${cell(
        'Year boundary (Jan 1 with previous-month spillover)',
        /*html*/ `<cor-date-picker mode="single" value="2027-01-01" locale="ro-RO"></cor-date-picker>`,
      )}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Calendar edge cases — leap-year February 29, non-leap February 28, and the December→January and year-boundary transitions. The grid always renders 6 rows; out-of-month days appear muted.',
      },
    },
  },
};
