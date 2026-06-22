import { Component, Element, Event, type EventEmitter, h, Host, Prop } from '@stencil/core';

import type { HeaderNavSelectDetail, HeaderNavToggleDetail } from './mud-header.types';

/**
 * Header navigation item — a top-bar entry inside `mud-header`'s `nav` slot.
 *
 * Renders as a link (`href`) or a button. Expandable items carry a trailing
 * chevron and toggle a mega-menu (wired by the consumer via `mudNavToggle`).
 *
 * @element mud-header-nav-item
 * @slot - The item label (overrides the `label` prop).
 * @part item - The interactive entry.
 */
@Component({
  tag: 'mud-header-nav-item',
  styleUrl: 'mud-header-nav-item.css',
  shadow: true,
})
export class MudHeaderNavItem {
  /** Value reported on activation. */
  @Prop({ reflect: true }) value?: string;

  /** Label text (overridden by slotted content). */
  @Prop() label?: string;

  /** Whether the item opens a dropdown/mega-menu (renders a trailing chevron). */
  @Prop({ reflect: true }) expandable = false;

  /** Whether the dropdown is open. */
  @Prop({ reflect: true, mutable: true }) expanded = false;

  /** Whether the item is the active/open entry. */
  @Prop({ reflect: true }) active = false;

  /** Whether the item is disabled. */
  @Prop({ reflect: true }) disabled = false;

  /** Optional trailing status tag (e.g. "În curând"). */
  @Prop() tag?: string;

  /** Render as a link to this destination. */
  @Prop() href?: string;

  @Element() host!: HTMLMudHeaderNavItemElement;

  /** Fired when a non-expandable item is activated. */
  @Event({ eventName: 'mudNavSelect', bubbles: true, composed: true })
  mudNavSelect!: EventEmitter<HeaderNavSelectDetail>;

  /** Fired when an expandable item is opened or closed. */
  @Event({ eventName: 'mudNavToggle', bubbles: true, composed: true })
  mudNavToggle!: EventEmitter<HeaderNavToggleDetail>;

  private handleClick = (ev: MouseEvent): void => {
    if (this.disabled) {
      ev.preventDefault();
      return;
    }
    if (this.expandable) {
      ev.preventDefault();
      this.expanded = !this.expanded;
      this.mudNavToggle.emit({ value: this.value ?? '', expanded: this.expanded });
      return;
    }
    this.mudNavSelect.emit({ value: this.value ?? '' });
  };

  private renderContent() {
    return [
      <span class="label">
        <slot>{this.label ?? ''}</slot>
      </span>,
      this.tag ? <mud-tag class="tag" type="outlined" semantic="neutral" size="md" label={this.tag}></mud-tag> : null,
      this.expandable ? (
        <mud-icon class="chevron" name="chevron-bottom-small" size={16} aria-hidden="true"></mud-icon>
      ) : null,
    ];
  }

  render() {
    const isLink = !!this.href && !this.expandable && !this.disabled;
    return (
      <Host>
        {isLink ? (
          <a class="item" part="item" href={this.href} onClick={this.handleClick}>
            {this.renderContent()}
          </a>
        ) : (
          <button
            class="item"
            part="item"
            type="button"
            disabled={this.disabled}
            aria-expanded={this.expandable ? (this.expanded ? 'true' : 'false') : undefined}
            onClick={this.handleClick}
          >
            {this.renderContent()}
          </button>
        )}
      </Host>
    );
  }
}
