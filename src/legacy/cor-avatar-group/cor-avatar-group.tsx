import { Component, Host, Element, Prop, Watch, h } from '@stencil/core';

import { AvatarSize } from '../cor-avatar/cor-avatar.enums';

/**
 * Avatar group component - displays multiple avatars in a compact, overlapping stack.
 *
 * @element cor-avatar-group
 * @slot - Default slot for cor-avatar elements
 */

@Component({
  tag: 'cor-avatar-group',
  styleUrl: 'cor-avatar-group.css',
  shadow: true,
})
export class CorAvatarGroup {
  /**
   * Size of all avatars in the group
   * @default md
   */
  @Prop({ reflect: true }) size: AvatarSize = AvatarSize.MD;

  /**
   * Maximum number of avatars to display before showing overflow (+N)
   */
  @Prop() max?: number;

  /**
   * Accessible label for the avatar group
   */
  @Prop() label?: string;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  @Watch('size')
  onSizeChange() {
    this.propagatePropsToChildren();
  }

  componentDidLoad() {
    this.propagatePropsToChildren();
  }

  componentDidUpdate() {
    this.propagatePropsToChildren();
  }

  /**
   * Calculate overlap amount based on avatar size
   */
  private getOverlapAmount(): number {
    const sizeMap: Record<string, number> = {
      [AvatarSize.TWO_XS]: 8,
      [AvatarSize.XS]: 10,
      [AvatarSize.SM]: 12,
      [AvatarSize.MD]: 16,
      [AvatarSize.LG]: 20,
      [AvatarSize.MEGA_LG]: 32,
    };
    return sizeMap[this.size] ?? 16;
  }

  /**
   * Propagate size prop to all child avatars (Carbon pattern)
   */
  private propagatePropsToChildren() {
    const avatars = Array.from(this.host.querySelectorAll('cor-avatar'));
    avatars.forEach(avatar => {
      avatar.setAttribute('size', this.size);
    });
  }

  render() {
    const overlap = this.getOverlapAmount();
    const avatars = Array.from(this.host.querySelectorAll('cor-avatar'));
    const totalAvatars = avatars.length;
    const displayMax = this.max && totalAvatars > this.max ? this.max : totalAvatars;
    const overflowCount = this.max && totalAvatars > this.max ? totalAvatars - this.max : 0;

    avatars.forEach((avatar, index) => {
      if (this.max && index >= this.max) {
        avatar.style.display = 'none';
      } else {
        avatar.style.display = '';
        avatar.style.position = 'relative';
        avatar.style.zIndex = String(index + 1);

        if (index < displayMax - 1 || (overflowCount > 0 && index === displayMax - 1)) {
          avatar.style.marginRight = `-${overlap}px`;
        } else {
          avatar.style.marginRight = '0';
        }
      }
    });

    return (
      <Host role="group" aria-label={this.label}>
        <div
          class="avatar-group"
          style={{ ['--avatar-group-padding-right' as string]: `${overlap}px` } as Record<string, string>}
        >
          <slot />
          {overflowCount > 0 && (
            <cor-avatar
              class="avatar-group__overflow"
              size={this.size}
              initials={`+${overflowCount}`}
              style={{ ['--avatar-overflow-z-index' as string]: String(displayMax + 1) } as Record<string, string>}
            />
          )}
        </div>
      </Host>
    );
  }
}
