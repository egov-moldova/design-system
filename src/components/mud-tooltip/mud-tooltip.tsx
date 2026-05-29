import { Component, Element, Event, Host, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';

import {
  OPPOSITE_POSITION,
  VALID_DESCRIPTION_TAGS,
  VALID_TITLE_TAGS,
  VALID_TRIGGER_TAGS,
  type TooltipAlignment,
  type TooltipBaseSide,
  type TooltipCloseEventDetail,
  type TooltipCloseReason,
  type TooltipGeometry,
  type TooltipPosition,
  type TooltipResolvedPosition,
  type TooltipSize,
  type TooltipTrigger,
  type TooltipVariant,
} from './mud-tooltip.types';

let tooltipIdCounter = 0;

/**
 * Tooltip — transient label, structured popover, or coach mark anchored to a
 * trigger element.
 *
 * Pattern B (internal DOM). The host wraps a `trigger` slot and renders the
 * bubble + arrow inside shadow DOM. Position is computed in JS against the
 * trigger's bounding rect with viewport-aware flip + clamp + corner-aligned
 * placements; the result is pushed to the host as CSS custom properties.
 *
 * Variants:
 * - `default` — transient label. Hover (after `showDelay`) / focus / click /
 *   manual trigger; closes on `mouseleave` (after `hideDelay`), `blur`,
 *   second click, `Esc`, or outside click.
 * - `coach` — persistent instructional overlay with a close button + localized
 *   hint. Dismissed only by Esc, the close button, or an outside click.
 *
 * @element mud-tooltip
 *
 * @slot trigger     - The element the tooltip describes (button, icon, link).
 * @slot title       - Optional title row inside the bubble (mud-icon, span, strong, em).
 * @slot description - Optional secondary description row.
 * @slot             - Default slot. Body content. Used when no title/description slots are set.
 */
@Component({
  tag: 'mud-tooltip',
  styleUrl: 'mud-tooltip.css',
  shadow: true,
})
export class MudTooltip {
  /**
   * Visual size rung. `sm` matches a 4px radius / 8px–12px padding bubble;
   * `lg` matches a 6px radius / 12px–16px padding bubble.
   * @default 'sm'
   */
  @Prop({ reflect: true }) size: TooltipSize = 'sm';

  /**
   * Preferred placement relative to the trigger. Accepts all 12 base+align
   * combinations (e.g. `top-left`, `right-bottom`) plus `auto` which prefers
   * `top` and always flips to the opposite side when overflowing.
   * @default 'top'
   */
  @Prop({ reflect: true }) position: TooltipPosition = 'top';

  /**
   * Visual variant.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: TooltipVariant = 'default';

  /**
   * Whether the tooltip is currently visible. Mutable so the component can
   * close itself in response to mouseleave / blur / Esc / outside-click, and
   * so consumers can drive visibility imperatively (`trigger="manual"`).
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) open: boolean = false;

  /**
   * How the tooltip is activated.
   * - `hover`  — mouseenter (after `showDelay`) → open, mouseleave (after `hideDelay`) → close.
   * - `click`  — click toggles open/closed. Outside click and Esc dismiss.
   * - `focus`  — focus (immediate) → open, blur → close.
   * - `manual` — visibility is driven by `open`; ignores pointer/keyboard events.
   * @default 'hover'
   */
  @Prop({ reflect: true }) trigger: TooltipTrigger = 'hover';

  /**
   * Convenience: tooltip body text. Used only when the default slot is empty
   * AND no `title` / `description` slots are present.
   */
  @Prop() content?: string;

  /**
   * Hard cap on the bubble width in pixels.
   * @default 280
   */
  @Prop() maxWidth: number = 280;

  /**
   * Show-delay (ms) before the bubble appears on hover. Focus / click / manual
   * triggers ignore this value.
   * @default 200
   */
  @Prop() showDelay: number = 200;

  /**
   * Hide-delay (ms) before the bubble disappears on mouseleave. Lets the
   * pointer cross a small gap (or land on the bubble in `interactive` mode)
   * without dismissing.
   * @default 150
   */
  @Prop() hideDelay: number = 150;

  /**
   * Keep the tooltip open when the pointer hovers over the bubble itself.
   * Useful when the body contains links / buttons / scrollable content.
   * @default false
   */
  @Prop({ reflect: true }) interactive: boolean = false;

  /**
   * When `true`, the tooltip will not open via any trigger and force-closes
   * if currently visible.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Auto-flip to the opposite placement when the preferred side would overflow
   * the viewport. Always honored for `position="auto"`.
   * @default true
   */
  @Prop() flipFallback: boolean = true;

  /**
   * Pixel gap between the trigger and the bubble (in addition to the arrow
   * size). Overrides `--tooltip-offset-trigger`.
   * @default 4
   */
  @Prop() offset: number = 4;

  /**
   * Show the CSS arrow pointing back at the trigger.
   * @default true
   */
  @Prop({ reflect: true }) showArrow: boolean = true;

  /**
   * Accessible name applied to the rendered bubble. Stripped from the host
   * after ingestion; the value is forwarded to the bubble's `aria-label`.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private resolvedPosition: TooltipResolvedPosition = 'top';

  @Element() host!: HTMLElement;

  /** Fired when the tooltip becomes visible (after `showDelay` for hover triggers). */
  @Event() mudOpen!: EventEmitter<void>;

  /**
   * Fired when the tooltip is hidden. `detail.reason` records the cause:
   * `'blur'` (mouseleave / focusout), `'escape'` (Esc), `'close-button'`
   * (coach variant close), `'click-outside'` (outside click), or
   * `'click-trigger'` (second click on the trigger when `trigger="click"`).
   */
  @Event() mudClose!: EventEmitter<TooltipCloseEventDetail>;

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
      this.handleOpened();
    }
  }

  @Watch('disabled')
  watchDisabled(next: boolean) {
    if (next && this.open) {
      this.closeTooltip('blur');
    }
  }

  @Watch('interactive')
  watchInteractive() {
    this.detachBubbleListeners();
    if (this.interactive) {
      this.attachBubbleListeners();
    }
  }

  private tooltipId: string = '';
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private triggerWrapperEl: HTMLElement | null = null;
  private bubbleEl: HTMLElement | null = null;
  private scrollHandler: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private documentClickHandler: ((event: MouseEvent) => void) | null = null;
  private documentKeydownHandler: ((event: KeyboardEvent) => void) | null = null;

  componentWillLoad() {
    this.tooltipId = `mud-tooltip-${++tooltipIdCounter}`;
    this.resolvedPosition = this.position === 'auto' ? 'top' : (this.position as TooltipResolvedPosition);
  }

  componentDidLoad() {
    this.triggerWrapperEl = this.host.shadowRoot?.querySelector('.trigger') ?? null;
    this.bubbleEl = this.host.shadowRoot?.querySelector('.bubble') ?? null;

    if (this.trigger !== 'manual') {
      this.attachTriggerListeners();
    }
    if (this.interactive) {
      this.attachBubbleListeners();
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

    if (this.open && !this.disabled) {
      this.handleOpened();
    }
  }

  disconnectedCallback() {
    this.clearShowTimer();
    this.clearHideTimer();
    this.detachTriggerListeners();
    this.detachBubbleListeners();
    this.detachDocumentListeners();
    this.removeSrMirror();
    if (typeof window !== 'undefined') {
      if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler, true);
      if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    }
  }

  // ---------- ARIA wiring ----------

  private srMirror?: HTMLSpanElement;

  private getSlottedTriggerEl(): HTMLElement | null {
    return this.host.querySelector<HTMLElement>('[slot="trigger"]') ?? null;
  }

  /**
   * Flatten the visible tooltip content to plain text — used to populate the
   * AT-only mirror node so screen readers + axe see the description through
   * the shadow-DOM boundary.
   */
  private getTooltipText(): string {
    const titleEl = this.host.querySelector('[slot="title"]');
    const descEl = this.host.querySelector('[slot="description"]');
    const titleText = (titleEl?.textContent || '').trim();
    const descText = (descEl?.textContent || '').trim();
    if (titleText || descText) {
      return [titleText, descText].filter(Boolean).join('. ');
    }
    const defaultText = Array.from(this.host.childNodes)
      .filter(n => !(n as Element).slot)
      .map(n => n.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return defaultText || (this.content ?? '').trim();
  }

  /**
   * Mirror the tooltip description into `document.body` as a visually-hidden
   * `<span id={tooltipId}>`. The trigger's `aria-describedby` then resolves
   * to the mirror — solving the cross-shadow-DOM ID lookup that breaks
   * axe `aria-valid-attr-value` and confuses some AT implementations.
   */
  private ensureSrMirror() {
    if (typeof document === 'undefined') return;
    if (!this.srMirror) {
      this.srMirror = document.createElement('span');
      this.srMirror.id = this.tooltipId;
      // Inline sr-only — host element lives outside the component's stylesheet,
      // so we cannot rely on a shadow CSS class. The lint rule for inline JSX
      // styles does not apply to imperatively-set host styles.
      this.srMirror.style.cssText =
        'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
      document.body.appendChild(this.srMirror);
    }
    this.srMirror.textContent = this.getTooltipText();
  }

  private removeSrMirror() {
    if (this.srMirror) {
      this.srMirror.remove();
      this.srMirror = undefined;
    }
  }

  private applyAriaToTrigger() {
    const slotted = this.getSlottedTriggerEl();
    if (!slotted) return;
    if (this.open) {
      this.ensureSrMirror();
      slotted.setAttribute('aria-describedby', this.tooltipId);
    } else {
      slotted.removeAttribute('aria-describedby');
      this.removeSrMirror();
    }
  }

  // ---------- Listener wiring ----------

  private attachTriggerListeners() {
    const wrapper = this.triggerWrapperEl;
    if (!wrapper) return;

    if (this.trigger === 'hover') {
      wrapper.addEventListener('mouseenter', this.handleTriggerMouseEnter);
      wrapper.addEventListener('mouseleave', this.handleTriggerMouseLeave);
      // WCAG 1.4.13: content triggered on hover MUST also be reachable via
      // keyboard. Pair hover with focusin/focusout so Tab navigates between
      // tooltips and reveals their content.
      wrapper.addEventListener('focusin', this.handleTriggerFocusIn);
      wrapper.addEventListener('focusout', this.handleTriggerFocusOut);
    }
    if (this.trigger === 'click') {
      wrapper.addEventListener('click', this.handleTriggerClick);
      // Focus/Enter on a click-trigger also opens the popover (keyboard parity).
      wrapper.addEventListener('focusin', this.handleTriggerFocusIn);
      wrapper.addEventListener('focusout', this.handleTriggerFocusOut);
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
    wrapper.removeEventListener('click', this.handleTriggerClick);
    wrapper.removeEventListener('focusin', this.handleTriggerFocusIn);
    wrapper.removeEventListener('focusout', this.handleTriggerFocusOut);
  }

  private attachBubbleListeners() {
    const bubble = this.bubbleEl;
    if (!bubble) return;
    bubble.addEventListener('mouseenter', this.handleBubbleMouseEnter);
    bubble.addEventListener('mouseleave', this.handleBubbleMouseLeave);
  }

  private detachBubbleListeners() {
    const bubble = this.bubbleEl;
    if (!bubble) return;
    bubble.removeEventListener('mouseenter', this.handleBubbleMouseEnter);
    bubble.removeEventListener('mouseleave', this.handleBubbleMouseLeave);
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

  // ---------- Timers ----------

  private clearShowTimer() {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private clearHideTimer() {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private scheduleShow(delay: number = this.showDelay) {
    this.clearHideTimer();
    this.clearShowTimer();
    if (delay > 0) {
      this.showTimer = setTimeout(() => this.openTooltip(), delay);
    } else {
      this.openTooltip();
    }
  }

  private scheduleHide(reason: TooltipCloseReason, delay: number = this.hideDelay) {
    this.clearShowTimer();
    this.clearHideTimer();
    if (delay > 0) {
      this.hideTimer = setTimeout(() => this.closeTooltip(reason), delay);
    } else {
      this.closeTooltip(reason);
    }
  }

  // ---------- Trigger handlers ----------

  private handleTriggerMouseEnter = () => {
    if (this.disabled) return;
    this.scheduleShow();
  };

  private handleTriggerMouseLeave = () => {
    if (this.variant === 'coach') {
      // coach is persistent; only the close paths dismiss it
      this.clearShowTimer();
      return;
    }
    this.scheduleHide('blur');
  };

  private handleTriggerClick = () => {
    if (this.disabled) return;
    if (this.open) {
      this.closeTooltip('click-trigger');
    } else {
      this.openTooltip();
    }
  };

  private handleTriggerFocusIn = () => {
    if (this.disabled) return;
    this.clearHideTimer();
    this.openTooltip();
  };

  private handleTriggerFocusOut = () => {
    if (this.variant === 'coach') return;
    this.scheduleHide('blur', 0);
  };

  private handleBubbleMouseEnter = () => {
    if (!this.interactive) return;
    this.clearHideTimer();
  };

  private handleBubbleMouseLeave = () => {
    if (!this.interactive) return;
    if (this.variant === 'coach') return;
    this.scheduleHide('blur');
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

  // ---------- Open/close primitives ----------

  private openTooltip() {
    if (this.open || this.disabled) return;
    this.open = true;
  }

  private closeTooltip(reason: TooltipCloseReason) {
    if (!this.open) return;
    this.open = false;
    this.mudClose.emit({ reason });
  }

  private handleOpened() {
    this.mudOpen.emit();
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

  // ---------- Geometry ----------

  private parsePlacement(place: TooltipResolvedPosition): { base: TooltipBaseSide; align: TooltipAlignment } {
    const parts = place.split('-');
    const base = parts[0] as TooltipBaseSide;
    const second = parts[1];
    if (!second) return { base, align: 'center' };
    // For top/bottom: -left → start, -right → end
    // For left/right: -top → start, -bottom → end
    if (second === 'left' || second === 'top') return { base, align: 'start' };
    if (second === 'right' || second === 'bottom') return { base, align: 'end' };
    return { base, align: 'center' };
  }

  /**
   * Walk ancestors to find a `position: fixed` containing block. Mirrors the
   * legacy logic so tooltips inside `transform`-ed / `filter`-ed wrappers
   * still position correctly.
   */
  private getFixedOffset(): { top: number; left: number } {
    if (typeof window === 'undefined') return { top: 0, left: 0 };
    let el: HTMLElement | null = this.host.parentElement;
    while (el && el !== document.documentElement) {
      const st = window.getComputedStyle(el);
      const createsContainingBlock =
        st.transform !== 'none' ||
        st.perspective !== 'none' ||
        (st.willChange !== 'auto' && st.willChange !== '') ||
        st.filter !== 'none' ||
        st.backdropFilter !== 'none' ||
        (st.contain &&
          st.contain !== 'none' &&
          (st.contain.includes('paint') || st.contain.includes('layout') || st.contain.includes('strict')));
      if (createsContainingBlock) {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, left: rect.left };
      }
      if (el.parentElement) {
        el = el.parentElement;
      } else {
        const root = el.getRootNode();
        el = root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null;
      }
    }
    return { top: 0, left: 0 };
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
    // Push the runtime-computed geometry into host CSS custom properties so
    // the .bubble / .arrow stylesheet can pick it up without inline JSX styles
    // (CSP-friendly, suppresses ANTIPATTERN-001-INLINE-STYLE).
    this.host.style.setProperty('--_bubble-top', `${computed.top}px`);
    this.host.style.setProperty('--_bubble-left', `${computed.left}px`);
    this.host.style.setProperty('--_bubble-max-width', `${this.maxWidth}px`);
    this.host.style.setProperty('--_arrow-offset', `${computed.arrowOffset}px`);
  }

  private computeGeometry(
    triggerRect: DOMRect,
    bubbleWidth: number,
    bubbleHeight: number,
    preferred: TooltipResolvedPosition,
  ): TooltipGeometry {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const arrowSize = this.showArrow ? this.readCssPixel('--tooltip-arrow-size', this.size === 'lg' ? 12 : 8) : 0;
    const arrowEdgeMargin = this.readCssPixel('--tooltip-arrow-edge-margin', 8);
    const arrowWidth = this.readCssPixel('--tooltip-arrow-width', 16);
    const gap = this.offset + arrowSize;
    const margin = 4;
    const fixedOffset = this.getFixedOffset();

    const computeFor = (place: TooltipResolvedPosition): { top: number; left: number; arrowOffset: number } => {
      const { base, align } = this.parsePlacement(place);
      let top = 0;
      let left = 0;
      let arrowOffset = 0;

      const triggerTop = triggerRect.top - fixedOffset.top;
      const triggerLeft = triggerRect.left - fixedOffset.left;
      const triggerCenterX = triggerLeft + triggerRect.width / 2;
      const triggerCenterY = triggerTop + triggerRect.height / 2;

      if (base === 'top') {
        top = triggerTop - bubbleHeight - gap;
      } else if (base === 'bottom') {
        top = triggerTop + triggerRect.height + gap;
      } else if (base === 'left') {
        left = triggerLeft - bubbleWidth - gap;
      } else {
        left = triggerLeft + triggerRect.width + gap;
      }

      if (base === 'top' || base === 'bottom') {
        if (align === 'start') {
          left = triggerLeft;
          arrowOffset = arrowEdgeMargin + arrowWidth / 2;
        } else if (align === 'end') {
          left = triggerLeft + triggerRect.width - bubbleWidth;
          arrowOffset = bubbleWidth - arrowEdgeMargin - arrowWidth / 2;
        } else {
          left = triggerCenterX - bubbleWidth / 2;
          arrowOffset = bubbleWidth / 2;
        }
      } else {
        if (align === 'start') {
          top = triggerTop;
          arrowOffset = arrowEdgeMargin + arrowWidth / 2;
        } else if (align === 'end') {
          top = triggerTop + triggerRect.height - bubbleHeight;
          arrowOffset = bubbleHeight - arrowEdgeMargin - arrowWidth / 2;
        } else {
          top = triggerCenterY - bubbleHeight / 2;
          arrowOffset = bubbleHeight / 2;
        }
      }
      return { top, left, arrowOffset };
    };

    const fitsInViewport = (place: TooltipResolvedPosition): boolean => {
      const { top, left } = computeFor(place);
      const viewTop = top + fixedOffset.top;
      const viewLeft = left + fixedOffset.left;
      return (
        viewTop >= margin &&
        viewTop + bubbleHeight <= viewportHeight - margin &&
        viewLeft >= margin &&
        viewLeft + bubbleWidth <= viewportWidth - margin
      );
    };

    let resolvedPosition = preferred;
    const shouldFlip = this.position === 'auto' || this.flipFallback;
    if (shouldFlip && !fitsInViewport(preferred)) {
      const opposite = OPPOSITE_POSITION[preferred];
      if (fitsInViewport(opposite)) {
        resolvedPosition = opposite;
      }
    }

    let { top, left, arrowOffset } = computeFor(resolvedPosition);

    // Clamp to viewport so the bubble never paints off-screen.
    const { base } = this.parsePlacement(resolvedPosition);
    if (base === 'top' || base === 'bottom') {
      const triggerCenterX = triggerRect.left + triggerRect.width / 2 - fixedOffset.left;
      const viewLeft = left + fixedOffset.left;
      if (viewLeft < margin) {
        left = margin - fixedOffset.left;
        arrowOffset = Math.max(arrowSize, triggerCenterX - left);
      } else if (viewLeft + bubbleWidth > viewportWidth - margin) {
        left = viewportWidth - margin - bubbleWidth - fixedOffset.left;
        arrowOffset = Math.min(bubbleWidth - arrowSize, triggerCenterX - left);
      }
    } else {
      const triggerCenterY = triggerRect.top + triggerRect.height / 2 - fixedOffset.top;
      const viewTop = top + fixedOffset.top;
      if (viewTop < margin) {
        top = margin - fixedOffset.top;
        arrowOffset = Math.max(arrowSize, triggerCenterY - top);
      } else if (viewTop + bubbleHeight > viewportHeight - margin) {
        top = viewportHeight - margin - bubbleHeight - fixedOffset.top;
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

  // ---------- Slot validation ----------

  private validateSlot(name: 'trigger' | 'title' | 'description', validTags: readonly string[]): string | null {
    const el = this.host.querySelector(`[slot="${name}"]`);
    if (!el) return null;
    const tag = el.tagName.toLowerCase();
    if (validTags.includes(tag)) return null;
    return invalidSlottedTag(tag, validTags);
  }

  private renderCloseButton() {
    // Intentional inline icon markup (suppresses ANTIPATTERN-021-RAW-SVG):
    // the close glyph scales with `width/height: 100%` of the close button
    // (`--tooltip-close-size`, ~16px). mud-icon's `cross-small` ships at
    // 16/20/24 — would visibly enlarge on coach-sm. Same precedent as the
    // intrinsic glyphs in mud-checkbox and mud-chip.
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
    const isCoach = this.variant === 'coach';
    const triggerError = this.validateSlot('trigger', VALID_TRIGGER_TAGS);
    const titleError = this.validateSlot('title', VALID_TITLE_TAGS);
    const descriptionError = this.validateSlot('description', VALID_DESCRIPTION_TAGS);
    const hasTitle = !!this.host.querySelector('[slot="title"]');
    const hasDescription = !!this.host.querySelector('[slot="description"]');
    const showHeader = hasTitle || hasDescription;

    return (
      <Host
        class={{
          'is-open': this.open,
          [`position-${this.resolvedPosition}`]: true,
          [`variant-${this.variant}`]: true,
        }}
      >
        {triggerError && <div class="slot-error">{triggerError}</div>}
        <span class="trigger">
          <slot name="trigger" />
        </span>

        <div
          class="bubble"
          id={this.tooltipId}
          role="tooltip"
          aria-hidden={this.open ? 'false' : 'true'}
          aria-label={this.ariaLabel}
        >
          {titleError && <div class="slot-error">{titleError}</div>}
          {descriptionError && <div class="slot-error">{descriptionError}</div>}

          {showHeader && (
            <div class="header">
              {hasTitle && (
                <div class="title">
                  <slot name="title" />
                </div>
              )}
              {hasDescription && (
                <div class="description">
                  <slot name="description" />
                </div>
              )}
            </div>
          )}

          <div class="content">
            <slot>{this.content}</slot>
            {isCoach && <p class="hint">Apasă Esc pentru a închide.</p>}
          </div>
          {isCoach && this.renderCloseButton()}
          {this.showArrow && <span class="arrow" aria-hidden="true" />}
        </div>
      </Host>
    );
  }
}
