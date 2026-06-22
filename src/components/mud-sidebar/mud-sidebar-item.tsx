import { Component, Element, Event, type EventEmitter, h, Host, Prop } from '@stencil/core';

import type { SidebarItemSelectDetail, SidebarItemToggleDetail } from './mud-sidebar.types';

/**
 * Sidebar item — a single navigation row inside a `mud-sidebar` / `mud-sidebar-group`.
 *
 * Renders as a link when `href` is set, otherwise a button. Expandable items
 * toggle a nested list (the `children` slot) and rotate a chevron.
 *
 * @element mud-sidebar-item
 * @slot - The primary label (overrides the `label` prop).
 * @slot children - Nested `mud-sidebar-item` elements revealed when expanded.
 * @part item - The interactive row.
 */
@Component({
  tag: 'mud-sidebar-item',
  styleUrl: 'mud-sidebar-item.css',
  shadow: true,
})
export class MudSidebarItem {
  /** Value reported when the item is activated. */
  @Prop({ reflect: true }) value?: string;

  /** Leading icon name. */
  @Prop() icon?: string;

  /** Leading icon name used while active (e.g. a filled variant). Falls back to `icon`. */
  @Prop() iconActive?: string;

  /** Primary label (overridden by slotted content). */
  @Prop() label?: string;

  /** Optional right-aligned secondary label. */
  @Prop() secondary?: string;

  /** Optional trailing tag text (rendered as an outlined `mud-tag`). */
  @Prop() tag?: string;

  /** Optional trailing numbered badge count (rendered as a `mud-badge`). */
  @Prop() badge?: number;

  /** Render as a link to this destination. */
  @Prop() href?: string;

  /** Whether the item expands a nested list of children. */
  @Prop({ reflect: true }) expandable = false;

  /** Whether the nested list is expanded. */
  @Prop({ reflect: true, mutable: true }) expanded = false;

  /** Whether this item represents the current page/section. */
  @Prop({ reflect: true }) active = false;

  /** Whether the item is disabled. */
  @Prop({ reflect: true }) disabled = false;

  /** Collapsed (icon-only) rail — propagated by the parent `mud-sidebar`. @internal */
  @Prop({ reflect: true, mutable: true }) collapsed = false;

  @Element() host!: HTMLMudSidebarItemElement;

  /** Fired when a non-expandable item is activated. */
  @Event({ eventName: 'mudSelect', bubbles: true, composed: true })
  mudSelect!: EventEmitter<SidebarItemSelectDetail>;

  /** Fired when an expandable item is expanded or collapsed. */
  @Event({ eventName: 'mudToggle', bubbles: true, composed: true })
  mudToggle!: EventEmitter<SidebarItemToggleDetail>;

  private handleClick = (ev: MouseEvent): void => {
    if (this.disabled) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (this.expandable) {
      ev.preventDefault();
      this.expanded = !this.expanded;
      this.mudToggle.emit({ value: this.value ?? '', expanded: this.expanded });
      return;
    }
    this.mudSelect.emit({ value: this.value ?? '' });
  };

  private renderContent() {
    const iconName = this.active && this.iconActive ? this.iconActive : this.icon;
    return [
      iconName ? <mud-icon class="icon" name={iconName} size={20} aria-hidden="true"></mud-icon> : null,
      <span class="label">
        <slot>{this.label ?? ''}</slot>
      </span>,
      this.secondary ? <span class="secondary">{this.secondary}</span> : null,
      this.tag ? <mud-tag class="tag" type="outlined" semantic="neutral" size="md" label={this.tag}></mud-tag> : null,
      this.badge != null ? <span class="badge">{this.badge}</span> : null,
      this.expandable ? <mud-icon class="chevron" name="chevron-bottom" size={24} aria-hidden="true"></mud-icon> : null,
    ];
  }

  render() {
    const isLink = !!this.href && !this.expandable;
    return (
      <Host role="listitem">
        {isLink ? (
          <a
            class="item"
            part="item"
            href={this.disabled ? undefined : this.href}
            aria-current={this.active ? 'page' : undefined}
            aria-disabled={this.disabled ? 'true' : undefined}
            onClick={this.handleClick}
          >
            {this.renderContent()}
          </a>
        ) : (
          <button
            class="item"
            part="item"
            type="button"
            disabled={this.disabled}
            aria-current={this.active && !this.expandable ? 'page' : undefined}
            aria-expanded={this.expandable ? (this.expanded ? 'true' : 'false') : undefined}
            onClick={this.handleClick}
          >
            {this.renderContent()}
          </button>
        )}
        {this.expandable ? (
          <div class="children" role="list" hidden={!this.expanded}>
            <slot name="children"></slot>
          </div>
        ) : null}
      </Host>
    );
  }
}
