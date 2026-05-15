import { Component, Host, Element, Prop, State, Event, EventEmitter, Listen, h } from '@stencil/core';

import { UploadVariant, UploadStyle } from './cor-upload-area.enums';
import { CorUploadFile, CorRejectedFile, CorUploadConstraints } from './cor-upload-area.types';
import { IconSize } from '../cor-icon/cor-icon.types';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

/**
 * A drag-and-drop file upload area. Event-driven and partially controlled.
 *
 * The component owns: drag state, slot detection.
 * The consumer owns: upload progress, file status, retry logic.
 *
 * @element cor-upload-area
 *
 * @slot label           - Primary label above the hint text.
 * @slot hint            - Secondary hint/description text.
 * @slot progress-message - Text shown during single-file upload (replaces default "Files uploading...").
 * @slot                 - Default slot: place `cor-upload-file-item` elements here.
 */
@Component({
  tag: 'cor-upload-area',
  styleUrl: 'cor-upload-area.css',
  shadow: true,
})
export class CorUploadArea {
  @Element() host!: HTMLElement;

  /**
   * Single or multiple file selection.
   * @default multiple
   */
  @Prop({ reflect: true }) variant: UploadVariant = UploadVariant.MULTIPLE;

  /**
   * Regular (tall, centered) or compact (horizontal) layout.
   * @default regular
   */
  @Prop({ reflect: true }) uploadStyle: UploadStyle = UploadStyle.REGULAR;

  /**
   * When `true`, the drop zone switches to uploading state.
   * For `variant='single'`: shows spinner + progress message + cancel button.
   * For `variant='multiple'`: shows the drop zone normally; file items appear below.
   * @default false
   */
  @Prop({ reflect: true }) isUploading: boolean = false;

  /**
   * Overall upload progress (0–100). Shown as percentage in single-upload state.
   * @default 0
   */
  @Prop() progress: number = 0;

  /**
   * Label for the browse button (default state).
   * @default 'Browse files'
   */
  @Prop() browseLabel: string = 'Browse files';

  /**
   * Label for the cancel button (uploading state, single variant).
   * @default 'Cancel'
   */
  @Prop() cancelLabel: string = 'Cancel';

  /**
   * `accept` attribute forwarded to the hidden `<input type="file">`.
   * Comma-separated list of file extensions or MIME types.
   * Examples: '.jpg,.png,.pdf', 'image/*', 'application/pdf', 'video/*', 'audio/*', '.doc,.docx'
   * See: https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept
   * @default ''
   */
  @Prop() accept: string = '';

  /**
   * Validation constraints applied during file selection and drop.
   */
  @Prop() constraints?: CorUploadConstraints;

  /**
   * When `true`, generates `previewUrl` via `URL.createObjectURL` for image files.
   * @default true
   */
  @Prop() generatePreview: boolean = true;

  @State() isDragging: boolean = false;
  @State() hasLabelSlot: boolean = false;
  @State() hasHintSlot: boolean = false;
  @State() hasProgressMessageSlot: boolean = false;
  @State() hasDefaultSlot: boolean = false;

  private inputEl!: HTMLInputElement;
  private labelSlotRef: HTMLSlotElement | null = null;
  private hintSlotRef: HTMLSlotElement | null = null;
  private progressMessageSlotRef: HTMLSlotElement | null = null;
  private defaultSlotRef: HTMLSlotElement | null = null;

  /** Stores generated preview URLs for memory cleanup on disconnect. */
  private previewUrls: Map<string, string> = new Map();

  /**
   * Emitted after file validation succeeds. Payload contains accepted files.
   */
  @Event() corFilesSelected!: EventEmitter<{ files: CorUploadFile[] }>;

  /**
   * Emitted when one or more files fail validation. Payload contains rejected files with reasons.
   */
  @Event() corFilesRejected!: EventEmitter<{ files: CorRejectedFile[] }>;

  /**
   * Emitted when the browse button is clicked.
   */
  @Event() corBrowseClick!: EventEmitter<void>;

  /**
   * Emitted when the cancel button is clicked.
   */
  @Event() corCancelClick!: EventEmitter<void>;

  /**
   * Emitted when a drag enters the drop zone.
   */
  @Event() corDragEnter!: EventEmitter<void>;

  /**
   * Emitted when a drag leaves the drop zone.
   */
  @Event() corDragLeave!: EventEmitter<void>;

  /**
   * Emitted when files are dropped. Payload contains the raw FileList.
   */
  @Event() corDrop!: EventEmitter<{ files: FileList }>;

  // MIME type expansion map
  private static readonly TYPE_EXPANSION: Record<string, string[]> = {
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'image/heic',
      'image/heif',
    ],
    video: ['video/mp4', 'video/mpeg', 'video/ogg', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/flac'],
    application: [
      'application/pdf',
      'application/zip',
      'application/json',
      'application/xml',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    text: ['text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript'],
  };

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

  // Lifecycle
  componentWillLoad(): void {
    this.hasLabelSlot = !!this.host.querySelector('[slot="label"]');
    this.hasHintSlot = !!this.host.querySelector('[slot="hint"]');
    this.hasProgressMessageSlot = !!this.host.querySelector('[slot="progress-message"]');
    this.hasDefaultSlot =
      this.host.childNodes.length > 0 && Array.from(this.host.childNodes).some(n => !(n as Element).slot);
  }

  disconnectedCallback(): void {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
    this.previewUrls.clear();
  }

  // Slot change handlers
  private checkLabelSlot = (): void => {
    if (this.labelSlotRef) {
      this.hasLabelSlot = this.labelSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  private checkHintSlot = (): void => {
    if (this.hintSlotRef) {
      this.hasHintSlot = this.hintSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  private checkProgressMessageSlot = (): void => {
    if (this.progressMessageSlotRef) {
      this.hasProgressMessageSlot = this.progressMessageSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  private checkDefaultSlot = (): void => {
    if (this.defaultSlotRef) {
      this.hasDefaultSlot = this.defaultSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  // Drag & Drop
  private handleDragEnter = (e: DragEvent): void => {
    if (this.isUploadingSingle) return;
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.corDragEnter.emit();
  };

  private handleDragOver = (e: DragEvent): void => {
    if (this.isUploadingSingle) return;
    e.preventDefault();
    e.stopPropagation();
    if (!this.isDragging) {
      this.isDragging = true;
    }
  };

  private handleDragLeave = (e: DragEvent): void => {
    if (this.isUploadingSingle) return;
    e.preventDefault();
    e.stopPropagation();
    // Only fire if leaving the component boundary (not a child element)
    const related = e.relatedTarget as Node | null;
    if (related && this.host.contains(related)) return;
    this.isDragging = false;
    this.corDragLeave.emit();
  };

  private handleDrop = (e: DragEvent): void => {
    if (this.isUploadingSingle) return;
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    this.corDrop.emit({ files });
    this.processFiles(files);
  };

  // Input
  private handleInputChange = (): void => {
    const files = this.inputEl?.files;
    if (!files || files.length === 0) return;
    this.processFiles(files);
    // Reset so the same file can be selected again
    this.inputEl.value = '';
  };

  private handleBrowseClick = (): void => {
    this.corBrowseClick.emit();
    this.inputEl?.click();
  };

  private handleCancelClick = (): void => {
    this.corCancelClick.emit();
  };

  // Keyboard accessibility
  @Listen('keydown')
  handleKeydown(e: KeyboardEvent): void {
    if (this.isUploadingSingle) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.inputEl?.click();
    }
  }

  // Validation pipeline
  private async processFiles(fileList: FileList): Promise<void> {
    const files = Array.from(fileList);
    const accepted: CorUploadFile[] = [];
    const rejected: CorRejectedFile[] = [];

    // Count check
    if (this.constraints?.maxFiles !== undefined && files.length > this.constraints.maxFiles) {
      files.forEach(file => {
        rejected.push({ file, reasons: [`Exceeds maximum file count of ${this.constraints!.maxFiles!}`] });
      });
      this.corFilesRejected.emit({ files: rejected });
      return;
    }

    if (this.constraints?.minFiles !== undefined && files.length < this.constraints.minFiles) {
      files.forEach(file => {
        rejected.push({ file, reasons: [`Below minimum file count of ${this.constraints!.minFiles!}`] });
      });
      this.corFilesRejected.emit({ files: rejected });
      return;
    }

    for (const file of files) {
      const reasons: string[] = [];

      // Extension check
      if (this.constraints?.extensions && this.constraints.extensions.length > 0) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const allowed = this.constraints.extensions.map(e => e.toLowerCase());
        if (!allowed.includes(ext)) {
          reasons.push(`File extension ".${ext}" is not allowed`);
        }
      }

      // MIME type check
      if (this.constraints?.types && this.constraints.types.length > 0) {
        const allowedMimes = this.constraints.types.flatMap(t => {
          return CorUploadArea.TYPE_EXPANSION[t.toLowerCase()] ?? [t];
        });
        if (file.type && !allowedMimes.includes(file.type)) {
          reasons.push(`File type "${file.type}" is not allowed`);
        }
      }

      // Size checks
      if (this.constraints?.maxFileSize !== undefined && file.size > this.constraints.maxFileSize) {
        reasons.push(`File exceeds maximum size of ${this.formatBytes(this.constraints.maxFileSize)}`);
      }
      if (this.constraints?.minFileSize !== undefined && file.size < this.constraints.minFileSize) {
        reasons.push(`File is below minimum size of ${this.formatBytes(this.constraints.minFileSize)}`);
      }

      if (reasons.length > 0) {
        rejected.push({ file, reasons });
      } else {
        const id = this.generateId();
        let previewUrl: string | undefined;

        if (this.generatePreview) {
          const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
          if (CorUploadArea.IMAGE_EXTENSIONS.has(ext) || file.type.startsWith('image/')) {
            previewUrl = URL.createObjectURL(file);
            this.previewUrls.set(id, previewUrl);
          }
        }

        accepted.push({ id, file, previewUrl });
      }
    }

    if (accepted.length > 0) {
      this.corFilesSelected.emit({ files: accepted });
    }
    if (rejected.length > 0) {
      this.corFilesRejected.emit({ files: rejected });
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Computed helpers
  private get isUploadingSingle(): boolean {
    return this.isUploading && this.variant === UploadVariant.SINGLE;
  }

  private get isUploadingMultiple(): boolean {
    return this.isUploading && this.variant === UploadVariant.MULTIPLE;
  }

  // Render
  render() {
    const clampedProgress = Math.min(100, Math.max(0, this.progress));
    const isMultiple = this.variant === UploadVariant.MULTIPLE;

    return (
      <Host
        class={{
          'is-dragging': this.isDragging,
          'is-uploading-single': this.isUploadingSingle,
          'is-uploading-multiple': this.isUploadingMultiple,
        }}
        role="region"
        aria-label="File upload area"
        aria-busy={this.isUploading ? 'true' : 'false'}
        onDragenter={this.handleDragEnter}
        onDragover={this.handleDragOver}
        onDragleave={this.handleDragLeave}
        onDrop={this.handleDrop}
      >
        <div class="drop-zone">
          {/* Icon area — spinner when single uploading, upload icon otherwise */}
          {this.isUploadingSingle ? (
            <cor-loading value={clampedProgress} />
          ) : (
            <div class="icon-circle">
              <cor-icon name={ICON_NAMES['UPLOAD']} size={IconSize.MD} color="currentColor" />
            </div>
          )}

          {/* Label + hint group — stacks vertically; grows as single flex item in compact */}
          {!this.isUploadingSingle && (
            <div class="text-group">
              {this.hasLabelSlot && (
                <cor-typography variant="body-md" color="color-neutral-text-default">
                  <p>
                    <slot
                      name="label"
                      ref={el => (this.labelSlotRef = el as HTMLSlotElement | null)}
                      onSlotchange={this.checkLabelSlot}
                    />
                  </p>
                </cor-typography>
              )}
              {this.hasHintSlot && (
                <cor-typography variant="body-sm" color="color-neutral-text-weaker">
                  <p>
                    <slot
                      name="hint"
                      ref={el => (this.hintSlotRef = el as HTMLSlotElement | null)}
                      onSlotchange={this.checkHintSlot}
                    />
                  </p>
                </cor-typography>
              )}
            </div>
          )}

          {/* Single uploading state: progress message + percentage */}
          {this.isUploadingSingle && (
            <div class="progress-message-wrapper">
              <div class="progress-message-text">
                <slot
                  name="progress-message"
                  ref={el => (this.progressMessageSlotRef = el as HTMLSlotElement | null)}
                  onSlotchange={this.checkProgressMessageSlot}
                />
                {!this.hasProgressMessageSlot && <span class="default-progress-message">Files uploading...</span>}
              </div>
              <span class="progress-percent" aria-live="polite">
                {clampedProgress}%
              </span>
            </div>
          )}

          {/* Action buttons */}
          {this.isUploadingSingle ? (
            <cor-button variant="tertiary" size="sm">
              <button type="button" onClick={this.handleCancelClick}>
                {this.cancelLabel}
              </button>
            </cor-button>
          ) : (
            <cor-button variant="tertiary" size="sm">
              <button type="button" onClick={this.handleBrowseClick}>
                {this.browseLabel}
              </button>
            </cor-button>
          )}
        </div>

        {/* File list slot — visible in default + multiple uploading states */}
        {!this.isUploadingSingle && (
          <div class={{ 'file-list': true, 'is-empty': !this.hasDefaultSlot }}>
            <slot
              ref={el => (this.defaultSlotRef = el as HTMLSlotElement | null)}
              onSlotchange={this.checkDefaultSlot}
            />
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          class="hidden-input"
          accept={this.accept ?? ''}
          multiple={isMultiple}
          ref={el => (this.inputEl = el as HTMLInputElement)}
          onChange={this.handleInputChange}
          aria-hidden="true"
          tabindex="-1"
        />
      </Host>
    );
  }
}
