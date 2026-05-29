import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

import type { BadgeSize, BadgeType, BadgeVariant } from './mud-badge.types';

/**
 * Badge — small, non-interactive status / count indicator.
 *
 * Two visual forms:
 *  - `numbered` (default): shows a numeric counter inside a rounded pill.
 *  - `dot`: a presence circle for "unread" indication. `xs`/`sm` are solid;
 *    `md`/`lg`/`xl` carry a small centered inner pip (per Figma 551:18330).
 *
 * Five color variants map to the project's semantic token roles.
 * Designed to overlay parent elements (avatars, icon buttons, list items)
 * via consumer-controlled positioning — the badge itself just paints.
 * Position offsets are exposed as CSS variables (`--badge-offset-top`,
 * `--badge-offset-right`) so consumers can compose without overrides.
 *
 * Pattern B (atom-visual): internal DOM only, no slots, no events.
 *
 * @element mud-badge
 */
@Component({
  tag: 'mud-badge',
  styleUrl: 'mud-badge.css',
  shadow: true,
})
export class MudBadge {
  /**
   * Visual form — `numbered` shows the count, `dot` is a presence indicator.
   * @default 'numbered'
   */
  @Prop({ reflect: true }) type: BadgeType = 'numbered';

  /**
   * Semantic color variant.
   * @default 'danger'
   */
  @Prop({ reflect: true }) variant: BadgeVariant = 'danger';

  /**
   * Size rung — five-step scale matching Figma masters `551:17421`:
   *  - `xs` (8 px)  — dot-only presence pip (e.g. dropdown row indicator)
   *  - `sm` (12 px) — compact dot or numbered
   *  - `md` (16 px) — default numbered/dot (Figma Caption Medium 12/16)
   *  - `lg` (20 px) — emphasised numbered (Figma Caption Medium 12/16)
   *  - `xl` (24 px) — large numbered (Figma Body/Small Medium 14/20)
   * @default 'md'
   */
  @Prop({ reflect: true }) size: BadgeSize = 'md';

  /**
   * Numeric count to display when `type='numbered'`. Ignored for `dot`.
   * Values greater than `max` render as `"{max}+"`.
   */
  @Prop() count?: number;

  /**
   * Upper bound for the visible count. Counts above this render as `"{max}+"`.
   * @default 99
   */
  @Prop() max: number = 99;

  /**
   * Override the accessible name. When omitted, `numbered` uses the visible
   * count text and `dot` falls back to "Notification" (so screen readers
   * announce something meaningful for empty dots). Captured into
   * `resolvedAriaLabel` on mount and the host attribute is stripped to
   * avoid Stencil's auto-reflection loop.
   */
  @Prop() ariaLabel?: string;

  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLElement;

  componentWillLoad() {
    this.captureAriaLabel();
  }

  @Watch('ariaLabel')
  handleAriaLabelChange(next: string | undefined) {
    if (next && next.length > 0) {
      this.resolvedAriaLabel = next;
    }
  }

  /**
   * Stencil auto-reflects `@Prop()` values back onto the host attribute. For
   * `aria-label` that creates an observer loop. Capture the consumer-provided
   * value into a state field, then strip the attribute so the loop never fires.
   */
  private captureAriaLabel() {
    const attr = this.host.getAttribute('aria-label');
    if (attr) {
      this.resolvedAriaLabel = attr;
      this.host.removeAttribute('aria-label');
    } else if (this.ariaLabel) {
      this.resolvedAriaLabel = this.ariaLabel;
    }
  }

  private formatCount(): string {
    if (this.count === undefined || this.count === null || Number.isNaN(this.count)) {
      return '';
    }
    if (this.count > this.max) {
      return `${this.max}+`;
    }
    return String(this.count);
  }

  private resolveAccessibleName(displayText: string): string {
    if (this.resolvedAriaLabel) {
      return this.resolvedAriaLabel;
    }
    if (this.type === 'dot') {
      return 'Notification';
    }
    return displayText || 'Notification';
  }

  render() {
    // `xs` is a dot-only rung in Figma (8 px can't hold a count), so a numbered
    // xs always degrades to a solid dot rather than clipping the digits.
    const isDot = this.type === 'dot' || this.size === 'xs';
    const displayText = isDot ? '' : this.formatCount();
    const accessibleName = this.resolveAccessibleName(displayText);
    // Per Figma 551:18330, md/lg/xl dots carry a centered inner pip; xs/sm are solid.
    const showInnerDot = isDot && (this.size === 'md' || this.size === 'lg' || this.size === 'xl');

    return (
      <Host role="status" aria-live="polite" aria-label={accessibleName}>
        {!isDot && (
          <span class="badge-count" aria-hidden="true">
            {displayText}
          </span>
        )}
        {showInnerDot && <span class="badge-dot" aria-hidden="true"></span>}
      </Host>
    );
  }
}
