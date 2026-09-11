import { Component, Element, Event, EventEmitter, Host, Method, Prop, State, Watch, h } from '@stencil/core';

import type { AccordionIconPosition, AccordionSize } from '../mud-accordion/mud-accordion.types';

let uidSeed = 0;

/**
 * The header slots whose directly assigned elements mirror the item's own
 * `disabled`. The panel's default slot is deliberately absent — its content is
 * hidden when closed and is not part of the header's interactive row — and so is
 * `icon-start`, which carries decoration rather than controls.
 */
const SUMMARY_SLOTS = ['heading', 'supporting', 'trailing'] as const;

// `@csspart` duplicates `@part` and `@fires` duplicates the `@Event()` decorators in
// the docblock below, because two generators read it and neither reads the other's
// tag: Stencil's readme takes `@part` and the decorators, web-component-analyzer —
// which writes `.storybook/custom-elements.json`, and so the Storybook API table —
// takes only `@csspart` and `@fires`. The note sits out here rather than inside the
// block: Stencil concatenates untagged prose into the PRECEDING tag's description,
// which is how it once landed inside the `panel` shadow-part row.
// Baseline: `node -e "const t=require('./.storybook/custom-elements.json').tags.find(t=>t.name==='mud-accordion-item');console.log(t.events.map(e=>e.name),t.cssParts.map(p=>p.name))"`
// -> both events and both parts; dropping either tag empties its table.
/**
 * Accordion item — a single collapsible row inside `mud-accordion`.
 *
 * Pattern B (atom-interactive): renders its own header `<button>` and a
 * `<div role="region">` panel inside shadow DOM. The container manages
 * exclusivity in `mode="single"`; the item owns its visual state.
 *
 * Disabled state and slotted content: while the item is disabled it sets
 * `disabled` on the elements you place DIRECTLY in the `heading`, `supporting`
 * and `trailing` slots, and it removes it again only from the elements it set it
 * on. A control you ship already disabled stays disabled — the component keeps a
 * record of its own writes rather than clearing the attribute wholesale, which is
 * what used to re-enable your control behind your back (issue #17).
 *
 * Directly slotted elements only. A control nested inside a slotted wrapper
 * (`<div slot="trailing"><button>`) receives nothing: the component does not claim
 * DOM that was never handed to a slot. Such a control is blocked from the mouse by
 * a `pointer-events` rule in this component's stylesheet, but it stays
 * keyboard-reachable while the item is disabled. Put controls directly in the slot.
 *
 * @element mud-accordion-item
 *
 * @slot heading - Optional rich heading content. Overrides the `heading` prop.
 * @slot supporting - Optional supporting text. Overrides the `supportingText` prop.
 * @slot icon-start - Optional leading icon (`mud-icon` recommended).
 * @slot trailing - Optional trailing content (`mud-badge`, `mud-button`, label).
 *                   Sits between the heading group and the open/close trigger.
 *                   Disabled along with the item while directly slotted.
 * @slot - (default) Panel body. Always in the DOM; the panel carries `hidden`
 * while the item is closed, so slotted media still loads when collapsed.
 *
 * @part header - The button that toggles open/closed.
 * @part panel - The region revealed when open.
 *
 * @csspart header - The button that toggles open/closed.
 * @csspart panel - The region revealed when open.
 *
 * @fires mudToggle - Emitted after the item has already toggled itself. The parent `mud-accordion` reacts by collapsing the other items in `mode="single"`; it cannot refuse or reverse this item's own change.
 * @fires mudAccordionItemKey - Emitted on Arrow/Home/End keypress on the header. Consumed by the parent `mud-accordion` to implement WAI-ARIA Accordion Pattern traversal. Internal contract — consumers typically don't subscribe directly.
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
   * Layout breakpoint (desktop ≥ 768px, mobile below). Owned by the parent
   * `mud-accordion`, which assigns it on load and on every viewport crossing —
   * setting it on an item is overwritten. Configure it on the parent instead.
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

  /**
   * The elements this component wrote `disabled` onto, so re-enabling gives back
   * exactly what was taken. An element that already carried `disabled` when the
   * item was disabled never enters this set and is never touched — that is the
   * whole of issue #17.
   *
   * Populated on disable and cleared on enable, so it holds references only for
   * as long as the item is disabled.
   */
  private ownedDisabled = new Set<Element>();

  @State() private headingId: string = '';

  @State() private panelId: string = '';

  @State() private hasIconStart: boolean = false;

  @State() private hasTrailing: boolean = false;

  @State() private hasSupportingSlot: boolean = false;

  @State() private hasHeadingSlot: boolean = false;

  @Element() host!: HTMLMudAccordionItemElement;

  /**
   * Emitted after the item has already toggled itself. The parent `mud-accordion` reacts by collapsing the other items in `mode="single"`; it cannot refuse or reverse this item's own change.
   */
  @Event({ eventName: 'mudToggle', bubbles: true, composed: true }) mudToggle!: EventEmitter<{
    open: boolean;
    itemId: string;
  }>;

  /**
   * Emitted on Arrow/Home/End keypress on the header. Consumed by the parent `mud-accordion` to implement WAI-ARIA Accordion Pattern traversal. Internal contract — consumers typically don't subscribe directly.
   */
  @Event({ eventName: 'mudAccordionItemKey', bubbles: true, composed: true })
  mudAccordionItemKey!: EventEmitter<{ key: string; itemId: string }>;

  @Watch('disabled')
  watchDisabled(next: boolean) {
    if (next && this.open) {
      this.open = false;
    }
    this.syncSlottedDisabled();
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
    // An item that renders with `disabled` already set fires no @Watch.
    this.syncSlottedDisabled();
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
    this.syncSlottedDisabled();
  };

  private onSupportingSlotChange = (ev: Event) => {
    this.hasSupportingSlot = this.slotHasContent(ev);
    this.syncSlottedDisabled();
  };

  private onIconStartSlotChange = (ev: Event) => {
    this.hasIconStart = this.slotHasContent(ev);
  };

  private onTrailingSlotChange = (ev: Event) => {
    this.hasTrailing = this.slotHasContent(ev);
    this.syncSlottedDisabled();
  };

  /**
   * Mirror the item's `disabled` onto the elements directly assigned to the
   * header slots, recording what was written so it can be taken back precisely.
   *
   * Directly assigned ONLY. The previous implementation walked the whole assigned
   * subtree, which wrote into DOM the consumer never handed to a slot; a control
   * nested inside a slotted wrapper is not covered here, by design — the
   * stylesheet blocks it from the mouse, and the docs point controls at the slot.
   *
   * No-op before the first render, and in any environment without the slot API.
   */
  private syncSlottedDisabled() {
    if (!this.disabled) {
      // Give back exactly what was taken. Deliberately before the shadowRoot
      // guard: releasing must not depend on the slots still resolving.
      for (const el of this.ownedDisabled) el.removeAttribute('disabled');
      this.ownedDisabled.clear();
      return;
    }
    const root = this.host.shadowRoot;
    if (!root) return;
    for (const name of SUMMARY_SLOTS) {
      const slot = root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`);
      if (typeof slot?.assignedElements !== 'function') continue;
      for (const el of slot.assignedElements({ flatten: true })) {
        // Already disabled: either the consumer's own value, or ours from an
        // earlier pass. Either way there is nothing to write — and a consumer
        // value must never enter the set, or re-enabling would clear it.
        if (el.hasAttribute('disabled')) continue;
        el.setAttribute('disabled', '');
        this.ownedDisabled.add(el);
      }
    }
  }

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
