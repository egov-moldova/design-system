import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { FILE_INPUT_SIZES } from './cor-file-input.types';
import type {
  FileInputChangeDetail,
  FileInputDropDetail,
  FileInputErrorDetail,
  FileInputRejectionReason,
  FileInputRemoveDetail,
  FileInputSize,
} from './cor-file-input.types';

let fileInputInstanceCounter = 0;

/**
 * File Input — drag-and-drop / click-to-browse file selection molecule.
 *
 * Pattern B (molecule, internal DOM, form-associated): the host owns a hidden
 * native `<input type="file">` for the browse path, manages the drop zone
 * affordance, validates by `accept` / `maxSize` / `maxFiles`, and renders a
 * per-file list of `cor-file-item` rows. Citizens get keyboard parity (Tab
 * to focus, Enter/Space to open the picker) and a `role="status"` live region
 * that announces add / remove / reject events.
 *
 * The component owns SELECTION + VALIDATION + DISPLAY. Real upload (progress,
 * network errors, retries) is consumer-driven via the `corChange` event.
 *
 * State model (no style axis — Figma is state-only):
 *   default → hover → focus → active (drag-over) → disabled
 *   `invalid` is a separate validation flag that recolors the dashed border red
 *   without introducing a style variant.
 *
 * @element cor-file-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop.
 * @slot icon - Override the leading drop-zone icon. Defaults to `cloud-upload`.
 */
@Component({
  tag: 'cor-file-input',
  styleUrl: 'cor-file-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class CorFileInput {
  /**
   * Visual size rung. Drives drop-zone min-height + label / icon scale.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: FileInputSize = 'md';

  /** Disables interactivity — drop zone ignores drops, button is blocked. */
  @Prop({ reflect: true }) disabled: boolean = false;

  /** Marks the field as mandatory. Adds the red asterisk + `aria-required`. */
  @Prop({ reflect: true }) required: boolean = false;

  /** Renders the red-border error treatment + wires `aria-invalid`. */
  @Prop({ reflect: true }) invalid: boolean = false;

  /** Allow selecting more than one file. */
  @Prop({ reflect: true }) multiple: boolean = false;

  /** Native HTML `accept` attribute — MIME types and/or extensions, comma-separated. */
  @Prop() accept?: string;

  /** Maximum per-file size in bytes; files above are rejected with `code='size'`. */
  @Prop({ attribute: 'max-size' }) maxSize?: number;

  /** Maximum number of files accepted when `multiple` is set. */
  @Prop({ attribute: 'max-files' }) maxFiles?: number;

  /** Form-control `name`. Used during form submission. */
  @Prop() name?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text helper / hint shown below the drop zone. */
  @Prop({ attribute: 'helper-text' }) helperText?: string;

  /** Plain-text error message shown below the drop zone when `invalid` is set. */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  /**
   * Body text inside the drop area at rest.
   * @default 'Trage fișierele aici sau apasă pentru a căuta'
   */
  @Prop({ attribute: 'dropzone-text' }) dropzoneText: string = 'Trage fișierele aici sau apasă pentru a căuta';

  /**
   * Body text shown while a drag is over the drop zone (Figma "Active" state).
   * Replaces the resting body + hides the icon for the duration of the drag.
   * @default 'Eliberează pentru a încărca'
   */
  @Prop({ attribute: 'dropzone-active-text' }) dropzoneActiveText: string = 'Eliberează pentru a încărca';

  /**
   * Secondary text under the dropzone body (e.g. file type hints).
   * Empty by default — consumers populate it to communicate `accept` + `maxSize`.
   */
  @Prop({ attribute: 'dropzone-hint' }) dropzoneHint?: string;

  /**
   * Currently accepted files. Two-way bound: assigning a new array rerenders
   * the list, the citizen interacting fires events that the consumer may use
   * to mutate this array externally.
   */
  @Prop({ mutable: true }) files: File[] = [];

  /** Accessible name; mirrors to the drop zone's `aria-label` when no visible label. */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  /** Tracks drag-over. Maps to Figma's "Active" state visually. */
  @State() private isActive: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private announcement: string = '';

  @Element() host!: HTMLCorFileInputElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires when the accepted file list changes (browse OR drop OR remove). */
  @Event() corChange!: EventEmitter<FileInputChangeDetail>;

  /** Fires when a drag enters the drop zone. */
  @Event() corDragEnter!: EventEmitter<DragEvent>;

  /** Fires when the drag leaves the drop zone. */
  @Event() corDragLeave!: EventEmitter<DragEvent>;

  /** Fires after a drop, with the accepted / rejected split + the first rejection reason. */
  @Event() corDrop!: EventEmitter<FileInputDropDetail>;

  /** Fires when a file is removed from the inline list. */
  @Event() corRemove!: EventEmitter<FileInputRemoveDetail>;

  /** Fires for every rejected file (size / type / count). One event per file. */
  @Event() corError!: EventEmitter<FileInputErrorDetail>;

  private readonly instanceId = ++fileInputInstanceCounter;
  private readonly labelId = `cor-file-input-label-${this.instanceId}`;
  private readonly helperId = `cor-file-input-helper-${this.instanceId}`;
  private readonly errorId = `cor-file-input-error-${this.instanceId}`;
  private readonly dropzoneId = `cor-file-input-dropzone-${this.instanceId}`;
  private readonly liveId = `cor-file-input-live-${this.instanceId}`;
  private nativeInput?: HTMLInputElement;
  /** Drag enters/leaves fire for child elements too; counter-tracking keeps `isActive` stable. */
  private dragDepth: number = 0;

  componentWillLoad() {
    this.syncFormValue(this.files);
  }

  @Watch('size')
  validateSize(next: FileInputSize) {
    if (!FILE_INPUT_SIZES.includes(next)) {
      console.warn(
        `[cor-file-input] size="${String(next)}" is not supported. Supported: ${FILE_INPUT_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('files')
  handleFilesChange(next: File[]) {
    this.syncFormValue(next ?? []);
  }

  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.files = [];
    this.syncFormValue([]);
    this.announcement = '';
  }

  formStateRestoreCallback(state: FormData | string | File | null) {
    // FormData restore — re-hydrate from entries with our `name`. String / File
    // shapes are not part of this contract; we silently ignore them so the
    // component stays predictable across HMR + back/forward cache hits.
    if (state instanceof FormData && this.name) {
      const restored: File[] = [];
      for (const value of state.getAll(this.name)) {
        if (value instanceof File) restored.push(value);
      }
      if (restored.length > 0) {
        this.files = restored;
        this.syncFormValue(restored);
      }
    }
  }

  private syncFormValue(files: File[]) {
    if (!this.name) {
      this.internals.setFormValue(null, null);
      return;
    }
    const formData = new FormData();
    for (const file of files) {
      formData.append(this.name, file);
    }
    this.internals.setFormValue(formData, formData);
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };
  private onHelperSlotChange = (ev: Event) => {
    this.hasHelperSlot = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  private hasErrorMessage(): boolean {
    return this.invalid && Boolean(this.errorText && this.errorText.trim().length > 0);
  }

  private hasHelperMessage(): boolean {
    if (this.hasErrorMessage()) return false;
    if (this.helperText && this.helperText.trim().length > 0) return true;
    return this.hasHelperSlot;
  }

  private describedBy(): string | undefined {
    const ids: string[] = [];
    if (this.hasErrorMessage()) ids.push(this.errorId);
    else if (this.hasHelperMessage()) ids.push(this.helperId);
    if (ids.length === 0) return undefined;
    return ids.join(' ');
  }

  private validateFile(file: File): FileInputRejectionReason | null {
    if (this.accept) {
      const tokens = this.accept
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);
      if (tokens.length > 0) {
        const filename = file.name.toLowerCase();
        const mime = file.type.toLowerCase();
        const ok = tokens.some(token => {
          if (token.startsWith('.')) return filename.endsWith(token);
          if (token.endsWith('/*')) {
            const family = token.slice(0, -2);
            return mime.startsWith(`${family}/`);
          }
          return mime === token;
        });
        if (!ok) return 'type';
      }
    }
    if (this.maxSize !== undefined && file.size > this.maxSize) {
      return 'size';
    }
    return null;
  }

  private reasonMessage(code: FileInputRejectionReason, file?: File): string {
    switch (code) {
      case 'size':
        return file ? `Fișierul "${file.name}" depășește limita de mărime.` : 'Fișier prea mare.';
      case 'type':
        return file ? `Formatul fișierului "${file.name}" nu este acceptat.` : 'Format nepermis.';
      case 'count':
        return `Maximum ${this.maxFiles ?? ''} fișiere permise.`;
    }
  }

  private intakeFiles(
    incoming: File[],
    source: 'browse' | 'drop',
  ): { accepted: File[]; rejected: File[]; reason?: FileInputRejectionReason } {
    const accepted: File[] = [];
    const rejected: File[] = [];
    let firstReason: FileInputRejectionReason | undefined;

    let remaining =
      this.maxFiles !== undefined ? Math.max(0, this.maxFiles - (this.multiple ? this.files.length : 0)) : Infinity;

    for (const file of incoming) {
      const validity = this.validateFile(file);
      if (validity !== null) {
        rejected.push(file);
        firstReason ??= validity;
        this.corError.emit({ code: validity, message: this.reasonMessage(validity, file), file });
        continue;
      }
      if (this.maxFiles !== undefined && remaining <= 0) {
        rejected.push(file);
        firstReason ??= 'count';
        this.corError.emit({ code: 'count', message: this.reasonMessage('count', file), file });
        continue;
      }
      accepted.push(file);
      remaining -= 1;
    }

    const nextFiles = this.multiple ? [...this.files, ...accepted] : accepted.slice(0, 1);
    this.files = nextFiles;

    if (accepted.length > 0) {
      this.announcement =
        accepted.length === 1
          ? `Fișierul ${accepted[0].name} a fost adăugat.`
          : `${accepted.length} fișiere au fost adăugate.`;
    } else if (rejected.length > 0) {
      this.announcement = `${rejected.length} fișier${rejected.length === 1 ? '' : 'e'} respins${
        rejected.length === 1 ? '' : 'e'
      }.`;
    }

    this.corChange.emit({ files: nextFiles });
    if (source === 'drop') {
      this.corDrop.emit({ accepted, rejected, reason: firstReason });
    }
    return { accepted, rejected, reason: firstReason };
  }

  private handleBrowseClick = (ev: MouseEvent) => {
    if (this.isInert()) return;
    ev.preventDefault();
    this.nativeInput?.click();
  };

  private handleBrowseKey = (ev: KeyboardEvent) => {
    if (this.isInert()) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.nativeInput?.click();
    }
  };

  private handleNativeChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    const list = target.files ? Array.from(target.files) : [];
    if (list.length > 0) this.intakeFiles(list, 'browse');
    // Allow the same file to be picked again — clear the input.
    target.value = '';
  };

  private handleDragEnter = (ev: DragEvent) => {
    if (this.isInert()) return;
    ev.preventDefault();
    this.dragDepth += 1;
    if (!this.isActive) {
      this.isActive = true;
      this.corDragEnter.emit(ev);
    }
  };

  private handleDragOver = (ev: DragEvent) => {
    if (this.isInert()) return;
    // preventDefault is required to make this a valid drop target.
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
  };

  private handleDragLeave = (ev: DragEvent) => {
    if (this.isInert()) return;
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0 && this.isActive) {
      this.isActive = false;
      this.corDragLeave.emit(ev);
    }
  };

  private handleDrop = (ev: DragEvent) => {
    if (this.isInert()) return;
    ev.preventDefault();
    this.dragDepth = 0;
    this.isActive = false;
    const list = ev.dataTransfer?.files ? Array.from(ev.dataTransfer.files) : [];
    if (list.length > 0) this.intakeFiles(list, 'drop');
  };

  private handleFocus = () => {
    this.isFocused = true;
  };

  private handleBlur = () => {
    this.isFocused = false;
  };

  private handleRemove = (index: number) => (ev: CustomEvent<{ filename: string }>) => {
    ev.stopPropagation();
    const target = this.files[index];
    if (!target) return;
    const next = this.files.filter((_, i) => i !== index);
    this.files = next;
    this.announcement = `Fișierul ${target.name} a fost eliminat.`;
    this.corRemove.emit({ file: target, index });
    this.corChange.emit({ files: next });
  };

  render() {
    const effectivelyDisabled = this.isInert();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.ariaLabel : undefined;
    const isActiveNow = this.isActive && !effectivelyDisabled;
    const bodyText = isActiveNow ? this.dropzoneActiveText : this.dropzoneText;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-active': isActiveNow,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'has-label': this.hasVisibleLabel(),
      'has-files': this.files.length > 0,
    };

    return (
      <Host class={hostClasses}>
        <label class="label" htmlFor={this.dropzoneId} id={this.labelId} part="label">
          <span class="label-text">
            <slot name="label" onSlotchange={this.onLabelSlotChange}>
              {labelText}
            </slot>
          </span>
          {this.required ? (
            <span class="required-mark" aria-hidden="true" part="required-mark">
              *
            </span>
          ) : null}
        </label>

        <div
          id={this.dropzoneId}
          class="dropzone"
          part="dropzone"
          role="button"
          tabIndex={effectivelyDisabled ? -1 : 0}
          aria-label={ariaLabelAttr}
          aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
          aria-describedby={this.describedBy()}
          aria-disabled={effectivelyDisabled ? 'true' : null}
          aria-invalid={this.invalid ? 'true' : null}
          aria-required={this.required ? 'true' : null}
          onClick={this.handleBrowseClick}
          onKeyDown={this.handleBrowseKey}
          onDragEnter={this.handleDragEnter}
          onDragOver={this.handleDragOver}
          onDragLeave={this.handleDragLeave}
          onDrop={this.handleDrop}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
        >
          {!isActiveNow ? (
            <span class="dropzone-icon" part="dropzone-icon" aria-hidden="true">
              <slot name="icon">
                <cor-icon name="cloud-upload" size={24} color="currentColor" />
              </slot>
            </span>
          ) : null}
          <span class="dropzone-body" part="dropzone-body">
            <span class="dropzone-text" part="dropzone-text">
              {bodyText}
            </span>
            {!isActiveNow && this.dropzoneHint ? (
              <span class="dropzone-hint" part="dropzone-hint">
                {this.dropzoneHint}
              </span>
            ) : null}
          </span>
        </div>

        <input
          ref={el => (this.nativeInput = el as HTMLInputElement)}
          type="file"
          class="native"
          tabIndex={-1}
          aria-hidden="true"
          name={this.name}
          accept={this.accept}
          multiple={this.multiple}
          disabled={effectivelyDisabled}
          onChange={this.handleNativeChange}
        />

        {this.files.length > 0 ? (
          <ul class="file-list" part="file-list" role="list">
            {this.files.map((file, index) => (
              <li key={`${file.name}-${index}`} class="file-list-item" role="listitem">
                <cor-file-item
                  filename={file.name}
                  size={file.size}
                  disabled={effectivelyDisabled}
                  onCorRemove={this.handleRemove(index)}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error">
            <cor-icon class="assistive-icon" name="circle-error-filled" size={20} color="icon-danger-default" />
            <span class="assistive-text">{errorText}</span>
          </div>
        ) : this.hasHelperMessage() ? (
          <div class="assistive assistive-helper" id={this.helperId} part="helper">
            <span class="assistive-text">
              <slot name="helper" onSlotchange={this.onHelperSlotChange}>
                {helperText}
              </slot>
            </span>
          </div>
        ) : null}

        <div id={this.liveId} class="visually-hidden" role="status" aria-live="polite">
          {this.announcement}
        </div>
      </Host>
    );
  }
}
