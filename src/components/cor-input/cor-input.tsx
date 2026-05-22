import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { INPUT_SIZES, INPUT_VARIANTS } from './cor-input.types';
import type { InputChangeDetail, InputSize, InputType, InputVariant } from './cor-input.types';

let inputInstanceCounter = 0;

/**
 * Input — single-line text-entry control.
 *
 * Pattern B (atom-interactive, form-associated): renders its own `<input>`
 * inside shadow DOM. Form participation works via `formAssociated` +
 * `ElementInternals`. The component is the canonical text-input primitive;
 * specialised inputs (date, search, phone, etc.) compose around it.
 *
 * @element cor-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 * @slot icon-start - Leading `cor-icon` rendered inside the input control.
 * @slot icon-end - Trailing `cor-icon` rendered inside the input control.
 */
@Component({
  tag: 'cor-input',
  styleUrl: 'cor-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class CorInput {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: InputVariant = 'default';

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
   * visible label is present.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private hasIconStart: boolean = false;
  @State() private hasIconEnd: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;

  @Element() host!: HTMLCorInputElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires on every keystroke. `detail.value` is the current control value. */
  @Event() corInput!: EventEmitter<InputChangeDetail>;

  /** Fires when the value is committed (typically on `blur` or `Enter`). `detail.value` is the committed value. */
  @Event() corChange!: EventEmitter<InputChangeDetail>;

  /** Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() corFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() corBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++inputInstanceCounter;
  private readonly labelId = `cor-input-label-${this.instanceId}`;
  private readonly helperId = `cor-input-helper-${this.instanceId}`;
  private readonly errorId = `cor-input-error-${this.instanceId}`;
  private initialValue: string = '';

  componentWillLoad() {
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
  }

  // Validation lives at the @Prop boundary (PRINCIPLES.md §D). Bad enum values
  // warn in dev and fall back to the default instead of throwing.
  @Watch('variant')
  validateVariant(next: InputVariant) {
    if (!INPUT_VARIANTS.includes(next)) {
      console.warn(
        `[cor-input] variant="${String(next)}" is not supported. Supported: ${INPUT_VARIANTS.join(
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
        `[cor-input] size="${String(next)}" is not supported. Supported: ${INPUT_SIZES.join(
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
  }

  /** Mirrors `disabled` from an ancestor `<fieldset disabled>` without clobbering the consumer-set prop. */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.internals.setFormValue(this.initialValue, this.initialValue);
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      this.value = state;
      this.internals.setFormValue(state, state);
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
    this.corInput.emit({ value: this.value });
  };

  private handleChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    this.value = target.value;
    this.corChange.emit({ value: this.value });
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.corFocus.emit(ev);
  };

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.corBlur.emit(ev);
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
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.ariaLabel : undefined;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'has-label': this.hasVisibleLabel(),
      'has-icon-start': this.hasIconStart,
      'has-icon-end': this.hasIconEnd,
      [`variant-${variant}`]: true,
    };

    return (
      <Host class={hostClasses}>
        <label class="label" htmlFor={`input-${this.instanceId}`} id={this.labelId} part="label">
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

        <div class="control" part="control">
          <span class="control-icon control-icon-start" aria-hidden={this.hasIconStart ? null : 'true'}>
            <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
          </span>

          <input
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
            aria-required={this.required ? 'true' : null}
            aria-disabled={effectivelyDisabled ? 'true' : null}
            onInput={this.handleInput}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
          />

          <span class="control-icon control-icon-end" aria-hidden={this.hasIconEnd ? null : 'true'}>
            <slot name="icon-end" onSlotchange={this.onIconEndSlotChange} />
          </span>
        </div>

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
      </Host>
    );
  }
}
