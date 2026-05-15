import { Component, Element, Event, EventEmitter, h, Host, Listen, Prop, State, Watch } from '@stencil/core';

import { SortingSize } from './cor-sorting.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

/**
 * A controlled sorting/dropdown selector that displays a label + current value with a chevron.
 * Clicking opens an options list. Consumer slots `<cor-select-item variant="label-only">` children.
 * Supports keyboard navigation and controlled usage.
 *
 * @element cor-sorting
 * @slot - Default slot for `cor-select-item` option elements
 */
@Component({
  tag: 'cor-sorting',
  styleUrl: 'cor-sorting.css',
  shadow: true,
})
export class CorSorting {
  /**
   * Currently selected value (controlled). Matches the `value` prop of a slotted `cor-select-item`.
   * If unset, the label of the first slotted item is displayed.
   */
  @Prop() value?: string;

  /**
   * Size variant.
   * @default md
   */
  @Prop({ reflect: true }) size: SortingSize = SortingSize.MD;

  /**
   * Disables the component.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Label text shown before the selected value.
   */
  @Prop() label: string = '';

  @State() private isOpen: boolean = false;
  @State() private focusedIndex: number = -1;

  @Element() host!: HTMLElement;

  /**
   * Emitted when the user selects an option. Payload is the `value` of the selected `cor-select-item`.
   */
  @Event() corSortingChange!: EventEmitter<string>;

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
      this.focusedIndex = -1;
    }
  }

  @Listen('keydown')
  handleKeydown(event: KeyboardEvent) {
    if (this.disabled) return;

    if (!this.isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openDropdown();
      }
      return;
    }

    const items = this.getSlottedItems();

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.isOpen = false;
        this.focusedIndex = -1;
        this.clearFocusedItem(items);
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
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.focusedIndex >= 0 && this.focusedIndex < items.length) {
          const item = items[this.focusedIndex];
          const itemValue = item.getAttribute('value');
          if (itemValue !== null) {
            this.isOpen = false;
            this.focusedIndex = -1;
            this.clearFocusedItem(items);
            this.corSortingChange.emit(itemValue);
          }
        }
        break;
      case 'Tab':
        this.isOpen = false;
        this.focusedIndex = -1;
        this.clearFocusedItem(items);
        break;
    }
  }

  componentDidLoad() {
    this.syncSelectedState();
    this.host.addEventListener('corSelectionChange', this.handleSlottedItemSelect);
  }

  disconnectedCallback() {
    this.host.removeEventListener('corSelectionChange', this.handleSlottedItemSelect);
  }

  private skipNextDocumentClick = false;

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
      item.id = `sorting-option-${i}`;
    });
  }

  private handleSlottedItemSelect = (event: Event) => {
    const target = event.target as HTMLElement;
    const itemValue = target.getAttribute('value');
    if (itemValue !== null && this.isOpen) {
      this.isOpen = false;
      this.focusedIndex = -1;
      this.corSortingChange.emit(itemValue);
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

  private openDropdown() {
    this.skipNextDocumentClick = true;
    this.isOpen = true;
    const items = this.getSlottedItems();
    const selectedIdx = items.findIndex(item => item.getAttribute('value') === this.value);
    this.focusedIndex = selectedIdx >= 0 ? selectedIdx : 0;
    this.applyFocusedItem(items);
  }

  private toggleDropdown() {
    if (this.disabled) return;
    if (this.isOpen) {
      this.isOpen = false;
      this.focusedIndex = -1;
      this.clearFocusedItem(this.getSlottedItems());
    } else {
      this.openDropdown();
    }
  }

  private getSelectedLabel(): string {
    const items = this.getSlottedItems();
    if (this.value !== undefined) {
      const found = items.find(item => item.getAttribute('value') === this.value);
      return found
        ? (found.getAttribute('label') ?? items[0]?.getAttribute('label') ?? '')
        : (items[0]?.getAttribute('label') ?? '');
    }
    return items[0]?.getAttribute('label') ?? '';
  }

  render() {
    const selectedLabel = this.getSelectedLabel();
    const isActive = this.isOpen && !this.disabled;

    return (
      <Host
        class={{
          'is-open': isActive,
          'is-disabled': this.disabled,
        }}
      >
        <button
          class="trigger"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={String(isActive)}
          aria-controls={isActive ? 'sorting-listbox' : undefined}
          aria-activedescendant={isActive && this.focusedIndex >= 0 ? `sorting-option-${this.focusedIndex}` : undefined}
          aria-disabled={this.disabled ? 'true' : undefined}
          disabled={this.disabled}
          tabIndex={this.disabled ? -1 : 0}
          onClick={() => this.toggleDropdown()}
        >
          {this.label && <span class="label">{this.label}</span>}
          <span class="selected-value-wrap">
            <span class={`selected-value${isActive ? ' selected-value--active' : ''}`}>{selectedLabel}</span>
            <span class={`chevron${isActive ? ' chevron--up' : ''}`} aria-hidden="true">
              <cor-icon name={ICON_NAMES.CHEVRON__DOWN} color="currentColor" />
            </span>
          </span>
        </button>

        <div
          id="sorting-listbox"
          class={{ 'dropdown': true, 'dropdown--open': isActive }}
          role="listbox"
          aria-label={this.label || 'Sort options'}
          aria-hidden={String(!isActive)}
        >
          <slot />
        </div>
      </Host>
    );
  }
}
