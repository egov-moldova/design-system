import { Component, Host, Element, Prop, State, Event, EventEmitter, AttachInternals, h } from '@stencil/core';

import { TextareaLabelPosition, TextareaResize } from './cor-textarea.enums';
import { IconSize } from '../../components/cor-icon/cor-icon.types';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import ICON_NAMES from '../../components/cor-icon/assets/carbon-icon-names.json';
import { VALID_HELPER_TEXT_TAGS } from '../shared.constants';

/**
 * Textarea component with label positioning, state management, and resize control.
 *
 * @element cor-textarea
 * @slot helper-text - Helper text content slot (icon and styling handled by component)
 */

@Component({
  tag: 'cor-textarea',
  styleUrl: 'cor-textarea.css',
  shadow: true,
  formAssociated: true,
})
export class CorTextarea {
  /**
   * Label position (inside or outside)
   * @default inside
   */
  @Prop({ reflect: true }) labelPosition: TextareaLabelPosition = TextareaLabelPosition.INSIDE;

  /**
   * Indicates if textarea is disabled
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Indicates if textarea is invalid
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Show skeleton loading state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Indicates if textarea is required
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Info text to show in tooltip when hovering info icon next to label (only for labelPosition="outside")
   * When provided, displays info icon with native browser tooltip
   */
  @Prop({ reflect: true }) labelInfo?: string;

  /**
   * Resize behavior of the textarea
   * @default vertical
   */
  @Prop({ reflect: true }) resize: TextareaResize = TextareaResize.VERTICAL;

  /**
   * Textarea placeholder text
   */
  @Prop() placeholder?: string;

  /**
   * Label text
   */
  @Prop() label?: string;

  /**
   * Textarea value
   */
  @Prop({ mutable: true }) value?: string = '';

  /**
   * Textarea name attribute
   */
  @Prop() name?: string;

  /**
   * Textarea id attribute
   */
  @Prop() textareaId?: string;

  /**
   * Number of visible text rows
   * @default 4
   */
  @Prop() rows?: number = 4;

  /**
   * Number of visible text columns
   */
  @Prop() cols?: number;

  /**
   * Maximum length of textarea value
   */
  @Prop() maxlength?: number;

  /**
   * Minimum length of textarea value
   */
  @Prop() minlength?: number;

  /**
   * Track if textarea is focused
   */
  @State() isFocused: boolean = false;

  /**
   * Track if textarea has value
   */
  @State() hasValue: boolean = false;

  /**
   * Track if helper text is provided
   */
  @State() hasHelperText: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLCorTextareaElement;

  /**
   * Element internals for form association
   */
  @AttachInternals() internals!: ElementInternals;

  /**
   * Emitted when textarea value changes
   */
  @Event() corInput!: EventEmitter<string>;

  /**
   * Emitted when textarea loses focus
   */
  @Event() corBlur!: EventEmitter<void>;

  /**
   * Emitted when textarea gains focus
   */
  @Event() corFocus!: EventEmitter<void>;

  /**
   * Internal textarea element reference
   */
  private textareaElement?: HTMLTextAreaElement;

  /**
   * Helper text slot element reference
   */
  private helperSlotElement?: HTMLSlotElement;

  componentWillLoad() {
    this.checkTextareaValue();
    // Set initial form value
    if (this.value) {
      this.internals.setFormValue(this.value);
    }
  }

  componentDidLoad() {
    // Use setTimeout to ensure slot content is assigned
    setTimeout(() => this.checkHelperTextSlot(), 0);
  }

  /**
   * Form-associated lifecycle callback: called when form is reset
   */
  formResetCallback() {
    this.value = '';
    this.internals.setFormValue('');
    if (this.textareaElement) {
      this.textareaElement.value = '';
    }
    this.checkTextareaValue();
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
      if (this.textareaElement) {
        this.textareaElement.value = state;
      }
      this.checkTextareaValue();
    }
  }

  componentDidUpdate() {
    this.checkTextareaValue();
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

  private handleFocus = () => {
    this.isFocused = true;
    this.corFocus.emit();
  };

  private handleBlur = () => {
    this.isFocused = false;
    this.corBlur.emit();
  };

  private handleInput = (event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    this.value = target.value;
    this.internals.setFormValue(this.value);
    this.checkTextareaValue();
    this.updateValidity();
    this.corInput.emit(this.value);
  };

  private checkTextareaValue() {
    if (this.textareaElement) {
      this.hasValue = this.textareaElement.value.length > 0;
    } else {
      this.hasValue = (this.value?.length ?? 0) > 0;
    }
  }

  /**
   * Update form validity based on internal textarea element validity
   */
  private updateValidity() {
    if (this.textareaElement) {
      const validity = this.textareaElement.validity;

      if (validity.valid) {
        this.internals.setValidity({});
      } else {
        const flags: ValidityStateFlags = {};
        const validationMessage = this.textareaElement.validationMessage;

        if (validity.valueMissing) flags.valueMissing = true;
        if (validity.tooLong) flags.tooLong = true;
        if (validity.tooShort) flags.tooShort = true;
        if (validity.customError) flags.customError = true;

        this.internals.setValidity(flags, validationMessage, this.textareaElement);
      }
    }
  }

  render() {
    // Validate slotted elements
    const helperTextSlot = this.host.querySelector('[slot="helper-text"]');

    // Validate helper-text slot - only inline elements allowed
    if (helperTextSlot && !VALID_HELPER_TEXT_TAGS.includes(helperTextSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(helperTextSlot.tagName.toLowerCase(), VALID_HELPER_TEXT_TAGS)}</Host>;
    }

    const hostClasses = {
      'has-value': this.hasValue,
      'is-focused': this.isFocused,
      'is-skeleton': this.skeleton,
      'has-helper-text': this.hasHelperText,
      'label-position-outside': this.labelPosition === TextareaLabelPosition.OUTSIDE,
      'label-position-inside': this.labelPosition === TextareaLabelPosition.INSIDE,
    };

    // Skeleton state
    if (this.skeleton) {
      return (
        <Host class={hostClasses}>
          {this.labelPosition === TextareaLabelPosition.OUTSIDE && <cor-skeleton slot="label-text"></cor-skeleton>}

          <cor-skeleton></cor-skeleton>

          <cor-skeleton slot="helper-text"></cor-skeleton>
        </Host>
      );
    }

    // Default state
    return (
      <Host class={hostClasses}>
        {this.labelPosition === TextareaLabelPosition.OUTSIDE && (
          <div class="label-wrapper">
            <label htmlFor={this.textareaId}>
              <slot name="label-text">{this.label}</slot>
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
          <div class="content">
            {this.labelPosition === TextareaLabelPosition.INSIDE && (
              <label htmlFor={this.textareaId}>
                <slot name="label-text">{this.label}</slot>
              </label>
            )}

            <textarea
              ref={el => (this.textareaElement = el)}
              id={this.textareaId}
              name={this.name}
              placeholder={this.placeholder}
              value={this.value}
              disabled={this.disabled}
              required={this.required}
              rows={this.rows}
              cols={this.cols}
              maxlength={this.maxlength}
              minlength={this.minlength}
              onInput={this.handleInput}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
              aria-invalid={this.invalid ? 'true' : undefined}
              aria-required={this.required ? 'true' : undefined}
              aria-describedby={this.hasHelperText && this.textareaId ? `${this.textareaId}-helper` : undefined}
            />
          </div>
        </div>

        <div
          class="helper-wrapper"
          id={this.hasHelperText && this.textareaId ? `${this.textareaId}-helper` : undefined}
        >
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
