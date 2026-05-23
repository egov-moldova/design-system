import { Component, Element, Event, EventEmitter, Host, Prop, Watch, h } from '@stencil/core';

import { FILE_ITEM_STATES } from './cor-file-item.types';
import type { FileItemRemoveDetail, FileItemState } from './cor-file-item.types';

/**
 * File Item — single-file row inside `cor-file-input` (or any file list surface).
 *
 * Pattern B (atom, internal DOM): renders filename + meta (size / error message)
 * + state icon + remove button. The remove button is the only interactive
 * element; the row itself is not focusable so it cannot trap citizens who tab
 * past a long list.
 *
 * @element cor-file-item
 *
 * @slot icon - Override the leading file-type icon. Defaults to `attachment`.
 */
@Component({
  tag: 'cor-file-item',
  styleUrl: 'cor-file-item.css',
  shadow: true,
})
export class CorFileItem {
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

  @Element() host!: HTMLCorFileItemElement;

  /** Fires when the citizen presses the remove control. The host is responsible for splicing the file out of its list. */
  @Event() corRemove!: EventEmitter<FileItemRemoveDetail>;

  @Watch('state')
  validateState(next: FileItemState) {
    if (!FILE_ITEM_STATES.includes(next)) {
      console.warn(
        `[cor-file-item] state="${String(next)}" is not supported. Supported: ${FILE_ITEM_STATES.join(
          ', ',
        )}. Falling back to "uploaded".`,
      );
      this.state = 'uploaded';
    }
  }

  private handleRemove = (ev: MouseEvent | KeyboardEvent) => {
    if (this.disabled || this.noRemove) return;
    ev.stopPropagation();
    this.corRemove.emit({ filename: this.filename });
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

  private iconForState(): string {
    switch (this.state) {
      case 'uploading':
        return 'attachment';
      case 'success':
        return 'circle-checkmark-filled';
      case 'error':
        return 'circle-error-filled';
      default:
        return 'attachment';
    }
  }

  render() {
    const isError = this.state === 'error' && Boolean(this.errorText?.trim());
    const metaText = isError ? this.errorText : this.formatSize(this.size);

    return (
      <Host
        class={{
          [`state-${this.state}`]: true,
          'is-disabled': this.disabled,
        }}
      >
        <span class="leading-icon" part="leading-icon" aria-hidden="true">
          <slot name="icon">
            <cor-icon name={this.iconForState()} size={24} color="currentColor" />
          </slot>
        </span>

        <span class="body" part="body">
          <span class="filename" part="filename" title={this.filename}>
            {this.filename}
          </span>
          {metaText ? (
            <span class={{ 'meta': true, 'meta-error': isError }} part="meta">
              {metaText}
            </span>
          ) : null}
        </span>

        {!this.noRemove ? (
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
            <cor-icon name="delete" size={20} color="currentColor" />
          </button>
        ) : null}
      </Host>
    );
  }
}
