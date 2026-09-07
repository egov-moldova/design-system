import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SELECT_SIZES, SELECT_VARIANTS } from './mud-select.types';
import type { SelectSize, SelectVariant } from './mud-select.types';

type SelectArgs = {
  variant: SelectVariant;
  size: SelectSize;
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

const optionsJson =
  '[{"value":"opt-1","label":"Option 1"},{"value":"opt-2","label":"Option 2"},{"value":"opt-3","label":"Option 3"},{"value":"opt-4","label":"Option 4"},{"value":"opt-5","label":"Option 5"}]';

const setOptionsScript = (id: string) =>
  /*html*/ `<script>(function(){const el=document.getElementById('${id}');if(el)el.options=${optionsJson};})();</script>`;

let storyInstance = 0;
const nextId = () => `mud-select-story-${++storyInstance}`;

const renderSelect = (args: SelectArgs) => {
  const id = nextId();
  return /*html*/ `
    <mud-select
      id="${id}"
      variant="${args.variant}"
      size="${args.size}"
      label="${args.label}"
      placeholder="${args.placeholder}"
      value="${args.value}"
      helper-text="${args.helperText}"
      error-text="${args.errorText}"
      ${args.required ? 'required' : ''}
      ${args.disabled ? 'disabled' : ''}
      ${args.readonly ? 'readonly' : ''}
      ${args.invalid ? 'invalid' : ''}
    ></mud-select>
    ${setOptionsScript(id)}
  `;
};

const docsSourceDefault = (args: SelectArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'medium' ? `size="${args.size}"` : '',
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
  return `<mud-select ${attrs}></mud-select>`;
};

const meta: Meta<SelectArgs> = {
  title: 'Atoms/Input/Select',
  component: 'mud-select',
  argTypes: {
    variant: {
      control: 'select',
      options: SELECT_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: SELECT_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'medium' } },
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

type Story = StoryObj<SelectArgs>;

export const Default: Story = {
  render: renderSelect,
  args: {
    variant: 'default',
    size: 'large',
    label: 'Label',
    placeholder: 'Placeholder',
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
        transform: (_code: string, { args }: { args: SelectArgs }) => docsSourceDefault(args),
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

const optionsTag = (id: string) => setOptionsScript(id);

const selectMarkup = (attrs: string) => {
  const id = nextId();
  return /*html*/ `<mud-select id="${id}" ${attrs}></mud-select>${optionsTag(id)}`;
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () =>
    wrap(
      SELECT_VARIANTS.map(variant =>
        cell(variant, selectMarkup(`variant="${variant}" size="large" label="Label" placeholder="Placeholder"`)),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SELECT_VARIANTS.map(
          v => `<mud-select variant="${v}" size="large" label="Label" placeholder="Placeholder"></mud-select>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      SELECT_SIZES.map(size =>
        cell(size, selectMarkup(`size="${size}" label="Label" placeholder="Placeholder"`)),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SELECT_SIZES.map(
          s => `<mud-select size="${s}" label="Label" placeholder="Placeholder"></mud-select>`,
        ).join('\n'),
      },
    },
  },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell('default: default', selectMarkup(`size="large" label="Label" placeholder="Placeholder"`)),
        cell('default: filled', selectMarkup(`size="large" label="Label" value="opt-2"`)),
        cell('default: disabled', selectMarkup(`size="large" label="Label" placeholder="Placeholder" disabled`)),
        cell('default: readonly', selectMarkup(`size="large" label="Label" value="opt-2" readonly`)),
        cell('default: mandatory', selectMarkup(`size="large" label="Label" placeholder="Placeholder" required`)),
        cell(
          'destructive: default',
          selectMarkup(`variant="destructive" size="large" label="Label" placeholder="Placeholder"`),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-select size="large" label="Label" placeholder="Placeholder"></mud-select>',
          '<mud-select size="large" label="Label" value="opt-2"></mud-select>',
          '<mud-select size="large" label="Label" placeholder="Placeholder" disabled></mud-select>',
          '<mud-select size="large" label="Label" value="opt-2" readonly></mud-select>',
          '<mud-select size="large" label="Label" placeholder="Placeholder" required></mud-select>',
          '<mud-select variant="destructive" size="large" label="Label" placeholder="Placeholder"></mud-select>',
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
          selectMarkup(`size="large" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"`),
        ),
        cell(
          'mandatory',
          selectMarkup(`size="large" label="Label" placeholder="Placeholder" helper-text="Required field" required`),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-select size="large" label="Label" placeholder="Placeholder" helper-text="Helper message displayed here"></mud-select>',
          '<mud-select size="large" label="Label" placeholder="Placeholder" helper-text="Required field" required></mud-select>',
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
          selectMarkup(
            `size="large" label="Label" placeholder="Placeholder" invalid error-text="Please select an option"`,
          ),
        ),
        cell(
          'explicit destructive',
          selectMarkup(
            `size="large" variant="destructive" label="Label" placeholder="Placeholder" error-text="Error message displayed here" invalid`,
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-select size="large" label="Label" placeholder="Placeholder" invalid error-text="Please select an option"></mud-select>',
          '<mud-select size="large" variant="destructive" label="Label" placeholder="Placeholder" error-text="Error message displayed here" invalid></mud-select>',
        ].join('\n'),
      },
    },
  },
};

export const WithIcons: Story = {
  name: 'With Icons',
  render: () => {
    const id1 = nextId();
    const id2 = nextId();
    return wrap(
      [
        cell(
          'icon-start',
          /*html*/ `<mud-select id="${id1}" size="large" label="Country" placeholder="Pick a country">
            <mud-icon slot="icon-start" name="house" size="20"></mud-icon>
          </mud-select>${optionsTag(id1)}`,
        ),
        cell(
          'with selected value',
          /*html*/ `<mud-select id="${id2}" size="large" label="Plan" value="opt-1">
            <mud-icon slot="icon-start" name="search" size="20"></mud-icon>
          </mud-select>${optionsTag(id2)}`,
        ),
      ].join(''),
    );
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-select size="large" label="Country" placeholder="Pick a country"><mud-icon slot="icon-start" name="house" size="20"></mud-icon></mud-select>',
          '<mud-select size="large" label="Plan" value="opt-1"><mud-icon slot="icon-start" name="search" size="20"></mud-icon></mud-select>',
        ].join('\n'),
      },
    },
  },
};

export const Open: Story = {
  name: 'Open Listbox',
  render: () => {
    const id1 = nextId();
    const id2 = nextId();
    return wrap(
      [
        cell(
          'open: default (no selection)',
          /*html*/ `<mud-select id="${id1}" size="large" label="Label" placeholder="Placeholder" open></mud-select>${optionsTag(id1)}`,
        ),
        cell(
          'open: with selection',
          /*html*/ `<mud-select id="${id2}" size="large" label="Label" value="opt-1" open></mud-select>${optionsTag(id2)}`,
        ),
      ].join(''),
    );
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-select size="large" label="Label" placeholder="Placeholder" open></mud-select>',
          '<mud-select size="large" label="Label" value="opt-1" open></mud-select>',
        ].join('\n'),
      },
    },
  },
};

export const WithLongOptions: Story = {
  name: 'With Long Options',
  render: () => {
    const id = nextId();
    const longOptions = JSON.stringify([
      { value: 'opt-1', label: 'Moldova (Republica Moldova)' },
      { value: 'opt-2', label: 'România' },
      { value: 'opt-3', label: 'Ucraina' },
      { value: 'opt-4', label: 'A very long option label that should truncate before the trailing chevron icon' },
      { value: 'opt-5', label: 'Federația Rusă' },
    ]);
    return /*html*/ `
      <div style="padding: var(--spacing-24); max-width: 320px;">
        <mud-select id="${id}" size="large" label="Pick a country" value="opt-4"></mud-select>
        <script>(function(){const el=document.getElementById('${id}');if(el)el.options=${longOptions};})();</script>
      </div>
    `;
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: '<mud-select size="large" label="Pick a country" value="opt-4"></mud-select>',
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
          selectMarkup(
            `size="large" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services" placeholder="Placeholder"`,
          ),
        ),
        cell(
          'helper truncation (two lines)',
          selectMarkup(
            `size="large" label="Label" placeholder="Placeholder" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."`,
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-select size="large" label="…long label…" placeholder="Placeholder"></mud-select>',
          '<mud-select size="large" label="Label" placeholder="Placeholder" helper-text="…long helper text…"></mud-select>',
        ].join('\n'),
      },
    },
  },
};
