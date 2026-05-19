import { Component, Element, Event, EventEmitter, h, Host, Listen, Prop, State } from '@stencil/core';

import { MenuButtonType } from './cor-menu-button.enums';

/**
 * A menu/tab button with 3 visual type variants (primary, secondary, tertiary).
 * Supports selected, disabled, skeleton, and icon-only states.
 * Propagates hover/selected/disabled state to slotted `cor-badge-interactive` children.
 *
 * @element cor-menu-button
 * @slot icon-left - Leading icon (20×20)
 * @slot - Default slot: label text and optional cor-badge-interactive
 * @slot icon-right - Trailing icon (20×20)
 *
 * @cssprop --menu-button-size - Height of the button
 * @cssprop --menu-button-padding - Horizontal padding
 * @cssprop --menu-button-radius-default - Border radius (primary/secondary)
 * @cssprop --menu-button-color-default - Text/icon color (default state)
 * @cssprop --menu-button-background-default - Background color (default state)
 */
@Component({
  tag: 'cor-menu-button',
  styleUrl: 'cor-menu-button.css',
  shadow: true,
})
export class CorMenuButton {
  /**
   * Unique identifier used in the corMenuSelect event payload.
   */
  @Prop({ reflect: true }) value: string = '';

  /**
   * Visual type variant.
   * @default primary
   */
  @Prop({ reflect: true }) type: MenuButtonType = MenuButtonType.PRIMARY;

  /**
   * Whether this button is currently selected/active.
   * @default false
   */
  @Prop({ reflect: true }) selected: boolean = false;

  /**
   * Whether this button is disabled (not interactive).
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Whether to render in skeleton loading state.
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Whether this is icon-only (no text label). Primarily used with Primary type.
   * @default false
   */
  @Prop() iconOnly: boolean = false;

  /**
   * Accessible label for icon-only buttons. Required when iconOnly is true.
   */
  @Prop() iconLabel?: string;

  @State() private hovered: boolean = false;
  @State() private pressed: boolean = false;

  @Element() host!: HTMLElement;

  /**
   * Emitted when the button is clicked (not disabled, not skeleton).
   * Does not update selected state internally — consumer is responsible.
   */
  @Event() corMenuSelect!: EventEmitter<{ value: string }>;

  @Listen('mouseenter')
  handleMouseEnter() {
    if (!this.disabled && !this.skeleton) {
      this.hovered = true;
      this.syncAllChildStates();
    }
  }

  @Listen('mouseleave')
  handleMouseLeave() {
    this.hovered = false;
    this.pressed = false;
    this.syncAllChildStates();
  }

  @Listen('mousedown')
  handleMouseDown() {
    if (!this.disabled && !this.skeleton) {
      this.pressed = true;
      this.syncAllChildStates();
    }
  }

  @Listen('mouseup')
  handleMouseUp() {
    this.pressed = false;
    this.syncAllChildStates();
  }

  componentDidLoad() {
    this.syncAllChildStates();
  }

  componentDidUpdate() {
    this.syncAllChildStates();
  }

  private getBadges(): Element[] {
    return Array.from(this.host.children).filter(
      el => el.tagName.toLowerCase() === 'cor-badge-interactive' && !el.hasAttribute('slot'),
    );
  }

  private getIconLeft(): Element | null {
    return this.host.querySelector('cor-icon[slot="icon-left"]');
  }

  private getIconRight(): Element | null {
    return this.host.querySelector('cor-icon[slot="icon-right"]');
  }

  private syncAllChildStates() {
    const badges = this.getBadges();
    const iconLeft = this.getIconLeft();
    const iconRight = this.getIconRight();
    const isActive = !this.disabled && !this.skeleton;

    /* ── Disabled: propagate to ALL sub-components ── */
    const toggleDisabled = (el: Element | null) => {
      if (!el) return;
      if (this.disabled) {
        el.setAttribute('disabled', '');
      } else {
        el.removeAttribute('disabled');
      }
    };
    badges.forEach(toggleDisabled);
    toggleDisabled(iconLeft);
    toggleDisabled(iconRight);

    /* ── Selected/active: icon-left + badges only ── */
    const toggleSelected = (el: Element | null) => {
      if (!el) return;
      if (this.selected && isActive) {
        el.setAttribute('selected', '');
        el.setAttribute('active', '');
      } else {
        el.removeAttribute('selected');
        el.removeAttribute('active');
      }
    };
    badges.forEach(toggleSelected);
    toggleSelected(iconLeft);

    /* ── Hovered: icon-left + badges only ── */
    const toggleHovered = (el: Element | null) => {
      if (!el) return;
      if (this.hovered && isActive) {
        el.setAttribute('hovered', '');
      } else {
        el.removeAttribute('hovered');
      }
    };
    badges.forEach(toggleHovered);
    toggleHovered(iconLeft);

    /* ── Pressed: icon-left + badges only ── */
    const togglePressed = (el: Element | null) => {
      if (!el) return;
      if (this.pressed && isActive) {
        el.setAttribute('pressed', '');
      } else {
        el.removeAttribute('pressed');
      }
    };
    badges.forEach(togglePressed);
    togglePressed(iconLeft);
  }

  private handleClick() {
    if (!this.disabled && !this.skeleton) {
      this.corMenuSelect.emit({ value: this.value });
    }
  }

  private getHostClasses(): string {
    const classes: string[] = [];
    if (this.hovered && !this.selected) classes.push('is-hovered');
    if (this.pressed && !this.selected) classes.push('is-pressed');
    return classes.join(' ');
  }

  render() {
    if (this.skeleton) {
      if (this.iconOnly) {
        return (
          <Host class="is-skeleton" aria-hidden="true" icon-only={this.iconOnly ? '' : undefined}>
            <button class="menu-button" type="button" disabled tabIndex={-1}>
              <cor-skeleton
                width="20px"
                height="20px"
                borderRadius="var(--menu-button-skeleton-border-radius)"
                backgroundColor="var(--menu-button-background-primary-skeleton)"
              />
            </button>
          </Host>
        );
      }

      const showRightIconSkeleton = this.type !== MenuButtonType.TERTIARY;

      return (
        <Host class="is-skeleton" aria-hidden="true" icon-only={this.iconOnly ? '' : undefined}>
          <button class="menu-button" type="button" disabled tabIndex={-1}>
            <cor-skeleton
              width="20px"
              height="20px"
              borderRadius="var(--menu-button-skeleton-border-radius)"
              backgroundColor="var(--menu-button-background-primary-skeleton)"
            />
            <cor-skeleton
              width="var(--menu-button-skeleton-text-placeholder-primary-width)"
              height="var(--menu-button-skeleton-text-placeholder-primary-height)"
              borderRadius="var(--menu-button-skeleton-border-radius)"
              backgroundColor="var(--menu-button-background-primary-skeleton)"
            />
            {showRightIconSkeleton && (
              <cor-skeleton
                width="20px"
                height="20px"
                borderRadius="var(--menu-button-skeleton-border-radius)"
                backgroundColor="var(--menu-button-background-primary-skeleton)"
              />
            )}
          </button>
        </Host>
      );
    }

    return (
      <Host class={this.getHostClasses()} icon-only={this.iconOnly ? '' : undefined}>
        <button
          class="menu-button"
          type="button"
          role="tab"
          aria-selected={String(this.selected)}
          disabled={this.disabled}
          tabIndex={this.disabled ? -1 : 0}
          onClick={() => this.handleClick()}
          aria-label={this.iconOnly ? (this.iconLabel ?? this.value) : undefined}
        >
          {this.iconOnly ? (
            <slot name="icon" />
          ) : (
            [
              <slot name="icon-left" key="icon-left" />,
              <span class="content" key="content">
                <slot />
              </span>,
              <slot name="icon-right" key="icon-right" />,
            ]
          )}
        </button>
      </Host>
    );
  }
}
