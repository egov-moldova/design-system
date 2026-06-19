import { Component, Element, h, Host, Prop, Watch } from '@stencil/core';

/**
 * Sidebar — a vertical navigation panel composed of `mud-sidebar-group`
 * sections and `mud-sidebar-item` rows.
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

  /** Accessible name for the navigation landmark. */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Element() host!: HTMLMudSidebarElement;

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
        <nav class="sidebar" part="sidebar" aria-label={this.ariaLabel ?? undefined}>
          <slot onSlotchange={this.handleSlotChange}></slot>
        </nav>
      </Host>
    );
  }
}
