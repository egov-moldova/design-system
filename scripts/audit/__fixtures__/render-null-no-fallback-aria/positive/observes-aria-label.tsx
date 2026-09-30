// Fixture: rule MUST fire — component reads the host's native aria-label through
// observeAriaLabel (no ariaLabel prop, #88) and bails on render without a Host
// aria-hidden fallback.
import { Component, Element, Host, Prop, State, h } from '@stencil/core';

import { observeAriaLabel } from '../../../../../src/utils/aria-label';

@Component({ tag: 'mud-test-observes-aria-label', shadow: true })
export class MudTestObservesAriaLabel {
  @Prop() name: string = 'default';

  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLElement;

  private stopAriaLabel?: () => void;

  connectedCallback() {
    this.stopAriaLabel = observeAriaLabel(this.host, label => (this.resolvedAriaLabel = label));
  }

  disconnectedCallback() {
    this.stopAriaLabel?.();
  }

  render() {
    if (this.name !== 'default') {
      return null;
    }
    return (
      <Host role="img">
        <span class="content" aria-label={this.resolvedAriaLabel} />
      </Host>
    );
  }
}
