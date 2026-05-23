import { Component, Element, Event, Host, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import {
  OPPOSITE_POSITION,
  type TooltipCloseEventDetail,
  type TooltipCloseReason,
  type TooltipGeometry,
  type TooltipPosition,
  type TooltipResolvedPosition,
  type TooltipSize,
  type TooltipTrigger,
  type TooltipVariant,
} from './cor-tooltip.types';

let tooltipIdCounter = 0;

/**
 * Tooltip — transient label or coach mark anchored to a trigger element.
 *
 * Pattern B (internal DOM). The host wraps a `trigger` slot (the element being
 * described) and renders the bubble + arrow inside shadow DOM. Position is
 * computed in JS against the trigger's bounding rect so the tooltip can flip
 * when it would overflow the viewport. ARIA wiring sets `aria-describedby` on
 * the slotted trigger element so screen readers announce the bubble copy
 * alongside the control.
 *
 * Two variants:
 * - `default` — opens on `hover` (after `delay`) or `focus` (immediate); closes
 *   on `mouseleave` / `blur` / `Esc`.
 * - `coach` — instructional overlay. Stays open until the user dismisses it via
 *   the trailing close button, `Esc`, or a click outside the bubble. Includes
 *   the localized hint "Apasă Esc pentru a închide".
 *
 * @element cor-tooltip
 *
 * @slot trigger - The element the tooltip describes (button, icon, link).
 * @slot         - Default slot. Tooltip body content. Plain text or rich inline content.
 *
 * @event corOpen   - Fired when the tooltip becomes visible.
 * @event corClose  - Fired when the tooltip is hidden. `detail.reason` records the
 *                    cause (`blur` | `escape` | `close-button` | `click-outside`).
 */
@Component({
  tag: 'cor-tooltip',
  styleUrl: 'cor-tooltip.css',
  shadow: true,
})
export class CorTooltip {
  /**
   * Visual size rung. `sm` matches a 4px radius / 8px–12px padding bubble;
   * `lg` matches a 6px radius / 12px–16px padding bubble.
   * @default 'sm'
   */
  @Prop({ reflect: true }) size: TooltipSize = 'sm';

  /**
   * Preferred position relative to the trigger. `auto` (default) prefers
   * `top` and flips to the opposite side when the tooltip would overflow.
   * @default 'auto'
   */
  @Prop({ reflect: true }) position: TooltipPosition = 'auto';

  /**
   * Visual variant. `default` is a transient hover/focus tip;
   * `coach` is a persistent instructional overlay with a close button.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: TooltipVariant = 'default';

  /**
   * Whether the tooltip is currently visible. Mutable so the component can
   * close itself in response to mouseleave / blur / Esc and so consumers can
   * drive visibility imperatively (`trigger="manual"`).
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) open: boolean = false;

  /**
   * How the tooltip is activated.
   * - `hover`  — mouseenter (after `delay`) → open, mouseleave → close.
   * - `focus`  — focus (immediate) → open, blur or Esc → close.
   * - `manual` — visibility is driven by `open`; ignores pointer/keyboard events.
   * @default 'hover'
   */
  @Prop() trigger: TooltipTrigger = 'hover';

  /**
   * Convenience: tooltip body text. Used only when the default slot is empty.
   */
  @Prop() content?: string;

  /**
   * Hard cap on the bubble width in pixels. Long content wraps below this
   * width. Defaults to 200 (Figma specification).
   * @default 200
   */
  @Prop() maxWidth: number = 200;

  /**
   * Show-delay in milliseconds before the bubble appears on hover.
   * Focus and manual triggers ignore this value.
   * @default 0
   */
  @Prop() delay: number = 0;

  /**
   * Accessible name applied to the rendered bubble. When omitted the visible
   * tooltip text doubles as the accessible name via `aria-describedby`.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private resolvedPosition: TooltipResolvedPosition = 'top';
  @State() private tooltipTop: number = 0;
  @State() private tooltipLeft: number = 0;
  @State() private arrowOffset: number = 0;

  @Element() host!: HTMLElement;

  @Event() corOpen!: EventEmitter<void>;
  @Event() corClose!: EventEmitter<TooltipCloseEventDetail>;

  @Watch('open')
  watchOpen(next: boolean, previous: boolean) {
    if (next === previous) return;
    if (next) {
      this.handleOpened();
    } else {
      this.handleClosed();
    }
  }

  @Watch('trigger')
  watchTrigger(next: TooltipTrigger, previous: TooltipTrigger) {
    if (next === previous) return;
    this.detachTriggerListeners();
    if (next !== 'manual') {
      this.attachTriggerListeners();
    }
    if (this.open && next === 'manual') {
      // Manual trigger keeps `open` honest with the prop value.
      this.handleOpened();
    }
  }

  private tooltipId: string = '';
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private triggerWrapperEl: HTMLElement | null = null;
  private bubbleEl: HTMLElement | null = null;
  private scrollHandler: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private documentClickHandler: ((event: MouseEvent) => void) | null = null;
  private documentKeydownHandler: ((event: KeyboardEvent) => void) | null = null;

  componentWillLoad() {
    this.tooltipId = `cor-tooltip-${++tooltipIdCounter}`;
    this.resolvedPosition = this.position === 'auto' ? 'top' : this.position;
  }

  componentDidLoad() {
    this.triggerWrapperEl = this.host.shadowRoot?.querySelector('.trigger') ?? null;
    this.bubbleEl = this.host.shadowRoot?.querySelector('.bubble') ?? null;

    if (this.trigger !== 'manual') {
      this.attachTriggerListeners();
    }

    this.scrollHandler = () => {
      if (this.open) this.updateGeometry();
    };
    this.resizeHandler = () => {
      if (this.open) this.updateGeometry();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
      window.addEventListener('resize', this.resizeHandler, { passive: true });
    }

    this.applyAriaToTrigger();

    if (this.open) {
      this.handleOpened();
    }
  }

  disconnectedCallback() {
    this.clearShowTimer();
    this.detachTriggerListeners();
    this.detachDocumentListeners();
    if (typeof window !== 'undefined') {
      if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler, true);
      if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    }
  }

  private getSlottedTriggerEl(): HTMLElement | null {
    const slotted = this.host.querySelector<HTMLElement>('[slot="trigger"]');
    return slotted ?? null;
  }

  private applyAriaToTrigger() {
    const slotted = this.getSlottedTriggerEl();
    if (!slotted) return;
    if (this.open) {
      slotted.setAttribute('aria-describedby', this.tooltipId);
    } else {
      slotted.removeAttribute('aria-describedby');
    }
  }

  private attachTriggerListeners() {
    const wrapper = this.triggerWrapperEl;
    if (!wrapper) return;

    if (this.trigger === 'hover') {
      wrapper.addEventListener('mouseenter', this.handleTriggerMouseEnter);
      wrapper.addEventListener('mouseleave', this.handleTriggerMouseLeave);
    }
    if (this.trigger === 'focus') {
      wrapper.addEventListener('focusin', this.handleTriggerFocusIn);
      wrapper.addEventListener('focusout', this.handleTriggerFocusOut);
    }
  }

  private detachTriggerListeners() {
    const wrapper = this.triggerWrapperEl;
    if (!wrapper) return;
    wrapper.removeEventListener('mouseenter', this.handleTriggerMouseEnter);
    wrapper.removeEventListener('mouseleave', this.handleTriggerMouseLeave);
    wrapper.removeEventListener('focusin', this.handleTriggerFocusIn);
    wrapper.removeEventListener('focusout', this.handleTriggerFocusOut);
  }

  private attachDocumentListeners() {
    if (typeof document === 'undefined') return;
    this.documentClickHandler = this.handleDocumentClick;
    this.documentKeydownHandler = this.handleDocumentKeydown;
    document.addEventListener('click', this.documentClickHandler, true);
    document.addEventListener('keydown', this.documentKeydownHandler);
  }

  private detachDocumentListeners() {
    if (typeof document === 'undefined') return;
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler, true);
      this.documentClickHandler = null;
    }
    if (this.documentKeydownHandler) {
      document.removeEventListener('keydown', this.documentKeydownHandler);
      this.documentKeydownHandler = null;
    }
  }

  private clearShowTimer() {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private handleTriggerMouseEnter = () => {
    if (this.delay > 0) {
      this.clearShowTimer();
      this.showTimer = setTimeout(() => this.openTooltip(), this.delay);
      return;
    }
    this.openTooltip();
  };

  private handleTriggerMouseLeave = () => {
    this.clearShowTimer();
    if (this.variant === 'coach') return;
    this.closeTooltip('blur');
  };

  private handleTriggerFocusIn = () => {
    this.openTooltip();
  };

  private handleTriggerFocusOut = () => {
    if (this.variant === 'coach') return;
    this.closeTooltip('blur');
  };

  private handleDocumentClick = (event: MouseEvent) => {
    const path = event.composedPath();
    if (!path.includes(this.host)) {
      this.closeTooltip('click-outside');
    }
  };

  private handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.open) {
      this.closeTooltip('escape');
    }
  };

  private handleCloseButtonClick = (event: MouseEvent) => {
    event.stopPropagation();
    this.closeTooltip('close-button');
  };

  private openTooltip() {
    if (this.open) return;
    this.open = true;
  }

  private closeTooltip(reason: TooltipCloseReason) {
    if (!this.open) return;
    this.open = false;
    this.corClose.emit({ reason });
  }

  private handleOpened() {
    this.corOpen.emit();
    this.applyAriaToTrigger();
    this.attachDocumentListeners();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.updateGeometry());
    } else {
      this.updateGeometry();
    }
  }

  private handleClosed() {
    this.detachDocumentListeners();
    this.applyAriaToTrigger();
  }

  private updateGeometry() {
    if (typeof window === 'undefined') return;
    const wrapper = this.triggerWrapperEl;
    const bubble = this.bubbleEl;
    if (!wrapper || !bubble) return;

    const triggerRect = wrapper.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const preferred: TooltipResolvedPosition =
      this.position === 'auto' ? 'top' : (this.position as TooltipResolvedPosition);

    const computed = this.computeGeometry(triggerRect, bubbleRect.width, bubbleRect.height, preferred);
    this.resolvedPosition = computed.resolvedPosition;
    this.tooltipTop = computed.top;
    this.tooltipLeft = computed.left;
    this.arrowOffset = computed.arrowOffset;
  }

  private computeGeometry(
    triggerRect: DOMRect,
    bubbleWidth: number,
    bubbleHeight: number,
    preferred: TooltipResolvedPosition,
  ): TooltipGeometry {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const arrowSize = this.readCssPixel('--tooltip-arrow-size', this.size === 'lg' ? 12 : 8);
    const offset = this.readCssPixel('--tooltip-offset-trigger', 4);
    const gap = offset + arrowSize;
    const margin = 4;

    const computeFor = (place: TooltipResolvedPosition): { top: number; left: number; arrowOffset: number } => {
      let top = 0;
      let left = 0;
      let arrowOffset = 0;
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;
      const triggerCenterY = triggerRect.top + triggerRect.height / 2;

      if (place === 'top') {
        top = triggerRect.top - bubbleHeight - gap;
        left = triggerCenterX - bubbleWidth / 2;
        arrowOffset = bubbleWidth / 2;
      } else if (place === 'bottom') {
        top = triggerRect.bottom + gap;
        left = triggerCenterX - bubbleWidth / 2;
        arrowOffset = bubbleWidth / 2;
      } else if (place === 'left') {
        top = triggerCenterY - bubbleHeight / 2;
        left = triggerRect.left - bubbleWidth - gap;
        arrowOffset = bubbleHeight / 2;
      } else {
        top = triggerCenterY - bubbleHeight / 2;
        left = triggerRect.right + gap;
        arrowOffset = bubbleHeight / 2;
      }
      return { top, left, arrowOffset };
    };

    const fitsInViewport = (place: TooltipResolvedPosition): boolean => {
      const { top, left } = computeFor(place);
      return (
        top >= margin &&
        top + bubbleHeight <= viewportHeight - margin &&
        left >= margin &&
        left + bubbleWidth <= viewportWidth - margin
      );
    };

    let resolvedPosition = preferred;
    if (this.position === 'auto' || !fitsInViewport(preferred)) {
      if (!fitsInViewport(preferred)) {
        const opposite = OPPOSITE_POSITION[preferred];
        if (fitsInViewport(opposite)) {
          resolvedPosition = opposite;
        }
      }
    }

    let { top, left, arrowOffset } = computeFor(resolvedPosition);

    // Clamp to viewport so the bubble never paints off-screen. Arrow follows.
    if (resolvedPosition === 'top' || resolvedPosition === 'bottom') {
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;
      if (left < margin) {
        left = margin;
        arrowOffset = Math.max(arrowSize, triggerCenterX - left);
      } else if (left + bubbleWidth > viewportWidth - margin) {
        left = viewportWidth - margin - bubbleWidth;
        arrowOffset = Math.min(bubbleWidth - arrowSize, triggerCenterX - left);
      }
    } else {
      const triggerCenterY = triggerRect.top + triggerRect.height / 2;
      if (top < margin) {
        top = margin;
        arrowOffset = Math.max(arrowSize, triggerCenterY - top);
      } else if (top + bubbleHeight > viewportHeight - margin) {
        top = viewportHeight - margin - bubbleHeight;
        arrowOffset = Math.min(bubbleHeight - arrowSize, triggerCenterY - top);
      }
    }

    return { top, left, resolvedPosition, arrowOffset };
  }

  private readCssPixel(propertyName: string, fallback: number): number {
    if (typeof window === 'undefined') return fallback;
    const raw = getComputedStyle(this.host).getPropertyValue(propertyName).trim();
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private renderCloseButton() {
    return (
      <button type="button" class="close" aria-label="Închide tooltip-ul" onClick={this.handleCloseButtonClick}>
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" class="close-icon">
          <path
            d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    );
  }

  render() {
    const bubbleStyle: Record<string, string> = {
      top: `${this.tooltipTop}px`,
      left: `${this.tooltipLeft}px`,
      maxWidth: `${this.maxWidth}px`,
    };

    const arrowStyle: Record<string, string> =
      this.resolvedPosition === 'top' || this.resolvedPosition === 'bottom'
        ? { left: `${this.arrowOffset}px` }
        : { top: `${this.arrowOffset}px` };

    const isCoach = this.variant === 'coach';

    return (
      <Host
        class={{
          'is-open': this.open,
          [`position-${this.resolvedPosition}`]: true,
          [`variant-${this.variant}`]: true,
        }}
      >
        <span class="trigger">
          <slot name="trigger" />
        </span>

        <div
          class="bubble"
          id={this.tooltipId}
          role="tooltip"
          aria-hidden={this.open ? 'false' : 'true'}
          aria-label={this.ariaLabel}
          style={bubbleStyle}
        >
          <div class="content">
            <slot>{this.content}</slot>
            {isCoach && <p class="hint">Apasă Esc pentru a închide.</p>}
          </div>
          {isCoach && this.renderCloseButton()}
          <span class="arrow" style={arrowStyle} aria-hidden="true" />
        </div>
      </Host>
    );
  }
}
