import type { Meta, StoryObj } from '@storybook/web-components-vite';

import {
  SEARCH_INPUT_RECTANGULAR_SIZES,
  SEARCH_INPUT_RECTANGULAR_VARIANTS,
} from './cor-search-input-rectangular.types';
import type { SearchInputRectangularSize, SearchInputRectangularVariant } from './cor-search-input-rectangular.types';

type SearchArgs = {
  variant: SearchInputRectangularVariant;
  size: SearchInputRectangularSize;
  label: string;
  placeholder: string;
  value: string;
  helperText: string;
  errorText: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  clearable: boolean;
  loading: boolean;
  withButton: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderSearch = (args: SearchArgs) => /*html*/ `
  <cor-search-input-rectangular
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
    ${args.clearable ? '' : 'clearable="false"'}
    ${args.loading ? 'loading' : ''}
    ${args.withButton ? 'with-button' : ''}
  ></cor-search-input-rectangular>
`;

const docsSourceDefault = (args: SearchArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.invalid ? 'invalid' : '',
    args.clearable ? '' : 'clearable="false"',
    args.loading ? 'loading' : '',
    args.withButton ? 'with-button' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<cor-search-input-rectangular ${attrs}></cor-search-input-rectangular>`;
};

const meta: Meta<SearchArgs> = {
  title: 'Atoms/Input/Search/Rectangular',
  component: 'cor-search-input-rectangular',
  argTypes: {
    variant: {
      control: 'select',
      options: SEARCH_INPUT_RECTANGULAR_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: SEARCH_INPUT_RECTANGULAR_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
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
    variant: 'default',
    size: 'lg',
    label: '',
    placeholder: 'Caută…',
    value: '',
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
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

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      SEARCH_INPUT_RECTANGULAR_SIZES.map(size =>
        cell(
          size,
          /*html*/ `<cor-search-input-rectangular size="${size}" placeholder="Caută…"></cor-search-input-rectangular>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SEARCH_INPUT_RECTANGULAR_SIZES.map(
          s => `<cor-search-input-rectangular size="${s}" placeholder="Caută…"></cor-search-input-rectangular>`,
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
          /*html*/ `<cor-search-input-rectangular size="lg" placeholder="Caută…"></cor-search-input-rectangular>`,
        ),
        cell(
          'filled (clear button visible)',
          /*html*/ `<cor-search-input-rectangular size="lg" value="permis de conducere"></cor-search-input-rectangular>`,
        ),
        cell(
          'loading',
          /*html*/ `<cor-search-input-rectangular size="lg" value="permis de conducere" loading></cor-search-input-rectangular>`,
        ),
        cell(
          'disabled',
          /*html*/ `<cor-search-input-rectangular size="lg" placeholder="Caută…" disabled></cor-search-input-rectangular>`,
        ),
        cell(
          'readonly (filled)',
          /*html*/ `<cor-search-input-rectangular size="lg" value="permis de conducere" readonly></cor-search-input-rectangular>`,
        ),
        cell(
          'destructive (invalid)',
          /*html*/ `<cor-search-input-rectangular size="lg" variant="destructive" placeholder="Caută…"></cor-search-input-rectangular>`,
        ),
        cell(
          'required + labeled',
          /*html*/ `<cor-search-input-rectangular size="lg" label="Căutare" placeholder="Caută…" required></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="lg" placeholder="Caută…"></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" value="permis de conducere"></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" value="permis de conducere" loading></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" placeholder="Caută…" disabled></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" value="permis de conducere" readonly></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" variant="destructive" placeholder="Caută…"></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" label="Căutare" placeholder="Caută…" required></cor-search-input-rectangular>',
        ].join('\n'),
      },
    },
  },
};

export const LoadingNoButton: Story = {
  name: 'Loading (no button)',
  render: () =>
    wrap(
      [
        cell(
          'lg — loading + value',
          /*html*/ `<cor-search-input-rectangular size="lg" value="permis de conducere" loading></cor-search-input-rectangular>`,
        ),
        cell(
          'md — loading + value',
          /*html*/ `<cor-search-input-rectangular size="md" value="permis de conducere" loading></cor-search-input-rectangular>`,
        ),
        cell(
          'lg — loading + placeholder',
          /*html*/ `<cor-search-input-rectangular size="lg" placeholder="Caută…" loading></cor-search-input-rectangular>`,
        ),
        cell(
          'lg — loading + disabled',
          /*html*/ `<cor-search-input-rectangular size="lg" value="permis de conducere" loading disabled></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="lg" value="permis de conducere" loading></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="md" value="permis de conducere" loading></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" placeholder="Caută…" loading></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" value="permis de conducere" loading disabled></cor-search-input-rectangular>',
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
          'lg — empty (button disabled)',
          /*html*/ `<cor-search-input-rectangular size="lg" placeholder="Caută…" with-button></cor-search-input-rectangular>`,
        ),
        cell(
          'lg — filled (button active)',
          /*html*/ `<cor-search-input-rectangular size="lg" value="permis de conducere" with-button></cor-search-input-rectangular>`,
        ),
        cell(
          'md — empty (button disabled)',
          /*html*/ `<cor-search-input-rectangular size="md" placeholder="Caută…" with-button></cor-search-input-rectangular>`,
        ),
        cell(
          'md — filled (button active)',
          /*html*/ `<cor-search-input-rectangular size="md" value="cazier judiciar" with-button></cor-search-input-rectangular>`,
        ),
        cell(
          'lg — disabled',
          /*html*/ `<cor-search-input-rectangular size="lg" value="permis de conducere" with-button disabled></cor-search-input-rectangular>`,
        ),
        cell(
          'lg — labeled + helper',
          /*html*/ `<cor-search-input-rectangular size="lg" label="Căutare" placeholder="Caută…" helper-text="Apasă pe buton sau Enter pentru a căuta." with-button></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="lg" placeholder="Caută…" with-button></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" value="permis de conducere" with-button></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="md" placeholder="Caută…" with-button></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="md" value="cazier judiciar" with-button></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" value="permis de conducere" with-button disabled></cor-search-input-rectangular>',
        ].join('\n'),
      },
    },
  },
};

export const WithSubmitButtonLoading: Story = {
  name: 'With Submit Button (Loading)',
  render: () =>
    wrap(
      [
        cell(
          'lg — loading + filled',
          /*html*/ `<cor-search-input-rectangular size="lg" value="permis de conducere" loading with-button></cor-search-input-rectangular>`,
        ),
        cell(
          'md — loading + filled',
          /*html*/ `<cor-search-input-rectangular size="md" value="cazier judiciar" loading with-button></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="lg" value="permis de conducere" loading with-button></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="md" value="cazier judiciar" loading with-button></cor-search-input-rectangular>',
        ].join('\n'),
      },
    },
  },
};

export const WithValue: Story = {
  name: 'With Value',
  render: () =>
    wrap(
      [
        cell(
          'md',
          /*html*/ `<cor-search-input-rectangular size="md" value="cazier judiciar"></cor-search-input-rectangular>`,
        ),
        cell(
          'lg',
          /*html*/ `<cor-search-input-rectangular size="lg" value="cazier judiciar"></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="md" value="cazier judiciar"></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" value="cazier judiciar"></cor-search-input-rectangular>',
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
          /*html*/ `<cor-search-input-rectangular size="lg" placeholder="Filtrează…">
            <cor-icon slot="icon-start" name="filter" size="24" color="currentColor"></cor-icon>
          </cor-search-input-rectangular>`,
        ),
        cell(
          'iconName prop override',
          /*html*/ `<cor-search-input-rectangular size="lg" icon-name="document" placeholder="Caută în documente"></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="lg" placeholder="Filtrează…"><cor-icon slot="icon-start" name="filter" size="24" color="currentColor"></cor-icon></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" icon-name="document" placeholder="Caută în documente"></cor-search-input-rectangular>',
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
          /*html*/ `<cor-search-input-rectangular size="lg" value="serviciu activ" clearable="false"></cor-search-input-rectangular>`,
        ),
        cell(
          'default (clear visible)',
          /*html*/ `<cor-search-input-rectangular size="lg" value="serviciu activ"></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="lg" value="serviciu activ" clearable="false"></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" value="serviciu activ"></cor-search-input-rectangular>',
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
          /*html*/ `<cor-search-input-rectangular size="lg" label="Căutare" placeholder="Caută…" helper-text="Caută după nume, MIDR sau IDNP."></cor-search-input-rectangular>`,
        ),
        cell(
          'mandatory + helper',
          /*html*/ `<cor-search-input-rectangular size="lg" label="Căutare" placeholder="Caută…" helper-text="Câmp obligatoriu." required></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="lg" label="Căutare" placeholder="Caută…" helper-text="Caută după nume, MIDR sau IDNP."></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" label="Căutare" placeholder="Caută…" helper-text="Câmp obligatoriu." required></cor-search-input-rectangular>',
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
          /*html*/ `<cor-search-input-rectangular size="lg" label="Căutare" value="!!" invalid error-text="Foloseste doar caractere alfanumerice."></cor-search-input-rectangular>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<cor-search-input-rectangular size="lg" variant="destructive" label="Căutare" placeholder="Caută…" error-text="Termen invalid." invalid></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="lg" label="Căutare" value="!!" invalid error-text="Foloseste doar caractere alfanumerice."></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" variant="destructive" label="Căutare" placeholder="Caută…" error-text="Termen invalid." invalid></cor-search-input-rectangular>',
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
          /*html*/ `<cor-search-input-rectangular size="lg" value="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services"></cor-search-input-rectangular>`,
        ),
        cell(
          'long helper truncation (two lines)',
          /*html*/ `<cor-search-input-rectangular size="lg" label="Căutare" placeholder="Caută…" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></cor-search-input-rectangular>`,
        ),
        cell(
          'no label (toolbar usage)',
          /*html*/ `<cor-search-input-rectangular size="md" aria-label="Caută" placeholder="Caută…"></cor-search-input-rectangular>`,
        ),
        cell(
          'mid-typing (with value, focused)',
          /*html*/ `<cor-search-input-rectangular size="md" value="permis"></cor-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-search-input-rectangular size="lg" value="…long value…"></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="lg" label="Căutare" helper-text="…long helper…"></cor-search-input-rectangular>',
          '<cor-search-input-rectangular size="md" aria-label="Caută" placeholder="Caută…"></cor-search-input-rectangular>',
        ].join('\n'),
      },
    },
  },
};
