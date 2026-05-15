import { Component, Element, Host, Prop, h } from '@stencil/core';

import { SpinnerSize } from './cor-spinner.enums';

/**
 * Spinner component — animated circular loading indicator with three-dot center.
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
   * Size of the spinner.
   * @default xlg
   */
  @Prop({ reflect: true }) size: SpinnerSize = SpinnerSize.XLG;

  /**
   * Accessible label for screen readers.
   * @default Loading
   */
  @Prop() label: string = 'Loading';

  /**
   * Hide the center loading dots.
   * @default false
   */
  @Prop() hideDots: boolean = false;

  @Element() host!: HTMLElement;

  componentWillLoad() {
    // Component lifecycle
  }

  componentDidLoad() {
    // Component lifecycle
  }

  componentDidUpdate() {
    // Component lifecycle
  }

  render() {
    return (
      <Host role="status" aria-label={this.label} aria-live="polite">
        <div class="spinner-container" aria-hidden="true">
          <div class="spinner-track" />
          <div class="spinner-arc" />
          {!this.hideDots && (
            <div class="spinner-dots">
              <cor-loading-dots />
            </div>
          )}
        </div>
      </Host>
    );
  }
}
