// Fixture: rule must NOT fire — component does NOT declare ariaLabel, so it
// doesn't participate in the a11y tree as a labelled element. `return null` is
// legitimate here.
import { Component, Host, Prop, h } from '@stencil/core';

@Component({ tag: 'mud-test-no-aria-label', shadow: true })
export class MudTestNoAriaLabel {
  @Prop() enabled: boolean = true;

  render() {
    if (!this.enabled) {
      return null;
    }
    return (
      <Host>
        <span class="content" />
      </Host>
    );
  }
}
