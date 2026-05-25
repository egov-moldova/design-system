import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { NUMERIC_INPUT_SIZES, NUMERIC_INPUT_VARIANTS } from './cor-numeric-input.types';
import type { NumericInputSize, NumericInputVariant } from './cor-numeric-input.types';

type NumericInputArgs = {
  variant: NumericInputVariant;
  size: NumericInputSize;
  label: string;
  placeholder: string;
  value: string;
  min: string;
  max: string;
  step: number;
  precision: string;
  helperText: string;
  errorText: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  loading: boolean;
  showSteppers: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderNumericInput = (args: NumericInputArgs) => /*html*/ `
  <cor-numeric-input
    variant="${args.variant}"
    size="${args.size}"
    label="${args.label}"
    placeholder="${args.placeholder}"
    ${args.value !== '' ? `value="${args.value}"` : ''}
    ${args.min !== '' ? `min="${args.min}"` : ''}
    ${args.max !== '' ? `max="${args.max}"` : ''}
    step="${args.step}"
    ${args.precision !== '' ? `precision="${args.precision}"` : ''}
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.readonly ? 'readonly' : ''}
    ${args.invalid ? 'invalid' : ''}
    ${args.loading ? 'loading' : ''}
    ${args.showSteppers ? '' : 'show-steppers="false"'}
  ></cor-numeric-input>
`;

const docsSourceDefault = (args: NumericInputArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value !== '' ? `value="${args.value}"` : '',
    args.min !== '' ? `min="${args.min}"` : '',
    args.max !== '' ? `max="${args.max}"` : '',
    args.step !== 1 ? `step="${args.step}"` : '',
    args.precision !== '' ? `precision="${args.precision}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.invalid ? 'invalid' : '',
    args.loading ? 'loading' : '',
    args.showSteppers ? '' : 'show-steppers="false"',
  ]
    .filter(Boolean)
    .join(' ');
  return `<cor-numeric-input ${attrs}></cor-numeric-input>`;
};

const meta: Meta<NumericInputArgs> = {
  title: 'Atoms/Input/Numeric',
  component: 'cor-numeric-input',
  argTypes: {
    variant: {
      control: 'select',
      options: NUMERIC_INPUT_VARIANTS,
      description:
        'Color treatment — 3 styles per Figma (default / destructive / success). `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: NUMERIC_INPUT_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    placeholder: { control: 'text' },
    value: { control: 'text', description: 'Initial numeric value (string-typed for control flexibility).' },
    min: { control: 'text', description: 'Inclusive lower bound. Stepper-down disables at this value.' },
    max: { control: 'text', description: 'Inclusive upper bound. Stepper-up disables at this value.' },
    step: { control: { type: 'number', step: 0.1 }, description: 'Stepper / arrow-key increment.' },
    precision: { control: 'text', description: 'Decimal places to display on commit.' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    loading: { control: 'boolean', description: 'Renders a brand spinner in place of the stepper stack.' },
    showSteppers: { control: 'boolean', description: 'Render the stacked stepper buttons.' },
  },
};

export default meta;

type Story = StoryObj<NumericInputArgs>;

export const Default: Story = {
  render: renderNumericInput,
  args: {
    variant: 'default',
    size: 'lg',
    label: 'Cantitate',
    placeholder: '0',
    value: '',
    min: '',
    max: '',
    step: 1,
    precision: '',
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
    loading: false,
    showSteppers: true,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: NumericInputArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 240px)); gap: var(--spacing-32) var(--spacing-32); padding: var(--spacing-24); max-width: 880px;">
    ${children}
  </div>
`;

const wrap2col = (children: string) => /*html*/ `
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
      NUMERIC_INPUT_VARIANTS.map(variant =>
        cell(
          variant,
          /*html*/ `<cor-numeric-input variant="${variant}" size="lg" label="Cantitate" value="12345">
            <span slot="suffix">lei</span>
          </cor-numeric-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: NUMERIC_INPUT_VARIANTS.map(
          v =>
            `<cor-numeric-input variant="${v}" size="lg" label="Cantitate" value="12345"><span slot="suffix">lei</span></cor-numeric-input>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap2col(
      NUMERIC_INPUT_SIZES.map(size =>
        cell(size, /*html*/ `<cor-numeric-input size="${size}" label="Cantitate" placeholder="0"></cor-numeric-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: NUMERIC_INPUT_SIZES.map(
          s => `<cor-numeric-input size="${s}" label="Cantitate" placeholder="0"></cor-numeric-input>`,
        ).join('\n'),
      },
    },
  },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrap2col(
      [
        cell(
          'default: empty',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" placeholder="0"></cor-numeric-input>`,
        ),
        cell(
          'default: filled',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="42"></cor-numeric-input>`,
        ),
        cell(
          'default: loading',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="42" loading></cor-numeric-input>`,
        ),
        cell(
          'default: read-only',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="42" readonly></cor-numeric-input>`,
        ),
        cell(
          'default: disabled',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="42" disabled></cor-numeric-input>`,
        ),
        cell(
          'default: mandatory',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" placeholder="0" required></cor-numeric-input>`,
        ),
        cell(
          'destructive: default',
          /*html*/ `<cor-numeric-input variant="destructive" size="lg" label="Cantitate" value="42"></cor-numeric-input>`,
        ),
        cell(
          'success: default',
          /*html*/ `<cor-numeric-input variant="success" size="lg" label="Cantitate" value="42"></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Cantitate" placeholder="0"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Cantitate" value="42"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Cantitate" value="42" loading></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Cantitate" value="42" readonly></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Cantitate" value="42" disabled></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Cantitate" placeholder="0" required></cor-numeric-input>',
          '<cor-numeric-input variant="destructive" size="lg" label="Cantitate" value="42"></cor-numeric-input>',
          '<cor-numeric-input variant="success" size="lg" label="Cantitate" value="42"></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const Loading: Story = {
  name: 'Loading',
  render: () =>
    wrap2col(
      [
        cell(
          'lg + default',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="42" loading helper-text="Se verifică..."></cor-numeric-input>`,
        ),
        cell(
          'md + default',
          /*html*/ `<cor-numeric-input size="md" label="Cantitate" value="42" loading helper-text="Se verifică..."></cor-numeric-input>`,
        ),
        cell(
          'lg + destructive',
          /*html*/ `<cor-numeric-input variant="destructive" size="lg" label="Cantitate" value="999" loading helper-text="Se verifică..."></cor-numeric-input>`,
        ),
        cell(
          'lg + success',
          /*html*/ `<cor-numeric-input variant="success" size="lg" label="Cantitate" value="42" loading helper-text="Se verifică..."></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Cantitate" value="42" loading></cor-numeric-input>',
          '<cor-numeric-input size="md" label="Cantitate" value="42" loading></cor-numeric-input>',
          '<cor-numeric-input variant="destructive" size="lg" label="Cantitate" value="999" loading></cor-numeric-input>',
          '<cor-numeric-input variant="success" size="lg" label="Cantitate" value="42" loading></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const ReadOnly: Story = {
  name: 'Read-Only',
  render: () =>
    wrap2col(
      [
        cell(
          'lg + populated',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="42" readonly></cor-numeric-input>`,
        ),
        cell(
          'md + populated',
          /*html*/ `<cor-numeric-input size="md" label="Cantitate" value="42" readonly></cor-numeric-input>`,
        ),
        cell(
          'lg + suffix',
          /*html*/ `<cor-numeric-input size="lg" label="Sumă" value="1250" precision="2" readonly>
            <span slot="suffix">lei</span>
          </cor-numeric-input>`,
        ),
        cell(
          'lg + disabled (for comparison)',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="42" disabled></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Cantitate" value="42" readonly></cor-numeric-input>',
          '<cor-numeric-input size="md" label="Cantitate" value="42" readonly></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Sumă" value="1250" precision="2" readonly><span slot="suffix">lei</span></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Cantitate" value="42" disabled></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithSuccess: Story = {
  name: 'With Success',
  render: () =>
    wrap2col(
      [
        cell(
          'success + helper',
          /*html*/ `<cor-numeric-input variant="success" size="lg" label="Cantitate" value="42" helper-text="Verificat"></cor-numeric-input>`,
        ),
        cell(
          'success + suffix',
          /*html*/ `<cor-numeric-input variant="success" size="lg" label="Sumă" value="1250" precision="2" helper-text="Verificat">
            <span slot="suffix">lei</span>
          </cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input variant="success" size="lg" label="Cantitate" value="42" helper-text="Verificat"></cor-numeric-input>',
          '<cor-numeric-input variant="success" size="lg" label="Sumă" value="1250" precision="2" helper-text="Verificat"><span slot="suffix">lei</span></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithMinMax: Story = {
  name: 'With Min / Max',
  render: () =>
    wrap2col(
      [
        cell(
          'range 0–10, at floor',
          /*html*/ `<cor-numeric-input size="lg" label="Persoane" value="0" min="0" max="10" helper-text="0–10 persoane"></cor-numeric-input>`,
        ),
        cell(
          'range 0–10, at ceiling',
          /*html*/ `<cor-numeric-input size="lg" label="Persoane" value="10" min="0" max="10" helper-text="0–10 persoane"></cor-numeric-input>`,
        ),
        cell(
          'range 0–10, mid',
          /*html*/ `<cor-numeric-input size="lg" label="Persoane" value="5" min="0" max="10" helper-text="0–10 persoane"></cor-numeric-input>`,
        ),
        cell(
          'negative range −10..10',
          /*html*/ `<cor-numeric-input size="lg" label="Temperatură" value="-3" min="-10" max="10" helper-text="−10..10 °C"></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Persoane" value="0" min="0" max="10"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Persoane" value="10" min="0" max="10"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Persoane" value="5" min="0" max="10"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Temperatură" value="-3" min="-10" max="10"></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithStep: Story = {
  name: 'With Custom Step',
  render: () =>
    wrap2col(
      [
        cell('step=1 (default)', /*html*/ `<cor-numeric-input size="lg" label="Pași" value="5"></cor-numeric-input>`),
        cell(
          'step=0.5',
          /*html*/ `<cor-numeric-input size="lg" label="Pași" value="2.5" step="0.5" precision="1"></cor-numeric-input>`,
        ),
        cell(
          'step=10',
          /*html*/ `<cor-numeric-input size="lg" label="Pași" value="100" step="10"></cor-numeric-input>`,
        ),
        cell(
          'step=100',
          /*html*/ `<cor-numeric-input size="lg" label="Pași" value="1000" step="100"></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Pași" value="5"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Pași" value="2.5" step="0.5" precision="1"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Pași" value="100" step="10"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Pași" value="1000" step="100"></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithPrecision: Story = {
  name: 'With Precision',
  render: () =>
    wrap2col(
      [
        cell(
          'precision=2 (currency)',
          /*html*/ `<cor-numeric-input size="lg" label="Sumă" value="19.95" step="0.01" precision="2"></cor-numeric-input>`,
        ),
        cell(
          'precision=3 (weight kg)',
          /*html*/ `<cor-numeric-input size="lg" label="Masă" value="0.250" step="0.001" precision="3"></cor-numeric-input>`,
        ),
        cell(
          'precision=0 (integer)',
          /*html*/ `<cor-numeric-input size="lg" label="Bucăți" value="7" step="1" precision="0"></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Sumă" value="19.95" step="0.01" precision="2"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Masă" value="0.250" step="0.001" precision="3"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Bucăți" value="7" step="1" precision="0"></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithSuffix: Story = {
  name: 'With Suffix',
  render: () =>
    wrap2col(
      [
        cell(
          'lei (MDL — Moldovan Leu)',
          /*html*/ `<cor-numeric-input size="lg" label="Sumă" value="250" step="10" precision="2">
            <span slot="suffix">lei</span>
          </cor-numeric-input>`,
        ),
        cell(
          '€ (Euro)',
          /*html*/ `<cor-numeric-input size="lg" label="Sumă" value="50" step="1" precision="2">
            <span slot="suffix">€</span>
          </cor-numeric-input>`,
        ),
        cell(
          'kg',
          /*html*/ `<cor-numeric-input size="lg" label="Masă" value="1.5" step="0.1" precision="2">
            <span slot="suffix">kg</span>
          </cor-numeric-input>`,
        ),
        cell(
          '%',
          /*html*/ `<cor-numeric-input size="lg" label="Reducere" value="15" min="0" max="100" step="5">
            <span slot="suffix">%</span>
          </cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Sumă" value="250" step="10" precision="2"><span slot="suffix">lei</span></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Sumă" value="50" step="1" precision="2"><span slot="suffix">€</span></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Masă" value="1.5" step="0.1" precision="2"><span slot="suffix">kg</span></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Reducere" value="15" min="0" max="100" step="5"><span slot="suffix">%</span></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithCurrencyIcon: Story = {
  name: 'With Currency Icon',
  render: () =>
    wrap2col(
      [
        cell(
          'icon-start + suffix',
          /*html*/ `<cor-numeric-input size="lg" label="Plată" value="1250" step="10" precision="2">
            <cor-icon slot="icon-start" name="wallet" size="24"></cor-icon>
            <span slot="suffix">lei</span>
          </cor-numeric-input>`,
        ),
        cell(
          'icon-start only',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="3">
            <cor-icon slot="icon-start" name="group" size="24"></cor-icon>
          </cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Plată" value="1250" step="10" precision="2"><cor-icon slot="icon-start" name="wallet" size="24"></cor-icon><span slot="suffix">lei</span></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Cantitate" value="3"><cor-icon slot="icon-start" name="group" size="24"></cor-icon></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithoutSteppers: Story = {
  name: 'Without Steppers',
  render: () =>
    wrap2col(
      [
        cell(
          'compact filter (no steppers)',
          /*html*/ `<cor-numeric-input size="md" label="Cod poștal" value="2001" show-steppers="false"></cor-numeric-input>`,
        ),
        cell(
          'identifier (no steppers)',
          /*html*/ `<cor-numeric-input size="lg" label="IDNP" value="2001005000000" show-steppers="false" helper-text="13 cifre"></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="md" label="Cod poștal" value="2001" show-steppers="false"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="IDNP" value="2001005000000" show-steppers="false"></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithHelperText: Story = {
  name: 'With Helper Text',
  render: () =>
    wrap2col(
      [
        cell(
          'default',
          /*html*/ `<cor-numeric-input size="lg" label="Persoane" placeholder="0" min="0" max="20" helper-text="Maxim 20 persoane"></cor-numeric-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<cor-numeric-input size="lg" label="Vârstă" placeholder="0" min="18" max="120" helper-text="Trebuie să aveți cel puțin 18 ani" required></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Persoane" placeholder="0" min="0" max="20" helper-text="Maxim 20 persoane"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Vârstă" placeholder="0" min="18" max="120" helper-text="Trebuie să aveți cel puțin 18 ani" required></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithError: Story = {
  name: 'With Error',
  render: () =>
    wrap2col(
      [
        cell(
          'invalid + error message',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="999" min="0" max="100" invalid error-text="Valoarea trebuie să fie între 0 și 100"></cor-numeric-input>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<cor-numeric-input size="lg" variant="destructive" label="Cantitate" placeholder="0" error-text="Introduceți un număr valid" invalid></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Cantitate" value="999" min="0" max="100" invalid error-text="Valoarea trebuie să fie între 0 și 100"></cor-numeric-input>',
          '<cor-numeric-input size="lg" variant="destructive" label="Cantitate" placeholder="0" error-text="Introduceți un număr valid" invalid></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () =>
    wrap2col(
      [
        cell(
          'very large number',
          /*html*/ `<cor-numeric-input size="lg" label="Suma totală" value="9999999.99" step="100" precision="2">
            <span slot="suffix">lei</span>
          </cor-numeric-input>`,
        ),
        cell(
          'negative value',
          /*html*/ `<cor-numeric-input size="lg" label="Sold" value="-1250.50" step="10" precision="2">
            <span slot="suffix">lei</span>
          </cor-numeric-input>`,
        ),
        cell(
          'label truncation (single line)',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitatea totală a produselor solicitate pentru această livrare directă către cetățean" value="42"></cor-numeric-input>`,
        ),
        cell(
          'helper truncation (two lines)',
          /*html*/ `<cor-numeric-input size="lg" label="Cantitate" value="5" helper-text="Introduceți cantitatea de produse, în numere întregi. Cantitatea maximă acceptată per comandă este de 100 de unități pentru transport standard."></cor-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-numeric-input size="lg" label="Suma totală" value="9999999.99" step="100" precision="2"><span slot="suffix">lei</span></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Sold" value="-1250.50" step="10" precision="2"><span slot="suffix">lei</span></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="…long label…" value="42"></cor-numeric-input>',
          '<cor-numeric-input size="lg" label="Cantitate" value="5" helper-text="…long helper…"></cor-numeric-input>',
        ].join('\n'),
      },
    },
  },
};
