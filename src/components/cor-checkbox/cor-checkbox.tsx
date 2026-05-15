import { Component, Host, Element, Prop, State, Event, EventEmitter, AttachInternals, h, Watch } from '@stencil/core';

import { CheckboxSize } from './cor-checkbox.enums';
import { LabelState } from '../cor-label/cor-label.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { IconSize } from '../cor-icon/cor-icon.types';

/**
 * Checkbox component with form association and indeterminate state support.
 *
 * @element cor-checkbox
 * @slot - Label content for the checkbox
 */

@Component({
  tag: 'cor-checkbox',
  styleUrl: 'cor-checkbox.css',
  shadow: true,
  formAssociated: true,
})
export class CorCheckbox {
  /**
   * Size of the checkbox
   * @default md
   */
  @Prop({ reflect: true }) size: CheckboxSize | `${CheckboxSize}` = CheckboxSize.MD;

  /**
   * Checked state
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) checked: boolean = false;

  /**
   * Indeterminate state (for "select all" checkboxes)
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) indeterminate: boolean = false;

  /**
   * Indicates if checkbox is disabled
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Indicates if checkbox is invalid
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Externally controlled hover state (propagated from parent)
   * @default false
   */
  @Prop({ reflect: true }) hovered: boolean = false;

  /**
   * Externally controlled pressed state (propagated from parent)
   * @default false
   */
  @Prop({ reflect: true }) pressed: boolean = false;

  /**
   * Name attribute for form submission
   */
  @Prop() name?: string;

  /**
   * Value attribute for form submission
   * @default "on"
   */
  @Prop() value?: string = 'on';

  /**
   * Internal hover state tracked via mouse events
   */
  @State() private isHovered: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  /**
   * Element internals for form association
   */
  @AttachInternals() internals!: ElementInternals;

  /**
   * Emitted when checked state changes
   */
  @Event() corChange!: EventEmitter<boolean>;

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
   * Watch indeterminate prop changes to sync with input
   */
  @Watch('indeterminate')
  watchIndeterminateHandler(newValue: boolean) {
    if (this.inputElement) {
      this.inputElement.indeterminate = newValue;
    }
  }

  /**
   * Sync form value with internals
   */
  private syncFormValue() {
    if (this.checked) {
      this.internals.setFormValue(this.value || 'on');
    } else {
      this.internals.setFormValue(null);
    }
  }

  /**
   * Handle checkbox change event
   */
  private handleChange = (event: Event) => {
    if (this.disabled) return;

    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.indeterminate = false; // Clear indeterminate on user interaction
    this.syncFormValue();
    this.corChange.emit(this.checked);
  };

  /**
   * Handle label click to toggle checkbox
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
    this.indeterminate = false;
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
      this.checked = state === (this.value || 'on');
      this.syncFormValue();
    }
  }

  componentDidLoad() {
    // Sync indeterminate state to native input
    if (this.inputElement) {
      this.inputElement.indeterminate = this.indeterminate;
      this.inputElement.checked = this.checked;
    }
    this.syncFormValue();
  }

  componentDidUpdate() {
    // Keep indeterminate in sync
    if (this.inputElement) {
      this.inputElement.indeterminate = this.indeterminate;
    }
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
   * Map checkbox state to label state
   */
  private get labelState(): LabelState | `${LabelState}` {
    if (this.disabled) return 'disabled';
    if (this.invalid) return 'error';
    if (this.hovered || this.isHovered) return 'hover';
    if (this.checked || this.indeterminate) return 'active';
    return 'default';
  }

  private handleMouseEnter = () => {
    if (!this.disabled) this.isHovered = true;
  };

  private handleMouseLeave = () => {
    this.isHovered = false;
  };

  render() {
    // Map checkbox size to icon size (SM=16px, MD=20px)
    const iconSize = this.size === CheckboxSize.SM ? IconSize.SM : IconSize.MD;

    // Determine which checkbox icon to display based on state (kebab-case naming)
    let checkboxIcon = ICON_NAMES.CHECKBOX;
    if (this.indeterminate) {
      checkboxIcon = ICON_NAMES.CHECKBOX__INDETERMINATE__FILLED;
    } else if (this.checked) {
      checkboxIcon = ICON_NAMES.CHECKBOX__CHECKED__FILLED;
    }

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
            type="checkbox"
            checked={this.checked}
            disabled={this.disabled}
            name={this.name}
            value={this.value}
            onChange={this.handleChange}
            aria-invalid={this.invalid ? 'true' : 'false'}
          />
          <span class="checkbox-icon">
            <cor-icon name={checkboxIcon} size={iconSize} />
          </span>

          {this.hasLabelContent() && (
            <cor-label size={this.size} state={this.labelState} as="span">
              <slot />
            </cor-label>
          )}
        </label>
      </Host>
    );
  }
}
