import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TIME_INPUT_SIZES, TIME_INPUT_VARIANTS } from './mud-time-input.types';
import type { TimeInputSize, TimeInputVariant } from './mud-time-input.types';

type TimeInputArgs = {
  variant: TimeInputVariant;
  size: TimeInputSize;
  label: string;
  placeholder: string;
  value: string;
  min: string;
  max: string;
  helperText: string;
  errorText: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  clearable: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderTimeInput = (args: TimeInputArgs) => /*html*/ `
  <mud-time-input
    variant="${args.variant}"
    size="${args.size}"
    label="${args.label}"
    placeholder="${args.placeholder}"
    value="${args.value}"
    ${args.min ? `min="${args.min}"` : ''}
    ${args.max ? `max="${args.max}"` : ''}
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.readonly ? 'readonly' : ''}
    ${args.invalid ? 'invalid' : ''}
    ${args.clearable ? 'clearable' : ''}
  ></mud-time-input>
`;

const docsSourceDefault = (args: TimeInputArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.min ? `min="${args.min}"` : '',
    args.max ? `max="${args.max}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.invalid ? 'invalid' : '',
    args.clearable ? 'clearable' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-time-input ${attrs}></mud-time-input>`;
};

const meta: Meta<TimeInputArgs> = {
  title: 'Atoms/Input/Time',
  component: 'mud-time-input',
  argTypes: {
    variant: {
      control: 'select',
      options: TIME_INPUT_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: TIME_INPUT_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    placeholder: { control: 'text' },
    value: { control: 'text', description: '`HH:MM`, 24-hour.' },
    min: { control: 'text', description: 'Earliest accepted time, `HH:MM`.' },
    max: { control: 'text', description: 'Latest accepted time, `HH:MM`.' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    clearable: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<TimeInputArgs>;

export const Default: Story = {
  render: renderTimeInput,
  args: {
    variant: 'default',
    size: 'lg',
    label: 'Label',
    placeholder: '',
    value: '',
    min: '',
    max: '',
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
    clearable: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Figma `time-input` (13810:9195). Type the digits — the `:` is written for you, and `:` after a single hour digit pads it (`9` + `:` → `09:`). The clock button opens `mud-time-picker`; picking an hour then a minute fills the field and closes it.',
      },
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: TimeInputArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 282px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 720px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const AllVariants: Story = {
  name: 'All Variants',
  render: () =>
    wrap(
      TIME_INPUT_VARIANTS.map(variant =>
        cell(variant, /*html*/ `<mud-time-input variant="${variant}" size="lg" label="Label"></mud-time-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TIME_INPUT_VARIANTS.map(
          v => `<mud-time-input variant="${v}" size="lg" label="Label"></mud-time-input>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      TIME_INPUT_SIZES.map(size =>
        cell(size, /*html*/ `<mud-time-input size="${size}" label="Label"></mud-time-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TIME_INPUT_SIZES.map(s => `<mud-time-input size="${s}" label="Label"></mud-time-input>`).join('\n'),
      },
    },
  },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell('default: default', /*html*/ `<mud-time-input size="lg" label="Label"></mud-time-input>`),
        cell('default: filled', /*html*/ `<mud-time-input size="lg" label="Label" value="11:15"></mud-time-input>`),
        cell('default: disabled', /*html*/ `<mud-time-input size="lg" label="Label" disabled></mud-time-input>`),
        cell(
          'default: readonly',
          /*html*/ `<mud-time-input size="lg" label="Label" value="11:15" readonly></mud-time-input>`,
        ),
        cell('default: mandatory', /*html*/ `<mud-time-input size="lg" label="Label" required></mud-time-input>`),
        cell(
          'default: clearable',
          /*html*/ `<mud-time-input size="lg" label="Label" value="11:15" clearable></mud-time-input>`,
        ),
        cell(
          'destructive: default',
          /*html*/ `<mud-time-input variant="destructive" size="lg" label="Label"></mud-time-input>`,
        ),
        cell(
          'destructive: error text',
          /*html*/ `<mud-time-input size="lg" label="Label" invalid error-text="Error message displayed here"></mud-time-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-time-input size="lg" label="Label"></mud-time-input>',
          '<mud-time-input size="lg" label="Label" value="11:15"></mud-time-input>',
          '<mud-time-input size="lg" label="Label" disabled></mud-time-input>',
          '<mud-time-input size="lg" label="Label" value="11:15" readonly></mud-time-input>',
          '<mud-time-input size="lg" label="Label" required></mud-time-input>',
          '<mud-time-input size="lg" label="Label" value="11:15" clearable></mud-time-input>',
          '<mud-time-input variant="destructive" size="lg" label="Label"></mud-time-input>',
          '<mud-time-input size="lg" label="Label" invalid error-text="Error message displayed here"></mud-time-input>',
        ].join('\n'),
      },
    },
  },
};

export const Validation: Story = {
  name: 'Validation',
  render: () =>
    wrap(
      [
        cell('HH-error', /*html*/ `<mud-time-input size="lg" label="Label" value="25"></mud-time-input>`),
        cell('MM-error', /*html*/ `<mud-time-input size="lg" label="Label" value="11:75"></mud-time-input>`),
        cell(
          'range-error (min 09:00, max 18:00)',
          /*html*/ `<mud-time-input size="lg" label="Label" min="09:00" max="18:00" value="19:30"></mud-time-input>`,
        ),
        cell(
          'with helper text',
          /*html*/ `<mud-time-input size="lg" label="Label" min="09:00" max="18:00" helper-text="Program: 09:00 – 18:00"></mud-time-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Real-time segment validation, as in `mud-date-input`: a complete hour outside 00–23, minutes outside 00–59, or a time outside `min` / `max` turns the field destructive and shows a message. Override the messages with `hour-error-text`, `minute-error-text` and `range-error-text`; a consumer `invalid` + `error-text` still wins.',
      },
      source: {
        code: [
          '<mud-time-input size="lg" label="Label" value="25"></mud-time-input>',
          '<mud-time-input size="lg" label="Label" value="11:75"></mud-time-input>',
          '<mud-time-input size="lg" label="Label" min="09:00" max="18:00" value="19:30"></mud-time-input>',
        ].join('\n'),
      },
    },
  },
};
