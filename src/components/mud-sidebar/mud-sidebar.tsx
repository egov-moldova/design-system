import { Component, Element, h, Host, Prop, State, Watch } from '@stencil/core';

import { observeAriaLabel } from '../../utils/aria-label';

/**
 * Sidebar — a vertical navigation panel composed of `mud-sidebar-group`
 * sections and `mud-sidebar-item` rows.
 *
 * Set the native `aria-label` attribute on the host for an accessible name on
 * the navigation landmark.
 *
 * @element mud-sidebar
 * @slot - `mud-sidebar-group` and/or `mud-sidebar-item` elements.
 * @part sidebar - The bordered navigation surface.
 */
@Component({
  tag: 'mud-sidebar',
  styleUrl: 'mud-sidebar.css',
  shadow: true,
})
export class MudSidebar {
  /** Collapse to the icon-only compact rail. */
  @Prop({ reflect: true }) collapsed = false;

  /** The host's `aria-label`, forwarded onto the inner `<nav>` landmark. */
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudSidebarElement;

  private stopAriaLabel?: () => void;

  connectedCallback(): void {
    this.stopAriaLabel = observeAriaLabel(this.host, label => (this.resolvedAriaLabel = label));
  }

  disconnectedCallback(): void {
    this.stopAriaLabel?.();
  }

  @Watch('collapsed')
  handleCollapsedChange(): void {
    this.propagateCollapsed();
  }

  componentDidLoad(): void {
    this.propagateCollapsed();
  }

  private handleSlotChange = (): void => {
    this.propagateCollapsed();
  };

  private propagateCollapsed(): void {
    const descendants = this.host.querySelectorAll<HTMLElement>('mud-sidebar-group, mud-sidebar-item');
    descendants.forEach(el => {
      (el as HTMLMudSidebarGroupElement | HTMLMudSidebarItemElement).collapsed = this.collapsed;
    });
  }

  render() {
    return (
      <Host>
        <nav class="sidebar" part="sidebar" aria-label={this.resolvedAriaLabel}>
          <slot onSlotchange={this.handleSlotChange}></slot>
        </nav>
      </Host>
    );
  }
}
