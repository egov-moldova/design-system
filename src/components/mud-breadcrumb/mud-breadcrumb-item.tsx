import { Component, Element, Event, EventEmitter, Host, Prop, State, h } from '@stencil/core';

import { BREADCRUMB_TRUNCATE_AT } from './mud-breadcrumb.types';

/**
 * A single crumb inside `mud-breadcrumb`. Renders an anchor when `href` is set,
 * otherwise plain text. The active crumb renders as text with `aria-current="page"`,
 * regardless of `href`.
 *
 * Use this directly when the markup variant of the breadcrumb is preferred over
 * the `items` prop on `mud-breadcrumb`. Both APIs are equivalent in behavior.
 *
 * @element mud-breadcrumb-item
 *
 * @slot - (default) Label content. Use plain text or inline elements (`<strong>`, `<span>`).
 * @slot icon-start - Optional leading icon (use `<mud-icon>`).
 */
@Component({
  tag: 'mud-breadcrumb-item',
  styleUrl: 'mud-breadcrumb-item.css',
  shadow: true,
})
export class MudBreadcrumbItem {
  /**
   * Optional navigation target. Renders as `<a>` when set, otherwise as `<span>`.
   * Ignored when `active` is true (active crumb is always rendered as text).
   */
  @Prop() href?: string;

  /**
   * Marks this crumb as the current page. Adds `aria-current="page"`, switches to
   * medium font weight, and disables navigation (renders as text).
   * @default false
   */
  @Prop({ reflect: true }) active: boolean = false;

  /**
   * Visited link styling — text turns magenta (`--color-text-brand-visited`).
   * Maps to the CSS pseudo-state for declarative use cases.
   * @default false
   */
  @Prop({ reflect: true }) visited: boolean = false;

  /**
   * Disables interaction and applies the disabled text color.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Replaces the label with a spinner while keeping the crumb width.
   * Used for async navigation where the parent page hasn't loaded yet.
   * @default false
   */
  @Prop({ reflect: true }) loading: boolean = false;

  /**
   * Accessible-name fallback when the default slot is empty (e.g. icon-only crumb).
   * If the slot contains visible text, that text is the accessible name — this prop
   * is NOT applied as an `aria-label` override on the rendered element to preserve
   * the slot-first content rule.
   */
  @Prop() label?: string;

  @State() private hasIconStartSlot: boolean = false;

  @Element() host!: HTMLMudBreadcrumbItemElement;

  /**
   * Fired when the crumb is activated (click or Enter/Space on a non-link crumb).
   * Cancelable — `preventDefault()` lets the consumer handle navigation.
   */
  @Event({ bubbles: true, composed: true, cancelable: true })
  mudSelect!: EventEmitter<{ label: string; href?: string }>;

  private readonly onIconStartSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasIconStartSlot = slot.assignedNodes({ flatten: true }).length > 0;
  };

  private readonly handleClick = (ev: MouseEvent) => {
    if (this.disabled || this.loading || this.active) {
      ev.preventDefault();
      return;
    }
    const detail = { label: this.label ?? this.host.textContent?.trim() ?? '', href: this.href };
    const dispatched = this.mudSelect.emit(detail);
    if (dispatched.defaultPrevented) ev.preventDefault();
  };

  private readonly handleKeyDown = (ev: KeyboardEvent) => {
    if (this.disabled || this.loading || this.active) return;
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    // anchors trigger Enter natively; intercept only the spacebar
    if (ev.key === ' ' || !this.href) {
      ev.preventDefault();
      const detail = { label: this.label ?? this.host.textContent?.trim() ?? '', href: this.href };
      this.mudSelect.emit(detail);
    }
  };

  render() {
    const renderAsLink = !!this.href && !this.active && !this.disabled && !this.loading;
    const needsTooltip = !this.loading && !!this.label && this.label.length > BREADCRUMB_TRUNCATE_AT;
    const iconClasses = {
      'icon-start': true,
      'icon-start--visible': this.hasIconStartSlot,
    };
    const labelBody = this.loading ? (
      <mud-spinner size="xs" variant="dark" label="Loading"></mud-spinner>
    ) : (
      <span class="crumb-content">
        <span class={iconClasses}>
          <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
        </span>
        <span class="crumb-text">
          <slot>{this.label}</slot>
        </span>
      </span>
    );

    const crumbBody = renderAsLink ? (
      <a
        slot={needsTooltip ? 'trigger' : undefined}
        class="crumb crumb--link"
        href={this.href}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        {labelBody}
      </a>
    ) : (
      <span
        slot={needsTooltip ? 'trigger' : undefined}
        class={{
          'crumb': true,
          'crumb--text': true,
          'crumb--active': this.active,
          'crumb--disabled': this.disabled,
          'crumb--loading': this.loading,
        }}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        {labelBody}
      </span>
    );

    return (
      <Host
        aria-current={this.active ? 'page' : null}
        aria-disabled={this.disabled ? 'true' : null}
        aria-busy={this.loading ? 'true' : null}
      >
        {needsTooltip ? (
          <mud-tooltip content={this.label} position="top">
            {crumbBody}
          </mud-tooltip>
        ) : (
          crumbBody
        )}
      </Host>
    );
  }
}
