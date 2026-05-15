import { Component, h, Host, Prop } from '@stencil/core';

import { SeparatorVariant } from './cor-separator.enums';
import { SEPARATOR_VARIANTS } from './cor-separator.constants';

/**
 * A visual separator component.
 *
 * Used to visually divide content areas.
 *
 * @element cor-separator
 * @cssprop --separator-color
 * @cssprop --separator-thickness
 * @cssprop --separator-spacing
 * @cssprop --separator-accent-color
 */
@Component({
  tag: 'cor-separator',
  styleUrl: 'cor-separator.css',
  shadow: true,
})
export class CorSeparator {
  /**
   * Visual style of the separator.
   * @default divider
   */
  @Prop({ reflect: true }) variant: SeparatorVariant = SeparatorVariant.DIVIDER;

  render() {
    if (!SEPARATOR_VARIANTS.includes(this.variant)) {
      return <Host />;
    }

    return <Host role="separator" />;
  }
}
