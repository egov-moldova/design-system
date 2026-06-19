import { Component, Element, Event, type EventEmitter, h, Host, Listen, Prop, Watch } from '@stencil/core';

import type { MenuChangeDetail, MenuItemSelectDetail, MenuSelectDetail, MenuType } from './mud-menu.types';

/**
 * Menu — a floating panel of choosable options, composed of `mud-menu-item` children.
 *
 * Two flavours via `type`:
 * - `selection` — single-select list (ARIA `listbox`), selected item shows a trailing checkmark.
 * - `contextual` — action menu (ARIA `menu`), items may carry a leading checkbox/radio/icon.
 *
 * The panel is the visual + interaction primitive (keyboard roving, selection, scroll).
 * Anchoring/positioning relative to a trigger is the consumer's responsibility; bind `open`
 * and listen for `mudClose` (Escape / `closeOnSelect`) to drive popover behaviour.
 *
 * @element mud-menu
 * @slot - The `mud-menu-item` elements.
 * @part panel - The scrollable panel surface.
 */
@Component({
  tag: 'mud-menu',
  styleUrl: 'mud-menu.css',
  shadow: true,
})
export class MudMenu {
  /** Menu semantics: `selection` (single-select list) or `contextual` (actions). */
  @Prop({ reflect: true }) type: MenuType = 'contextual';

  /** Whether the panel is shown. Set `false` to hide it when used as a popover. */
  @Prop({ reflect: true, mutable: true }) open = true;

  /** Currently selected value (selection menus). */
  @Prop({ reflect: true, mutable: true }) value?: string;

  /** Accessible name for the menu. */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /** Emit `mudClose` immediately after an item is selected. */
  @Prop() closeOnSelect = false;

  @Element() host!: HTMLMudMenuElement;

  /** Fired when any item is activated. */
  @Event({ eventName: 'mudSelect', bubbles: true, composed: true })
  mudSelect!: EventEmitter<MenuSelectDetail>;

  /** Fired when the selected value changes (selection menus only). */
  @Event({ eventName: 'mudChange', bubbles: true, composed: true })
  mudChange!: EventEmitter<MenuChangeDetail>;

  /** Fired when the menu requests to close (Escape key, or `closeOnSelect`). */
  @Event({ eventName: 'mudClose', bubbles: true, composed: true })
  mudClose!: EventEmitter<void>;

  @Watch('type')
  @Watch('value')
  handleReflectedChange(): void {
    this.propagateToItems();
  }

  @Listen('mudMenuItemSelect')
  handleItemSelect(ev: CustomEvent<MenuItemSelectDetail>): void {
    ev.stopPropagation();
    const value = ev.detail?.value ?? '';
    if (this.type === 'selection' && this.value !== value) {
      this.value = value;
      this.propagateToItems();
      this.mudChange.emit({ value });
    }
    this.mudSelect.emit({ value });
    if (this.closeOnSelect) this.mudClose.emit();
  }

  @Listen('keydown')
  handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.mudClose.emit();
      return;
    }
    const items = this.enabledItems();
    if (items.length === 0) return;
    const currentIndex = items.findIndex(item => item === this.focusedItem());
    let targetIndex: number;
    switch (ev.key) {
      case 'ArrowDown':
        targetIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
        targetIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = items.length - 1;
        break;
      default:
        return;
    }
    ev.preventDefault();
    this.focusItem(items[targetIndex]);
  }

  componentDidLoad(): void {
    this.propagateToItems();
    this.resetRovingTabindex();
  }

  private handleSlotChange = (): void => {
    this.propagateToItems();
    this.resetRovingTabindex();
  };

  private queryItems(): HTMLMudMenuItemElement[] {
    return Array.from(this.host.children).filter(
      (el): el is HTMLMudMenuItemElement => el.tagName === 'MUD-MENU-ITEM',
    );
  }

  private enabledItems(): HTMLMudMenuItemElement[] {
    return this.queryItems().filter(item => !item.disabled && !item.heading);
  }

  private propagateToItems(): void {
    for (const item of this.queryItems()) {
      item.type = this.type;
      if (this.type === 'selection') {
        item.selected = item.value != null && item.value === this.value;
      }
    }
  }

  private resetRovingTabindex(): void {
    this.enabledItems().forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1;
    });
  }

  private focusedItem(): HTMLMudMenuItemElement | undefined {
    const active = document.activeElement;
    return this.enabledItems().find(item => item === active);
  }

  private focusItem(item: HTMLMudMenuItemElement | undefined): void {
    if (!item) return;
    for (const sibling of this.enabledItems()) {
      sibling.tabIndex = sibling === item ? 0 : -1;
    }
    void item.setFocus();
  }

  render() {
    return (
      <Host>
        <div class="panel" part="panel" role={this.type === 'selection' ? 'listbox' : 'menu'} aria-label={this.ariaLabel ?? undefined}>
          <slot onSlotchange={this.handleSlotChange}></slot>
        </div>
      </Host>
    );
  }
}
