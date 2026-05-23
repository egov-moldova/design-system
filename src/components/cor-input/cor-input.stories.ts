import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { INPUT_SIZES, INPUT_TYPES, INPUT_VARIANTS } from './cor-input.types';
import type { InputSize, InputType, InputVariant } from './cor-input.types';

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
  <cor-input
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
  ></cor-input>
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
  return `<cor-input ${attrs}></cor-input>`;
};

const meta: Meta<InputArgs> = {
  title: 'Atoms/Input/Text',
  component: 'cor-input',
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
    placeholder: 'DD/MM/YYYY',
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
          /*html*/ `<cor-input variant="${variant}" size="lg" label="Label" placeholder="DD/MM/YYYY"></cor-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: INPUT_VARIANTS.map(
          v => `<cor-input variant="${v}" size="lg" label="Label" placeholder="DD/MM/YYYY"></cor-input>`,
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
        cell(size, /*html*/ `<cor-input size="${size}" label="Label" placeholder="DD/MM/YYYY"></cor-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: INPUT_SIZES.map(s => `<cor-input size="${s}" label="Label" placeholder="DD/MM/YYYY"></cor-input>`).join(
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
        cell('default', /*html*/ `<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY"></cor-input>`),
        cell('hover (use mouse)', /*html*/ `<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY"></cor-input>`),
        cell('focus (use Tab)', /*html*/ `<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY"></cor-input>`),
        cell('loading', /*html*/ `<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" loading></cor-input>`),
        cell('filled', /*html*/ `<cor-input size="lg" label="Label" value="15/04/2025"></cor-input>`),
        cell('read-only', /*html*/ `<cor-input size="lg" label="Label" value="15/04/2025" readonly></cor-input>`),
        cell('disabled', /*html*/ `<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" disabled></cor-input>`),
        cell('mandatory', /*html*/ `<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" required></cor-input>`),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY"></cor-input>',
          '<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" loading></cor-input>',
          '<cor-input size="lg" label="Label" value="15/04/2025"></cor-input>',
          '<cor-input size="lg" label="Label" value="15/04/2025" readonly></cor-input>',
          '<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" disabled></cor-input>',
          '<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" required></cor-input>',
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
          /*html*/ `<cor-input variant="warning" size="lg" label="Sumă" value="9 500" helper-text="Această valoare ar putea cauza probleme"></cor-input>`,
        ),
        cell(
          'warning + placeholder',
          /*html*/ `<cor-input variant="warning" size="lg" label="Sumă" placeholder="0,00 MDL" helper-text="Verifică suma înainte de a continua"></cor-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-input variant="warning" size="lg" label="Sumă" value="9 500" helper-text="Această valoare ar putea cauza probleme"></cor-input>',
          '<cor-input variant="warning" size="lg" label="Sumă" placeholder="0,00 MDL" helper-text="Verifică suma înainte de a continua"></cor-input>',
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
          /*html*/ `<cor-input variant="success" size="lg" label="IDNP" value="2002004123456" helper-text="Verificat"></cor-input>`,
        ),
        cell(
          'success + placeholder',
          /*html*/ `<cor-input variant="success" size="lg" label="IDNP" placeholder="0000000000000" helper-text="Validat de Registrul de stat"></cor-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-input variant="success" size="lg" label="IDNP" value="2002004123456" helper-text="Verificat"></cor-input>',
          '<cor-input variant="success" size="lg" label="IDNP" placeholder="0000000000000" helper-text="Validat de Registrul de stat"></cor-input>',
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
          /*html*/ `<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" helper-text="Helper message displayed here"></cor-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" helper-text="Required field" required></cor-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" helper-text="Helper message displayed here"></cor-input>',
          '<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" helper-text="Required field" required></cor-input>',
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
          /*html*/ `<cor-input size="lg" label="Dată naștere" value="45/MM/YYYY" invalid error-text="Ziua trebuie să fie între 01 și 31"></cor-input>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<cor-input size="lg" variant="destructive" label="Label" placeholder="DD/MM/YYYY" error-text="Câmpul este obligatoriu" invalid></cor-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-input size="lg" label="Dată naștere" value="45/MM/YYYY" invalid error-text="Ziua trebuie să fie între 01 și 31"></cor-input>',
          '<cor-input size="lg" variant="destructive" label="Label" placeholder="DD/MM/YYYY" error-text="Câmpul este obligatoriu" invalid></cor-input>',
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
          /*html*/ `<cor-input size="lg" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></cor-input>`,
        ),
        cell(
          'default (md)',
          /*html*/ `<cor-input size="md" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></cor-input>`,
        ),
        cell(
          'warning + loading',
          /*html*/ `<cor-input variant="warning" size="lg" label="Sumă" value="9 500" loading helper-text="Se verifică…"></cor-input>`,
        ),
        cell(
          'success + loading',
          /*html*/ `<cor-input variant="success" size="lg" label="Cod" value="MD-12345" loading helper-text="Se confirmă…"></cor-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-input size="lg" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></cor-input>',
          '<cor-input size="md" label="IDNP" value="2002004123456" loading helper-text="Se validează…"></cor-input>',
          '<cor-input variant="warning" size="lg" label="Sumă" value="9 500" loading helper-text="Se verifică…"></cor-input>',
          '<cor-input variant="success" size="lg" label="Cod" value="MD-12345" loading helper-text="Se confirmă…"></cor-input>',
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
          /*html*/ `<cor-input size="lg" label="IDNP" value="2002004123456" readonly helper-text="Câmp doar pentru citire"></cor-input>`,
        ),
        cell(
          'read-only (md)',
          /*html*/ `<cor-input size="md" label="IDNP" value="2002004123456" readonly></cor-input>`,
        ),
        cell(
          'disabled (for comparison)',
          /*html*/ `<cor-input size="lg" label="IDNP" value="2002004123456" disabled helper-text="Câmp dezactivat"></cor-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-input size="lg" label="IDNP" value="2002004123456" readonly helper-text="Câmp doar pentru citire"></cor-input>',
          '<cor-input size="md" label="IDNP" value="2002004123456" readonly></cor-input>',
          '<cor-input size="lg" label="IDNP" value="2002004123456" disabled helper-text="Câmp dezactivat"></cor-input>',
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
          /*html*/ `<cor-input size="lg" label="Search" placeholder="Search">
            <cor-icon slot="icon-start" name="search" size="20" color="currentColor"></cor-icon>
          </cor-input>`,
        ),
        cell(
          'icon-end',
          /*html*/ `<cor-input size="lg" label="Date" placeholder="DD/MM/YYYY">
            <cor-icon slot="icon-end" name="calendar" size="24" color="currentColor"></cor-icon>
          </cor-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-input size="lg" label="Search" placeholder="Search"><cor-icon slot="icon-start" name="search" size="20" color="currentColor"></cor-icon></cor-input>',
          '<cor-input size="lg" label="Date" placeholder="DD/MM/YYYY"><cor-icon slot="icon-end" name="calendar" size="24" color="currentColor"></cor-icon></cor-input>',
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
          /*html*/ `<cor-input size="lg" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services" placeholder="DD/MM/YYYY"></cor-input>`,
        ),
        cell(
          'helper truncation (two lines)',
          /*html*/ `<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></cor-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-input size="lg" label="…long label…" placeholder="DD/MM/YYYY"></cor-input>',
          '<cor-input size="lg" label="Label" placeholder="DD/MM/YYYY" helper-text="…long helper text…"></cor-input>',
        ].join('\n'),
      },
    },
  },
};
