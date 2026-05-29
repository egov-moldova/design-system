import { Component, Host, Prop, h } from '@stencil/core';

import type { ButtonGroupOrientation } from './mud-button-group.types';

/**
 * Button group — layout container for stacking multiple `mud-button` elements
 * with consistent spacing (12px gap) per the AGE Design System.
 *
 * Pure layout primitive: does not propagate props to children, does not emit
 * events, does not manage focus order beyond the natural DOM tab sequence.
 * Each child `mud-button` controls its own size, variant, and full-width
 * behavior independently.
 *
 * @element mud-button-group
 *
 * @slot - (default) One or more `mud-button` elements (or any inline content
 *               that should share the group's spacing semantics).
 */
@Component({
  tag: 'mud-button-group',
  styleUrl: 'mud-button-group.css',
  shadow: true,
})
export class MudButtonGroup {
  /**
   * Axis along which buttons are stacked. `horizontal` lays out children
   * in a row; `vertical` stacks them in a column and stretches each child
   * to the group's inline-size (so children with `full-width` fill it).
   * @default 'horizontal'
   */
  @Prop({ reflect: true }) orientation: ButtonGroupOrientation = 'horizontal';

  /**
   * Accessible name for the group. Forwarded to `aria-label` on the host
   * element so assistive technologies announce the buttons as a unit
   * (e.g. "Form actions").
   */
  @Prop() label?: string;

  render() {
    return (
      <Host role="group" aria-label={this.label}>
        <slot />
      </Host>
    );
  }
}
