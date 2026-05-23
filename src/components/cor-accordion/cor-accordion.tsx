import { Component, Element, Event, EventEmitter, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import type {
  AccordionAppearance,
  AccordionChangeDetail,
  AccordionItemDescriptor,
  AccordionMode,
} from './cor-accordion.types';

/**
 * Accordion — vertical stack of collapsible regions per WAI-ARIA Accordion Pattern.
 *
 * Pattern A (slot container): coordinates child `cor-accordion-item` elements,
 * enforces `mode="single"` exclusivity, manages keyboard traversal across
 * headers (Arrow Up/Down, Home, End), and dispatches `corChange` whenever the
 * active set changes.
 *
 * Consumers may either:
 *   1. Slot `<cor-accordion-item>` children directly (declarative, recommended), or
 *   2. Pass an `items` array (data-driven; the accordion renders the items for you).
 *
 * @element cor-accordion
 *
 * @slot - One or more `<cor-accordion-item>` elements.
 *
 * @fires corChange - Emitted on every open/close. `detail.openIds` lists every
 *                     item currently open (single entry in `mode="single"`).
 */
@Component({
  tag: 'cor-accordion',
  styleUrl: 'cor-accordion.css',
  shadow: true,
})
export class CorAccordion {
  /**
   * Coordination mode.
   * - `multiple` (default) — items expand/collapse independently
   * - `single` — opening one item collapses the others
   * @default 'multiple'
   */
  @Prop({ reflect: true }) mode: AccordionMode = 'multiple';

  /**
   * Visual treatment forwarded to every child item.
   * @default 'default'
   */
  @Prop({ reflect: true }) appearance: AccordionAppearance = 'default';

  /**
   * Layout breakpoint forwarded to every child item. Controls heading type
   * size and vertical padding. Omit to let the responsive `@media` rule in
   * the host CSS drive the value (768px breakpoint).
   */
  @Prop({ reflect: true }) breakpoint?: 'desktop' | 'mobile';

  /**
   * Declarative data source. When set, the accordion renders the items for you;
   * the default slot is ignored. Items can still be slotted for advanced use
   * cases — choose one approach per instance.
   */
  @Prop() items?: AccordionItemDescriptor[];

  /**
   * Accessible name forwarded to `aria-label` on the host (paired with
   * `role="group"`). Use when the surrounding heading is not adjacent.
   */
  @Prop() label?: string;

  @State() private resolvedBreakpoint: 'desktop' | 'mobile' = 'desktop';

  @Element() host!: HTMLCorAccordionElement;

  /**
   * Emitted whenever the open set changes.
   */
  @Event({ eventName: 'corChange', bubbles: true, composed: true })
  corChange!: EventEmitter<AccordionChangeDetail>;

  private mediaQuery?: MediaQueryList;

  connectedCallback() {
    this.evaluateBreakpoint();
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.mediaQuery = window.matchMedia('(max-width: 767.98px)');
      this.mediaQuery.addEventListener('change', this.handleMediaChange);
    }
  }

  disconnectedCallback() {
    this.mediaQuery?.removeEventListener('change', this.handleMediaChange);
    this.mediaQuery = undefined;
  }

  componentDidLoad() {
    this.propagateToItems();
  }

  @Watch('appearance')
  @Watch('breakpoint')
  watchPropagatedProps() {
    this.propagateToItems();
  }

  @Watch('mode')
  watchMode(next: AccordionMode) {
    if (next !== 'single') return;
    // When switching INTO single mode, collapse all but the first open item.
    const items = this.queryItems();
    let kept = false;
    for (const item of items) {
      if (!item.open) continue;
      if (!kept) {
        kept = true;
        continue;
      }
      void item.setOpen(false);
    }
    this.emitChange();
  }

  @Listen('corToggle')
  handleItemToggle(ev: CustomEvent<{ open: boolean; itemId: string }>) {
    const sourceId = ev.detail.itemId;
    if (this.mode === 'single' && ev.detail.open) {
      const items = this.queryItems();
      for (const item of items) {
        if ((item.itemId ?? '') !== sourceId && item.open) {
          void item.setOpen(false);
        }
      }
    }
    this.emitChange();
  }

  @Listen('corAccordionItemKey')
  handleArrowKey(ev: CustomEvent<{ key: string; itemId: string }>) {
    const items = this.queryItems().filter(item => !item.disabled);
    if (items.length === 0) return;

    const currentIndex = items.findIndex(item => (item.itemId ?? '') === ev.detail.itemId);
    if (currentIndex === -1) return;

    let target = currentIndex;
    if (ev.detail.key === 'ArrowDown') target = (currentIndex + 1) % items.length;
    else if (ev.detail.key === 'ArrowUp') target = (currentIndex - 1 + items.length) % items.length;
    else if (ev.detail.key === 'Home') target = 0;
    else if (ev.detail.key === 'End') target = items.length - 1;

    void items[target]?.focusHeader();
  }

  private handleMediaChange = (ev: MediaQueryListEvent) => {
    this.resolvedBreakpoint = ev.matches ? 'mobile' : 'desktop';
    this.propagateToItems();
  };

  private evaluateBreakpoint() {
    if (this.breakpoint) {
      this.resolvedBreakpoint = this.breakpoint;
      return;
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.resolvedBreakpoint = window.matchMedia('(max-width: 767.98px)').matches ? 'mobile' : 'desktop';
    }
  }

  private queryItems(): HTMLCorAccordionItemElement[] {
    return Array.from(this.host.children).filter(
      (el): el is HTMLCorAccordionItemElement => el.tagName === 'COR-ACCORDION-ITEM',
    );
  }

  private propagateToItems() {
    const items = this.queryItems();
    const bp = this.breakpoint ?? this.resolvedBreakpoint;
    for (const item of items) {
      item.appearance = this.appearance;
      item.breakpoint = bp;
    }
  }

  private emitChange() {
    const openIds = this.queryItems()
      .filter(item => item.open)
      .map(item => item.itemId ?? '');
    this.corChange.emit({ openIds });
  }

  private renderItem = (descriptor: AccordionItemDescriptor, index: number) => {
    const id = descriptor.id ?? `cor-accordion-item-decl-${index}`;
    return (
      <cor-accordion-item
        item-id={id}
        heading={descriptor.heading}
        supporting-text={descriptor.supportingText}
        open={descriptor.open === true}
        disabled={descriptor.disabled === true}
        appearance={this.appearance}
        breakpoint={this.breakpoint ?? this.resolvedBreakpoint}
      >
        {descriptor.content}
      </cor-accordion-item>
    );
  };

  render() {
    const ariaLabel = this.label?.trim() ? this.label : null;
    return (
      <Host role="group" aria-label={ariaLabel}>
        {this.items && this.items.length > 0 ? this.items.map(this.renderItem) : <slot />}
      </Host>
    );
  }
}
