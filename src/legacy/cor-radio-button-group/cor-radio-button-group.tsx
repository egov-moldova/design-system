import { Component, Element, Event, EventEmitter, Host, Prop, h } from '@stencil/core';

import { RadioButtonGroupOrientation } from './cor-radio-button-group.enums';
import { RadioButtonSize } from '../cor-radio-button/cor-radio-button.enums';

/**
 * Radio button group component - organizes multiple radio buttons in vertical or horizontal layouts with keyboard navigation.
 *
 * @element cor-radio-button-group
 * @slot - Default slot for cor-radio-button elements
 */
@Component({
  tag: 'cor-radio-button-group',
  styleUrl: 'cor-radio-button-group.css',
  shadow: false, // No Shadow DOM for accessibility with fieldset
})
export class CorRadioButtonGroup {
  /**
   * Layout orientation
   * @default vertical
   */
  @Prop({ reflect: true }) orientation: RadioButtonGroupOrientation = RadioButtonGroupOrientation.VERTICAL;

  /**
   * Custom gap override (CSS value)
   */
  @Prop() gap?: string;

  /**
   * Shared name attribute for all child radio buttons (required)
   */
  @Prop() name!: string;

  /**
   * Group label (renders as legend)
   */
  @Prop() legend?: string;

  /**
   * Helper text displayed below the group
   */
  @Prop() helperText?: string;

  /**
   * Size propagated to all child radio buttons
   */
  @Prop() size?: RadioButtonSize;

  /**
   * Disabled state propagated to all child radio buttons
   */
  @Prop({ reflect: true }) disabled?: boolean;

  /**
   * Invalid state propagated to all child radio buttons
   */
  @Prop({ reflect: true }) invalid?: boolean;

  /**
   * Selected radio button value (controlled mode)
   */
  @Prop() value?: string;

  /**
   * Emitted when radio button selection changes (controlled mode)
   */
  @Event() corChange!: EventEmitter<string>;

  @Element() host!: HTMLElement;

  componentDidLoad() {
    this.propagatePropsToChildren();
    this.setupChangeListeners();
    this.setupKeyboardNavigation();
  }

  componentDidUpdate() {
    this.propagatePropsToChildren();
  }

  /**
   * Get all radio buttons in the group
   */
  private getRadios(): HTMLCorRadioButtonElement[] {
    return Array.from(this.host.querySelectorAll('cor-radio-button'));
  }

  /**
   * Propagate props to all child radio buttons
   */
  private propagatePropsToChildren() {
    const radios = this.getRadios();

    radios.forEach(radio => {
      // Propagate size
      if (this.size) {
        radio.setAttribute('size', this.size);
      }

      // Propagate disabled
      if (this.disabled !== undefined) {
        if (this.disabled) {
          radio.setAttribute('disabled', '');
        } else {
          radio.removeAttribute('disabled');
        }
      }

      // Propagate invalid
      if (this.invalid !== undefined) {
        if (this.invalid) {
          radio.setAttribute('invalid', '');
        } else {
          radio.removeAttribute('invalid');
        }
      }

      // Propagate name
      if (this.name) {
        radio.setAttribute('name', this.name);
      }

      // Set checked state based on value prop (controlled mode)
      if (this.value && radio.value) {
        const isChecked = this.value === radio.value;
        if (isChecked) {
          radio.setAttribute('checked', '');
        } else {
          radio.removeAttribute('checked');
        }
      }
    });
  }

  /**
   * Setup change event listeners for controlled mode
   */
  private setupChangeListeners() {
    const radios = this.getRadios();

    radios.forEach(radio => {
      radio.addEventListener('corChange', this.handleRadioChange);
    });
  }

  /**
   * Setup keyboard navigation (Arrow keys)
   */
  private setupKeyboardNavigation() {
    const radios = this.getRadios();

    radios.forEach((radio, index) => {
      // Access the native input inside Shadow DOM
      const input = radio.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
      if (!input) return;

      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (radio.disabled) return;

        let targetIndex = -1;

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          targetIndex = (index + 1) % radios.length;
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          targetIndex = (index - 1 + radios.length) % radios.length;
        }

        if (targetIndex !== -1) {
          // Skip disabled radios
          let attempts = 0;
          while (radios[targetIndex].disabled && attempts < radios.length) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
              targetIndex = (targetIndex + 1) % radios.length;
            } else {
              targetIndex = (targetIndex - 1 + radios.length) % radios.length;
            }
            attempts++;
          }

          if (!radios[targetIndex].disabled) {
            // Focus the input inside the target radio's Shadow DOM
            const targetInput = radios[targetIndex].shadowRoot?.querySelector(
              'input[type="radio"]',
            ) as HTMLInputElement;
            if (targetInput) {
              targetInput.focus();
            }

            radios[targetIndex].checked = true;
            this.corChange.emit(radios[targetIndex].value);

            // Uncheck all other radios (mutual exclusivity)
            radios.forEach((r, i) => {
              if (i !== targetIndex) {
                r.checked = false;
              }
            });
          }
        }
      });
    });
  }

  /**
   * Handle individual radio button change
   */
  private handleRadioChange = (event: CustomEvent) => {
    const selectedRadio = event.target as HTMLCorRadioButtonElement;
    const radios = this.getRadios();

    // Uncheck all other radios (mutual exclusivity)
    radios.forEach(radio => {
      if (radio !== selectedRadio) {
        radio.checked = false;
      }
    });

    this.corChange.emit(selectedRadio.value);
  };

  render() {
    const groupClass = {
      'radio-button-group': true,
      'radio-button-group--vertical': this.orientation === RadioButtonGroupOrientation.VERTICAL,
      'radio-button-group--horizontal': this.orientation === RadioButtonGroupOrientation.HORIZONTAL,
    };

    const groupStyle: { [key: string]: string } = {};
    if (this.gap) {
      groupStyle.gap = this.gap;
    }

    return (
      <Host>
        <fieldset class="radio-button-group-fieldset">
          {this.legend && <legend class="radio-button-group-legend">{this.legend}</legend>}

          <div class={groupClass} style={groupStyle}>
            <slot />
          </div>

          {this.helperText && <div class="radio-button-group-helper">{this.helperText}</div>}
        </fieldset>
      </Host>
    );
  }
}
