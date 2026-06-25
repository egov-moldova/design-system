import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TEXTAREA_RESIZE, TEXTAREA_SIZES, TEXTAREA_VARIANTS } from './mud-textarea.types';
import type { TextareaResize, TextareaSize, TextareaVariant } from './mud-textarea.types';

type TextareaArgs = {
  variant: TextareaVariant;
  size: TextareaSize;
  resize: TextareaResize;
  label: string;
  placeholder: string;
  value: string;
  helperText: string;
  errorText: string;
  rows: number;
  maxLength: number;
  showCounter: boolean;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderTextarea = (args: TextareaArgs) => /*html*/ `
  <mud-textarea
    variant="${args.variant}"
    size="${args.size}"
    resize="${args.resize}"
    label="${args.label}"
    placeholder="${args.placeholder}"
    value="${args.value}"
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    rows="${args.rows}"
    ${typeof args.maxLength === 'number' && args.maxLength > 0 ? `maxlength="${args.maxLength}"` : ''}
    ${args.showCounter ? '' : 'show-counter="false"'}
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.readonly ? 'readonly' : ''}
    ${args.invalid ? 'invalid' : ''}
  ></mud-textarea>
`;

const docsSourceDefault = (args: TextareaArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.resize !== 'vertical' ? `resize="${args.resize}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.rows && args.rows !== 4 ? `rows="${args.rows}"` : '',
    typeof args.maxLength === 'number' && args.maxLength > 0 ? `maxlength="${args.maxLength}"` : '',
    args.showCounter ? '' : 'show-counter="false"',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.invalid ? 'invalid' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-textarea ${attrs}></mud-textarea>`;
};

const meta: Meta<TextareaArgs> = {
  title: 'Atoms/Input/Textarea',
  component: 'mud-textarea',
  argTypes: {
    variant: {
      control: 'select',
      options: TEXTAREA_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: TEXTAREA_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    resize: {
      control: 'select',
      options: TEXTAREA_RESIZE,
      description: 'Vertical resize affordance.',
      table: { defaultValue: { summary: 'vertical' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    rows: { control: { type: 'number', min: 1, max: 20 } },
    maxLength: { control: { type: 'number', min: 0, max: 2000 } },
    showCounter: { control: 'boolean' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<TextareaArgs>;

export const Default: Story = {
  render: renderTextarea,
  args: {
    variant: 'default',
    size: 'lg',
    resize: 'vertical',
    label: 'Descriere',
    placeholder: 'Adaugă o descriere…',
    value: '',
    helperText: '',
    errorText: '',
    rows: 4,
    maxLength: 0,
    showCounter: true,
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: TextareaArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 384px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 920px;">
    ${children}
  </div>
`;

const wrapWide = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 240px)); gap: var(--spacing-32) var(--spacing-24); padding: var(--spacing-24); max-width: 1120px;">
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
      TEXTAREA_VARIANTS.map(variant =>
        cell(
          variant,
          /*html*/ `<mud-textarea variant="${variant}" size="lg" label="Descriere" placeholder="Adaugă o descriere…"></mud-textarea>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TEXTAREA_VARIANTS.map(
          v =>
            `<mud-textarea variant="${v}" size="lg" label="Descriere" placeholder="Adaugă o descriere…"></mud-textarea>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      TEXTAREA_SIZES.map(size =>
        cell(
          size,
          /*html*/ `<mud-textarea size="${size}" label="Descriere" placeholder="Adaugă o descriere…"></mud-textarea>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TEXTAREA_SIZES.map(
          s => `<mud-textarea size="${s}" label="Descriere" placeholder="Adaugă o descriere…"></mud-textarea>`,
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
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…"></mud-textarea>`,
        ),
        cell(
          'hover (use mouse)',
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…"></mud-textarea>`,
        ),
        cell(
          'focus (use Tab)',
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…"></mud-textarea>`,
        ),
        cell(
          'filled',
          /*html*/ `<mud-textarea size="lg" label="Descriere" value="Rezolvarea problemei nu mai funcționează corect după ultima actualizare."></mud-textarea>`,
        ),
        cell(
          'read-only',
          /*html*/ `<mud-textarea size="lg" label="Descriere" value="Acest conținut este doar pentru citire." readonly></mud-textarea>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" disabled></mud-textarea>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" required></mud-textarea>`,
        ),
        cell(
          'destructive',
          /*html*/ `<mud-textarea size="lg" variant="destructive" label="Descriere" placeholder="Adaugă o descriere…" invalid error-text="Câmpul este obligatoriu"></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…"></mud-textarea>',
          '<mud-textarea size="lg" label="Descriere" value="…" readonly></mud-textarea>',
          '<mud-textarea size="lg" label="Descriere" disabled></mud-textarea>',
          '<mud-textarea size="lg" label="Descriere" required></mud-textarea>',
          '<mud-textarea size="lg" variant="destructive" label="Descriere" invalid error-text="Câmpul este obligatoriu"></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const WithLabel: Story = {
  name: 'With Label',
  render: () =>
    wrap(
      [
        cell(
          'plain label',
          /*html*/ `<mud-textarea size="lg" label="Motivul cererii" placeholder="Descrie motivul…"></mud-textarea>`,
        ),
        cell(
          'label slot (rich)',
          /*html*/ `<mud-textarea size="lg" placeholder="Adaugă o descriere…">
            <span slot="label">Comentarii <strong>(opțional)</strong></span>
          </mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Motivul cererii" placeholder="Descrie motivul…"></mud-textarea>',
          '<mud-textarea size="lg" placeholder="…"><span slot="label">Comentarii <strong>(opțional)</strong></span></mud-textarea>',
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
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" helper-text="Maxim 500 de caractere, fără date personale."></mud-textarea>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-textarea size="lg" label="Motivul cererii" placeholder="Descrie motivul…" helper-text="Câmp obligatoriu pentru continuare." required></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Descriere" helper-text="Maxim 500 de caractere, fără date personale."></mud-textarea>',
          '<mud-textarea size="lg" label="Motivul cererii" helper-text="Câmp obligatoriu pentru continuare." required></mud-textarea>',
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
          'invalid + error',
          /*html*/ `<mud-textarea size="lg" label="Comentarii" value="ok" invalid error-text="Mesajul trebuie să conțină cel puțin 20 de caractere."></mud-textarea>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<mud-textarea size="lg" variant="destructive" label="Descriere" placeholder="Adaugă o descriere…" error-text="Câmpul este obligatoriu" invalid></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Comentarii" value="ok" invalid error-text="Mesajul trebuie să conțină cel puțin 20 de caractere."></mud-textarea>',
          '<mud-textarea size="lg" variant="destructive" label="Descriere" placeholder="…" error-text="Câmpul este obligatoriu" invalid></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const WithCharacterCounter: Story = {
  name: 'With Character Counter',
  render: () =>
    wrap(
      [
        cell(
          'default + counter',
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" maxlength="500"></mud-textarea>`,
        ),
        cell(
          'with helper + counter',
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" helper-text="Maxim 500 de caractere." maxlength="500"></mud-textarea>`,
        ),
        cell(
          'near limit',
          /*html*/ `<mud-textarea size="lg" label="Comentarii" value="Acesta este un comentariu care se apropie de limita maximă permisă pentru acest câmp." maxlength="100"></mud-textarea>`,
        ),
        cell(
          'over limit',
          /*html*/ `<mud-textarea size="lg" label="Comentarii" value="Acesta este un comentariu mult prea lung care depășește limita maximă permisă pentru acest câmp și ar trebui să afișeze un avertisment vizual." maxlength="50" invalid error-text="Mesajul depășește limita admisă."></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Descriere" placeholder="…" maxlength="500"></mud-textarea>',
          '<mud-textarea size="lg" label="Descriere" helper-text="…" maxlength="500"></mud-textarea>',
          '<mud-textarea size="lg" label="Comentarii" value="…" maxlength="100"></mud-textarea>',
          '<mud-textarea size="lg" label="Comentarii" value="…" maxlength="50" invalid error-text="Mesajul depășește limita admisă."></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const Mandatory: Story = {
  name: 'Mandatory',
  render: () =>
    wrap(
      [
        cell(
          'mandatory (lg)',
          /*html*/ `<mud-textarea size="lg" label="Motivul cererii" placeholder="Descrie motivul…" required></mud-textarea>`,
        ),
        cell(
          'mandatory + helper',
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" helper-text="Câmp obligatoriu." required></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Motivul cererii" required></mud-textarea>',
          '<mud-textarea size="lg" label="Descriere" helper-text="Câmp obligatoriu." required></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const Readonly: Story = {
  name: 'Read-Only',
  render: () =>
    wrap(
      [
        cell(
          'read-only (lg)',
          /*html*/ `<mud-textarea size="lg" label="Comentarii" value="Acest conținut este doar pentru citire și nu poate fi modificat." readonly helper-text="Câmp doar pentru citire."></mud-textarea>`,
        ),
        cell(
          'disabled (for comparison)',
          /*html*/ `<mud-textarea size="lg" label="Comentarii" value="Acest conținut este dezactivat și inaccesibil." disabled helper-text="Câmp dezactivat."></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Comentarii" value="…" readonly helper-text="Câmp doar pentru citire."></mud-textarea>',
          '<mud-textarea size="lg" label="Comentarii" value="…" disabled helper-text="Câmp dezactivat."></mud-textarea>',
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
        cell(
          'disabled empty',
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" disabled></mud-textarea>`,
        ),
        cell(
          'disabled filled',
          /*html*/ `<mud-textarea size="lg" label="Comentarii" value="Conținut existent care nu mai poate fi editat." disabled></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Descriere" placeholder="…" disabled></mud-textarea>',
          '<mud-textarea size="lg" label="Comentarii" value="…" disabled></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const NoResize: Story = {
  name: 'No Resize',
  render: () =>
    wrap(
      [
        cell(
          'resize="none"',
          /*html*/ `<mud-textarea size="lg" resize="none" label="Descriere" placeholder="Adaugă o descriere…"></mud-textarea>`,
        ),
        cell(
          'resize="none" + filled',
          /*html*/ `<mud-textarea size="lg" resize="none" label="Comentarii" value="Acest câmp are dimensiune fixă și nu poate fi redimensionat de utilizator."></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" resize="none" label="Descriere" placeholder="…"></mud-textarea>',
          '<mud-textarea size="lg" resize="none" label="Comentarii" value="…"></mud-textarea>',
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
          /*html*/ `<mud-textarea size="lg" label="Evoluția digitală a Republicii Moldova este în centrul livrării fără cusur a serviciilor publice, oferind fiecărui rezident acces sigur, eficient și accesibil." placeholder="Adaugă o descriere…"></mud-textarea>`,
        ),
        cell(
          'helper truncation (two lines)',
          /*html*/ `<mud-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" helper-text="Evoluția digitală a Republicii Moldova este în centrul livrării fără cusur a serviciilor publice, oferind fiecărui rezident acces sigur, eficient și accesibil online."></mud-textarea>`,
        ),
        cell(
          'very long content (scroll)',
          /*html*/ `<mud-textarea size="lg" label="Comentarii" value="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="…long label…" placeholder="…"></mud-textarea>',
          '<mud-textarea size="lg" label="Descriere" helper-text="…long helper…"></mud-textarea>',
          '<mud-textarea size="lg" label="Comentarii" value="…long content…"></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};
