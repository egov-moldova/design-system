import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { RADIO_SIZES } from './cor-radio.types';
import type { RadioSize } from './cor-radio.types';

type RadioArgs = {
  size: RadioSize;
  checked: boolean;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
  readonly: boolean;
  label: string;
  supportingText: string;
  name: string;
  value: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderRadio = (args: RadioArgs) => /*html*/ `
  <cor-radio
    size="${args.size}"
    label="${args.label}"
    supporting-text="${args.supportingText}"
    name="${args.name}"
    value="${args.value}"
    ${args.checked ? 'checked' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.invalid ? 'invalid' : ''}
    ${args.required ? 'required' : ''}
    ${args.readonly ? 'readonly' : ''}
  ></cor-radio>
`;

const docsSourceDefault = (args: RadioArgs) => {
  const attrs = [
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.supportingText ? `supporting-text="${args.supportingText}"` : '',
    args.name ? `name="${args.name}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.checked ? 'checked' : '',
    args.disabled ? 'disabled' : '',
    args.invalid ? 'invalid' : '',
    args.required ? 'required' : '',
    args.readonly ? 'readonly' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<cor-radio ${attrs}></cor-radio>`;
};

const meta: Meta<RadioArgs> = {
  title: 'Atoms/Radio',
  component: 'cor-radio',
  argTypes: {
    size: {
      control: 'select',
      options: RADIO_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    checked: {
      control: 'boolean',
      description: 'Whether the radio is currently selected.',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables interactivity.',
      table: { defaultValue: { summary: 'false' } },
    },
    invalid: {
      control: 'boolean',
      description: 'Maps to Figma "Error" state — border + dot turn red.',
      table: { defaultValue: { summary: 'false' } },
    },
    required: {
      control: 'boolean',
      description: 'Marks the field as mandatory.',
      table: { defaultValue: { summary: 'false' } },
    },
    readonly: {
      control: 'boolean',
      description: 'Renders the control read-only.',
      table: { defaultValue: { summary: 'false' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    supportingText: { control: 'text', description: 'Plain-text supporting text below the label.' },
    name: { control: 'text', description: 'Form-control `name`.' },
    value: { control: 'text', description: 'Value submitted with the form when checked.' },
  },
};

export default meta;

type Story = StoryObj<RadioArgs>;

export const Default: Story = {
  render: renderRadio,
  args: {
    size: 'md',
    checked: false,
    disabled: false,
    invalid: false,
    required: false,
    readonly: false,
    label: 'Acord',
    supportingText: '',
    name: '',
    value: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: RadioArgs }) => docsSourceDefault(args),
      },
    },
  },
};

export const Selected: Story = {
  render: renderRadio,
  args: {
    ...Default.args,
    checked: true,
    label: 'Acord',
  } as RadioArgs,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: RadioArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 240px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 600px;">
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
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 220px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 560px;">
        ${[
          cell('default', /*html*/ `<cor-radio label="Acord"></cor-radio>`),
          cell('selected', /*html*/ `<cor-radio label="Acord" checked></cor-radio>`),
          cell('disabled', /*html*/ `<cor-radio label="Acord" disabled></cor-radio>`),
          cell('selected + disabled', /*html*/ `<cor-radio label="Acord" checked disabled></cor-radio>`),
          cell('error', /*html*/ `<cor-radio label="Acord" invalid></cor-radio>`),
          cell('selected + error', /*html*/ `<cor-radio label="Acord" checked invalid></cor-radio>`),
          cell('focus (use Tab)', /*html*/ `<cor-radio label="Acord"></cor-radio>`),
          cell('readonly', /*html*/ `<cor-radio label="Acord" checked readonly></cor-radio>`),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-radio label="Acord"></cor-radio>',
          '<cor-radio label="Acord" checked></cor-radio>',
          '<cor-radio label="Acord" disabled></cor-radio>',
          '<cor-radio label="Acord" checked disabled></cor-radio>',
          '<cor-radio label="Acord" invalid></cor-radio>',
          '<cor-radio label="Acord" checked invalid></cor-radio>',
          '<cor-radio label="Acord" checked readonly></cor-radio>',
        ].join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      RADIO_SIZES.map(size =>
        cell(
          size,
          /*html*/ `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-12);">
              <cor-radio size="${size}" label="Acord"></cor-radio>
              <cor-radio size="${size}" label="Acord" checked></cor-radio>
            </div>
          `,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: RADIO_SIZES.map(s =>
          [
            `<cor-radio size="${s}" label="Acord"></cor-radio>`,
            `<cor-radio size="${s}" label="Acord" checked></cor-radio>`,
          ].join('\n'),
        ).join('\n'),
      },
    },
  },
};

export const WithLabel: Story = {
  name: 'With Label',
  render: () =>
    wrap(
      [
        cell('default', /*html*/ `<cor-radio label="Doresc să primesc actualizări"></cor-radio>`),
        cell('selected', /*html*/ `<cor-radio label="Doresc să primesc actualizări" checked></cor-radio>`),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-radio label="Doresc să primesc actualizări"></cor-radio>',
          '<cor-radio label="Doresc să primesc actualizări" checked></cor-radio>',
        ].join('\n'),
      },
    },
  },
};

export const WithSupportingText: Story = {
  name: 'With Supporting Text',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
        ${[
          cell(
            'default (md)',
            /*html*/ `<cor-radio label="Acord" supporting-text="Sunt de acord cu termenii și condițiile serviciului."></cor-radio>`,
          ),
          cell(
            'selected (md)',
            /*html*/ `<cor-radio label="Acord" supporting-text="Sunt de acord cu termenii și condițiile serviciului." checked></cor-radio>`,
          ),
          cell(
            'default (sm)',
            /*html*/ `<cor-radio size="sm" label="Acord" supporting-text="Sunt de acord cu termenii și condițiile serviciului."></cor-radio>`,
          ),
          cell(
            'selected (sm)',
            /*html*/ `<cor-radio size="sm" label="Acord" supporting-text="Sunt de acord cu termenii și condițiile serviciului." checked></cor-radio>`,
          ),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-radio label="Acord" supporting-text="Sunt de acord cu termenii și condițiile serviciului."></cor-radio>',
          '<cor-radio label="Acord" supporting-text="Sunt de acord cu termenii și condițiile serviciului." checked></cor-radio>',
        ].join('\n'),
      },
    },
  },
};

export const Error: Story = {
  name: 'Error',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
        ${[
          cell('error (unselected)', /*html*/ `<cor-radio label="Refuz" invalid></cor-radio>`),
          cell('error (selected)', /*html*/ `<cor-radio label="Refuz" invalid checked></cor-radio>`),
          cell(
            'error + supporting',
            /*html*/ `<cor-radio label="Refuz" supporting-text="Această opțiune blochează cererea." invalid></cor-radio>`,
          ),
          cell('error (sm)', /*html*/ `<cor-radio size="sm" label="Refuz" invalid checked></cor-radio>`),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-radio label="Refuz" invalid></cor-radio>',
          '<cor-radio label="Refuz" invalid checked></cor-radio>',
          '<cor-radio label="Refuz" supporting-text="Această opțiune blochează cererea." invalid></cor-radio>',
        ].join('\n'),
      },
    },
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () =>
    wrap(
      [
        cell('disabled (unselected)', /*html*/ `<cor-radio label="Acord" disabled></cor-radio>`),
        cell('disabled (selected)', /*html*/ `<cor-radio label="Acord" disabled checked></cor-radio>`),
        cell(
          'disabled + supporting',
          /*html*/ `<cor-radio label="Acord" supporting-text="Această opțiune nu poate fi modificată." disabled></cor-radio>`,
        ),
        cell('disabled (sm)', /*html*/ `<cor-radio size="sm" label="Acord" disabled checked></cor-radio>`),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-radio label="Acord" disabled></cor-radio>',
          '<cor-radio label="Acord" disabled checked></cor-radio>',
          '<cor-radio label="Acord" supporting-text="…" disabled></cor-radio>',
        ].join('\n'),
      },
    },
  },
};

export const Group: Story = {
  name: 'Group (preview)',
  render: () => /*html*/ `
      <fieldset style="display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-16); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-8); max-width: 360px;">
        <legend style="font-family: var(--font-family-primary); font-size: var(--font-size-14); font-weight: var(--font-weight-medium); color: var(--color-text-base-default); padding: 0 var(--spacing-4);">Selectează o opțiune</legend>
        <cor-radio name="consimtamant" value="acord" label="Acord" checked></cor-radio>
        <cor-radio name="consimtamant" value="refuz" label="Refuz"></cor-radio>
        <cor-radio name="consimtamant" value="indecis" label="Doresc să decid mai târziu"></cor-radio>
      </fieldset>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Multiple `cor-radio` siblings sharing a `name` form an implicit group. A dedicated `cor-radio-group` molecule that adds roving-focus and arrow-key navigation will land in a follow-up PR.',
      },
      source: {
        code: [
          '<cor-radio name="consimtamant" value="acord" label="Acord" checked></cor-radio>',
          '<cor-radio name="consimtamant" value="refuz" label="Refuz"></cor-radio>',
          '<cor-radio name="consimtamant" value="indecis" label="Doresc să decid mai târziu"></cor-radio>',
        ].join('\n'),
      },
    },
  },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 360px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 800px;">
        ${[
          cell(
            'long label wraps',
            /*html*/ `<cor-radio label="Sunt de acord ca datele mele cu caracter personal să fie prelucrate de Agenția de Guvernare Electronică pentru a primi serviciile selectate."></cor-radio>`,
          ),
          cell(
            'long supporting text wraps',
            /*html*/ `<cor-radio label="Acord" supporting-text="Datele dumneavoastră vor fi prelucrate în conformitate cu Legea nr. 133 privind protecția datelor cu caracter personal și vor fi păstrate pentru maximum 36 de luni."></cor-radio>`,
          ),
          cell(
            'long label + long supporting',
            /*html*/ `<cor-radio label="Sunt de acord cu termenii completi ai serviciului electronic" supporting-text="Aceasta include termenii de utilizare, politica de confidențialitate și acordul privind cookie-urile pentru toate subdomeniile .gov.md." checked></cor-radio>`,
          ),
          cell('no label (aria-label only)', /*html*/ `<cor-radio aria-label="Opțiunea A"></cor-radio>`),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-radio label="…long Romanian label…"></cor-radio>',
          '<cor-radio label="Acord" supporting-text="…long supporting text…"></cor-radio>',
          '<cor-radio aria-label="Opțiunea A"></cor-radio>',
        ].join('\n'),
      },
    },
  },
};
