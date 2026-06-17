import { Component, Element, Event, Host, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import { BANNER_ASSERTIVE_VARIANTS, BANNER_DEFAULT_ICONS } from './mud-banner.types';
import type { BannerEmphasis, BannerVariant } from './mud-banner.types';

/**
 * Banner — full-width, top-of-page system message.
 *
 * A persistent, non-contextual notification that spans the width of its
 * container and informs users of important system-wide events (scheduled
 * maintenance, outages, announcements). Draws attention without blocking
 * interaction; remains visible until dismissed or resolved.
 *
 * Pattern B (atom-display + interactive close): the optional close affordance
 * lives in shadow DOM with a real `button` role. The body is not interactive
 * apart from the optional inline link.
 *
 * `variant` selects the semantic color family — `info`, `warning`, or `error`
 * (Figma exposes no `success` for banners). `emphasis` selects the surface
 * treatment — `subtle` (tinted) or `strong` (filled, on-color foreground).
 *
 * Live-region routing follows WCAG status/alert conventions:
 * - `info` → `role="status"` + `aria-live="polite"`
 * - `warning` / `error` → `role="alert"` + `aria-live="assertive"`
 *
 * @element mud-banner
 *
 * @slot - (default) The banner message. Plain text or rich inline content.
 * @slot icon-start - Optional override for the leading icon. When supplied,
 *                    suppresses both the `iconName` prop and the per-variant
 *                    default icon.
 */
@Component({
  tag: 'mud-banner',
  styleUrl: 'mud-banner.css',
  shadow: true,
})
export class MudBanner {
  /**
   * Semantic color family. Per Figma the banner exposes `info`, `warning`,
   * and `error` (no `success`).
   * @default 'info'
   */
  @Prop({ reflect: true }) variant: BannerVariant = 'info';

  /**
   * Surface treatment: `subtle` (tinted background, dark text) or `strong`
   * (filled background, on-color text).
   * @default 'subtle'
   */
  @Prop({ reflect: true }) emphasis: BannerEmphasis = 'subtle';

  /**
   * When `true`, renders a trailing close (×) button. Activating it emits
   * `mudDismiss`; the consumer is responsible for removing the banner from
   * the DOM.
   * @default false
   */
  @Prop({ reflect: true }) dismissible: boolean = false;

  /**
   * Optional inline link text rendered after the message (the Figma
   * "Click here" affordance). Pair with `linkHref` for a real destination.
   */
  @Prop() linkText?: string;

  /** Href for the optional inline link. Defaults to `#` when omitted. */
  @Prop() linkHref?: string;

  /**
   * Override the default `mud-icon` name for the variant. Ignored when the
   * `icon-start` slot is populated.
   */
  @Prop() iconName?: string;

  /** Forwarded to the host as `aria-label`. */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /**
   * Close-button accessible label. Defaults to the Romanian "Închide".
   * @default 'Închide'
   */
  @Prop() closeLabel: string = 'Închide';

  @State() private hasIconStart: boolean = false;

  @Element() host!: HTMLMudBannerElement;

  /**
   * Fires when the user activates the close button. Payload is `void` — the
   * consumer owns the dismiss animation / DOM removal.
   */
  @Event() mudDismiss!: EventEmitter<void>;

  componentWillLoad(): void {
    this.detectSlots();
  }

  private detectSlots(): void {
    let hasIconStart = false;
    const children = this.host.childNodes as unknown as Node[];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
      if ((node as Element).getAttribute('slot') === 'icon-start') hasIconStart = true;
    }
    this.hasIconStart = hasIconStart;
  }

  private onIconSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasIconStart = slot.assignedElements({ flatten: true }).length > 0;
  };

  private handleCloseClick = (ev: MouseEvent) => {
    ev.stopPropagation();
    this.mudDismiss.emit();
  };

  private handleCloseKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      this.mudDismiss.emit();
    }
  };

  private resolveIconName(): string {
    if (this.iconName && this.iconName.trim().length > 0) return this.iconName;
    return BANNER_DEFAULT_ICONS[this.variant];
  }

  private resolveAriaRole(): 'status' | 'alert' {
    return BANNER_ASSERTIVE_VARIANTS.has(this.variant) ? 'alert' : 'status';
  }

  private resolveAriaLive(): 'polite' | 'assertive' {
    return BANNER_ASSERTIVE_VARIANTS.has(this.variant) ? 'assertive' : 'polite';
  }

  private hasLink(): boolean {
    return !!(this.linkText && this.linkText.trim().length > 0);
  }

  render() {
    const iconName = this.resolveIconName();
    const role = this.resolveAriaRole();
    const ariaLive = this.resolveAriaLive();

    const hostClasses = {
      'has-icon-start': this.hasIconStart,
      'has-link': this.hasLink(),
      'is-dismissible': this.dismissible,
    };

    return (
      <Host class={hostClasses} role={role} aria-live={ariaLive} aria-atomic="true">
        <div class="content">
          <span class="icon" aria-hidden="true">
            <slot name="icon-start" onSlotchange={this.onIconSlotChange}>
              <mud-icon name={iconName} size={24} />
            </slot>
          </span>

          <p class="message" part="message">
            <slot />
          </p>

          {this.hasLink() ? (
            <a class="link" part="link" href={this.linkHref ?? '#'}>
              {this.linkText}
            </a>
          ) : null}
        </div>

        {this.dismissible ? (
          <button
            class="close"
            type="button"
            part="close"
            aria-label={this.closeLabel}
            onClick={this.handleCloseClick}
            onKeyDown={this.handleCloseKeyDown}
          >
            <span class="close-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" focusable="false">
                <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </span>
          </button>
        ) : null}
      </Host>
    );
  }
}
