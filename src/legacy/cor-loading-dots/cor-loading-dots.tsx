import { Component, Host, h } from '@stencil/core';

/**
 * Loading dots component — animated three-dot indicator.
 * Reusable atom embedded inside cor-spinner and other loading states.
 * Always renders at 16×16px per Figma spec.
 *
 * @element cor-loading-dots
 */
@Component({
  tag: 'cor-loading-dots',
  styleUrl: 'cor-loading-dots.css',
  shadow: true,
})
export class CorLoadingDots {
  render() {
    return (
      <Host role="status" aria-label="Loading">
        <div class="dots-container">
          <div class="dot dot-1"></div>
          <div class="dot dot-2"></div>
          <div class="dot dot-3"></div>
        </div>
      </Host>
    );
  }
}
