import { Component, Element, Event, EventEmitter, Host, Prop, h } from '@stencil/core';

/**
 * A single crumb inside `cor-breadcrumb`. Renders an anchor when `href` is set,
 * otherwise plain text. The active crumb renders as text with `aria-current="page"`,
 * regardless of `href`.
 *
 * Use this directly when the markup variant of the breadcrumb is preferred over
 * the `items` prop on `cor-breadcrumb`. Both APIs are equivalent in behavior.
 *
 * @element cor-breadcrumb-item
 *
 * @slot - (default) Label content. Use plain text or inline elements (`<strong>`, `<span>`).
 */
@Component({
  tag: 'cor-breadcrumb-item',
  styleUrl: 'cor-breadcrumb-item.css',
  shadow: true,
})
export class CorBreadcrumbItem {
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

  /** Accessible name override — required when the default slot is empty. */
  @Prop() label?: string;

  @Element() host!: HTMLElement;

  /**
   * Fired when the crumb is activated (click or Enter/Space on a non-link crumb).
   * Cancelable — `preventDefault()` lets the consumer handle navigation.
   */
  @Event({ bubbles: true, composed: true, cancelable: true })
  corSelect!: EventEmitter<{ label: string; href?: string }>;

  private readonly handleClick = (ev: MouseEvent) => {
    if (this.disabled || this.loading || this.active) {
      ev.preventDefault();
      return;
    }
    const detail = { label: this.label ?? this.host.textContent?.trim() ?? '', href: this.href };
    const dispatched = this.corSelect.emit(detail);
    if (dispatched.defaultPrevented) ev.preventDefault();
  };

  private readonly handleKeyDown = (ev: KeyboardEvent) => {
    if (this.disabled || this.loading || this.active) return;
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    // anchors trigger Enter natively; intercept only the spacebar
    if (ev.key === ' ' || !this.href) {
      ev.preventDefault();
      const detail = { label: this.label ?? this.host.textContent?.trim() ?? '', href: this.href };
      this.corSelect.emit(detail);
    }
  };

  render() {
    const renderAsLink = !!this.href && !this.active && !this.disabled && !this.loading;
    const inner = this.loading ? (
      <cor-spinner size="xs" variant="dark" label="Loading"></cor-spinner>
    ) : (
      <slot>{this.label}</slot>
    );

    return (
      <Host
        aria-current={this.active ? 'page' : null}
        aria-disabled={this.disabled ? 'true' : null}
        aria-busy={this.loading ? 'true' : null}
      >
        {renderAsLink ? (
          <a
            class="crumb crumb--link"
            href={this.href}
            aria-label={this.label}
            onClick={this.handleClick}
            onKeyDown={this.handleKeyDown}
          >
            {inner}
          </a>
        ) : (
          <span
            class={{
              'crumb': true,
              'crumb--text': true,
              'crumb--active': this.active,
              'crumb--disabled': this.disabled,
              'crumb--loading': this.loading,
            }}
            aria-label={this.label}
          >
            {inner}
          </span>
        )}
      </Host>
    );
  }
}
