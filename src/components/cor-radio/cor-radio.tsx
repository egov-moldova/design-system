import { AttachInternals, Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { RADIO_SIZES } from './cor-radio.types';
import type { RadioChangeDetail, RadioSize } from './cor-radio.types';

let radioInstanceCounter = 0;

/**
 * Radio — single-select form input atom.
 *
 * Pattern B (atom-interactive, form-associated): renders its own
 * `<input type="radio">` inside shadow DOM and paints the visual circle
 * with CSS. Form participation works via `formAssociated` +
 * `ElementInternals.setFormValue`. The component is the standalone radio
 * primitive; a future `cor-radio-group` molecule will manage roving focus
 * and `name`-based exclusivity across siblings.
 *
 * @element cor-radio
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot supporting-text - Rich supporting text, replaces the `supportingText` prop when present.
 */
@Component({
  tag: 'cor-radio',
  styleUrl: 'cor-radio.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class CorRadio {
  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: RadioSize = 'md';

  /**
   * Whether the radio is currently selected.
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) checked: boolean = false;

  /**
   * Disables interactivity. The internal control receives `aria-disabled` and
   * the native `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Maps to Figma's "Error" state — border and selected dot turn red.
   * Sets `aria-invalid` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Marks the field as mandatory. Sets `aria-required` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Renders the control read-only. It remains focusable but cannot be toggled.
   * @default false
   */
  @Prop({ reflect: true }) readonly: boolean = false;

  /** Form-control `name`. Used during form submission and for grouping radios. */
  @Prop() name?: string;

  /** Value submitted with the form when this radio is checked. */
  @Prop() value?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text supporting text shown below the label. Use the `supporting-text` slot for richer content. */
  @Prop({ attribute: 'supporting-text' }) supportingText?: string;

  /**
   * Accessible name. Mirrors to the internal control's `aria-label` when no
   * visible label is present.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /** ID of the element labelling the radio. Used when label content lives outside the component. */
  @Prop({ attribute: 'aria-labelledby' }) ariaLabelledby?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasSupportingTextSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;

  @Element() host!: HTMLCorRadioElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires whenever the checked state changes. `detail.checked` is the new state. */
  @Event() corChange!: EventEmitter<RadioChangeDetail>;

  /** Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() corFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() corBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++radioInstanceCounter;
  private readonly inputId = `cor-radio-input-${this.instanceId}`;
  private readonly labelId = `cor-radio-label-${this.instanceId}`;
  private readonly supportingId = `cor-radio-supporting-${this.instanceId}`;
  private initialChecked: boolean = false;

  componentWillLoad() {
    this.initialChecked = this.checked;
    this.syncFormValue();
  }

  // Validation lives at the @Prop boundary (PRINCIPLES.md §D). Bad enum values
  // warn in dev and fall back to the default instead of throwing.
  @Watch('size')
  validateSize(next: RadioSize) {
    if (!RADIO_SIZES.includes(next)) {
      console.warn(
        `[cor-radio] size="${String(next)}" is not supported. Supported: ${RADIO_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('checked')
  handleCheckedChange() {
    this.syncFormValue();
  }

  @Watch('value')
  handleValueChange() {
    this.syncFormValue();
  }

  /** Mirrors `disabled` from an ancestor `<fieldset disabled>` without clobbering the consumer-set prop. */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.checked = this.initialChecked;
    this.syncFormValue();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      // setFormValue stores '' when unchecked, value (or 'on') when checked.
      this.checked = state.length > 0;
      this.syncFormValue();
    }
  }

  private syncFormValue() {
    // Native radios only submit when checked. Mirror that contract: pass
    // `null` to `setFormValue` so the form excludes this control entirely
    // when unchecked, instead of contributing an empty string under our
    // `name`.
    if (this.checked) {
      const submittedValue = this.value ?? 'on';
      this.internals.setFormValue(submittedValue, submittedValue);
    } else {
      this.internals.setFormValue(null, null);
    }
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };

  private onSupportingTextSlotChange = (ev: Event) => {
    this.hasSupportingTextSlot = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private handleChange = (ev: Event) => {
    if (this.isInert() || this.readonly) {
      ev.preventDefault();
      return;
    }
    const target = ev.target as HTMLInputElement;
    this.checked = target.checked;
    this.corChange.emit({ checked: this.checked, value: this.value });
  };

  private handleClick = (ev: MouseEvent) => {
    // Read-only swallows the toggle but does not stop focus.
    if (this.readonly) {
      ev.preventDefault();
    }
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

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  private hasVisibleSupportingText(): boolean {
    return Boolean(this.supportingText && this.supportingText.trim().length > 0) || this.hasSupportingTextSlot;
  }

  render() {
    const effectivelyDisabled = this.isInert();
    const labelText = this.label?.trim() ?? '';
    const supportingText = this.supportingText?.trim() ?? '';
    const hasLabel = this.hasVisibleLabel();
    const hasSupporting = this.hasVisibleSupportingText();
    const ariaLabelAttr = !hasLabel ? this.ariaLabel : undefined;
    const ariaLabelledbyAttr = hasLabel ? this.labelId : this.ariaLabelledby;

    const describedByIds: string[] = [];
    if (hasSupporting) describedByIds.push(this.supportingId);
    const ariaDescribedBy = describedByIds.length > 0 ? describedByIds.join(' ') : undefined;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-checked': this.checked,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'has-label': hasLabel,
      'has-supporting-text': hasSupporting,
    };

    return (
      <Host class={hostClasses}>
        <label class="layout" htmlFor={this.inputId} part="layout">
          <span class="control" part="control">
            <span class="touch-target" aria-hidden="true" />
            <span class="visual" part="visual">
              <span class="dot" part="dot" aria-hidden="true" />
            </span>
            <input
              id={this.inputId}
              class="native"
              part="native"
              type="radio"
              name={this.name}
              value={this.value}
              checked={this.checked}
              disabled={effectivelyDisabled}
              required={this.required}
              aria-label={ariaLabelAttr}
              aria-labelledby={ariaLabelledbyAttr}
              aria-describedby={ariaDescribedBy}
              aria-invalid={this.invalid ? 'true' : null}
              aria-required={this.required ? 'true' : null}
              aria-readonly={this.readonly ? 'true' : null}
              aria-disabled={effectivelyDisabled ? 'true' : null}
              onChange={this.handleChange}
              onClick={this.handleClick}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
            />
          </span>

          {hasLabel || hasSupporting ? (
            <span class="text" part="text">
              <span class="label-text" id={this.labelId} part="label">
                <slot name="label" onSlotchange={this.onLabelSlotChange}>
                  {labelText}
                </slot>
              </span>
              {hasSupporting ? (
                <span class="supporting-text" id={this.supportingId} part="supporting-text">
                  <slot name="supporting-text" onSlotchange={this.onSupportingTextSlotChange}>
                    {supportingText}
                  </slot>
                </span>
              ) : (
                <span class="supporting-text supporting-text--probe" hidden>
                  <slot name="supporting-text" onSlotchange={this.onSupportingTextSlotChange} />
                </span>
              )}
            </span>
          ) : (
            <span class="text" hidden>
              <slot name="label" onSlotchange={this.onLabelSlotChange} />
              <slot name="supporting-text" onSlotchange={this.onSupportingTextSlotChange} />
            </span>
          )}
        </label>
      </Host>
    );
  }
}
