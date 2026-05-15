import { Component, Host, Prop, Event, EventEmitter, h } from '@stencil/core';

import { FileItemState } from './cor-upload-file-item.enums';
import { ProgressBarType, ProgressBarSize } from '../cor-progress-bar/cor-progress-bar.enums';
import { IconSize } from '../cor-icon/cor-icon.types';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { TooltipPlacement } from '../cor-tooltip/cor-tooltip.enums';

/**
 * A single file row component for upload state display.
 * Fully externally controlled via props — no internal upload logic.
 *
 * Supports three states: uploading, uploaded, error.
 * Supports two layout modes: framed (default) and card.
 *
 * @element cor-upload-file-item
 */
@Component({
  tag: 'cor-upload-file-item',
  styleUrl: 'cor-upload-file-item.css',
  shadow: true,
})
export class CorUploadFileItem {
  /**
   * Visual state of the file item.
   * @default uploading
   */
  @Prop({ reflect: true }) fileState: FileItemState = FileItemState.UPLOADING;

  /**
   * File name with extension (e.g. `Document.docx`).
   * @default ''
   */
  @Prop() fileName: string = '';

  /**
   * Per-file progress percentage (0–100). Shown only when `fileState='uploading'`.
   * @default 0
   */
  @Prop() progress: number = 0;

  /**
   * Error message shown below the progress bar in error state.
   * @default ''
   */
  @Prop() errorMessage: string = '';

  /**
   * When `true`, renders a full border and rounded corners.
   * When `false`, renders a top border only with reduced padding.
   * @default true
   */
  @Prop({ reflect: true }) withFrame: boolean = true;

  /**
   * Card mode: forces full border, adds rounded background to icon area,
   * and positions the remove button absolutely (top-right, visible on hover only).
   * @default false
   */
  @Prop({ reflect: true }) card: boolean = false;

  /**
   * Consumer-provided image preview URL. When set and the file extension
   * is an image type, renders an `<img>` thumbnail in the icon area.
   * @default ''
   */
  @Prop() previewUrl: string = '';

  /**
   * Emitted when the remove (×) button is clicked.
   */
  @Event() corRemoveFile!: EventEmitter<{ fileName: string }>;

  private static readonly IMAGE_EXTENSIONS = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'bmp',
    'tiff',
    'tif',
    'ico',
    'heic',
    'heif',
  ]);

  private static readonly EXTENSION_ICON_MAP: Record<string, string> = {
    pdf: ICON_NAMES.PDF,
    doc: ICON_NAMES.ATTACHMENT,
    docx: ICON_NAMES.ATTACHMENT,
    xls: ICON_NAMES.CSV,
    xlsx: ICON_NAMES.CSV,
    csv: ICON_NAMES.CSV,
    txt: ICON_NAMES.ATTACHMENT,
    ppt: ICON_NAMES.ATTACHMENT,
    pptx: ICON_NAMES.ATTACHMENT,
    mp3: ICON_NAMES.AUDIO_CONSOLE,
    mp4: ICON_NAMES.VIDEO,
    mov: ICON_NAMES.VIDEO,
    zip: ICON_NAMES.ZIP,
    default: ICON_NAMES.ATTACHMENT,
  };

  private getFileExtension(): string {
    const parts = this.fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  private isImageExtension(ext: string): boolean {
    return CorUploadFileItem.IMAGE_EXTENSIONS.has(ext);
  }

  private getExtensionIcon(ext: string): string {
    return CorUploadFileItem.EXTENSION_ICON_MAP[ext] ?? CorUploadFileItem.EXTENSION_ICON_MAP['default'];
  }

  private handleRemove = () => {
    this.corRemoveFile.emit({ fileName: this.fileName });
  };

  private renderIconArea() {
    const ext = this.getFileExtension();
    const isUploading = this.fileState === FileItemState.UPLOADING;
    const isUploaded = this.fileState === FileItemState.UPLOADED;
    const isError = this.fileState === FileItemState.ERROR;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let iconContent: any = null;

    if (isUploading) {
      iconContent = <cor-loading-dots />;
    } else if (isUploaded) {
      if (this.previewUrl && this.isImageExtension(ext)) {
        iconContent = <img src={this.previewUrl} alt={this.fileName} class="preview-img" />;
      } else {
        iconContent = <cor-icon name={this.getExtensionIcon(ext)} size={IconSize.SM} color="neutral-icon-weak" />;
      }
    } else if (isError) {
      iconContent = <cor-icon name={ICON_NAMES.WARNING__FILLED} size={IconSize.SM} color="system-error-icon" />;
    }

    const content = this.card ? <div class="card-icon-bg">{iconContent}</div> : iconContent;

    if (isError && this.errorMessage) {
      return (
        <div class="icon-area">
          <cor-tooltip placement={TooltipPlacement.LEFT} flip-fallback={true}>
            <div slot="trigger">{content}</div>
            <cor-typography slot="description" variant="body-xs">
              <span>{this.errorMessage}</span>
            </cor-typography>
          </cor-tooltip>
        </div>
      );
    }

    return <div class="icon-area">{content}</div>;
  }

  render() {
    const isUploading = this.fileState === FileItemState.UPLOADING;
    const isError = this.fileState === FileItemState.ERROR;
    const clampedProgress = Math.min(100, Math.max(0, this.progress));

    return (
      <Host
        class={{
          'with-frame': this.withFrame,
          'card': this.card,
          'is-uploading': isUploading,
          'is-uploaded': this.fileState === FileItemState.UPLOADED,
          'is-error': isError,
        }}
      >
        {this.renderIconArea()}

        <div class="content">
          <div class="filename-row">
            <span class="filename" title={this.fileName}>
              {this.fileName}
            </span>
            {isUploading && <span class="percentage">{clampedProgress}%</span>}
          </div>

          {this.fileState !== FileItemState.UPLOADED && (
            <cor-progress-bar
              size={ProgressBarSize.SM}
              type={isError ? ProgressBarType.ERROR : ProgressBarType.DEFAULT}
              value={clampedProgress}
            />
          )}
        </div>

        <button class="remove-btn" type="button" aria-label={`Remove ${this.fileName}`} onClick={this.handleRemove}>
          <cor-icon name={ICON_NAMES.CLOSE} size={IconSize.SM} color="neutral-icon-weak" />
        </button>
      </Host>
    );
  }
}
