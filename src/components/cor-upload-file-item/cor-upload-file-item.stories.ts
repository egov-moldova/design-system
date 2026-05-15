/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { FileItemState } from './cor-upload-file-item.enums';

type FileItemArgs = {
  fileState: FileItemState;
  fileName: string;
  progress: number;
  errorMessage: string;
  withFrame: boolean;
  card: boolean;
  previewUrl: string;
};

const defaultArgs: FileItemArgs = {
  fileState: FileItemState.UPLOADING,
  fileName: 'Document.pdf',
  progress: 40,
  errorMessage: '',
  withFrame: true,
  card: false,
  previewUrl: '',
};

const meta: Meta = {
  title: 'Molecules/Upload File Item',
  component: 'cor-upload-file-item',
  tags: ['autodocs'],
  argTypes: {
    fileState: {
      control: 'select',
      options: Object.values(FileItemState),
    },
    fileName: { control: 'text' },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    errorMessage: { control: 'text' },
    withFrame: { control: 'boolean' },
    card: { control: 'boolean' },
    previewUrl: { control: 'text' },
  },
  args: defaultArgs,
  render: (args: Partial<FileItemArgs>) => /*html*/ `
    <div style="max-width: 320px;">
      <cor-upload-file-item
        file-state="${args.fileState}"
        file-name="${args.fileName}"
        progress="${args.progress}"
        error-message="${args.errorMessage}"
        with-frame="${args.withFrame}"
        card="${args.card}"
        preview-url="${args.previewUrl}"
      ></cor-upload-file-item>
    </div>
  `,
};

export default meta;

export const Uploading: StoryObj = {
  args: {
    fileState: FileItemState.UPLOADING,
    fileName: 'Contract_2024.pdf',
    progress: 55,
  },
};

export const UploadedDoc: StoryObj = {
  args: {
    fileState: FileItemState.UPLOADED,
    fileName: 'Contract_2024.pdf',
    progress: 100,
  },
};

export const UploadedImagePreview: StoryObj = {
  args: {
    fileState: FileItemState.UPLOADED,
    fileName: 'photo.jpg',
    progress: 100,
    previewUrl: 'https://picsum.photos/seed/storybook/32/32',
  },
};

export const Error: StoryObj = {
  args: {
    fileState: FileItemState.ERROR,
    fileName: 'large-file.zip',
    progress: 30,
    errorMessage: 'File exceeds the maximum allowed size.',
  },
};

export const NoFrame: StoryObj = {
  argTypes: {
    withFrame: {
      control: false,
    },
    card: {
      control: false,
    },
  },
  args: {
    fileState: FileItemState.UPLOADING,
    fileName: 'Report_Q4.xlsx',
    progress: 20,
    withFrame: false,
  },
  render: (args: Partial<FileItemArgs>) => /*html*/ `
    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">No Frame (top border only)</h3>
    <div style="width: 320px; display: flex; flex-direction: column; gap: 16px;">
      <cor-upload-file-item
        file-state=${args.fileState}
        file-name=${args.fileName}
        progress=${args.progress}
        with-frame=${args.withFrame}
      ></cor-upload-file-item>
    </div>
  `,
};

export const Card: StoryObj = {
  argTypes: {
    withFrame: {
      control: false,
    },
    card: {
      control: false,
    },
  },
  args: {
    fileState: FileItemState.UPLOADING,
    fileName: 'photo.png',
    progress: 70,
    card: true,
    withFrame: true,
  },
  render: (args: Partial<FileItemArgs>) => /*html*/ `
    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Card (hover to see remove)</h3>
    <div style="width: 200px; display: flex; gap: 16px; flex-wrap: wrap;">
      <cor-upload-file-item
        file-state=${args.fileState}
        file-name=${args.fileName}
        progress=${args.progress}
        card=${args.card}
      ></cor-upload-file-item>
      <cor-upload-file-item
        file-state="uploaded"
        file-name="photo2.jpg"
        preview-url="https://picsum.photos/seed/card2/32/32"
        card=${true}
      ></cor-upload-file-item>
      <cor-upload-file-item
        file-state="error"
        file-name="broken.zip"
        error-message="Upload failed."
        card=${true}
      ></cor-upload-file-item>
    </div>
  `,
};

export const Interactive: StoryObj = {
  name: 'Interactive Playground',
  argTypes: {
    progress: {
      control: false,
    },
    previewUrl: {
      control: false,
    },
  },
  args: {
    fileState: FileItemState.UPLOADING,
    progress: 45,
    errorMessage: 'File exceeds the maximum allowed size.',
    withFrame: true,
    card: false,
    previewUrl: '',
  },
  render: (args: Partial<FileItemArgs>) => {
    // Simulate upload animation
    let animationInterval: number | null = null;

    setTimeout(() => {
      const items = document.querySelectorAll('.interactive-demo cor-upload-file-item');

      // Animate uploading items
      items.forEach((item, index) => {
        if (item.getAttribute('file-state') === 'uploading') {
          let progress = parseInt(item.getAttribute('progress') || '0');

          animationInterval = window.setInterval(
            () => {
              progress += Math.floor(Math.random() * 5) + 1;
              if (progress >= 100) {
                progress = 100;
                item.setAttribute('file-state', 'uploaded');
                item.setAttribute('progress', '100');
                if (animationInterval) clearInterval(animationInterval);
              } else {
                item.setAttribute('progress', progress.toString());
              }
            },
            300 + index * 100,
          );
        }
      });

      // Handle remove button clicks
      items.forEach(item => {
        item.addEventListener('corRemoveFile', (e: any) => {
          console.log('Remove file:', e.detail.fileName);
          item.remove();
        });
      });
    }, 100);

    return /*html*/ `
      <div class="interactive-demo" style="max-width: 320px; display: flex; flex-direction: column; gap: 24px;">
        <!-- Controlled item with all args -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Controlled Item (use controls →)</h3>
          <cor-upload-file-item
            file-state="${args.fileState}"
            file-name="${args.fileName}"
            progress="${args.progress}"
            error-message="${args.errorMessage}"
            with-frame="${args.withFrame}"
            card="${args.card}"
            preview-url="${args.previewUrl}"
          ></cor-upload-file-item>
        </div>

        <!-- Uploading examples with animation -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Uploading (animated)</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <cor-upload-file-item
              file-state="uploading"
              file-name="Contract_2024.pdf"
              progress="15"
              with-frame="true"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="uploading"
              file-name="Presentation.pptx"
              progress="42"
              with-frame="true"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="uploading"
              file-name="Spreadsheet.xlsx"
              progress="78"
              with-frame="true"
            ></cor-upload-file-item>
          </div>
        </div>

        <!-- Uploaded examples (docs and images) -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Uploaded (docs & images)</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <cor-upload-file-item
              file-state="uploaded"
              file-name="Report_Q4.docx"
              progress="100"
              with-frame="true"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="uploaded"
              file-name="photo1.jpg"
              progress="100"
              preview-url="https://picsum.photos/seed/interactive1/32/32"
              with-frame="true"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="uploaded"
              file-name="photo2.png"
              progress="100"
              preview-url="https://picsum.photos/seed/interactive2/32/32"
              with-frame="true"
            ></cor-upload-file-item>
          </div>
        </div>

        <!-- Error examples -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Error states (hover for tooltip)</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <cor-upload-file-item
              file-state="error"
              file-name="large-file.zip"
              progress="30"
              error-message="File exceeds the maximum allowed size."
              with-frame="true"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="error"
              file-name="invalid.exe"
              progress="0"
              error-message="File type not supported."
              with-frame="true"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="error"
              file-name="corrupted.pdf"
              progress="85"
              error-message="Upload failed. Please try again."
              with-frame="true"
            ></cor-upload-file-item>
          </div>
        </div>

        <!-- Card mode examples -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Card mode (hover to see remove)</h3>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <cor-upload-file-item
              file-state="uploading"
              file-name="Document.docx"
              progress="55"
              card="true"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="uploaded"
              file-name="photo4.jpg"
              progress="100"
              preview-url="https://picsum.photos/seed/card1/32/32"
              card="true"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="uploaded"
              file-name="photo5.png"
              progress="100"
              preview-url="https://picsum.photos/seed/card2/32/32"
              card="true"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="error"
              file-name="failed.jpg"
              error-message="Upload failed."
              card="true"
            ></cor-upload-file-item>
          </div>
        </div>

        <!-- No frame mode -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">No frame (border-top only)</h3>
          <div style="display: flex; flex-direction: column;">
            <cor-upload-file-item
              file-state="uploading"
              file-name="Document1.pdf"
              progress="25"
              with-frame="false"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="uploaded"
              file-name="Document2.docx"
              progress="100"
              with-frame="false"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-state="error"
              file-name="Document3.xlsx"
              error-message="File corrupted."
              with-frame="false"
            ></cor-upload-file-item>
          </div>
        </div>
      </div>
    `;
  },
};
