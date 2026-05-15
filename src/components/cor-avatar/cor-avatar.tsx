import { Component, Host, Element, Prop, h } from '@stencil/core';

import { AvatarSize } from './cor-avatar.enums';
import { textVariants } from '../cor-typography/cor-typography.enums';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { VALID_AVATAR_IMAGE_TAGS, VALID_AVATAR_ICON_TAGS } from '../shared.constants';

/**
 * Avatar component - displays user profile pictures, initials, or icons.
 *
 * @element cor-avatar
 * @slot image - Photo/logo content (img, svg)
 * @slot icon - Company logo/icon (cor-icon, svg)
 */

@Component({
  tag: 'cor-avatar',
  styleUrl: 'cor-avatar.css',
  shadow: true,
})
export class CorAvatar {
  /**
   * Size of the avatar
   * @default md
   */
  @Prop({ reflect: true }) size: AvatarSize = AvatarSize.MD;

  /**
   * Initials to display (1-2 characters)
   * @default AZ
   */
  @Prop() initials: string = 'AZ';

  /**
   * Accessible label for the avatar (defaults to initials value)
   */
  @Prop() label?: string;

  /**
   * Indicates if avatar is disabled
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Active state (applies active styling without requiring :active pseudo-class)
   * @default false
   */
  @Prop({ reflect: true }) active: boolean = false;

  /**
   * Pressed state (applies pressed/active border styling)
   * @default false
   */
  @Prop({ reflect: true }) pressed: boolean = false;

  /**
   * Hovered state (applies hover border styling via class)
   * @default false
   */
  @Prop({ reflect: true }) hovered: boolean = false;

  /**
   * Show skeleton loading state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;
  // Slot presence is computed inside render() to avoid repeated DOM queries.

  /**
   * Get CSS classes for the host element
   */
  private getHostClasses(): string {
    const classes = [];
    if (this.active) classes.push('is-active');
    if (this.hovered) classes.push('is-hovered');
    if (this.pressed) classes.push('is-pressed');
    if (this.disabled) classes.push('is-disabled');
    return classes.join(' ');
  }

  /**
   * Get typography variant based on avatar size
   */
  private getTypographyVariant(): textVariants | `${textVariants}` {
    const sizeMap: Record<string, `${textVariants}`> = {
      [AvatarSize.TWO_XS]: 'body-xs-semibold',
      [AvatarSize.XS]: 'body-xs',
      [AvatarSize.SM]: 'body-sm',
      [AvatarSize.MD]: 'body-sm',
      [AvatarSize.LG]: 'body-md',
      [AvatarSize.MEGA_LG]: 'heading-xl',
    };

    return sizeMap[this.size] || 'body-md';
  }

  render() {
    const imageSlot = this.host.querySelector('[slot="image"]');
    const iconSlot = this.host.querySelector('[slot="icon"]');

    if (imageSlot && !VALID_AVATAR_IMAGE_TAGS.includes(imageSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(imageSlot.tagName.toLowerCase(), VALID_AVATAR_IMAGE_TAGS)}</Host>;
    }

    if (iconSlot && !VALID_AVATAR_ICON_TAGS.includes(iconSlot.tagName.toLowerCase())) {
      return <Host>{invalidSlottedTag(iconSlot.tagName.toLowerCase(), VALID_AVATAR_ICON_TAGS)}</Host>;
    }

    // Cache slot checks locally to avoid repeated DOM queries
    const hasImage = !!imageSlot;
    const hasIcon = !!iconSlot;
    const showInitials = !!this.initials && !hasImage && !hasIcon && !this.skeleton;

    return (
      <Host
        class={this.getHostClasses()}
        has-image={hasImage ? '' : undefined}
        role="img"
        aria-label={this.label ?? this.initials}
        aria-disabled={this.disabled ? 'true' : undefined}
      >
        {this.skeleton ? (
          <div class="avatar-skeleton" />
        ) : (
          <div class="avatar-container">
            <div class="avatar-bg" />

            {hasImage && (
              <div class="avatar-photo">
                <slot name="image" />
                {this.disabled && <div class="avatar-photo-overlay" />}
              </div>
            )}

            {showInitials && (
              <div class="avatar-initials">
                <cor-typography variant={this.getTypographyVariant()}>
                  <span class="initials-text">{this.initials.toUpperCase()}</span>
                </cor-typography>
              </div>
            )}

            {hasIcon && (
              <div class="avatar-icon">
                <slot name="icon" />
              </div>
            )}
          </div>
        )}

        {!this.skeleton && <div class="avatar-border-layer" />}
      </Host>
    );
  }
}
