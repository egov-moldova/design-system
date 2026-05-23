import { Component, Host, Prop, h } from '@stencil/core';

import type { BadgeSize, BadgeType, BadgeVariant } from './cor-badge.types';

/**
 * Badge — small, non-interactive status / count indicator.
 *
 * Two visual forms:
 *  - `numbered` (default): shows a numeric counter inside a rounded pill.
 *  - `dot`: a tiny solid circle used for "unread" presence indication.
 *
 * Five color variants map to the project's semantic token roles.
 * Designed to overlay parent elements (avatars, icon buttons, list items)
 * via consumer-controlled positioning — the badge itself just paints.
 * Position offsets are exposed as CSS variables (`--badge-offset-top`,
 * `--badge-offset-right`) so consumers can compose without overrides.
 *
 * Pattern B (atom-visual): internal DOM only, no slots, no events.
 *
 * @element cor-badge
 */
@Component({
  tag: 'cor-badge',
  styleUrl: 'cor-badge.css',
  shadow: true,
})
export class CorBadge {
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
   * Size rung — `sm` (12 px) for tight overlays, `md` (16 px) for default.
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
   * announce something meaningful for empty dots).
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

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
    if (this.ariaLabel) {
      return this.ariaLabel;
    }
    if (this.type === 'dot') {
      return 'Notification';
    }
    return displayText || 'Notification';
  }

  render() {
    const isDot = this.type === 'dot';
    const displayText = isDot ? '' : this.formatCount();
    const accessibleName = this.resolveAccessibleName(displayText);

    return (
      <Host role="status" aria-live="polite" aria-label={accessibleName}>
        {!isDot && (
          <span class="badge-count" aria-hidden="true">
            {displayText}
          </span>
        )}
      </Host>
    );
  }
}
