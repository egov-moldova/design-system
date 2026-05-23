import { Component, Element, Host, Prop, h } from '@stencil/core';

import type { SeparatorOrientation, SeparatorSize, SeparatorVariant } from './cor-separator.types';

/**
 * Separator — visual divider between groups of content or UI components.
 *
 * Pattern B (atom-visual): renders a 1D rule, optionally with an inline label.
 * No events, no interactivity. ARIA `separator` semantics.
 *
 * @element cor-separator
 * @slot - Optional rich label content (e.g. icon + text). Use either the
 *         `label` prop for plain text or this slot for richer content.
 */
@Component({
  tag: 'cor-separator',
  styleUrl: 'cor-separator.css',
  shadow: true,
})
export class CorSeparator {
  @Element() host!: HTMLElement;

  /**
   * Layout orientation of the separator.
   * @default 'horizontal'
   */
  @Prop({ reflect: true }) orientation: SeparatorOrientation = 'horizontal';

  /**
   * Visual thickness of the rule.
   * @default 'thin'
   */
  @Prop({ reflect: true }) size: SeparatorSize = 'thin';

  /**
   * Color treatment / emphasis.
   * @default 'subtle'
   */
  @Prop({ reflect: true }) variant: SeparatorVariant = 'subtle';

  /**
   * Adds outer spacing on the cross axis. Typical when the separator sits
   * between items in a list or menu.
   * @default false
   */
  @Prop({ reflect: true }) inset: boolean = false;

  /**
   * Optional plain-text label rendered inline at the center of the separator.
   * For richer label content (e.g. an icon plus text), use the default slot
   * instead.
   */
  @Prop() label?: string;

  /**
   * Accessible label for screen readers. Most separators are decorative and
   * do not need this; provide it only when the separator conveys a discrete
   * semantic boundary that benefits from an announcement.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  private hasLabelSlot(): boolean {
    const slotted = Array.from(this.host.childNodes).some(node => {
      if (node.nodeType === Node.ELEMENT_NODE) return true;
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return false;
    });
    return slotted;
  }

  render() {
    const hasLabel = Boolean(this.label) || this.hasLabelSlot();
    // Per ARIA, the default orientation for role="separator" is horizontal,
    // so we only expose aria-orientation when the separator is vertical.
    const ariaOrientation = this.orientation === 'vertical' ? 'vertical' : undefined;

    return (
      <Host
        role="separator"
        aria-orientation={ariaOrientation}
        aria-label={this.ariaLabel}
        class={{ 'has-label': hasLabel }}
      >
        {hasLabel ? (
          <div class="layout" part="layout">
            <span class="line line-start" aria-hidden="true" part="line"></span>
            <span class="label" part="label">
              <slot>{this.label ?? ''}</slot>
            </span>
            <span class="line line-end" aria-hidden="true" part="line"></span>
          </div>
        ) : (
          <span class="line" aria-hidden="true" part="line"></span>
        )}
      </Host>
    );
  }
}
