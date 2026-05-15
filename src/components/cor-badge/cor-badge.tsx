import { Component, Host, Prop, Element, Watch, h } from '@stencil/core';
import { BadgeStatus, BadgeVariant, BadgeSize } from './cor-badge.enums';

/**
 * Badge component - a presentational status/label badge with icon and label support.
 *
 * @element cor-badge
 * @slot icon - Optional icon slot (accepts cor-icon only, not shown for dot variant)
 * @slot - Default slot for text label content
 */
@Component({
  tag: 'cor-badge',
  styleUrl: 'cor-badge.css',
  shadow: true,
})
export class CorBadge {
  /**
   * The semantic status of the badge
   * @default default
   */
  @Prop({ reflect: true }) status: BadgeStatus = BadgeStatus.DEFAULT;

  /**
   * The visual style variant of the badge
   * @default filled
   */
  @Prop({ reflect: true }) variant: BadgeVariant = BadgeVariant.FILLED;

  /**
   * The size of the badge
   * @default md
   */
  @Prop({ reflect: true }) size: BadgeSize = BadgeSize.MD;

  @Element() host!: HTMLElement;

  @Watch('variant')
  onVariantChange() {
    this.updateSlotClasses();
  }

  componentDidLoad() {
    this.updateSlotClasses();
    this.host.shadowRoot?.querySelector('slot[name="icon"]')?.addEventListener('slotchange', () => {
      this.updateSlotClasses();
    });
    this.host.shadowRoot?.querySelector('slot:not([name])')?.addEventListener('slotchange', () => {
      this.updateSlotClasses();
    });
  }

  private updateSlotClasses() {
    const hasIcon = this.host.querySelector('[slot="icon"]') !== null;
    const defaultSlot = this.host.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement | null;
    const hasLabel =
      defaultSlot !== null &&
      defaultSlot
        .assignedNodes({ flatten: true })
        .some(node => !(node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === ''));

    this.host.classList.toggle('has-icon', hasIcon);
    this.host.classList.toggle('has-label', hasLabel);
  }

  render() {
    const isDot = this.variant === BadgeVariant.DOT;

    return (
      <Host role="status">
        <div class="badge">
          {isDot ? (
            <div class="indicator-container">
              <span class="dot" aria-hidden="true" />
            </div>
          ) : (
            <span class="icon-container">
              <slot name="icon" />
            </span>
          )}

          <span class="label">
            <slot />
          </span>
        </div>
      </Host>
    );
  }
}
