import { Component, Host, Prop, State, Element, Event, EventEmitter, Watch, h } from '@stencil/core';
import { AccordionSize, AccordionIconPosition } from './cor-accordion.enums';
import type { CorAccordionToggleEventDetail } from './cor-accordion.types';
import { ICON_NAMES } from '../..';

/**
 * Accordion component — a slot-based disclosure widget.
 *
 * @element cor-accordion
 * @slot summary - Header label content (cor-typography + optional cor-icon + optional cor-badge)
 * @slot - Default slot for accordion panel body content
 */
@Component({
  tag: 'cor-accordion',
  styleUrl: 'cor-accordion.css',
  shadow: true,
})
export class CorAccordion {
  /**
   * Size of the accordion — controls header height, font size, icon size, padding
   * @default md
   */
  @Prop({ reflect: true }) size: AccordionSize = AccordionSize.MD;

  /**
   * Position of the chevron icon relative to summary content
   * @default left
   */
  @Prop({ reflect: true }) iconPosition: AccordionIconPosition = AccordionIconPosition.LEFT;

  /**
   * Controlled expanded state. When set externally, component becomes controlled.
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) open: boolean = false;

  /**
   * Whether the accordion is disabled — blocks all interaction
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Whether the accordion is in skeleton loading state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  @State() private hasSummaryContent: boolean = false;

  @Element() host!: HTMLElement;

  /**
   * Emitted after every expand/collapse toggle
   */
  @Event() corAccordionToggle!: EventEmitter<CorAccordionToggleEventDetail>;

  @Watch('disabled')
  watchDisabled(val: boolean) {
    this.propagateSummaryDisabled(val);
  }

  private uid: string = '';
  private panelId: string = '';
  private buttonId: string = '';

  componentWillLoad() {
    this.uid = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    this.panelId = `cor-accordion-panel-${this.uid}`;
    this.buttonId = `cor-accordion-btn-${this.uid}`;

    const summarySlot = this.host.querySelector('[slot="summary"]');
    this.hasSummaryContent = !!summarySlot;
  }

  componentDidLoad() {
    this.propagateSummaryDisabled(this.disabled);
  }

  private handleToggle() {
    if (this.disabled || this.skeleton) return;
    this.open = !this.open;
    this.corAccordionToggle.emit({ open: this.open });
  }

  private handleSummarySlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    this.hasSummaryContent = slot.assignedNodes({ flatten: true }).length > 0;
    this.propagateSummaryDisabled(this.disabled);
  }

  private propagateSummaryDisabled(disabled: boolean) {
    const slot = this.host.shadowRoot?.querySelector('slot[name="summary"]') as HTMLSlotElement | null;
    const assigned = slot?.assignedElements() ?? [];
    assigned.forEach(el => {
      const children = [el, ...Array.from(el.querySelectorAll('*'))] as HTMLElement[];
      children.forEach(child => {
        if (disabled) {
          child.setAttribute('disabled', '');
        } else {
          child.removeAttribute('disabled');
        }
      });
    });
  }

  private getIconSizeVar(): string {
    return this.size === AccordionSize.MD ? 'var(--accordion-icon-size-md)' : 'var(--accordion-icon-size-sm)';
  }

  private getHostClasses(): string {
    const classes: string[] = [];
    if (this.open) classes.push('is-open');
    if (this.disabled) classes.push('is-disabled');
    if (this.skeleton) classes.push('is-skeleton');
    return classes.join(' ');
  }

  render() {
    const iconSizeVar = this.getIconSizeVar();

    const iconWrapper = (
      <span
        class={{
          'accordion__icon-wrapper': true,
          'accordion__icon-wrapper--left': this.iconPosition === AccordionIconPosition.LEFT,
          'accordion__icon-wrapper--right': this.iconPosition === AccordionIconPosition.RIGHT,
        }}
      >
        <cor-icon
          name={ICON_NAMES.CHEVRON__RIGHT}
          width={iconSizeVar}
          height={iconSizeVar}
          color="currentColor"
        ></cor-icon>
      </span>
    );

    const summaryContent = (
      <span
        class={{
          'accordion__summary-content': true,
          'accordion__summary-content--empty': !this.skeleton && !this.hasSummaryContent,
        }}
      >
        {this.skeleton ? (
          <cor-skeleton
            width="100%"
            height={this.size === AccordionSize.MD ? '28px' : '24px'}
            border-radius="4px"
          ></cor-skeleton>
        ) : (
          <slot name="summary" onSlotchange={(e: Event) => this.handleSummarySlotChange(e)}></slot>
        )}
      </span>
    );

    return (
      <Host class={this.getHostClasses()}>
        <div class="accordion">
          <button
            class="accordion__header"
            id={this.buttonId}
            aria-expanded={String(this.open)}
            aria-controls={this.panelId}
            disabled={this.disabled}
            onClick={() => this.handleToggle()}
          >
            {this.iconPosition === AccordionIconPosition.LEFT && iconWrapper}
            {summaryContent}
            {this.iconPosition === AccordionIconPosition.RIGHT && iconWrapper}
          </button>
          <div
            class={{
              'accordion__panel': true,
              'accordion__panel--open': this.open,
            }}
            id={this.panelId}
            role="region"
            aria-labelledby={this.buttonId}
            aria-hidden={String(!this.open)}
          >
            <div class="accordion__panel__inner">
              {this.skeleton ? (
                <div class="accordion__skeleton-panel">
                  <cor-skeleton width="60px" height="20px" border-radius="4px"></cor-skeleton>
                  <cor-skeleton width="100%" height="16px" border-radius="4px"></cor-skeleton>
                  <cor-skeleton
                    width="100%"
                    height="16px"
                    border-radius="4px"
                    style={{ maxWidth: '85%' }}
                  ></cor-skeleton>
                  <cor-skeleton
                    width="100%"
                    height="16px"
                    border-radius="4px"
                    style={{ maxWidth: '85%' }}
                  ></cor-skeleton>
                  <cor-skeleton
                    width="100%"
                    height="16px"
                    border-radius="4px"
                    style={{ maxWidth: '70%' }}
                  ></cor-skeleton>
                </div>
              ) : (
                <div class="accordion__panel__content">
                  <slot></slot>
                </div>
              )}
            </div>
          </div>
        </div>
      </Host>
    );
  }
}
