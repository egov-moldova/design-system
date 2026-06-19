import { Component, h, Host, Prop } from '@stencil/core';

/**
 * Sidebar group — a labelled section of `mud-sidebar-item` rows.
 *
 * A divider is rendered automatically above every group except the first.
 *
 * @element mud-sidebar-group
 * @slot - `mud-sidebar-item` elements.
 * @part heading - The section heading label.
 */
@Component({
  tag: 'mud-sidebar-group',
  styleUrl: 'mud-sidebar-group.css',
  shadow: true,
})
export class MudSidebarGroup {
  /** Section heading label. */
  @Prop() heading?: string;

  /** Collapsed (icon-only) rail — propagated by the parent `mud-sidebar`. @internal */
  @Prop({ reflect: true, mutable: true }) collapsed = false;

  render() {
    return (
      <Host>
        <div class="divider" aria-hidden="true">
          <mud-separator variant="subtle" size="thin"></mud-separator>
        </div>
        {this.heading ? (
          <div class="heading" part="heading">
            {this.heading}
          </div>
        ) : null}
        <div class="list" role="list">
          <slot></slot>
        </div>
      </Host>
    );
  }
}
