import { Component, Host, Prop, Event, EventEmitter, h, Element } from '@stencil/core';
import { BadgeInteractiveSize } from './cor-badge-interactive.enums';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { VALID_ICON_SLOT_TAGS } from '../shared.constants';

/**
 * Badge Interactive component - an interactive badge with optional icon, clickable and removable.
 *
 * @element cor-badge-interactive
 * @slot icon - Icon slot (accepts cor-icon only, not shown for xs size)
 * @slot - Default slot for text content
 */
@Component({
  tag: 'cor-badge-interactive',
  styleUrl: 'cor-badge-interactive.css',
  shadow: true,
})
export class CorBadgeInteractive {
  /**
   * Size of the badge
   * @default md
   */
  @Prop({ reflect: true }) size: BadgeInteractiveSize = BadgeInteractiveSize.MD;

  /**
   * Indicates if the badge is disabled
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Indicates if the badge is selected
   * @default false
   */
  @Prop({ reflect: true }) selected: boolean = false;

  /**
   * Indicates if the badge is in skeleton/empty state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  @Element() host!: HTMLElement;

  /**
   * Emitted when the badge is clicked
   */
  @Event() corClick!: EventEmitter<void>;

  /**
   * Handle badge click
   */
  private handleClick = (event: MouseEvent) => {
    if (this.disabled || this.skeleton) {
      event.preventDefault();
      return;
    }
    this.corClick.emit();
  };

  /**
   * Handle keyboard interaction (Enter/Space)
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick(event as unknown as MouseEvent);
    }
  };

  render() {
    // Validate slotted icon element
    const iconSlot = this.host.querySelector('[slot="icon"]');

    // Validate icon slot - only cor-icon is allowed
    if (iconSlot && !VALID_ICON_SLOT_TAGS.includes(iconSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(iconSlot.tagName.toLowerCase(), VALID_ICON_SLOT_TAGS)}</Host>;
    }

    // Hide icon slot for xs size
    const showIconSlot = this.size !== BadgeInteractiveSize.XS && !this.skeleton;

    // CSS var tokens per size
    const sizeKey = this.size; // 'md' | 'sm' | 'xs'
    const skeletonWidthVar = `var(--badge-interactive-container-width-${sizeKey})`;
    const skeletonHeightVar = `var(--badge-interactive-container-height-${sizeKey})`;
    const skeletonRadiusVar = `var(--badge-interactive-container-border-radius-${sizeKey})`;

    return (
      <Host>
        {this.skeleton ? (
          <cor-skeleton
            width={skeletonWidthVar}
            height={skeletonHeightVar}
            border-radius={skeletonRadiusVar}
            background-color="var(--badge-interactive-container-background-skeleton)"
          />
        ) : (
          <div
            class="badge"
            role="button"
            tabIndex={this.disabled || this.skeleton ? -1 : 0}
            aria-disabled={this.disabled ? 'true' : undefined}
            aria-pressed={this.selected ? 'true' : 'false'}
            onClick={this.handleClick}
            onKeyDown={this.handleKeyDown}
          >
            {showIconSlot && <slot name="icon" />}

            <span class="label">
              <slot />
            </span>
          </div>
        )}
      </Host>
    );
  }
}
