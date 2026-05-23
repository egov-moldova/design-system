import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TEXTAREA_RESIZE, TEXTAREA_SIZES, TEXTAREA_VARIANTS } from './cor-textarea.types';
import type { TextareaResize, TextareaSize, TextareaVariant } from './cor-textarea.types';

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
  <cor-textarea
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
  ></cor-textarea>
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
  return `<cor-textarea ${attrs}></cor-textarea>`;
};

const meta: Meta<TextareaArgs> = {
  title: 'Atoms/Input/Textarea',
  component: 'cor-textarea',
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
          /*html*/ `<cor-textarea variant="${variant}" size="lg" label="Descriere" placeholder="Adaugă o descriere…"></cor-textarea>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TEXTAREA_VARIANTS.map(
          v =>
            `<cor-textarea variant="${v}" size="lg" label="Descriere" placeholder="Adaugă o descriere…"></cor-textarea>`,
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
          /*html*/ `<cor-textarea size="${size}" label="Descriere" placeholder="Adaugă o descriere…"></cor-textarea>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TEXTAREA_SIZES.map(
          s => `<cor-textarea size="${s}" label="Descriere" placeholder="Adaugă o descriere…"></cor-textarea>`,
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
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…"></cor-textarea>`,
        ),
        cell(
          'hover (use mouse)',
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…"></cor-textarea>`,
        ),
        cell(
          'focus (use Tab)',
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…"></cor-textarea>`,
        ),
        cell(
          'filled',
          /*html*/ `<cor-textarea size="lg" label="Descriere" value="Rezolvarea problemei nu mai funcționează corect după ultima actualizare."></cor-textarea>`,
        ),
        cell(
          'read-only',
          /*html*/ `<cor-textarea size="lg" label="Descriere" value="Acest conținut este doar pentru citire." readonly></cor-textarea>`,
        ),
        cell(
          'disabled',
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" disabled></cor-textarea>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" required></cor-textarea>`,
        ),
        cell(
          'destructive',
          /*html*/ `<cor-textarea size="lg" variant="destructive" label="Descriere" placeholder="Adaugă o descriere…" invalid error-text="Câmpul este obligatoriu"></cor-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…"></cor-textarea>',
          '<cor-textarea size="lg" label="Descriere" value="…" readonly></cor-textarea>',
          '<cor-textarea size="lg" label="Descriere" disabled></cor-textarea>',
          '<cor-textarea size="lg" label="Descriere" required></cor-textarea>',
          '<cor-textarea size="lg" variant="destructive" label="Descriere" invalid error-text="Câmpul este obligatoriu"></cor-textarea>',
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
          /*html*/ `<cor-textarea size="lg" label="Motivul cererii" placeholder="Descrie motivul…"></cor-textarea>`,
        ),
        cell(
          'label slot (rich)',
          /*html*/ `<cor-textarea size="lg" placeholder="Adaugă o descriere…">
            <span slot="label">Comentarii <strong>(opțional)</strong></span>
          </cor-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" label="Motivul cererii" placeholder="Descrie motivul…"></cor-textarea>',
          '<cor-textarea size="lg" placeholder="…"><span slot="label">Comentarii <strong>(opțional)</strong></span></cor-textarea>',
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
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" helper-text="Maxim 500 de caractere, fără date personale."></cor-textarea>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<cor-textarea size="lg" label="Motivul cererii" placeholder="Descrie motivul…" helper-text="Câmp obligatoriu pentru continuare." required></cor-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" label="Descriere" helper-text="Maxim 500 de caractere, fără date personale."></cor-textarea>',
          '<cor-textarea size="lg" label="Motivul cererii" helper-text="Câmp obligatoriu pentru continuare." required></cor-textarea>',
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
          /*html*/ `<cor-textarea size="lg" label="Comentarii" value="ok" invalid error-text="Mesajul trebuie să conțină cel puțin 20 de caractere."></cor-textarea>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<cor-textarea size="lg" variant="destructive" label="Descriere" placeholder="Adaugă o descriere…" error-text="Câmpul este obligatoriu" invalid></cor-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" label="Comentarii" value="ok" invalid error-text="Mesajul trebuie să conțină cel puțin 20 de caractere."></cor-textarea>',
          '<cor-textarea size="lg" variant="destructive" label="Descriere" placeholder="…" error-text="Câmpul este obligatoriu" invalid></cor-textarea>',
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
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" maxlength="500"></cor-textarea>`,
        ),
        cell(
          'with helper + counter',
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" helper-text="Maxim 500 de caractere." maxlength="500"></cor-textarea>`,
        ),
        cell(
          'near limit',
          /*html*/ `<cor-textarea size="lg" label="Comentarii" value="Acesta este un comentariu care se apropie de limita maximă permisă pentru acest câmp." maxlength="100"></cor-textarea>`,
        ),
        cell(
          'over limit',
          /*html*/ `<cor-textarea size="lg" label="Comentarii" value="Acesta este un comentariu mult prea lung care depășește limita maximă permisă pentru acest câmp și ar trebui să afișeze un avertisment vizual." maxlength="50" invalid error-text="Mesajul depășește limita admisă."></cor-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" label="Descriere" placeholder="…" maxlength="500"></cor-textarea>',
          '<cor-textarea size="lg" label="Descriere" helper-text="…" maxlength="500"></cor-textarea>',
          '<cor-textarea size="lg" label="Comentarii" value="…" maxlength="100"></cor-textarea>',
          '<cor-textarea size="lg" label="Comentarii" value="…" maxlength="50" invalid error-text="Mesajul depășește limita admisă."></cor-textarea>',
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
          /*html*/ `<cor-textarea size="lg" label="Motivul cererii" placeholder="Descrie motivul…" required></cor-textarea>`,
        ),
        cell(
          'mandatory + helper',
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" helper-text="Câmp obligatoriu." required></cor-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" label="Motivul cererii" required></cor-textarea>',
          '<cor-textarea size="lg" label="Descriere" helper-text="Câmp obligatoriu." required></cor-textarea>',
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
          /*html*/ `<cor-textarea size="lg" label="Comentarii" value="Acest conținut este doar pentru citire și nu poate fi modificat." readonly helper-text="Câmp doar pentru citire."></cor-textarea>`,
        ),
        cell(
          'disabled (for comparison)',
          /*html*/ `<cor-textarea size="lg" label="Comentarii" value="Acest conținut este dezactivat și inaccesibil." disabled helper-text="Câmp dezactivat."></cor-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" label="Comentarii" value="…" readonly helper-text="Câmp doar pentru citire."></cor-textarea>',
          '<cor-textarea size="lg" label="Comentarii" value="…" disabled helper-text="Câmp dezactivat."></cor-textarea>',
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
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" disabled></cor-textarea>`,
        ),
        cell(
          'disabled filled',
          /*html*/ `<cor-textarea size="lg" label="Comentarii" value="Conținut existent care nu mai poate fi editat." disabled></cor-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" label="Descriere" placeholder="…" disabled></cor-textarea>',
          '<cor-textarea size="lg" label="Comentarii" value="…" disabled></cor-textarea>',
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
          /*html*/ `<cor-textarea size="lg" resize="none" label="Descriere" placeholder="Adaugă o descriere…"></cor-textarea>`,
        ),
        cell(
          'resize="none" + filled',
          /*html*/ `<cor-textarea size="lg" resize="none" label="Comentarii" value="Acest câmp are dimensiune fixă și nu poate fi redimensionat de utilizator."></cor-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" resize="none" label="Descriere" placeholder="…"></cor-textarea>',
          '<cor-textarea size="lg" resize="none" label="Comentarii" value="…"></cor-textarea>',
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
          /*html*/ `<cor-textarea size="lg" label="Evoluția digitală a Republicii Moldova este în centrul livrării fără cusur a serviciilor publice, oferind fiecărui rezident acces sigur, eficient și accesibil." placeholder="Adaugă o descriere…"></cor-textarea>`,
        ),
        cell(
          'helper truncation (two lines)',
          /*html*/ `<cor-textarea size="lg" label="Descriere" placeholder="Adaugă o descriere…" helper-text="Evoluția digitală a Republicii Moldova este în centrul livrării fără cusur a serviciilor publice, oferind fiecărui rezident acces sigur, eficient și accesibil online."></cor-textarea>`,
        ),
        cell(
          'very long content (scroll)',
          /*html*/ `<cor-textarea size="lg" label="Comentarii" value="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."></cor-textarea>`,
        ),
        cell(
          'RTL content',
          /*html*/ `<div dir="rtl"><cor-textarea size="lg" label="تعليقات" placeholder="أضف تعليقًا…" value="هذا نص تجريبي بالعربية."></cor-textarea></div>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-textarea size="lg" label="…long label…" placeholder="…"></cor-textarea>',
          '<cor-textarea size="lg" label="Descriere" helper-text="…long helper…"></cor-textarea>',
          '<cor-textarea size="lg" label="Comentarii" value="…long content…"></cor-textarea>',
          '<div dir="rtl"><cor-textarea size="lg" label="تعليقات" value="…"></cor-textarea></div>',
        ].join('\n'),
      },
    },
  },
};
