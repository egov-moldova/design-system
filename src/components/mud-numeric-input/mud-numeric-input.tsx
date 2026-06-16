import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { NUMERIC_INPUT_SIZES, NUMERIC_INPUT_VARIANTS } from './mud-numeric-input.types';
import type {
  NumericInputChangeDetail,
  NumericInputErrorDetail,
  NumericInputSize,
  NumericInputStepDetail,
  NumericInputStepDirection,
  NumericInputVariant,
} from './mud-numeric-input.types';

let numericInputInstanceCounter = 0;

/**
 * Numeric Input — numeric-entry control with stacked step buttons.
 *
 * Pattern B (atom-interactive, form-associated): renders its own `<input>`
 * inside shadow DOM and pairs it with a trailing stepper stack (chevron-up
 * over chevron-bottom). Shares the visual primitives of `mud-input` (border,
 * focus ring, label, helper / error, sizes, states) and adds a
 * `--numeric-input-stepper-*` token namespace for the increment / decrement
 * affordance.
 *
 * Why `<input type="text" inputmode="decimal">` instead of
 * `<input type="number">`: native `type="number"` mixes parsing, locale, and
 * UI affordances in ways that interact poorly with `precision` rounding and
 * `min`/`max` clamping. The component delegates parsing + clamping to its own
 * logic and exposes `inputmode="decimal"` so mobile devices still surface the
 * numeric keypad.
 *
 * @element mud-numeric-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 * @slot icon-start - Leading icon (a `mud-icon`, icon-leading variant) rendered before the prefix / value. Sized to the square icon box.
 * @slot prefix - Leading unit / currency symbol rendered before the value (e.g. `€`, `$`, `MDL`). Shares the suffix's text styling — auto-width rather than the fixed icon box, so multi-character symbols don't clip. Distinct from `icon-start`, mirroring the Figma master's separate `prefix` and `leadingIcon` properties.
 * @slot suffix - Trailing unit text rendered after the value (e.g. `lei`, `kg`). Sits before the stepper stack.
 */
@Component({
  tag: 'mud-numeric-input',
  styleUrl: 'mud-numeric-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudNumericInput {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * Numeric inputs ship 3 styles per Figma (no Warning) — invalid numeric
   * values are typically out-of-range (Destructive) or confirmed-valid
   * (Success); there is no in-between state worth a Warning tone.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: NumericInputVariant = 'default';

  /**
   * Loading state. When true the control becomes uninteractive and a
   * brand `mud-spinner` replaces the trailing stepper stack. The host
   * carries `aria-busy="true"` for assistive technologies.
   * @default false
   */
  @Prop({ reflect: true }) loading: boolean = false;

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: NumericInputSize = 'md';

  /**
   * Disables interactivity. The internal control receives `aria-disabled` and
   * the native `disabled` attribute. Stepper buttons are also disabled.
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
   * Renders the field read-only. The control remains focusable; steppers are
   * suppressed.
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
   * Show the trailing stacked stepper (chevron-up / chevron-bottom) buttons.
   * Off by default per Figma master, which renders the canonical numeric input
   * without steppers (suffix-only). Opt in via `show-steppers` for compact
   * quantity / rating fields where stepper affordance is valuable.
   * @default false
   */
  @Prop({ reflect: true, attribute: 'show-steppers' }) showSteppers: boolean = false;

  /**
   * Current numeric value. `undefined` represents an empty field. Reflects to
   * the host attribute when set.
   */
  @Prop({ mutable: true, reflect: true }) value?: number;

  /** Inclusive lower bound. Stepper-down disables at this value; manual entries below clamp on blur. */
  @Prop() min?: number;

  /** Inclusive upper bound. Stepper-up disables at this value; manual entries above clamp on blur. */
  @Prop() max?: number;

  /**
   * Increment / decrement amount applied by the stepper buttons and arrow keys.
   * @default 1
   */
  @Prop() step: number = 1;

  /**
   * Decimal precision applied on blur (number of decimal places). When unset
   * the value is preserved as typed (subject to clamping).
   */
  @Prop() precision?: number;

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
   * Accessible label for the increment button. Defaults to Romanian "Crește"
   * per the institutional voice.
   * @default 'Crește'
   */
  @Prop({ attribute: 'increment-label' }) incrementLabel: string = 'Crește';

  /**
   * Accessible label for the decrement button. Defaults to Romanian "Scade".
   * @default 'Scade'
   */
  @Prop({ attribute: 'decrement-label' }) decrementLabel: string = 'Scade';

  /**
   * Accessible name. Mirrors to the internal control's `aria-label` when no
   * visible label is present. Setting `aria-label` directly on the host also
   * works — captured on connect into `resolvedAriaLabel` and stripped to
   * avoid Stencil's attribute-observer / render-loop antipattern.
   */
  @Prop() ariaLabel?: string;

  /**
   * Human-readable value announcement for screen readers (e.g. `"5 lei"`).
   * Maps to the native `aria-valuetext` on the spinbutton. Same capture-and-strip
   * pattern as `ariaLabel`.
   */
  @Prop() ariaValuetext?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private hasIconStart: boolean = false;
  @State() private hasPrefix: boolean = false;
  @State() private hasSuffix: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private displayValue: string = '';
  @State() private resolvedAriaLabel?: string;
  @State() private resolvedAriaValuetext?: string;

  @Element() host!: HTMLMudNumericInputElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires on every keystroke. `detail.value` is the parsed current value or `null`. */
  @Event() mudInput!: EventEmitter<NumericInputChangeDetail>;

  /** Fires when the value is committed (blur / Enter / stepper). `detail.value` is the clamped, precision-rounded value or `null`. */
  @Event() mudChange!: EventEmitter<NumericInputChangeDetail>;

  /** Fires when a stepper button (or arrow key) bumps the value. */
  @Event() mudStep!: EventEmitter<NumericInputStepDetail>;

  /** Fires when validation rejects the current input (out-of-range, NaN). */
  @Event() mudError!: EventEmitter<NumericInputErrorDetail>;

  /** Fires when the internal control gains focus. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++numericInputInstanceCounter;
  private readonly labelId = `mud-numeric-input-label-${this.instanceId}`;
  private readonly helperId = `mud-numeric-input-helper-${this.instanceId}`;
  private readonly errorId = `mud-numeric-input-error-${this.instanceId}`;
  private initialValue: number | undefined;
  private nativeEl?: HTMLInputElement;

  componentWillLoad() {
    this.captureAriaAttrs();
    this.initialValue = this.value;
    this.displayValue = this.formatForDisplay(this.value);
    this.syncFormValue(this.value);
    this.syncValidity();
  }

  private captureAriaAttrs() {
    const labelAttr = this.host.getAttribute('aria-label');
    if (labelAttr && labelAttr.length > 0) {
      this.resolvedAriaLabel = labelAttr;
      this.host.removeAttribute('aria-label');
    } else if (this.ariaLabel && this.ariaLabel.length > 0) {
      this.resolvedAriaLabel = this.ariaLabel;
    }
    const valueTextAttr = this.host.getAttribute('aria-valuetext');
    if (valueTextAttr && valueTextAttr.length > 0) {
      this.resolvedAriaValuetext = valueTextAttr;
      this.host.removeAttribute('aria-valuetext');
    } else if (this.ariaValuetext && this.ariaValuetext.length > 0) {
      this.resolvedAriaValuetext = this.ariaValuetext;
    }
  }

  @Watch('ariaLabel')
  syncAriaLabelProp(next?: string) {
    // Only override resolvedAriaLabel when the prop is actually set —
    // captureAriaAttrs strips the attribute, which would otherwise null this out.
    if (next && next.length > 0) this.resolvedAriaLabel = next;
  }

  @Watch('ariaValuetext')
  syncAriaValuetextProp(next?: string) {
    if (next && next.length > 0) this.resolvedAriaValuetext = next;
  }

  @Watch('required')
  onRequiredChange() {
    this.syncValidity();
  }

  @Watch('min')
  onMinChange() {
    this.syncValidity();
  }

  @Watch('max')
  onMaxChange() {
    this.syncValidity();
  }

  private syncValidity() {
    if (!this.internals) return;
    const flags: ValidityStateFlags = {};
    let message: string | undefined;
    const isEmpty = this.value === undefined || this.value === null || !Number.isFinite(this.value);

    if (this.required && isEmpty) {
      flags.valueMissing = true;
      message = this.errorText && this.errorText.length > 0 ? this.errorText : 'Acest câmp este obligatoriu.';
    } else if (!isEmpty) {
      const v = this.value as number;
      if (this.min !== undefined && v < this.min) {
        flags.rangeUnderflow = true;
        message = this.errorText && this.errorText.length > 0 ? this.errorText : `Valoarea minimă este ${this.min}.`;
      } else if (this.max !== undefined && v > this.max) {
        flags.rangeOverflow = true;
        message = this.errorText && this.errorText.length > 0 ? this.errorText : `Valoarea maximă este ${this.max}.`;
      }
    }

    const anchor = this.nativeEl ?? undefined;
    if (Object.keys(flags).length > 0) {
      this.internals.setValidity(flags, message, anchor);
    } else {
      this.internals.setValidity({}, undefined, anchor);
    }
  }

  // Validation lives at the @Prop boundary (PRINCIPLES.md §D). Bad enum values
  // warn in dev and fall back to the default instead of throwing.
  @Watch('variant')
  validateVariant(next: NumericInputVariant) {
    if (!NUMERIC_INPUT_VARIANTS.includes(next)) {
      console.warn(
        `[mud-numeric-input] variant="${String(next)}" is not supported. Supported: ${NUMERIC_INPUT_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: NumericInputSize) {
    if (!NUMERIC_INPUT_SIZES.includes(next)) {
      console.warn(
        `[mud-numeric-input] size="${String(next)}" is not supported. Supported: ${NUMERIC_INPUT_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('value')
  handleValueChange(next: number | undefined) {
    this.syncFormValue(next);
    this.syncValidity();
    // Keep the visible field in sync when the prop is changed externally and
    // the user isn't actively editing.
    if (!this.isFocused) {
      this.displayValue = this.formatForDisplay(next);
    }
  }

  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.displayValue = this.formatForDisplay(this.initialValue);
    this.syncFormValue(this.initialValue);
    this.syncValidity();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      const parsed = this.parseRaw(state);
      this.value = parsed ?? undefined;
      this.displayValue = state;
      this.syncFormValue(this.value);
      this.syncValidity();
    }
  }

  private syncFormValue(value: number | undefined): void {
    const serialized = value === undefined ? '' : String(value);
    this.internals.setFormValue(serialized, serialized);
  }

  /**
   * Parse a raw string entry into a number. Allows leading `-`, a single
   * decimal separator (`.` or `,` — comma is accepted for Romanian locale and
   * normalised to a dot before parsing), trims surrounding whitespace, and
   * rejects everything else.
   */
  private parseRaw(raw: string): number | null {
    const trimmed = (raw ?? '').trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.') return null;
    // Normalise Romanian decimal comma to dot.
    const normalised = trimmed.replace(',', '.');
    if (!/^-?\d*\.?\d*$/.test(normalised)) return null;
    const num = Number(normalised);
    return Number.isFinite(num) ? num : null;
  }

  /** Clamp a number to `[min, max]`. */
  private clamp(value: number): number {
    let v = value;
    if (this.min !== undefined && v < this.min) v = this.min;
    if (this.max !== undefined && v > this.max) v = this.max;
    return v;
  }

  /** Round to the configured `precision` decimal places (no-op when unset). */
  private round(value: number): number {
    if (this.precision === undefined) return value;
    const factor = Math.pow(10, Math.max(0, Math.floor(this.precision)));
    return Math.round(value * factor) / factor;
  }

  /** Apply both clamp + round in one step. */
  private commit(value: number): number {
    return this.round(this.clamp(value));
  }

  /** Render a number for display (precision aware). */
  private formatForDisplay(value: number | undefined): string {
    if (value === undefined || value === null || !Number.isFinite(value)) return '';
    if (this.precision !== undefined) {
      const digits = Math.max(0, Math.floor(this.precision));
      return value.toFixed(digits);
    }
    return String(value);
  }

  private canStep(direction: NumericInputStepDirection): boolean {
    if (this.isInert() || this.readonly || this.loading) return false;
    const current = this.value ?? 0;
    const next = direction === 'up' ? current + this.step : current - this.step;
    if (direction === 'up' && this.max !== undefined && current >= this.max) return false;
    if (direction === 'down' && this.min !== undefined && current <= this.min) return false;
    // Disallow the case where stepping would only move the value further past
    // the bound it already exceeds.
    if (direction === 'up' && this.max !== undefined && next > this.max && current >= this.max) return false;
    if (direction === 'down' && this.min !== undefined && next < this.min && current <= this.min) return false;
    return true;
  }

  private performStep(direction: NumericInputStepDirection): void {
    if (!this.canStep(direction)) return;
    const base = this.value ?? this.startValueForStep();
    const raw = direction === 'up' ? base + this.step : base - this.step;
    const next = this.commit(raw);
    if (next === this.value) return;
    this.value = next;
    this.displayValue = this.formatForDisplay(next);
    this.mudStep.emit({ direction, value: next });
    this.mudInput.emit({ value: next });
    this.mudChange.emit({ value: next });
  }

  /**
   * Choose the seed value when the field is empty and the user presses a
   * stepper or arrow key: snap into `[min, max]` when defined, else 0.
   */
  private startValueForStep(): number {
    if (this.min !== undefined && this.max !== undefined) return this.clamp(0);
    if (this.min !== undefined) return this.min;
    if (this.max !== undefined) return Math.min(0, this.max);
    return 0;
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
  private onPrefixSlotChange = (ev: Event) => {
    this.hasPrefix = this.slotHasContent(ev);
  };
  private onSuffixSlotChange = (ev: Event) => {
    this.hasSuffix = this.slotHasContent(ev);
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
    const raw = target.value;
    this.displayValue = raw;
    const parsed = this.parseRaw(raw);
    if (parsed === null) {
      // Empty / partial entry (e.g. "-" or ".") — emit current parsed state
      // (null) but don't clear the @Prop so the user's keystroke survives.
      this.value = raw.trim() === '' ? undefined : this.value;
      this.mudInput.emit({ value: null });
      return;
    }
    // Surface out-of-range as a soft error event but DO NOT clamp during
    // typing — clamping mid-entry would yank the caret and confuse the user.
    if (this.min !== undefined && parsed < this.min) {
      this.mudError.emit({ reason: 'out-of-range', rawValue: raw });
    } else if (this.max !== undefined && parsed > this.max) {
      this.mudError.emit({ reason: 'out-of-range', rawValue: raw });
    }
    this.value = parsed;
    this.mudInput.emit({ value: parsed });
  };

  private handleChange = () => {
    // Native `change` fires after the user commits (blur / Enter on most
    // engines). Clamp + round here, then publish.
    this.commitFromDisplay();
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.mudFocus.emit(ev);
  };

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.commitFromDisplay();
    this.mudBlur.emit(ev);
  };

  private commitFromDisplay(): void {
    const parsed = this.parseRaw(this.displayValue);
    if (parsed === null) {
      // The field is empty or contains an unparseable string.
      if (this.displayValue.trim() === '') {
        this.value = undefined;
        this.displayValue = '';
        this.mudChange.emit({ value: null });
      } else {
        // Non-numeric residue (rare with our input mask) — surface an error
        // and reset the display to the last committed value.
        this.mudError.emit({ reason: 'not-a-number', rawValue: this.displayValue });
        this.displayValue = this.formatForDisplay(this.value);
      }
      return;
    }
    const committed = this.commit(parsed);
    this.value = committed;
    this.displayValue = this.formatForDisplay(committed);
    this.mudChange.emit({ value: committed });
  }

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (this.isInert() || this.readonly || this.loading) return;
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.performStep('up');
      return;
    }
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.performStep('down');
      return;
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this.commitFromDisplay();
    }
  };

  private handleStepClick = (direction: NumericInputStepDirection) => (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.performStep(direction);
    // Re-focus the input so subsequent typing / arrow keys keep working.
    requestAnimationFrame(() => this.nativeEl?.focus());
  };

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private resolvedVariant(): NumericInputVariant {
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

  private showSteppersStack(): boolean {
    return this.showSteppers && !this.isInert() && !this.readonly && !this.loading;
  }

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined;
    const iconSize = this.size === 'lg' ? 24 : 20;
    const stepperIconSize = this.size === 'lg' ? 20 : 16;
    const canStepUp = this.canStep('up');
    const canStepDown = this.canStep('down');
    const showSteppers = this.showSteppersStack();

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-loading': this.loading,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled && !this.readonly,
      'has-label': this.hasVisibleLabel(),
      'has-icon-start': this.hasIconStart,
      'has-prefix': this.hasPrefix,
      'has-suffix': this.hasSuffix,
      'has-steppers': showSteppers,
      [`variant-${variant}`]: true,
    };

    const ariaValueNow = this.value !== undefined && Number.isFinite(this.value) ? String(this.value) : undefined;

    return (
      <Host class={hostClasses} aria-busy={this.loading ? 'true' : null}>
        <label class="label" htmlFor={`numeric-input-${this.instanceId}`} id={this.labelId} part="label">
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

          <span class="prefix" part="prefix" aria-hidden={this.hasPrefix ? null : 'true'}>
            <slot name="prefix" onSlotchange={this.onPrefixSlotChange} />
          </span>

          <input
            id={`numeric-input-${this.instanceId}`}
            ref={el => (this.nativeEl = el)}
            class="native"
            part="native"
            type="text"
            role="spinbutton"
            name={this.name}
            value={this.displayValue}
            placeholder={this.placeholder}
            disabled={effectivelyDisabled}
            readonly={this.readonly}
            required={this.required}
            autocomplete="off"
            inputMode="decimal"
            spellcheck={false}
            aria-label={ariaLabelAttr}
            aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
            aria-describedby={this.describedBy()}
            aria-invalid={this.invalid ? 'true' : null}
            aria-valuenow={ariaValueNow}
            aria-valuemin={this.min !== undefined ? String(this.min) : undefined}
            aria-valuemax={this.max !== undefined ? String(this.max) : undefined}
            aria-valuetext={this.resolvedAriaValuetext}
            onInput={this.handleInput}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            onKeyDown={this.handleKeyDown}
          />

          <span class="suffix" part="suffix" aria-hidden={this.hasSuffix ? null : 'true'}>
            <slot name="suffix" onSlotchange={this.onSuffixSlotChange} />
          </span>

          {showSteppers ? (
            <div class="stepper" part="stepper" aria-hidden="true">
              <button
                type="button"
                class="stepper-button stepper-button-up"
                part="stepper-up"
                tabindex={-1}
                aria-label={this.incrementLabel}
                disabled={!canStepUp}
                onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
                onClick={this.handleStepClick('up')}
              >
                <mud-icon name="chevron-top" size={stepperIconSize} />
              </button>
              <button
                type="button"
                class="stepper-button stepper-button-down"
                part="stepper-down"
                tabindex={-1}
                aria-label={this.decrementLabel}
                disabled={!canStepDown}
                onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
                onClick={this.handleStepClick('down')}
              >
                <mud-icon name="chevron-bottom" size={stepperIconSize} />
              </button>
            </div>
          ) : null}

          {this.loading ? (
            <span class="control-spinner" part="spinner" aria-hidden="true">
              <mud-spinner size={this.size === 'lg' ? 'sm' : 'xs'} variant="brand" label="" />
            </span>
          ) : null}
        </div>

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error">
            <mud-icon class="assistive-icon" name="circle-error-filled" size={iconSize} color="icon-danger-default" />
            <span class="assistive-text">{errorText}</span>
          </div>
        ) : this.hasHelperMessage() ? (
          <div class="assistive assistive-helper" id={this.helperId} part="helper">
            {variant === 'success' ? (
              <mud-icon
                class="assistive-icon"
                name="circle-checkmark-filled"
                size={iconSize}
                color="icon-positive-default"
              />
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
