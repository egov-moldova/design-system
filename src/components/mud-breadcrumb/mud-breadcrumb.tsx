import { Component, Element, Event, EventEmitter, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import type { BreadcrumbItem, BreadcrumbSelectDetail } from './mud-breadcrumb.types';
import { BREADCRUMB_TRUNCATE_AT } from './mud-breadcrumb.types';

/**
 * Breadcrumb — navigational trail showing the user's location in the site hierarchy.
 *
 * Two equivalent authoring modes:
 *
 * 1. **Prop-driven** (preferred for dynamic data): pass `items` as a typed array.
 * 2. **Slot-driven** (preferred for static markup): nest `<mud-breadcrumb-item>` children.
 *
 * When both are present, the `items` prop wins.
 *
 * On desktop the full trail renders horizontally. When `maxVisible` is exceeded,
 * intermediate crumbs collapse into an overflow "…" menu. On mobile (≤640px) with
 * `responsive=true`, the trail collapses to a single "‹ Back to {parent}" link
 * per the WAI-ARIA breadcrumb pattern and Figma 69:408.
 *
 * @element mud-breadcrumb
 *
 * @slot - (default) Nested `<mud-breadcrumb-item>` elements (ignored when `items` is set).
 * @slot separator - Custom separator content rendered between crumbs (default: chevron icon).
 */
@Component({
  tag: 'mud-breadcrumb',
  styleUrl: 'mud-breadcrumb.css',
  shadow: true,
})
export class MudBreadcrumb {
  /**
   * Declarative crumb list. Each item renders as a `mud-breadcrumb-item`.
   * When omitted, the component falls back to its default slot.
   */
  @Prop() items?: BreadcrumbItem[];

  /**
   * Maximum number of crumbs shown before collapsing the middle into an overflow menu.
   * Per Figma "Best Practices": limit visible items to 4. The first and last 2 are
   * always visible; everything between collapses into the `…` menu.
   * @default 4
   */
  @Prop() maxVisible: number = 4;

  /**
   * Override the default chevron separator with a literal string (e.g. `"/"`, `"›"`).
   * When empty (default), the chevron icon is rendered. When `slot="separator"` is
   * provided, both this prop and the chevron are ignored.
   * @default ''
   */
  @Prop() separator: string = '';

  /**
   * When true, the component collapses to a single "back" link on viewports ≤640px.
   * Disable for surfaces that need the full trail at every size (rare).
   * @default true
   */
  @Prop() responsive: boolean = true;

  /**
   * Accessible name for the navigation landmark when no `aria-label` is set on the
   * host. Defaults to "Breadcrumb". Setting `aria-label` directly on the host also
   * works — the consumer-supplied attribute wins.
   */
  @Prop() label?: string;

  @Element() host!: HTMLMudBreadcrumbElement;

  @State() private menuOpen: boolean = false;
  @State() private focusedMenuIndex: number = -1;
  @State() private resolvedAriaLabel: string = 'Breadcrumb';
  /** Cached clone source captured from `slot="separator"` on connect. */
  private customSeparatorTemplate?: Element;

  /** Emits when any crumb is activated (click or keyboard). */
  @Event({ bubbles: true, composed: true }) mudSelect!: EventEmitter<BreadcrumbSelectDetail>;

  @Watch('maxVisible')
  validateMaxVisible(newValue: number): void {
    if (!Number.isFinite(newValue) || newValue < 2) {
      console.warn(`[mud-breadcrumb] maxVisible must be >= 2 (got ${String(newValue)}). Coercing to 2.`);
      this.maxVisible = 2;
    }
  }

  @Watch('label')
  syncLabel(next?: string): void {
    if (next && next.length > 0) this.resolvedAriaLabel = next;
  }

  /** Close the overflow menu when a click lands outside it. */
  @Listen('click', { target: 'window' })
  handleOutsideClick(ev: MouseEvent): void {
    if (!this.menuOpen) return;
    const path = ev.composedPath();
    if (!path.includes(this.host)) {
      this.menuOpen = false;
      this.focusedMenuIndex = -1;
    }
  }

  /** Full WAI-ARIA Menu keyboard support on the overflow trigger + menu. */
  @Listen('keydown')
  handleKeyDown(ev: KeyboardEvent): void {
    if (!this.menuOpen) return;
    const items = this.getOverflowItems();
    switch (ev.key) {
      case 'Escape': {
        ev.stopPropagation();
        this.menuOpen = false;
        this.focusedMenuIndex = -1;
        const trigger = this.host.shadowRoot?.querySelector<HTMLButtonElement>('.overflow-trigger');
        trigger?.focus();
        return;
      }
      case 'ArrowDown': {
        ev.preventDefault();
        if (items.length === 0) return;
        this.focusedMenuIndex = (this.focusedMenuIndex + 1) % items.length;
        return;
      }
      case 'ArrowUp': {
        ev.preventDefault();
        if (items.length === 0) return;
        this.focusedMenuIndex = this.focusedMenuIndex <= 0 ? items.length - 1 : this.focusedMenuIndex - 1;
        return;
      }
      case 'Home': {
        ev.preventDefault();
        if (items.length > 0) this.focusedMenuIndex = 0;
        return;
      }
      case 'End': {
        ev.preventDefault();
        if (items.length > 0) this.focusedMenuIndex = items.length - 1;
        return;
      }
      case 'Tab': {
        // Close on Tab — focus moves out of the menu
        this.menuOpen = false;
        this.focusedMenuIndex = -1;
        return;
      }
      default:
        return;
    }
  }

  private readonly toggleMenu = (ev?: MouseEvent) => {
    ev?.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.focusedMenuIndex = -1;
  };

  private getOverflowItems(): HTMLElement[] {
    const root = this.host.shadowRoot;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>('.overflow-menu-item'));
  }

  /**
   * Capture consumer-supplied content on connect:
   *  - `aria-label` attribute → stripped from the host and stored as `resolvedAriaLabel`
   *    to avoid the Stencil observer/render loop (same pattern as mud-radio / mud-switch /
   *    mud-tooltip / mud-accordion).
   *  - First element with `slot="separator"` → cloned and re-used between every crumb,
   *    instead of the prior `innerHTML` round-trip (SECURITY-INNERHTML).
   */
  componentWillLoad(): void {
    this.captureAriaLabel();
    this.captureSeparatorSlot();
  }

  private captureAriaLabel(): void {
    const userLabel = this.host.getAttribute('aria-label');
    if (userLabel && userLabel.length > 0) {
      this.resolvedAriaLabel = userLabel;
      this.host.removeAttribute('aria-label');
    } else if (this.label && this.label.length > 0) {
      this.resolvedAriaLabel = this.label;
    }
  }

  private captureSeparatorSlot(): void {
    const slotted = Array.from(this.host.children).find(el => el.getAttribute('slot') === 'separator');
    if (!slotted) return;
    const clone = slotted.cloneNode(true) as HTMLElement;
    clone.removeAttribute('slot');
    this.customSeparatorTemplate = clone;
  }

  private readonly handleCrumbClick = (ev: MouseEvent, item: BreadcrumbItem, index: number, fromOverflow: boolean) => {
    if (item.disabled || item.loading || item.active) {
      ev.preventDefault();
      return;
    }
    const dispatched = this.mudSelect.emit({
      index,
      label: item.label,
      href: item.href,
      fromOverflow,
    });
    if (dispatched.defaultPrevented) ev.preventDefault();
    if (fromOverflow) {
      this.menuOpen = false;
      this.focusedMenuIndex = -1;
    }
  };

  /**
   * Ref callback that appends a fresh clone of the captured separator template.
   * Runs once per `<li>` instance because Stencil keys ensure stable nodes.
   */
  private readonly attachCustomSeparator = (el?: HTMLLIElement) => {
    if (!el || !this.customSeparatorTemplate) return;
    if (el.childNodes.length === 0) {
      el.appendChild(this.customSeparatorTemplate.cloneNode(true));
    }
  };

  private renderSeparator(key?: string) {
    if (this.customSeparatorTemplate) {
      return <li class="separator" aria-hidden="true" key={key} ref={this.attachCustomSeparator}></li>;
    }
    if (this.separator && this.separator.length > 0) {
      return (
        <li class="separator separator--text" aria-hidden="true" key={key}>
          {this.separator}
        </li>
      );
    }
    return (
      <li class="separator" aria-hidden="true" key={key}>
        <mud-icon name="chevron-right-small" size={16}></mud-icon>
      </li>
    );
  }

  /**
   * Render the crumb label, wrapping it in a tooltip when the label exceeds
   * `BREADCRUMB_TRUNCATE_AT` characters (per Figma "Best Practices"). The visible
   * text is truncated via CSS `text-overflow: ellipsis`; the tooltip exposes the
   * full label on hover/focus.
   */
  /** Builds the inner label markup (icon + text) without any tooltip wrap. */
  private renderLabelBody(item: BreadcrumbItem) {
    if (item.loading) return <mud-spinner size="xs" variant="dark" label="Loading"></mud-spinner>;
    return (
      <span class="crumb-label">
        {item.iconStart && <mud-icon class="crumb-icon-start" name={item.iconStart} size={16}></mud-icon>}
        <span class="crumb-text">{item.label}</span>
      </span>
    );
  }

  private renderCrumb(item: BreadcrumbItem, index: number, fromOverflow: boolean, isCurrent: boolean) {
    const isLink = !!item.href && !item.active && !item.disabled && !item.loading;
    const labelClasses = {
      'crumb': true,
      'crumb--active': !!item.active,
      'crumb--visited': !!item.visited,
      'crumb--disabled': !!item.disabled,
      'crumb--loading': !!item.loading,
      'crumb--link': isLink,
    };
    const inner = this.renderLabelBody(item);
    const needsTooltip = !item.loading && item.label.length > BREADCRUMB_TRUNCATE_AT;
    const crumbBody = isLink ? (
      <a
        slot={needsTooltip ? 'trigger' : undefined}
        class={labelClasses}
        href={item.href}
        aria-current={isCurrent ? 'page' : undefined}
        onClick={ev => this.handleCrumbClick(ev, item, index, fromOverflow)}
      >
        {inner}
      </a>
    ) : (
      <span
        slot={needsTooltip ? 'trigger' : undefined}
        class={labelClasses}
        aria-current={isCurrent ? 'page' : undefined}
        aria-disabled={item.disabled ? 'true' : undefined}
        aria-busy={item.loading ? 'true' : undefined}
        tabindex={item.disabled || item.active ? -1 : 0}
        onClick={ev => this.handleCrumbClick(ev, item, index, fromOverflow)}
      >
        {inner}
      </span>
    );
    if (!needsTooltip) return crumbBody;
    return (
      <mud-tooltip content={item.label} position="top">
        {crumbBody}
      </mud-tooltip>
    );
  }

  /**
   * Returns the index that should carry `aria-current="page"`. Honours an explicit
   * `active:true` flag; otherwise picks the last navigable (non-disabled) crumb so
   * the trail always has a current-page marker (legacy `mud-breadcrumbs` parity).
   */
  private resolveCurrentIndex(items: BreadcrumbItem[]): number {
    const explicit = items.findIndex(item => item.active === true);
    if (explicit !== -1) return explicit;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (!items[i].disabled && !items[i].loading) return i;
    }
    return items.length - 1;
  }

  private renderDesktop(items: BreadcrumbItem[]) {
    const limit = Math.max(2, this.maxVisible);
    const shouldCollapse = items.length > limit;
    const currentIndex = this.resolveCurrentIndex(items);
    if (!shouldCollapse) {
      // Linear render
      return (
        <ol class="trail">
          {items.flatMap((item, index) => {
            const node = (
              <li class="crumb-item" key={`crumb-${String(index)}`}>
                {this.renderCrumb(item, index, false, index === currentIndex)}
              </li>
            );
            const isLast = index === items.length - 1;
            return isLast ? [node] : [node, this.renderSeparator(`sep-${String(index)}`)];
          })}
        </ol>
      );
    }
    // Overflow render: first item + "…" + last 2 (including active)
    const first = items[0];
    const lastTwo = items.slice(-2);
    const hiddenItems = items.slice(1, -2);
    const activeDescId =
      this.menuOpen && this.focusedMenuIndex >= 0 ? `mud-bc-overflow-${String(this.focusedMenuIndex)}` : undefined;
    return (
      <ol class="trail">
        <li class="crumb-item" key="crumb-first">
          {this.renderCrumb(first, 0, false, currentIndex === 0)}
        </li>
        {this.renderSeparator('sep-first')}
        <li class="crumb-item crumb-item--overflow">
          <button
            type="button"
            class="overflow-trigger"
            aria-label="Show collapsed pages"
            aria-haspopup="menu"
            aria-expanded={this.menuOpen ? 'true' : 'false'}
            aria-activedescendant={activeDescId}
            onClick={this.toggleMenu}
          >
            …
          </button>
          {this.menuOpen && (
            <ul class="overflow-menu" role="menu">
              {hiddenItems.map((item, hiddenIdx) => {
                const realIdx = hiddenIdx + 1;
                const isFocused = hiddenIdx === this.focusedMenuIndex;
                const itemClasses = {
                  'overflow-menu-item': true,
                  'overflow-menu-item--focused': isFocused,
                };
                return (
                  <li role="none" key={`overflow-${String(realIdx)}`}>
                    {item.href ? (
                      <a
                        role="menuitem"
                        id={`mud-bc-overflow-${String(hiddenIdx)}`}
                        class={itemClasses}
                        href={item.href}
                        onClick={ev => this.handleCrumbClick(ev, item, realIdx, true)}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        id={`mud-bc-overflow-${String(hiddenIdx)}`}
                        class={itemClasses}
                        onClick={ev => this.handleCrumbClick(ev, item, realIdx, true)}
                      >
                        {item.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </li>
        {this.renderSeparator('sep-mid')}
        {lastTwo.flatMap((item, lastIdx) => {
          const realIdx = items.length - lastTwo.length + lastIdx;
          const node = (
            <li class="crumb-item" key={`crumb-${String(realIdx)}`}>
              {this.renderCrumb(item, realIdx, false, realIdx === currentIndex)}
            </li>
          );
          const isLast = lastIdx === lastTwo.length - 1;
          return isLast ? [node] : [node, this.renderSeparator(`sep-tail-${String(lastIdx)}`)];
        })}
      </ol>
    );
  }

  private renderMobile(items: BreadcrumbItem[]) {
    // Show the parent of the active item (or last navigable item) as a back link.
    const activeIdx = items.findIndex(i => i.active);
    const parentIdx = activeIdx > 0 ? activeIdx - 1 : Math.max(0, items.length - 2);
    const parent = items[parentIdx] ?? items[0];
    if (!parent) return null;
    const handleClick = (ev: MouseEvent) => this.handleCrumbClick(ev, parent, parentIdx, false);
    return (
      <ol class="trail trail--mobile">
        <li class="crumb-item crumb-item--mobile">
          {parent.href ? (
            <a class="back-link" href={parent.href} onClick={handleClick}>
              <mud-icon name="chevron-left-small" size={20}></mud-icon>
              <span>{parent.label}</span>
            </a>
          ) : (
            <button type="button" class="back-link back-link--button" onClick={handleClick}>
              <mud-icon name="chevron-left-small" size={20}></mud-icon>
              <span>{parent.label}</span>
            </button>
          )}
        </li>
      </ol>
    );
  }

  render() {
    const items = this.items;
    const useItems = Array.isArray(items) && items.length > 0;
    return (
      <Host role="navigation" aria-label={this.resolvedAriaLabel}>
        {useItems ? (
          <div class="root" data-responsive={this.responsive ? 'true' : 'false'}>
            <div class="desktop">{this.renderDesktop(items!)}</div>
            {this.responsive && <div class="mobile">{this.renderMobile(items!)}</div>}
          </div>
        ) : (
          <ol class="trail trail--slot">
            <slot />
          </ol>
        )}
      </Host>
    );
  }
}
