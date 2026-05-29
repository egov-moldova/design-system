import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { INPUT_SIZES, INPUT_TYPES, INPUT_VARIANTS } from './mud-input.types';
import type { InputSize, InputType, InputVariant } from './mud-input.types';

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
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderInput = (args: InputArgs) => /*html*/ `
  <mud-input
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
  ></mud-input>
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
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-input ${attrs}></mud-input>`;
};

const meta: Meta<InputArgs> = {
  title: 'Atoms/Input/Text',
  component: 'mud-input',
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
          /*html*/ `<mud-input variant="${variant}" size="lg" label="Label" placeholder="Placeholder"></mud-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: INPUT_VARIANTS.map(
          v => `<mud-input variant="${v}" size="lg" label="Label" placeholder="Placeholder"></mud-input>`,
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
        cell(size, /*html*/ `<mud-input size="${size}" label="Label" placeholder="Placeholder"></mud-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: INPUT_SIZES.map(s => `<mud-input size="${s}" label="Label" placeholder="Placeholder"></mud-input>`).join(
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
        cell('default', /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder"></mud-input>`),
        cell('hover (use mouse)', /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder"></mud-input>`),
        cell('focus (use Tab)', /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder"></mud-input>`),
        cell('loading', /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder" loading></mud-input>`),
        cell('filled', /*html*/ `<mud-input size="lg" label="Label" value="15/04/2025"></mud-input>`),
        cell('read-only', /*html*/ `<mud-input size="lg" label="Label" value="15/04/2025" readonly></mud-input>`),
        cell('disabled', /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder" disabled></mud-input>`),
        cell(
          'mandatory',
          /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder" required></mud-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-input size="lg" label="Label" placeholder="Placeholder"></mud-input>',
          '<mud-input size="lg" label="Label" placeholder="Placeholder" loading></mud-input>',
          '<mud-input size="lg" label="Label" value="15/04/2025"></mud-input>',
          '<mud-input size="lg" label="Label" value="15/04/2025" readonly></mud-input>',
          '<mud-input size="lg" label="Label" placeholder="Placeholder" disabled></mud-input>',
          '<mud-input size="lg" label="Label" placeholder="Placeholder" required></mud-input>',
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
          /*html*/ `<mud-input variant="warning" size="lg" label="Sumă" value="9 500" helper-text="Această valoare ar putea cauza probleme"></mud-input>`,
        ),
        cell(
          'warning + placeholder',
          /*html*/ `<mud-input variant="warning" size="lg" label="Sumă" placeholder="0,00 MDL" helper-text="Verifică suma înainte de a continua"></mud-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-input variant="warning" size="lg" label="Sumă" value="9 500" helper-text="Această valoare ar putea cauza probleme"></mud-input>',
          '<mud-input variant="warning" size="lg" label="Sumă" placeholder="0,00 MDL" helper-text="Verifică suma înainte de a continua"></mud-input>',
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
          /*html*/ `<mud-input variant="success" size="lg" label="IDNP" value="2002004123456" helper-text="Verificat"></mud-input>`,
        ),
        cell(
          'success + placeholder',
          /*html*/ `<mud-input variant="success" size="lg" label="IDNP" placeholder="0000000000000" helper-text="Validat de Registrul de stat"></mud-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-input variant="success" size="lg" label="IDNP" value="2002004123456" helper-text="Verificat"></mud-input>',
          '<mud-input variant="success" size="lg" label="IDNP" placeholder="0000000000000" helper-text="Validat de Registrul de stat"></mud-input>',
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
          /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"></mud-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder" helper-text="Required field" required></mud-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-input size="lg" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"></mud-input>',
          '<mud-input size="lg" label="Label" placeholder="Placeholder" helper-text="Required field" required></mud-input>',
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
          /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"></mud-input>`,
        ),
        cell(
          'warning',
          /*html*/ `<mud-input size="lg" variant="warning" label="Label" placeholder="Placeholder" helper-text="Warning message displayed here"></mud-input>`,
        ),
        cell(
          'destructive',
          /*html*/ `<mud-input size="lg" variant="destructive" label="Label" placeholder="Placeholder" invalid error-text="Error message displayed here"></mud-input>`,
        ),
        cell(
          'success',
          /*html*/ `<mud-input size="lg" variant="success" label="Label" placeholder="Placeholder" helper-text="Success message displayed here"></mud-input>`,
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
          '<mud-input size="lg" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"></mud-input>',
          '<mud-input size="lg" variant="warning" label="Label" placeholder="Placeholder" helper-text="Warning message displayed here"></mud-input>',
          '<mud-input size="lg" variant="destructive" label="Label" placeholder="Placeholder" invalid error-text="Error message displayed here"></mud-input>',
          '<mud-input size="lg" variant="success" label="Label" placeholder="Placeholder" helper-text="Success message displayed here"></mud-input>',
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
          /*html*/ `<mud-input size="lg" label="Dată naștere" value="45/MM/YYYY" invalid error-text="Ziua trebuie să fie între 01 și 31"></mud-input>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<mud-input size="lg" variant="destructive" label="Label" placeholder="Placeholder" error-text="Câmpul este obligatoriu" invalid></mud-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-input size="lg" label="Dată naștere" value="45/MM/YYYY" invalid error-text="Ziua trebuie să fie între 01 și 31"></mud-input>',
          '<mud-input size="lg" variant="destructive" label="Label" placeholder="Placeholder" error-text="Câmpul este obligatoriu" invalid></mud-input>',
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
          /*html*/ `<mud-input size="lg" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></mud-input>`,
        ),
        cell(
          'default (md)',
          /*html*/ `<mud-input size="md" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></mud-input>`,
        ),
        cell(
          'warning + loading',
          /*html*/ `<mud-input variant="warning" size="lg" label="Sumă" value="9 500" loading helper-text="Se verifică…"></mud-input>`,
        ),
        cell(
          'success + loading',
          /*html*/ `<mud-input variant="success" size="lg" label="Cod" value="MD-12345" loading helper-text="Se confirmă…"></mud-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-input size="lg" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></mud-input>',
          '<mud-input size="md" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></mud-input>',
          '<mud-input variant="warning" size="lg" label="Sumă" value="9 500" loading helper-text="Se verifică…"></mud-input>',
          '<mud-input variant="success" size="lg" label="Cod" value="MD-12345" loading helper-text="Se confirmă…"></mud-input>',
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
          /*html*/ `<mud-input size="lg" label="IDNP" value="2002004123456" readonly helper-text="Câmp doar pentru citire"></mud-input>`,
        ),
        cell(
          'read-only (md)',
          /*html*/ `<mud-input size="md" label="IDNP" value="2002004123456" readonly></mud-input>`,
        ),
        cell(
          'disabled (for comparison)',
          /*html*/ `<mud-input size="lg" label="IDNP" value="2002004123456" disabled helper-text="Câmp dezactivat"></mud-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-input size="lg" label="IDNP" value="2002004123456" readonly helper-text="Câmp doar pentru citire"></mud-input>',
          '<mud-input size="md" label="IDNP" value="2002004123456" readonly></mud-input>',
          '<mud-input size="lg" label="IDNP" value="2002004123456" disabled helper-text="Câmp dezactivat"></mud-input>',
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
          /*html*/ `<mud-input size="lg" label="Search" placeholder="Search">
            <mud-icon slot="icon-start" name="search" size="20"></mud-icon>
          </mud-input>`,
        ),
        cell(
          'icon-end',
          /*html*/ `<mud-input size="lg" label="Date" placeholder="Placeholder">
            <mud-icon slot="icon-end" name="calendar" size="24"></mud-icon>
          </mud-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-input size="lg" label="Search" placeholder="Search"><mud-icon slot="icon-start" name="search" size="20"></mud-icon></mud-input>',
          '<mud-input size="lg" label="Date" placeholder="Placeholder"><mud-icon slot="icon-end" name="calendar" size="24"></mud-icon></mud-input>',
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
          /*html*/ `<mud-input size="lg" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services" placeholder="Placeholder"></mud-input>`,
        ),
        cell(
          'helper truncation (two lines)',
          /*html*/ `<mud-input size="lg" label="Label" placeholder="Placeholder" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></mud-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-input size="lg" label="…long label…" placeholder="Placeholder"></mud-input>',
          '<mud-input size="lg" label="Label" placeholder="Placeholder" helper-text="…long helper text…"></mud-input>',
        ].join('\n'),
      },
    },
  },
};
