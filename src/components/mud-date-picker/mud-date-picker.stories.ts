import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { DATE_PICKER_BREAKPOINTS, DATE_PICKER_HEADER_STYLES, DATE_PICKER_MODES } from './mud-date-picker.types';
import type { DatePickerBreakpoint, DatePickerHeaderStyle, DatePickerMode } from './mud-date-picker.types';
import { attr, jsValue } from '../../utils/story-docs-source';

type DatePickerArgs = {
  mode: DatePickerMode;
  breakpoint: DatePickerBreakpoint;
  headerStyle: DatePickerHeaderStyle;
  value: string;
  rangeStart: string;
  rangeEnd: string;
  min: string;
  max: string;
  disabledDates: string;
  locale: string;
  todayShortcut: boolean;
  firstDayOfWeek: number;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderDatePicker = (args: DatePickerArgs) => /*html*/ `
  <mud-date-picker
    mode="${args.mode}"
    breakpoint="${args.breakpoint}"
    header-style="${args.headerStyle}"
    ${args.value ? `value="${args.value}"` : ''}
    ${args.rangeStart ? `range-start="${args.rangeStart}"` : ''}
    ${args.rangeEnd ? `range-end="${args.rangeEnd}"` : ''}
    ${args.min ? `min="${args.min}"` : ''}
    ${args.max ? `max="${args.max}"` : ''}
    ${args.disabledDates ? `disabled-dates='${args.disabledDates}'` : ''}
    ${args.locale ? `locale="${args.locale}"` : ''}
    first-day-of-week="${args.firstDayOfWeek}"
    ${args.todayShortcut ? 'today-shortcut' : ''}
  ></mud-date-picker>
`;

// ---------------------------------------------------------------------------
// Docs-source helpers — return clean web-component markup (no demo chrome,
// no wrapper divs, no inline styles) so the Storybook docs "Show code" panel
// shows what a consumer would actually paste into their HTML.
// ---------------------------------------------------------------------------

// The `disabledDates` control is free text; only a JSON array of strings reaches the snippet.
const parseDisabledDates = (value: string): string[] | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length && parsed.every(d => typeof d === 'string') ? parsed : null;
  } catch {
    return null;
  }
};

const docsSourceDefault = (args: DatePickerArgs) => {
  const disabledDates = args.disabledDates ? parseDisabledDates(args.disabledDates) : null;
  const attrs = [
    args.mode !== 'single' ? `mode="${args.mode}"` : '',
    args.breakpoint !== 'desktop' ? `breakpoint="${args.breakpoint}"` : '',
    args.headerStyle !== 'title' ? `header-style="${args.headerStyle}"` : '',
    args.value ? `value="${attr(args.value)}"` : '',
    args.rangeStart ? `range-start="${attr(args.rangeStart)}"` : '',
    args.rangeEnd ? `range-end="${attr(args.rangeEnd)}"` : '',
    args.min ? `min="${attr(args.min)}"` : '',
    args.max ? `max="${attr(args.max)}"` : '',
    disabledDates ? 'id="default-date-picker"' : '',
    args.locale ? `locale="${attr(args.locale)}"` : '',
    Number.isFinite(args.firstDayOfWeek) && args.firstDayOfWeek !== 1
      ? `first-day-of-week="${args.firstDayOfWeek}"`
      : '',
    args.todayShortcut ? 'today-shortcut' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const picker = attrs ? `<mud-date-picker ${attrs}></mud-date-picker>` : '<mud-date-picker></mud-date-picker>';
  // `disabledDates` is a property, not an attribute (readme props table), so it is set from a script.
  return disabledDates
    ? `${picker}
<script>
  document.getElementById('default-date-picker').disabledDates = ${jsValue(disabledDates)};
</script>`
    : picker;
};

const docsSourceSingle = /*html*/ `<mud-date-picker mode="single" value="2026-05-23"></mud-date-picker>`;

const docsSourceRange = /*html*/ `<mud-date-picker mode="range" range-start="2026-05-10" range-end="2026-05-18"></mud-date-picker>`;

const docsSourceMulti = /*html*/ `<mud-date-picker mode="multi" value='["2026-05-02","2026-05-09","2026-05-16","2026-05-23"]'></mud-date-picker>`;

const docsSourceWithMinMax = /*html*/ `<mud-date-picker mode="single" value="2026-05-15" min="2026-05-10" max="2026-05-25"></mud-date-picker>`;

// `disabledDates` is a property, not an attribute (readme props table), so it is set from a script.
const docsSourceWithDisabledDates = /*html*/ `<mud-date-picker id="disabled-dates-picker" mode="single" value="2026-05-15"></mud-date-picker>
<script>
  document.getElementById('disabled-dates-picker').disabledDates = [
    '2026-05-09',
    '2026-05-10',
    '2026-05-16',
    '2026-05-17',
    '2026-05-23',
    '2026-05-24',
  ];
</script>`;

const docsSourceMobile = /*html*/ `<mud-date-picker mode="single" breakpoint="mobile" header-style="dropdown" value="2026-05-23"></mud-date-picker>`;

const docsSourceDocked = /*html*/ `<mud-date-input label="Appointment date" value="23/05/2026"></mud-date-input>
<mud-date-picker mode="single" breakpoint="docked" value="2026-05-23"></mud-date-picker>`;

const docsSourceComposedWithDateInput = /*html*/ `<mud-date-input id="composed-input" label="Appointment date" placeholder="DD/MM/YYYY"></mud-date-input>
<mud-date-picker id="composed-picker" mode="single" breakpoint="desktop"></mud-date-picker>
<script>
  document.getElementById('composed-picker').addEventListener('mudChange', ev => {
    const iso = ev.detail.value;
    if (typeof iso !== 'string') return;
    const [y, m, d] = iso.split('-');
    document.getElementById('composed-input').value = d + '/' + m + '/' + y;
  });
</script>`;

const meta: Meta<DatePickerArgs> = {
  title: 'Components/Date Picker',
  component: 'mud-date-picker',
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
    headerStyle: {
      control: 'inline-radio',
      options: DATE_PICKER_HEADER_STYLES,
      description: 'Header presentation: single title vs month + year dropdown chips ("advanced").',
      table: { defaultValue: { summary: 'title' } },
    },
    value: { control: 'text', description: 'ISO YYYY-MM-DD (single) or comma-separated list (multi).' },
    rangeStart: { control: 'text', description: 'Range mode: ISO start date.' },
    rangeEnd: { control: 'text', description: 'Range mode: ISO end date.' },
    min: { control: 'text', description: 'Inclusive lower bound (ISO).' },
    max: { control: 'text', description: 'Inclusive upper bound (ISO).' },
    disabledDates: { control: 'text', description: 'JSON-encoded array of ISO dates to disable.' },
    locale: {
      control: 'select',
      options: ['', 'ro-MD', 'en-US', 'ru-MD'],
      description:
        'BCP-47 locale tag for weekday/month rendering and the "Today" shortcut language. Unset follows the closest ancestor `lang`, else `ro-MD`.',
    },
    firstDayOfWeek: { control: 'number', description: '0=Sunday, 1=Monday (default).' },
    todayShortcut: {
      control: 'boolean',
      description: 'Show the "Today" quick-jump shortcut. Not part of the Figma spec, so off by default.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;

type Story = StoryObj<DatePickerArgs>;

export const Default: Story = {
  render: renderDatePicker,
  args: {
    mode: 'single',
    breakpoint: 'desktop',
    headerStyle: 'title',
    value: '',
    rangeStart: '',
    rangeEnd: '',
    min: '',
    max: '',
    disabledDates: '',
    locale: '',
    firstDayOfWeek: 1,
    todayShortcut: false,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        // Omits attributes left at the component default so the snippet stays minimal as controls move.
        transform: (_code: string, { args }: { args: DatePickerArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8); align-items: flex-start;">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const Advanced: Story = {
  name: 'Advanced (dropdown header)',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24);">
      <mud-date-picker mode="single" header-style="dropdown" value="2026-05-23"></mud-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: '<mud-date-picker mode="single" header-style="dropdown" value="2026-05-23"></mud-date-picker>',
      },
      description: {
        story:
          'The "advanced" header replaces the single title with separate month + year dropdown chips. Each chip opens its own selection grid (month-picker / year-picker).',
      },
    },
  },
};

export const Single: Story = {
  name: 'Single',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24);">
      <mud-date-picker mode="single" value="2026-05-23"></mud-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceSingle },
      description: { story: 'Single-date selection — Romanian locale by default. Click any day to select.' },
    },
  },
};

export const Range: Story = {
  name: 'Range',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24);">
      <mud-date-picker mode="range" range-start="2026-05-10" range-end="2026-05-18"></mud-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceRange },
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
      <mud-date-picker mode="multi" value='["2026-05-02","2026-05-09","2026-05-16","2026-05-23"]'></mud-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceMulti },
      description: { story: 'Multi-date selection — click any day to toggle. Value is a JSON array.' },
    },
  },
};

export const WithMinMax: Story = {
  name: 'WithMinMax',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24);">
      <mud-date-picker
        mode="single"
        value="2026-05-15"
        min="2026-05-10"
        max="2026-05-25"
       
      ></mud-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceWithMinMax },
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
      <mud-date-picker
        mode="single"
        value="2026-05-15"
        disabled-dates='["2026-05-09","2026-05-10","2026-05-16","2026-05-17","2026-05-23","2026-05-24"]'
       
      ></mud-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceWithDisabledDates },
      description: {
        story:
          'Arbitrary disabled dates (e.g. holidays, blackout dates). The `disabled-dates` prop accepts a JSON array of ISO strings.',
      },
    },
  },
};

export const Mobile: Story = {
  name: 'Mobile',
  // SB10 selects the device frame via the viewport global.
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  render: () => /*html*/ `
    <div style="padding: var(--spacing-16); background: var(--color-background-base-secondary, #f5f5f5);">
      <mud-date-picker mode="single" breakpoint="mobile" header-style="dropdown" value="2026-05-23"></mud-date-picker>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceMobile },
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
      <mud-date-input label="Appointment date" value="23/05/2026"></mud-date-input>
      <div style="margin-top: var(--spacing-4);">
        <mud-date-picker mode="single" breakpoint="docked" value="2026-05-23"></mud-date-picker>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: docsSourceDocked },
      description: {
        story:
          'Compact docked variant intended to attach beneath a `mud-date-input`. No drop shadow — the input + picker share a single visual surface.',
      },
    },
  },
};

export const ComposedWithDateInput: Story = {
  name: 'ComposedWithDateInput',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 360px;" id="composed-host">
      <mud-date-input id="composed-input" label="Appointment date" placeholder="DD/MM/YYYY"></mud-date-input>
      <div style="margin-top: var(--spacing-8);">
        <mud-date-picker id="composed-picker" mode="single" breakpoint="desktop"></mud-date-picker>
      </div>
    </div>
    <script>
      (function () {
        requestAnimationFrame(() => {
          const input = document.getElementById('composed-input');
          const picker = document.getElementById('composed-picker');
          if (!input || !picker) return;
          picker.addEventListener('mudChange', ev => {
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
      source: { code: docsSourceComposedWithDateInput },
      description: {
        story:
          'Composition with `mud-date-input` — the picker emits `mudChange` with the canonical ISO date, the host wires that back into the input as a `DD/MM/YYYY` display value.',
      },
    },
  },
};

export const RomanianLocale: Story = {
  name: 'RomanianLocale',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); display: flex; gap: var(--spacing-32); flex-wrap: wrap;">
      ${cell('ro-MD (default)', /*html*/ `<mud-date-picker mode="single" value="2026-05-23"></mud-date-picker>`)}
      ${cell(
        'en-US',
        /*html*/ `<mud-date-picker mode="single" value="2026-05-23" locale="en-US" first-day-of-week="0"></mud-date-picker>`,
      )}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'All weekday + month names come from `Intl.DateTimeFormat` — switching the `locale` prop swaps the language without code changes. Romanian (ro-MD) starts weeks on Monday; en-US on Sunday.',
      },
      source: {
        code: [
          '<mud-date-picker value="2026-05-23"></mud-date-picker>',
          '<mud-date-picker value="2026-05-23" locale="en-US" first-day-of-week="0"></mud-date-picker>',
        ].join('\n'),
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
        /*html*/ `<mud-date-picker mode="single" value="2024-02-29"></mud-date-picker>`,
      )}
      ${cell(
        'Feb 2026 (non-leap year — 28 days)',
        /*html*/ `<mud-date-picker mode="single" value="2026-02-28"></mud-date-picker>`,
      )}
      ${cell(
        'Month boundary spillover (Dec → Jan)',
        /*html*/ `<mud-date-picker mode="single" value="2026-12-31"></mud-date-picker>`,
      )}
      ${cell(
        'Year boundary (Jan 1 with previous-month spillover)',
        /*html*/ `<mud-date-picker mode="single" value="2027-01-01"></mud-date-picker>`,
      )}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Calendar edge cases — leap-year February 29, non-leap February 28, and the December→January and year-boundary transitions. The grid always renders 6 rows; out-of-month days are inactive (Figma `.day-cell` Inactive) — the arrow keys still cross into the next month.',
      },
      source: {
        code: [
          '<mud-date-picker value="2024-02-29"></mud-date-picker>',
          '<mud-date-picker value="2026-02-28"></mud-date-picker>',
          '<mud-date-picker value="2026-12-31"></mud-date-picker>',
          '<mud-date-picker value="2027-01-01"></mud-date-picker>',
        ].join('\n'),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Locales — the month and weekday names, the first-day rule and the built-in Today label
// ---------------------------------------------------------------------------
const LOCALES = ['ro-MD', 'en-US', 'ru-MD'] as const;

const localesDatePicker = (locale: string) =>
  `<mud-date-picker locale="${locale}" mode="single" value="2026-05-15" today-shortcut></mud-date-picker>`;

export const Locales: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-24); padding: var(--spacing-24);">
      ${LOCALES.map(locale => cell(`locale="${locale}"`, localesDatePicker(locale))).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The same component under each supported locale. Only the built-in copy changes; content stays as written. This is the one place a story pins `locale` — every other story follows the Storybook toolbar.',
      },
      source: { code: LOCALES.map(localesDatePicker).join('\n') },
    },
  },
};
