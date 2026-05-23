import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { CHECKBOX_SIZES } from './cor-checkbox.types';
import type { CheckboxSize } from './cor-checkbox.types';

type CheckboxArgs = {
  size: CheckboxSize;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
  readonly: boolean;
  label: string;
  supportingText: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderCheckbox = (args: CheckboxArgs) => /*html*/ `
  <cor-checkbox
    size="${args.size}"
    label="${args.label}"
    supporting-text="${args.supportingText}"
    ${args.checked ? 'checked' : ''}
    ${args.indeterminate ? 'indeterminate' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.invalid ? 'invalid' : ''}
    ${args.required ? 'required' : ''}
    ${args.readonly ? 'readonly' : ''}
  ></cor-checkbox>
`;

const docsSource = (args: CheckboxArgs) => {
  const attrs = [
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.supportingText ? `supporting-text="${args.supportingText}"` : '',
    args.checked ? 'checked' : '',
    args.indeterminate ? 'indeterminate' : '',
    args.disabled ? 'disabled' : '',
    args.invalid ? 'invalid' : '',
    args.required ? 'required' : '',
    args.readonly ? 'readonly' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<cor-checkbox ${attrs}></cor-checkbox>`;
};

const meta: Meta<CheckboxArgs> = {
  title: 'Atoms/Checkbox',
  component: 'cor-checkbox',
  argTypes: {
    size: {
      control: 'select',
      options: CHECKBOX_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    checked: { control: 'boolean', description: 'Checked state.' },
    indeterminate: { control: 'boolean', description: 'Visual tri-state marker (dash glyph).' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean', description: 'Destructive visuals + `aria-invalid`.' },
    required: { control: 'boolean' },
    readonly: { control: 'boolean' },
    label: { control: 'text', description: 'Plain-text label.' },
    supportingText: { control: 'text', description: 'Plain-text supporting message below the label.' },
  },
};

export default meta;

type Story = StoryObj<CheckboxArgs>;

export const Default: Story = {
  render: renderCheckbox,
  args: {
    size: 'md',
    checked: false,
    indeterminate: false,
    disabled: false,
    invalid: false,
    required: false,
    readonly: false,
    label: 'Acord',
    supportingText: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: CheckboxArgs }) => docsSource(args),
      },
    },
  },
};

export const Checked: Story = {
  render: renderCheckbox,
  args: { ...Default.args!, checked: true, label: 'Termeni și condiții' },
  parameters: Default.parameters,
};

export const Indeterminate: Story = {
  render: renderCheckbox,
  args: { ...Default.args!, indeterminate: true, label: 'Selectează toate categoriile' },
  parameters: Default.parameters,
};

// ---------- Grid helpers ----------

const wrapStates = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--spacing-24) var(--spacing-32); padding: var(--spacing-24); max-width: 880px;">
    ${children}
  </div>
`;

const wrapNarrow = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 280px)); gap: var(--spacing-24) var(--spacing-32); padding: var(--spacing-24); max-width: 640px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const AllStates: Story = {
  name: 'All States',
  render: () =>
    wrapStates(
      [
        cell('unchecked (md)', `<cor-checkbox size="md" label="Default"></cor-checkbox>`),
        cell('checked (md)', `<cor-checkbox size="md" label="Default" checked></cor-checkbox>`),
        cell('indeterminate (md)', `<cor-checkbox size="md" label="Default" indeterminate></cor-checkbox>`),
        cell('disabled unchecked', `<cor-checkbox size="md" label="Default" disabled></cor-checkbox>`),

        cell('disabled checked', `<cor-checkbox size="md" label="Default" disabled checked></cor-checkbox>`),
        cell(
          'disabled indeterminate',
          `<cor-checkbox size="md" label="Default" disabled indeterminate></cor-checkbox>`,
        ),
        cell('error unchecked', `<cor-checkbox size="md" label="Default" invalid></cor-checkbox>`),
        cell('error checked', `<cor-checkbox size="md" label="Default" invalid checked></cor-checkbox>`),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-checkbox label="Default"></cor-checkbox>',
          '<cor-checkbox label="Default" checked></cor-checkbox>',
          '<cor-checkbox label="Default" indeterminate></cor-checkbox>',
          '<cor-checkbox label="Default" disabled></cor-checkbox>',
          '<cor-checkbox label="Default" disabled checked></cor-checkbox>',
          '<cor-checkbox label="Default" disabled indeterminate></cor-checkbox>',
          '<cor-checkbox label="Default" invalid></cor-checkbox>',
          '<cor-checkbox label="Default" invalid checked></cor-checkbox>',
        ].join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrapNarrow(
      CHECKBOX_SIZES.flatMap(size => [
        cell(`${size} · unchecked`, `<cor-checkbox size="${size}" label="Acord"></cor-checkbox>`),
        cell(`${size} · checked`, `<cor-checkbox size="${size}" label="Acord" checked></cor-checkbox>`),
      ]).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: CHECKBOX_SIZES.flatMap(s => [
          `<cor-checkbox size="${s}" label="Acord"></cor-checkbox>`,
          `<cor-checkbox size="${s}" label="Acord" checked></cor-checkbox>`,
        ]).join('\n'),
      },
    },
  },
};

export const WithLabel: Story = {
  name: 'With Label',
  render: () =>
    wrapNarrow(
      [
        cell('plain label', `<cor-checkbox label="Acord"></cor-checkbox>`),
        cell('plain label (checked)', `<cor-checkbox label="Termeni și condiții" checked></cor-checkbox>`),
        cell(
          'rich slot',
          /*html*/ `<cor-checkbox>
            <span slot="label">Sunt de acord cu <strong>Termeni și condiții</strong></span>
          </cor-checkbox>`,
        ),
        cell(
          'rich slot (checked)',
          /*html*/ `<cor-checkbox checked>
            <span slot="label">Doresc să primesc <a href="#">actualizări</a> prin email</span>
          </cor-checkbox>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const WithSupportingText: Story = {
  name: 'With Supporting Text',
  render: () =>
    wrapNarrow(
      [
        cell(
          'unchecked',
          `<cor-checkbox label="Acord" supporting-text="Vom trimite confirmarea la adresa ta de email."></cor-checkbox>`,
        ),
        cell(
          'checked',
          `<cor-checkbox label="Termeni și condiții" supporting-text="Citește documentul complet înainte de a continua." checked></cor-checkbox>`,
        ),
        cell(
          'indeterminate',
          `<cor-checkbox label="Selectează toate" supporting-text="Unele subcategorii sunt deja selectate." indeterminate></cor-checkbox>`,
        ),
        cell(
          'small size',
          `<cor-checkbox size="sm" label="Marketing" supporting-text="Pot fi dezactivate oricând din setări."></cor-checkbox>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const Error: Story = {
  name: 'Error',
  render: () =>
    wrapNarrow(
      [
        cell(
          'error unchecked',
          `<cor-checkbox label="Termeni și condiții" supporting-text="Trebuie să accepți termenii pentru a continua." invalid required></cor-checkbox>`,
        ),
        cell(
          'error checked',
          `<cor-checkbox label="Termeni și condiții" supporting-text="Trebuie să accepți termenii pentru a continua." invalid checked></cor-checkbox>`,
        ),
        cell('error sm', `<cor-checkbox size="sm" label="Acord" invalid></cor-checkbox>`),
        cell('error sm checked', `<cor-checkbox size="sm" label="Acord" invalid checked></cor-checkbox>`),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () =>
    wrapNarrow(
      [
        cell('disabled unchecked', `<cor-checkbox label="Acord" disabled></cor-checkbox>`),
        cell('disabled checked', `<cor-checkbox label="Acord" disabled checked></cor-checkbox>`),
        cell('disabled indeterminate', `<cor-checkbox label="Acord" disabled indeterminate></cor-checkbox>`),
        cell(
          'disabled + supporting',
          `<cor-checkbox label="Acord" supporting-text="Această opțiune nu este disponibilă acum." disabled></cor-checkbox>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () =>
    wrapNarrow(
      [
        cell(
          'long label wraps',
          /*html*/ `<cor-checkbox label="Doresc să primesc actualizări periodice prin email despre noile funcționalități, promoții și evenimente organizate de Corlab și partenerii săi"></cor-checkbox>`,
        ),
        cell(
          'long label + supporting',
          /*html*/ `<cor-checkbox
            label="Sunt de acord cu Termeni și condiții și Politica de confidențialitate"
            supporting-text="Te rugăm să citești cu atenție documentele complete înainte de a continua. Acordul tău se aplică tuturor serviciilor Corlab și poate fi retras oricând din pagina de setări a contului."
            checked></cor-checkbox>`,
        ),
        cell('no label (aria-only)', /*html*/ `<cor-checkbox aria-label="Selectează rândul"></cor-checkbox>`),
        cell('readonly checked', `<cor-checkbox label="Verificat de sistem" readonly checked></cor-checkbox>`),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};
