/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { UploadVariant, UploadStyle } from './cor-upload-area.enums';

type UploadAreaArgs = {
  variant: UploadVariant;
  uploadStyle: UploadStyle;
  isUploading: boolean;
  progress: number;
  browseLabel: string;
  cancelLabel: string;
  accept: string;
  generatePreview: boolean;
};

const defaultArgs: UploadAreaArgs = {
  variant: UploadVariant.MULTIPLE,
  uploadStyle: UploadStyle.REGULAR,
  isUploading: false,
  progress: 0,
  browseLabel: 'Browse files',
  cancelLabel: 'Cancel',
  accept: '',
  generatePreview: true,
};

const meta: Meta = {
  title: 'Organisms/Upload Area',
  component: 'cor-upload-area',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'radio',
      options: Object.values(UploadVariant),
    },
    uploadStyle: {
      control: 'radio',
      options: Object.values(UploadStyle),
    },
    isUploading: { control: 'boolean' },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    browseLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    accept: { control: 'text' },
    generatePreview: { control: 'boolean' },
  },
  args: defaultArgs,
  render: (args: Partial<UploadAreaArgs>) => /*html*/ `
    <div style="max-width: 474px;">
      <cor-upload-area
        variant="${args.variant}"
        upload-style="${args.uploadStyle}"
        is-uploading="${args.isUploading}"
        progress="${args.progress}"
        browse-label="${args.browseLabel}"
        cancel-label="${args.cancelLabel}"
        accept="${args.accept}"
        generate-preview="${args.generatePreview}"
      >
        <span slot="label">Click or drag file to this area to upload</span>
        <span slot="hint">CSV, XLS or XLSX (max. 800x400px)</span>
      </cor-upload-area>
    </div>
  `,
};

export default meta;

export const RegularDefault: StoryObj = {
  name: 'Regular — Default',
  args: {
    variant: UploadVariant.MULTIPLE,
    uploadStyle: UploadStyle.REGULAR,
  },
};

export const RegularDragging: StoryObj = {
  name: 'Regular — Dragging (simulated)',
  argTypes: {
    uploadStyle: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    uploadStyle: UploadStyle.REGULAR,
  },
  render: (args: Partial<UploadAreaArgs>) => /*html*/ `
    <div style="max-width: 474px;">
      <cor-upload-area
        variant="${args.variant}"
        upload-style="${args.uploadStyle}"
        is-uploading="${args.isUploading}"
        progress="${args.progress}"
        browse-label="${args.browseLabel}"
        cancel-label="${args.cancelLabel}"
        accept="${args.accept}"
        generate-preview="${args.generatePreview}"
      >
        <span slot="label">Click or drag file to this area to upload</span>
        <span slot="hint">CSV, XLS or XLSX (max. 800x400px)</span>
      </cor-upload-area>
    </div>

    <script>
      // Simulate dragging class for visual story
      requestAnimationFrame(() => {
        const el = document.querySelector('cor-upload-area');
        if (el) {
          el.classList.add('is-dragging');
        }
      });
    </script>
  `,
};

export const RegularUploadingSingle: StoryObj = {
  name: 'Regular — Uploading (single)',
  argTypes: {
    variant: {
      control: false,
    },
    uploadStyle: {
      control: false,
    },
    isUploading: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    variant: UploadVariant.SINGLE,
    uploadStyle: UploadStyle.REGULAR,
    isUploading: true,
    progress: 42,
  },
  render: (args: Partial<UploadAreaArgs>) => /*html*/ `
    <div style="max-width: 474px;">
      <cor-upload-area
        variant="${args.variant}"
        upload-style="${args.uploadStyle}"
        is-uploading="${args.isUploading}"
        progress="${args.progress}"
        browse-label="${args.browseLabel}"
        cancel-label="${args.cancelLabel}"
        accept="${args.accept}"
        generate-preview="${args.generatePreview}"
      >
        <span slot="label">Click or drag file to this area to upload</span>
        <span slot="hint">PDF, DOCX, XLSX (max. 10MB)</span>
        <span slot="progress-message">Files uploading...</span>
      </cor-upload-area>
    </div>
  `,
};

export const RegularUploadingMultiple: StoryObj = {
  name: 'Regular — Uploading (multiple)',
  argTypes: {
    variant: {
      control: false,
    },
    uploadStyle: {
      control: false,
    },
    isUploading: {
      control: false,
    },
  },
  args: {
    variant: UploadVariant.MULTIPLE,
    uploadStyle: UploadStyle.REGULAR,
    isUploading: true,
    progress: 0,
  },
  render: (args: Partial<UploadAreaArgs>) => /*html*/ `
    <div style="max-width: 474px;">
      <cor-upload-area
        variant=${args.variant}
        upload-style=${args.uploadStyle}
        is-uploading=${args.isUploading}
      >
        <span slot="label">Click or drag file to this area to upload</span>
        <span slot="hint">CSV, XLS or XLSX (max. 800x400px)</span>
        <cor-upload-file-item file-name="Contract_2024.pdf" file-state="uploading" progress="55"></cor-upload-file-item>
        <cor-upload-file-item
          file-name="Photo_evidence.jpg"
          file-state="uploaded"
          progress="100"
        ></cor-upload-file-item>
      </cor-upload-area>
    </div>
  `,
};

export const CompactDefault: StoryObj = {
  name: 'Compact — Default',
  argTypes: {
    uploadStyle: {
      control: false,
    },
  },
  args: {
    variant: UploadVariant.MULTIPLE,
    uploadStyle: UploadStyle.COMPACT,
  },
};

export const CompactDragging: StoryObj = {
  name: 'Compact — Dragging (simulated)',
  argTypes: {
    uploadStyle: {
      control: false,
    },
    isUploading: {
      control: false,
    },
  },
  args: {
    ...defaultArgs,
    variant: UploadVariant.MULTIPLE,
    uploadStyle: UploadStyle.COMPACT,
  },
  render: (args: Partial<UploadAreaArgs>) => /*html*/ `
    <div style="max-width: 474px;">
      <cor-upload-area
        variant="${args.variant}"
        upload-style="${args.uploadStyle}"
      >
        <span slot="label">Click or drag file to this area to upload</span>
        <span slot="hint">CSV, XLS or XLSX (max. 800x400px)</span>
      </cor-upload-area>
    </div>

    <script>
      // Simulate dragging class for visual story
      requestAnimationFrame(() => {
        const el = document.querySelector('cor-upload-area');
        if (el) {
          el.classList.add('is-dragging');
        }
      });
    </script>
  `,
};

export const CompactUploadingSingle: StoryObj = {
  name: 'Compact — Uploading (single)',
  argTypes: {
    variant: {
      control: false,
    },
    uploadStyle: {
      control: false,
    },
    isUploading: {
      control: false,
    },
  },
  args: {
    variant: UploadVariant.SINGLE,
    uploadStyle: UploadStyle.COMPACT,
    isUploading: true,
    progress: 68,
  },
  render: (args: Partial<UploadAreaArgs>) => /*html*/ `
    <div style="max-width: 474px;">
      <cor-upload-area
        variant=${args.variant}
        upload-style=${args.uploadStyle}
        is-uploading=${args.isUploading}
        progress=${args.progress}
      >
        <span slot="label">Quick upload</span>
        <span slot="hint">Drag and drop or browse</span>
      </cor-upload-area>
    </div>
  `,
};

export const CompactUploadingMultiple: StoryObj = {
  name: 'Compact — Uploading (multiple)',
  argTypes: {
    variant: {
      control: false,
    },
    uploadStyle: {
      control: false,
    },
    isUploading: {
      control: false,
    },
  },
  args: {
    variant: UploadVariant.MULTIPLE,
    uploadStyle: UploadStyle.COMPACT,
    isUploading: true,
  },
  render: (args: Partial<UploadAreaArgs>) => /*html*/ `
    <div style="max-width: 474px;">
      <cor-upload-area variant=${args.variant} upload-style=${args.uploadStyle}/ is-uploading=${args.isUploading}>
        <span slot="label">Click or drag file to this area to upload</span>
        <span slot="hint">Supports PDF, DOCX up to 10MB</span>
        <cor-upload-file-item
          file-name="Spreadsheet.xlsx"
          file-state="uploading"
          progress="30"
          with-frame=${false}
        ></cor-upload-file-item>
        <cor-upload-file-item
          file-name="Presentation.pptx"
          file-state="error"
          error-message="File too large."
          with-frame=${false}
        ></cor-upload-file-item>
      </cor-upload-area>
    </div>
  `,
};

export const Interactive: StoryObj = {
  name: 'Interactive Playground',
  argTypes: {
    isUploading: {
      control: false,
    },
  },
  args: {
    variant: UploadVariant.MULTIPLE,
    uploadStyle: UploadStyle.REGULAR,
    isUploading: false,
    progress: 0,
    browseLabel: 'Browse files',
    cancelLabel: 'Cancel',
    accept: '',
    generatePreview: true,
  },
  render: (args: Partial<UploadAreaArgs>) => {
    // Simulate file upload with animation and event handling
    setTimeout(() => {
      const uploadAreas = document.querySelectorAll('.interactive-upload-demo cor-upload-area');
      if (uploadAreas.length === 0) return;

      // Track uploading state for a specific upload area
      const checkUploadingState = (area: Element) => {
        const fileItems = area.querySelectorAll('cor-upload-file-item');
        const hasUploading = Array.from(fileItems).some(item => item.getAttribute('file-state') === 'uploading');
        area.setAttribute('is-uploading', hasUploading.toString());
      };

      // Handle file selection events for each upload area
      uploadAreas.forEach(uploadArea => {
        uploadArea.addEventListener('corFilesSelected', (e: any) => {
          console.log('Files selected:', e.detail);
          const files = e.detail.files || [];

          // Set uploading state to true when files are selected
          uploadArea.setAttribute('is-uploading', 'true');

          // Simulate adding file items
          files.forEach((file: any, index: number) => {
            setTimeout(() => {
              const fileItem = document.createElement('cor-upload-file-item');
              fileItem.setAttribute('file-name', file.file.name);
              fileItem.setAttribute('file-state', 'uploading');
              fileItem.setAttribute('progress', '0');
              fileItem.setAttribute('with-frame', 'true');

              if (file.previewUrl) {
                fileItem.setAttribute('preview-url', file.previewUrl);
              }

              uploadArea.appendChild(fileItem);

              // Animate upload progress
              let progress = 0;
              const interval = setInterval(() => {
                progress += Math.floor(Math.random() * 10) + 5;
                if (progress >= 100) {
                  progress = 100;
                  fileItem.setAttribute('file-state', 'uploaded');
                  fileItem.setAttribute('progress', '100');
                  clearInterval(interval);

                  // Check if all uploads are complete
                  checkUploadingState(uploadArea);
                } else {
                  fileItem.setAttribute('progress', progress.toString());
                }
              }, 400);
            }, index * 200);
          });
        });

        // Handle file rejection events
        uploadArea.addEventListener('corFilesRejected', (e: any) => {
          console.log('Files rejected:', e.detail);
        });

        // Handle cancel upload
        uploadArea.addEventListener('corCancelClick', () => {
          console.log('Upload cancelled');
          uploadArea.setAttribute('is-uploading', 'false');
        });
      });

      // Handle remove file events from all file items in the demo
      const demoContainer = document.querySelector('.interactive-upload-demo');
      if (!demoContainer) return;

      const handleRemove = (e: any) => {
        console.log('Remove file:', e.detail.fileName);
        const target = e.target as HTMLElement;
        target.remove();

        // Find the parent upload area and check its uploading state after removal
        const parentUploadArea = target.closest('cor-upload-area');
        if (parentUploadArea) {
          setTimeout(() => {
            const fileItems = parentUploadArea.querySelectorAll('cor-upload-file-item');
            const hasUploading = Array.from(fileItems).some(item => item.getAttribute('file-state') === 'uploading');
            parentUploadArea.setAttribute('is-uploading', hasUploading.toString());
          }, 100);
        }
      };

      const attachRemoveListeners = () => {
        const fileItems = demoContainer.querySelectorAll('cor-upload-file-item');
        fileItems.forEach(item => {
          // Remove existing listener to avoid duplicates
          item.removeEventListener('corRemoveFile', handleRemove);
          item.addEventListener('corRemoveFile', handleRemove);
        });
      };

      // Attach listeners to existing items
      attachRemoveListeners();

      // Watch for new items being added to any upload area
      const observer = new MutationObserver(() => {
        attachRemoveListeners();
      });

      observer.observe(demoContainer, { childList: true, subtree: true });
    }, 100);

    return /*html*/ `
      <div class="interactive-upload-demo" style="max-width: 474px; display: flex; flex-direction: column; gap: 32px;">
        <!-- Controlled upload area with all args -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Controlled Upload Area (use controls →)</h3>
          <cor-upload-area
            variant="${args.variant}"
            upload-style="${args.uploadStyle}"
            is-uploading="${args.isUploading}"
            progress="${args.progress}"
            browse-label="${args.browseLabel}"
            cancel-label="${args.cancelLabel}"
            accept="${args.accept}"
            generate-preview="${args.generatePreview}"
          >
            <span slot="label">Click or drag file to this area to upload</span>
            <span slot="hint">Supports all file types (max. 10MB)</span>
          </cor-upload-area>
        </div>

        <!-- Regular style examples -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Regular Style — Multiple Files</h3>
          <cor-upload-area
            variant="multiple"
            upload-style="regular"
            is-uploading="true"
          >
            <span slot="label">Upload documents</span>
            <span slot="hint">PDF, DOCX, XLSX (max. 10MB per file)</span>
            <cor-upload-file-item
              file-name="Contract_2024.pdf"
              file-state="uploading"
              progress="45"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-name="Invoice_Jan.xlsx"
              file-state="uploaded"
              progress="100"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-name="Report.docx"
              file-state="uploaded"
              progress="100"
            ></cor-upload-file-item>
          </cor-upload-area>
        </div>

        <!-- Regular style with images -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Regular Style — Image Uploads</h3>
          <cor-upload-area
            variant="multiple"
            upload-style="regular"
            accept="image/*"
            is-uploading="true"
          >
            <span slot="label">Upload images</span>
            <span slot="hint">JPG, PNG, GIF (max. 5MB per file)</span>
            <cor-upload-file-item
              file-name="photo1.jpg"
              file-state="uploaded"
              progress="100"
              preview-url="https://picsum.photos/seed/upload1/32/32"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-name="photo2.png"
              file-state="uploaded"
              progress="100"
              preview-url="https://picsum.photos/seed/upload2/32/32"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-name="photo3.jpg"
              file-state="uploading"
              progress="65"
            ></cor-upload-file-item>
          </cor-upload-area>
        </div>

        <!-- Regular style with errors -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Regular Style — With Errors</h3>
          <cor-upload-area
            variant="multiple"
            upload-style="regular"
          >
            <span slot="label">Upload files</span>
            <span slot="hint">All file types accepted</span>
            <cor-upload-file-item
              file-name="valid-file.pdf"
              file-state="uploaded"
              progress="100"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-name="too-large.zip"
              file-state="error"
              progress="30"
              error-message="File exceeds the maximum allowed size."
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-name="invalid-type.exe"
              file-state="error"
              progress="0"
              error-message="File type not supported."
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-name="upload-failed.docx"
              file-state="error"
              progress="85"
              error-message="Upload failed. Please try again."
            ></cor-upload-file-item>
          </cor-upload-area>
        </div>

        <!-- Single file upload (uploading state) -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Single File Upload — Uploading</h3>
          <cor-upload-area
            variant="single"
            upload-style="regular"
            is-uploading="true"
            progress="68"
          >
            <span slot="label">Click or drag file to this area to upload</span>
            <span slot="hint">PDF, DOCX, XLSX (max. 10MB)</span>
            <span slot="progress-message">Uploading document...</span>
          </cor-upload-area>
        </div>

        <!-- Compact style examples -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Compact Style — Multiple Files</h3>
          <cor-upload-area
            variant="multiple"
            upload-style="compact"
            is-uploading="true"
          >
            <span slot="label">Quick upload</span>
            <span slot="hint">Drag and drop or browse</span>
            <cor-upload-file-item
              file-name="Document1.pdf"
              file-state="uploading"
              progress="35"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-name="Document2.docx"
              file-state="uploaded"
              progress="100"
            ></cor-upload-file-item>
            <cor-upload-file-item
              file-name="Document3.xlsx"
              file-state="error"
              error-message="File too large."
            ></cor-upload-file-item>
          </cor-upload-area>
        </div>

        <!-- Compact style single upload -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Compact Style — Single Upload</h3>
          <cor-upload-area
            variant="single"
            upload-style="compact"
            is-uploading="true"
            progress="42"
          >
            <span slot="label">Quick upload</span>
            <span slot="hint">Drag and drop or browse</span>
          </cor-upload-area>
        </div>

        <!-- With file type restrictions -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">With File Type Restrictions</h3>
          <cor-upload-area
            variant="multiple"
            upload-style="regular"
            accept=".pdf,.doc,.docx"
          >
            <span slot="label">Upload documents only</span>
            <span slot="hint">Accepts PDF, DOC, DOCX files only</span>
          </cor-upload-area>
        </div>

        <!-- Image only upload -->
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Image Only Upload</h3>
          <cor-upload-area
            variant="multiple"
            upload-style="regular"
            accept="image/*"
          >
            <span slot="label">Upload images</span>
            <span slot="hint">JPG, PNG, GIF, WebP supported</span>
          </cor-upload-area>
        </div>
      </div>
    `;
  },
};
