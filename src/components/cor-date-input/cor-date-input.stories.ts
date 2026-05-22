import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { DATE_INPUT_FORMATS, DATE_INPUT_SIZES, DATE_INPUT_VARIANTS } from './cor-date-input.types';
import type { DateInputFormat, DateInputSize, DateInputVariant } from './cor-date-input.types';

type DateInputArgs = {
  variant: DateInputVariant;
  size: DateInputSize;
  format: DateInputFormat;
  label: string;
  placeholder: string;
  value: string;
  helperText: string;
  errorText: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderDateInput = (args: DateInputArgs) => /*html*/ `
  <cor-date-input
    variant="${args.variant}"
    size="${args.size}"
    format="${args.format}"
    label="${args.label}"
    placeholder="${args.placeholder}"
    value="${args.value}"
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.readonly ? 'readonly' : ''}
    ${args.invalid ? 'invalid' : ''}
  ></cor-date-input>
`;

const docsSourceDefault = (args: DateInputArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.format !== 'DD/MM/YYYY' ? `format="${args.format}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.invalid ? 'invalid' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<cor-date-input ${attrs}></cor-date-input>`;
};

const meta: Meta<DateInputArgs> = {
  title: 'Molecules/Date Input',
  component: 'cor-date-input',
  argTypes: {
    variant: {
      control: 'select',
      options: DATE_INPUT_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: DATE_INPUT_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    format: {
      control: 'select',
      options: DATE_INPUT_FORMATS,
      description: 'Display format pattern.',
      table: { defaultValue: { summary: 'DD/MM/YYYY' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<DateInputArgs>;

export const Default: Story = {
  render: renderDateInput,
  args: {
    variant: 'default',
    size: 'lg',
    format: 'DD/MM/YYYY',
    label: 'Label',
    placeholder: '',
    value: '',
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: DateInputArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 282px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 720px;">
    ${children}
  </div>
`;

const wrapTriple = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 282px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 1080px;">
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
      DATE_INPUT_VARIANTS.map(variant =>
        cell(variant, /*html*/ `<cor-date-input variant="${variant}" size="lg" label="Label"></cor-date-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: DATE_INPUT_VARIANTS.map(
          v => `<cor-date-input variant="${v}" size="lg" label="Label"></cor-date-input>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      DATE_INPUT_SIZES.map(size =>
        cell(size, /*html*/ `<cor-date-input size="${size}" label="Label"></cor-date-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: DATE_INPUT_SIZES.map(s => `<cor-date-input size="${s}" label="Label"></cor-date-input>`).join('\n'),
      },
    },
  },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell('default: default', /*html*/ `<cor-date-input size="lg" label="Label"></cor-date-input>`),
        cell(
          'default: filled',
          /*html*/ `<cor-date-input size="lg" label="Label" value="15/04/2025"></cor-date-input>`,
        ),
        cell('default: disabled', /*html*/ `<cor-date-input size="lg" label="Label" disabled></cor-date-input>`),
        cell(
          'default: readonly',
          /*html*/ `<cor-date-input size="lg" label="Label" value="15/04/2025" readonly></cor-date-input>`,
        ),
        cell('default: mandatory', /*html*/ `<cor-date-input size="lg" label="Label" required></cor-date-input>`),
        cell(
          'destructive: default',
          /*html*/ `<cor-date-input variant="destructive" size="lg" label="Label"></cor-date-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-date-input size="lg" label="Label"></cor-date-input>',
          '<cor-date-input size="lg" label="Label" value="15/04/2025"></cor-date-input>',
          '<cor-date-input size="lg" label="Label" disabled></cor-date-input>',
          '<cor-date-input size="lg" label="Label" value="15/04/2025" readonly></cor-date-input>',
          '<cor-date-input size="lg" label="Label" required></cor-date-input>',
          '<cor-date-input variant="destructive" size="lg" label="Label"></cor-date-input>',
        ].join('\n'),
      },
    },
  },
};

export const SegmentFocusStates: Story = {
  name: 'Segment Focus States',
  render: () => {
    const fixId = 'cor-date-input-focus-fixture';
    // After render, autofocus the first input that opted into focus via the
    // `data-autofocus` attribute. Each cell uses a different `value` to land
    // the caret in a different segment.
    const focusScript = /*html*/ `
      <script>
        (function() {
          requestAnimationFrame(() => {
            const targets = document.querySelectorAll('[data-autofocus]');
            const first = targets[0];
            if (!first) return;
            first.focus();
          });
        })();
      </script>
    `;
    return (
      wrapTriple(
        [
          cell(
            'focus: empty',
            /*html*/ `<cor-date-input id="${fixId}" data-autofocus size="lg" label="Label"></cor-date-input>`,
          ),
          cell(
            'focus: date-populated',
            /*html*/ `<cor-date-input size="lg" label="Label" value="15/"></cor-date-input>`,
          ),
          cell(
            'focus: month-populated',
            /*html*/ `<cor-date-input size="lg" label="Label" value="15/04/"></cor-date-input>`,
          ),
          cell(
            'focus: fully-populated',
            /*html*/ `<cor-date-input size="lg" label="Label" value="15/04/2025"></cor-date-input>`,
          ),
          cell(
            'default: hover (filled)',
            /*html*/ `<cor-date-input size="lg" label="Label" value="15/04/2025"></cor-date-input>`,
          ),
          cell(
            'backspace (mid-segment)',
            /*html*/ `<cor-date-input size="lg" label="Label" value="15/04/20"></cor-date-input>`,
          ),
        ].join(''),
      ) + focusScript
    );
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Per-segment focus states. The first cell receives focus on render so the focus ring + caret are visible; the remaining cells demonstrate ghost remnant + filled visuals.',
      },
      source: {
        code: [
          '<cor-date-input size="lg" label="Label"></cor-date-input> <!-- focused, empty -->',
          '<cor-date-input size="lg" label="Label" value="15/"></cor-date-input>',
          '<cor-date-input size="lg" label="Label" value="15/04/"></cor-date-input>',
          '<cor-date-input size="lg" label="Label" value="15/04/2025"></cor-date-input>',
        ].join('\n'),
      },
    },
  },
};

export const Validation: Story = {
  name: 'Validation',
  render: () =>
    wrapTriple(
      [
        cell(
          'DD-error',
          /*html*/ `<cor-date-input size="lg" label="Label" value="45/" invalid error-text="Day must be between 01 and 31"></cor-date-input>`,
        ),
        cell(
          'MM-error',
          /*html*/ `<cor-date-input size="lg" label="Label" value="15/18/" invalid error-text="Month must be between 01 and 12"></cor-date-input>`,
        ),
        cell(
          'YYYY-error',
          /*html*/ `<cor-date-input size="lg" label="Label" value="15/04/1550" invalid error-text="Enter a valid year"></cor-date-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Per-segment error patterns from the Figma docs page. Each variant maps a specific message to the segment that failed validation.',
      },
      source: {
        code: [
          '<cor-date-input size="lg" label="Label" value="45/" invalid error-text="Day must be between 01 and 31"></cor-date-input>',
          '<cor-date-input size="lg" label="Label" value="15/18/" invalid error-text="Month must be between 01 and 12"></cor-date-input>',
          '<cor-date-input size="lg" label="Label" value="15/04/1550" invalid error-text="Enter a valid year"></cor-date-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithHelperText: Story = {
  name: 'With Helper Text',
  render: () =>
    wrap(
      [
        cell(
          'default',
          /*html*/ `<cor-date-input size="lg" label="Label" helper-text="Helper message displayed here"></cor-date-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<cor-date-input size="lg" label="Label" required helper-text="Required field"></cor-date-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-date-input size="lg" label="Label" helper-text="Helper message displayed here"></cor-date-input>',
          '<cor-date-input size="lg" label="Label" required helper-text="Required field"></cor-date-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithError: Story = {
  name: 'With Error',
  render: () =>
    wrap(
      [
        cell(
          'invalid + error message',
          /*html*/ `<cor-date-input size="lg" label="Label" value="45/" invalid error-text="Day must be between 01 and 31"></cor-date-input>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<cor-date-input variant="destructive" size="lg" label="Label" error-text="Error message displayed here" invalid></cor-date-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-date-input size="lg" label="Label" value="45/" invalid error-text="Day must be between 01 and 31"></cor-date-input>',
          '<cor-date-input variant="destructive" size="lg" label="Label" error-text="Error message displayed here" invalid></cor-date-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithMinMax: Story = {
  name: 'With Min / Max',
  render: () =>
    wrap(
      [
        cell(
          'today onward (min only)',
          /*html*/ `<cor-date-input size="lg" label="Pick a future date" min="2025-04-15" helper-text="Min 15/04/2025"></cor-date-input>`,
        ),
        cell(
          'bounded range',
          /*html*/ `<cor-date-input size="lg" label="Pick a date in 2025" min="2025-01-01" max="2025-12-31" helper-text="01/01/2025 — 31/12/2025"></cor-date-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-date-input size="lg" label="Pick a future date" min="2025-04-15"></cor-date-input>',
          '<cor-date-input size="lg" label="Pick a date in 2025" min="2025-01-01" max="2025-12-31"></cor-date-input>',
        ].join('\n'),
      },
    },
  },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () =>
    wrap(
      [
        cell(
          'label truncation (single line)',
          /*html*/ `<cor-date-input size="lg" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services"></cor-date-input>`,
        ),
        cell(
          'assistive truncation (two lines)',
          /*html*/ `<cor-date-input size="lg" label="Label" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></cor-date-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-date-input size="lg" label="…long label…"></cor-date-input>',
          '<cor-date-input size="lg" label="Label" helper-text="…long helper text…"></cor-date-input>',
        ].join('\n'),
      },
    },
  },
};
