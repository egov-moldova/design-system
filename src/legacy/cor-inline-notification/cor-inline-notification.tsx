import { Component, Host, Element, Prop, State, Event, EventEmitter, h } from '@stencil/core';
import { CorInlineNotificationVariant, NotificationState } from './cor-inline-notification.enums';
import { IconSize } from '../cor-icon/cor-icon.types';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { VALID_ICON_SLOT_TAGS } from '../shared.constants';

const NOTIFICATION_ICON_NAME: Record<NotificationState, string> = {
  [NotificationState.ERROR]: ICON_NAMES.WARNING__ALT__FILLED,
  [NotificationState.WARNING]: ICON_NAMES.WARNING__ALT__FILLED,
  [NotificationState.SUCCESS]: ICON_NAMES.CHECKMARK__FILLED,
  [NotificationState.INFO]: ICON_NAMES.INFORMATION__FILLED,
};

/**
 * Contextual inline notification. Appears inside the content flow, fills the
 * width of its container, has no elevation, and optionally includes a dismiss button.
 *
 * Supported states: error · warning · success · info
 *
 * @element cor-inline-notification
 *
 * @slot icon     - Override the semantic icon. Accepts `cor-icon` only.
 * @slot title    - Heading text (e.g. `<span slot="title">Error</span>`).
 * @slot subtitle - Supporting description.
 * @slot meta     - Metadata (e.g. timestamp).
 * @slot actions  - CTA buttons. Maximum 2 `cor-button` elements recommended.
 * @slot close-icon - Override the dismiss icon rendered inside the close button.
 */
@Component({
  tag: 'cor-inline-notification',
  styleUrl: 'cor-inline-notification.css',
  shadow: true,
})
export class CorInlineNotification {
  /**
   * Semantic state of the notification.
   * Controls icon, accent colour, background, and title colour.
   * @default info
   */
  @Prop({ reflect: true }) state: NotificationState = NotificationState.INFO;

  /**
   * When `true`, renders a dismiss button.
   * @default true
   */
  @Prop({ reflect: true }) dismissible: boolean = true;

  /**
   * Visual variant of the inline notification.
   * @default "default"
   */
  @Prop({ reflect: true }) variant: CorInlineNotificationVariant | `${CorInlineNotificationVariant}` =
    CorInlineNotificationVariant.DEFAULT;

  @State() hasIconSlot: boolean = false;
  @State() hasTitleSlot: boolean = false;
  @State() hasSubtitleSlot: boolean = false;
  @State() hasMetaSlot: boolean = false;
  @State() hasActionsSlot: boolean = false;
  @State() hasCloseIconSlot: boolean = false;

  @Element() host!: HTMLCorInlineNotificationElement;

  /**
   * Emitted when the user dismisses the notification.
   */
  @Event() corDismiss!: EventEmitter<void>;

  private iconSlotRef: HTMLSlotElement | null = null;
  private titleSlotRef: HTMLSlotElement | null = null;
  private subtitleSlotRef: HTMLSlotElement | null = null;
  private metaSlotRef: HTMLSlotElement | null = null;
  private actionsSlotRef: HTMLSlotElement | null = null;
  private closeIconSlotRef: HTMLSlotElement | null = null;

  componentWillLoad(): void {
    this.hasIconSlot = !!this.host.querySelector('[slot="icon"]');
    this.hasTitleSlot = !!this.host.querySelector('[slot="title"]');
    this.hasSubtitleSlot = !!this.host.querySelector('[slot="subtitle"]');
    this.hasMetaSlot = !!this.host.querySelector('[slot="meta"]');
    this.hasActionsSlot = !!this.host.querySelector('[slot="actions"]');
    this.hasCloseIconSlot = !!this.host.querySelector('[slot="close-icon"]');
  }

  private checkIconSlot = (): void => {
    if (this.iconSlotRef) {
      this.hasIconSlot = this.iconSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  private checkTitleSlot = (): void => {
    if (this.titleSlotRef) {
      this.hasTitleSlot = this.titleSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  private checkSubtitleSlot = (): void => {
    if (this.subtitleSlotRef) {
      this.hasSubtitleSlot = this.subtitleSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  private checkMetaSlot = (): void => {
    if (this.metaSlotRef) {
      this.hasMetaSlot = this.metaSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  private checkCloseIconSlot = (): void => {
    if (this.closeIconSlotRef) {
      this.hasCloseIconSlot = this.closeIconSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  private checkActionsSlot = (): void => {
    if (this.actionsSlotRef) {
      this.hasActionsSlot = this.actionsSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  private handleDismiss = (): void => {
    this.corDismiss.emit();
    this.host.setAttribute('hidden', '');
  };

  private getAriaRole(): string {
    if (this.state === NotificationState.ERROR || this.state === NotificationState.WARNING) {
      return 'alert';
    }
    return 'status';
  }

  private getAriaLive(): string | undefined {
    if (this.state === NotificationState.ERROR || this.state === NotificationState.WARNING) {
      return undefined;
    }
    return 'polite';
  }

  render() {
    const iconSlotEl = this.host.querySelector('[slot="icon"]');
    const iconSlotTag = iconSlotEl?.tagName.toLowerCase();
    if (iconSlotEl && iconSlotTag !== 'slot' && !VALID_ICON_SLOT_TAGS.includes(iconSlotTag!)) {
      return <Host>{invalidSlottedTag(iconSlotTag!, VALID_ICON_SLOT_TAGS)}</Host>;
    }

    const ariaRole = this.getAriaRole();
    const ariaLive = this.getAriaLive();

    const iconName = this.variant === 'in-form' ? NOTIFICATION_ICON_NAME[this.state] : ICON_NAMES.WARNING__FILLED;

    return (
      <Host
        class={{ [`state-${this.state}`]: true, dismissible: this.dismissible }}
        role={ariaRole}
        aria-live={ariaLive}
      >
        <div class="accent-bar" aria-hidden="true" />

        <div class="content-wrapper">
          <div class="icon-area" aria-hidden="true">
            <slot
              name="icon"
              ref={el => (this.iconSlotRef = el as HTMLSlotElement | null)}
              onSlotchange={this.checkIconSlot}
            />
            {!this.hasIconSlot && <cor-icon name={iconName} color="currentColor" size={IconSize.MD} />}
          </div>

          <div class="body">
            <div class={{ 'title-wrapper': true, 'is-empty': !this.hasTitleSlot }}>
              <slot
                name="title"
                ref={el => (this.titleSlotRef = el as HTMLSlotElement | null)}
                onSlotchange={this.checkTitleSlot}
              />
            </div>

            <div class={{ 'subtitle-wrapper': true, 'is-empty': !this.hasSubtitleSlot }}>
              <slot
                name="subtitle"
                ref={el => (this.subtitleSlotRef = el as HTMLSlotElement | null)}
                onSlotchange={this.checkSubtitleSlot}
              />
            </div>

            <div class={{ 'meta-wrapper': true, 'is-empty': !this.hasMetaSlot }}>
              <slot
                name="meta"
                ref={el => (this.metaSlotRef = el as HTMLSlotElement | null)}
                onSlotchange={this.checkMetaSlot}
              />
            </div>

            <div class={{ 'actions-wrapper': true, 'is-empty': !this.hasActionsSlot }}>
              <slot
                name="actions"
                ref={el => (this.actionsSlotRef = el as HTMLSlotElement | null)}
                onSlotchange={this.checkActionsSlot}
              />
            </div>
          </div>

          {this.dismissible && (
            <div class="close-area">
              <button class="close-button" type="button" aria-label="Close notification" onClick={this.handleDismiss}>
                {!this.hasCloseIconSlot && <cor-icon name={ICON_NAMES.CLOSE} color="currentColor" size={IconSize.SM} />}
                <slot
                  name="close-icon"
                  ref={el => (this.closeIconSlotRef = el as HTMLSlotElement | null)}
                  onSlotchange={this.checkCloseIconSlot}
                />
              </button>
            </div>
          )}
        </div>
      </Host>
    );
  }
}
