import { Component, Host, Element, Prop, State, Event, EventEmitter, AttachInternals, h, Watch } from '@stencil/core';

import { RadioButtonSize } from './cor-radio-button.enums';
import { LabelSize, LabelState } from '../cor-label/cor-label.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { IconSize } from '../cor-icon/cor-icon.types';

/**
 * Radio button component with form association.
 *
 * @element cor-radio-button
 * @slot - Label content for the radio button
 */

@Component({
  tag: 'cor-radio-button',
  styleUrl: 'cor-radio-button.css',
  shadow: true,
  formAssociated: true,
})
export class CorRadioButton {
  /**
   * Size of the radio button
   * @default md
   */
  @Prop({ reflect: true }) size: RadioButtonSize = RadioButtonSize.MD;

  /**
   * Checked state
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) checked: boolean = false;

  /**
   * Indicates if radio button is disabled
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) disabled: boolean = false;

  /**
   * Indicates if radio button is invalid
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Name attribute for form submission (required for grouping)
   */
  @Prop() name!: string;

  /**
   * Value attribute for form submission
   */
  @Prop() value!: string;

  /**
   * Internal hover state tracked via mouse events
   */
  @State() private isHovered: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  /**
   * Emitted when checked state changes
   */
  @Event() corChange!: EventEmitter<boolean>;

  /**
   * Element internals for form association
   */
  @AttachInternals() internals!: ElementInternals;

  /**
   * Internal input element reference
   */
  private inputElement?: HTMLInputElement;

  /**
   * Watch checked prop changes to sync with internals
   */
  @Watch('checked')
  watchCheckedHandler(newValue: boolean) {
    this.syncFormValue();
    if (this.inputElement) {
      this.inputElement.checked = newValue;
    }
  }

  /**
   * Sync form value with internals
   */
  private syncFormValue() {
    if (this.checked) {
      this.internals.setFormValue(this.value);
    } else {
      this.internals.setFormValue(null);
    }
  }

  /**
   * Handle radio button change event
   */
  private handleChange = (event: Event) => {
    if (this.disabled) return;

    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.syncFormValue();
    this.corChange.emit(this.checked);
  };

  /**
   * Handle label click to toggle radio button
   */
  private handleLabelClick = (event: MouseEvent) => {
    if (this.disabled) return;

    // Prevent double-toggle (input already handles it)
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT') {
      return;
    }
  };

  /**
   * Form reset callback
   */
  formResetCallback() {
    this.checked = false;
    this.syncFormValue();
  }

  /**
   * Form disabled callback
   */
  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  /**
   * Form state restore callback
   */
  formStateRestoreCallback(state: string | File | FormData | null, _mode: 'restore' | 'autocomplete') {
    if (typeof state === 'string') {
      this.checked = state === this.value;
      this.syncFormValue();
    }
  }

  componentDidLoad() {
    // Sync checked state to native input
    if (this.inputElement) {
      this.inputElement.checked = this.checked;
    }
    this.syncFormValue();
  }

  /**
   * Check if the label slot has content
   */
  private hasLabelContent(): boolean {
    const slotNodes = this.host.childNodes;
    return Array.from(slotNodes).some(
      node =>
        (node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== '') ||
        (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'COR-ICON'),
    );
  }

  /**
   * Map radio button size to label size (1:1 mapping)
   */
  private get labelSize(): LabelSize | `${LabelSize}` {
    return this.size;
  }

  /**
   * Map radio button state to label state
   */
  private get labelState(): LabelState | `${LabelState}` {
    if (this.disabled) return 'disabled';
    if (this.invalid) return 'error';
    if (this.isHovered) return 'hover';
    if (this.checked) return 'active';
    return 'default';
  }

  private handleMouseEnter = () => {
    if (!this.disabled) this.isHovered = true;
  };

  private handleMouseLeave = () => {
    this.isHovered = false;
  };

  render() {
    // Map radio button size to icon size (SM=16px, MD=20px)
    const iconSize = this.size === RadioButtonSize.SM ? IconSize.SM : IconSize.MD;

    // Determine which radio button icon to display based on state (kebab-case naming)
    const radioIcon = this.checked ? ICON_NAMES.RADIO_BUTTON__CHECKED : ICON_NAMES.RADIO_BUTTON;

    return (
      <Host>
        <label
          class="container"
          onClick={this.handleLabelClick}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        >
          <input
            ref={el => (this.inputElement = el)}
            type="radio"
            checked={this.checked}
            disabled={this.disabled}
            name={this.name}
            value={this.value}
            onChange={this.handleChange}
            aria-invalid={this.invalid ? 'true' : 'false'}
          />
          <span class="radio-icon">
            <cor-icon name={radioIcon} size={iconSize} />
          </span>

          {this.hasLabelContent() && (
            <cor-label size={this.labelSize} state={this.labelState} as="span">
              <slot />
            </cor-label>
          )}
        </label>
      </Host>
    );
  }
}
