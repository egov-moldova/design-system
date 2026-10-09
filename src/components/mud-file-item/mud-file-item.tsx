import type { EventEmitter } from '@stencil/core';
import { Component, Element, Event, Host, Prop, State, Watch, forceUpdate, h } from '@stencil/core';

import { FILE_ITEM_STATES } from './mud-file-item.types';
import { FILE_GLYPH_SRC, renderLoader, renderSystemGlyph, renderUserGlyph } from './mud-file-item.glyph';
import type { FileItemRemoveDetail, FileItemState, FileItemVariant } from './mud-file-item.types';
import { localeMessages, watchDocumentLang, hostLang } from '../../utils/locale';
import type { LocaleProp } from '../../utils/locale';
import { formatFileSize } from '../../utils/file-size';
import { FILE_ITEM_MESSAGES } from './mud-file-item.messages';
import type { FileItemMessages } from './mud-file-item.messages';

/** Ids inside the shadow root: the remove button is labelled by itself and the file name. */
const REMOVE_ID = 'remove';
const FILENAME_ID = 'filename';

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

  /**
   * Visual variant. `system` renders the Figma "system-files-item" card: a taller
   * grey card, a blue document glyph and an info row (`issued-label` `issued-on` • `issuer`)
   * in place of the size meta. Use it for documents issued by a registry rather than uploaded.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: FileItemVariant = 'default';

  /**
   * System variant: render as a selectable list option (Figma "system-files-item-selectable") —
   * white bordered row, no remove button. The owner handles click / keyboard and sets `selected`.
   * @default false
   */
  @Prop({ reflect: true }) selectable: boolean = false;

  /**
   * Selectable rows: marks the chosen option with the brand border.
   * @default false
   */
  @Prop({ reflect: true }) selected: boolean = false;

  /**
   * Upload variant: progress of an uploading row, 0–100. Left unset, the bar is indeterminate. Ignored in
   * other states and variants.
   */
  @Prop() progress?: number;

  /** System variant: label before the issue date (already localised, e.g. "Emis"). */
  @Prop({ attribute: 'issued-label' }) issuedLabel?: string;

  /** System variant: issue date, pre-formatted by the host (e.g. "12.03.2026"). */
  @Prop({ attribute: 'issued-on' }) issuedOn?: string;

  /** System variant: issuing authority (e.g. "EVO"). */
  @Prop() issuer?: string;

  /**
   * Visible filename.
   * @default ''
   */
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

  /**
   * Disables the remove button.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Hide the remove button entirely (e.g. read-only summary lists).
   * @default false
   */
  @Prop({ reflect: true, attribute: 'no-remove' }) noRemove: boolean = false;

  /**
   * Language of the built-in copy. Unset, the component follows the closest ancestor `lang`
   * (`<html lang>` included), else `ro-MD`.
   */
  @Prop({ reflect: true }) locale?: LocaleProp;

  /**
   * Accessible label for the remove button. Overrides the `locale`'s copy when set to a
   * non-empty string.
   * @default 'Elimină fișierul' (ro-MD)
   */
  @Prop({ attribute: 'remove-label' }) removeLabel?: string;

  /**
   * Text announced to assistive technology when the row starts uploading (the state is otherwise only a spinner).
   * Overrides the `locale`'s copy when set to a non-empty string.
   * @default 'Se încarcă' (ro-MD)
   */
  @Prop({ attribute: 'uploading-label' }) uploadingLabel?: string;

  /**
   * Text announced when an upload finishes (`success`, or `uploaded` right after `uploading`).
   * Overrides the `locale`'s copy when set to a non-empty string.
   * @default 'Încărcat cu succes' (ro-MD)
   */
  @Prop({ attribute: 'success-label' }) successLabel?: string;

  /**
   * Text announced when the row turns to `error` and has no `error-text` of its own (with one, the message itself
   * is announced as an alert). Overrides the `locale`'s copy when set to a non-empty string.
   * @default 'Eroare la încărcare' (ro-MD)
   */
  @Prop({ attribute: 'error-label' }) errorLabel?: string;

  @State() private previewFailed: boolean = false;
  /** What the live region says now: the filename and the new state, set when the state changes. */
  @State() private announcement: string = '';
  /** True when the filename is visually clipped, which gates the hover tooltip. */
  @State() private isTruncated: boolean = false;

  @Element() host!: HTMLMudFileItemElement;

  /** Fires when the citizen presses the remove control. The host is responsible for splicing the file out of its list. */
  @Event() mudRemove!: EventEmitter<FileItemRemoveDetail>;

  private filenameEl?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private stopLang?: () => void;

  connectedCallback() {
    this.stopLang = watchDocumentLang(
      this.host,
      () => this.locale,
      () => forceUpdate(this),
    );
  }

  componentWillLoad() {
    this.syncProgress();
  }

  componentDidLoad() {
    // A row created already uploading: the live region exists now, so filling it is announced.
    if (this.state === 'uploading') this.announceState('uploading', undefined);
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
    this.stopLang?.();
  }

  /** Built-in strings in the resolved locale, with the override props on top. */
  private messages(): FileItemMessages {
    return localeMessages('mud-file-item', this.host, this.locale, FILE_ITEM_MESSAGES, {
      removeLabel: this.removeLabel,
      uploadingLabel: this.uploadingLabel,
      successLabel: this.successLabel,
      errorLabel: this.errorLabel,
    });
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

  /**
   * The state is drawn as an icon only, so a change of it is also said in a live region: the filename and what
   * happened. Nothing is announced for the resting row, or for an error that carries its own `error-text` (that is
   * an alert of its own).
   */
  @Watch('state')
  announceState(next: FileItemState, prev: FileItemState | undefined) {
    if (next === prev) return;

    const m = this.messages();
    let text = '';
    if (next === 'uploading') text = m.uploadingLabel;
    else if (next === 'success' || (next === 'uploaded' && prev === 'uploading')) text = m.successLabel;
    else if (next === 'error' && !this.errorText?.trim()) text = m.errorLabel;

    this.announcement = text ? `${this.filename}: ${text}` : '';
  }

  @Watch('previewSrc')
  resetPreviewFailure() {
    this.previewFailed = false;
  }

  /** Hands the clamped progress to the bar through a custom property (no inline style in the template). */
  @Watch('progress')
  syncProgress() {
    if (typeof this.progress === 'number' && Number.isFinite(this.progress)) {
      const clamped = Math.min(100, Math.max(0, this.progress));
      this.host.style.setProperty('--_progress', `${String(clamped)}%`);
    } else {
      this.host.style.removeProperty('--_progress');
    }
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

  private formatSize(bytes: number | undefined, m: FileItemMessages): string {
    if (bytes === undefined || bytes === null) return '';
    return formatFileSize(bytes, this.host, this.locale, [m.sizeUnitBytes, m.sizeUnitKB, m.sizeUnitMB, m.sizeUnitGB]);
  }

  render() {
    const m = this.messages();
    const isError = this.state === 'error';
    const isUploading = this.state === 'uploading';
    const isSuccess = this.state === 'success';
    const sizeText = this.formatSize(this.size, m);
    const showErrorMessage = isError && Boolean(this.errorText?.trim());
    // The leading file glyph is dropped in the error state (Figma 558:…) so the
    // red status icon + message carry the meaning without competing chrome.
    const showLeadingIcon = !isError;
    // Resting (uploaded) and error rows are removable; uploading shows a spinner
    // and success shows a confirmation tick instead (per Figma).
    const isSystem = this.variant === 'system';
    const isUpload = this.variant === 'upload';
    const hasProgress = typeof this.progress === 'number' && Number.isFinite(this.progress);
    const progressValue = hasProgress ? Math.min(100, Math.max(0, this.progress as number)) : 0;
    const issuedText = this.issuedOn?.trim();
    const issuerText = this.issuer?.trim();
    const isSelectable = isSystem && this.selectable;
    // The upload layout keeps the remove button while uploading too: there it cancels the upload.
    const showRemove = !this.noRemove && !isSelectable && (isUpload || this.state === 'uploaded' || isError);
    // Every row of a list has the same button, so its name also says which file it removes: `aria-label` stays the
    // localised label, and `aria-labelledby` reads it (the button itself) followed by the file name.
    const removeLabelledBy = this.filename ? [REMOVE_ID, FILENAME_ID].join(' ') : undefined;
    const lang = hostLang(this.host, this.locale);

    return (
      <Host
        class={{
          [`state-${this.state}`]: true,
          'is-disabled': this.disabled,
          'is-system': isSystem,
          'is-upload': isUpload,
          'is-selectable': isSelectable,
          'is-selected': isSelectable && this.selected,
        }}
        lang={lang}
      >
        <div class="row" part="row">
          {isUpload ? (
            <span class="leading-status" part="leading-status" aria-hidden="true">
              {isUploading ? (
                renderLoader()
              ) : isSuccess ? (
                <mud-icon name="circle-checkmark" variant="filled" size={24} color="icon-positive-default" />
              ) : isError ? (
                <mud-icon name="circle-error" variant="filled" size={24} color="icon-danger-default" />
              ) : (
                renderUserGlyph()
              )}
            </span>
          ) : showLeadingIcon ? (
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
                  {isSystem ? (
                    renderSystemGlyph()
                  ) : (
                    <img class="file-glyph" src={FILE_GLYPH_SRC} alt="" aria-hidden="true" />
                  )}
                </slot>
              )}
            </span>
          ) : null}

          <span class="body" part="body">
            <span class="filename-wrap">
              <span class="filename" id={FILENAME_ID} part="filename" ref={el => (this.filenameEl = el as HTMLElement)}>
                {this.filename}
              </span>
              {this.isTruncated ? (
                <span class="filename-tooltip" part="filename-tooltip" aria-hidden="true">
                  {this.filename}
                </span>
              ) : null}
            </span>
            {isUpload && sizeText ? (
              <span class="bullet" aria-hidden="true">
                •
              </span>
            ) : null}
            {!isSystem && sizeText ? (
              <span class="meta" part="meta">
                {sizeText}
              </span>
            ) : null}
            {isSystem && !issuedText && !issuerText && sizeText ? (
              <span class="info" part="info">
                <span class="info-label">{sizeText}</span>
              </span>
            ) : null}
            {isSystem && (issuedText || issuerText) ? (
              <span class="info" part="info">
                {issuedText ? (
                  <span class="info-item">
                    {this.issuedLabel ? <span class="info-label">{this.issuedLabel}</span> : null}
                    <span class="info-value">{issuedText}</span>
                  </span>
                ) : null}
                {issuedText && issuerText ? <span class="info-dot" aria-hidden="true" /> : null}
                {issuerText ? <span class="info-label">{issuerText}</span> : null}
              </span>
            ) : null}
          </span>

          <span class="trailing" part="trailing">
            {isUploading && !isUpload ? (
              <span class="spinner" part="spinner" aria-hidden="true">
                <mud-spinner size="sm" variant="brand" label="" />
              </span>
            ) : null}
            {isSuccess && !isUpload ? (
              <mud-icon
                class="status status-success"
                name="circle-checkmark"
                variant="filled"
                size={20}
                color="icon-positive-default"
              />
            ) : null}
            {isSelectable && this.selected ? (
              <mud-icon
                class="status status-selected"
                name="circle-checkmark"
                variant="filled"
                size={20}
                color="icon-brand-default"
              />
            ) : null}
            {isError && !isUpload ? (
              <mud-icon
                class="status status-error"
                name="circle-error"
                variant="filled"
                size={20}
                color="icon-danger-default"
              />
            ) : null}
            {showRemove ? (
              <button
                type="button"
                id={REMOVE_ID}
                class="remove"
                part="remove"
                disabled={this.disabled}
                aria-label={m.removeLabel}
                aria-labelledby={removeLabelledBy}
                aria-disabled={this.disabled ? 'true' : null}
                onClick={this.handleRemove}
                onKeyDown={this.handleRemoveKey}
              >
                <mud-icon name="cross-large" size={isSystem || isUpload ? 16 : 20} />
              </button>
            ) : null}
          </span>
        </div>

        {isUpload && isUploading ? (
          <div
            class="progress"
            part="progress"
            role="progressbar"
            aria-label={`${this.filename}: ${m.uploadingLabel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hasProgress ? Math.round(progressValue) : undefined}
          >
            <div class={{ 'progress-fill': true, 'is-indeterminate': !hasProgress }} />
          </div>
        ) : null}

        {showErrorMessage ? (
          <p class="error-message" part="error-message" role="alert">
            {this.errorText}
          </p>
        ) : null}

        {/* Says a change of state aloud (the state itself is only an icon); present from the first render so that
            filling it is announced. */}
        <span class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          {this.announcement}
        </span>
      </Host>
    );
  }
}
