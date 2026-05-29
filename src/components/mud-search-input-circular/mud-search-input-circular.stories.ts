import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SEARCH_INPUT_CIRCULAR_SIZES, SEARCH_INPUT_CIRCULAR_VARIANTS } from './mud-search-input-circular.types';
import type { SearchInputCircularSize, SearchInputCircularVariant } from './mud-search-input-circular.types';

type SearchArgs = {
  variant: SearchInputCircularVariant;
  size: SearchInputCircularSize;
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
  <mud-search-input-circular
    aria-label="Caută"
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
  ></mud-search-input-circular>
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
  return `<mud-search-input-circular aria-label="Caută" ${attrs}></mud-search-input-circular>`;
};

const meta: Meta<SearchArgs> = {
  title: 'Atoms/Input/Search/Circular',
  component: 'mud-search-input-circular',
  argTypes: {
    variant: {
      control: 'select',
      options: SEARCH_INPUT_CIRCULAR_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: SEARCH_INPUT_CIRCULAR_SIZES,
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
      description: 'Renders a trailing brand-blue circular submit button (Figma `Button=True`).',
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
      SEARCH_INPUT_CIRCULAR_SIZES.map(size =>
        cell(
          size,
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="${size}" placeholder="Caută…"></mud-search-input-circular>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SEARCH_INPUT_CIRCULAR_SIZES.map(
          s => `<mud-search-input-circular aria-label="Caută" size="${s}" placeholder="Caută…"></mud-search-input-circular>`,
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
          /*html*/ `<mud-search-input-circular size="lg" aria-label="Caută" placeholder="Caută…"></mud-search-input-circular>`,
        ),
        cell(
          'filled (clear button visible)',
          /*html*/ `<mud-search-input-circular size="lg" aria-label="Caută" value="permis de conducere"></mud-search-input-circular>`,
        ),
        cell(
          'loading',
          /*html*/ `<mud-search-input-circular size="lg" aria-label="Caută" value="permis de conducere" loading></mud-search-input-circular>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-search-input-circular size="lg" aria-label="Caută" placeholder="Caută…" disabled></mud-search-input-circular>`,
        ),
        cell(
          'readonly (filled)',
          /*html*/ `<mud-search-input-circular size="lg" aria-label="Caută" value="permis de conducere" readonly></mud-search-input-circular>`,
        ),
        cell(
          'destructive (invalid)',
          /*html*/ `<mud-search-input-circular size="lg" aria-label="Caută" variant="destructive" placeholder="Caută…"></mud-search-input-circular>`,
        ),
        cell(
          'required + labeled',
          /*html*/ `<mud-search-input-circular size="lg" label="Căutare" placeholder="Caută…" required></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular size="lg" aria-label="Caută" placeholder="Caută…"></mud-search-input-circular>',
          '<mud-search-input-circular size="lg" aria-label="Caută" value="permis de conducere"></mud-search-input-circular>',
          '<mud-search-input-circular size="lg" aria-label="Caută" value="permis de conducere" loading></mud-search-input-circular>',
          '<mud-search-input-circular size="lg" aria-label="Caută" placeholder="Caută…" disabled></mud-search-input-circular>',
          '<mud-search-input-circular size="lg" aria-label="Caută" value="permis de conducere" readonly></mud-search-input-circular>',
          '<mud-search-input-circular size="lg" aria-label="Caută" variant="destructive" placeholder="Caută…"></mud-search-input-circular>',
          '<mud-search-input-circular size="lg" label="Căutare" placeholder="Caută…" required></mud-search-input-circular>',
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
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" loading></mud-search-input-circular>`,
        ),
        cell(
          'md — loading + value',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="md" value="permis de conducere" loading></mud-search-input-circular>`,
        ),
        cell(
          'lg — loading + placeholder',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" placeholder="Caută…" loading></mud-search-input-circular>`,
        ),
        cell(
          'lg — loading + disabled',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" loading disabled></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" loading></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="md" value="permis de conducere" loading></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="lg" placeholder="Caută…" loading></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" loading disabled></mud-search-input-circular>',
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
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" placeholder="Caută…" with-button></mud-search-input-circular>`,
        ),
        cell(
          'lg — filled (button active)',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" with-button></mud-search-input-circular>`,
        ),
        cell(
          'md — empty (button disabled)',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="md" placeholder="Caută…" with-button></mud-search-input-circular>`,
        ),
        cell(
          'md — filled (button active)',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="md" value="cazier judiciar" with-button></mud-search-input-circular>`,
        ),
        cell(
          'lg — disabled',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" with-button disabled></mud-search-input-circular>`,
        ),
        cell(
          'lg — labeled + helper',
          /*html*/ `<mud-search-input-circular size="lg" label="Căutare" placeholder="Caută…" helper-text="Apasă pe buton sau Enter pentru a căuta." with-button></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular aria-label="Caută" size="lg" placeholder="Caută…" with-button></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" with-button></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="md" placeholder="Caută…" with-button></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="md" value="cazier judiciar" with-button></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" with-button disabled></mud-search-input-circular>',
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
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" loading with-button></mud-search-input-circular>`,
        ),
        cell(
          'md — loading + filled',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="md" value="cazier judiciar" loading with-button></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere" loading with-button></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="md" value="cazier judiciar" loading with-button></mud-search-input-circular>',
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
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="md" value="cazier judiciar"></mud-search-input-circular>`,
        ),
        cell(
          'lg',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="cazier judiciar"></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular aria-label="Caută" size="md" value="cazier judiciar"></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="lg" value="cazier judiciar"></mud-search-input-circular>',
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
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" placeholder="Filtrează…">
            <mud-icon slot="icon-start" name="filter" size="24"></mud-icon>
          </mud-search-input-circular>`,
        ),
        cell(
          'iconName prop override',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" icon-name="document" placeholder="Caută în documente"></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular aria-label="Caută" size="lg" placeholder="Filtrează…"><mud-icon slot="icon-start" name="filter" size="24"></mud-icon></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="lg" icon-name="document" placeholder="Caută în documente"></mud-search-input-circular>',
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
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="serviciu activ" clearable="false"></mud-search-input-circular>`,
        ),
        cell(
          'default (clear visible)',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="serviciu activ"></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular aria-label="Caută" size="lg" value="serviciu activ" clearable="false"></mud-search-input-circular>',
          '<mud-search-input-circular aria-label="Caută" size="lg" value="serviciu activ"></mud-search-input-circular>',
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
          /*html*/ `<mud-search-input-circular size="lg" label="Căutare" placeholder="Caută…" helper-text="Caută după nume, MIDR sau IDNP."></mud-search-input-circular>`,
        ),
        cell(
          'mandatory + helper',
          /*html*/ `<mud-search-input-circular size="lg" label="Căutare" placeholder="Caută…" helper-text="Câmp obligatoriu." required></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular size="lg" label="Căutare" placeholder="Caută…" helper-text="Caută după nume, MIDR sau IDNP."></mud-search-input-circular>',
          '<mud-search-input-circular size="lg" label="Căutare" placeholder="Caută…" helper-text="Câmp obligatoriu." required></mud-search-input-circular>',
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
          /*html*/ `<mud-search-input-circular size="lg" label="Căutare" value="!!" invalid error-text="Foloseste doar caractere alfanumerice."></mud-search-input-circular>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<mud-search-input-circular size="lg" variant="destructive" label="Căutare" placeholder="Caută…" error-text="Termen invalid." invalid></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular size="lg" label="Căutare" value="!!" invalid error-text="Foloseste doar caractere alfanumerice."></mud-search-input-circular>',
          '<mud-search-input-circular size="lg" variant="destructive" label="Căutare" placeholder="Caută…" error-text="Termen invalid." invalid></mud-search-input-circular>',
        ].join('\n'),
      },
    },
  },
};

export const ShapeComparison: Story = {
  name: 'Shape Comparison',
  render: () =>
    wrap(
      [
        cell(
          'circular (pill silhouette)',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" placeholder="Caută…"></mud-search-input-circular>`,
        ),
        cell(
          'rectangular (rounded corners)',
          /*html*/ `<mud-search-input-rectangular aria-label="Caută" size="lg" placeholder="Caută…"></mud-search-input-rectangular>`,
        ),
        cell(
          'circular — filled',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="permis de conducere"></mud-search-input-circular>`,
        ),
        cell(
          'rectangular — filled',
          /*html*/ `<mud-search-input-rectangular aria-label="Caută" size="lg" value="permis de conducere"></mud-search-input-rectangular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Side-by-side comparison with the rectangular sibling — the silhouette is the only visual difference (fully rounded ends + +4px padding-inline to balance the curve).',
      },
      source: {
        code: [
          '<mud-search-input-circular aria-label="Caută" size="lg" placeholder="Caută…"></mud-search-input-circular>',
          '<mud-search-input-rectangular aria-label="Caută" size="lg" placeholder="Caută…"></mud-search-input-rectangular>',
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
          'long value truncation (in pill)',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="lg" value="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services"></mud-search-input-circular>`,
        ),
        cell(
          'long helper truncation (two lines)',
          /*html*/ `<mud-search-input-circular size="lg" label="Căutare" placeholder="Caută…" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></mud-search-input-circular>`,
        ),
        cell(
          'no label (toolbar usage)',
          /*html*/ `<mud-search-input-circular size="md" aria-label="Caută" placeholder="Caută…"></mud-search-input-circular>`,
        ),
        cell(
          'mid-typing (with value, md)',
          /*html*/ `<mud-search-input-circular aria-label="Caută" size="md" value="permis"></mud-search-input-circular>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-search-input-circular aria-label="Caută" size="lg" value="…long value…"></mud-search-input-circular>',
          '<mud-search-input-circular size="lg" label="Căutare" helper-text="…long helper…"></mud-search-input-circular>',
          '<mud-search-input-circular size="md" aria-label="Caută" placeholder="Caută…"></mud-search-input-circular>',
        ].join('\n'),
      },
    },
  },
};
