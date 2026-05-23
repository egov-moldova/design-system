import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

import type { AvatarSize, AvatarType } from './cor-avatar.types';
import { ICON_SIZE_FOR, deriveInitials } from './cor-avatar.utils';

/**
 * Avatar — represents a user via a photo, initials, or a generic person icon.
 *
 * Pattern A (atom-display): wraps a single piece of slottable content (an
 * optional notification badge) and otherwise renders its own internal DOM.
 *
 * The component picks its visual mode from the `type` prop:
 * - `photo` — renders `<img>` from `src`; if the image fails to load, falls
 *   back to initials (when `name`/`initials` is set) or the person icon.
 * - `initials` — renders 1–2 uppercase letters derived from `initials` or
 *   `name`. If neither is set, the icon fallback kicks in.
 * - `icon` — renders a `cor-icon` (default `person`).
 *
 * @element cor-avatar
 *
 * @slot badge - Optional notification badge composed at the top-right corner
 *               (e.g. `<span class="notification-dot"></span>`).
 */
@Component({
  tag: 'cor-avatar',
  styleUrl: 'cor-avatar.css',
  shadow: true,
})
export class CorAvatar {
  /**
   * Visual mode. `photo` renders `src`, `initials` renders 1–2 letters,
   * `icon` renders the person glyph.
   * @default 'initials'
   */
  @Prop({ reflect: true }) type: AvatarType = 'initials';

  /**
   * Visual size rung. Matches the Figma scale (xs=24, sm=32, md=40,
   * lg=48, xl=72).
   * @default 'md'
   */
  @Prop({ reflect: true }) size: AvatarSize = 'md';

  /**
   * Source URL for `type="photo"`. Ignored otherwise.
   */
  @Prop() src?: string;

  /**
   * Alt text for the underlying `<img>` when `type="photo"`. Falls back to
   * `name` so screen readers always get a description; pass an empty string
   * to mark the photo as purely decorative.
   */
  @Prop() alt?: string;

  /**
   * Pre-computed initials. When omitted, `name` is used to derive them.
   * Trimmed to two characters and uppercased before rendering.
   */
  @Prop() initials?: string;

  /**
   * Full name of the represented person. Used to (a) derive `initials` when
   * none are provided and (b) seed `alt` for the photo so the avatar is
   * always announced.
   */
  @Prop() name?: string;

  /**
   * Icon glyph for `type="icon"`. Defaults to the generic `person` symbol.
   * @default 'person'
   */
  @Prop() iconName: string = 'person';

  /**
   * Accessible label override. When set, becomes the host's `aria-label` and
   * the avatar is exposed to AT as a single labelled element. When omitted
   * the component picks a sensible default (the name, the initials, or
   * "User avatar").
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private imageFailed: boolean = false;

  @Element() host!: HTMLElement;

  @Watch('src')
  onSrcChange() {
    this.imageFailed = false;
  }

  private handleImageError = () => {
    this.imageFailed = true;
  };

  private get resolvedInitials(): string {
    if (this.initials && this.initials.trim().length > 0) {
      return this.initials.trim().slice(0, 2).toUpperCase();
    }
    return deriveInitials(this.name);
  }

  private get resolvedType(): AvatarType {
    // Effective rendering mode after fallbacks.
    if (this.type === 'photo') {
      if (!this.src || this.imageFailed) {
        return this.resolvedInitials.length > 0 ? 'initials' : 'icon';
      }
      return 'photo';
    }
    if (this.type === 'initials') {
      return this.resolvedInitials.length > 0 ? 'initials' : 'icon';
    }
    return 'icon';
  }

  private get accessibleName(): string {
    if (this.ariaLabel) return this.ariaLabel;
    if (this.name) return this.name;
    if (this.resolvedInitials) return `Avatar for ${this.resolvedInitials}`;
    return 'User avatar';
  }

  render() {
    const mode = this.resolvedType;
    const accessibleName = this.accessibleName;
    const iconSize = ICON_SIZE_FOR[this.size];

    return (
      <Host role="img" aria-label={accessibleName}>
        <span class={{ inner: true, [`type-${mode}`]: true }}>
          {mode === 'photo' && (
            <img
              class="photo"
              src={this.src}
              alt={this.alt ?? this.name ?? ''}
              onError={this.handleImageError}
              draggable={false}
            />
          )}
          {mode === 'initials' && (
            <span class="initials" aria-hidden="true">
              {this.resolvedInitials}
            </span>
          )}
          {mode === 'icon' && (
            <cor-icon class="icon" name={this.iconName} size={iconSize} color="currentColor" exportparts="svg-icon" />
          )}
        </span>
        <span class="badge-slot" part="badge">
          <slot name="badge" />
        </span>
      </Host>
    );
  }
}
