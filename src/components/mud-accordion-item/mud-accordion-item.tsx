import { Component, Element, Event, EventEmitter, Host, Method, Prop, State, Watch, h } from '@stencil/core';

import type { AccordionIconPosition, AccordionSize } from '../mud-accordion/mud-accordion.types';

let uidSeed = 0;

/**
 * Accordion item — a single collapsible row inside `mud-accordion`.
 *
 * Pattern B (atom-interactive): renders its own header `<button>` and a
 * `<div role="region">` panel inside shadow DOM. The container manages
 * exclusivity in `mode="single"`; the item owns its visual state.
 *
 * @element mud-accordion-item
 *
 * @slot heading - Optional rich heading content. Overrides the `heading` prop.
 * @slot supporting - Optional supporting text. Overrides the `supportingText` prop.
 * @slot icon-start - Optional leading icon (`mud-icon` recommended).
 * @slot trailing - Optional trailing content (`mud-badge`, `mud-button`, label).
 *                   Sits between the heading group and the open/close trigger.
 * @slot - (default) Panel body. Rendered only when the item is open.
 *
 * @part header - The button that toggles open/closed.
 * @part panel - The region revealed when open.
 *
 * `@csspart` duplicates `@part` and `@fires` duplicates the `@Event()` decorators
 * because two generators read this block and neither reads the other's tag:
 * Stencil's readme takes `@part` and the decorators, while web-component-analyzer —
 * which writes `.storybook/custom-elements.json`, and so the Storybook API table —
 * takes only `@csspart` and `@fires`.
 * Baseline: `node -e "const t=require('./.storybook/custom-elements.json').tags.find(t=>t.name==='mud-accordion-item');console.log(t.events.map(e=>e.name),t.cssParts&&t.cssParts.map(p=>p.name))"`
 * -> both events and both parts; dropping either tag empties its table.
 *
 * @csspart header - The button that toggles open/closed.
 * @csspart panel - The region revealed when open.
 *
 * @fires mudToggle - Fired when the user activates the header. The container
 *                    listens for this and decides whether to honour it
 *                    (single-mode collapsing of siblings).
 * @fires mudAccordionItemKey - Fired on Arrow/Home/End keypress on the header.
 *                    Consumed by the parent `mud-accordion` for WAI-ARIA
 *                    Accordion Pattern traversal.
 */
@Component({
  tag: 'mud-accordion-item',
  styleUrl: 'mud-accordion-item.css',
  shadow: true,
})
export class MudAccordionItem {
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
   * Stable identifier used by the parent `mud-accordion` when emitting
   * `mudChange`. Auto-generated if omitted.
   */
  @Prop({ reflect: true, mutable: true }) itemId?: string;

  /**
   * Visual treatment.
   * - `default` — flat header, neutral background
   * - `trail-sites` — open header gets a brand-tint background per Figma "Trail Sites"
   *
   * Set by the parent `mud-accordion` via attribute; consumers should set
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

  /**
   * Visual size rung — controls header height, font size, icon size, padding.
   * Set by the parent `mud-accordion` via `size`; consumers should configure
   * size at the container level.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: AccordionSize = 'md';

  /**
   * Trigger-icon placement relative to the header content.
   * Set by the parent `mud-accordion`.
   * @default 'right'
   */
  @Prop({ reflect: true }) iconPosition: AccordionIconPosition = 'right';

  @State() private headingId: string = '';

  @State() private panelId: string = '';

  @State() private hasIconStart: boolean = false;

  @State() private hasTrailing: boolean = false;

  @State() private hasSupportingSlot: boolean = false;

  @State() private hasHeadingSlot: boolean = false;

  @Element() host!: HTMLMudAccordionItemElement;

  /**
   * Emitted when the user activates the header (click / Enter / Space).
   * The parent `mud-accordion` may cancel the implicit toggle in
   * `mode="single"` to enforce exclusivity.
   */
  @Event({ eventName: 'mudToggle', bubbles: true, composed: true }) mudToggle!: EventEmitter<{
    open: boolean;
    itemId: string;
  }>;

  /**
   * Emitted on Arrow/Home/End keypress on the header. Consumed by the parent
   * `mud-accordion` to implement WAI-ARIA Accordion Pattern traversal.
   * Internal contract — consumers typically don't subscribe directly.
   */
  @Event({ eventName: 'mudAccordionItemKey', bubbles: true, composed: true })
  mudAccordionItemKey!: EventEmitter<{ key: string; itemId: string }>;

  @Watch('disabled')
  watchDisabled(next: boolean) {
    if (next && this.open) {
      this.open = false;
    }
    this.propagateSummaryDisabled(next);
  }

  connectedCallback() {
    if (!this.itemId) {
      uidSeed += 1;
      this.itemId = `mud-accordion-item-${uidSeed}`;
    }
    this.headingId = `${this.itemId}-header`;
    this.panelId = `${this.itemId}-panel`;
  }

  componentDidLoad() {
    this.propagateSummaryDisabled(this.disabled);
  }

  /**
   * Programmatically toggle the item. Bypasses the click pipeline so the
   * parent `mud-accordion` does not receive a `mudToggle` event — used by
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
    this.mudToggle.emit({ open: next, itemId: this.itemId ?? '' });
  };

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (this.disabled) return;
    // Native <button> handles Enter/Space activation already — we only need to
    // surface arrow-key intent to the parent for cross-item traversal.
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' || ev.key === 'Home' || ev.key === 'End') {
      this.mudAccordionItemKey.emit({ key: ev.key, itemId: this.itemId ?? '' });
      ev.preventDefault();
    }
  };

  /**
   * Mirror the item's `disabled` state onto every element currently slotted
   * into `heading` / `supporting` / `trailing` slots. Legacy parity — when
   * the consumer's slotted control (e.g. `mud-button`) supports a `disabled`
   * attribute, it stays in sync with the accordion's own disabled state.
   *
   * NOTE: heavy-handed — walks the assigned subtree on every change. Only
   * runs in browser env (no-op when shadowRoot / slot APIs are missing).
   */
  private propagateSummaryDisabled(disabled: boolean) {
    const root = this.host.shadowRoot;
    if (!root) return;
    const slots = ['heading', 'supporting', 'trailing']
      .map(name => root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`))
      .filter((s): s is HTMLSlotElement => !!s);
    for (const slot of slots) {
      const assigned = slot.assignedElements({ flatten: true });
      for (const el of assigned) {
        const children = [el, ...Array.from(el.querySelectorAll('*'))] as HTMLElement[];
        for (const child of children) {
          if (disabled) child.setAttribute('disabled', '');
          else child.removeAttribute('disabled');
        }
      }
    }
  }

  render() {
    const isDisabled = this.disabled;
    const ariaExpanded = this.open ? 'true' : 'false';
    const ariaDisabled = isDisabled ? 'true' : null;
    const tabIndex = isDisabled ? -1 : 0;
    const isIconLeft = this.iconPosition === 'left';

    // Intentional inline icon markup (suppresses ANTIPATTERN-021-RAW-SVG):
    // the +/− glyph is INTRINSIC to the accordion's open/close animation —
    // CSS targets `.trigger-icon-vertical` to transform/hide the vertical
    // bar when open. Routing this through `<mud-icon>` would either lose
    // the animation or require shipping two static icons + crossfade,
    // both worse than the current 8-line SVG. Same precedent as mud-checkbox /
    // mud-chip / mud-tooltip.
    const triggerIcon = (
      <span class="trigger" aria-hidden="true">
        <svg class="trigger-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
          <line x1="4.25" y1="10" x2="15.75" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
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
    );

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
          {isIconLeft && triggerIcon}
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
          {!isIconLeft && triggerIcon}
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
