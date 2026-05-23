import { Component, Element, Event, EventEmitter, Host, Method, Prop, State, Watch, h } from '@stencil/core';

let uidSeed = 0;

/**
 * Accordion item — a single collapsible row inside `cor-accordion`.
 *
 * Pattern B (atom-interactive): renders its own header `<button>` and a
 * `<div role="region">` panel inside shadow DOM. The container manages
 * exclusivity in `mode="single"`; the item owns its visual state.
 *
 * @element cor-accordion-item
 *
 * @slot heading - Optional rich heading content. Overrides the `heading` prop.
 * @slot supporting - Optional supporting text. Overrides the `supportingText` prop.
 * @slot icon-start - Optional leading icon (`cor-icon` recommended).
 * @slot trailing - Optional trailing content (`cor-badge`, `cor-button`, label).
 *                   Sits between the heading group and the open/close trigger.
 * @slot - (default) Panel body. Rendered only when the item is open.
 *
 * @part header - The button that toggles open/closed.
 * @part panel - The region revealed when open.
 *
 * @fires corToggle - Fired when the user activates the header. The container
 *                    listens for this and decides whether to honour it
 *                    (single-mode collapsing of siblings).
 */
@Component({
  tag: 'cor-accordion-item',
  styleUrl: 'cor-accordion-item.css',
  shadow: true,
})
export class CorAccordionItem {
  /**
   * Whether the item is currently expanded.
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) open: boolean = false;

  /**
   * Marks the item non-interactive. Header receives `aria-disabled`.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Header text. Overridden by the `heading` slot when provided.
   */
  @Prop() heading?: string;

  /**
   * Secondary text shown beneath the heading. Overridden by the `supporting` slot.
   */
  @Prop() supportingText?: string;

  /**
   * Stable identifier used by the parent `cor-accordion` when emitting
   * `corChange`. Auto-generated if omitted.
   */
  @Prop({ reflect: true, mutable: true }) itemId?: string;

  /**
   * Visual treatment.
   * - `default` — flat header, neutral background
   * - `trail-sites` — open header gets a brand-tint background per Figma "Trail Sites"
   *
   * Set by the parent `cor-accordion` via attribute; consumers should set
   * `appearance` on the parent, not on individual items.
   * @default 'default'
   */
  @Prop({ reflect: true }) appearance: 'default' | 'trail-sites' = 'default';

  /**
   * Layout breakpoint. Set by the parent based on the resolved size
   * (desktop ≥ 768px, mobile below). May also be set explicitly by
   * consumers who need a fixed render at narrow widths.
   * @default 'desktop'
   */
  @Prop({ reflect: true }) breakpoint: 'desktop' | 'mobile' = 'desktop';

  @State() private headingId: string = '';

  @State() private panelId: string = '';

  @State() private hasIconStart: boolean = false;

  @State() private hasTrailing: boolean = false;

  @State() private hasSupportingSlot: boolean = false;

  @State() private hasHeadingSlot: boolean = false;

  @Element() host!: HTMLCorAccordionItemElement;

  /**
   * Emitted when the user activates the header (click / Enter / Space).
   * The parent `cor-accordion` may cancel the implicit toggle in
   * `mode="single"` to enforce exclusivity.
   */
  @Event({ eventName: 'corToggle', bubbles: true, composed: true }) corToggle!: EventEmitter<{
    open: boolean;
    itemId: string;
  }>;

  connectedCallback() {
    if (!this.itemId) {
      uidSeed += 1;
      this.itemId = `cor-accordion-item-${uidSeed}`;
    }
    this.headingId = `${this.itemId}-header`;
    this.panelId = `${this.itemId}-panel`;
  }

  /**
   * Programmatically toggle the item. Bypasses the click pipeline so the
   * parent `cor-accordion` does not receive a `corToggle` event — used by
   * the parent itself to coordinate `mode="single"` exclusivity.
   */
  @Method()
  async setOpen(open: boolean): Promise<void> {
    this.open = open;
  }

  /**
   * Returns the focusable header element so the parent can implement the
   * Arrow/Home/End traversal contract from WAI-ARIA Accordion Pattern.
   */
  @Method()
  async focusHeader(): Promise<void> {
    const header = this.host.shadowRoot?.querySelector<HTMLButtonElement>('button.header');
    header?.focus();
  }

  @Watch('disabled')
  watchDisabled(next: boolean) {
    if (next && this.open) {
      this.open = false;
    }
  }

  private onHeadingSlotChange = (ev: Event) => {
    this.hasHeadingSlot = this.slotHasContent(ev);
  };

  private onSupportingSlotChange = (ev: Event) => {
    this.hasSupportingSlot = this.slotHasContent(ev);
  };

  private onIconStartSlotChange = (ev: Event) => {
    this.hasIconStart = this.slotHasContent(ev);
  };

  private onTrailingSlotChange = (ev: Event) => {
    this.hasTrailing = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.ELEMENT_NODE) return true;
      return (node.textContent ?? '').trim().length > 0;
    });
  }

  private handleClick = (ev: MouseEvent) => {
    if (this.disabled) {
      ev.preventDefault();
      return;
    }
    const next = !this.open;
    this.open = next;
    this.corToggle.emit({ open: next, itemId: this.itemId ?? '' });
  };

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (this.disabled) return;
    // Native <button> handles Enter/Space activation already — we only need to
    // surface arrow-key intent to the parent for cross-item traversal.
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' || ev.key === 'Home' || ev.key === 'End') {
      const detail = { key: ev.key, itemId: this.itemId ?? '' };
      this.host.dispatchEvent(new CustomEvent('corAccordionItemKey', { detail, bubbles: true, composed: true }));
      ev.preventDefault();
    }
  };

  render() {
    const isDisabled = this.disabled;
    const ariaExpanded = this.open ? 'true' : 'false';
    const ariaDisabled = isDisabled ? 'true' : null;
    const tabIndex = isDisabled ? -1 : 0;

    return (
      <Host>
        <button
          type="button"
          class="header"
          part="header"
          id={this.headingId}
          aria-expanded={ariaExpanded}
          aria-controls={this.panelId}
          aria-disabled={ariaDisabled}
          disabled={isDisabled}
          tabindex={tabIndex}
          onClick={this.handleClick}
          onKeyDown={this.handleKeyDown}
        >
          <span class={{ 'icon-start': true, 'has-content': this.hasIconStart }}>
            <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
          </span>
          <span class="text-group">
            <span class={{ 'heading': true, 'has-slot': this.hasHeadingSlot }}>
              <slot name="heading" onSlotchange={this.onHeadingSlotChange}>
                {this.heading}
              </slot>
            </span>
            <span
              class={{
                'supporting': true,
                'has-slot': this.hasSupportingSlot,
                'has-content': Boolean(this.supportingText) || this.hasSupportingSlot,
              }}
            >
              <slot name="supporting" onSlotchange={this.onSupportingSlotChange}>
                {this.supportingText}
              </slot>
            </span>
          </span>
          <span class={{ 'trailing': true, 'has-content': this.hasTrailing }}>
            <slot name="trailing" onSlotchange={this.onTrailingSlotChange} />
          </span>
          <span class="trigger" aria-hidden="true">
            <svg
              class="trigger-icon"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              focusable="false"
            >
              <line
                x1="4.25"
                y1="10"
                x2="15.75"
                y2="10"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <line
                class="trigger-icon-vertical"
                x1="10"
                y1="4.25"
                x2="10"
                y2="15.75"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>
        </button>
        <div
          class="panel"
          part="panel"
          id={this.panelId}
          role="region"
          aria-labelledby={this.headingId}
          hidden={!this.open}
        >
          <div class="panel-inner">
            <slot />
          </div>
        </div>
      </Host>
    );
  }
}
