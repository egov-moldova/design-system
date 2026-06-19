import { Component, Element, Event, type EventEmitter, h, Host, Method, Prop } from '@stencil/core';

import type { MenuItemLeading, MenuItemSelectDetail, MenuType } from './mud-menu.types';

/**
 * Menu item — a single row inside a `mud-menu`.
 *
 * Pattern: the host element is the focusable, role-bearing control. Roving
 * `tabindex` is managed imperatively by the parent `mud-menu`. The item emits
 * `mudMenuItemSelect` (bubbling) on activation; the parent coordinates selection.
 *
 * @element mud-menu-item
 * @slot - The item label / content.
 * @part item - The item row wrapper.
 */
@Component({
  tag: 'mud-menu-item',
  styleUrl: 'mud-menu-item.css',
  shadow: true,
})
export class MudMenuItem {
  /** Value reported when the item is activated. */
  @Prop({ reflect: true }) value?: string;

  /** Leading element rendered before the label. */
  @Prop({ reflect: true }) leading: MenuItemLeading = 'none';

  /** Icon name to render when `leading="icon"`. */
  @Prop() icon?: string;

  /** Whether the item is selected (selection menus) or checked (checkbox/radio leading). */
  @Prop({ reflect: true, mutable: true }) selected = false;

  /** Whether the item is disabled and non-interactive. */
  @Prop({ reflect: true }) disabled = false;

  /** Render as a non-interactive section heading (separator + tertiary label). */
  @Prop({ reflect: true }) heading = false;

  /** Fallback text label when no content is slotted. */
  @Prop() label?: string;

  /**
   * Menu type — propagated by the parent `mud-menu`. Controls ARIA role and
   * whether `selected` renders as a trailing checkmark (selection) vs. a
   * leading checkbox/radio (contextual).
   * @internal
   */
  @Prop({ reflect: true, mutable: true }) type: MenuType = 'contextual';

  @Element() host!: HTMLMudMenuItemElement;

  /** Fired when the item is activated via click, Enter or Space. */
  @Event({ eventName: 'mudMenuItemSelect', bubbles: true, composed: true })
  mudMenuItemSelect!: EventEmitter<MenuItemSelectDetail>;

  /** Move keyboard focus to this item. Used by the parent for roving navigation. */
  @Method()
  async setFocus(): Promise<void> {
    this.host.focus();
  }

  private handleClick = (ev: MouseEvent): void => {
    if (!this.isInteractive()) {
      ev.stopPropagation();
      return;
    }
    this.activate();
  };

  private handleKeyDown = (ev: KeyboardEvent): void => {
    if (!this.isInteractive()) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.activate();
    }
  };

  private isInteractive(): boolean {
    return !this.heading && !this.disabled;
  }

  private activate(): void {
    this.mudMenuItemSelect.emit({ value: this.value ?? '' });
  }

  private resolveRole(): string {
    if (this.heading) return 'presentation';
    if (this.type === 'selection') return 'option';
    if (this.leading === 'checkbox') return 'menuitemcheckbox';
    if (this.leading === 'radio') return 'menuitemradio';
    return 'menuitem';
  }

  private renderLeading() {
    if (this.leading === 'icon') {
      return this.icon ? (
        <mud-icon class="leading-icon" name={this.icon} size={20} aria-hidden="true"></mud-icon>
      ) : null;
    }
    if (this.leading === 'checkbox') {
      return (
        <mud-checkbox class="leading-control" checked={this.selected} disabled={this.disabled} inert={true}></mud-checkbox>
      );
    }
    if (this.leading === 'radio') {
      return (
        <mud-radio class="leading-control" checked={this.selected} disabled={this.disabled} inert={true}></mud-radio>
      );
    }
    return null;
  }

  render() {
    if (this.heading) {
      return (
        <Host role="presentation">
          <div class="separator" aria-hidden="true"></div>
          <div class="heading">
            <slot>{this.label ?? ''}</slot>
          </div>
        </Host>
      );
    }

    const isSelection = this.type === 'selection';
    const isChoice = this.leading === 'checkbox' || this.leading === 'radio';
    const showTrailingCheck = isSelection && this.selected;

    return (
      <Host
        role={this.resolveRole()}
        aria-selected={isSelection ? (this.selected ? 'true' : 'false') : undefined}
        aria-checked={isChoice ? (this.selected ? 'true' : 'false') : undefined}
        aria-disabled={this.disabled ? 'true' : undefined}
        class={{ 'has-trailing': showTrailingCheck }}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        <div class="item" part="item">
          {this.renderLeading()}
          <span class="label">
            <slot>{this.label ?? ''}</slot>
          </span>
          {showTrailingCheck ? <mud-icon class="check" name="checkmark-small" size={20} aria-hidden="true"></mud-icon> : null}
        </div>
      </Host>
    );
  }
}
