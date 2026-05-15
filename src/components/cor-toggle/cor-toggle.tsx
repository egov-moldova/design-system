import { Component, Host, Element, Prop, State, Event, EventEmitter, AttachInternals, h, Watch } from '@stencil/core';

import { ToggleSize } from './cor-toggle.enums';
import { LabelState } from '../cor-label/cor-label.enums';

/**
 * Toggle/Switch component with form association.
 *
 * @element cor-toggle
 * @slot label-left - Label content for the left side of the toggle
 * @slot - Label content for the right side of the toggle (default slot)
 */

@Component({
  tag: 'cor-toggle',
  styleUrl: 'cor-toggle.css',
  shadow: true,
  formAssociated: true,
})
export class CorToggle {
  /**
   * Size of the toggle
   * @default md
   */
  @Prop({ reflect: true }) size: ToggleSize = ToggleSize.MD;

  /**
   * Checked state
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) checked: boolean = false;

  /**
   * Indicates if toggle is disabled
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) disabled: boolean = false;

  /**
   * Indicates if toggle is invalid
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

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
   * Watch checked prop changes to sync with internals
   */
  @Watch('checked')
  watchCheckedHandler(newValue: boolean) {
    this.syncFormValue();
    if (this.inputElement) {
      this.inputElement.checked = newValue;
    }
  }

  componentDidLoad() {
    if (this.inputElement) {
      this.inputElement.checked = this.checked;
    }
    this.syncFormValue();
  }

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
      this.checked = state === (this.value || 'on');
      this.syncFormValue();
    }
  }

  /**
   * Internal input element reference
   */
  private inputElement?: HTMLInputElement;

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
   * Check if the left label slot has content
   */
  private hasLeftLabelContent(): boolean {
    const slotElement = this.host.querySelector('[slot="label-left"]');
    return slotElement !== null && (slotElement.textContent ?? '').trim() !== '';
  }

  /**
   * Check if the right label slot has content
   */
  private hasRightLabelContent(): boolean {
    const slotNodes = this.host.childNodes;
    return Array.from(slotNodes).some(
      node =>
        (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '') ||
        (node.nodeType === Node.ELEMENT_NODE && !(node as Element).hasAttribute('slot')),
    );
  }

  /**
   * Map toggle state to label state
   */
  private get labelState(): LabelState | `${LabelState}` {
    if (this.disabled) return 'disabled';
    if (this.invalid) return 'error';
    if (this.isHovered) return 'hover';
    if (this.checked) return 'active';
    return 'default';
  }

  private handleChange = (event: Event) => {
    if (this.disabled) return;

    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.syncFormValue();
    this.corChange.emit(this.checked);
  };

  private handleMouseEnter = () => {
    if (!this.disabled) this.isHovered = true;
  };

  private handleMouseLeave = () => {
    this.isHovered = false;
  };

  render() {
    return (
      <Host>
        <label class="container" onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          {this.hasLeftLabelContent() && (
            <cor-label size={this.size} state={this.labelState} as="span">
              <slot name="label-left" />
            </cor-label>
          )}

          <input
            ref={el => (this.inputElement = el)}
            type="checkbox"
            role="switch"
            checked={this.checked}
            disabled={this.disabled}
            name={this.name}
            value={this.value}
            onChange={this.handleChange}
            aria-checked={this.checked ? 'true' : 'false'}
            aria-invalid={this.invalid ? 'true' : 'false'}
          />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>

          {this.hasRightLabelContent() && (
            <cor-label size={this.size} state={this.labelState} as="span">
              <slot />
            </cor-label>
          )}
        </label>
      </Host>
    );
  }
}
