import { Component, Host, h } from '@stencil/core';

/**
 * Table body container — inert wrapper for cor-row elements.
 * Purely structural, no props or state.
 *
 * @element cor-tbody
 * @slot - Default slot for cor-row elements
 */
@Component({
  tag: 'cor-tbody',
  styleUrl: 'cor-tbody.css',
  shadow: true,
})
export class CorTbody {
  render() {
    return (
      <Host role="rowgroup">
        <slot />
      </Host>
    );
  }
}
