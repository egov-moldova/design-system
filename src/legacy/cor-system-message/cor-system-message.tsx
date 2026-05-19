import { Component, Host, Prop, h } from '@stencil/core';
import { SystemMessageState } from './cor-system-message.enums';
import { SYSTEM_MESSAGE_ICON_NAME, SYSTEM_MESSAGE_ICON_COLOR } from './cor-system-message.constants';
import { IconSize } from '../cor-icon/cor-icon.types';

/**
 * Lightweight inline system message. Used within forms and content areas to
 * convey validation state (alert), guidance (info), or plain text annotation.
 *
 * Reuses the icon+slot pattern from cor-input's helper-text area.
 * No dismiss, no elevation, no accent bar, no title slot.
 *
 * @element cor-system-message
 *
 * @slot - Default slot for message text content.
 */
@Component({
  tag: 'cor-system-message',
  styleUrl: 'cor-system-message.css',
  shadow: true,
})
export class CorSystemMessage {
  /**
   * State of the message. Controls icon and text colour.
   * - `alert`  — Error/danger with warning icon.
   * - `info`   — Informational with info icon.
   * - `text`   — Plain text annotation, no icon.
   * @default text
   */
  @Prop({ reflect: true }) state: SystemMessageState = SystemMessageState.TEXT;

  private getRole(): string {
    return this.state === SystemMessageState.ALERT ? 'alert' : 'status';
  }

  private getAriaLive(): string {
    return this.state === SystemMessageState.ALERT ? 'assertive' : 'polite';
  }

  render() {
    const iconName = SYSTEM_MESSAGE_ICON_NAME[this.state];
    const iconColor = SYSTEM_MESSAGE_ICON_COLOR[this.state];
    const showIcon = !!(iconName && iconColor);

    return (
      <Host class={`state-${this.state}`}>
        <div class="system-message-wrapper" role={this.getRole()} aria-live={this.getAriaLive()}>
          {showIcon && iconName && iconColor && (
            <cor-icon name={iconName} color={iconColor} size={IconSize.SM} aria-hidden="true" />
          )}
          <slot />
        </div>
      </Host>
    );
  }
}
