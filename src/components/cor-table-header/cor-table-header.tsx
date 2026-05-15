import { Component, Host, Prop, h } from '@stencil/core';

/**
 * Table header container — provides title, description, and actions slots above the table.
 * Purely presentational with slot-based content. Consumer decides which components to use.
 *
 * @element cor-table-header
 * @slot title - Main heading slot (recommended: cor-typography variant="heading-md")
 * @slot description - Subtext below title (recommended: cor-typography variant="body-sm")
 * @slot actions - Right-side controls (buttons, inputs, filters)
 */
@Component({
  tag: 'cor-table-header',
  styleUrl: 'cor-table-header.css',
  shadow: true,
})
export class CorTableHeader {
  /**
   * Show bottom border line separating header from table content
   * @default true
   */
  @Prop({ reflect: true }) bottomLine: boolean = true;

  render() {
    return (
      <Host>
        <div class="content">
          <div class="text-container">
            <slot name="title" />
            <slot name="description" />
          </div>
          <div class="actions-container">
            <slot name="actions" />
          </div>
        </div>
      </Host>
    );
  }
}
