import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { NUMERIC_INPUT_SIZES, NUMERIC_INPUT_VARIANTS } from './mud-numeric-input.types';
import type { NumericInputSize, NumericInputVariant } from './mud-numeric-input.types';

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
  <mud-numeric-input
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
  ></mud-numeric-input>
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
  return `<mud-numeric-input ${attrs}></mud-numeric-input>`;
};

const meta: Meta<NumericInputArgs> = {
  title: 'Atoms/Input/Numeric',
  component: 'mud-numeric-input',
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
          /*html*/ `<mud-numeric-input variant="${variant}" size="lg" label="Cantitate" value="12345">
            <span slot="suffix">lei</span>
          </mud-numeric-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: NUMERIC_INPUT_VARIANTS.map(
          v =>
            `<mud-numeric-input variant="${v}" size="lg" label="Cantitate" value="12345"><span slot="suffix">lei</span></mud-numeric-input>`,
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
        cell(size, /*html*/ `<mud-numeric-input size="${size}" label="Cantitate" placeholder="0"></mud-numeric-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: NUMERIC_INPUT_SIZES.map(
          s => `<mud-numeric-input size="${s}" label="Cantitate" placeholder="0"></mud-numeric-input>`,
        ).join('\n'),
      },
    },
  },
};

/**
 * Mirrors the Figma "Variations" section: none / prefix / suffix / icon-leading,
 * shown for both size rungs. Prefix + icon-leading both ride the `icon-start`
 * slot (a plain text symbol vs a `mud-icon`); suffix uses the `suffix` slot.
 */
const variationCells = (size: NumericInputSize) =>
  [
    cell('none', /*html*/ `<mud-numeric-input size="${size}" label="Label" value="12345"></mud-numeric-input>`),
    cell(
      'prefix',
      /*html*/ `<mud-numeric-input size="${size}" label="Label" value="12345"><span slot="icon-start">€</span></mud-numeric-input>`,
    ),
    cell(
      'suffix',
      /*html*/ `<mud-numeric-input size="${size}" label="Label" value="12345"><span slot="suffix">lei</span></mud-numeric-input>`,
    ),
    cell(
      'icon-leading',
      /*html*/ `<mud-numeric-input size="${size}" label="Label" value="12345"><mud-icon slot="icon-start" name="coins" size="${
        size === 'lg' ? 24 : 20
      }"></mud-icon><span slot="suffix">lei</span></mud-numeric-input>`,
    ),
  ].join('');

export const Variations: Story = {
  name: 'Variations',
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-32); padding: var(--spacing-24); max-width: 1040px;">
      <div>
        <p style="${cellLabelStyle} margin: 0 0 var(--spacing-16);">Medium</p>
        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 220px)); gap: var(--spacing-24);">
          ${variationCells('md')}
        </div>
      </div>
      <div>
        <p style="${cellLabelStyle} margin: 0 0 var(--spacing-16);">Large</p>
        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 220px)); gap: var(--spacing-24);">
          ${variationCells('lg')}
        </div>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The four content variations from the Figma master. `prefix` and `icon-leading` share the `icon-start` slot (text symbol vs `mud-icon`); `suffix` is the trailing unit. Mirrors the "Variations" reference.',
      },
      source: {
        code: [
          '<mud-numeric-input label="Label" value="12345"></mud-numeric-input>',
          '<mud-numeric-input label="Label" value="12345"><span slot="icon-start">€</span></mud-numeric-input>',
          '<mud-numeric-input label="Label" value="12345"><span slot="suffix">lei</span></mud-numeric-input>',
          '<mud-numeric-input label="Label" value="12345"><mud-icon slot="icon-start" name="coins" size="20"></mud-icon><span slot="suffix">lei</span></mud-numeric-input>',
        ].join('\n'),
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
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" placeholder="0"></mud-numeric-input>`,
        ),
        cell(
          'default: filled',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="42"></mud-numeric-input>`,
        ),
        cell(
          'default: loading',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="42" loading></mud-numeric-input>`,
        ),
        cell(
          'default: read-only',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="42" readonly></mud-numeric-input>`,
        ),
        cell(
          'default: disabled',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="42" disabled></mud-numeric-input>`,
        ),
        cell(
          'default: mandatory',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" placeholder="0" required></mud-numeric-input>`,
        ),
        cell(
          'destructive: default',
          /*html*/ `<mud-numeric-input variant="destructive" size="lg" label="Cantitate" value="42"></mud-numeric-input>`,
        ),
        cell(
          'success: default',
          /*html*/ `<mud-numeric-input variant="success" size="lg" label="Cantitate" value="42"></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Cantitate" placeholder="0"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cantitate" value="42"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cantitate" value="42" loading></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cantitate" value="42" readonly></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cantitate" value="42" disabled></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cantitate" placeholder="0" required></mud-numeric-input>',
          '<mud-numeric-input variant="destructive" size="lg" label="Cantitate" value="42"></mud-numeric-input>',
          '<mud-numeric-input variant="success" size="lg" label="Cantitate" value="42"></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="42" loading helper-text="Se verifică..."></mud-numeric-input>`,
        ),
        cell(
          'md + default',
          /*html*/ `<mud-numeric-input size="md" label="Cantitate" value="42" loading helper-text="Se verifică..."></mud-numeric-input>`,
        ),
        cell(
          'lg + destructive',
          /*html*/ `<mud-numeric-input variant="destructive" size="lg" label="Cantitate" value="999" loading helper-text="Se verifică..."></mud-numeric-input>`,
        ),
        cell(
          'lg + success',
          /*html*/ `<mud-numeric-input variant="success" size="lg" label="Cantitate" value="42" loading helper-text="Se verifică..."></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Cantitate" value="42" loading></mud-numeric-input>',
          '<mud-numeric-input size="md" label="Cantitate" value="42" loading></mud-numeric-input>',
          '<mud-numeric-input variant="destructive" size="lg" label="Cantitate" value="999" loading></mud-numeric-input>',
          '<mud-numeric-input variant="success" size="lg" label="Cantitate" value="42" loading></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="42" readonly></mud-numeric-input>`,
        ),
        cell(
          'md + populated',
          /*html*/ `<mud-numeric-input size="md" label="Cantitate" value="42" readonly></mud-numeric-input>`,
        ),
        cell(
          'lg + suffix',
          /*html*/ `<mud-numeric-input size="lg" label="Sumă" value="1250" precision="2" readonly>
            <span slot="suffix">lei</span>
          </mud-numeric-input>`,
        ),
        cell(
          'lg + disabled (for comparison)',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="42" disabled></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Cantitate" value="42" readonly></mud-numeric-input>',
          '<mud-numeric-input size="md" label="Cantitate" value="42" readonly></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Sumă" value="1250" precision="2" readonly><span slot="suffix">lei</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cantitate" value="42" disabled></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input variant="success" size="lg" label="Cantitate" value="42" helper-text="Verificat"></mud-numeric-input>`,
        ),
        cell(
          'success + suffix',
          /*html*/ `<mud-numeric-input variant="success" size="lg" label="Sumă" value="1250" precision="2" helper-text="Verificat">
            <span slot="suffix">lei</span>
          </mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input variant="success" size="lg" label="Cantitate" value="42" helper-text="Verificat"></mud-numeric-input>',
          '<mud-numeric-input variant="success" size="lg" label="Sumă" value="1250" precision="2" helper-text="Verificat"><span slot="suffix">lei</span></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="lg" label="Persoane" value="0" min="0" max="10" helper-text="0–10 persoane"></mud-numeric-input>`,
        ),
        cell(
          'range 0–10, at ceiling',
          /*html*/ `<mud-numeric-input size="lg" label="Persoane" value="10" min="0" max="10" helper-text="0–10 persoane"></mud-numeric-input>`,
        ),
        cell(
          'range 0–10, mid',
          /*html*/ `<mud-numeric-input size="lg" label="Persoane" value="5" min="0" max="10" helper-text="0–10 persoane"></mud-numeric-input>`,
        ),
        cell(
          'negative range −10..10',
          /*html*/ `<mud-numeric-input size="lg" label="Temperatură" value="-3" min="-10" max="10" helper-text="−10..10 °C"></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Persoane" value="0" min="0" max="10"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Persoane" value="10" min="0" max="10"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Persoane" value="5" min="0" max="10"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Temperatură" value="-3" min="-10" max="10"></mud-numeric-input>',
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
        cell('step=1 (default)', /*html*/ `<mud-numeric-input size="lg" label="Pași" value="5"></mud-numeric-input>`),
        cell(
          'step=0.5',
          /*html*/ `<mud-numeric-input size="lg" label="Pași" value="2.5" step="0.5" precision="1"></mud-numeric-input>`,
        ),
        cell(
          'step=10',
          /*html*/ `<mud-numeric-input size="lg" label="Pași" value="100" step="10"></mud-numeric-input>`,
        ),
        cell(
          'step=100',
          /*html*/ `<mud-numeric-input size="lg" label="Pași" value="1000" step="100"></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Pași" value="5"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Pași" value="2.5" step="0.5" precision="1"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Pași" value="100" step="10"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Pași" value="1000" step="100"></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="lg" label="Sumă" value="19.95" step="0.01" precision="2"></mud-numeric-input>`,
        ),
        cell(
          'precision=3 (weight kg)',
          /*html*/ `<mud-numeric-input size="lg" label="Masă" value="0.250" step="0.001" precision="3"></mud-numeric-input>`,
        ),
        cell(
          'precision=0 (integer)',
          /*html*/ `<mud-numeric-input size="lg" label="Bucăți" value="7" step="1" precision="0"></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Sumă" value="19.95" step="0.01" precision="2"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Masă" value="0.250" step="0.001" precision="3"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Bucăți" value="7" step="1" precision="0"></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="lg" label="Sumă" value="250" step="10" precision="2">
            <span slot="suffix">lei</span>
          </mud-numeric-input>`,
        ),
        cell(
          '€ (Euro)',
          /*html*/ `<mud-numeric-input size="lg" label="Sumă" value="50" step="1" precision="2">
            <span slot="suffix">€</span>
          </mud-numeric-input>`,
        ),
        cell(
          'kg',
          /*html*/ `<mud-numeric-input size="lg" label="Masă" value="1.5" step="0.1" precision="2">
            <span slot="suffix">kg</span>
          </mud-numeric-input>`,
        ),
        cell(
          '%',
          /*html*/ `<mud-numeric-input size="lg" label="Reducere" value="15" min="0" max="100" step="5">
            <span slot="suffix">%</span>
          </mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Sumă" value="250" step="10" precision="2"><span slot="suffix">lei</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Sumă" value="50" step="1" precision="2"><span slot="suffix">€</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Masă" value="1.5" step="0.1" precision="2"><span slot="suffix">kg</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Reducere" value="15" min="0" max="100" step="5"><span slot="suffix">%</span></mud-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithPrefix: Story = {
  name: 'With Prefix',
  render: () =>
    wrap2col(
      [
        cell(
          '€ (Euro)',
          /*html*/ `<mud-numeric-input size="lg" label="Sumă" value="50" step="1" precision="2">
            <span slot="prefix">€</span>
          </mud-numeric-input>`,
        ),
        cell(
          'MDL (multi-character — no clip)',
          /*html*/ `<mud-numeric-input size="lg" label="Sumă" value="1250" step="10" precision="2">
            <span slot="prefix">MDL</span>
          </mud-numeric-input>`,
        ),
        cell(
          '$ + suffix',
          /*html*/ `<mud-numeric-input size="lg" label="Preț" value="99" step="1" precision="2">
            <span slot="prefix">$</span>
            <span slot="suffix">USD</span>
          </mud-numeric-input>`,
        ),
        cell(
          'icon-start + prefix + suffix',
          /*html*/ `<mud-numeric-input size="lg" label="Plată" value="1250" step="10" precision="2">
            <mud-icon slot="icon-start" name="wallet" size="24"></mud-icon>
            <span slot="prefix">€</span>
            <span slot="suffix">lei</span>
          </mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Sumă" value="50" step="1" precision="2"><span slot="prefix">€</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Sumă" value="1250" step="10" precision="2"><span slot="prefix">MDL</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Preț" value="99" step="1" precision="2"><span slot="prefix">$</span><span slot="suffix">USD</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Plată" value="1250" step="10" precision="2"><mud-icon slot="icon-start" name="wallet" size="24"></mud-icon><span slot="prefix">€</span><span slot="suffix">lei</span></mud-numeric-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithFormFeatures: Story = {
  name: 'Form Features',
  render: () =>
    wrap2col(
      [
        cell(
          'locale ro-MD (thousands grouping)',
          /*html*/ `<mud-numeric-input size="lg" label="Sumă" locale="ro-MD" value="1234567.89" precision="2">
            <span slot="suffix">lei</span>
          </mud-numeric-input>`,
        ),
        cell(
          'clearable',
          /*html*/ `<mud-numeric-input size="lg" label="Sumă" clearable value="1250" precision="2"></mud-numeric-input>`,
        ),
        cell(
          'counter (maxlength 6)',
          /*html*/ `<mud-numeric-input size="lg" label="Cod poștal" maxlength="6" value="2001"></mud-numeric-input>`,
        ),
        cell(
          'integer-only + positive-only',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" allow-decimal="false" allow-negative="false" value="3" min="0"></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Sumă" locale="ro-MD" value="1234567.89" precision="2"><span slot="suffix">lei</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Sumă" clearable value="1250" precision="2"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cod poștal" maxlength="6" value="2001"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cantitate" allow-decimal="false" allow-negative="false" value="3" min="0"></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="lg" label="Plată" value="1250" step="10" precision="2">
            <mud-icon slot="icon-start" name="wallet" size="24"></mud-icon>
            <span slot="suffix">lei</span>
          </mud-numeric-input>`,
        ),
        cell(
          'icon-start only',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="3">
            <mud-icon slot="icon-start" name="group" size="24"></mud-icon>
          </mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Plată" value="1250" step="10" precision="2"><mud-icon slot="icon-start" name="wallet" size="24"></mud-icon><span slot="suffix">lei</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cantitate" value="3"><mud-icon slot="icon-start" name="group" size="24"></mud-icon></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="md" label="Cod poștal" value="2001" show-steppers="false"></mud-numeric-input>`,
        ),
        cell(
          'identifier (no steppers)',
          /*html*/ `<mud-numeric-input size="lg" label="IDNP" value="2001005000000" show-steppers="false" helper-text="13 cifre"></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="md" label="Cod poștal" value="2001" show-steppers="false"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="IDNP" value="2001005000000" show-steppers="false"></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="lg" label="Persoane" placeholder="0" min="0" max="20" helper-text="Maxim 20 persoane"></mud-numeric-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-numeric-input size="lg" label="Vârstă" placeholder="0" min="18" max="120" helper-text="Trebuie să aveți cel puțin 18 ani" required></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Persoane" placeholder="0" min="0" max="20" helper-text="Maxim 20 persoane"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Vârstă" placeholder="0" min="18" max="120" helper-text="Trebuie să aveți cel puțin 18 ani" required></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="999" min="0" max="100" invalid error-text="Valoarea trebuie să fie între 0 și 100"></mud-numeric-input>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<mud-numeric-input size="lg" variant="destructive" label="Cantitate" placeholder="0" error-text="Introduceți un număr valid" invalid></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Cantitate" value="999" min="0" max="100" invalid error-text="Valoarea trebuie să fie între 0 și 100"></mud-numeric-input>',
          '<mud-numeric-input size="lg" variant="destructive" label="Cantitate" placeholder="0" error-text="Introduceți un număr valid" invalid></mud-numeric-input>',
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
          /*html*/ `<mud-numeric-input size="lg" label="Suma totală" value="9999999.99" step="100" precision="2">
            <span slot="suffix">lei</span>
          </mud-numeric-input>`,
        ),
        cell(
          'negative value',
          /*html*/ `<mud-numeric-input size="lg" label="Sold" value="-1250.50" step="10" precision="2">
            <span slot="suffix">lei</span>
          </mud-numeric-input>`,
        ),
        cell(
          'label truncation (single line)',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitatea totală a produselor solicitate pentru această livrare directă către cetățean" value="42"></mud-numeric-input>`,
        ),
        cell(
          'helper truncation (two lines)',
          /*html*/ `<mud-numeric-input size="lg" label="Cantitate" value="5" helper-text="Introduceți cantitatea de produse, în numere întregi. Cantitatea maximă acceptată per comandă este de 100 de unități pentru transport standard."></mud-numeric-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-numeric-input size="lg" label="Suma totală" value="9999999.99" step="100" precision="2"><span slot="suffix">lei</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Sold" value="-1250.50" step="10" precision="2"><span slot="suffix">lei</span></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="…long label…" value="42"></mud-numeric-input>',
          '<mud-numeric-input size="lg" label="Cantitate" value="5" helper-text="…long helper…"></mud-numeric-input>',
        ].join('\n'),
      },
    },
  },
};
