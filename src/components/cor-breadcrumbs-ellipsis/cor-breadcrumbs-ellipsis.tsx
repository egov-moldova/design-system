import { Component, Host, Element, Prop, State, Event, EventEmitter, Listen, h } from '@stencil/core';

import { BreadcrumbsEllipsisListPosition } from './cor-breadcrumbs-ellipsis.enums';
import { BreadcrumbsEllipsisItemClickEvent } from './cor-breadcrumbs-ellipsis.types';

/**
 * Breadcrumbs ellipsis button — renders a "..." button with a dropdown of hidden breadcrumb items.
 *
 * @element cor-breadcrumbs-ellipsis
 * @slot default - cor-select-item elements with variant="label-only" and value attribute
 */
@Component({
  tag: 'cor-breadcrumbs-ellipsis',
  styleUrl: 'cor-breadcrumbs-ellipsis.css',
  shadow: true,
})
export class CorBreadcrumbsEllipsis {
  /**
   * Disables the ellipsis button and all dropdown items.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Position of the dropdown list relative to the button.
   * @default auto
   */
  @Prop() listPosition: BreadcrumbsEllipsisListPosition = BreadcrumbsEllipsisListPosition.AUTO;

  /**
   * Host element reference.
   */
  @Element() host!: HTMLElement;

  /**
   * Whether the dropdown is currently open.
   */
  @State() isOpen: boolean = false;

  /**
   * Index of the currently focused item in the dropdown.
   */
  @State() private focusedIndex: number = -1;

  /**
   * Resolved dropdown position after measuring the rendered element.
   */
  @State() private dropdownPosition: 'top' | 'bottom' = 'bottom';

  /**
   * Emitted when a dropdown item is clicked.
   */
  @Event() corEllipsisItemClick!: EventEmitter<BreadcrumbsEllipsisItemClickEvent>;

  /**
   * Emitted when the dropdown opens.
   */
  @Event() corEllipsisOpen!: EventEmitter<void>;

  /**
   * Emitted when the dropdown closes.
   */
  @Event() corEllipsisClose!: EventEmitter<void>;

  private dropdownEl?: HTMLElement;
  private buttonEl?: HTMLButtonElement;
  private skipNextDocumentClick = false;
  /** AbortController per slot item — keyed by the element itself */
  private itemControllers = new WeakMap<HTMLElement, AbortController>();
  /** Slot element ref for slotchange listener cleanup */
  private slotEl?: HTMLSlotElement;

  @Listen('click', { target: 'document' })
  handleDocumentClick(event: MouseEvent) {
    if (!this.isOpen) return;
    if (this.skipNextDocumentClick) {
      this.skipNextDocumentClick = false;
      return;
    }
    const path = event.composedPath();
    if (!path.includes(this.host)) {
      this.closeDropdown();
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
        this.closeDropdown();
        this.buttonEl?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusedIndex = this.focusedIndex === -1 ? 0 : Math.min(this.focusedIndex + 1, items.length - 1);
        this.applyFocusedItem(items);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.focusedIndex <= 0) {
          this.focusedIndex = -1;
          this.clearFocusedItem(items);
        } else {
          this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
          this.applyFocusedItem(items);
        }
        break;
      case 'Home':
        event.preventDefault();
        if (items.length > 0) {
          this.focusedIndex = 0;
          this.applyFocusedItem(items);
        }
        break;
      case 'End':
        event.preventDefault();
        if (items.length > 0) {
          this.focusedIndex = items.length - 1;
          this.applyFocusedItem(items);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.focusedIndex >= 0 && this.focusedIndex < items.length) {
          const item = items[this.focusedIndex];
          const itemValue = item.getAttribute('value');
          if (itemValue !== null) {
            this.corEllipsisItemClick.emit({ value: itemValue });
            this.closeDropdown();
            this.buttonEl?.focus();
          }
        }
        break;
      case 'Tab':
        this.closeDropdown();
        break;
    }
  }

  componentDidRender() {
    if (this.isOpen && this.listPosition === BreadcrumbsEllipsisListPosition.AUTO && this.dropdownEl) {
      const rect = this.host.getBoundingClientRect();
      const dropdownHeight = this.dropdownEl.getBoundingClientRect().height;
      const spaceBelow = window.innerHeight - rect.bottom;
      const resolved: 'top' | 'bottom' = spaceBelow < dropdownHeight && rect.top > dropdownHeight ? 'top' : 'bottom';
      if (resolved !== this.dropdownPosition) {
        this.dropdownPosition = resolved;
      }
    }
  }

  disconnectedCallback() {
    this.cleanupAllItemListeners();
    if (this.slotEl) {
      this.slotEl.removeEventListener('slotchange', this.handleSlotChange);
    }
  }

  private getSlottedItems(): HTMLElement[] {
    const slot = this.host.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    if (slot) {
      const assigned = slot
        .assignedElements({ flatten: true })
        .filter((el): el is HTMLElement => el instanceof HTMLElement);
      if (assigned.length > 0) return assigned;
    }
    return Array.from(this.host.querySelectorAll<HTMLElement>('cor-select-item'));
  }

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

  private closeDropdown() {
    const items = this.getSlottedItems();
    this.isOpen = false;
    this.focusedIndex = -1;
    this.clearFocusedItem(items);
    this.dropdownPosition = 'bottom';
    this.corEllipsisClose.emit();
  }

  private openDropdown() {
    this.skipNextDocumentClick = true;
    this.isOpen = true;
    this.focusedIndex = -1;
    this.clearFocusedItem(this.getSlottedItems());
    this.corEllipsisOpen.emit();
  }

  private handleButtonClick = () => {
    if (this.disabled) return;
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  };

  private cleanupAllItemListeners() {
    const items = this.getSlottedItems();
    items.forEach(item => {
      const controller = this.itemControllers.get(item);
      if (controller) {
        controller.abort();
        this.itemControllers.delete(item);
      }
    });
  }

  private handleSlotChange = () => {
    this.cleanupAllItemListeners();

    const items = this.getSlottedItems();

    if (this.isOpen && this.focusedIndex >= items.length) {
      this.focusedIndex = items.length - 1;
    }

    items.forEach((item, i) => {
      item.id = `ellipsis-option-${i}`;
      const controller = new AbortController();
      this.itemControllers.set(item, controller);
      item.addEventListener(
        'corSelectionChange',
        (e: Event) => {
          const target = e.target as HTMLElement;
          const value = target.getAttribute('value') ?? '';
          this.corEllipsisItemClick.emit({ value });
          this.closeDropdown();
          this.buttonEl?.focus();
        },
        { signal: controller.signal },
      );
    });
  };

  private resolvedPosition(): 'top' | 'bottom' {
    if (this.listPosition === BreadcrumbsEllipsisListPosition.TOP) return 'top';
    if (this.listPosition === BreadcrumbsEllipsisListPosition.BOTTOM) return 'bottom';
    return this.dropdownPosition;
  }

  render() {
    const position = this.resolvedPosition();

    return (
      <Host class={{ 'is-open': this.isOpen }}>
        <button
          type="button"
          class="ellipsis-btn"
          disabled={this.disabled}
          aria-label="Show hidden breadcrumbs"
          aria-expanded={String(this.isOpen)}
          aria-haspopup="listbox"
          aria-controls={this.isOpen ? 'ellipsis-listbox' : undefined}
          aria-activedescendant={
            this.isOpen && this.focusedIndex >= 0 ? `ellipsis-option-${this.focusedIndex}` : undefined
          }
          tabIndex={this.disabled ? -1 : 0}
          onClick={this.handleButtonClick}
          ref={el => (this.buttonEl = el)}
        >
          <span class="ellipsis-label">…</span>
        </button>

        {this.isOpen && (
          <div
            id="ellipsis-listbox"
            class={`dropdown dropdown--${position}`}
            role="listbox"
            aria-label="Hidden breadcrumbs"
            ref={el => (this.dropdownEl = el)}
          >
            <slot ref={el => (this.slotEl = el as HTMLSlotElement)} onSlotchange={this.handleSlotChange}></slot>
          </div>
        )}
      </Host>
    );
  }
}
