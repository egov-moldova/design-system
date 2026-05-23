import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { FILE_INPUT_SIZES } from './cor-file-input.types';
import type { FileInputSize } from './cor-file-input.types';

type FileInputArgs = {
  size: FileInputSize;
  label: string;
  helperText: string;
  errorText: string;
  dropzoneText: string;
  dropzoneActiveText: string;
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
    size="${args.size}"
    label="${args.label}"
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    dropzone-text="${args.dropzoneText}"
    dropzone-active-text="${args.dropzoneActiveText}"
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
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.dropzoneText && args.dropzoneText !== 'Trage fișierele aici sau apasă pentru a căuta'
      ? `dropzone-text="${args.dropzoneText}"`
      : '',
    args.dropzoneActiveText && args.dropzoneActiveText !== 'Eliberează pentru a încărca'
      ? `dropzone-active-text="${args.dropzoneActiveText}"`
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
    dropzoneActiveText: { control: 'text', description: 'Body text shown while a drag is over the drop zone.' },
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
    size: 'lg',
    label: 'Atașează documente',
    helperText: 'PDF sau JPG, maximum 5 MB per fișier.',
    errorText: '',
    dropzoneText: 'Trage fișierele aici sau apasă pentru a căuta',
    dropzoneActiveText: 'Eliberează pentru a încărca',
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

// Figma model: 5 state-only symbols (default, hover, focus, active, disabled)
// + invalid as a recolor flag. No style axis.
// Hover/focus/active each need a real pointer/keyboard/drag interaction to be
// captured live — see the dedicated `Active` story and the `:focus-visible` /
// `:hover` browser interactions for the other two.
export const AllStates: Story = {
  name: 'All States',
  render: () =>
    wrap(
      [
        cell(
          'default',
          /*html*/ `<cor-file-input size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
        cell(
          'hover — point at the dropzone',
          /*html*/ `<cor-file-input size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
        cell(
          'focus — Tab onto the dropzone',
          /*html*/ `<cor-file-input size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
        cell(
          'active — see the `Active` story for the live drag-over render',
          /*html*/ `<cor-file-input size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
        cell(
          'disabled',
          /*html*/ `<cor-file-input size="lg" label="Documente" disabled dropzone-hint="PDF • max 5 MB"></cor-file-input>`,
        ),
        cell(
          'invalid + error',
          /*html*/ `<cor-file-input size="lg" label="Documente" invalid error-text="Trebuie să atașați cel puțin un document"></cor-file-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-file-input size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>',
          '<!-- hover: pointer over dropzone -->',
          '<!-- focus: Tab onto dropzone -->',
          '<!-- active: drag a file over the dropzone — see the dedicated Active story -->',
          '<cor-file-input size="lg" label="Documente" disabled dropzone-hint="PDF • max 5 MB"></cor-file-input>',
          '<cor-file-input size="lg" label="Documente" invalid error-text="…"></cor-file-input>',
        ].join('\n'),
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

// Dedicated Active state story — drives the drag-over handler post-mount so the
// Figma "Active" presentation renders without requiring an interactive drag.
export const Active: Story = {
  name: 'Active (drag-over)',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 600px;">
      <cor-file-input
        size="lg"
        label="Documente"
        dropzone-hint="PDF • max 5 MB"
      ></cor-file-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // canvasElement is a real DOM node — Storybook lets us drive a real
    // dragenter against the dropzone, which sets the @State and triggers a
    // re-render. We wait one microtask for hydration, then dispatch.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const host = canvasElement.querySelector('cor-file-input') as HTMLElement | null;
    const dropzone = host?.shadowRoot?.querySelector('.dropzone') as HTMLElement | null;
    if (!dropzone) return;
    dropzone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Drag-over presentation. When a file is being dragged into the drop zone, the dashed border switches to a solid brand-blue stroke, the background takes a brand-tint fill, the icon disappears, and the body text swaps to `dropzone-active-text`.',
      },
      source: {
        code: '<cor-file-input size="lg" label="Documente" dropzone-hint="PDF • max 5 MB"></cor-file-input>\n<!-- visible state after drag-over: see Figma Active -->',
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
        cell('invalid (no message)', /*html*/ `<cor-file-input size="lg" label="Documente" invalid></cor-file-input>`),
        cell(
          'invalid + error message',
          /*html*/ `<cor-file-input size="lg" label="Documente" invalid error-text="Trebuie să atașați cel puțin un document"></cor-file-input>`,
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
