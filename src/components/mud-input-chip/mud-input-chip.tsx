import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { INPUT_CHIP_SIZES, INPUT_CHIP_VARIANTS } from './mud-input-chip.types';
import type {
  InputChipAddDetail,
  InputChipChangeDetail,
  InputChipErrorCode,
  InputChipErrorDetail,
  InputChipRemoveDetail,
  InputChipSize,
  InputChipVariant,
} from './mud-input-chip.types';

let inputChipInstanceCounter = 0;

/**
 * Input Chip — multi-value text-entry control where each confirmed value
 * renders as a removable pill (chip / tag).
 *
 * Pattern B (molecule, internal DOM, form-associated). The host owns:
 *   - the chip-list state (`chips` prop, two-way bound),
 *   - the inline `<input type="text">` for the next value,
 *   - regex / duplicate / max validation,
 *   - the keyboard contract that lets the citizen navigate between input
 *     and chips with arrow keys + delete chips with Backspace / Enter,
 *   - a `role="status"` live region that announces add / remove / reject.
 *
 * The form value submitted to the surrounding `<form>` is a JSON-encoded
 * array of strings (e.g. `["a@b.md","c@d.md"]`) when a `name` is set.
 *
 * @element mud-input-chip
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop.
 */
@Component({
  tag: 'mud-input-chip',
  styleUrl: 'mud-input-chip.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudInputChip {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: InputChipVariant = 'default';

  /**
   * Visual size rung. Drives container min-height + chip pill scale.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: InputChipSize = 'md';

  /** Disables interactivity. Both chip remove-buttons and the text input become inert. */
  @Prop({ reflect: true }) disabled: boolean = false;

  /** Marks the field as mandatory. Adds the red asterisk + `aria-required`. */
  @Prop({ reflect: true }) required: boolean = false;

  /** Renders the field read-only. The control remains focusable. */
  @Prop({ reflect: true }) readonly: boolean = false;

  /** Forces destructive visuals regardless of `variant`. */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Confirmed chip values. Two-way bound: assigning a new array rerenders
   * the list. Consumer mutations through events should set this prop.
   * @default []
   */
  @Prop({ mutable: true }) chips: string[] = [];

  /**
   * The not-yet-confirmed text currently typed into the inline input.
   * @default ''
   */
  @Prop({ mutable: true }) value: string = '';

  /** Form-control `name`. Used during form submission (value: JSON-encoded array). */
  @Prop({ reflect: true }) name?: string;

  /** Placeholder shown when the inline input is empty and no chips exist. */
  @Prop() placeholder?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text helper / hint shown below the control. */
  @Prop({ attribute: 'helper-text' }) helperText?: string;

  /** Plain-text error message shown below the control when `invalid` is set. */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  /** Maximum number of chips accepted. Further additions emit `mudError` with `code: 'max'`. */
  @Prop({ attribute: 'max-chips' }) maxChips?: number;

  /** Optional regex (string form). Values that don't match are rejected with `code: 'pattern'`. */
  @Prop({ attribute: 'validate-pattern' }) validatePattern?: string;

  /**
   * Characters that confirm a chip in addition to Enter. Default is a comma.
   * @default ','
   */
  @Prop() separators: string = ',';

  /** Accessible name; mirrors to the group's `aria-label` when no visible label. */
  @Prop() ariaLabel?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private announcement: string = '';
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudInputChipElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires whenever the chip array changes (add or remove). */
  @Event() mudChange!: EventEmitter<InputChipChangeDetail>;

  /** Fires when a chip is successfully added. */
  @Event() mudChipAdd!: EventEmitter<InputChipAddDetail>;

  /** Fires when a chip is removed from the list. */
  @Event() mudChipRemove!: EventEmitter<InputChipRemoveDetail>;

  /** Fires for every rejected chip (pattern / duplicate / max). */
  @Event() mudError!: EventEmitter<InputChipErrorDetail>;

  /** Fires when the inline input gains focus. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the inline input loses focus. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++inputChipInstanceCounter;
  private readonly labelId = `mud-input-chip-label-${this.instanceId}`;
  private readonly helperId = `mud-input-chip-helper-${this.instanceId}`;
  private readonly errorId = `mud-input-chip-error-${this.instanceId}`;
  private readonly inputId = `mud-input-chip-input-${this.instanceId}`;
  private readonly liveId = `mud-input-chip-live-${this.instanceId}`;
  private nativeInput?: HTMLInputElement;
  private initialChips: string[] = [];

  componentWillLoad() {
    this.captureAriaLabel();
    this.initialChips = [...this.chips];
    this.syncFormValue(this.chips);
    this.syncValidity(this.chips);
  }

  private captureAriaLabel() {
    const hostAttr = this.host.getAttribute('aria-label');
    if (hostAttr && hostAttr.length > 0) {
      this.resolvedAriaLabel = hostAttr;
      this.host.removeAttribute('aria-label');
    } else if (this.ariaLabel && this.ariaLabel.length > 0) {
      this.resolvedAriaLabel = this.ariaLabel;
    }
  }

  @Watch('ariaLabel')
  syncAriaLabelProp(next?: string) {
    // Only override resolvedAriaLabel when the prop is actually set —
    // captureAriaLabel strips the attribute, which would otherwise null this out.
    if (next && next.length > 0) this.resolvedAriaLabel = next;
  }

  @Watch('required')
  onRequiredChange() {
    this.syncValidity(this.chips);
  }

  // Validation lives at the @Prop boundary (PRINCIPLES.md §D).
  @Watch('variant')
  validateVariant(next: InputChipVariant) {
    if (!INPUT_CHIP_VARIANTS.includes(next)) {
      console.warn(
        `[mud-input-chip] variant="${String(next)}" is not supported. Supported: ${INPUT_CHIP_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: InputChipSize) {
    if (!INPUT_CHIP_SIZES.includes(next)) {
      console.warn(
        `[mud-input-chip] size="${String(next)}" is not supported. Supported: ${INPUT_CHIP_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('chips')
  handleChipsChange(next: string[]) {
    const chips = next ?? [];
    this.syncFormValue(chips);
    this.syncValidity(chips);
  }

  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.chips = [...this.initialChips];
    this.value = '';
    this.announcement = '';
    this.syncFormValue(this.initialChips);
    this.syncValidity(this.initialChips);
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state !== 'string') return;
    try {
      const parsed = JSON.parse(state);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        this.chips = parsed;
        this.syncFormValue(parsed);
        this.syncValidity(parsed);
      }
    } catch {
      // Restore state is best-effort — bad payload simply leaves the
      // component empty rather than crashing the consumer.
    }
  }

  private syncFormValue(chips: string[]) {
    if (!this.name) {
      this.internals.setFormValue(null, null);
      return;
    }
    const serialized = JSON.stringify(chips);
    this.internals.setFormValue(serialized, serialized);
  }

  private syncValidity(chips: string[]) {
    if (!this.internals) return;
    const isMissing = this.required && chips.length === 0;
    const anchor = this.nativeInput ?? undefined;
    if (isMissing) {
      const msg = this.errorText && this.errorText.length > 0 ? this.errorText : 'Acest câmp este obligatoriu.';
      this.internals.setValidity({ valueMissing: true }, msg, anchor);
    } else {
      this.internals.setValidity({}, undefined, anchor);
    }
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

  private resolvedVariant(): InputChipVariant {
    return this.invalid ? 'destructive' : this.variant;
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
    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  private isMaxReached(): boolean {
    return this.maxChips !== undefined && this.chips.length >= this.maxChips;
  }

  private reasonMessage(code: InputChipErrorCode, value: string): string {
    switch (code) {
      case 'pattern':
        return `Valoarea "${value}" nu este în formatul așteptat.`;
      case 'duplicate':
        return `Valoarea "${value}" este deja adăugată.`;
      case 'max':
        return `Maximum ${this.maxChips ?? ''} valori permise.`;
    }
  }

  private validateChip(value: string): InputChipErrorCode | null {
    if (this.isMaxReached()) return 'max';
    if (this.chips.includes(value)) return 'duplicate';
    if (this.validatePattern) {
      try {
        const re = new RegExp(this.validatePattern);
        if (!re.test(value)) return 'pattern';
      } catch {
        // Invalid regex — skip pattern validation rather than throw at the
        // citizen. The consumer gets a dev-time signal via console.warn.
        console.warn(`[mud-input-chip] validate-pattern="${this.validatePattern}" is not a valid regex.`);
      }
    }
    return null;
  }

  private addChip(rawValue: string): boolean {
    const trimmed = rawValue.trim();
    if (trimmed.length === 0) return false;
    const reason = this.validateChip(trimmed);
    if (reason) {
      this.mudError.emit({ code: reason, value: trimmed, message: this.reasonMessage(reason, trimmed) });
      this.announcement = this.reasonMessage(reason, trimmed);
      return false;
    }
    const next = [...this.chips, trimmed];
    this.chips = next;
    this.value = '';
    this.announcement = `Valoarea ${trimmed} a fost adăugată.`;
    this.mudChipAdd.emit({ chip: trimmed, chips: next });
    this.mudChange.emit({ chips: next });
    return true;
  }

  private removeChip(index: number) {
    const target = this.chips[index];
    if (target === undefined) return;
    const next = this.chips.filter((_, i) => i !== index);
    this.chips = next;
    this.announcement = `Valoarea ${target} a fost eliminată.`;
    this.mudChipRemove.emit({ chip: target, index, chips: next });
    this.mudChange.emit({ chips: next });

    // Move focus to a neighbouring chip or back to the input. Citizens who
    // remove via keyboard expect focus to land somewhere predictable.
    if (next.length === 0) {
      this.focusInput();
    } else if (index >= next.length) {
      this.focusChipAt(next.length - 1);
    } else {
      this.focusChipAt(index);
    }
  }

  private focusInput() {
    this.nativeInput?.focus();
  }

  private focusChipAt(index: number) {
    const button = this.host.shadowRoot?.querySelector<HTMLButtonElement>(`[data-chip-index="${index}"]`);
    button?.focus();
  }

  private splitOnSeparators(raw: string): string[] {
    const seps = (this.separators ?? ',').split('');
    // Always treat newline as a separator — pasted text from CSV / multi-line
    // sources is the most common multi-chip entry path.
    const pattern = ['\\n', ...seps.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))].join('|');
    return raw
      .split(new RegExp(pattern))
      .map(v => v.trim())
      .filter(Boolean);
  }

  private handleInputInput = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    this.value = target.value;
  };

  private handleInputKeyDown = (ev: KeyboardEvent) => {
    if (this.isInert() || this.readonly) return;

    if (ev.key === 'Enter') {
      ev.preventDefault();
      if (this.value.trim().length > 0) this.addChip(this.value);
      return;
    }

    if (ev.key === 'Escape') {
      if (this.value.length > 0) {
        ev.preventDefault();
        this.value = '';
      }
      return;
    }

    if (ev.key === 'Backspace' && this.value.length === 0 && this.chips.length > 0) {
      ev.preventDefault();
      this.removeChip(this.chips.length - 1);
      return;
    }

    if (ev.key === 'ArrowLeft' && this.value.length === 0 && this.chips.length > 0) {
      // Move from empty input back to the last chip's remove button.
      ev.preventDefault();
      this.focusChipAt(this.chips.length - 1);
      return;
    }

    const seps = (this.separators ?? '').split('');
    if (seps.includes(ev.key)) {
      ev.preventDefault();
      if (this.value.trim().length > 0) this.addChip(this.value);
    }
  };

  private handleInputPaste = (ev: ClipboardEvent) => {
    if (this.isInert() || this.readonly) return;
    const text = ev.clipboardData?.getData('text') ?? '';
    if (!text) return;
    const tokens = this.splitOnSeparators(text);
    // Single-token paste with no separators behaves like normal typing —
    // let the browser handle insertion.
    if (tokens.length <= 1 && !/[,;\n]/.test(text) && !this.separators.split('').some(s => text.includes(s))) {
      return;
    }
    ev.preventDefault();
    let added = 0;
    for (const token of tokens) {
      if (this.addChip(token)) added += 1;
      if (this.isMaxReached()) break;
    }
    if (added > 0) {
      this.announcement = `${added} valor${added === 1 ? 'e' : 'i'} adăugat${added === 1 ? 'ă' : 'e'}.`;
    }
  };

  private handleInputFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.mudFocus.emit(ev);
  };

  private handleInputBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.mudBlur.emit(ev);
  };

  private handleControlClick = (ev: MouseEvent) => {
    // Citizens click anywhere in the container to type; only redirect focus
    // when the click was not on a chip / remove button.
    const target = ev.target as Element | null;
    if (target && (target.closest('.chip') || target.closest('.chip-remove'))) return;
    this.focusInput();
  };

  private handleChipKeyDown = (index: number) => (ev: KeyboardEvent) => {
    if (this.isInert() || this.readonly) return;

    if (ev.key === 'Delete' || ev.key === 'Backspace' || ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.removeChip(index);
      return;
    }

    if (ev.key === 'ArrowLeft') {
      if (index > 0) {
        ev.preventDefault();
        this.focusChipAt(index - 1);
      }
      return;
    }

    if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      if (index < this.chips.length - 1) {
        this.focusChipAt(index + 1);
      } else {
        this.focusInput();
      }
      return;
    }

    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.focusInput();
    }
  };

  private handleChipRemoveClick = (index: number) => (ev: MouseEvent) => {
    ev.stopPropagation();
    if (this.isInert() || this.readonly) return;
    this.removeChip(index);
  };

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined;
    const maxReached = this.isMaxReached();
    const placeholder = this.chips.length === 0 ? this.placeholder : undefined;
    const removeIconSize = this.size === 'lg' ? 16 : 12;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'is-max-reached': maxReached,
      'has-label': this.hasVisibleLabel(),
      'has-chips': this.chips.length > 0,
      [`variant-${variant}`]: true,
    };

    return (
      <Host class={hostClasses}>
        <label class="label" htmlFor={this.inputId} id={this.labelId} part="label">
          <span class="label-text">
            {this.hasLabelSlot ? null : labelText}
            <slot name="label" onSlotchange={this.onLabelSlotChange} />
          </span>
          {this.required ? (
            <span class="required-mark" aria-hidden="true" part="required-mark">
              *
            </span>
          ) : null}
        </label>

        <div
          class="control"
          part="control"
          role="group"
          aria-label={ariaLabelAttr}
          aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
          onClick={this.handleControlClick}
        >
          {this.chips.map((chip, index) => (
            <span class="chip" part="chip" key={`${chip}-${index}`}>
              <span class="chip-label" part="chip-label">
                {chip}
              </span>
              <button
                type="button"
                class="chip-remove"
                part="chip-remove"
                data-chip-index={index}
                tabIndex={effectivelyDisabled ? -1 : 0}
                disabled={effectivelyDisabled}
                aria-label={`Elimină ${chip}`}
                onClick={this.handleChipRemoveClick(index)}
                onKeyDown={this.handleChipKeyDown(index)}
              >
                <mud-icon class="chip-remove-icon" name="cross-small" size={removeIconSize} />
              </button>
            </span>
          ))}

          <input
            ref={el => (this.nativeInput = el as HTMLInputElement)}
            id={this.inputId}
            class="native"
            part="native"
            type="text"
            value={this.value}
            placeholder={placeholder}
            disabled={effectivelyDisabled || maxReached}
            readonly={this.readonly}
            required={this.required}
            aria-label={!this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined}
            aria-describedby={this.describedBy()}
            aria-invalid={this.invalid ? 'true' : null}
            aria-required={this.required ? 'true' : null}
            onInput={this.handleInputInput}
            onKeyDown={this.handleInputKeyDown}
            onPaste={this.handleInputPaste}
            onFocus={this.handleInputFocus}
            onBlur={this.handleInputBlur}
          />
        </div>

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error">
            <mud-icon class="assistive-icon" name="circle-error-filled" size={20} color="icon-danger-default" />
            <span class="assistive-text">{errorText}</span>
          </div>
        ) : this.hasHelperMessage() ? (
          <div class="assistive assistive-helper" id={this.helperId} part="helper">
            <span class="assistive-text">
              {this.hasHelperSlot ? null : helperText}
              <slot name="helper" onSlotchange={this.onHelperSlotChange} />
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
