import { Component, Element, Event, Host, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import { INFO_BOX_DEFAULT_ICONS } from './mud-info-box.types';
import type { InfoBoxEmphasis, InfoBoxVariant } from './mud-info-box.types';

/**
 * Informational Box — an inline, in-content callout that highlights key
 * messages, announcements, alerts, or explanations within the page flow.
 *
 * Unlike `mud-notification` (a fixed-width corner toast) or `mud-banner` (a
 * full-width page-level bar), the info box sits inside the content column,
 * fills its container's width, and supports rich content: an optional bold
 * heading, a multi-line body (default slot), an optional inline action group
 * (`actions` slot — links/buttons) and an optional close button.
 *
 * Two axes:
 * - `variant` — `info` (neutral icon), `info-moderate` (brand-blue icon),
 *   `warning`, or `error`.
 * - `emphasis` — `subtle` (neutral grey surface, coloured icon) or `strong`
 *   (a tinted semantic surface).
 *
 * The box is static in-flow content, so it is **not** an ARIA live region
 * (that would re-announce on every render). The icon is decorative; the
 * heading and body are read in normal reading order. For transient, announced
 * messages use `mud-notification` / `mud-banner` instead.
 *
 * @element mud-info-box
 *
 * @slot - (default) The body content. Plain text or rich inline/block content.
 * @slot icon-start - Optional override for the leading icon. Ignored when
 *                    `hideIcon` is set.
 * @slot actions - Optional inline action group (typically `mud-link` or
 *                 `mud-button`) rendered below the body.
 */
@Component({
  tag: 'mud-info-box',
  styleUrl: 'mud-info-box.css',
  shadow: true,
})
export class MudInfoBox {
  /**
   * Semantic variant. `info` uses a neutral icon; `info-moderate` uses the
   * brand-blue icon.
   * @default 'info'
   */
  @Prop({ reflect: true }) variant: InfoBoxVariant = 'info';

  /**
   * Visual emphasis — `subtle` (neutral grey surface) or `strong` (tinted
   * semantic surface).
   * @default 'subtle'
   */
  @Prop({ reflect: true }) emphasis: InfoBoxEmphasis = 'subtle';

  /**
   * When `true`, renders a trailing close button. Activating it emits
   * `mudClose`; the consumer removes the box from the DOM.
   * @default false
   */
  @Prop({ reflect: true }) closable: boolean = false;

  /**
   * Suppress the leading icon entirely (the `icon-none` variation).
   * @default false
   */
  @Prop({ reflect: true, attribute: 'hide-icon' }) hideIcon: boolean = false;

  /**
   * Optional bold heading rendered above the body.
   */
  @Prop() titleText?: string;

  /**
   * Override the default per-variant `mud-icon` name. Ignored when the
   * `icon-start` slot is populated or `hideIcon` is set.
   */
  @Prop() iconName?: string;

  /**
   * Close-button accessible label. Defaults to the Romanian "Închide".
   * @default 'Închide'
   */
  @Prop() closeLabel: string = 'Închide';

  @State() private hasActions: boolean = false;

  @Element() host!: HTMLMudInfoBoxElement;

  /**
   * Fires when the user activates the close button. Payload is `void` — the
   * consumer is responsible for removing the box from the DOM.
   */
  @Event() mudClose!: EventEmitter<void>;

  componentWillLoad(): void {
    this.detectSlots();
  }

  private detectSlots(): void {
    let hasActions = false;
    const children = this.host.childNodes as unknown as Node[];
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
      if ((node as Element).getAttribute('slot') === 'actions') hasActions = true;
    }
    this.hasActions = hasActions;
  }

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
    return INFO_BOX_DEFAULT_ICONS[this.variant];
  }

  render() {
    const iconName = this.resolveIconName();
    const hasTitle = !!(this.titleText && this.titleText.trim().length > 0);

    const hostClasses = {
      'has-icon': !this.hideIcon,
      'has-actions': this.hasActions,
      'has-title': hasTitle,
      'is-closable': this.closable,
    };

    return (
      <Host class={hostClasses}>
        <div class="main">
          {!this.hideIcon ? (
            <span class="icon" aria-hidden="true">
              <slot name="icon-start">
                <mud-icon name={iconName} size={20} />
              </slot>
            </span>
          ) : null}

          <div class="content">
            {hasTitle ? <p class="title">{this.titleText}</p> : null}
            <div class="body">
              <slot />
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
