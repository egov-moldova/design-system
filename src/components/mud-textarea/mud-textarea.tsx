import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { TEXTAREA_RESIZE, TEXTAREA_SIZES, TEXTAREA_VARIANTS } from './mud-textarea.types';
import type { TextareaChangeDetail, TextareaResize, TextareaSize, TextareaVariant } from './mud-textarea.types';

let textareaInstanceCounter = 0;

/**
 * Text Area — multi-line text-entry control.
 *
 * Pattern B (atom-interactive, form-associated): renders its own `<textarea>`
 * inside shadow DOM. Form participation works via `formAssociated` +
 * `ElementInternals`. Mirrors the `mud-input` contract for label, helper,
 * error and variant treatment, and adds a vertical resize handle plus an
 * optional character counter.
 *
 * @element mud-textarea
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 */
@Component({
  tag: 'mud-textarea',
  styleUrl: 'mud-textarea.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudTextarea {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: TextareaVariant = 'default';

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: TextareaSize = 'md';

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
   * User resize affordance. `'vertical'` lets the user drag the bottom-right
   * grip to grow the control downward; `'none'` locks the height to `rows`.
   * @default 'vertical'
   */
  @Prop({ reflect: true }) resize: TextareaResize = 'vertical';

  /**
   * Current value of the control. Reflects to the host attribute.
   * @default ''
   */
  @Prop({ mutable: true }) value: string = '';

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

  /**
   * Minimum visible rows for the native control. Drives the initial height
   * floor before the user resizes vertically.
   * @default 4
   */
  @Prop() rows: number = 4;

  /**
   * Maximum character length. When set, a character counter renders in the
   * bottom-right corner unless `showCounter` is explicitly `false`.
   */
  @Prop({ attribute: 'maxlength' }) maxLength?: number;

  /**
   * Force the character counter to show or hide. When `maxLength` is set the
   * counter auto-shows; pass `false` to suppress it. Without `maxLength` the
   * counter is hidden regardless.
   * @default true
   */
  @Prop({ attribute: 'show-counter' }) showCounter: boolean = true;

  /**
   * Accessible name. Mirrors to the internal control's `aria-label` when no
   * visible label is present. Captured into `resolvedAriaLabel` on mount and
   * the host attribute is stripped to avoid Stencil's auto-reflection loop.
   */
  @Prop() ariaLabel?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudTextareaElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires on every keystroke. `detail.value` is the current control value. */
  @Event() mudInput!: EventEmitter<TextareaChangeDetail>;

  /** Fires when the value is committed (typically on `blur`). `detail.value` is the committed value. */
  @Event() mudChange!: EventEmitter<TextareaChangeDetail>;

  /** Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++textareaInstanceCounter;
  private readonly labelId = `mud-textarea-label-${this.instanceId}`;
  private readonly helperId = `mud-textarea-helper-${this.instanceId}`;
  private readonly errorId = `mud-textarea-error-${this.instanceId}`;
  private readonly counterId = `mud-textarea-counter-${this.instanceId}`;
  private initialValue: string = '';
  private nativeEl?: HTMLTextAreaElement;

  componentWillLoad() {
    this.captureAriaLabel();
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
    this.syncValidity();
  }

  /**
   * Stencil auto-reflects `@Prop()` values back onto the host attribute. For
   * `aria-label` that creates an observer loop (host attr → prop → host attr).
   * Capture the consumer-provided value into a state field, then strip the
   * attribute so the loop never fires.
   */
  private captureAriaLabel() {
    const attr = this.host.getAttribute('aria-label');
    if (attr) {
      this.resolvedAriaLabel = attr;
      this.host.removeAttribute('aria-label');
    } else if (this.ariaLabel) {
      this.resolvedAriaLabel = this.ariaLabel;
    }
  }

  /**
   * Reflects required + value into `ElementInternals` so the host participates
   * in native form validation. Anchored on the native textarea so a11y focus
   * lands on the visible control.
   */
  private syncValidity() {
    if (!this.internals) return;
    const value = this.value ?? '';
    if (this.required && value.length === 0) {
      this.internals.setValidity({ valueMissing: true }, 'Completați acest câmp.', this.nativeEl);
      return;
    }
    this.internals.setValidity({});
  }

  // Validation lives at the @Prop boundary (PRINCIPLES.md §D). Bad enum values
  // warn in dev and fall back to the default instead of throwing.
  @Watch('variant')
  validateVariant(next: TextareaVariant) {
    if (!TEXTAREA_VARIANTS.includes(next)) {
      console.warn(
        `[mud-textarea] variant="${String(next)}" is not supported. Supported: ${TEXTAREA_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: TextareaSize) {
    if (!TEXTAREA_SIZES.includes(next)) {
      console.warn(
        `[mud-textarea] size="${String(next)}" is not supported. Supported: ${TEXTAREA_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('resize')
  validateResize(next: TextareaResize) {
    if (!TEXTAREA_RESIZE.includes(next)) {
      console.warn(
        `[mud-textarea] resize="${String(next)}" is not supported. Supported: ${TEXTAREA_RESIZE.join(
          ', ',
        )}. Falling back to "vertical".`,
      );
      this.resize = 'vertical';
    }
  }

  @Watch('value')
  handleValueChange(next: string) {
    const value = next ?? '';
    this.internals.setFormValue(value, value);
    this.syncValidity();
  }

  @Watch('required')
  handleRequiredChange() {
    this.syncValidity();
  }

  @Watch('ariaLabel')
  handleAriaLabelChange(next: string | undefined) {
    // Guarded against the strip-from-host self-trigger (next will be null/empty
    // when captureAriaLabel() removes the attribute).
    if (next && next.length > 0) {
      this.resolvedAriaLabel = next;
    }
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

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private handleInput = (ev: Event) => {
    const target = ev.target as HTMLTextAreaElement;
    this.value = target.value;
    this.mudInput.emit({ value: this.value });
  };

  private handleChange = (ev: Event) => {
    const target = ev.target as HTMLTextAreaElement;
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

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private resolvedVariant(): TextareaVariant {
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

  private hasCharacterCounter(): boolean {
    return this.showCounter && typeof this.maxLength === 'number' && this.maxLength > 0;
  }

  private isCounterOverLimit(): boolean {
    return typeof this.maxLength === 'number' && (this.value?.length ?? 0) > this.maxLength;
  }

  private describedBy(): string | undefined {
    const ids: string[] = [];
    if (this.hasErrorMessage()) ids.push(this.errorId);
    else if (this.hasHelperMessage()) ids.push(this.helperId);
    if (this.hasCharacterCounter()) ids.push(this.counterId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined;
    const counterCurrent = (this.value ?? '').length;
    const counterOver = this.isCounterOverLimit();

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'has-label': this.hasVisibleLabel(),
      'has-counter': this.hasCharacterCounter(),
      'counter-over': counterOver,
      [`variant-${variant}`]: true,
      [`resize-${this.resize}`]: true,
    };

    return (
      <Host class={hostClasses}>
        <label class="label" htmlFor={`textarea-${this.instanceId}`} id={this.labelId} part="label">
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
          <textarea
            ref={el => (this.nativeEl = el)}
            id={`textarea-${this.instanceId}`}
            class="native"
            part="native"
            name={this.name}
            placeholder={this.placeholder}
            disabled={effectivelyDisabled}
            readonly={this.readonly}
            required={this.required}
            rows={this.rows}
            maxLength={this.maxLength}
            aria-label={ariaLabelAttr}
            aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
            aria-describedby={this.describedBy()}
            aria-invalid={this.invalid ? 'true' : null}
            onInput={this.handleInput}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
          >
            {this.value}
          </textarea>

          {this.resize !== 'none' ? (
            <span class="resize-grip" part="resize-grip" aria-hidden="true">
              <mud-icon name="resize" size={24} />
            </span>
          ) : null}
        </div>

        {this.hasErrorMessage() || this.hasHelperMessage() || this.hasCharacterCounter() ? (
          <div class="captions" part="captions">
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

            {this.hasCharacterCounter() ? (
              <span class="counter" id={this.counterId} part="counter" aria-live="polite">
                {counterCurrent} / {this.maxLength}
              </span>
            ) : null}
          </div>
        ) : null}
      </Host>
    );
  }
}
