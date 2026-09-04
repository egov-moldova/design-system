import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { INPUT_SIZES, INPUT_TYPES, INPUT_VARIANTS } from './mud-text-input.types';
import type { InputSize, InputType, InputVariant } from './mud-text-input.types';

type InputArgs = {
  variant: InputVariant;
  size: InputSize;
  type: InputType;
  label: string;
  placeholder: string;
  value: string;
  helperText: string;
  errorText: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  loading: boolean;
  invalid: boolean;
  clearable: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderInput = (args: InputArgs) => /*html*/ `
  <mud-text-input
    variant="${args.variant}"
    size="${args.size}"
    type="${args.type}"
    label="${args.label}"
    placeholder="${args.placeholder}"
    value="${args.value}"
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.readonly ? 'readonly' : ''}
    ${args.loading ? 'loading' : ''}
    ${args.invalid ? 'invalid' : ''}
    ${args.clearable ? 'clearable' : ''}
  ></mud-text-input>
`;

const docsSourceDefault = (args: InputArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.type !== 'text' ? `type="${args.type}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.loading ? 'loading' : '',
    args.invalid ? 'invalid' : '',
    args.clearable ? 'clearable' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-text-input ${attrs}></mud-text-input>`;
};

const meta: Meta<InputArgs> = {
  title: 'Atoms/Input/Text',
  component: 'mud-text-input',
  argTypes: {
    variant: {
      control: 'select',
      options: INPUT_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: INPUT_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    type: {
      control: 'select',
      options: INPUT_TYPES,
      description: 'Native `type`.',
      table: { defaultValue: { summary: 'text' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    loading: { control: 'boolean' },
    invalid: { control: 'boolean' },
    clearable: { control: 'boolean', description: 'Shows a trailing clear (×) button while the field holds a value.' },
  },
};

export default meta;

type Story = StoryObj<InputArgs>;

export const Default: Story = {
  render: renderInput,
  args: {
    variant: 'default',
    size: 'lg',
    type: 'text',
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
    readonly: false,
    loading: false,
    invalid: false,
    clearable: false,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: InputArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 282px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 720px;">
    ${children}
  </div>
`;

const wrapWide = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 220px)); gap: var(--spacing-32) var(--spacing-24); padding: var(--spacing-24); max-width: 1040px;">
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
    wrapWide(
      INPUT_VARIANTS.map(variant =>
        cell(
          variant,
          /*html*/ `<mud-text-input variant="${variant}" size="lg" label="Label" placeholder="Placeholder"></mud-text-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: INPUT_VARIANTS.map(
          v => `<mud-text-input variant="${v}" size="lg" label="Label" placeholder="Placeholder"></mud-text-input>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      INPUT_SIZES.map(size =>
        cell(size, /*html*/ `<mud-text-input size="${size}" label="Label" placeholder="Placeholder"></mud-text-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: INPUT_SIZES.map(s => `<mud-text-input size="${s}" label="Label" placeholder="Placeholder"></mud-text-input>`).join(
          '\n',
        ),
      },
    },
  },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell('default', /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder"></mud-text-input>`),
        cell('hover (use mouse)', /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder"></mud-text-input>`),
        cell('focus (use Tab)', /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder"></mud-text-input>`),
        cell('loading', /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder" loading></mud-text-input>`),
        cell('filled', /*html*/ `<mud-text-input size="lg" label="Label" value="15/04/2025"></mud-text-input>`),
        cell('read-only', /*html*/ `<mud-text-input size="lg" label="Label" value="15/04/2025" readonly></mud-text-input>`),
        cell('disabled', /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder" disabled></mud-text-input>`),
        cell(
          'mandatory',
          /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder" required></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-text-input size="lg" label="Label" placeholder="Placeholder"></mud-text-input>',
          '<mud-text-input size="lg" label="Label" placeholder="Placeholder" loading></mud-text-input>',
          '<mud-text-input size="lg" label="Label" value="15/04/2025"></mud-text-input>',
          '<mud-text-input size="lg" label="Label" value="15/04/2025" readonly></mud-text-input>',
          '<mud-text-input size="lg" label="Label" placeholder="Placeholder" disabled></mud-text-input>',
          '<mud-text-input size="lg" label="Label" placeholder="Placeholder" required></mud-text-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithWarning: Story = {
  name: 'With Warning',
  render: () =>
    wrap(
      [
        cell(
          'warning',
          /*html*/ `<mud-text-input variant="warning" size="lg" label="Sumă" value="9 500" helper-text="Această valoare ar putea cauza probleme"></mud-text-input>`,
        ),
        cell(
          'warning + placeholder',
          /*html*/ `<mud-text-input variant="warning" size="lg" label="Sumă" placeholder="0,00 MDL" helper-text="Verifică suma înainte de a continua"></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-text-input variant="warning" size="lg" label="Sumă" value="9 500" helper-text="Această valoare ar putea cauza probleme"></mud-text-input>',
          '<mud-text-input variant="warning" size="lg" label="Sumă" placeholder="0,00 MDL" helper-text="Verifică suma înainte de a continua"></mud-text-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithSuccess: Story = {
  name: 'With Success',
  render: () =>
    wrap(
      [
        cell(
          'success',
          /*html*/ `<mud-text-input variant="success" size="lg" label="IDNP" value="2002004123456" helper-text="Verificat"></mud-text-input>`,
        ),
        cell(
          'success + placeholder',
          /*html*/ `<mud-text-input variant="success" size="lg" label="IDNP" placeholder="0000000000000" helper-text="Validat de Registrul de stat"></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-text-input variant="success" size="lg" label="IDNP" value="2002004123456" helper-text="Verificat"></mud-text-input>',
          '<mud-text-input variant="success" size="lg" label="IDNP" placeholder="0000000000000" helper-text="Validat de Registrul de stat"></mud-text-input>',
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
          /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"></mud-text-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder" helper-text="Required field" required></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-text-input size="lg" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"></mud-text-input>',
          '<mud-text-input size="lg" label="Label" placeholder="Placeholder" helper-text="Required field" required></mud-text-input>',
        ].join('\n'),
      },
    },
  },
};

export const AssistiveText: Story = {
  name: 'Assistive Text',
  render: () =>
    wrapWide(
      [
        cell(
          'default',
          /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"></mud-text-input>`,
        ),
        cell(
          'warning',
          /*html*/ `<mud-text-input size="lg" variant="warning" label="Label" placeholder="Placeholder" helper-text="Warning message displayed here"></mud-text-input>`,
        ),
        cell(
          'destructive',
          /*html*/ `<mud-text-input size="lg" variant="destructive" label="Label" placeholder="Placeholder" invalid error-text="Error message displayed here"></mud-text-input>`,
        ),
        cell(
          'success',
          /*html*/ `<mud-text-input size="lg" variant="success" label="Label" placeholder="Placeholder" helper-text="Success message displayed here"></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Each variant pairs its assistive text with a matching icon: helper (no icon), warning (triangle), destructive (error circle), success (check circle). Mirrors the Figma "Assistive Text" reference.',
      },
      source: {
        code: [
          '<mud-text-input size="lg" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"></mud-text-input>',
          '<mud-text-input size="lg" variant="warning" label="Label" placeholder="Placeholder" helper-text="Warning message displayed here"></mud-text-input>',
          '<mud-text-input size="lg" variant="destructive" label="Label" placeholder="Placeholder" invalid error-text="Error message displayed here"></mud-text-input>',
          '<mud-text-input size="lg" variant="success" label="Label" placeholder="Placeholder" helper-text="Success message displayed here"></mud-text-input>',
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
          /*html*/ `<mud-text-input size="lg" label="Dată naștere" value="45/MM/YYYY" invalid error-text="Ziua trebuie să fie între 01 și 31"></mud-text-input>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<mud-text-input size="lg" variant="destructive" label="Label" placeholder="Placeholder" error-text="Câmpul este obligatoriu" invalid></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-text-input size="lg" label="Dată naștere" value="45/MM/YYYY" invalid error-text="Ziua trebuie să fie între 01 și 31"></mud-text-input>',
          '<mud-text-input size="lg" variant="destructive" label="Label" placeholder="Placeholder" error-text="Câmpul este obligatoriu" invalid></mud-text-input>',
        ].join('\n'),
      },
    },
  },
};

export const Loading: Story = {
  name: 'Loading',
  render: () =>
    wrap(
      [
        cell(
          'default (lg)',
          /*html*/ `<mud-text-input size="lg" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></mud-text-input>`,
        ),
        cell(
          'default (md)',
          /*html*/ `<mud-text-input size="md" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></mud-text-input>`,
        ),
        cell(
          'warning + loading',
          /*html*/ `<mud-text-input variant="warning" size="lg" label="Sumă" value="9 500" loading helper-text="Se verifică…"></mud-text-input>`,
        ),
        cell(
          'success + loading',
          /*html*/ `<mud-text-input variant="success" size="lg" label="Cod" value="MD-12345" loading helper-text="Se confirmă…"></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-text-input size="lg" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></mud-text-input>',
          '<mud-text-input size="md" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></mud-text-input>',
          '<mud-text-input variant="warning" size="lg" label="Sumă" value="9 500" loading helper-text="Se verifică…"></mud-text-input>',
          '<mud-text-input variant="success" size="lg" label="Cod" value="MD-12345" loading helper-text="Se confirmă…"></mud-text-input>',
        ].join('\n'),
      },
    },
  },
};

export const ReadOnly: Story = {
  name: 'Read-Only',
  render: () =>
    wrap(
      [
        cell(
          'read-only (lg)',
          /*html*/ `<mud-text-input size="lg" label="IDNP" value="2002004123456" readonly helper-text="Câmp doar pentru citire"></mud-text-input>`,
        ),
        cell(
          'read-only (md)',
          /*html*/ `<mud-text-input size="md" label="IDNP" value="2002004123456" readonly></mud-text-input>`,
        ),
        cell(
          'disabled (for comparison)',
          /*html*/ `<mud-text-input size="lg" label="IDNP" value="2002004123456" disabled helper-text="Câmp dezactivat"></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-text-input size="lg" label="IDNP" value="2002004123456" readonly helper-text="Câmp doar pentru citire"></mud-text-input>',
          '<mud-text-input size="md" label="IDNP" value="2002004123456" readonly></mud-text-input>',
          '<mud-text-input size="lg" label="IDNP" value="2002004123456" disabled helper-text="Câmp dezactivat"></mud-text-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithIcons: Story = {
  name: 'With Icons',
  render: () =>
    wrap(
      [
        cell(
          'icon-start',
          /*html*/ `<mud-text-input size="lg" label="Search" placeholder="Search">
            <mud-icon slot="icon-start" name="search" size="20"></mud-icon>
          </mud-text-input>`,
        ),
        cell(
          'icon-end',
          /*html*/ `<mud-text-input size="lg" label="Date" placeholder="Placeholder">
            <mud-icon slot="icon-end" name="calendar" size="24"></mud-icon>
          </mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-text-input size="lg" label="Search" placeholder="Search"><mud-icon slot="icon-start" name="search" size="20"></mud-icon></mud-text-input>',
          '<mud-text-input size="lg" label="Date" placeholder="Placeholder"><mud-icon slot="icon-end" name="calendar" size="24"></mud-icon></mud-text-input>',
        ].join('\n'),
      },
    },
  },
};

export const Clearable: Story = {
  name: 'Clearable',
  render: () =>
    wrap(
      [
        cell(
          'filled — clear visible',
          /*html*/ `<mud-text-input size="lg" label="Search" value="Chișinău" clearable placeholder="Search"></mud-text-input>`,
        ),
        cell(
          'empty — clear hidden',
          /*html*/ `<mud-text-input size="lg" label="Search" clearable placeholder="Type to reveal ×"></mud-text-input>`,
        ),
        cell(
          'with leading icon',
          /*html*/ `<mud-text-input size="lg" label="Search" value="Bălți" clearable placeholder="Search">
            <mud-icon slot="icon-start" name="search" size="20"></mud-icon>
          </mud-text-input>`,
        ),
        cell(
          'md size',
          /*html*/ `<mud-text-input size="md" label="Search" value="Orhei" clearable placeholder="Search"></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The clear (×) button appears as a trailing affordance while the field holds a value. Clearing empties the field, emits `mudInput` + `mudChange`, and returns focus to the input. Hidden when disabled, read-only, or loading. Mirrors the Figma "Clearing Input" reference.',
      },
      source: {
        code: [
          '<mud-text-input size="lg" label="Search" value="Chișinău" clearable placeholder="Search"></mud-text-input>',
          '<mud-text-input size="lg" label="Search" clearable placeholder="Type to reveal ×"></mud-text-input>',
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
          /*html*/ `<mud-text-input size="lg" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services" placeholder="Placeholder"></mud-text-input>`,
        ),
        cell(
          'helper truncation (two lines)',
          /*html*/ `<mud-text-input size="lg" label="Label" placeholder="Placeholder" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></mud-text-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-text-input size="lg" label="…long label…" placeholder="Placeholder"></mud-text-input>',
          '<mud-text-input size="lg" label="Label" placeholder="Placeholder" helper-text="…long helper text…"></mud-text-input>',
        ].join('\n'),
      },
    },
  },
};
