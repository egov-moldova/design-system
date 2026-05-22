// Fixture: rule MUST fire — component declares ariaLabel and bails on render
// without a Host aria-hidden fallback, leaving the host as a nameless generic
// element in the a11y tree.
import { Component, Host, Prop, h } from '@stencil/core';

@Component({ tag: 'cor-test-missing-fallback', shadow: true })
export class CorTestMissingFallback {
  @Prop() name: string = 'default';
  @Prop() ariaLabel?: string;

  private isKnown(): boolean {
    return this.name === 'default';
  }

  render() {
    if (!this.isKnown()) {
      return null;
    }
    return (
      <Host aria-label={this.ariaLabel} role="img">
        <span class="content" />
      </Host>
    );
  }
}
