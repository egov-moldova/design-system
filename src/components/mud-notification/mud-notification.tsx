import { Component, Element, Event, Host, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import { NOTIFICATION_ASSERTIVE_VARIANTS, NOTIFICATION_DEFAULT_ICONS } from './mud-notification.types';
import type { NotificationStyle, NotificationVariant } from './mud-notification.types';

/**
 * Notification — semantic messaging banner.
 *
 * Renders an optional leading icon, an optional bold title, the message body
 * (default slot), an optional inline action group (`actions` slot) and an
 * optional trailing close button.
 *
 * Pattern B (atom-display + interactive close): the close affordance lives
 * inside shadow DOM so it participates in tab order with a real
 * `button` role. The body itself is not interactive.
 *
 * `variant` selects the semantic color family (info / positive / warning /
 * danger / neutral). `notificationStyle` toggles between the soft tinted
 * background (`subtle`) and the filled high-emphasis treatment (`strong`).
 *
 * Live-region routing:
 * - `info` / `positive` / `neutral` → `role="status"` + `aria-live="polite"`
 * - `warning` / `danger` → `role="alert"` + `aria-live="assertive"`
 *
 * @element mud-notification
 *
 * @slot - (default) The message body. Plain text or rich inline content.
 * @slot icon-start - Optional override for the leading icon. When supplied,
 *                    suppresses both the `iconName` prop and the per-variant
 *                    default icon.
 * @slot actions - Optional inline action group (typically `mud-button` or
 *                 `mud-link`). Aligned to the trailing edge before the close
 *                 button when present.
 */
@Component({
  tag: 'mud-notification',
  styleUrl: 'mud-notification.css',
  shadow: true,
})
export class MudNotification {
  /**
   * Semantic color family.
   * @default 'info'
   */
  @Prop({ reflect: true }) variant: NotificationVariant = 'info';

  /**
   * Visual intensity. `subtle` renders a tinted background with high-contrast
   * dark text; `strong` renders a filled semantic background with on-color
   * text. The attribute is reflected as `notification-style` to avoid
   * colliding with the global `style` attribute on every HTML element.
   * @default 'subtle'
   */
  @Prop({ reflect: true, attribute: 'notification-style' })
  notificationStyle: NotificationStyle = 'subtle';

  /**
   * When `true`, renders a trailing close button. Activating it emits
   * `mudClose`; the consumer is responsible for removing the notification
   * from the DOM.
   * @default false
   */
  @Prop({ reflect: true }) closable: boolean = false;

  /**
   * Optional bold title rendered above the body.
   */
  @Prop() titleText?: string;

  /**
   * Override the default `mud-icon` name for the variant (e.g. swap
   * `circle-info-filled` for a custom glyph). When the `icon-start` slot
   * is populated, this prop is ignored.
   */
  @Prop() iconName?: string;

  /**
   * Forwarded to the host as `aria-label`. Use this to give the entire
   * notification an explicit accessible name when the body content alone is
   * not descriptive enough.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /**
   * Close-button accessible label. Defaults to the Romanian "Închide".
   * Provide an alternative for non-Romanian locales.
   * @default 'Închide'
   */
  @Prop() closeLabel: string = 'Închide';

  @State() private hasIconStart: boolean = false;
  @State() private hasActions: boolean = false;

  @Element() host!: HTMLMudNotificationElement;

  /**
   * Fires when the user activates the close button. Payload is `void` —
   * the consumer is responsible for the dismiss animation / DOM removal.
   */
  @Event() mudClose!: EventEmitter<void>;

  componentWillLoad(): void {
    this.detectSlots();
  }

  private detectSlots(): void {
    let hasIconStart = false;
    let hasActions = false;
    const children = this.host.childNodes as unknown as Node[];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
      const el = node as Element;
      const slot = el.getAttribute('slot');
      if (slot === 'icon-start') hasIconStart = true;
      else if (slot === 'actions') hasActions = true;
    }
    this.hasIconStart = hasIconStart;
    this.hasActions = hasActions;
  }

  private onIconSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasIconStart = slot.assignedElements({ flatten: true }).length > 0;
  };

  private onActionsSlotChange = (ev: Event) => {
    const slot = ev.target as HTMLSlotElement;
    this.hasActions = slot.assignedElements({ flatten: true }).length > 0;
  };

  private handleCloseClick = (ev: MouseEvent) => {
    ev.stopPropagation();
    this.mudClose.emit();
  };

  private handleCloseKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      this.mudClose.emit();
    }
  };

  private resolveIconName(): string {
    if (this.iconName && this.iconName.trim().length > 0) return this.iconName;
    return NOTIFICATION_DEFAULT_ICONS[this.variant];
  }

  private resolveAriaRole(): 'status' | 'alert' {
    return NOTIFICATION_ASSERTIVE_VARIANTS.has(this.variant) ? 'alert' : 'status';
  }

  private resolveAriaLive(): 'polite' | 'assertive' {
    return NOTIFICATION_ASSERTIVE_VARIANTS.has(this.variant) ? 'assertive' : 'polite';
  }

  render() {
    const iconName = this.resolveIconName();
    const role = this.resolveAriaRole();
    const ariaLive = this.resolveAriaLive();

    const hostClasses = {
      'has-icon-start': this.hasIconStart,
      'has-actions': this.hasActions,
      'has-title': !!(this.titleText && this.titleText.trim().length > 0),
      'is-closable': this.closable,
    };

    return (
      <Host class={hostClasses} role={role} aria-live={ariaLive} aria-atomic="true">
        <span class="icon" aria-hidden="true">
          <slot name="icon-start" onSlotchange={this.onIconSlotChange}>
            <mud-icon name={iconName} size={24} />
          </slot>
        </span>

        <div class="content">
          {this.titleText && this.titleText.trim().length > 0 ? <p class="title">{this.titleText}</p> : null}
          <p class="body">
            <slot />
          </p>
        </div>

        <div class="actions">
          <slot name="actions" onSlotchange={this.onActionsSlotChange} />
        </div>

        {this.closable ? (
          <button
            class="close"
            type="button"
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
