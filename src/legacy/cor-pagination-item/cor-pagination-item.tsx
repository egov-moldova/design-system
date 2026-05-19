import { Component, Host, Element, Prop, State, Event, EventEmitter, Listen, h } from '@stencil/core';

import { PaginationItemListPosition, PaginationItemSize, PaginationItemType } from './cor-pagination-item.enums';
import { IconSize } from '../cor-icon/cor-icon.types';

const DROPDOWN_OPTION_HEIGHT_PX = 44;
const DROPDOWN_MAX_HEIGHT_PX = 220;

/**
 * Individual pagination button — renders a page number, navigation icon, or collapsed "..." with options list.
 *
 * @element cor-pagination-item
 */
@Component({
  tag: 'cor-pagination-item',
  styleUrl: 'cor-pagination-item.css',
  shadow: true,
})
export class CorPaginationItem {
  /**
   * Size of the item
   * @default lg
   */
  @Prop({ reflect: true }) size: PaginationItemSize = PaginationItemSize.LG;

  /**
   * Type of the item
   * @default number
   */
  @Prop({ reflect: true }) itemType: PaginationItemType = PaginationItemType.NUMBER;

  /**
   * Page number this item represents (for number and collapsed types)
   */
  @Prop() page: number = 0;

  /**
   * Carbon icon name (for icon type)
   */
  @Prop() icon: string = '';

  /**
   * Accessible label for icon buttons
   */
  @Prop() iconLabel: string = '';

  /**
   * Whether this item represents the currently selected page
   * @default false
   */
  @Prop({ reflect: true }) selected: boolean = false;

  /**
   * Disables the item
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Shows the skeleton loading state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Pages to show in the collapsed dropdown (for itemType=collapsed)
   */
  @Prop() collapsedPages: number[] = [];

  /**
   * Position of the dropdown list relative to the button
   * @default auto
   */
  @Prop() listPosition: PaginationItemListPosition = PaginationItemListPosition.AUTO;

  /**
   * Whether the collapsed dropdown is open
   */
  @State() isOpen: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  /**
   * Emitted when a page number is clicked
   */
  @Event() corItemClick!: EventEmitter<{ page: number }>;

  private dropdownEl?: HTMLElement;
  private skipNextDocumentClick = false;

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
    }
  }

  @Listen('keydown', { target: 'document' })
  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isOpen) {
      this.isOpen = false;
      event.stopPropagation();
    }
  }

  private handleButtonClick = () => {
    if (this.disabled || this.skeleton) return;

    if (this.itemType === PaginationItemType.COLLAPSED) {
      this.skipNextDocumentClick = true;
      this.isOpen = !this.isOpen;
    } else if (this.itemType === PaginationItemType.ICON) {
      this.corItemClick.emit({ page: this.page });
    } else if (this.page > 0) {
      this.corItemClick.emit({ page: this.page });
    }
  };

  private handleOptionClick = (page: number) => {
    this.isOpen = false;
    this.corItemClick.emit({ page });
  };

  private getDropdownPosition(): 'top' | 'bottom' {
    if (this.listPosition === PaginationItemListPosition.TOP) return 'top';
    if (this.listPosition === PaginationItemListPosition.BOTTOM) return 'bottom';

    if (this.dropdownEl) {
      const rect = this.host.getBoundingClientRect();
      const dropdownHeight = Math.min(this.collapsedPages.length * DROPDOWN_OPTION_HEIGHT_PX, DROPDOWN_MAX_HEIGHT_PX);
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        return 'top';
      }
    }
    return 'bottom';
  }

  private getHostClasses(): string {
    return this.isOpen ? 'is-open' : '';
  }

  private renderContent() {
    if (this.skeleton) {
      return <cor-skeleton class="item-skeleton" aria-hidden="true"></cor-skeleton>;
    }

    if (this.itemType === PaginationItemType.ICON) {
      return (
        <cor-icon
          name={this.icon}
          size={this.size === PaginationItemSize.SM ? IconSize.SM : IconSize.MD}
          color={this.disabled ? 'neutral-icon-weakest' : 'neutral-icon-weak'}
        />
      );
    }

    if (this.itemType === PaginationItemType.COLLAPSED) {
      return <span class="label">…</span>;
    }

    return <span class="label">{this.page}</span>;
  }

  private renderDropdown() {
    if (!this.isOpen || this.itemType !== PaginationItemType.COLLAPSED) return null;

    const position = this.getDropdownPosition();

    return (
      <ul
        class={`dropdown dropdown--${position}`}
        role="listbox"
        aria-label="Jump to page"
        ref={el => (this.dropdownEl = el)}
      >
        {this.collapsedPages.map(p => (
          <li key={p} role="option" aria-selected="false" class="dropdown-option">
            <button type="button" class="dropdown-option-btn" onClick={() => this.handleOptionClick(p)}>
              {p}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  render() {
    const isIcon = this.itemType === PaginationItemType.ICON;
    const label = isIcon ? this.iconLabel : `Page ${this.page}`;
    const isCollapsed = this.itemType === PaginationItemType.COLLAPSED;

    return (
      <Host class={this.getHostClasses()}>
        <button
          type="button"
          class="item-btn"
          disabled={this.disabled || this.skeleton}
          aria-label={isCollapsed ? 'Show more pages' : label}
          aria-current={this.selected ? 'page' : undefined}
          aria-expanded={isCollapsed ? String(this.isOpen) : undefined}
          aria-haspopup={isCollapsed ? 'listbox' : undefined}
          onClick={this.handleButtonClick}
        >
          {this.renderContent()}
        </button>
        {this.renderDropdown()}
      </Host>
    );
  }
}
