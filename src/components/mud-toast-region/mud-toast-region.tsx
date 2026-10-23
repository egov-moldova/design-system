import { Component, Element, Host, Listen, Method, Prop, State, Watch, forceUpdate, h } from '@stencil/core';

import { localeMessages, watchDocumentLang, hostLang } from '../../utils/locale';
import type { LocaleProp } from '../../utils/locale';
import { TOAST_REGION_MESSAGES } from './mud-toast-region.messages';
import type { ToastRegionMessages } from './mud-toast-region.messages';
import { TOAST_REGION_AUTO_DISMISS_VARIANTS, TOAST_REGION_DEFAULT_DURATION_MS } from './mud-toast-region.types';
import type { ToastRegionShowOptions } from './mud-toast-region.types';

type DismissTimer = { remaining: number; startedAt?: number; id?: ReturnType<typeof setTimeout> };

/**
 * Toast region — places, stacks and dismisses `mud-toast` messages the way the
 * Figma "Toast Message" page shows them (14830:13653).
 *
 * - Placement: top-right, 32px from the edges, on screens wider than 640px;
 *   at the bottom, 8px from the sides and 12px from the bottom, below that.
 * - Stacking: 12px apart. On desktop the newest toast is on top; on mobile the
 *   newest is nearest the bottom and pushes older ones up.
 * - Dismissal: an `info` or `success` toast with no action closes itself after
 *   `duration` (the timer pauses while the pointer is over the region or focus
 *   is inside it); a warning, an error or a toast with an action stays until
 *   the user closes it. A closed toast is removed from the region.
 *
 * Put one region on the page and add toasts with `show()`, or append
 * `<mud-toast>` children to it yourself. Each toast keeps its own live-region
 * role, so it is announced as it appears; the region is a labelled landmark
 * while it holds toasts.
 *
 * @element mud-toast-region
 *
 * @slot - The `mud-toast` elements, oldest first.
 */
@Component({
  tag: 'mud-toast-region',
  styleUrl: 'mud-toast-region.css',
  shadow: true,
})
export class MudToastRegion {
  /**
   * Milliseconds an `info` or `success` toast with no action stays before it
   * closes itself. `0` keeps every toast until the user closes it.
   * @default 5000
   */
  @Prop() duration: number = TOAST_REGION_DEFAULT_DURATION_MS;

  /**
   * Language of the region's accessible name. Unset, the component follows the
   * closest ancestor `lang` (`<html lang>` included), else `ro-MD`.
   */
  @Prop({ reflect: true }) locale?: LocaleProp;

  /**
   * Accessible name of the notifications landmark. Overrides the `locale`'s copy
   * when set to a non-empty string.
   * @default 'Notificări' (ro-MD)
   */
  @Prop() label?: string;

  @State() private hasToasts: boolean = false;

  @Element() host!: HTMLMudToastRegionElement;

  private timers = new Map<HTMLMudToastElement, DismissTimer>();
  private hovered = false;
  private focused = false;
  private stopLang?: () => void;

  @Watch('duration')
  restartTimers(): void {
    this.clearTimers();
    this.syncToasts();
  }

  /** A closed toast leaves the region. */
  @Listen('mudClose')
  onToastClose(ev: Event): void {
    const toast = ev.target as HTMLElement;
    if (toast.parentElement !== this.host || toast.tagName !== 'MUD-TOAST') return;
    this.clearTimer(toast as HTMLMudToastElement);
    toast.remove();
  }

  @Listen('pointerenter')
  onPointerEnter(): void {
    this.hovered = true;
    this.pauseTimers();
  }

  @Listen('pointerleave')
  onPointerLeave(): void {
    this.hovered = false;
    this.resumeTimers();
  }

  @Listen('focusin')
  onFocusIn(): void {
    this.focused = true;
    this.pauseTimers();
  }

  @Listen('focusout')
  onFocusOut(ev: FocusEvent): void {
    if (ev.relatedTarget instanceof Node && this.host.contains(ev.relatedTarget)) return;
    this.focused = false;
    this.resumeTimers();
  }

  connectedCallback(): void {
    this.stopLang = watchDocumentLang(
      this.host,
      () => this.locale,
      () => forceUpdate(this),
    );
  }

  componentDidLoad(): void {
    this.syncToasts();
  }

  disconnectedCallback(): void {
    this.stopLang?.();
    this.clearTimers();
  }

  /**
   * Adds a toast built from `options` and returns it, so actions can be slotted
   * into it. The message is set as text, never parsed as HTML.
   */
  @Method()
  async show(options: ToastRegionShowOptions): Promise<HTMLMudToastElement> {
    const toast = document.createElement('mud-toast');
    toast.variant = options.variant ?? 'info';
    if (options.titleText) toast.titleText = options.titleText;
    if (options.closable === false) toast.closable = false;
    toast.textContent = options.message;
    this.host.appendChild(toast);
    return toast;
  }

  private messages(): ToastRegionMessages {
    return localeMessages('mud-toast-region', this.host, this.locale, TOAST_REGION_MESSAGES, {
      label: this.label,
    });
  }

  private toasts(): HTMLMudToastElement[] {
    return Array.from(this.host.children).filter((el): el is HTMLMudToastElement => el.tagName === 'MUD-TOAST');
  }

  private hasAction(toast: HTMLMudToastElement): boolean {
    return Array.from(toast.children).some(child => child.getAttribute('slot') === 'actions');
  }

  private autoDismisses(toast: HTMLMudToastElement): boolean {
    return this.duration > 0 && TOAST_REGION_AUTO_DISMISS_VARIANTS.has(toast.variant) && !this.hasAction(toast);
  }

  private onSlotChange = () => this.syncToasts();

  /** Starts a timer for each new auto-dismissing toast and drops those of toasts that left. */
  private syncToasts(): void {
    const current = new Set(this.toasts());
    this.hasToasts = current.size > 0;
    for (const toast of Array.from(this.timers.keys())) {
      if (!current.has(toast)) this.clearTimer(toast);
    }
    for (const toast of current) {
      if (this.timers.has(toast) || !this.autoDismisses(toast)) continue;
      const timer: DismissTimer = { remaining: this.duration };
      this.timers.set(toast, timer);
      if (!this.hovered && !this.focused) this.startTimer(toast, timer);
    }
  }

  private startTimer(toast: HTMLMudToastElement, timer: DismissTimer): void {
    timer.startedAt = Date.now();
    timer.id = setTimeout(() => {
      this.timers.delete(toast);
      // An action slotted in after the toast was added keeps it open.
      if (this.autoDismisses(toast)) void toast.dismiss();
    }, timer.remaining);
  }

  private pauseTimers(): void {
    for (const timer of this.timers.values()) {
      if (timer.id === undefined) continue;
      clearTimeout(timer.id);
      timer.id = undefined;
      timer.remaining = Math.max(0, timer.remaining - (Date.now() - (timer.startedAt ?? Date.now())));
    }
  }

  private resumeTimers(): void {
    if (this.hovered || this.focused) return;
    for (const [toast, timer] of this.timers) {
      if (timer.id === undefined) this.startTimer(toast, timer);
    }
  }

  private clearTimer(toast: HTMLMudToastElement): void {
    const timer = this.timers.get(toast);
    if (timer?.id !== undefined) clearTimeout(timer.id);
    this.timers.delete(toast);
  }

  private clearTimers(): void {
    for (const toast of Array.from(this.timers.keys())) this.clearTimer(toast);
  }

  render() {
    const lang = hostLang(this.host, this.locale);
    return (
      <Host
        role={this.hasToasts ? 'region' : null}
        aria-label={this.hasToasts ? this.messages().label : null}
        lang={lang}
      >
        <slot onSlotchange={this.onSlotChange} />
      </Host>
    );
  }
}
