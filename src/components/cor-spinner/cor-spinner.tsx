import { Component, Host, Prop, h } from '@stencil/core';

import type { SpinnerSize, SpinnerVariant } from './cor-spinner.types';

/**
 * Spinner — animated circular loading indicator.
 *
 * Pattern B (atom-visual): renders a CSS-only rotating arc.
 * No slots, no events, no interactivity.
 *
 * @element cor-spinner
 */
@Component({
  tag: 'cor-spinner',
  styleUrl: 'cor-spinner.css',
  shadow: true,
})
export class CorSpinner {
  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: SpinnerSize = 'md';

  /**
   * Color treatment.
   * @default 'brand'
   */
  @Prop({ reflect: true }) variant: SpinnerVariant = 'brand';

  /**
   * Accessible label for screen readers.
   * @default 'Loading'
   */
  @Prop() label: string = 'Loading';

  render() {
    return (
      <Host role="status" aria-label={this.label} aria-live="polite">
        <div class="arc" aria-hidden="true" />
      </Host>
    );
  }
}
