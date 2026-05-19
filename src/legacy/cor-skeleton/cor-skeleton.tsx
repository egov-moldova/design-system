import { Component, Host, Element, Prop, h } from '@stencil/core';

/**
 * @slot - Default slot for nested content (optional)
 */
@Component({
  tag: 'cor-skeleton',
  styleUrl: 'cor-skeleton.css',
  shadow: true,
})
export class CorSkeleton {
  /**
   * Width of the skeleton loader
   * @default '100%'
   */
  @Prop({ reflect: true }) width?: string;

  /**
   * Height of the skeleton loader
   * @default 'var(--spacing-20)'
   */
  @Prop({ reflect: true }) height?: string;

  /**
   * Border radius of the skeleton loader
   * @default 'var(--border-radius-8)'
   */
  @Prop({ reflect: true }) borderRadius?: string;

  /**
   * Background color of the skeleton loader
   * @default 'var(--skeleton-background-color)'
   */
  @Prop({ reflect: true }) backgroundColor?: string;

  @Element() host!: HTMLElement;

  componentWillLoad() {
    if (this.width) this.host.style.setProperty('--skeleton-width', this.width);
    if (this.height) this.host.style.setProperty('--skeleton-height', this.height);
    if (this.borderRadius) this.host.style.setProperty('--skeleton-border-radius', this.borderRadius);
    if (this.backgroundColor) this.host.style.setProperty('--skeleton-background-color', this.backgroundColor);
  }

  componentWillUpdate() {
    if (this.width) this.host.style.setProperty('--skeleton-width', this.width);
    else this.host.style.removeProperty('--skeleton-width');
    if (this.height) this.host.style.setProperty('--skeleton-height', this.height);
    else this.host.style.removeProperty('--skeleton-height');
    if (this.borderRadius) this.host.style.setProperty('--skeleton-border-radius', this.borderRadius);
    else this.host.style.removeProperty('--skeleton-border-radius');
    if (this.backgroundColor) this.host.style.setProperty('--skeleton-background-color', this.backgroundColor);
    else this.host.style.removeProperty('--skeleton-background-color');
  }

  render() {
    return (
      <Host role="status" aria-label="Loading" aria-busy="true">
        <div class="skeleton" aria-hidden="true">
          <slot />
        </div>
      </Host>
    );
  }
}
