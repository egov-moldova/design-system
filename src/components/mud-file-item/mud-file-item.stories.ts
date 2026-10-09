import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { MUD_LOCALES } from '../../utils/locale';
import { FILE_ITEM_STATES } from './mud-file-item.types';
import type { FileItemState } from './mud-file-item.types';

type FileItemArgs = {
  state: FileItemState;
  filename: string;
  size: number;
  errorText: string;
  disabled: boolean;
  noRemove: boolean;
  removeLabel: string;
  locale: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderFileItem = (args: FileItemArgs) => /*html*/ `
  <mud-file-item
    state="${args.state}"
    filename="${args.filename}"
    size="${args.size}"
    error-text="${args.errorText}"
    remove-label="${args.removeLabel}"
    ${args.locale ? `locale="${args.locale}"` : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.noRemove ? 'no-remove' : ''}
  ></mud-file-item>
`;

const docsSourceDefault = (args: FileItemArgs) => {
  const attrs = [
    args.state !== 'uploaded' ? `state="${args.state}"` : '',
    args.filename ? `filename="${args.filename}"` : '',
    args.size ? `size="${args.size}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.removeLabel !== 'Elimină fișierul' ? `remove-label="${args.removeLabel}"` : '',
    args.locale ? `locale="${args.locale}"` : '',
    args.disabled ? 'disabled' : '',
    args.noRemove ? 'no-remove' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-file-item ${attrs}></mud-file-item>`;
};

const meta: Meta<FileItemArgs> = {
  title: 'Components/File Item',
  component: 'mud-file-item',
  argTypes: {
    state: {
      control: 'select',
      options: FILE_ITEM_STATES,
      description: 'Lifecycle state — drives leading icon color and border treatment.',
      table: { defaultValue: { summary: 'uploaded' } },
    },
    filename: { control: 'text' },
    size: { control: 'number', description: 'File size in bytes; rendered as KB/MB.' },
    errorText: { control: 'text', description: 'Replaces size meta when state="error".' },
    locale: {
      control: 'select',
      options: ['', ...MUD_LOCALES],
      description: 'Language of every built-in label. Unset follows the closest ancestor `lang`, else `ro-MD`.',
    },
    disabled: { control: 'boolean' },
    noRemove: { control: 'boolean' },
    removeLabel: { control: 'text', description: 'Accessible label for the remove button.' },
  },
};

export default meta;

type Story = StoryObj<FileItemArgs>;

export const Default: Story = {
  render: renderFileItem,
  args: {
    state: 'uploaded',
    filename: 'declaratie-impozit-2025.pdf',
    size: 245_320,
    errorText: '',
    disabled: false,
    noRemove: false,
    removeLabel: '',
    locale: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: FileItemArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 360px)); gap: var(--spacing-16) var(--spacing-24); padding: var(--spacing-24); max-width: 800px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell(
          'uploaded',
          /*html*/ `<mud-file-item filename="declaratie-impozit-2025.pdf" size="245320"></mud-file-item>`,
        ),
        cell(
          'uploading',
          /*html*/ `<mud-file-item state="uploading" filename="contract-utilitati.pdf" size="1840320"></mud-file-item>`,
        ),
        cell(
          'success',
          /*html*/ `<mud-file-item state="success" filename="identity-card.jpg" size="124000"></mud-file-item>`,
        ),
        cell(
          'error',
          /*html*/ `<mud-file-item state="error" filename="document-too-large.pdf" size="14000000" error-text="The file exceeds the 5 MB limit"></mud-file-item>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-file-item disabled filename="document-arhivat.pdf" size="245320"></mud-file-item>`,
        ),
        cell(
          'no remove',
          /*html*/ `<mud-file-item no-remove state="success" filename="submission-confirmation.pdf" size="245320"></mud-file-item>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-file-item filename="declaratie-impozit-2025.pdf" size="245320"></mud-file-item>',
          '<mud-file-item state="uploading" filename="contract-utilitati.pdf" size="1840320"></mud-file-item>',
          '<mud-file-item state="success" filename="identity-card.jpg" size="124000"></mud-file-item>',
          '<mud-file-item state="error" filename="document-too-large.pdf" size="14000000" error-text="The file exceeds the 5 MB limit"></mud-file-item>',
          '<mud-file-item disabled filename="document-arhivat.pdf" size="245320"></mud-file-item>',
          '<mud-file-item no-remove state="success" filename="submission-confirmation.pdf" size="245320"></mud-file-item>',
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
          'long filename truncation',
          /*html*/ `<mud-file-item filename="moldova-digital-transformation-strategy-2025-2030-final-version-approved-by-government.pdf" size="2400000"></mud-file-item>`,
        ),
        cell('no size', /*html*/ `<mud-file-item filename="document.pdf"></mud-file-item>`),
        cell(
          'long error text (2 lines)',
          /*html*/ `<mud-file-item state="error" filename="declaration.pdf" size="14000000" error-text="The file exceeds the 5 MB limit and its format is not accepted by the portal — upload a smaller PDF"></mud-file-item>`,
        ),
        cell(
          'GB-sized file',
          /*html*/ `<mud-file-item filename="arhiva-completa.zip" size="2147483648"></mud-file-item>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-file-item filename="moldova-digital-transformation-strategy-2025-2030-final-version-approved-by-government.pdf" size="2400000"></mud-file-item>',
          '<mud-file-item filename="document.pdf"></mud-file-item>',
          '<mud-file-item state="error" filename="declaration.pdf" size="14000000" error-text="… error message …"></mud-file-item>',
          '<mud-file-item filename="arhiva-completa.zip" size="2147483648"></mud-file-item>',
        ].join('\n'),
      },
    },
  },
};

export const System: Story = {
  name: 'System (issued document)',
  render: () =>
    wrap(
      cell(
        'variant="system" — Figma system-files-item',
        /*html*/ `<mud-file-item variant="system" filename="Certificat de calitate de moștenitor" issued-label="Emis" issued-on="12.03.2026" issuer="EVO"></mud-file-item>`,
      ),
    ),
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: '<mud-file-item variant="system" filename="Certificat de calitate de moștenitor" issued-label="Emis" issued-on="12.03.2026" issuer="EVO"></mud-file-item>',
      },
    },
  },
};

export const Upload: Story = {
  name: 'Upload (file-item of the upload flow)',
  render: () =>
    wrap(
      [
        cell(
          'uploaded (resting)',
          /*html*/ `<mud-file-item variant="upload" state="uploaded" filename="planul-incaperilor.pdf" size="1887436"></mud-file-item>`,
        ),
        cell(
          'uploading, 40%',
          /*html*/ `<mud-file-item variant="upload" state="uploading" progress="40" filename="planul-incaperilor.pdf" size="1887436"></mud-file-item>`,
        ),
        cell(
          'uploading, no progress reported',
          /*html*/ `<mud-file-item variant="upload" state="uploading" filename="planul-incaperilor.pdf" size="1887436"></mud-file-item>`,
        ),
        cell(
          'success',
          /*html*/ `<mud-file-item variant="upload" state="success" filename="planul-incaperilor.pdf" size="1887436"></mud-file-item>`,
        ),
        cell(
          'error',
          /*html*/ `<mud-file-item variant="upload" state="error" filename="document-prea-mare.pdf" size="14000000" error-text="Fișierul depășește limita de 5 MB"></mud-file-item>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-file-item variant="upload" state="uploaded" disabled filename="document-arhivat.pdf" size="245320"></mud-file-item>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        type: 'code',
        code: [
          '<mud-file-item variant="upload" state="uploaded" filename="planul-incaperilor.pdf" size="1887436"></mud-file-item>',
          '<mud-file-item variant="upload" state="uploading" progress="40" filename="planul-incaperilor.pdf" size="1887436"></mud-file-item>',
          '<mud-file-item variant="upload" state="success" filename="planul-incaperilor.pdf" size="1887436"></mud-file-item>',
          '<mud-file-item variant="upload" state="error" filename="document-prea-mare.pdf" size="14000000" error-text="Fișierul depășește limita de 5 MB"></mud-file-item>',
        ].join('\n'),
      },
    },
  },
};
