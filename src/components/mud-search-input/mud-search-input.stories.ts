import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SEARCH_INPUT_SHAPES, SEARCH_INPUT_SIZES } from './mud-search-input.types';
import type { SearchInputShape, SearchInputSize } from './mud-search-input.types';

type SearchArgs = {
  shape: SearchInputShape;
  size: SearchInputSize;
  label: string;
  placeholder: string;
  value: string;
  helperText: string;
  required: boolean;
  disabled: boolean;
  clearable: boolean;
  loading: boolean;
  withButton: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderSearch = (args: SearchArgs) => /*html*/ `
  <mud-search-input
    aria-label="Caută"
    shape="${args.shape}"
    size="${args.size}"
    label="${args.label}"
    placeholder="${args.placeholder}"
    value="${args.value}"
    helper-text="${args.helperText}"
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.clearable ? '' : 'clearable="false"'}
    ${args.loading ? 'loading' : ''}
    ${args.withButton ? 'with-button' : ''}
  ></mud-search-input>
`;

const docsSourceDefault = (args: SearchArgs) => {
  const attrs = [
    args.shape !== 'rectangular' ? `shape="${args.shape}"` : '',
    args.size !== 'sm' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.clearable ? '' : 'clearable="false"',
    args.loading ? 'loading' : '',
    args.withButton ? 'with-button' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-search-input aria-label="Caută" ${attrs}></mud-search-input>`;
};

const meta: Meta<SearchArgs> = {
  title: 'Atoms/Input/Search',
  component: 'mud-search-input',
  argTypes: {
    shape: {
      control: 'inline-radio',
      options: SEARCH_INPUT_SHAPES,
      description: 'Silhouette — `rectangular` (lightly rounded) or `circular` (pill).',
      table: { defaultValue: { summary: 'rectangular' } },
    },
    size: {
      control: 'inline-radio',
      options: SEARCH_INPUT_SIZES,
      description: 'Visual size rung. `sm` is 40px tall, `md` is 48px tall.',
      table: { defaultValue: { summary: 'sm' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    helperText: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    clearable: { control: 'boolean' },
    loading: { control: 'boolean', description: 'Shows a trailing spinner; sets `aria-busy`.' },
    withButton: {
      control: 'boolean',
      description: 'Renders a trailing brand-blue submit button (Figma `Button=True`).',
    },
  },
};

export default meta;

type Story = StoryObj<SearchArgs>;

export const Default: Story = {
  render: renderSearch,
  args: {
    shape: 'rectangular',
    size: 'sm',
    label: '',
    placeholder: 'Caută…',
    value: '',
    helperText: '',
    required: false,
    disabled: false,
    clearable: true,
    loading: false,
    withButton: false,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: SearchArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const Shapes: Story = {
  name: 'Shapes',
  render: () =>
    wrap(
      SEARCH_INPUT_SHAPES.map(shape =>
        cell(
          shape,
          /*html*/ `<mud-search-input aria-label="Caută" shape="${shape}" placeholder="Caută…"></mud-search-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SEARCH_INPUT_SHAPES.map(
          s => `<mud-search-input aria-label="Caută" shape="${s}" placeholder="Caută…"></mud-search-input>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      SEARCH_INPUT_SIZES.map(size =>
        cell(
          size,
          /*html*/ `<mud-search-input aria-label="Caută" size="${size}" placeholder="Caută…"></mud-search-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SEARCH_INPUT_SIZES.map(
          s => `<mud-search-input aria-label="Caută" size="${s}" placeholder="Caută…"></mud-search-input>`,
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
        cell(
          'default',
          /*html*/ `<mud-search-input aria-label="Caută" placeholder="Caută…"></mud-search-input>`,
        ),
        cell(
          'filled (clear button visible)',
          /*html*/ `<mud-search-input aria-label="Caută" value="permis de conducere"></mud-search-input>`,
        ),
        cell(
          'loading',
          /*html*/ `<mud-search-input aria-label="Caută" value="permis de conducere" loading></mud-search-input>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-search-input aria-label="Caută" placeholder="Caută…" disabled></mud-search-input>`,
        ),
        cell(
          'required + labeled',
          /*html*/ `<mud-search-input label="Căutare" placeholder="Caută…" required></mud-search-input>`,
        ),
        cell(
          'with helper text',
          /*html*/ `<mud-search-input label="Căutare" placeholder="Caută…" helper-text="Caută după nume, MIDR sau IDNP."></mud-search-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input aria-label="Caută" placeholder="Caută…"></mud-search-input>',
          '<mud-search-input aria-label="Caută" value="permis de conducere"></mud-search-input>',
          '<mud-search-input aria-label="Caută" value="permis de conducere" loading></mud-search-input>',
          '<mud-search-input aria-label="Caută" placeholder="Caută…" disabled></mud-search-input>',
          '<mud-search-input label="Căutare" placeholder="Caută…" required></mud-search-input>',
          '<mud-search-input label="Căutare" placeholder="Caută…" helper-text="Caută după nume, MIDR sau IDNP."></mud-search-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithSubmitButton: Story = {
  name: 'With Submit Button',
  render: () =>
    wrap(
      [
        cell(
          'rectangular — empty (button disabled)',
          /*html*/ `<mud-search-input aria-label="Caută" placeholder="Caută…" with-button></mud-search-input>`,
        ),
        cell(
          'rectangular — filled (button active)',
          /*html*/ `<mud-search-input aria-label="Caută" value="permis de conducere" with-button></mud-search-input>`,
        ),
        cell(
          'circular — empty (button disabled)',
          /*html*/ `<mud-search-input aria-label="Caută" shape="circular" placeholder="Caută…" with-button></mud-search-input>`,
        ),
        cell(
          'circular — filled (button active)',
          /*html*/ `<mud-search-input aria-label="Caută" shape="circular" value="cazier judiciar" with-button></mud-search-input>`,
        ),
        cell(
          'md — filled + loading',
          /*html*/ `<mud-search-input aria-label="Caută" size="md" value="permis de conducere" loading with-button></mud-search-input>`,
        ),
        cell(
          'labeled + helper',
          /*html*/ `<mud-search-input label="Căutare" placeholder="Caută…" helper-text="Apasă pe buton sau Enter pentru a căuta." with-button></mud-search-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input aria-label="Caută" placeholder="Caută…" with-button></mud-search-input>',
          '<mud-search-input aria-label="Caută" value="permis de conducere" with-button></mud-search-input>',
          '<mud-search-input aria-label="Caută" shape="circular" value="cazier judiciar" with-button></mud-search-input>',
          '<mud-search-input aria-label="Caută" size="md" value="permis de conducere" loading with-button></mud-search-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithCustomIcon: Story = {
  name: 'With Custom Icon',
  render: () =>
    wrap(
      [
        cell(
          'icon-start slot override',
          /*html*/ `<mud-search-input aria-label="Caută" placeholder="Filtrează…">
            <mud-icon slot="icon-start" name="filter" size="20"></mud-icon>
          </mud-search-input>`,
        ),
        cell(
          'iconName prop override',
          /*html*/ `<mud-search-input aria-label="Caută" icon-name="document" placeholder="Caută în documente"></mud-search-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input aria-label="Caută" placeholder="Filtrează…"><mud-icon slot="icon-start" name="filter" size="20"></mud-icon></mud-search-input>',
          '<mud-search-input aria-label="Caută" icon-name="document" placeholder="Caută în documente"></mud-search-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithoutClearButton: Story = {
  name: 'Without Clear Button',
  render: () =>
    wrap(
      [
        cell(
          'clearable=false (persistent filter)',
          /*html*/ `<mud-search-input aria-label="Caută" value="serviciu activ" clearable="false"></mud-search-input>`,
        ),
        cell(
          'default (clear visible)',
          /*html*/ `<mud-search-input aria-label="Caută" value="serviciu activ"></mud-search-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input aria-label="Caută" value="serviciu activ" clearable="false"></mud-search-input>',
          '<mud-search-input aria-label="Caută" value="serviciu activ"></mud-search-input>',
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
          'long value truncation',
          /*html*/ `<mud-search-input aria-label="Caută" value="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services"></mud-search-input>`,
        ),
        cell(
          'long helper truncation (two lines)',
          /*html*/ `<mud-search-input label="Căutare" placeholder="Caută…" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></mud-search-input>`,
        ),
        cell(
          'no label (toolbar usage)',
          /*html*/ `<mud-search-input aria-label="Caută" placeholder="Caută…"></mud-search-input>`,
        ),
        cell(
          'circular + md + value',
          /*html*/ `<mud-search-input aria-label="Caută" shape="circular" size="md" value="permis"></mud-search-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input aria-label="Caută" value="…long value…"></mud-search-input>',
          '<mud-search-input label="Căutare" helper-text="…long helper…"></mud-search-input>',
          '<mud-search-input aria-label="Caută" placeholder="Caută…"></mud-search-input>',
        ].join('\n'),
      },
    },
  },
};
