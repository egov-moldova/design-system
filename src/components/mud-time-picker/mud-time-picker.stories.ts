import type { Meta, StoryObj } from '@storybook/web-components-vite';

type TimePickerArgs = {
  value: string;
  min: string;
  max: string;
  locale: string;
  label: string;
  hoursLabel: string;
  minutesLabel: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderTimePicker = (args: TimePickerArgs) => /*html*/ `
  <mud-time-picker
    ${args.value ? `value="${args.value}"` : ''}
    ${args.min ? `min="${args.min}"` : ''}
    ${args.max ? `max="${args.max}"` : ''}
    ${args.locale ? `locale="${args.locale}"` : ''}
    ${args.label ? `label="${args.label}"` : ''}
    ${args.hoursLabel ? `hours-label="${args.hoursLabel}"` : ''}
    ${args.minutesLabel ? `minutes-label="${args.minutesLabel}"` : ''}
  ></mud-time-picker>
`;

const docsSourceDefault = (args: TimePickerArgs) => {
  const attrs = [
    args.value ? `value="${args.value}"` : '',
    args.min ? `min="${args.min}"` : '',
    args.max ? `max="${args.max}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-time-picker${attrs ? ` ${attrs}` : ''}></mud-time-picker>`;
};

const meta: Meta<TimePickerArgs> = {
  title: 'Components/Time Picker',
  component: 'mud-time-picker',
  argTypes: {
    value: { control: 'text', description: 'Selected time, `HH:MM` (24-hour).' },
    min: { control: 'text', description: 'Earliest selectable time, `HH:MM` inclusive.' },
    max: { control: 'text', description: 'Latest selectable time, `HH:MM` inclusive.' },
    locale: {
      control: 'select',
      options: ['', 'ro-MD', 'en-US', 'ru-MD'],
      description: 'Language of the built-in copy. Unset follows the closest ancestor `lang`, else `ro-MD`.',
    },
    label: { control: 'text', description: "Accessible name of the picker. Overrides the locale's copy." },
    hoursLabel: { control: 'text', description: "Accessible name of the hour column. Overrides the locale's copy." },
    minutesLabel: {
      control: 'text',
      description: "Accessible name of the minute column. Overrides the locale's copy.",
    },
  },
};

export default meta;

type Story = StoryObj<TimePickerArgs>;

export const Default: Story = {
  render: renderTimePicker,
  args: {
    value: '11:15',
    min: '',
    max: '',
    locale: '',
    label: '',
    hoursLabel: '',
    minutesLabel: '',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The dropdown of the Figma Time frame (13810:9450). The selected value of the column being edited is solid; the other column’s selected value is tinted. Picking an hour moves on to the minutes while no minute is chosen, and stays on the hour when one is; picking a minute fires `mudChange` with the complete time. Each column is a listbox with one tab stop — Up / Down, Home / End, Left / Right between columns, Enter or Space to pick.',
      },
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: TimePickerArgs }) => docsSourceDefault(args),
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

export const States: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-40); padding: var(--spacing-24);">
      ${cell('empty', '<mud-time-picker></mud-time-picker>')}
      ${cell('selected (11:15)', '<mud-time-picker value="11:15"></mud-time-picker>')}
      ${cell('min 09:30 – max 17:00', '<mud-time-picker value="09:30" min="09:30" max="17:00"></mud-time-picker>')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Without a value both columns start at 00. With `min` / `max`, hours with no selectable minute and minutes outside the bounds for the chosen hour are inactive.',
      },
      source: {
        code: [
          '<mud-time-picker></mud-time-picker>',
          '<mud-time-picker value="11:15"></mud-time-picker>',
          '<mud-time-picker value="09:30" min="09:30" max="17:00"></mud-time-picker>',
        ].join('\n'),
      },
    },
  },
};

export const InTimeInput: Story = {
  name: 'In a time input',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 282px; min-height: 420px;">
      <mud-time-input size="lg" label="Ora programării" value="11:15"></mud-time-input>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'How the picker is usually met: `mud-time-input` opens it 8px under the field from its clock button (Figma Time frame 13810:9448). Picking a minute writes the time into the field and closes the dropdown; Escape closes it and returns focus to the clock button.',
      },
      source: {
        code: '<mud-time-input size="lg" label="Ora programării" value="11:15"></mud-time-input>',
      },
    },
  },
};
