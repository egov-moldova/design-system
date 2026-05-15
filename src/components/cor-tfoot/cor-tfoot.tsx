import { Component, Host, Prop, h } from '@stencil/core';

/**
 * Table footer container — wraps pagination, controls, or summary content.
 * Consumer slots in any footer content (e.g., cor-pagination).
 *
 * @element cor-tfoot
 * @slot - Default slot for footer content (pagination, controls, summary)
 */
@Component({
  tag: 'cor-tfoot',
  styleUrl: 'cor-tfoot.css',
  shadow: true,
})
export class CorTfoot {
  /**
   * Show top border line separating footer from body
   * @default true
   */
  @Prop({ reflect: true }) topLine: boolean = true;

  render() {
    return (
      <Host role="rowgroup">
        <slot />
      </Host>
    );
  }
}
