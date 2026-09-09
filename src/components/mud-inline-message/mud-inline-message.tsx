import { Component, Host, Prop, h } from '@stencil/core';

import { INLINE_MESSAGE_DEFAULT_ICONS } from './mud-inline-message.types';
import type { InlineMessageSize, InlineMessageVariant } from './mud-inline-message.types';

/**
 * Inline Message — lightweight, in-context feedback rendered as a coloured
 * leading icon plus a short text line (no surface, border, or padding).
 *
 * Used alongside inputs, form fields, or any UI element to give immediate
 * guidance — the same visual pattern the form controls render as their
 * assistive / error text, exposed here as a standalone atom for use outside a
 * specific control.
 *
 * `variant` selects the semantic colour (`info` keeps neutral text with a
 * brand-blue icon; `warning` / `success` / `error` colour both). `size` is
 * `small` (12px) or `medium` (14px).
 *
 * It is plain in-flow text, **not** an ARIA live region. When used as form
 * feedback, associate it with the field via `aria-describedby` (and
 * `aria-invalid` for errors) on the consumer side; for a transient, announced
 * message use `mud-toast` / `mud-banner`. The icon is decorative.
 *
 * @element mud-inline-message
 *
 * @slot - (default) The message text.
 */
@Component({
  tag: 'mud-inline-message',
  styleUrl: 'mud-inline-message.css',
  shadow: true,
})
export class MudInlineMessage {
  /**
   * Semantic variant. `info` (default) uses neutral text with a brand-blue
   * icon; `warning` / `success` / `error` colour both icon and text.
   * @default 'info'
   */
  @Prop({ reflect: true }) variant: InlineMessageVariant = 'info';

  /**
   * Size rung — `small` (12px / 16px icon) or `medium` (14px / 20px icon).
   * @default 'medium'
   */
  @Prop({ reflect: true }) size: InlineMessageSize = 'medium';

  /**
   * Suppress the leading icon (the `icon-none` variation).
   * @default false
   */
  @Prop({ reflect: true, attribute: 'hide-icon' }) hideIcon: boolean = false;

  /**
   * Override the default per-variant `mud-icon` name.
   */
  @Prop() iconName?: string;

  private resolveIconName(): string {
    if (this.iconName && this.iconName.trim().length > 0) return this.iconName;
    return INLINE_MESSAGE_DEFAULT_ICONS[this.variant];
  }

  render() {
    const iconSize: 16 | 20 = this.size === 'small' ? 16 : 20;

    return (
      <Host>
        {!this.hideIcon ? (
          <span class="icon" aria-hidden="true">
            <mud-icon name={this.resolveIconName()} size={iconSize} />
          </span>
        ) : null}
        <span class="text">
          <slot />
        </span>
      </Host>
    );
  }
}
