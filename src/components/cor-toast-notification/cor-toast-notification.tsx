import { Component, Host, Element, Prop, State, Listen, Event, EventEmitter, h } from '@stencil/core';
import { NotificationState, ToastPosition } from './cor-toast-notification.enums';
import { IconSize } from '../cor-icon/cor-icon.types';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
import { VALID_ICON_SLOT_TAGS } from '../shared.constants';

const NOTIFICATION_ICON_NAME: Record<NotificationState, string> = {
  [NotificationState.ERROR]: ICON_NAMES.WARNING__ALT__FILLED,
  [NotificationState.WARNING]: ICON_NAMES.WARNING__ALT__FILLED,
  [NotificationState.SUCCESS]: ICON_NAMES.CHECKMARK__FILLED,
  [NotificationState.INFO]: ICON_NAMES.INFORMATION__FILLED,
  [NotificationState.NEUTRAL]: ICON_NAMES.INFORMATION__FILLED,
};

/**
 * Floating toast notification. Appends itself to `<body>` on mount so it
 * renders above all other content. Supports auto-dismiss with hover-pause,
 * and an entrance/exit animation.
 *
 * Supported states: error · warning · success · info · neutral
 *
 * @element cor-toast-notification
 *
 * @slot icon       - Override the semantic icon. Accepts `cor-icon` only.
 * @slot title      - Heading text.
 * @slot subtitle   - Supporting description.
 * @slot meta       - Metadata (e.g. timestamp).
 * @slot action     - CTA button. Maximum 2 `cor-button` elements recommended.
 * @slot close-icon - Override the dismiss icon.
 */
@Component({
  tag: 'cor-toast-notification',
  styleUrl: 'cor-toast-notification.css',
  shadow: true,
})
export class CorToastNotification {
  /**
   * Semantic state of the toast.
   * Controls icon, accent colour, background, and title colour.
   * @default info
   */
  @Prop({ reflect: true }) state: NotificationState = NotificationState.INFO;

  /**
   * Screen position of the toast.
   * @default bottom-left
   */
  @Prop({ reflect: true }) position: ToastPosition = ToastPosition.BOTTOM_LEFT;

  /**
   * When `true`, renders a dismiss button.
   * @default true
   */
  @Prop({ reflect: true }) dismissible: boolean = true;

  /**
   * Milliseconds before the toast auto-dismisses. Set to `0` to disable.
   * The timer pauses while the user hovers over the toast.
   * @default 5000
   */
  @Prop() autoClose: number = 5000;

  @State() hasIconSlot: boolean = false;
  @State() hasTitleSlot: boolean = false;
  @State() hasSubtitleSlot: boolean = false;
  @State() hasMetaSlot: boolean = false;
  @State() hasActionSlot: boolean = false;
  @State() hasCloseIconSlot: boolean = false;

  @Element() host!: HTMLCorToastNotificationElement;

  /**
   * Emitted when the toast is dismissed (by button, timeout, or programmatically).
   */
  @Event() corDismiss!: EventEmitter<void>;

  private iconSlotRef: HTMLSlotElement | null = null;
  private titleSlotRef: HTMLSlotElement | null = null;
  private subtitleSlotRef: HTMLSlotElement | null = null;
  private metaSlotRef: HTMLSlotElement | null = null;
  private actionSlotRef: HTMLSlotElement | null = null;
  private closeIconSlotRef: HTMLSlotElement | null = null;

  /** Timeout handle for auto-close. */
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  /** Epoch ms when the current timer was started. */
  private timerStartedAt: number = 0;

  /** Ms remaining when the timer was paused (hover). */
  private timeRemaining: number = 0;

  /** Flag to prevent removal during initial mount to body. */
  private isMountedToBody: boolean = false;

  componentWillLoad(): void {
    this.hasIconSlot = !!this.host.querySelector('[slot="icon"]');
    this.hasTitleSlot = !!this.host.querySelector('[slot="title"]');
    this.hasSubtitleSlot = !!this.host.querySelector('[slot="subtitle"]');
    this.hasMetaSlot = !!this.host.querySelector('[slot="meta"]');
    this.hasActionSlot = !!this.host.querySelector('[slot="action"]');
    this.hasCloseIconSlot = !!this.host.querySelector('[slot="close-icon"]');
  }

  componentDidLoad(): void {
    if (this.host.parentElement !== document.body) {
      document.body.appendChild(this.host);
      this.isMountedToBody = true;
    }

    if (this.autoClose > 0) {
      this.timeRemaining = this.autoClose;
      this.startTimer(this.autoClose);
    }
  }

  disconnectedCallback(): void {
    this.clearTimer();
    if (this.isMountedToBody && this.host.parentElement === document.body) {
      this.host.remove();
    }
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

  private checkActionSlot = (): void => {
    if (this.actionSlotRef) {
      this.hasActionSlot = this.actionSlotRef.assignedNodes({ flatten: true }).length > 0;
    }
  };

  @Listen('mouseenter')
  handleMouseEnter(): void {
    if (this.autoClose > 0 && this.autoCloseTimer !== null) {
      const elapsed = Date.now() - this.timerStartedAt;
      this.timeRemaining = Math.max(0, this.timeRemaining - elapsed);
      this.clearTimer();
    }
  }

  @Listen('mouseleave')
  handleMouseLeave(): void {
    if (this.autoClose > 0 && this.timeRemaining > 0 && this.autoCloseTimer === null) {
      this.startTimer(this.timeRemaining);
    }
  }

  private startTimer(duration: number): void {
    this.timerStartedAt = Date.now();
    this.timeRemaining = duration;
    this.autoCloseTimer = setTimeout(() => {
      this.dismiss();
    }, duration);
  }

  private clearTimer(): void {
    if (this.autoCloseTimer !== null) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
  }

  private dismiss(): void {
    this.clearTimer();
    this.corDismiss.emit();

    this.host.classList.add('exiting');
    this.host.addEventListener(
      'animationend',
      () => {
        this.host.remove();
      },
      { once: true },
    );
  }

  private handleDismiss = (): void => {
    this.dismiss();
  };

  private handleDismissKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.handleDismiss();
    }
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

    return (
      <Host
        class={{ [`state-${this.state}`]: true, [`position-${this.position}`]: true, dismissible: this.dismissible }}
        role={ariaRole}
        aria-live={ariaLive}
      >
        <div class="content-wrapper">
          <div class="icon-area" aria-hidden="true">
            <div class="icon-container">
              <slot
                name="icon"
                ref={el => (this.iconSlotRef = el as HTMLSlotElement | null)}
                onSlotchange={this.checkIconSlot}
              />
              {!this.hasIconSlot && (
                <cor-icon name={NOTIFICATION_ICON_NAME[this.state]} color="currentColor" size={IconSize.MD} />
              )}
            </div>
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

            <div class={{ 'actions-wrapper': true, 'is-empty': !this.hasActionSlot }}>
              <slot
                name="action"
                ref={el => (this.actionSlotRef = el as HTMLSlotElement | null)}
                onSlotchange={this.checkActionSlot}
              />
            </div>
          </div>

          {this.dismissible && (
            <div class="close-area">
              <button
                class="close-button"
                type="button"
                aria-label="Close notification"
                onClick={this.handleDismiss}
                onKeyDown={this.handleDismissKeyDown}
              >
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
