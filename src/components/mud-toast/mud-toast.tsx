import { Component, Element, Event, Host, Listen, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import { hasIconVariant, type IconName } from '../mud-icon/mud-icon.types';
import { TOAST_ASSERTIVE_VARIANTS, TOAST_DEFAULT_ICONS, TOAST_DISMISS_FALLBACK_MS } from './mud-toast.types';
import type { ToastVariant } from './mud-toast.types';

/**
 * Toast — semantic toast message (350px filled surface, 8px radius).
 *
 * Matches the Figma `toast` component (page "Messaging (Notification)"):
 * a leading icon, an optional bold heading, the message body (default slot),
 * an optional inline link/action group (`actions` slot) and a trailing close
 * button (shown by default — `closable` defaults to `true`).
 *
 * Placement, vertical stacking and auto-dismiss are the consumer's
 * responsibility — this atom is just the surface. Its entrance animation
 * (slide-down + fade-in) plays once on mount; closing it fades it out in
 * place before `mudClose` fires (Figma Behavior › dismissal).
 *
 * Pattern B (atom-display + interactive close): the close affordance lives
 * inside shadow DOM so it participates in tab order with a real
 * `button` role. The body itself is not interactive.
 *
 * `variant` selects the semantic color family — `info`, `warning`, `success`,
 * or `error` — each a filled toast surface with its own leading icon.
 *
 * Live-region routing:
 * - `info` / `success` → `role="status"` + `aria-live="polite"`
 * - `warning` / `error` → `role="alert"` + `aria-live="assertive"`
 *
 * @element mud-toast
 *
 * @slot - (default) The message body. Plain text or rich inline content.
 * @slot icon-start - Optional override for the leading icon. When supplied,
 *                    suppresses both the `iconName` prop and the per-variant
 *                    default icon.
 * @slot actions - Optional inline action group (typically `mud-button` or
 *                 `mud-link`). Renders as its own line below the heading/body
 *                 stack (Figma `toast` `w/ heading: link` variant).
 */
@Component({
  tag: 'mud-toast',
  styleUrl: 'mud-toast.css',
  shadow: true,
})
export class MudToast {
  /**
   * Semantic color family.
   * @default 'info'
   */
  @Prop({ reflect: true }) variant: ToastVariant = 'info';

  /**
   * Renders a trailing close button. Activating it emits `mudClose`; the
   * consumer is responsible for removing the toast from the DOM. Defaults to
   * `true` per the Figma `toast` component (`Close = true`); set
   * `closable="false"` for a toast the user cannot dismiss manually (e.g. one
   * that only auto-dismisses).
   * @default true
   */
  @Prop({ reflect: true }) closable: boolean = true;

  /**
   * Optional bold title rendered above the body.
   */
  @Prop() titleText?: string;

  /**
   * Override the default `mud-icon` name for the variant (e.g. swap
   * `circle-info` for a custom glyph). When the `icon-start` slot
   * is populated, this prop is ignored.
   */
  @Prop() iconName?: IconName;

  /**
   * Forwarded to the host as `aria-label`. Use this to give the entire
   * toast an explicit accessible name when the body content alone is
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
  @State() private dismissing: boolean = false;

  @Element() host!: HTMLMudToastElement;

  /**
   * Fires once the close fade-out has finished (at once under
   * `prefers-reduced-motion`). Payload is `void` — the consumer removes the
   * toast from the DOM.
   */
  @Event() mudClose!: EventEmitter<void>;

  private dismissTimer?: ReturnType<typeof setTimeout>;

  /** Ends the close fade-out; the entrance animation ends here too and is ignored. */
  @Listen('animationend')
  onAnimationEnd(ev: AnimationEvent): void {
    if (ev.animationName === 'toast-dismiss') this.finishDismiss();
  }

  componentWillLoad(): void {
    this.detectSlots();
  }

  disconnectedCallback(): void {
    clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
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
    this.dismiss();
  };

  private handleCloseKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      this.dismiss();
    }
  };

  /** Fades the toast out, then emits `mudClose`; a second close is ignored. */
  private dismiss(): void {
    if (this.dismissing) return;
    const reduceMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      this.mudClose.emit();
      return;
    }
    this.dismissing = true;
    this.dismissTimer = setTimeout(this.finishDismiss, TOAST_DISMISS_FALLBACK_MS);
  }

  private finishDismiss = () => {
    if (this.dismissTimer === undefined) return;
    clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
    this.mudClose.emit();
  };

  private resolveIconName(): IconName {
    if (this.iconName && this.iconName.trim().length > 0) return this.iconName;
    return TOAST_DEFAULT_ICONS[this.variant];
  }

  private resolveAriaRole(): 'status' | 'alert' {
    return TOAST_ASSERTIVE_VARIANTS.has(this.variant) ? 'alert' : 'status';
  }

  private resolveAriaLive(): 'polite' | 'assertive' {
    return TOAST_ASSERTIVE_VARIANTS.has(this.variant) ? 'assertive' : 'polite';
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
      'is-dismissing': this.dismissing,
    };

    return (
      <Host class={hostClasses} role={role} aria-live={ariaLive} aria-atomic="true">
        <div class="main">
          <span class="icon" aria-hidden="true">
            <slot name="icon-start" onSlotchange={this.onIconSlotChange}>
              <mud-icon
                name={iconName}
                variant={hasIconVariant(iconName, 'filled') ? 'filled' : 'outlined'}
                size={24}
              />
            </slot>
          </span>

          <div class="content">
            <div class="heading">
              {this.titleText && this.titleText.trim().length > 0 ? <p class="title">{this.titleText}</p> : null}
              <p class="body">
                <slot />
              </p>
            </div>

            <div class="actions">
              <slot name="actions" onSlotchange={this.onActionsSlotChange} />
            </div>
          </div>
        </div>

        {this.closable ? (
          <button
            class="close"
            type="button"
            aria-label={this.closeLabel}
            onClick={this.handleCloseClick}
            onKeyDown={this.handleCloseKeyDown}
          >
            {/* Figma's own 16px `16/cross-large` glyph (3044:24437). mud-icon's
                cross-large is drawn on a 24px grid; scaled to 16px it comes out
                shorter and thinner than the design. */}
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
