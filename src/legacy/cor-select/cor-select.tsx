import {
  Component,
  Host,
  Element,
  Prop,
  State,
  Event,
  EventEmitter,
  AttachInternals,
  Listen,
  Watch,
  h,
} from '@stencil/core';

import { SelectListPosition, SelectSize } from './cor-select.enums';
import { IconSize } from '../../components/cor-icon/cor-icon.types';
import ICON_NAMES from '../../components/cor-icon/assets/carbon-icon-names.json';

/**
 * Select component with custom dropdown styling.
 *
 * @element cor-select
 * @slot - cor-select-item elements with variant="label-only"
 */

@Component({
  tag: 'cor-select',
  styleUrl: 'cor-select.css',
  shadow: true,
  formAssociated: true,
})
export class CorSelect {
  /**
   * Size of the select
   * @default lg
   */
  @Prop({ reflect: true }) size: SelectSize = SelectSize.LG;

  /**
   * Indicates if select is disabled
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) disabled: boolean = false;

  /**
   * Indicates if select is invalid
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Indicates if select is required
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Inline mode - width adjusts to fit options content
   * @default false
   */
  @Prop({ reflect: true }) inline: boolean = false;

  /**
   * Select value
   */
  @Prop({ reflect: true, mutable: true }) value?: string = '';

  /**
   * Select name attribute
   */
  @Prop() name?: string;

  /**
   * Select id attribute
   */
  @Prop() selectId?: string;

  /**
   * Placeholder text shown when no value is selected
   */
  @Prop() placeholder?: string;

  /**
   * Position of the dropdown list relative to the trigger
   * @default auto
   */
  @Prop() listPosition: SelectListPosition | `${SelectListPosition}` = SelectListPosition.AUTO;

  /**
   * Track if select is open
   */
  @State() isOpen: boolean = false;

  /**
   * Currently focused option index for keyboard navigation
   */
  @State() private focusedIndex: number = -1;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  /**
   * Element internals for form association
   */
  @AttachInternals() internals!: ElementInternals;

  /**
   * Emitted when select value changes
   */
  @Event() corChange!: EventEmitter<{ value: string }>;

  /**
   * Emitted when select loses focus
   */
  @Event() corBlur!: EventEmitter<void>;

  /**
   * Emitted when select gains focus
   */
  @Event() corFocus!: EventEmitter<void>;

  private triggerEl?: HTMLButtonElement;
  private skipNextDocumentClick = false;

  componentWillLoad() {
    // Set initial form value
    if (this.value) {
      this.internals.setFormValue(this.value);
    }
    const items = this.getSlottedItems();
    if (this.value) {
      this.focusedIndex = items.findIndex(item => item.getAttribute('value') === this.value);
    } else {
      this.focusedIndex = -1;
    }
  }

  componentDidLoad() {
    this.syncSelectedState();
    this.host.addEventListener('corSelectionChange', this.handleSlottedItemSelect);
  }

  disconnectedCallback() {
    this.host.removeEventListener('corSelectionChange', this.handleSlottedItemSelect);
  }

  /**
   * Form-associated lifecycle callback: called when form is reset
   */
  formResetCallback() {
    this.value = '';
    this.internals.setFormValue('');
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
    }
  }

  componentDidUpdate() {
    this.updateValidity();
  }

  @Watch('value')
  handleValueChange() {
    this.syncSelectedState();
  }

  @Listen('click', { target: 'document' })
  handleDocumentClick(event: MouseEvent) {
    if (!this.isOpen) return;
    if (this.skipNextDocumentClick) {
      this.skipNextDocumentClick = false;
      return;
    }
    const path = event.composedPath();
    if (!path.includes(this.host)) {
      this.isOpen = false;
      this.corBlur.emit();
    }
  }

  @Listen('keydown', { target: 'document' })
  handleKeydown(event: KeyboardEvent) {
    if (this.disabled) return;

    // When dropdown is open, capture all keyboard events
    if (this.isOpen) {
      const items = this.getSlottedItems();

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          this.isOpen = false;
          this.focusedIndex = -1;
          this.clearFocusedItem(items);
          this.triggerEl?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          this.focusedIndex = Math.min(this.focusedIndex + 1, items.length - 1);
          this.applyFocusedItem(items);
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
          this.applyFocusedItem(items);
          break;
        case 'Home':
          event.preventDefault();
          this.focusedIndex = 0;
          this.applyFocusedItem(items);
          break;
        case 'End':
          event.preventDefault();
          this.focusedIndex = items.length - 1;
          this.applyFocusedItem(items);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          this.selectFocusedItem();
          break;
        case 'Tab':
          this.isOpen = false;
          this.focusedIndex = -1;
          this.clearFocusedItem(items);
          break;
      }
      return;
    }

    // When dropdown is closed, only handle events on this component
    const path = event.composedPath();
    if (!path.includes(this.host)) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.openDropdown();
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        // Arrow keys navigate and change value when dropdown is closed
        this.navigateAndSelect(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Home':
        event.preventDefault();
        this.navigateAndSelectToFirst();
        break;
      case 'End':
        event.preventDefault();
        this.navigateAndSelectToLast();
        break;
    }
  }

  private getSlottedItems(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>('cor-select-item'));
  }

  private syncSelectedState() {
    const items = this.getSlottedItems();
    items.forEach((item, i) => {
      const itemValue = item.getAttribute('value');
      if (itemValue !== null) {
        if (itemValue === this.value) {
          item.setAttribute('selected', '');
        } else {
          item.removeAttribute('selected');
        }
      }
      item.id = `select-option-${i}`;
    });
  }

  private handleSlottedItemSelect = (event: Event) => {
    const target = event.target as HTMLElement;
    const itemValue = target.getAttribute('value');
    if (itemValue !== null && this.isOpen) {
      this.isOpen = false;
      this.focusedIndex = -1;
      const valueChanged = this.updateValueIfChanged(itemValue);
      if (valueChanged) {
        this.corChange.emit({ value: this.value ?? '' });
      }
      this.triggerEl?.focus();
      event.stopPropagation();
    }
  };

  private applyFocusedItem(items: HTMLElement[]) {
    items.forEach((item, i) => {
      if (i === this.focusedIndex) {
        item.setAttribute('focused', '');
      } else {
        item.removeAttribute('focused');
      }
    });
  }

  private clearFocusedItem(items: HTMLElement[]) {
    items.forEach(item => item.removeAttribute('focused'));
  }

  private navigateAndSelect(direction: number) {
    const items = this.getSlottedItems();
    if (items.length === 0) return;

    // Find current selected index, or start at -1 if no selection
    const currentIndex = this.value ? items.findIndex(item => item.getAttribute('value') === this.value) : -1;

    // If no current selection, start at beginning (for ArrowDown) or end (for ArrowUp)
    let newIndex: number;
    if (currentIndex === -1) {
      newIndex = direction > 0 ? 0 : items.length - 1;
    } else {
      newIndex = currentIndex + direction;
    }

    // Clamp to boundaries (no wrap)
    newIndex = Math.max(0, Math.min(newIndex, items.length - 1));

    // Select the new value
    const item = items[newIndex];
    const itemValue = item.getAttribute('value');
    if (itemValue !== null) {
      const valueChanged = this.updateValueIfChanged(itemValue);
      if (valueChanged) {
        this.corChange.emit({ value: this.value ?? '' });
      }
    }
  }

  private navigateAndSelectToFirst() {
    const items = this.getSlottedItems();
    if (items.length > 0) {
      const itemValue = items[0].getAttribute('value');
      if (itemValue !== null) {
        const valueChanged = this.updateValueIfChanged(itemValue);
        if (valueChanged) {
          this.corChange.emit({ value: this.value ?? '' });
        }
      }
    }
  }

  private navigateAndSelectToLast() {
    const items = this.getSlottedItems();
    if (items.length > 0) {
      const itemValue = items[items.length - 1].getAttribute('value');
      if (itemValue !== null) {
        const valueChanged = this.updateValueIfChanged(itemValue);
        if (valueChanged) {
          this.corChange.emit({ value: this.value ?? '' });
        }
      }
    }
  }

  private selectFocusedItem() {
    const items = this.getSlottedItems();
    if (this.focusedIndex >= 0 && this.focusedIndex < items.length) {
      const item = items[this.focusedIndex];
      const itemValue = item.getAttribute('value');
      if (itemValue !== null) {
        this.isOpen = false;
        this.focusedIndex = -1;
        this.clearFocusedItem(items);
        const valueChanged = this.updateValueIfChanged(itemValue);
        if (valueChanged) {
          this.corChange.emit({ value: this.value ?? '' });
        }
        this.triggerEl?.focus();
      }
    }
  }

  private openDropdown() {
    this.skipNextDocumentClick = true;
    this.isOpen = true;
    this.corFocus.emit();

    // Apply focus immediately
    const items = this.getSlottedItems();
    if (items.length > 0) {
      // Start with the selected item or first item
      if (this.value) {
        const selectedIdx = items.findIndex(item => item.getAttribute('value') === this.value);
        this.focusedIndex = selectedIdx >= 0 ? selectedIdx : 0;
      } else {
        this.focusedIndex = 0;
      }
      this.applyFocusedItem(items);
    }
  }

  private handleTriggerClick = () => {
    if (this.disabled) return;
    if (this.isOpen) {
      this.isOpen = false;
      this.focusedIndex = -1;
      this.clearFocusedItem(this.getSlottedItems());
    } else {
      this.openDropdown();
      // Ensure trigger retains focus for keyboard navigation
      this.triggerEl?.focus();
    }
  };

  private updateValueIfChanged(nextValue?: string): boolean {
    const normalizedValue = nextValue ?? '';
    if (this.value === normalizedValue) {
      return false;
    }
    this.value = normalizedValue;
    this.internals.setFormValue(normalizedValue);
    this.updateValidity();
    return true;
  }

  private getDropdownPosition(): 'top' | 'bottom' {
    if (this.listPosition === 'top') return 'top';
    if (this.listPosition === 'bottom') return 'bottom';

    // Auto positioning logic can be enhanced later if needed
    return 'bottom';
  }

  private getSelectedLabel(): string {
    if (!this.value) {
      return this.placeholder ?? '';
    }
    const items = this.getSlottedItems();
    const found = items.find(item => item.getAttribute('value') === this.value);
    return found?.getAttribute('label') ?? this.value;
  }

  /**
   * Update form validity
   */
  private updateValidity() {
    if (this.required && !this.value) {
      this.internals.setValidity({ valueMissing: true }, 'Please select an option', this.triggerEl);
    } else {
      this.internals.setValidity({});
    }
  }

  render() {
    const iconSize = this.size === SelectSize.SM ? IconSize.XS : IconSize.SM;
    const hasValue = !!this.value;
    const position = this.getDropdownPosition();
    const isActive = this.isOpen && !this.disabled;

    const hostClasses = {
      'is-open': this.isOpen,
      'inline': this.inline,
    };

    return (
      <Host class={hostClasses}>
        <button
          type="button"
          class="trigger"
          ref={el => (this.triggerEl = el)}
          id={this.selectId}
          disabled={this.disabled}
          aria-haspopup="listbox"
          aria-expanded={String(this.isOpen)}
          aria-controls={isActive ? 'select-listbox' : undefined}
          aria-activedescendant={isActive && this.focusedIndex >= 0 ? `select-option-${this.focusedIndex}` : undefined}
          aria-invalid={this.invalid ? 'true' : undefined}
          aria-required={this.required ? 'true' : undefined}
          onClick={this.handleTriggerClick}
          onKeyDown={undefined}
        >
          <span class={{ 'trigger-label': true, 'trigger-label--placeholder': !hasValue }}>
            {this.getSelectedLabel()}
          </span>
          <span class="trigger-icon">
            <cor-icon
              name={ICON_NAMES.CHEVRON__DOWN}
              size={iconSize}
              color={this.disabled ? 'neutral-icon-weakest' : 'neutral-icon-weak'}
            />
          </span>
        </button>

        <div
          id="select-listbox"
          class={{ 'dropdown': true, [`dropdown--${position}`]: true, 'dropdown--open': isActive }}
          role="listbox"
          aria-label="Select options"
          aria-hidden={String(!isActive)}
        >
          <slot />
        </div>
      </Host>
    );
  }
}
