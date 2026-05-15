import { Component, Element, Host, Prop, Watch, h } from '@stencil/core';

import { IconSize } from '../cor-icon/cor-icon.types';
import { LoadingState } from './cor-loading.enums';

/**
 * Loading component — fixed 56×56px circular progress indicator with a `final` completion state.
 *
 * In `loading` state: animated arc driven by `value` (0–100) with three-dot center indicator.
 * In `final` state: filled circle with checkmark icon signalling completion.
 *
 * @element cor-loading
 */
@Component({
  tag: 'cor-loading',
  styleUrl: 'cor-loading.css',
  shadow: true,
})
export class CorLoading {
  /**
   * Progress value from 0 to 100. Controls the arc fill in `loading` state.
   * @default 0
   */
  @Prop() value: number = 0;

  /**
   * Current state of the loading indicator.
   * - `loading` — animated arc + three-dot center
   * - `final` — filled circle + checkmark icon
   * @default loading
   */
  @Prop({ reflect: true }) state: LoadingState = LoadingState.LOADING;

  /**
   * Accessible label for screen readers.
   * @default Loading
   */
  @Prop() label: string = 'Loading';

  @Element() host!: HTMLElement;

  @Watch('value')
  onValueChange() {
    this.updateValueProperty();
  }

  componentDidLoad() {
    this.updateValueProperty();
  }

  private updateValueProperty() {
    const clamped = Math.min(100, Math.max(0, this.value));
    this.host.style.setProperty('--loading-value', String(clamped));
  }

  render() {
    const isFinal = this.state === LoadingState.FINAL;
    const ariaLabel = isFinal ? 'Complete' : this.label;

    return (
      <Host role="status" aria-label={ariaLabel}>
        <div class="loading-container" aria-hidden="true">
          {!isFinal && [
            <div class="loading-track" />,
            <div class="loading-arc" />,
            <div class="loading-dots">
              <cor-loading-dots />
            </div>,
          ]}
          {isFinal && [
            <div class="loading-final-ring" />,
            <div class="loading-checkmark">
              <cor-icon name="carbon:checkmark" color="primary-icon-default" size={IconSize.SM} />
            </div>,
          ]}
        </div>
      </Host>
    );
  }
}
