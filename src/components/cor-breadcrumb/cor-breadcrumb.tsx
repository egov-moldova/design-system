import { Component, Element, Event, EventEmitter, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import type { BreadcrumbItem, BreadcrumbSelectDetail } from './cor-breadcrumb.types';

/**
 * Breadcrumb — navigational trail showing the user's location in the site hierarchy.
 *
 * Two equivalent authoring modes:
 *
 * 1. **Prop-driven** (preferred for dynamic data): pass `items` as a typed array.
 * 2. **Slot-driven** (preferred for static markup): nest `<cor-breadcrumb-item>` children.
 *
 * When both are present, the `items` prop wins.
 *
 * On desktop the full trail renders horizontally. When `maxVisible` is exceeded,
 * intermediate crumbs collapse into an overflow "…" menu. On mobile (≤640px) with
 * `responsive=true`, the trail collapses to a single "‹ Back to {parent}" link
 * per the WAI-ARIA breadcrumb pattern and Figma 69:408.
 *
 * @element cor-breadcrumb
 *
 * @slot - (default) Nested `<cor-breadcrumb-item>` elements (ignored when `items` is set).
 * @slot separator - Custom separator content rendered between crumbs (default: chevron icon).
 */
@Component({
  tag: 'cor-breadcrumb',
  styleUrl: 'cor-breadcrumb.css',
  shadow: true,
})
export class CorBreadcrumb {
  /**
   * Declarative crumb list. Each item renders as a `cor-breadcrumb-item`.
   * When omitted, the component falls back to its default slot.
   */
  @Prop() items?: BreadcrumbItem[];

  /**
   * Maximum number of crumbs shown before collapsing the middle into an overflow menu.
   * Best practice (per Figma): 4–5. The first and last 2 are always visible.
   * @default 5
   */
  @Prop() maxVisible: number = 5;

  /**
   * Separator character or short string rendered between crumbs.
   * Ignored when the `separator` slot is filled.
   * @default '/'
   */
  @Prop() separator: string = '/';

  /**
   * When true, the component collapses to a single "back" link on viewports ≤640px.
   * Disable for surfaces that need the full trail at every size (rare).
   * @default true
   */
  @Prop() responsive: boolean = true;

  /**
   * Accessible name for the navigation landmark. Defaults to "Breadcrumb".
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Element() host!: HTMLElement;

  @State() private menuOpen: boolean = false;
  @State() private customSeparatorHtml: string = '';

  /** Emits when any crumb is activated (click or keyboard). */
  @Event({ bubbles: true, composed: true }) corSelect!: EventEmitter<BreadcrumbSelectDetail>;

  @Watch('maxVisible')
  validateMaxVisible(newValue: number): void {
    if (!Number.isFinite(newValue) || newValue < 2) {
      console.warn(`[cor-breadcrumb] maxVisible must be >= 2 (got ${String(newValue)}). Coercing to 2.`);
      this.maxVisible = 2;
    }
  }

  /** Close the overflow menu when a click lands outside it. */
  @Listen('click', { target: 'window' })
  handleOutsideClick(ev: MouseEvent): void {
    if (!this.menuOpen) return;
    const path = ev.composedPath();
    if (!path.includes(this.host)) this.menuOpen = false;
  }

  /** Escape closes the overflow menu and returns focus to the trigger. */
  @Listen('keydown')
  handleKeyDown(ev: KeyboardEvent): void {
    if (!this.menuOpen || ev.key !== 'Escape') return;
    ev.stopPropagation();
    this.menuOpen = false;
    const trigger = this.host.shadowRoot?.querySelector<HTMLButtonElement>('.overflow-trigger');
    trigger?.focus();
  }

  private readonly toggleMenu = (ev?: MouseEvent) => {
    ev?.stopPropagation();
    this.menuOpen = !this.menuOpen;
  };

  /**
   * Capture the consumer-provided separator slot content once on connect
   * so we can replicate it between every crumb. The slot element itself
   * can only project content once, so we serialise to HTML and re-render
   * via innerHTML per separator. Falls back to the chevron icon when no
   * separator slot is provided.
   */
  componentWillLoad(): void {
    this.captureSeparatorSlot();
  }

  private captureSeparatorSlot(): void {
    const slotted = Array.from(this.host.children).filter(el => el.getAttribute('slot') === 'separator');
    if (slotted.length === 0) return;
    this.customSeparatorHtml = slotted.map(el => el.outerHTML).join('');
  }

  private readonly handleCrumbClick = (ev: MouseEvent, item: BreadcrumbItem, index: number, fromOverflow: boolean) => {
    if (item.disabled || item.loading || item.active) {
      ev.preventDefault();
      return;
    }
    const dispatched = this.corSelect.emit({
      index,
      label: item.label,
      href: item.href,
      fromOverflow,
    });
    if (dispatched.defaultPrevented) ev.preventDefault();
    if (fromOverflow) this.menuOpen = false;
  };

  private renderSeparator(key?: string) {
    if (this.customSeparatorHtml) {
      return <li class="separator" aria-hidden="true" key={key} innerHTML={this.customSeparatorHtml}></li>;
    }
    return (
      <li class="separator" aria-hidden="true" key={key}>
        <cor-icon name="chevron-right-small" size={16} color="icon-base-tertiary"></cor-icon>
      </li>
    );
  }

  private renderCrumb(item: BreadcrumbItem, index: number, fromOverflow: boolean) {
    const isLink = !!item.href && !item.active && !item.disabled && !item.loading;
    const labelClasses = {
      'crumb': true,
      'crumb--active': !!item.active,
      'crumb--visited': !!item.visited,
      'crumb--disabled': !!item.disabled,
      'crumb--loading': !!item.loading,
      'crumb--link': isLink,
    };
    const inner = item.loading ? <cor-spinner size="xs" variant="dark" label="Loading"></cor-spinner> : item.label;
    if (isLink) {
      return (
        <a
          class={labelClasses}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          onClick={ev => this.handleCrumbClick(ev, item, index, fromOverflow)}
        >
          {inner}
        </a>
      );
    }
    return (
      <span
        class={labelClasses}
        aria-current={item.active ? 'page' : undefined}
        aria-disabled={item.disabled ? 'true' : undefined}
        aria-busy={item.loading ? 'true' : undefined}
        tabindex={item.disabled || item.active ? -1 : 0}
        onClick={ev => this.handleCrumbClick(ev, item, index, fromOverflow)}
      >
        {inner}
      </span>
    );
  }

  private renderDesktop(items: BreadcrumbItem[]) {
    const limit = Math.max(2, this.maxVisible);
    const shouldCollapse = items.length > limit;
    if (!shouldCollapse) {
      // Linear render
      return (
        <ol class="trail">
          {items.flatMap((item, index) => {
            const node = (
              <li class="crumb-item" key={`crumb-${String(index)}`}>
                {this.renderCrumb(item, index, false)}
              </li>
            );
            const isLast = index === items.length - 1;
            return isLast ? [node] : [node, this.renderSeparator()];
          })}
        </ol>
      );
    }
    // Overflow render: first item + "…" + last 2 (including active)
    const first = items[0];
    const lastTwo = items.slice(-2);
    const hiddenItems = items.slice(1, -2);
    return (
      <ol class="trail">
        <li class="crumb-item" key="crumb-first">
          {this.renderCrumb(first, 0, false)}
        </li>
        {this.renderSeparator()}
        <li class="crumb-item crumb-item--overflow">
          <button
            type="button"
            class="overflow-trigger"
            aria-label="Show collapsed pages"
            aria-haspopup="menu"
            aria-expanded={this.menuOpen ? 'true' : 'false'}
            onClick={this.toggleMenu}
          >
            …
          </button>
          {this.menuOpen && (
            <ul class="overflow-menu" role="menu">
              {hiddenItems.map((item, hiddenIdx) => {
                const realIdx = hiddenIdx + 1;
                return (
                  <li role="none" key={`overflow-${String(realIdx)}`}>
                    {item.href ? (
                      <a
                        role="menuitem"
                        class="overflow-menu-item"
                        href={item.href}
                        onClick={ev => this.handleCrumbClick(ev, item, realIdx, true)}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        class="overflow-menu-item"
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
        {this.renderSeparator()}
        {lastTwo.flatMap((item, lastIdx) => {
          const realIdx = items.length - lastTwo.length + lastIdx;
          const node = (
            <li class="crumb-item" key={`crumb-${String(realIdx)}`}>
              {this.renderCrumb(item, realIdx, false)}
            </li>
          );
          const isLast = lastIdx === lastTwo.length - 1;
          return isLast ? [node] : [node, this.renderSeparator()];
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
              <cor-icon name="chevron-left-small" size={20} color="icon-base-tertiary"></cor-icon>
              <span>{parent.label}</span>
            </a>
          ) : (
            <button type="button" class="back-link back-link--button" onClick={handleClick}>
              <cor-icon name="chevron-left-small" size={20} color="icon-base-tertiary"></cor-icon>
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
      <Host role="navigation" aria-label={this.ariaLabel ?? 'Breadcrumb'}>
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
