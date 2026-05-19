import { Component, Element, Event, EventEmitter, h, Host, Listen, Prop, State } from '@stencil/core';

import { TabSize, TabStyle } from './cor-tab-button.enums';

/**
 * A tab button segment used inside `cor-tabs`. Supports 3 visual styles, 3 sizes,
 * and multiple states: selected, disabled, error, skeleton.
 *
 * @element cor-tab-button
 * @slot icon-left - Leading icon content
 * @slot - Label content (text, default slot)
 * @slot icon-right - Trailing icon content
 *
 * @cssprop --tab-button-size - Height of the button segment
 * @cssprop --tab-button-padding - Horizontal padding
 * @cssprop --tab-button-border-radius - Border radius (style-1 only)
 * @cssprop --tab-button-color - Text/icon color
 * @cssprop --tab-button-background - Background color
 * @cssprop --tab-button-font-weight - Font weight
 */
@Component({
  tag: 'cor-tab-button',
  styleUrl: 'cor-tab-button.css',
  shadow: true,
})
export class CorTabButton {
  /**
   * Unique identifier for this tab, used in the corTabSelect event payload.
   */
  @Prop({ reflect: true }) value: string = '';

  /**
   * Visual size of the tab button.
   * @default md
   */
  @Prop({ reflect: true }) size: TabSize = TabSize.MD;

  /**
   * Visual style variant matching the parent cor-tabs style.
   * @default style-1
   */
  @Prop({ reflect: true }) tabStyle: TabStyle = TabStyle.STYLE_1;

  /**
   * Whether this tab is currently selected/active.
   * @default false
   */
  @Prop({ reflect: true }) selected: boolean = false;

  /**
   * Whether this tab is disabled (not interactive).
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Whether to render the tab in skeleton loading state.
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Whether this tab is icon-only (no text label).
   * @default false
   */
  @Prop() iconOnly: boolean = false;

  /**
   * Accessible label for icon-only tabs. Required when iconOnly is true.
   */
  @Prop() iconLabel?: string;

  @State() private hovered: boolean = false;

  @Element() host!: HTMLElement;

  @Event() corTabSelect!: EventEmitter<{ value: string }>;

  @Listen('mouseenter')
  handleMouseEnter() {
    if (!this.disabled && !this.skeleton) {
      this.hovered = true;
      this.syncBadgeStates();
    }
  }

  @Listen('mouseleave')
  handleMouseLeave() {
    if (this.hovered) {
      this.hovered = false;
      this.syncBadgeStates();
    }
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

  private syncAllChildStates() {
    const badges = this.getBadges();
    const badgeSize = this.size === TabSize.SM ? 'xs' : 'sm';
    const iconSize = this.size === TabSize.SM ? 'sm' : 'md';

    badges.forEach(badge => {
      if (this.selected) {
        badge.setAttribute('selected', '');
      } else {
        badge.removeAttribute('selected');
      }
      if (this.disabled) {
        badge.setAttribute('disabled', '');
      } else {
        badge.removeAttribute('disabled');
      }
      if (this.hovered && !this.disabled && !this.skeleton) {
        badge.setAttribute('hovered', '');
      } else {
        badge.removeAttribute('hovered');
      }
      badge.setAttribute('size', badgeSize);
    });

    const icons = Array.from(this.host.querySelectorAll('cor-icon'));
    icons.forEach(icon => {
      icon.setAttribute('size', iconSize);
    });
  }

  private syncBadgeStates() {
    const badges = this.getBadges();
    badges.forEach(badge => {
      if (this.hovered && !this.disabled && !this.skeleton) {
        badge.setAttribute('hovered', '');
      } else {
        badge.removeAttribute('hovered');
      }
    });
  }

  private handleClick() {
    if (!this.disabled && !this.skeleton) {
      this.corTabSelect.emit({ value: this.value });
    }
  }

  private getHostClasses(): string {
    const classes: string[] = [];
    if (this.hovered && !this.selected) classes.push('is-hovered');
    return classes.join(' ');
  }

  render() {
    if (this.skeleton) {
      if (this.iconOnly) {
        return (
          <Host
            class={`${this.getHostClasses()} is-skeleton`}
            aria-hidden="true"
            icon-only={this.iconOnly ? '' : undefined}
          >
            <button class="tab-button" type="button" disabled tabIndex={-1}>
              <span class="skeleton-placeholder">
                <span class="skeleton-icon" />
              </span>
            </button>
          </Host>
        );
      }

      return (
        <Host
          class={`${this.getHostClasses()} is-skeleton`}
          aria-hidden="true"
          icon-only={this.iconOnly ? '' : undefined}
        >
          <button class="tab-button" type="button" disabled tabIndex={-1}>
            <span class="skeleton-placeholder">
              <span class="skeleton-icon" />
            </span>
            <span class="skeleton-placeholder skeleton-text">
              <span class="skeleton-label" />
              <span class="skeleton-badge" />
            </span>
            <span class="skeleton-placeholder">
              <span class="skeleton-icon" />
            </span>
          </button>
        </Host>
      );
    }

    return (
      <Host class={this.getHostClasses()} icon-only={this.iconOnly ? '' : undefined}>
        <button
          class="tab-button"
          type="button"
          role="tab"
          aria-selected={String(this.selected)}
          disabled={this.disabled}
          tabIndex={this.disabled ? -1 : 0}
          onClick={() => this.handleClick()}
          aria-label={this.iconOnly ? (this.iconLabel ?? this.value) : undefined}
        >
          <slot name="icon-left" />

          <span class="content">
            <slot />
          </span>

          <slot name="icon-right" />
        </button>
      </Host>
    );
  }
}
