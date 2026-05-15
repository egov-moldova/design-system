import { Component, Element, Event, EventEmitter, h, Host, Prop, State, Watch } from '@stencil/core';

import { getCssPixelVar } from '../../utils/css-helpers';
import { invalidSlottedTag } from '../../utils/invalid-slotted-tag';
// ARROW_SIZE / ARROW_WIDTH / ARROW_EDGE_MARGIN are used as fallbacks only.
// At runtime, values are read from CSS custom properties so they respond to token HMR.
import {
  ARROW_EDGE_MARGIN,
  ARROW_SIZE,
  ARROW_WIDTH,
  OPPOSITE_PLACEMENT,
  VALID_DESCRIPTION_TAGS,
  VALID_TITLE_TAGS,
  VALID_TRIGGER_TAGS,
} from './cor-tooltip.constants';
import { TooltipPlacement, TooltipTrigger } from './cor-tooltip.enums';
import type { TooltipPosition } from './cor-tooltip.types';

let tooltipIdCounter = 0;

/**
 * A tooltip component that displays contextual information on hover, click, or focus.
 *
 * @element cor-tooltip
 * @slot trigger - The element that triggers the tooltip.
 * @slot title - Tooltip title. Accepts cor-typography, cor-icon, span.
 * @slot description - Tooltip description. Accepts cor-typography, cor-icon, span.
 * @slot - Default slot for additional tooltip content.
 */
@Component({
  tag: 'cor-tooltip',
  styleUrl: 'cor-tooltip.css',
  shadow: true,
})
export class CorTooltip {
  /**
   * Preferred placement of the tooltip relative to the trigger.
   * @default top
   */
  @Prop({ reflect: true }) placement: TooltipPlacement | `${TooltipPlacement}` =
    TooltipPlacement.TOP;

  /**
   * Show or hide the CSS triangle arrow.
   * @default true
   */
  @Prop({ reflect: true }) showArrow: boolean = true;

  /**
   * How the tooltip is triggered.
   * @default hover
   */
  @Prop({ reflect: true }) trigger: TooltipTrigger | `${TooltipTrigger}` = TooltipTrigger.HOVER;

  /**
   * Controlled open state (used with trigger="manual").
   * @default false
   */
  @Prop({ reflect: true }) open: boolean = false;

  /**
   * Delay in ms before showing the tooltip.
   * @default 200
   */
  @Prop() showDelay: number = 200;

  /**
   * Delay in ms before hiding the tooltip.
   * @default 150
   */
  @Prop() hideDelay: number = 150;

  /**
   * Keep tooltip open when hovering over tooltip content.
   * @default false
   */
  @Prop({ reflect: true }) interactive: boolean = false;

  /**
   * Maximum width of the tooltip container.
   * @default 280px
   */
  @Prop() maxWidth: string = '280px';

  /**
   * Prevent tooltip from showing.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Auto-flip to opposite side if not enough space on preferred side.
   * @default true
   */
  @Prop() flipFallback: boolean = true;

  /**
   * Distance in px between trigger and tooltip.
   * @default 4
   */
  @Prop() offset: number = 4;

  @State() private isVisible: boolean = false;
  @State() private actualPlacement: string = TooltipPlacement.TOP;
  @State() private tooltipTop: number = 0;
  @State() private tooltipLeft: number = 0;
  @State() private arrowOffset: number = 0;

  @Element() host!: HTMLElement;

  @Event() corTooltipShow!: EventEmitter<void>;
  @Event() corTooltipHide!: EventEmitter<void>;

  @Watch('open')
  watchOpen(newValue: boolean) {
    if (this.isManualTrigger()) {
      this.syncManualVisibility(newValue);
    }
  }

  @Watch('trigger')
  watchTrigger() {
    this.detachTriggerListeners();

    if (this.isManualTrigger()) {
      this.syncManualVisibility();
      return;
    }

    if (this.isVisible) {
      this.hideTooltip();
    }

    this.attachTriggerListeners();
  }

  @Watch('disabled')
  watchDisabled(newValue: boolean) {
    if (newValue) {
      this.hideTooltip();
    }
  }

  private tooltipId: string = '';
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private tooltipEl: HTMLElement | null = null;
  private triggerEl: HTMLElement | null = null;
  private scrollHandler: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private documentClickHandler: ((e: MouseEvent) => void) | null = null;
  private documentKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private hasLoaded: boolean = false;

  private isManualTrigger(): boolean {
    return this.trigger === TooltipTrigger.MANUAL;
  }

  private isHoverTrigger(): boolean {
    return this.trigger === TooltipTrigger.HOVER;
  }

  private isClickTrigger(): boolean {
    return this.trigger === TooltipTrigger.CLICK;
  }

  private isFocusTrigger(): boolean {
    return this.trigger === TooltipTrigger.FOCUS;
  }

  private syncManualVisibility(open: boolean = this.open) {
    if (open && !this.disabled) {
      this.showTooltip();
      return;
    }

    this.hideTooltip();
  }

  componentWillLoad() {
    this.tooltipId = `cor-tooltip-${++tooltipIdCounter}`;
    this.actualPlacement = this.placement;
    if (this.isManualTrigger() && this.open && !this.disabled) {
      this.isVisible = true;
    }
  }

  componentDidLoad() {
    this.tooltipEl = this.host.shadowRoot?.querySelector('.tooltip-container') ?? null;
    this.triggerEl = this.host.shadowRoot?.querySelector('.tooltip-trigger') ?? null;
    this.hasLoaded = true;

    if (!this.isManualTrigger()) {
      this.attachTriggerListeners();
    }

    this.scrollHandler = () => {
      if (this.isVisible) this.updatePosition();
    };
    this.resizeHandler = () => {
      if (this.isVisible) this.updatePosition();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
      window.addEventListener('resize', this.resizeHandler, { passive: true });
    }

    if (this.isVisible) {
      setTimeout(() => {
        this.updatePosition();
        setTimeout(() => this.updatePosition(), 10);
      }, 0);
    }
  }

  disconnectedCallback() {
    this.clearShowTimer();
    this.clearHideTimer();
    this.detachTriggerListeners();
    this.detachTooltipListeners();
    this.detachDocumentListeners();

    if (typeof window !== 'undefined') {
      if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler, true);
      if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    }
  }

  private getFixedOffset(): { top: number; left: number } {
    let el: HTMLElement | null = this.host.parentElement;
    while (el && el !== document.documentElement) {
      const st = window.getComputedStyle(el);
      // Check for properties that create a containing block for position: fixed
      // According to CSS spec: transform, perspective, filter, will-change, contain, backdrop-filter
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
      // Traverse through Shadow DOM boundaries
      if (el.parentElement) {
        el = el.parentElement;
      } else {
        const root = el.getRootNode();
        if (root instanceof ShadowRoot && root.host instanceof HTMLElement) {
          el = root.host;
        } else {
          el = null;
        }
      }
    }
    return { top: 0, left: 0 };
  }

  private attachTriggerListeners() {
    if (!this.triggerEl) return;

    if (this.isHoverTrigger()) {
      this.triggerEl.addEventListener('mouseenter', this.handleTriggerMouseEnter);
      this.triggerEl.addEventListener('mouseleave', this.handleTriggerMouseLeave);
    }

    if (this.isClickTrigger()) {
      this.triggerEl.addEventListener('click', this.handleTriggerClick);
    }

    if (this.isFocusTrigger()) {
      this.triggerEl.addEventListener('focusin', this.handleTriggerFocusIn);
      this.triggerEl.addEventListener('focusout', this.handleTriggerFocusOut);
    }
  }

  private detachTriggerListeners() {
    if (!this.triggerEl) return;

    this.triggerEl.removeEventListener('mouseenter', this.handleTriggerMouseEnter);
    this.triggerEl.removeEventListener('mouseleave', this.handleTriggerMouseLeave);
    this.triggerEl.removeEventListener('click', this.handleTriggerClick);
    this.triggerEl.removeEventListener('focusin', this.handleTriggerFocusIn);
    this.triggerEl.removeEventListener('focusout', this.handleTriggerFocusOut);
  }

  private attachTooltipListeners() {
    if (!this.interactive || !this.tooltipEl) return;

    this.tooltipEl.removeEventListener('mouseenter', this.handleTooltipMouseEnter);
    this.tooltipEl.removeEventListener('mouseleave', this.handleTooltipMouseLeave);
    this.tooltipEl.addEventListener('mouseenter', this.handleTooltipMouseEnter);
    this.tooltipEl.addEventListener('mouseleave', this.handleTooltipMouseLeave);
  }

  private detachTooltipListeners() {
    if (!this.tooltipEl) return;

    this.tooltipEl.removeEventListener('mouseenter', this.handleTooltipMouseEnter);
    this.tooltipEl.removeEventListener('mouseleave', this.handleTooltipMouseLeave);
  }

  private handleTriggerMouseEnter = () => {
    if (this.disabled) return;
    this.scheduleShow();
  };

  private handleTriggerMouseLeave = () => {
    this.scheduleHide();
  };

  private handleTooltipMouseEnter = () => {
    if (this.interactive) {
      this.clearHideTimer();
    }
  };

  private handleTooltipMouseLeave = () => {
    if (this.interactive) {
      this.scheduleHide();
    }
  };

  private handleTriggerClick = () => {
    if (this.disabled) return;
    this.toggleTooltip();
  };

  private handleTriggerFocusIn = () => {
    if (this.disabled) return;
    this.clearHideTimer();
    this.showTooltip();
  };

  private handleTriggerFocusOut = () => {
    this.scheduleHide();
  };

  private handleDocumentClick = (e: MouseEvent) => {
    const path = e.composedPath();
    if (!path.includes(this.host)) {
      this.hideTooltip();
    }
  };

  private handleDocumentKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.hideTooltip();
    }
  };

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

  private clearHideTimer() {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private scheduleShow(delay: number = this.showDelay) {
    this.clearHideTimer();
    this.clearShowTimer();
    this.showTimer = setTimeout(() => this.showTooltip(), delay);
  }

  private scheduleHide(delay: number = this.hideDelay) {
    this.clearShowTimer();
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => this.hideTooltip(), delay);
  }

  private toggleTooltip() {
    if (this.isVisible) {
      this.hideTooltip();
      return;
    }

    this.showTooltip();
  }

  private showTooltip() {
    if (this.disabled || this.isVisible) return;

    this.clearHideTimer();
    this.isVisible = true;
    this.corTooltipShow.emit();
    requestAnimationFrame(() => this.updatePosition());
    this.attachDocumentListeners();
    this.attachTooltipListeners();
  }

  private hideTooltip() {
    if (!this.isVisible) return;

    this.clearShowTimer();
    this.clearHideTimer();
    this.isVisible = false;
    this.corTooltipHide.emit();
    this.detachDocumentListeners();
    this.detachTooltipListeners();
  }

  private updatePosition() {
    if (typeof window === 'undefined') return;
    if (!this.hasLoaded) return;

    const triggerWrapper = this.triggerEl;
    if (!triggerWrapper) return;

    const tooltipEl = this.tooltipEl;
    if (!tooltipEl) return;

    const triggerRect = triggerWrapper.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;

    const position = this.calculatePosition(
      triggerRect,
      tooltipWidth,
      tooltipHeight,
      this.placement as TooltipPlacement,
    );
    this.actualPlacement = position.actualPlacement;
    this.tooltipTop = position.top;
    this.tooltipLeft = position.left;
    this.arrowOffset = position.arrowOffset;
  }

  private calculatePosition(
    triggerRect: DOMRect,
    tooltipWidth: number,
    tooltipHeight: number,
    preferredPlacement: TooltipPlacement,
  ): TooltipPosition {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const fixedOffset = this.getFixedOffset();

    const arrowSize = getCssPixelVar(this.host, '--tooltip-arrow-size', ARROW_SIZE);
    const arrowWidth = getCssPixelVar(this.host, '--tooltip-arrow-width', ARROW_WIDTH);
    const arrowEdgeMargin = getCssPixelVar(this.host, '--tooltip-arrow-edge-margin', ARROW_EDGE_MARGIN);
    const gap = this.offset + (this.showArrow ? arrowSize : 0);

    const compute = (placement: TooltipPlacement): { top: number; left: number; arrowOffset: number } => {
      const { base, align } = this.parsePlacement(placement);

      let top = 0;
      let left = 0;
      let arrowOffset = 0;

      const triggerTop = triggerRect.top - fixedOffset.top;
      const triggerLeft = triggerRect.left - fixedOffset.left;

      if (base === 'top') {
        top = triggerTop - tooltipHeight - gap;
      } else if (base === 'bottom') {
        top = triggerTop + triggerRect.height + gap;
      } else if (base === 'left') {
        left = triggerLeft - tooltipWidth - gap;
      } else if (base === 'right') {
        left = triggerLeft + triggerRect.width + gap;
      }

      if (base === 'top' || base === 'bottom') {
        if (align === 'left') {
          left = triggerLeft;
          arrowOffset = arrowEdgeMargin + arrowWidth / 2;
        } else if (align === 'right') {
          left = triggerLeft + triggerRect.width - tooltipWidth;
          arrowOffset = tooltipWidth - arrowEdgeMargin - arrowWidth / 2;
        } else {
          left = triggerLeft + triggerRect.width / 2 - tooltipWidth / 2;
          arrowOffset = tooltipWidth / 2;
        }
      }

      if (base === 'left' || base === 'right') {
        if (align === 'top') {
          top = triggerTop;
          arrowOffset = arrowEdgeMargin + arrowWidth / 2;
        } else if (align === 'bottom') {
          top = triggerTop + triggerRect.height - tooltipHeight;
          arrowOffset = tooltipHeight - arrowEdgeMargin - arrowWidth / 2;
        } else {
          top = triggerTop + triggerRect.height / 2 - tooltipHeight / 2;
          arrowOffset = tooltipHeight / 2;
        }
      }

      return { top, left, arrowOffset };
    };

    const fitsInViewport = (placement: TooltipPlacement): boolean => {
      const { top, left } = compute(placement);
      const viewTop = top + fixedOffset.top;
      const viewLeft = left + fixedOffset.left;
      return (
        viewTop >= 0 &&
        viewTop + tooltipHeight <= viewportHeight &&
        viewLeft >= 0 &&
        viewLeft + tooltipWidth <= viewportWidth
      );
    };

    let actualPlacement = preferredPlacement;
    if (this.flipFallback && !fitsInViewport(preferredPlacement)) {
      const opposite = OPPOSITE_PLACEMENT[preferredPlacement];
      if (opposite && fitsInViewport(opposite)) {
        actualPlacement = opposite;
      }
    }

    let { top, left } = compute(actualPlacement);
    const { arrowOffset } = compute(actualPlacement);

    // Clamp tooltip position to viewport bounds to prevent cutoff
    const viewTop = top + fixedOffset.top;
    const viewLeft = left + fixedOffset.left;
    const margin = 4; // Minimum margin from viewport edge

    if (viewTop < margin) {
      top = margin - fixedOffset.top;
    } else if (viewTop + tooltipHeight > viewportHeight - margin) {
      top = viewportHeight - margin - tooltipHeight - fixedOffset.top;
    }

    if (viewLeft < margin) {
      left = margin - fixedOffset.left;
    } else if (viewLeft + tooltipWidth > viewportWidth - margin) {
      left = viewportWidth - margin - tooltipWidth - fixedOffset.left;
    }

    return { top, left, actualPlacement, arrowOffset };
  }

  private parsePlacement(placement: TooltipPlacement): { base: string; align: string } {
    const [base, align = 'center'] = placement.split('-');
    return { base, align };
  }

  private getPlacementClass(): string {
    return `placement-${this.actualPlacement}`;
  }

  private hasContentSlot(): boolean {
    return Array.from(this.host.childNodes).some(
      node =>
        !(node as Element).slot &&
        (node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== '')),
    );
  }

  private getSlotState() {
    const trigger = this.host.querySelector('[slot="trigger"]');
    const title = this.host.querySelector('[slot="title"]');
    const description = this.host.querySelector('[slot="description"]');

    return {
      trigger,
      title,
      description,
      hasTitle: !!title,
      hasDescription: !!description,
      hasContent: this.hasContentSlot(),
      triggerTag: trigger?.tagName.toLowerCase() ?? '',
      titleTag: title?.tagName.toLowerCase() ?? '',
      descriptionTag: description?.tagName.toLowerCase() ?? '',
      triggerValid: !trigger || VALID_TRIGGER_TAGS.includes(trigger.tagName.toLowerCase()),
      titleValid: !title || VALID_TITLE_TAGS.includes(title.tagName.toLowerCase()),
      descriptionValid: !description || VALID_DESCRIPTION_TAGS.includes(description.tagName.toLowerCase()),
    };
  }

  render() {
    const {
      hasTitle,
      hasDescription,
      hasContent,
      triggerValid,
      titleValid,
      descriptionValid,
      triggerTag,
      titleTag,
      descriptionTag,
    } = this.getSlotState();

    const tooltipStyle = {
      top: `${this.tooltipTop}px`,
      left: `${this.tooltipLeft}px`,
      maxWidth: this.maxWidth,
    };

    const arrowPositionStyle =
      this.actualPlacement.startsWith('left') || this.actualPlacement.startsWith('right')
        ? { top: `${this.arrowOffset}px` }
        : { left: `${this.arrowOffset}px` };

    return (
      <Host
        class={{
          'is-visible': this.isVisible,
          [this.getPlacementClass()]: true,
          'has-arrow': this.showArrow,
          'is-interactive': this.interactive,
        }}
      >
        {!triggerValid && <div class="slot-error">{invalidSlottedTag(triggerTag, VALID_TRIGGER_TAGS)}</div>}
        <div class="tooltip-trigger" aria-describedby={this.isVisible ? this.tooltipId : undefined}>
          <slot name="trigger" />
        </div>

        <div
          class="tooltip-container"
          id={this.tooltipId}
          role="tooltip"
          aria-hidden={String(!this.isVisible)}
          style={tooltipStyle}
        >
          {!titleValid && <div class="slot-error">{invalidSlottedTag(titleTag, VALID_TITLE_TAGS)}</div>}
          {!descriptionValid && (
            <div class="slot-error">{invalidSlottedTag(descriptionTag, VALID_DESCRIPTION_TAGS)}</div>
          )}

          {(hasTitle || hasDescription) && (
            <div class="tooltip-header">
              {hasTitle && (
                <div class="tooltip-title">
                  <slot name="title" />
                </div>
              )}
              {hasDescription && (
                <div class="tooltip-description">
                  <slot name="description" />
                </div>
              )}
            </div>
          )}

          {hasContent && (
            <div class="tooltip-content">
              <slot />
            </div>
          )}

          {this.showArrow && <div class="tooltip-arrow" style={arrowPositionStyle} aria-hidden="true" />}
        </div>
      </Host>
    );
  }
}
