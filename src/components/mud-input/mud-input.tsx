import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { INPUT_SIZES, INPUT_VARIANTS } from './mud-input.types';
import type { InputChangeDetail, InputSize, InputType, InputVariant } from './mud-input.types';

let inputInstanceCounter = 0;

/**
 * Input — single-line text-entry control.
 *
 * Pattern B (atom-interactive, form-associated): renders its own `<input>`
 * inside shadow DOM. Form participation works via `formAssociated` +
 * `ElementInternals`. The component is the canonical text-input primitive;
 * specialised inputs (date, search, phone, etc.) compose around it.
 *
 * @element mud-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 * @slot icon-start - Leading `mud-icon` rendered inside the input control.
 * @slot icon-end - Trailing `mud-icon` rendered inside the input control.
 */
@Component({
  tag: 'mud-input',
  styleUrl: 'mud-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudInput {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: InputVariant = 'default';

  /**
   * Loading state. When true the control becomes uninteractive and a
   * trailing spinner replaces the `icon-end` slot. The host carries
   * `aria-busy="true"` for assistive technologies.
   * @default false
   */
  @Prop({ reflect: true }) loading: boolean = false;

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: InputSize = 'md';

  /**
   * Native input `type`.
   * @default 'text'
   */
  @Prop({ reflect: true }) type: InputType = 'text';

  /**
   * Disables interactivity. The internal control receives `aria-disabled` and
   * the native `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Marks the field as mandatory. Adds a red asterisk to the label and sets
   * `aria-required` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Renders the field read-only. The control remains focusable and copyable.
   * @default false
   */
  @Prop({ reflect: true }) readonly: boolean = false;

  /**
   * Shows a trailing clear (×) button while the control holds a value. Clearing
   * empties the field, emits `mudInput` + `mudChange`, and returns focus to the
   * input. Suppressed when disabled, read-only, or loading.
   * @default false
   */
  @Prop({ reflect: true }) clearable: boolean = false;

  /**
   * Forces destructive visuals regardless of `variant`. Sets `aria-invalid`.
   * Use together with `errorText` to surface the message.
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Current value of the control. Reflects to the host attribute.
   * @default ''
   */
  @Prop({ mutable: true, reflect: true }) value: string = '';

  /** Form-control `name`. Used during form submission. */
  @Prop() name?: string;

  /** Placeholder shown when the control is empty. */
  @Prop() placeholder?: string;

  /** Accessible label for the clear (×) button. Only used when `clearable` is set. */
  @Prop({ attribute: 'clear-label' }) clearLabel: string = 'Golește câmpul';

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text helper / hint shown below the control. */
  @Prop({ attribute: 'helper-text' }) helperText?: string;

  /**
   * Plain-text error message shown below the control when `invalid` is set.
   * When present it replaces `helperText` and pairs with the error icon.
   */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  /** Native `autocomplete` attribute forwarded to the internal control. */
  @Prop() autocomplete?: string;

  /** Native `maxlength` constraint. */
  @Prop({ attribute: 'maxlength' }) maxLength?: number;

  /** Native `minlength` constraint. */
  @Prop({ attribute: 'minlength' }) minLength?: number;

  /** Native `inputmode` hint forwarded to the internal control. */
  @Prop() inputmode?: string;

  /** Native `pattern` regex forwarded to the internal control. */
  @Prop() pattern?: string;

  /**
   * Accessible name. Mirrors to the internal control's `aria-label` when no
   * visible label is present. Setting `aria-label` directly on the host also
   * works — captured on connect into `resolvedAriaLabel` and stripped to
   * avoid Stencil's attribute-observer / render-loop antipattern.
   */
  @Prop() ariaLabel?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private hasIconStart: boolean = false;
  @State() private hasIconEnd: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudInputElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires on every keystroke. `detail.value` is the current control value. */
  @Event() mudInput!: EventEmitter<InputChangeDetail>;

  /** Fires when the value is committed (typically on `blur` or `Enter`). `detail.value` is the committed value. */
  @Event() mudChange!: EventEmitter<InputChangeDetail>;

  /** Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++inputInstanceCounter;
  private readonly labelId = `mud-input-label-${this.instanceId}`;
  private readonly helperId = `mud-input-helper-${this.instanceId}`;
  private readonly errorId = `mud-input-error-${this.instanceId}`;
  private nativeInput?: HTMLInputElement;
  private initialValue: string = '';

  componentWillLoad() {
    this.captureAriaLabel();
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
    this.syncValidity();
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
    this.syncValidity();
  }

  private syncValidity() {
    if (!this.internals) return;
    const value = this.value ?? '';
    const isMissing = this.required && value.length === 0;
    const flags: ValidityStateFlags = {};
    let message: string | undefined;

    if (isMissing) {
      flags.valueMissing = true;
      message = this.errorText && this.errorText.length > 0 ? this.errorText : 'Acest câmp este obligatoriu.';
    } else if (this.nativeInput) {
      // Mirror native HTML5 constraint validation (pattern / minLength / maxLength / typeMismatch).
      // `validity` is always present in a real browser; the mock DOM used in unit
      // tests omits it, so guard before dereferencing — no native constraint to mirror.
      const nv = this.nativeInput.validity;
      if (nv) {
        if (nv.patternMismatch) flags.patternMismatch = true;
        if (nv.tooShort) flags.tooShort = true;
        if (nv.tooLong) flags.tooLong = true;
        if (nv.typeMismatch) flags.typeMismatch = true;
        if (nv.patternMismatch || nv.tooShort || nv.tooLong || nv.typeMismatch) {
          message = this.errorText && this.errorText.length > 0 ? this.errorText : this.nativeInput.validationMessage;
        }
      }
    }

    const anchor = this.nativeInput ?? undefined;
    if (Object.keys(flags).length > 0) {
      this.internals.setValidity(flags, message, anchor);
    } else {
      this.internals.setValidity({}, undefined, anchor);
    }
  }

  // Validation lives at the @Prop boundary (PRINCIPLES.md §D). Bad enum values
  // warn in dev and fall back to the default instead of throwing.
  @Watch('variant')
  validateVariant(next: InputVariant) {
    if (!INPUT_VARIANTS.includes(next)) {
      console.warn(
        `[mud-input] variant="${String(next)}" is not supported. Supported: ${INPUT_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: InputSize) {
    if (!INPUT_SIZES.includes(next)) {
      console.warn(
        `[mud-input] size="${String(next)}" is not supported. Supported: ${INPUT_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('value')
  handleValueChange(next: string) {
    const value = next ?? '';
    this.internals.setFormValue(value, value);
    this.syncValidity();
  }

  /** Mirrors `disabled` from an ancestor `<fieldset disabled>` without clobbering the consumer-set prop. */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.internals.setFormValue(this.initialValue, this.initialValue);
    this.syncValidity();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      this.value = state;
      this.internals.setFormValue(state, state);
      this.syncValidity();
    }
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };
  private onHelperSlotChange = (ev: Event) => {
    this.hasHelperSlot = this.slotHasContent(ev);
  };
  private onIconStartSlotChange = (ev: Event) => {
    this.hasIconStart = this.slotHasContent(ev);
  };
  private onIconEndSlotChange = (ev: Event) => {
    this.hasIconEnd = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private handleInput = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    this.value = target.value;
    this.mudInput.emit({ value: this.value });
  };

  private handleChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    this.value = target.value;
    this.mudChange.emit({ value: this.value });
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.mudFocus.emit(ev);
  };

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.mudBlur.emit(ev);
  };

  private handleClear = (ev: MouseEvent) => {
    ev.preventDefault();
    if (this.isInert() || this.readonly || this.loading) return;
    this.value = '';
    this.mudInput.emit({ value: '' });
    this.mudChange.emit({ value: '' });
    // Keep editing flow: return focus to the field after clearing.
    this.nativeInput?.focus();
  };

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private resolvedVariant(): InputVariant {
    return this.invalid ? 'destructive' : this.variant;
  }

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  private showClear(): boolean {
    return this.clearable && !this.isInert() && !this.readonly && !this.loading && (this.value ?? '').length > 0;
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

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-loading': this.loading,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'has-label': this.hasVisibleLabel(),
      'has-icon-start': this.hasIconStart,
      'has-icon-end': this.hasIconEnd,
      [`variant-${variant}`]: true,
    };

    return (
      <Host class={hostClasses} aria-busy={this.loading ? 'true' : null}>
        <label class="label" htmlFor={`input-${this.instanceId}`} id={this.labelId} part="label">
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

        <div class="control" part="control">
          <span class="control-icon control-icon-start" aria-hidden={this.hasIconStart ? null : 'true'}>
            <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
          </span>

          <input
            ref={el => (this.nativeInput = el as HTMLInputElement)}
            id={`input-${this.instanceId}`}
            class="native"
            part="native"
            type={this.type}
            name={this.name}
            value={this.value}
            placeholder={this.placeholder}
            disabled={effectivelyDisabled}
            readonly={this.readonly}
            required={this.required}
            autocomplete={this.autocomplete}
            maxLength={this.maxLength}
            minLength={this.minLength}
            inputMode={
              this.inputmode as 'text' | 'search' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal' | 'none' | undefined
            }
            pattern={this.pattern}
            aria-label={ariaLabelAttr}
            aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
            aria-describedby={this.describedBy()}
            aria-invalid={this.invalid ? 'true' : null}
            onInput={this.handleInput}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
          />

          {this.showClear() ? (
            <button
              type="button"
              class="control-clear"
              part="clear"
              aria-label={this.clearLabel}
              tabIndex={-1}
              onMouseDown={ev => ev.preventDefault()}
              onClick={this.handleClear}
            >
              <mud-icon name="cross-large" size={this.size === 'lg' ? 20 : 16} />
            </button>
          ) : null}

          <span class="control-icon control-icon-end" aria-hidden={this.hasIconEnd ? null : 'true'}>
            <slot name="icon-end" onSlotchange={this.onIconEndSlotChange} />
          </span>

          {this.loading ? (
            <span class="control-spinner" part="spinner" aria-hidden="true">
              <mud-spinner size={this.size === 'lg' ? 'sm' : 'xs'} variant="brand" label="" />
            </span>
          ) : null}
        </div>

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error">
            <mud-icon class="assistive-icon" name="circle-error-filled" size={20} color="icon-danger-default" />
            <span class="assistive-text">{errorText}</span>
          </div>
        ) : this.hasHelperMessage() ? (
          <div class="assistive assistive-helper" id={this.helperId} part="helper">
            {variant === 'warning' ? (
              <mud-icon class="assistive-icon" name="warning-filled" size={20} color="icon-warning-default" />
            ) : variant === 'success' ? (
              <mud-icon class="assistive-icon" name="circle-checkmark-filled" size={20} color="icon-positive-default" />
            ) : null}
            <span class="assistive-text">
              {this.hasHelperSlot ? null : helperText}
              <slot name="helper" onSlotchange={this.onHelperSlotChange} />
            </span>
          </div>
        ) : null}
      </Host>
    );
  }
}
