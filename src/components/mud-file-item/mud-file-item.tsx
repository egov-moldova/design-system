import { Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { FILE_ITEM_STATES } from './mud-file-item.types';
import type { FileItemRemoveDetail, FileItemState } from './mud-file-item.types';

/**
 * White-page file glyph (a 2-tone illustration: paper gradient + a dog-ear with
 * its own drop shadow). Rendered as a data-URI `<img>` instead of `mud-icon`
 * because it is colored + filtered, which the monochrome icon set can't carry.
 */
const FILE_GLYPH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="27" height="30" viewBox="0 0 27 30" fill="none"><g filter="url(#a)"><g clip-path="url(#b)"><path d="M3 4C3 2.89543 3.89543 2 5 2H14.1446L21.2169 8.49398V24C21.2169 25.1046 20.3214 26 19.2169 26H5C3.89543 26 3 25.1046 3 24V4Z" fill="url(#c)"/><g filter="url(#d)"><path d="M14.1446 2L21.2169 8.49398H15.3012C14.6624 8.49398 14.1446 7.97614 14.1446 7.33735V2Z" fill="white"/></g></g></g><defs><filter id="a" x="0" y="0" width="30" height="30" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="1.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="e1"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="0.25"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0"/><feBlend mode="normal" in2="e1" result="e2"/><feBlend mode="normal" in="SourceGraphic" in2="e2" result="shape"/></filter><filter id="d" x="9.22893" y="-0.0240965" width="14.012" height="13.4337" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dx="-0.289157" dy="0.289157"/><feGaussianBlur stdDeviation="0.433735"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="e1"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dx="-0.5" dy="0.5"/><feGaussianBlur stdDeviation="0.6"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="e1" result="e2"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="0.0722892"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/><feBlend mode="normal" in2="e2" result="e3"/><feBlend mode="normal" in="SourceGraphic" in2="e3" result="shape"/></filter><linearGradient id="c" x1="12" y1="2" x2="12" y2="26" gradientUnits="userSpaceOnUse"><stop stop-color="white"/><stop offset="1" stop-color="#F8F8F8"/></linearGradient><clipPath id="b"><rect width="24" height="24" fill="white" transform="translate(3 2)"/></clipPath></defs></svg>';
const FILE_GLYPH_SRC = `data:image/svg+xml,${encodeURIComponent(FILE_GLYPH_SVG)}`;

/**
 * File Item — single-file row inside `mud-file-input` (or any file list surface).
 *
 * Pattern B (atom, internal DOM): renders filename + meta (size / error message)
 * + state icon + remove button. The remove button is the only interactive
 * element; the row itself is not focusable so it cannot trap citizens who tab
 * past a long list.
 *
 * @element mud-file-item
 *
 * @slot icon - Override the leading file-type icon. Defaults to `attachment`.
 */
@Component({
  tag: 'mud-file-item',
  styleUrl: 'mud-file-item.css',
  shadow: true,
})
export class MudFileItem {
  /**
   * Lifecycle state. Drives leading icon color and border treatment.
   * Matches Figma's 4-state model: `uploaded` (resting), `uploading`,
   * `success`, `error`.
   * @default 'uploaded'
   */
  @Prop({ reflect: true }) state: FileItemState = 'uploaded';

  /** Visible filename. */
  @Prop() filename: string = '';

  /** Optional file size in bytes — rendered as a human-readable string. */
  @Prop() size?: number;

  /**
   * Per-item error message. Replaces the size meta line when `state="error"`.
   */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  /**
   * Optional image-preview URL (object URL or data URI). When set, a thumbnail
   * renders in place of the leading file-type icon (the Figma "image-preview"
   * variation). Falls back to the icon if the image fails to load.
   */
  @Prop({ attribute: 'preview-src' }) previewSrc?: string;

  /** Disables the remove button. */
  @Prop({ reflect: true }) disabled: boolean = false;

  /** Hide the remove button entirely (e.g. read-only summary lists). */
  @Prop({ reflect: true, attribute: 'no-remove' }) noRemove: boolean = false;

  /**
   * Accessible label for the remove button. Provided in Romanian by default
   * to match the institutional voice.
   * @default 'Elimină fișierul'
   */
  @Prop({ attribute: 'remove-label' }) removeLabel: string = 'Elimină fișierul';

  @State() private previewFailed: boolean = false;
  /** True when the filename is visually clipped, which gates the hover tooltip. */
  @State() private isTruncated: boolean = false;

  @Element() host!: HTMLMudFileItemElement;

  /** Fires when the citizen presses the remove control. The host is responsible for splicing the file out of its list. */
  @Event() mudRemove!: EventEmitter<FileItemRemoveDetail>;

  private filenameEl?: HTMLElement;
  private resizeObserver?: ResizeObserver;

  componentDidLoad() {
    this.measureTruncation();
    if (typeof ResizeObserver !== 'undefined' && this.filenameEl) {
      this.resizeObserver = new ResizeObserver(() => this.measureTruncation());
      this.resizeObserver.observe(this.filenameEl);
    }
  }

  componentDidUpdate() {
    this.measureTruncation();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
  }

  /** Compare rendered vs content width to know if the name is clipped (tooltip-worthy). */
  private measureTruncation() {
    const el = this.filenameEl;
    if (!el) return;
    const truncated = el.scrollWidth > el.clientWidth + 1;
    if (truncated !== this.isTruncated) this.isTruncated = truncated;
  }

  @Watch('state')
  validateState(next: FileItemState) {
    if (!FILE_ITEM_STATES.includes(next)) {
      console.warn(
        `[mud-file-item] state="${String(next)}" is not supported. Supported: ${FILE_ITEM_STATES.join(
          ', ',
        )}. Falling back to "uploaded".`,
      );
      this.state = 'uploaded';
    }
  }

  @Watch('previewSrc')
  resetPreviewFailure() {
    this.previewFailed = false;
  }

  private handlePreviewError = () => {
    this.previewFailed = true;
  };

  private handleRemove = (ev: MouseEvent | KeyboardEvent) => {
    if (this.disabled || this.noRemove) return;
    ev.stopPropagation();
    this.mudRemove.emit({ filename: this.filename });
  };

  private handleRemoveKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.handleRemove(ev);
    }
  };

  private formatSize(bytes: number | undefined): string {
    if (bytes === undefined || bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  render() {
    const isError = this.state === 'error';
    const isUploading = this.state === 'uploading';
    const isSuccess = this.state === 'success';
    const sizeText = this.formatSize(this.size);
    const showErrorMessage = isError && Boolean(this.errorText?.trim());
    // The leading file glyph is dropped in the error state (Figma 558:…) so the
    // red status icon + message carry the meaning without competing chrome.
    const showLeadingIcon = !isError;
    // Resting (uploaded) and error rows are removable; uploading shows a spinner
    // and success shows a confirmation tick instead (per Figma).
    const showRemove = !this.noRemove && (this.state === 'uploaded' || isError);

    return (
      <Host
        class={{
          [`state-${this.state}`]: true,
          'is-disabled': this.disabled,
        }}
      >
        <div class="row" part="row">
          {showLeadingIcon ? (
            <span class="leading-icon" part="leading-icon" aria-hidden="true">
              {this.previewSrc && !this.previewFailed ? (
                <img
                  class="thumbnail"
                  part="thumbnail"
                  src={this.previewSrc}
                  alt=""
                  onError={this.handlePreviewError}
                />
              ) : (
                <slot name="icon">
                  <img class="file-glyph" src={FILE_GLYPH_SRC} alt="" aria-hidden="true" />
                </slot>
              )}
            </span>
          ) : null}

          <span class="body" part="body">
            <span class="filename-wrap">
              <span class="filename" part="filename" ref={el => (this.filenameEl = el as HTMLElement)}>
                {this.filename}
              </span>
              {this.isTruncated ? (
                <span class="filename-tooltip" part="filename-tooltip" aria-hidden="true">
                  {this.filename}
                </span>
              ) : null}
            </span>
            {sizeText ? (
              <span class="meta" part="meta">
                {sizeText}
              </span>
            ) : null}
          </span>

          <span class="trailing" part="trailing">
            {isUploading ? (
              <span class="spinner" part="spinner" aria-hidden="true">
                <mud-spinner size="sm" variant="brand" label="" />
              </span>
            ) : null}
            {isSuccess ? (
              <mud-icon
                class="status status-success"
                name="circle-checkmark-filled"
                size={20}
                color="icon-positive-default"
              />
            ) : null}
            {isError ? (
              <mud-icon class="status status-error" name="circle-error-filled" size={20} color="icon-danger-default" />
            ) : null}
            {showRemove ? (
              <button
                type="button"
                class="remove"
                part="remove"
                disabled={this.disabled}
                aria-label={this.removeLabel}
                aria-disabled={this.disabled ? 'true' : null}
                onClick={this.handleRemove}
                onKeyDown={this.handleRemoveKey}
              >
                <mud-icon name="cross-large" size={20} />
              </button>
            ) : null}
          </span>
        </div>

        {showErrorMessage ? (
          <p class="error-message" part="error-message">
            {this.errorText}
          </p>
        ) : null}
      </Host>
    );
  }
}
