import { Component, Element, Event, EventEmitter, Host, Prop, h } from '@stencil/core';

import { CheckboxGroupOrientation } from './cor-checkbox-group.enums';

/**
 * Checkbox group component - organizes multiple checkboxes in vertical, horizontal, or multi-column layouts.
 *
 * @element cor-checkbox-group
 * @slot - Default slot for cor-checkbox elements
 */
@Component({
  tag: 'cor-checkbox-group',
  styleUrl: 'cor-checkbox-group.css',
  shadow: false, // No Shadow DOM for accessibility with fieldset
})
export class CorCheckboxGroup {
  /**
   * Layout orientation
   * @default vertical
   */
  @Prop({ reflect: true }) orientation: CheckboxGroupOrientation | `${CheckboxGroupOrientation}` =
    CheckboxGroupOrientation.VERTICAL;

  /**
   * Number of columns for multi-column vertical layout
   * @default 1
   */
  @Prop() columns: number = 1;

  /**
   * Custom gap override (CSS value)
   */
  @Prop() gap?: string;

  /**
   * Shared name attribute for all child checkboxes
   */
  @Prop() name?: string;

  /**
   * Group label (renders as legend)
   */
  @Prop() legend?: string;

  /**
   * Helper text displayed below the group
   */
  @Prop() helperText?: string;

  /**
   * Size propagated to all child checkboxes
   */
  @Prop() size?: string;

  /**
   * Disabled state propagated to all child checkboxes
   */
  @Prop({ reflect: true }) disabled?: boolean;

  /**
   * Invalid state propagated to all child checkboxes
   */
  @Prop({ reflect: true }) invalid?: boolean;

  /**
   * Array of selected checkbox values (controlled mode).
   * When set via HTML attribute, accepts a JSON string: value='["a","b"]'
   */
  @Prop() value?: string[] | string;

  @Element() host!: HTMLElement;

  /**
   * Emitted when checkbox selection changes (controlled mode)
   */
  @Event() corChange!: EventEmitter<string[]>;

  componentDidLoad() {
    this.propagatePropsToChildren();
    this.setupChangeListeners();
  }

  componentDidUpdate() {
    this.propagatePropsToChildren();
    this.refreshChangeListeners();
  }

  disconnectedCallback() {
    this.removeChangeListeners();
  }

  /**
   * Parse the value prop — accepts string[] or a JSON string (for HTML attribute usage)
   */
  private getParsedValue(): string[] | undefined {
    if (!this.value) return undefined;
    if (Array.isArray(this.value)) return this.value;
    try {
      const parsed = JSON.parse(this.value as string);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Propagate props to all child checkboxes
   */
  private propagatePropsToChildren() {
    const checkboxes = Array.from(this.host.querySelectorAll('cor-checkbox'));
    const parsedValue = this.getParsedValue();

    checkboxes.forEach(checkbox => {
      // Propagate size
      if (this.size) {
        checkbox.setAttribute('size', this.size);
      }

      // Propagate disabled
      if (this.disabled !== undefined) {
        if (this.disabled) {
          checkbox.setAttribute('disabled', '');
        } else {
          checkbox.removeAttribute('disabled');
        }
      }

      // Propagate invalid
      if (this.invalid !== undefined) {
        if (this.invalid) {
          checkbox.setAttribute('invalid', '');
        } else {
          checkbox.removeAttribute('invalid');
        }
      }

      // Propagate name
      if (this.name) {
        checkbox.setAttribute('name', this.name);
      }

      // Set checked state based on value prop (controlled mode)
      if (parsedValue && checkbox.value) {
        const isChecked = parsedValue.includes(checkbox.value);
        if (isChecked) {
          checkbox.setAttribute('checked', '');
        } else {
          checkbox.removeAttribute('checked');
        }
      }
    });
  }

  /**
   * Setup change event listeners for controlled mode
   */
  private setupChangeListeners() {
    if (!this.getParsedValue()) return; // Only in controlled mode

    const checkboxes = Array.from(this.host.querySelectorAll('cor-checkbox'));
    checkboxes.forEach(checkbox => {
      checkbox.removeEventListener('corChange', this.handleCheckboxChange);
      checkbox.addEventListener('corChange', this.handleCheckboxChange);
    });
  }

  /**
   * Re-attach listeners on update to handle dynamically added checkboxes
   */
  private refreshChangeListeners() {
    if (!this.getParsedValue()) return;
    this.setupChangeListeners();
  }

  /**
   * Remove all change event listeners
   */
  private removeChangeListeners() {
    const checkboxes = Array.from(this.host.querySelectorAll('cor-checkbox'));
    checkboxes.forEach(checkbox => {
      checkbox.removeEventListener('corChange', this.handleCheckboxChange);
    });
  }

  /**
   * Handle individual checkbox change
   */
  private handleCheckboxChange = (event: CustomEvent) => {
    const parsedValue = this.getParsedValue();
    if (!parsedValue) return; // Only in controlled mode

    const checkbox = event.target as HTMLCorCheckboxElement;
    const checkboxValue = checkbox.value;

    if (!checkboxValue) return;

    const newValue = [...parsedValue];
    const index = newValue.indexOf(checkboxValue);

    if (checkbox.checked && index === -1) {
      // Add to selected values
      newValue.push(checkboxValue);
    } else if (!checkbox.checked && index !== -1) {
      // Remove from selected values
      newValue.splice(index, 1);
    }

    this.corChange.emit(newValue);
  };

  render() {
    const isMultiColumn = this.orientation === CheckboxGroupOrientation.VERTICAL && this.columns > 1;
    const groupClass = {
      'checkbox-group': true,
      'checkbox-group--vertical': this.orientation === CheckboxGroupOrientation.VERTICAL && this.columns === 1,
      'checkbox-group--horizontal': this.orientation === CheckboxGroupOrientation.HORIZONTAL,
      'checkbox-group--multi-column': isMultiColumn,
    };

    const groupStyle: { [key: string]: string } = {};
    if (this.gap) {
      groupStyle.gap = this.gap;
    }
    if (isMultiColumn) {
      groupStyle.gridTemplateColumns = `repeat(${this.columns}, auto)`;
    }

    return (
      <Host>
        <fieldset class="checkbox-group-fieldset">
          {this.legend && <legend class="checkbox-group-legend">{this.legend}</legend>}

          <div class={groupClass} style={groupStyle}>
            <slot />
          </div>

          {this.helperText && <div class="checkbox-group-helper">{this.helperText}</div>}
        </fieldset>
      </Host>
    );
  }
}
