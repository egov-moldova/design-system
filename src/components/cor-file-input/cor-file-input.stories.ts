import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { FILE_INPUT_SIZES, FILE_INPUT_VARIANTS } from './cor-file-input.types';
import type { FileInputSize, FileInputVariant } from './cor-file-input.types';

type FileInputArgs = {
  variant: FileInputVariant;
  size: FileInputSize;
  label: string;
  helperText: string;
  errorText: string;
  dropzoneText: string;
  dropzoneHint: string;
  multiple: boolean;
  required: boolean;
  disabled: boolean;
  invalid: boolean;
  accept: string;
  maxSize: number;
  maxFiles: number;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderFileInput = (args: FileInputArgs) => /*html*/ `
  <cor-file-input
    variant="${args.variant}"
    size="${args.size}"
    label="${args.label}"
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    dropzone-text="${args.dropzoneText}"
    dropzone-hint="${args.dropzoneHint}"
    accept="${args.accept}"
    max-size="${args.maxSize || ''}"
    max-files="${args.maxFiles || ''}"
    ${args.multiple ? 'multiple' : ''}
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.invalid ? 'invalid' : ''}
  ></cor-file-input>
`;

const docsSourceDefault = (args: FileInputArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.dropzoneText && args.dropzoneText !== 'Trage fișierele aici sau apasă pentru a căuta'
      ? `dropzone-text="${args.dropzoneText}"`
      : '',
    args.dropzoneHint ? `dropzone-hint="${args.dropzoneHint}"` : '',
    args.accept ? `accept="${args.accept}"` : '',
    args.maxSize ? `max-size="${args.maxSize}"` : '',
    args.maxFiles ? `max-files="${args.maxFiles}"` : '',
    args.multiple ? 'multiple' : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.invalid ? 'invalid' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<cor-file-input ${attrs}></cor-file-input>`;
};

const meta: Meta<FileInputArgs> = {
  title: 'Atoms/Input/File',
  component: 'cor-file-input',
  argTypes: {
    variant: {
      control: 'select',
      options: FILE_INPUT_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: FILE_INPUT_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    label: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    dropzoneText: { control: 'text' },
    dropzoneHint: { control: 'text' },
    accept: { control: 'text', description: 'MIME / extension allow-list (`.pdf,image/*`).' },
    maxSize: { control: 'number', description: 'Max per-file size in bytes.' },
    maxFiles: { control: 'number', description: 'Max accepted file count (multiple only).' },
    multiple: { control: 'boolean' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<FileInputArgs>;

export const Default: Story = {
  render: renderFileInput,
  args: {
    variant: 'default',
    size: 'lg',
    label: 'Atașează documente',
    helperText: 'PDF sau JPG, maximum 5 MB per fișier.',
    errorText: '',
    dropzoneText: 'Trage fișierele aici sau apasă pentru a căuta',
    dropzoneHint: 'PDF, JPG • max 5 MB',
    accept: '',
    maxSize: 0,
    maxFiles: 0,
    multiple: false,
    required: false,
    disabled: false,
    invalid: false,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: FileInputArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 360px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 800px;">
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
      FILE_INPUT_VARIANTS.map(variant =>
        cell(
          variant,
          /*html*/ `<cor-file-input variant="${variant}" size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: FILE_INPUT_VARIANTS.map(
          v =>
            `<cor-file-input variant="${v}" size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      FILE_INPUT_SIZES.map(size =>
        cell(
          size,
          /*html*/ `<cor-file-input size="${size}" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: FILE_INPUT_SIZES.map(
          s => `<cor-file-input size="${s}" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
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
          'idle',
          /*html*/ `<cor-file-input size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<cor-file-input size="lg" label="Documente" required dropzone-hint="Câmp obligatoriu"></cor-file-input>`,
        ),
        cell(
          'disabled',
          /*html*/ `<cor-file-input size="lg" label="Documente" disabled dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
        cell(
          'destructive',
          /*html*/ `<cor-file-input variant="destructive" size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
        cell(
          'invalid + error',
          /*html*/ `<cor-file-input size="lg" label="Documente" invalid error-text="Trebuie să atașați cel puțin un document"></cor-file-input>`,
        ),
        cell(
          'with helper',
          /*html*/ `<cor-file-input size="lg" label="Documente" helper-text="Acceptăm fișiere PDF sau JPG"></cor-file-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-file-input size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>',
          '<cor-file-input size="lg" label="Documente" required dropzone-hint="Câmp obligatoriu"></cor-file-input>',
          '<cor-file-input size="lg" label="Documente" disabled dropzone-hint="PDF • max 5 MB"></cor-file-input>',
          '<cor-file-input variant="destructive" size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>',
          '<cor-file-input size="lg" label="Documente" invalid error-text="…"></cor-file-input>',
          '<cor-file-input size="lg" label="Documente" helper-text="…"></cor-file-input>',
        ].join('\n'),
      },
    },
  },
};

// Pre-populated demo using DataTransfer to seed File objects on the host.
// Storybook's rendered HTML cannot carry runtime File arrays via attributes,
// so we hydrate after mount.
const preloadedHtml = (
  caption: string,
  extraAttrs: string,
  files: { name: string; size: number; state?: string; error?: string }[],
) => {
  const id = `cor-file-input-preloaded-${Math.random().toString(36).slice(2)}`;
  return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
      <span style="${cellLabelStyle}">${caption}</span>
      <cor-file-input id="${id}" size="lg" label="Documente" multiple ${extraAttrs}></cor-file-input>
      <div style="display: flex; flex-direction: column; gap: var(--spacing-8); margin-block-start: var(--spacing-12);">
        ${files
          .map(
            f =>
              `<cor-file-item ${f.state ? `state="${f.state}"` : ''} filename="${f.name}" size="${f.size}" ${
                f.error ? `error-text="${f.error}"` : ''
              }></cor-file-item>`,
          )
          .join('')}
      </div>
    </div>
  `;
};

export const SingleFile: Story = {
  name: 'Single File',
  render: () =>
    wrap(
      [
        cell(
          'idle (single mode)',
          /*html*/ `<cor-file-input size="lg" label="Buletin de identitate" dropzone-hint="PDF • max 5 MB" max-size="5242880" accept=".pdf"></cor-file-input>`,
        ),
        preloadedHtml('after upload', 'max-size="5242880" accept=".pdf"', [
          { name: 'buletin-identitate.pdf', size: 245320, state: 'success' },
        ]),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: '<cor-file-input size="lg" label="Buletin de identitate" max-size="5242880" accept=".pdf"></cor-file-input>',
      },
    },
  },
};

export const MultipleFiles: Story = {
  name: 'Multiple Files',
  render: () =>
    wrap(
      [
        cell(
          'idle (multiple)',
          /*html*/ `<cor-file-input size="lg" label="Documente" multiple max-files="5" dropzone-hint="Până la 5 fișiere"></cor-file-input>`,
        ),
        preloadedHtml('after upload (3 files)', 'max-files="5"', [
          { name: 'declaratie-impozit-2025.pdf', size: 245320, state: 'success' },
          { name: 'contract-utilitati.pdf', size: 1840320, state: 'success' },
          { name: 'buletin-identitate.jpg', size: 124000, state: 'success' },
        ]),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: '<cor-file-input size="lg" label="Documente" multiple max-files="5"></cor-file-input>',
      },
    },
  },
};

export const WithMaxSize: Story = {
  name: 'With Max Size',
  render: () =>
    wrap(
      [
        cell(
          '5 MB limit',
          /*html*/ `<cor-file-input size="lg" label="Documente" max-size="5242880" dropzone-hint="Maximum 5 MB"></cor-file-input>`,
        ),
        preloadedHtml('rejected oversize', 'max-size="5242880"', [
          {
            name: 'declaratie-foarte-mare.pdf',
            size: 14_000_000,
            state: 'error',
            error: 'Fișierul depășește limita de 5 MB',
          },
        ]),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const WithAcceptFilter: Story = {
  name: 'With Accept Filter',
  render: () =>
    wrap(
      [
        cell(
          'PDF only',
          /*html*/ `<cor-file-input size="lg" label="Documente" accept=".pdf" dropzone-hint="Doar fișiere PDF"></cor-file-input>`,
        ),
        cell(
          'images only',
          /*html*/ `<cor-file-input size="lg" label="Fotografii" accept="image/*" dropzone-hint="Doar imagini"></cor-file-input>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const WithMaxCount: Story = {
  name: 'With Max Count',
  render: () =>
    wrap(
      [
        cell(
          '3 files limit',
          /*html*/ `<cor-file-input size="lg" label="Documente" multiple max-files="3" dropzone-hint="Maximum 3 fișiere"></cor-file-input>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const WithHelperText: Story = {
  name: 'With Helper Text',
  render: () =>
    wrap(
      [
        cell(
          'default',
          /*html*/ `<cor-file-input size="lg" label="Documente" helper-text="Acceptăm PDF, JPG, PNG"></cor-file-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<cor-file-input size="lg" label="Documente" required helper-text="Câmp obligatoriu"></cor-file-input>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const WithError: Story = {
  name: 'With Error',
  render: () =>
    wrap(
      [
        cell(
          'invalid + error',
          /*html*/ `<cor-file-input size="lg" label="Documente" invalid error-text="Trebuie să atașați cel puțin un document"></cor-file-input>`,
        ),
        cell(
          'destructive variant',
          /*html*/ `<cor-file-input variant="destructive" size="lg" label="Documente" invalid error-text="Formatul nu este acceptat"></cor-file-input>`,
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () =>
    wrap(
      [
        cell(
          'long label truncation',
          /*html*/ `<cor-file-input size="lg" label="Moldova's digital evolution requires that you upload the complete identification documentation in a single submission" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
        cell(
          'long helper truncation (two lines)',
          /*html*/ `<cor-file-input size="lg" label="Documente" helper-text="Acceptăm fișiere PDF, JPG sau PNG, până la 5 MB per fișier, încărcate într-o singură sesiune; documentele scanate trebuie să fie lizibile și să includă semnătura"></cor-file-input>`,
        ),
        preloadedHtml('long filenames in list', '', [
          {
            name: 'moldova-digital-transformation-strategy-2025-2030-final-version-approved-by-government.pdf',
            size: 2_400_000,
            state: 'success',
          },
        ]),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};
