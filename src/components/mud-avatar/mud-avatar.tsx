import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

import type { IconName } from '../mud-icon/mud-icon.types';
import type { AvatarSize, AvatarType } from './mud-avatar.types';
import { ICON_SIZE_FOR, deriveInitials } from './mud-avatar.utils';
import { nameHostWithFallback, type HostAriaLabel } from '../../utils/aria-label';

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
 * - `icon` — renders a `mud-icon` (default `person`).
 *
 * @element mud-avatar
 *
 * @slot badge - Optional notification badge composed on the top-right edge
 *               (e.g. `<mud-badge slot="badge" type="dot" />`), sized to the
 *               avatar's rung.
 */
@Component({
  tag: 'mud-avatar',
  styleUrl: 'mud-avatar.css',
  shadow: true,
})
export class MudAvatar {
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
  @Prop() iconName: IconName = 'person';

  @State() private imageFailed: boolean = false;

  @Element() host!: HTMLMudAvatarElement;

  /**
   * Names the host: keeps the consumer's native `aria-label` attribute when
   * set (the avatar is then exposed to AT as a single labelled element),
   * otherwise applies the computed fallback — `name`, then the initials, then
   * "User avatar". See `nameHostWithFallback`.
   */
  private hostLabel?: HostAriaLabel;

  connectedCallback() {
    this.hostLabel = nameHostWithFallback(this.host, () => this.fallbackLabel());
  }

  disconnectedCallback() {
    this.hostLabel?.stop();
  }

  componentWillRender() {
    this.hostLabel?.update();
  }

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

  private fallbackLabel(): string {
    if (this.name) return this.name;
    if (this.resolvedInitials) return `Avatar for ${this.resolvedInitials}`;
    return 'User avatar';
  }

  render() {
    const mode = this.resolvedType;
    const iconSize = ICON_SIZE_FOR[this.size];

    // `aria-label` is set imperatively by `hostLabel` (see `nameHostWithFallback`)
    // so the attribute is not declared on `<Host>` here.

    return (
      <Host role="img">
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
          {mode === 'icon' && <mud-icon class="icon" name={this.iconName} size={iconSize} />}
        </span>
        <span class="badge-slot" part="badge">
          <slot name="badge" />
        </span>
      </Host>
    );
  }
}
