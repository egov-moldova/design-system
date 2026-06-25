import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { FILE_INPUT_SIZES, FILE_INPUT_VARIANTS } from './mud-file-input.types';
import type { FileInputSize, FileInputVariant } from './mud-file-input.types';

type FileInputArgs = {
  size: FileInputSize;
  variant: FileInputVariant;
  label: string;
  helperText: string;
  errorText: string;
  ctaText: string;
  chooseFilesText: string;
  dropzoneActiveText: string;
  supportedFormatsText: string;
  maxSizeText: string;
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
  <mud-file-input
    size="${args.size}"
    variant="${args.variant}"
    label="${args.label}"
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    cta-text="${args.ctaText}"
    choose-files-text="${args.chooseFilesText}"
    dropzone-active-text="${args.dropzoneActiveText}"
    supported-formats-text="${args.supportedFormatsText}"
    max-size-text="${args.maxSizeText}"
    accept="${args.accept}"
    max-size="${args.maxSize || ''}"
    max-files="${args.maxFiles || ''}"
    ${args.multiple ? 'multiple' : ''}
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.invalid ? 'invalid' : ''}
  ></mud-file-input>
`;

const docsSourceDefault = (args: FileInputArgs) => {
  const attrs = [
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.variant !== 'dropzone' ? `variant="${args.variant}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.ctaText && args.ctaText !== 'Trage și plasează sau ' ? `cta-text="${args.ctaText}"` : '',
    args.chooseFilesText && args.chooseFilesText !== 'Alege fișiere'
      ? `choose-files-text="${args.chooseFilesText}"`
      : '',
    args.dropzoneActiveText && args.dropzoneActiveText !== 'Eliberează pentru a încărca'
      ? `dropzone-active-text="${args.dropzoneActiveText}"`
      : '',
    args.supportedFormatsText ? `supported-formats-text="${args.supportedFormatsText}"` : '',
    args.maxSizeText ? `max-size-text="${args.maxSizeText}"` : '',
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
  return `<mud-file-input ${attrs}></mud-file-input>`;
};

const meta: Meta<FileInputArgs> = {
  title: 'Atoms/Input/File',
  component: 'mud-file-input',
  argTypes: {
    size: {
      control: 'select',
      options: FILE_INPUT_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    variant: {
      control: 'inline-radio',
      options: FILE_INPUT_VARIANTS,
      description: 'Presentation: dashed dropzone or a plain "Choose file" button.',
      table: { defaultValue: { summary: 'dropzone' } },
    },
    label: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    ctaText: { control: 'text', description: 'Lead-in CTA text before the inline link.' },
    chooseFilesText: { control: 'text', description: 'Label for the inline brand-blue "choose files" link.' },
    dropzoneActiveText: { control: 'text', description: 'Body text shown while a drag is over the drop zone.' },
    supportedFormatsText: {
      control: 'text',
      description: 'Top-left caption below the dropzone. Auto-derived from `accept` if unset.',
    },
    maxSizeText: {
      control: 'text',
      description: 'Top-right caption below the dropzone. Auto-derived from `max-size` (bytes) if unset.',
    },
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
    variant: 'dropzone',
    label: '',
    helperText: '',
    errorText: '',
    ctaText: 'Trage și plasează sau ',
    chooseFilesText: 'Alege fișiere',
    dropzoneActiveText: 'Eliberează pentru a încărca',
    supportedFormatsText: 'Formate acceptate: jpg, png, pdf',
    maxSizeText: 'Mărime maximă: 100 MB',
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
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24);">
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
          /*html*/ `<mud-file-input size="lg" supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>`,
        ),
        cell(
          'hover',
          /*html*/ `<mud-file-input class="is-hover-demo" size="lg" supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>`,
        ),
        cell(
          'focus',
          /*html*/ `<mud-file-input class="is-focus-demo" size="lg" supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>`,
        ),
        cell(
          'active',
          /*html*/ `<mud-file-input id="fi-allstates-active" size="lg" supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-file-input size="lg" disabled supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>`,
        ),
        cell(
          'invalid + error',
          /*html*/ `<mud-file-input size="lg" invalid error-text="Trebuie să atașați cel puțin un document" supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>`,
        ),
      ].join(''),
    ),
  // Drive the `active` cell into its drag-over state post-mount so the matrix
  // shows it statically (hover + focus use the `.is-*-demo` helper classes).
  play: async ({ canvasElement }) => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const host = canvasElement.querySelector('#fi-allstates-active') as HTMLElement | null;
    const dropzone = host?.shadowRoot?.querySelector('.dropzone') as HTMLElement | null;
    dropzone?.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-file-input size="lg" supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>',
          '<!-- hover: pointer over dropzone (blue dashed border) -->',
          '<!-- focus: Tab onto dropzone (blue solid border + ring) -->',
          '<!-- active: drag a file over the dropzone (blue fill + "Drop files to upload") -->',
          '<mud-file-input size="lg" disabled supported-formats-text="…" max-size-text="…"></mud-file-input>',
          '<mud-file-input size="lg" invalid error-text="…"></mud-file-input>',
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
          /*html*/ `<mud-file-input size="${size}" supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: FILE_INPUT_SIZES.map(
          s =>
            `<mud-file-input size="${s}" supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>`,
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
      <mud-file-input
        size="lg"
        supported-formats-text="Formate acceptate: jpg, png, pdf"
        max-size-text="Mărime maximă: 100 MB"
      ></mud-file-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // canvasElement is a real DOM node — Storybook lets us drive a real
    // dragenter against the dropzone, which sets the @State and triggers a
    // re-render. We wait one microtask for hydration, then dispatch.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const host = canvasElement.querySelector('mud-file-input') as HTMLElement | null;
    const dropzone = host?.shadowRoot?.querySelector('.dropzone') as HTMLElement | null;
    if (!dropzone) return;
    dropzone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Drag-over presentation. When a file is being dragged into the drop zone, the dashed border switches to a solid brand-blue stroke, the background takes a brand-tint fill, the icon-circle and CTA collapse to a single line of `dropzone-active-text`, and the caption row hides.',
      },
      source: {
        code: '<mud-file-input size="lg"></mud-file-input>\n<!-- visible state after drag-over: see Figma Active -->',
      },
    },
  },
};

// Auto-derived captions from `accept` + `max-size`. Showcases the prop-derivation
// short-circuit — explicit prop wins, otherwise the component computes the
// caption from the underlying validation contract.
export const WithAcceptedTypes: Story = {
  name: 'With Accepted Types (auto-derived captions)',
  render: () =>
    wrap(
      [
        cell(
          'accept=".jpg,.png,.pdf" + max-size=5 MB',
          /*html*/ `<mud-file-input size="lg" accept=".jpg,.png,.pdf" max-size="5242880"></mud-file-input>`,
        ),
        cell(
          'accept="image/*" + max-size=10 MB',
          /*html*/ `<mud-file-input size="lg" accept="image/*" max-size="10485760"></mud-file-input>`,
        ),
        cell(
          'accept="application/pdf,image/jpeg,image/png"',
          /*html*/ `<mud-file-input size="lg" accept="application/pdf,image/jpeg,image/png" max-size="104857600"></mud-file-input>`,
        ),
        cell('no derivation (no accept / max-size)', /*html*/ `<mud-file-input size="lg"></mud-file-input>`),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'When `supported-formats-text` / `max-size-text` are unset, the component derives them from `accept` (MIME-type / extension list) and `max-size` (bytes). Explicit text props always win.',
      },
      source: {
        code: '<mud-file-input size="lg" accept=".jpg,.png,.pdf" max-size="5242880"></mud-file-input>',
      },
    },
  },
};

// Override the Romanian defaults with English copy for international consumers.
export const WithCustomCopy: Story = {
  name: 'With Custom Copy (English)',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 600px;">
      <mud-file-input
        size="lg"
        cta-text="Drag and drop or "
        choose-files-text="choose files"
        dropzone-active-text="Release to upload"
        supported-formats-text="Supported formats: jpg, png, pdf"
        max-size-text="Maximum size: 100 MB"
      ></mud-file-input>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'All copy is overridable. The Romanian defaults serve `.gov.md` consumers; international consumers (or partner agencies) pass localized strings via `cta-text`, `choose-files-text`, `supported-formats-text`, `max-size-text`, and `dropzone-active-text`.',
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
  const id = `mud-file-input-preloaded-${Math.random().toString(36).slice(2)}`;
  return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
      <span style="${cellLabelStyle}">${caption}</span>
      <mud-file-input id="${id}" size="lg" label="Documente" multiple ${extraAttrs}></mud-file-input>
      <div style="display: flex; flex-direction: column; gap: var(--spacing-8); margin-block-start: var(--spacing-12);">
        ${files
          .map(
            f =>
              `<mud-file-item ${f.state ? `state="${f.state}"` : ''} filename="${f.name}" size="${f.size}" ${
                f.error ? `error-text="${f.error}"` : ''
              }></mud-file-item>`,
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
          /*html*/ `<mud-file-input size="lg" label="Buletin de identitate" max-size="5242880" accept=".pdf"></mud-file-input>`,
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
        code: '<mud-file-input size="lg" label="Buletin de identitate" max-size="5242880" accept=".pdf"></mud-file-input>',
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
          /*html*/ `<mud-file-input size="lg" label="Documente" multiple max-files="5" supported-formats-text="Formate acceptate: jpg, png, pdf" max-size-text="Mărime maximă: 100 MB"></mud-file-input>`,
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
        code: '<mud-file-input size="lg" label="Documente" multiple max-files="5"></mud-file-input>',
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
          '5 MB limit (auto-derived caption)',
          /*html*/ `<mud-file-input size="lg" label="Documente" max-size="5242880"></mud-file-input>`,
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
        cell('PDF only', /*html*/ `<mud-file-input size="lg" label="Documente" accept=".pdf"></mud-file-input>`),
        cell('images only', /*html*/ `<mud-file-input size="lg" label="Fotografii" accept="image/*"></mud-file-input>`),
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
          /*html*/ `<mud-file-input size="lg" label="Documente" multiple max-files="3" supported-formats-text="Maximum 3 fișiere"></mud-file-input>`,
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
          /*html*/ `<mud-file-input size="lg" label="Documente" helper-text="Acceptăm PDF, JPG, PNG"></mud-file-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-file-input size="lg" label="Documente" required helper-text="Câmp obligatoriu"></mud-file-input>`,
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
        cell('invalid (no message)', /*html*/ `<mud-file-input size="lg" label="Documente" invalid></mud-file-input>`),
        cell(
          'invalid + error message',
          /*html*/ `<mud-file-input size="lg" label="Documente" invalid error-text="Trebuie să atașați cel puțin un document"></mud-file-input>`,
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
          /*html*/ `<mud-file-input size="lg" label="Moldova's digital evolution requires that you upload the complete identification documentation in a single submission"></mud-file-input>`,
        ),
        cell(
          'long helper truncation (two lines)',
          /*html*/ `<mud-file-input size="lg" label="Documente" helper-text="Acceptăm fișiere PDF, JPG sau PNG, până la 5 MB per fișier, încărcate într-o singură sesiune; documentele scanate trebuie să fie lizibile și să includă semnătura"></mud-file-input>`,
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

// ---------------------------------------------------------------------------
// UploadButton — variant="button": a plain "Choose file" button (Figma
// "Upload Button"), no dashed dropzone. Same captions + file list + validation.
// ---------------------------------------------------------------------------
export const UploadButton: Story = {
  name: 'Upload Button (variant)',
  render: () =>
    wrap(
      [
        cell(
          'single',
          /*html*/ `<mud-file-input variant="button" size="lg" label="Încarcă fișiere" choose-files-text="Alege fișier" accept=".pdf,image/png,image/jpeg" max-size="104857600"></mud-file-input>`,
        ),
        preloadedHtml(
          'multiple + uploaded',
          'variant="button" choose-files-text="Alege fișier" accept=".pdf,image/png,image/jpeg" max-size="104857600"',
          [
            { name: 'declaratie-impozit-2025.pdf', size: 1_840_000, state: 'success' },
            { name: 'contract-utilitati.pdf', size: 1_840_000, state: 'success' },
          ],
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: '<mud-file-input variant="button" label="Încarcă fișiere" choose-files-text="Alege fișier" accept=".pdf,image/png,image/jpeg" max-size="104857600"></mud-file-input>',
      },
      description: {
        story:
          'The `button` variant renders a plain "Choose file" button instead of the dashed dropzone (Figma "Upload Button"). Captions, file list and validation are identical.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// FileItemExtras — image-preview thumbnail + the uploading spinner on the row.
// Standalone mud-file-item rows (no live File objects needed).
// ---------------------------------------------------------------------------
const SAMPLE_IMG = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80';
export const FileItemExtras: Story = {
  name: 'File Item — preview + uploading',
  render: () =>
    wrap(
      [
        cell(
          'image-preview thumbnail',
          /*html*/ `<mud-file-item state="success" filename="portret.jpg" size="124000" preview-src="${SAMPLE_IMG}"></mud-file-item>`,
        ),
        cell(
          'uploading (spinner)',
          /*html*/ `<mud-file-item state="uploading" filename="declaratie-impozit-2025.pdf" size="1840000"></mud-file-item>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-file-item state="success" filename="portret.jpg" size="124000" preview-src="…"></mud-file-item>',
          '<mud-file-item state="uploading" filename="declaratie-impozit-2025.pdf" size="1840000"></mud-file-item>',
        ].join('\n'),
      },
      description: {
        story:
          'A file row with an image-preview thumbnail (`preview-src`) and the `uploading` state, which now shows a spinner in place of the remove button.',
      },
    },
  },
};
