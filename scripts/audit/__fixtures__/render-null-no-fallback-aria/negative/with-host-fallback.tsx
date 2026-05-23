// Fixture: rule must NOT fire — component declares ariaLabel and uses a
// `<Host aria-hidden="true" />` decorative fallback for the unknown branch.
import { Component, Host, Prop, h } from '@stencil/core';

@Component({ tag: 'cor-test-with-fallback', shadow: true })
export class CorTestWithFallback {
  @Prop() name: string = 'default';
  @Prop() ariaLabel?: string;

  private isKnown(): boolean {
    return this.name === 'default';
  }

  render() {
    if (!this.isKnown()) {
      return <Host aria-hidden="true" />;
    }
    return (
      <Host aria-label={this.ariaLabel} role="img">
        <span class="content" />
      </Host>
    );
  }
}
