import { Component, Host, Element, Prop, State, Event, EventEmitter, AttachInternals, h } from '@stencil/core';

import { InputSize, InputLabelPosition, InputType } from './cor-input.enums';
import { IconSize } from '../../components/cor-icon/cor-icon.types';
import ICON_NAMES from '../../components/cor-icon/assets/carbon-icon-names.json';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { VALID_HELPER_TEXT_TAGS, VALID_ICON_SLOT_TAGS } from '../shared.constants';

/**
 * Input component with size variants, label positioning, and state management.
 *
 * @element cor-input
 * @slot icon-left - Left icon slot
 * @slot icon-right - Right icon slot
 * @slot helper-text - Helper text content slot (icon and styling handled by component)
 */

@Component({
  tag: 'cor-input',
  styleUrl: 'cor-input.css',
  shadow: true,
  formAssociated: true,
})
export class CorInput {
  /**
   * Size of the input
   * @default lg
   */
  @Prop({ reflect: true }) size: InputSize = InputSize.LG;

  /**
   * Label position (inside or outside)
   * @default inside
   */
  @Prop({ reflect: true }) labelPosition: InputLabelPosition = InputLabelPosition.INSIDE;

  /**
   * Indicates if input is disabled
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) disabled: boolean = false;

  /**
   * Indicates if input is invalid
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Show skeleton loading state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Show separator line between content and right icon
   * @default false
   */
  @Prop({ reflect: true }) showLine: boolean = false;

  /**
   * Show clear button when input has value
   * @default true
   */
  @Prop({ reflect: true }) withClearButton: boolean = true;

  /**
   * Indicates if input is required
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Inline mode - width adjusts to fit visible input content
   * @default false
   */
  @Prop({ reflect: true }) inline: boolean = false;

  /**
   * Info text to show in tooltip when hovering info icon next to label (only for labelPosition="outside")
   * When provided, displays info icon with native browser tooltip
   */
  @Prop({ reflect: true }) labelInfo?: string;

  /**
   * Input type
   * @default text
   */
  @Prop({ reflect: true }) type: InputType = InputType.TEXT;

  /**
   * Input placeholder text
   */
  @Prop() placeholder?: string;

  /**
   * Label text
   */
  @Prop() label?: string;

  /**
   * Input value
   */
  @Prop({ mutable: true }) value?: string = '';

  /**
   * Input name attribute
   */
  @Prop() name?: string;

  /**
   * Input id attribute
   */
  @Prop() inputId?: string;

  /**
   * Minimum value (for number type)
   */
  @Prop() min?: number;

  /**
   * Maximum value (for number type)
   */
  @Prop() max?: number;

  /**
   * Step value (for number type)
   */
  @Prop() step?: number | string;

  /**
   * Pattern for validation (for text, email, password types)
   */
  @Prop() pattern?: string;

  /**
   * Minimum length (for text, email, password types)
   */
  @Prop() minlength?: number;

  /**
   * Maximum length (for text, email, password types)
   */
  @Prop() maxlength?: number;

  /**
   * Autocomplete attribute
   */
  @Prop() autocomplete?: string;

  /**
   * Emitted when input value changes
   */
  @Event() corInput!: EventEmitter<string>;

  /**
   * Emitted when input loses focus
   */
  @Event() corBlur!: EventEmitter<void>;

  /**
   * Emitted when input gains focus
   */
  @Event() corFocus!: EventEmitter<void>;

  /**
   * Track if input is focused
   */
  @State() isFocused: boolean = false;

  /**
   * Track if input has value
   */
  @State() hasValue: boolean = false;

  /**
   * Track if helper text is provided
   */
  @State() hasHelperText: boolean = false;

  /**
   * Track if label text is provided
   */
  @State() hasLabelText: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLCorInputElement;

  /**
   * Element internals for form association
   */
  @AttachInternals() internals!: ElementInternals;

  /**
   * Internal input element reference
   */
  private inputElement?: HTMLInputElement;

  /**
   * Helper text slot element reference
   */
  private helperSlotElement?: HTMLSlotElement;

  /**
   * Label text slot element reference
   */
  private labelSlotElement?: HTMLSlotElement;

  componentWillLoad() {
    this.checkInputValue();
    // Set initial form value
    if (this.value) {
      this.internals.setFormValue(this.value);
    }
  }

  componentDidLoad() {
    // Use setTimeout to ensure slot content is assigned
    setTimeout(() => {
      this.checkHelperTextSlot();
      this.checkLabelTextSlot();
    }, 0);
  }

  /**
   * Form-associated lifecycle callback: called when form is reset
   */
  formResetCallback() {
    this.value = '';
    this.internals.setFormValue('');
    if (this.inputElement) {
      this.inputElement.value = '';
    }
    this.checkInputValue();
  }

  /**
   * Form-associated lifecycle callback: called when disabled state changes
   */
  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  /**
   * Form-associated lifecycle callback: called when form state is restored
   */
  formStateRestoreCallback(state: string | File | FormData | null, _mode: 'restore' | 'autocomplete') {
    if (typeof state === 'string') {
      this.value = state;
      this.internals.setFormValue(state);
      if (this.inputElement) {
        this.inputElement.value = state;
      }
      this.checkInputValue();
    }
  }

  componentDidUpdate() {
    this.checkInputValue();
    this.updateValidity();
  }

  private checkHelperTextSlot = () => {
    if (this.helperSlotElement) {
      const assignedNodes = this.helperSlotElement.assignedNodes();
      const hasContent = assignedNodes.length > 0;
      if (this.hasHelperText !== hasContent) {
        this.hasHelperText = hasContent;
      }
    }
  };

  private checkLabelTextSlot = () => {
    // Check both slot content and label prop
    const hasSlotContent = this.labelSlotElement ? this.labelSlotElement.assignedNodes().length > 0 : false;
    const hasContent = hasSlotContent || !!this.label;
    if (this.hasLabelText !== hasContent) {
      this.hasLabelText = hasContent;
    }
  };

  private handleFocus = () => {
    this.isFocused = true;
    this.corFocus.emit();
  };

  private handleBlur = () => {
    this.isFocused = false;
    this.corBlur.emit();
  };

  private handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.internals.setFormValue(this.value);
    this.checkInputValue();
    this.updateValidity();
    this.corInput.emit(this.value);
  };

  private checkInputValue() {
    if (this.inputElement) {
      this.hasValue = this.inputElement.value.length > 0;
    } else {
      this.hasValue = (this.value?.length ?? 0) > 0;
    }
  }

  private handleClearClick = (event: MouseEvent) => {
    // Prevent the clear-button click from bubbling to parent components
    // (e.g. datepickers that open on input click). Also prevent default
    // to avoid any default button behavior in parent forms.
    event.stopPropagation();
    event.preventDefault();

    if (this.inputElement) {
      this.inputElement.value = '';
      this.value = '';
      this.internals.setFormValue('');
      this.checkInputValue();
      this.updateValidity();
      this.inputElement.focus();
      this.corInput.emit(this.value);
    }
  };

  /**
   * Update form validity based on internal input element validity
   */
  private updateValidity() {
    if (this.inputElement) {
      const validity = this.inputElement.validity;

      if (validity.valid) {
        this.internals.setValidity({});
      } else {
        const flags: ValidityStateFlags = {};
        const validationMessage = this.inputElement.validationMessage;

        if (validity.valueMissing) flags.valueMissing = true;
        if (validity.typeMismatch) flags.typeMismatch = true;
        if (validity.patternMismatch) flags.patternMismatch = true;
        if (validity.tooLong) flags.tooLong = true;
        if (validity.tooShort) flags.tooShort = true;
        if (validity.rangeUnderflow) flags.rangeUnderflow = true;
        if (validity.rangeOverflow) flags.rangeOverflow = true;
        if (validity.stepMismatch) flags.stepMismatch = true;
        if (validity.badInput) flags.badInput = true;
        if (validity.customError) flags.customError = true;

        this.internals.setValidity(flags, validationMessage, this.inputElement);
      }
    }
  }

  /**
   * Computed label position - forces outside position for non-lg sizes
   */
  private get effectiveLabelPosition(): InputLabelPosition | string {
    return this.size !== InputSize.LG ? InputLabelPosition.OUTSIDE : this.labelPosition;
  }

  render() {
    // Validate slotted elements
    const iconLeftSlot = this.host.querySelector('[slot="icon-left"]');
    const iconRightSlot = this.host.querySelector('[slot="icon-right"]');
    const helperTextSlot = this.host.querySelector('[slot="helper-text"]');

    // Validate icon slots - only cor-icon is allowed
    if (iconLeftSlot && !VALID_ICON_SLOT_TAGS.includes(iconLeftSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(iconLeftSlot.tagName.toLowerCase(), VALID_ICON_SLOT_TAGS)}</Host>;
    }
    if (iconRightSlot && !VALID_ICON_SLOT_TAGS.includes(iconRightSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(iconRightSlot.tagName.toLowerCase(), VALID_ICON_SLOT_TAGS)}</Host>;
    }

    // Validate helper-text slot - only inline elements allowed
    if (helperTextSlot && !VALID_HELPER_TEXT_TAGS.includes(helperTextSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(helperTextSlot.tagName.toLowerCase(), VALID_HELPER_TEXT_TAGS)}</Host>;
    }

    // Host classes
    const hostClasses = {
      'is-focused': this.isFocused,
      'has-value': this.hasValue,
      'has-helper-text': this.hasHelperText,
      'has-label-text': this.hasLabelText,
      'is-skeleton': this.skeleton,
      'inline': this.inline,
      [`label-position-${this.effectiveLabelPosition}`]: true,
    };

    // Skeleton state
    if (this.skeleton) {
      return (
        <Host class={hostClasses}>
          {this.effectiveLabelPosition === InputLabelPosition.OUTSIDE && (
            <cor-skeleton slot="label-text"></cor-skeleton>
          )}

          <cor-skeleton></cor-skeleton>

          <cor-skeleton slot="helper-text"></cor-skeleton>
        </Host>
      );
    }

    // Default state
    return (
      <Host class={hostClasses}>
        {this.effectiveLabelPosition === InputLabelPosition.OUTSIDE && (
          <div class="label-wrapper">
            <label htmlFor={this.inputId}>
              <slot name="label-text" ref={el => (this.labelSlotElement = el)} onSlotchange={this.checkLabelTextSlot}>
                {this.label}
              </slot>
            </label>

            {this.required && <span class="required-asterisk">*</span>}

            {this.labelInfo && (
              <cor-icon
                name={ICON_NAMES.INFORMATION}
                size={IconSize.XS}
                color="neutral-icon-weak"
                class="label-info-icon"
                title={this.labelInfo}
              />
            )}
          </div>
        )}

        <div class="container">
          <slot name="icon-left" />

          <div class="content">
            {this.effectiveLabelPosition === InputLabelPosition.INSIDE && (
              <label htmlFor={this.inputId}>
                <slot name="label-text">{this.label}</slot>
              </label>
            )}

            <input
              ref={el => (this.inputElement = el)}
              id={this.inputId}
              name={this.name}
              type={this.type}
              min={this.min}
              max={this.max}
              step={this.step}
              value={this.value}
              placeholder={this.placeholder}
              disabled={this.disabled}
              required={this.required}
              pattern={this.pattern}
              minlength={this.minlength}
              maxlength={this.maxlength}
              autocomplete={this.autocomplete}
              aria-label={this.label || undefined}
              aria-invalid={this.invalid ? 'true' : undefined}
              aria-describedby={this.hasHelperText ? `${this.inputId}-helper` : undefined}
              onInput={this.handleInput}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
            />
          </div>

          {this.withClearButton && (
            <button
              class={{
                'clear-button': true,
                'clear-button--hidden': !this.hasValue,
              }}
              onClick={this.handleClearClick}
              type="button"
              aria-label="Clear input"
              aria-hidden={!this.hasValue ? 'true' : undefined}
              tabindex={!this.hasValue ? -1 : undefined}
            >
              <cor-icon name={ICON_NAMES.CLOSE} size={IconSize.XS} color="neutral-icon-weak" />
            </button>
          )}

          {this.showLine && <div class="line" />}

          <slot name="icon-right" />
        </div>

        <div class="helper-wrapper" id={this.inputId ? `${this.inputId}-helper` : undefined}>
          {this.hasHelperText && (
            <cor-icon
              size={IconSize.SM}
              name={this.invalid ? ICON_NAMES.WARNING__FILLED : ICON_NAMES.INFORMATION}
              color={this.invalid ? 'system-error-icon' : 'neutral-icon-weak'}
            />
          )}

          <slot name="helper-text" ref={el => (this.helperSlotElement = el)} onSlotchange={this.checkHelperTextSlot} />
        </div>
      </Host>
    );
  }
}
