import { Component, Element, Event, Host, Prop, State, forceUpdate, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import { hasIconVariant, type IconName } from '../mud-icon/mud-icon.types';
import { localeMessages, watchDocumentLang, hostLang } from '../../utils/locale';
import type { LocaleProp } from '../../utils/locale';
import { BANNER_MESSAGES } from './mud-banner.messages';
import type { BannerMessages } from './mud-banner.messages';
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
 * apart from the optional actions (`actions` slot).
 *
 * `variant` selects the semantic color family — `info`, `warning`, or `error`
 * (Figma exposes no `success` for banners). `emphasis` selects the surface
 * treatment — `subtle` (tinted) or `strong` (filled, on-color foreground).
 *
 * Live-region routing follows WCAG status/alert conventions:
 * - `info` → `role="status"` + `aria-live="polite"`
 * - `warning` / `error` → `role="alert"` + `aria-live="assertive"`
 *
 * Give the banner an accessible name by setting the native `aria-label`
 * attribute on the host directly — the platform keeps it there untouched.
 *
 * @element mud-banner
 *
 * @slot - (default) The banner message. Plain text or rich inline content.
 * @slot icon-start - Optional override for the leading icon. When supplied,
 *                    suppresses both the `iconName` prop and the per-variant
 *                    default icon.
 * @slot actions - Optional inline actions after the message, typically one
 *                 `mud-link` (Figma's "Click here" is the link component, Primary,
 *                 16, underlined; use `variant="white"` on `emphasis="strong"`).
 *                 Replaces `linkText` / `linkHref` when filled.
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
   *
   * @deprecated A link built from props cannot take routing, `target` / `rel` or a
   * click handler. Put a `mud-link` in the `actions` slot instead; `linkText` goes
   * away in the next major.
   */
  @Prop() linkText?: string;

  /**
   * Href for the optional inline link. Defaults to `#` when omitted.
   *
   * @deprecated Use the `actions` slot, as for `linkText`.
   */
  @Prop() linkHref?: string;

  /**
   * Override the default `mud-icon` name for the variant. Ignored when the
   * `icon-start` slot is populated.
   */
  @Prop() iconName?: IconName;

  /**
   * Language of the built-in copy. Unset, the component follows the closest ancestor `lang`
   * (`<html lang>` included), else `ro-MD`.
   */
  @Prop({ reflect: true }) locale?: LocaleProp;

  /**
   * Close-button accessible label. Overrides the `locale`'s copy when set to a non-empty string.
   * @default 'Închide' (ro-MD)
   */
  @Prop() closeLabel?: string;

  @State() private hasIconStart: boolean = false;
  @State() private hasActions: boolean = false;

  @Element() host!: HTMLMudBannerElement;

  /**
   * Fires when the user activates the close button. Payload is `void` — the
   * consumer owns the dismiss animation / DOM removal.
   */
  @Event() mudDismiss!: EventEmitter<void>;

  private stopLang?: () => void;
  private warnedLinkDeprecated = false;

  connectedCallback() {
    this.stopLang = watchDocumentLang(
      this.host,
      () => this.locale,
      () => forceUpdate(this),
    );
  }

  disconnectedCallback() {
    this.stopLang?.();
  }

  componentWillLoad(): void {
    this.detectSlots();
  }

  componentDidRender(): void {
    if (this.hasLink() && !this.warnedLinkDeprecated) {
      this.warnedLinkDeprecated = true;
      console.warn(
        '[mud-banner] `linkText` / `linkHref` are deprecated: put a <mud-link> in the `actions` slot instead. They go away in the next major.',
      );
    }
  }

  /**
   * Built-in strings in the resolved locale, with the override props on top.
   */
  private messages(): BannerMessages {
    return localeMessages('mud-banner', this.host, this.locale, BANNER_MESSAGES, {
      closeLabel: this.closeLabel,
    });
  }

  private detectSlots(): void {
    let hasIconStart = false;
    let hasActions = false;
    const children = this.host.childNodes as unknown as Node[];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
      const slot = (node as Element).getAttribute('slot');
      if (slot === 'icon-start') hasIconStart = true;
      if (slot === 'actions') hasActions = true;
    }
    this.hasIconStart = hasIconStart;
    this.hasActions = hasActions;
  }

  private onActionsSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasActions = slot.assignedElements({ flatten: true }).length > 0;
  };

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

  private resolveIconName(): IconName {
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
    const m = this.messages();
    const iconName = this.resolveIconName();
    const role = this.resolveAriaRole();
    const ariaLive = this.resolveAriaLive();
    const lang = hostLang(this.host, this.locale);
    // The actions slot replaces the deprecated link props when it is filled.
    const showLink = this.hasLink() && !this.hasActions;

    const hostClasses = {
      'has-icon-start': this.hasIconStart,
      'has-link': showLink,
      'has-actions': this.hasActions,
      'is-dismissible': this.dismissible,
    };

    return (
      <Host class={hostClasses} role={role} aria-live={ariaLive} aria-atomic="true" lang={lang}>
        <div class="content">
          <span class="icon" aria-hidden="true">
            <slot name="icon-start" onSlotchange={this.onIconSlotChange}>
              <mud-icon
                name={iconName}
                variant={hasIconVariant(iconName, 'filled') ? 'filled' : 'outlined'}
                size={24}
              />
            </slot>
          </span>

          <p class="message" part="message">
            <slot />
          </p>

          <span class="actions" part="actions">
            <slot name="actions" onSlotchange={this.onActionsSlotChange} />
          </span>

          {showLink ? (
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
            aria-label={m.closeLabel}
            onClick={this.handleCloseClick}
            onKeyDown={this.handleCloseKeyDown}
          >
            <span class="close-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" focusable="false">
                <path
                  d="M3.333 3.333 L12.667 12.667 M12.667 3.333 L3.333 12.667"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </span>
          </button>
        ) : null}
      </Host>
    );
  }
}
