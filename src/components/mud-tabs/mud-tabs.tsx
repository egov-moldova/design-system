import { Component, Element, Event, EventEmitter, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import { TABS_SIZES } from './mud-tabs.types';
import type { TabDescriptor, TabsChangeDetail, TabsSize } from './mud-tabs.types';

let tabsInstanceCounter = 0;

/**
 * `mud-tabs` — horizontal tablist that switches the currently visible panel.
 *
 * Two composition modes:
 *  1. **Declarative** (recommended for static menus): slot `<mud-tab>` children
 *     into the default slot and matching `<div slot="panel-{value}">` blocks
 *     into the panel slots.
 *  2. **Data-driven**: pass a `tabs` array. The component renders each entry
 *     as a child `mud-tab` and exposes panels via `<div slot="panel-{value}">`
 *     elements supplied by the consumer.
 *
 * Pattern A (molecule, slot-based). The host carries `role="tablist"`; the
 * tabs are rendered children with `role="tab"`; the panels are slotted into
 * named `panel-{value}` slots and receive `role="tabpanel"` + the matching
 * `aria-labelledby`.
 *
 * Keyboard contract (WAI-ARIA Authoring Practices, automatic activation):
 * - `Tab` focuses the currently selected tab (single tab stop into the group)
 * - `ArrowLeft` / `ArrowRight` move selection between enabled tabs (wraps)
 * - `Home` / `End` jump to the first / last enabled tab
 * - `Enter` / `Space` activate the focused tab (no-op for selected/disabled)
 *
 * Overflow: when the rendered tabs are wider than the host, the component
 * exposes leading + trailing chevron buttons that scroll the strip. Both
 * chevrons are mouse-only; their `aria-hidden="true"` keeps them out of the
 * keyboard order (arrow keys already move selection without overflow help).
 *
 * @element mud-tabs
 *
 * @slot - Default slot for `<mud-tab>` children.
 * @slot panel-{value} - Tab-panel content keyed by the `value` of the
 *   matching tab. Exactly one panel is visible at a time.
 */
@Component({
  tag: 'mud-tabs',
  styleUrl: 'mud-tabs.css',
  shadow: true,
})
export class MudTabs {
  /**
   * Size rung. `md` is 48 px tall; `sm` is 40 px tall (mobile + dense layouts).
   * @default 'md'
   */
  @Prop({ reflect: true }) size: TabsSize = 'md';

  /**
   * Value of the currently selected tab. Mutable so that uncontrolled usage
   * (click + keyboard) keeps the host attribute in sync.
   */
  @Prop({ reflect: true, mutable: true }) value?: string;

  /**
   * Data-driven tab list. When supplied, the component renders one
   * `<mud-tab>` per entry. Mutually compatible with slotted children — the
   * slotted variant takes precedence when both are present.
   */
  @Prop() tabs?: TabDescriptor[];

  /**
   * Accessible name for the tablist. Captured into `resolvedAriaLabel` on
   * mount and the host attribute is stripped to avoid Stencil's
   * auto-reflection loop.
   */
  @Prop() ariaLabel?: string;

  /** Id of an external labelling element (overrides `aria-label`). */
  @Prop() ariaLabelledby?: string;

  @State() private hasOverflow: boolean = false;
  @State() private canScrollStart: boolean = false;
  @State() private canScrollEnd: boolean = false;
  @State() private resolvedAriaLabel?: string;
  @State() private resolvedAriaLabelledby?: string;
  /**
   * Panel slot names projected through the shadow DOM. Tracked separately
   * from `tabs` so that declarative `<mud-tab>` children also project their
   * matching panels without consumers needing to opt-in.
   */
  @State() private projectedPanelSlots: string[] = [];

  @Element() host!: HTMLMudTabsElement;

  /** Fires when the selected tab changes. `detail.value` is the new selection. */
  @Event() mudChange!: EventEmitter<TabsChangeDetail>;

  private readonly instanceId = ++tabsInstanceCounter;
  private readonly groupId = `mud-tabs-${this.instanceId}`;
  private scrollerEl?: HTMLDivElement;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private scrollRafId?: number;

  componentWillLoad() {
    this.captureAriaAttrs();
  }

  componentDidLoad() {
    this.observeOverflow();
    this.observeChildren();
  }

  /**
   * Stencil auto-reflects `@Prop()` values back onto the host attribute. For
   * `aria-label` / `aria-labelledby` that creates an observer loop. Capture
   * each consumer-provided value into a state field, then strip the
   * attribute so the loop never fires.
   */
  private captureAriaAttrs() {
    const labelAttr = this.host.getAttribute('aria-label');
    if (labelAttr) {
      this.resolvedAriaLabel = labelAttr;
      this.host.removeAttribute('aria-label');
    } else if (this.ariaLabel) {
      this.resolvedAriaLabel = this.ariaLabel;
    }

    const labelledbyAttr = this.host.getAttribute('aria-labelledby');
    if (labelledbyAttr) {
      this.resolvedAriaLabelledby = labelledbyAttr;
      this.host.removeAttribute('aria-labelledby');
    } else if (this.ariaLabelledby) {
      this.resolvedAriaLabelledby = this.ariaLabelledby;
    }
  }

  @Watch('ariaLabel')
  handleAriaLabelChange(next: string | undefined) {
    if (next && next.length > 0) {
      this.resolvedAriaLabel = next;
    }
  }

  @Watch('ariaLabelledby')
  handleAriaLabelledbyChange(next: string | undefined) {
    if (next && next.length > 0) {
      this.resolvedAriaLabelledby = next;
    }
  }

  componentDidRender() {
    // Runs after every render (initial + every subsequent re-render). This is
    // where data-driven tabs become queryable in shadow DOM, so it is the
    // safest place to wire selection / ARIA state on both light + shadow
    // children.
    this.syncSelectionToTabs();
    this.syncPanels();
    // Overflow measurement mutates @State() — defer to the next frame so
    // Stencil does not warn about state changes during render.
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.measureOverflow());
    } else {
      this.measureOverflow();
    }
  }

  disconnectedCallback() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.mutationObserver) this.mutationObserver.disconnect();
    if (this.scrollRafId !== undefined) cancelAnimationFrame(this.scrollRafId);
  }

  @Watch('size')
  validateSize(next: TabsSize) {
    if (!TABS_SIZES.includes(next)) {
      console.warn(
        `[mud-tabs] size="${String(next)}" is not supported. Supported: ${TABS_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
      return;
    }
    // Propagate the size to all child <mud-tab> elements so they restyle.
    this.getTabs().forEach(tab => {
      tab.size = next;
    });
  }

  @Watch('value')
  handleValueChange() {
    // componentDidRender() will pick this up. We still trigger sync now so
    // synchronous test assertions see the new selection without waiting a
    // tick when only `value` changed (no template re-render is needed).
    this.syncSelectionToTabs();
    this.syncPanels();
  }

  @Watch('tabs')
  handleTabsChange() {
    // The actual sync happens inside componentDidRender() once Stencil has
    // re-rendered the data-driven tab template. We leave this watcher in
    // place to opt back into prop-change reactivity.
  }

  @Listen('mudTabActivate')
  handleTabActivate(ev: CustomEvent<{ value: string }>) {
    const nextValue = ev.detail?.value;
    if (!nextValue) return;
    const tab = this.getTabs().find(t => t.value === nextValue);
    if (!tab || tab.disabled) return;
    if (this.value === nextValue) return;
    this.value = nextValue;
    this.mudChange.emit({ value: nextValue });
  }

  @Listen('keydown')
  handleKeyDown(ev: KeyboardEvent) {
    const tabs = this.getEnabledTabs();
    if (tabs.length === 0) return;
    const active = this.getFocusedTab();
    const currentIndex = active
      ? tabs.indexOf(active)
      : Math.max(
          0,
          tabs.findIndex(t => t.value === this.value),
        );

    switch (ev.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        ev.preventDefault();
        const nextIndex = (currentIndex + 1 + tabs.length) % tabs.length;
        this.activateTab(tabs[nextIndex]);
        return;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        ev.preventDefault();
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        this.activateTab(tabs[prevIndex]);
        return;
      }
      case 'Home': {
        ev.preventDefault();
        this.activateTab(tabs[0]);
        return;
      }
      case 'End': {
        ev.preventDefault();
        this.activateTab(tabs[tabs.length - 1]);
        return;
      }
      default:
        return;
    }
  }

  private getTabs(): HTMLMudTabElement[] {
    // Tabs from declarative slotted children live in the host's light DOM;
    // tabs from the `tabs` prop are rendered inside the shadow DOM track.
    // We aggregate both. `:scope >` is avoided because mock-doc lacks support.
    const light = Array.from(this.host.children).filter(el => el.tagName === 'MUD-TAB') as HTMLMudTabElement[];
    const shadow = this.host.shadowRoot
      ? (Array.from(this.host.shadowRoot.querySelectorAll('mud-tab')) as HTMLMudTabElement[])
      : [];
    return [...light, ...shadow];
  }

  private getEnabledTabs(): HTMLMudTabElement[] {
    return this.getTabs().filter(t => !t.disabled);
  }

  private getFocusedTab(): HTMLMudTabElement | null {
    const focused = (this.host.ownerDocument?.activeElement ?? null) as HTMLElement | null;
    if (!focused) return null;
    if (focused.tagName === 'MUD-TAB' && focused.parentElement === this.host) {
      return focused as HTMLMudTabElement;
    }
    return null;
  }

  private activateTab(tab: HTMLMudTabElement | undefined) {
    if (!tab) return;
    if (tab.disabled) return;
    // Move focus + selection per ARIA tabs "automatic activation" mode.
    tab.focus();
    if (this.value !== tab.value) {
      this.value = tab.value;
      this.mudChange.emit({ value: tab.value });
    }
  }

  private syncSelectionToTabs() {
    const tabs = this.getTabs();
    if (tabs.length === 0) return;

    // If no value is set, default to the first enabled tab.
    if (this.value === undefined || this.value === null || this.value === '') {
      const first = tabs.find(t => !t.disabled);
      if (first) {
        this.value = first.value;
      }
    }

    tabs.forEach(tab => {
      const isSelected = tab.value === this.value && !tab.disabled;
      tab.selected = isSelected;
      tab.size = this.size;
      // Ensure each tab has a tabindex consistent with the ARIA tabs pattern:
      // selected = 0, others = -1. Disabled tabs are out of the order.
      const tabIndex = tab.disabled ? -1 : isSelected ? 0 : -1;
      tab.setAttribute('tabindex', String(tabIndex));
      // The tab points at its panel via aria-controls (handled in syncPanels).
    });
  }

  private syncPanels() {
    // Use `host.children` instead of `:scope >` for mock-doc compatibility.
    const panels = Array.from(this.host.children).filter(el => {
      const slot = el.getAttribute('slot');
      return typeof slot === 'string' && slot.startsWith('panel-');
    }) as HTMLElement[];
    const tabs = this.getTabs();

    // Track which named slots need to be projected so the render() pass
    // exposes a matching `<slot name="panel-{value}">` in the shadow DOM.
    const slotNames = panels.map(p => p.getAttribute('slot') ?? '').filter(Boolean);
    const prev = this.projectedPanelSlots;
    const changed = slotNames.length !== prev.length || slotNames.some((name, i) => name !== prev[i]);
    if (changed) {
      this.projectedPanelSlots = slotNames;
    }

    panels.forEach(panel => {
      const slot = panel.getAttribute('slot') ?? '';
      const value = slot.replace(/^panel-/, '');
      const matchingTab = tabs.find(t => t.value === value);
      const isActive = value === this.value;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('tabindex', '0');
      if (matchingTab) {
        // Make sure the tab has a stable id, then point the panel at it.
        if (!matchingTab.id) {
          matchingTab.id = `${this.groupId}-tab-${value}`;
        }
        panel.setAttribute('aria-labelledby', matchingTab.id);
        // Cross-link aria-controls back from the tab to the panel.
        if (!panel.id) {
          panel.id = `${this.groupId}-panel-${value}`;
        }
        matchingTab.setAttribute('aria-controls', panel.id);
        matchingTab.panelId = panel.id;
      }
      panel.hidden = !isActive;
    });
  }

  private observeChildren() {
    // Newly inserted <mud-tab> or panel children must be wired up. Cheap
    // attribute filter avoids reacting to every label change.
    // mock-doc (used by `@stencil/vitest`) does not implement
    // MutationObserver — degrade gracefully when it is missing.
    if (typeof MutationObserver === 'undefined') return;
    this.mutationObserver = new MutationObserver(() => {
      this.syncSelectionToTabs();
      this.syncPanels();
      this.measureOverflow();
    });
    this.mutationObserver.observe(this.host, {
      childList: true,
      subtree: false,
      attributes: true,
      attributeFilter: ['disabled', 'value'],
    });
  }

  private observeOverflow() {
    const el = this.scrollerEl;
    if (!el) return;
    this.measureOverflow();
    // mock-doc (used by `@stencil/vitest`) does not implement ResizeObserver.
    // The overflow chevrons are pure visual affordances, so we degrade
    // gracefully when the API is missing.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.measureOverflow());
      this.resizeObserver.observe(el);
    }
    el.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  private measureOverflow = () => {
    const el = this.scrollerEl;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth > 1;
    this.hasOverflow = overflow;
    this.updateScrollAffordances();
  };

  private handleScroll = () => {
    if (this.scrollRafId !== undefined) cancelAnimationFrame(this.scrollRafId);
    this.scrollRafId = requestAnimationFrame(() => {
      this.updateScrollAffordances();
    });
  };

  private updateScrollAffordances() {
    const el = this.scrollerEl;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft;
    this.canScrollStart = left > 1;
    this.canScrollEnd = left < max - 1;
  }

  private scrollByDirection = (direction: 'start' | 'end') => () => {
    const el = this.scrollerEl;
    if (!el) return;
    const delta = el.clientWidth * 0.75 * (direction === 'end' ? 1 : -1);
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  private setScrollerRef = (el?: HTMLDivElement) => {
    this.scrollerEl = el;
  };

  private renderDataTabs() {
    if (!this.tabs || this.tabs.length === 0) return null;
    return this.tabs.map(descriptor => (
      <mud-tab
        key={descriptor.value}
        value={descriptor.value}
        label={descriptor.label}
        iconName={descriptor.iconName}
        badgeCount={descriptor.badgeCount}
        disabled={Boolean(descriptor.disabled)}
        size={this.size}
      ></mud-tab>
    ));
  }

  render() {
    const showStartChevron = this.hasOverflow && this.canScrollStart;
    const showEndChevron = this.hasOverflow && this.canScrollEnd;

    return (
      <Host
        class={{
          'has-overflow': this.hasOverflow,
          'can-scroll-start': this.canScrollStart,
          'can-scroll-end': this.canScrollEnd,
        }}
      >
        <button
          type="button"
          class="chevron chevron--start"
          part="chevron-start"
          aria-hidden="true"
          tabindex="-1"
          hidden={!showStartChevron}
          onClick={this.scrollByDirection('start')}
        >
          <mud-icon name="chevron-left" size={20}></mud-icon>
        </button>
        <div class="scroller" part="scroller" ref={this.setScrollerRef}>
          {/*
            role="tablist" lives here — not on the host — so that both
            slotted (light-DOM) and data-driven (shadow-DOM) <mud-tab role="tab">
            elements are DOM-owned children of the tablist in the flat
            accessibility tree. Placing the role on the host would leave
            axe-core unable to find owned tab children in data-driven mode
            (they live in shadow DOM, not the host's light DOM), triggering
            aria-required-children violations.
          */}
          <div
            class="track"
            part="track"
            role="tablist"
            aria-label={this.resolvedAriaLabel || undefined}
            aria-labelledby={this.resolvedAriaLabelledby || undefined}
            aria-orientation="horizontal"
          >
            <slot></slot>
            {this.renderDataTabs()}
          </div>
        </div>
        <button
          type="button"
          class="chevron chevron--end"
          part="chevron-end"
          aria-hidden="true"
          tabindex="-1"
          hidden={!showEndChevron}
          onClick={this.scrollByDirection('end')}
        >
          <mud-icon name="chevron-right" size={20}></mud-icon>
        </button>
        <div class="panels" part="panels">
          {/* Render one passthrough slot per discovered light-DOM panel.
              Covers both modes: data-driven (consumer slots <div
              slot="panel-{value}">) and declarative (same shape). The
              `projectedPanelSlots` state is repopulated from light DOM
              inside `syncPanels()` after every render + mutation. */}
          {this.projectedPanelSlots.map(slotName => (
            <slot key={`slot-${slotName}`} name={slotName}></slot>
          ))}
          {/* Fallback for any panel inserted between renders — paired with
              the MutationObserver that re-triggers `syncPanels()`. */}
          {this.tabs?.map(descriptor => (
            <slot key={`slot-data-${descriptor.value}`} name={`panel-${descriptor.value}`}></slot>
          ))}
        </div>
      </Host>
    );
  }
}
