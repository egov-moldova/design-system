import { Component, Element, Event, EventEmitter, Host, Method, Prop, State, Watch, h } from '@stencil/core';

import type { AccordionIconPosition, AccordionSize } from '../mud-accordion/mud-accordion.types';

let uidSeed = 0;

/**
 * The header slots whose directly assigned elements mirror the item's own
 * `tabindex`, of which `CONTROL_SLOT` alone also mirrors `disabled`. The panel's
 * default slot is deliberately absent — its content is hidden when closed and is
 * not part of the header's interactive row — and so is `icon-start`, which
 * carries decoration rather than controls.
 */
const SUMMARY_SLOTS = ['heading', 'supporting', 'trailing'] as const;

/**
 * The one header slot documented to carry controls, and so the only one whose
 * assigned elements have `disabled` written onto them. `heading` and
 * `supporting` are text slots: writing `disabled` onto a consumer's `<h3>` or
 * `<span>` is invalid HTML, is observable from their own CSS, and buys nothing —
 * those two are already greyed through the inherited `--_heading-color` /
 * `--_supporting-color`. Their keyboard and mouse reach is still closed, by the
 * `tabindex` mirror below and by the stylesheet, so nothing operable is left
 * operable; what a control placed there does NOT get is the disabled semantics
 * assistive technology and form submission read.
 */
const CONTROL_SLOT = 'trailing';

/** Put a `tabindex` back exactly as authored; `null` means it had none. */
const restoreTabindex = (el: Element, previous: string | null) => {
  if (previous === null) el.removeAttribute('tabindex');
  else el.setAttribute('tabindex', previous);
};

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
 * Disabled state and slotted content, and the two halves reach different slots.
 * While the item is disabled it sets `disabled` on the elements you place
 * directly in the `trailing` slot — the one documented to carry controls — and
 * `tabindex="-1"` on the elements you place directly in any of `heading`,
 * `supporting` or `trailing`. Both are given back when the item is enabled again,
 * and only to the elements it wrote them on: a control you ship already disabled
 * stays disabled, and a `tabindex` you authored comes back verbatim. The
 * component keeps a record of its own writes rather than clearing wholesale,
 * which is what used to re-enable your control behind your back (issue #17).
 *
 * Two limits, both deliberate, because `disabled` is an attribute and not a
 * force field:
 *
 * 1. It reaches the elements ASSIGNED to a slot, never their descendants. A
 *    control nested inside a slotted wrapper (`<div slot="trailing"><button>`)
 *    receives nothing — the component does not claim DOM that was never handed
 *    to a slot. The stylesheet's `pointer-events` rule keeps the mouse off it as
 *    long as it does not set its own `pointer-events`, and nothing keeps the
 *    keyboard off it. (Assignment is resolved through the flat tree, so if your
 *    own component forwards a `<slot slot="trailing">` into this one, what YOUR
 *    slot distributes is what gets written — measured. That is still content you
 *    handed to the slot, one component further out.)
 * 2. `disabled` does what the element makes of it, and that is not universal —
 *    28 of this library's 56 components implement it at the time of writing.
 *    Recount with `node scripts/count-disabled-props.mjs`. The load-bearing half
 *    is that `mud-tag` and `mud-badge` are among those that do NOT (issue #21),
 *    so the attribute is inert on them, and they render
 *    identically whether the item is disabled or not. An `<a href>`, a
 *    `<div tabindex>` or any custom element without `disabled` behaviour is the
 *    same. For those, `tabindex="-1"` is mirrored alongside the attribute so the
 *    keyboard at least matches what assistive technology is told; the element is
 *    still clickable by script and still activates programmatically.
 *
 * So this state is a UX affordance, not an authorization boundary. An action
 * that must not be reachable while the item is disabled needs its own guard —
 * a real control with native `disabled` placed directly in the slot, and
 * server-side enforcement for anything security- or state-sensitive.
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

  /**
   * The elements whose `tabindex` this component overwrote, mapped to the value
   * they had before — `null` for "no attribute". Restored verbatim on enable.
   *
   * Why this exists at all: `disabled` removes a native form control from the
   * tab order, but it does nothing to an `<a href>`, a `<div tabindex>`, or a
   * custom element that does not implement it. Measured in Chromium, such an
   * element under a disabled item is still Tab-reachable and still activates on
   * Enter — while the disabled header `<button>` ancestor makes the
   * accessibility tree report it as `disabled`. Assistive technology would
   * announce "unavailable" about a control that works, which is WCAG 2.1
   * SC 4.1.2. This closes that for directly slotted elements.
   *
   * A Map rather than a Set because a consumer's own `tabindex` must come back
   * exactly as authored, including `tabindex="0"` — the case a Set would have to
   * skip, and skipping it would leave tab-reachable precisely the elements that
   * were tab-reachable.
   */
  private ownedTabindex = new Map<Element, string | null>();

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
    // Re-acquire, and this is the other half of `disconnectedCallback`'s release.
    // Measured against the installed runtime (@stencil/core 4.43.4): a second
    // connect takes the `else` branch at `internal/client/index.js:4011`, which
    // fires `connectedCallback` but never `initializeComponent`, so
    // `componentDidLoad` does not run again; `@Watch('disabled')` does not fire
    // either, because the value never changed. Without this line an item moved
    // with `appendChild` — a framework key change, a list reorder, a tab remount
    // — comes back rendering `disabled` while every slotted control has lost
    // both writes. It no-ops when the item is not disabled and returns early
    // before the first render, when the shadow root and slots do not resolve.
    this.syncSlottedDisabled();

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

  disconnectedCallback() {
    // Acquire/release symmetry (`src/components/AGENTS.md:93`). The writes live
    // in the consumer's DOM, which outlives this instance: a framework that
    // unmounts the item, or moves a slotted control into a toolbar, would
    // otherwise leave it carrying a `disabled` nobody can attribute.
    this.releaseSlottedWrites();
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
      this.releaseSlottedWrites();
      return;
    }
    const root = this.host.shadowRoot;
    if (!root) return;

    const assigned = new Set<Element>();
    const controls = new Set<Element>();
    let resolvedASlot = false;
    for (const name of SUMMARY_SLOTS) {
      const slot = root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`);
      if (typeof slot?.assignedElements !== 'function') continue;
      resolvedASlot = true;
      for (const el of slot.assignedElements({ flatten: true })) {
        assigned.add(el);
        if (name === CONTROL_SLOT) controls.add(el);
      }
    }
    // Without a single resolvable slot there is no evidence about what is
    // assigned, and an empty `assigned` would read as "everything left".
    if (!resolvedASlot) return;

    // Anything written to that has since left the header is no longer ours to
    // hold. Give it back now: keeping it would leave our attribute stuck on an
    // element that is somewhere else in the consumer's page, and keeping the
    // reference would pin it until an enable that may never come.
    for (const el of this.ownedDisabled) {
      if (controls.has(el)) continue;
      el.removeAttribute('disabled');
      this.ownedDisabled.delete(el);
    }
    for (const [el, previous] of this.ownedTabindex) {
      if (assigned.has(el)) continue;
      restoreTabindex(el, previous);
      this.ownedTabindex.delete(el);
    }

    for (const el of assigned) {
      // Two separate decisions, and conflating them into one guard left a hole.
      // REMEMBER only on first claim, so the restored value is what the consumer
      // authored and not a `-1` this component wrote. But WRITE unconditionally,
      // so a `tabindex` that anything else sets during the disabled window is
      // suppressed again at the next sync — measured, the `disabled` loop below
      // already re-asserts because it reads the live attribute, and a mirror that
      // gives up after one write reopens SC 4.1.2 for the rest of the window.
      if (!this.ownedTabindex.has(el)) this.ownedTabindex.set(el, el.getAttribute('tabindex'));
      el.setAttribute('tabindex', '-1');
    }

    for (const el of controls) {
      // Already disabled, by attribute OR by property. The property check is
      // not belt-and-braces: a custom element that does not reflect `disabled`
      // (React 19 sets unknown props on custom elements as properties) would
      // otherwise be claimed here and cleared on re-enable — issue #17 again,
      // in the one shape no in-repo test can reach, since every `mud-*` control
      // reflects.
      if (el.hasAttribute('disabled')) continue;
      if ((el as { disabled?: unknown }).disabled === true) continue;
      el.setAttribute('disabled', '');
      this.ownedDisabled.add(el);
    }
  }

  /**
   * Hand back every attribute this component wrote, in both ledgers. Called on
   * re-enable and on disconnect.
   *
   * Deliberately independent of the shadow root and of the slots: releasing must
   * not depend on anything still resolving, because the elements it releases
   * live in the consumer's DOM and outlive this instance.
   */
  private releaseSlottedWrites() {
    for (const el of this.ownedDisabled) el.removeAttribute('disabled');
    this.ownedDisabled.clear();
    for (const [el, previous] of this.ownedTabindex) restoreTabindex(el, previous);
    this.ownedTabindex.clear();
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
