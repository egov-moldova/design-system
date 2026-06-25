import { Component, Element, Event, EventEmitter, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import { isOverflow } from './mud-pagination.types';
import type {
  OverflowKey,
  PaginationChangeDetail,
  PaginationOverflowSlot,
  PaginationSize,
  PaginationSlot,
} from './mud-pagination.types';

/**
 * Pagination — navigation control for paged content.
 *
 * Renders a list of page-number buttons flanked by Previous / Next controls.
 * The visible page list is computed from `currentPage`, `totalPages`,
 * `siblingCount`, and `boundaryCount`. When the total exceeds the visible
 * window, an interactive overflow button (`…`) collapses the skipped range
 * and lets users jump directly to any of those pages via a dropdown menu
 * (Figma "overflow-active" interaction). When the collapsed range is large
 * (e.g. page 1 of 40 hides ~34 pages), the dropdown caps its height and
 * scrolls internally instead of running off the viewport.
 *
 * The component is internally controlled but exposes a `mudChange` event so
 * the host can drive the active page. Updating `current-page` from outside
 * is also honoured (e.g. when the URL changes via routing).
 *
 * Previous / Next buttons are hidden at the boundaries (page 1 hides Prev,
 * the last page hides Next) instead of being rendered in a disabled state —
 * this matches the Figma "first-page" / "last-page" specification.
 *
 * @element mud-pagination
 *
 * @slot prev-icon - Optional icon override for the Previous button.
 *                   Defaults to a left chevron sized for the current rung.
 * @slot next-icon - Optional icon override for the Next button.
 *                   Defaults to a right chevron.
 */
@Component({
  tag: 'mud-pagination',
  styleUrl: 'mud-pagination.css',
  shadow: true,
})
export class MudPagination {
  /**
   * Visual size rung. Mobile breakpoints typically use `sm` (32px) and
   * desktop uses `md` (40px).
   * @default 'md'
   */
  @Prop({ reflect: true }) size: PaginationSize = 'md';

  /**
   * The active page (1-indexed). Mutable so consumers can two-way bind.
   * @default 1
   */
  @Prop({ mutable: true, reflect: true, attribute: 'current-page' }) currentPage: number = 1;

  /**
   * Total number of pages. When `<= 1` the component renders nothing.
   * @default 1
   */
  @Prop({ reflect: true, attribute: 'total-pages' }) totalPages: number = 1;

  /**
   * Number of page buttons shown on each side of the active page.
   * @default 1
   */
  @Prop({ attribute: 'sibling-count' }) siblingCount: number = 1;

  /**
   * Number of page buttons shown at the start and end of the range
   * (before / after the leading / trailing ellipsis).
   * @default 1
   */
  @Prop({ attribute: 'boundary-count' }) boundaryCount: number = 1;

  /**
   * Whether to render the Previous / Next navigation buttons at all. When
   * `true` (default) they still hide individually at the corresponding
   * boundary (page 1 hides Prev, last page hides Next).
   * @default true
   */
  @Prop({ attribute: 'show-prev-next' }) showPrevNext: boolean = true;

  /**
   * Visible label for the Previous button (desktop only — hidden on `sm`).
   * @default 'Anterior'
   */
  @Prop({ attribute: 'prev-label' }) prevLabel: string = 'Anterior';

  /**
   * Visible label for the Next button (desktop only — hidden on `sm`).
   * @default 'Următor'
   */
  @Prop({ attribute: 'next-label' }) nextLabel: string = 'Următor';

  /**
   * Accessible name for the navigation landmark when no `aria-label` is set on
   * the host. Defaults to "Navigare pagini". Setting `aria-label` directly on
   * the host also works — the consumer-supplied attribute wins and is captured
   * on connect into `resolvedAriaLabel`, then stripped from the host to avoid
   * Stencil's attribute-observer / render-loop antipattern (same pattern as
   * mud-radio / mud-switch / mud-tooltip / mud-accordion / mud-breadcrumb /
   * mud-date-picker / mud-modal).
   */
  @Prop() label?: string;

  /**
   * Accessible label template for the Previous button. The `{page}` token is
   * replaced with the target page number.
   * @default 'Pagina anterioară, mergi la pagina {page}'
   */
  @Prop({ attribute: 'prev-aria-label' }) prevAriaLabel: string = 'Pagina anterioară, mergi la pagina {page}';

  /**
   * Accessible label template for the Next button. The `{page}` token is
   * replaced with the target page number.
   * @default 'Pagina următoare, mergi la pagina {page}'
   */
  @Prop({ attribute: 'next-aria-label' }) nextAriaLabel: string = 'Pagina următoare, mergi la pagina {page}';

  /**
   * Accessible label template for an individual page button. Tokens `{page}`
   * and `{total}` are substituted with the page number and total page count.
   * @default 'Pagina {page} din {total}'
   */
  @Prop({ attribute: 'page-aria-label' }) pageAriaLabel: string = 'Pagina {page} din {total}';

  /**
   * Accessible label template for the overflow ("…") button. The `{from}`
   * and `{to}` tokens are replaced with the first and last page in the
   * collapsed range.
   * @default 'Arată paginile de la {from} la {to}'
   */
  @Prop({ attribute: 'overflow-aria-label' }) overflowAriaLabel: string = 'Arată paginile de la {from} la {to}';

  @State() private hasPrevIcon: boolean = false;
  @State() private hasNextIcon: boolean = false;
  @State() private resolvedAriaLabel: string = 'Navigare pagini';
  @State() private openOverflow: OverflowKey | null = null;
  @State() private focusedOverflowIndex: number = -1;

  @Element() host!: HTMLMudPaginationElement;

  /**
   * Fires when the user activates a different page via click on a numbered
   * button, the Previous / Next controls, or a page in the overflow dropdown.
   * Carries the new and previous page numbers so consumers can drive routing
   * or data fetches.
   */
  @Event() mudChange!: EventEmitter<PaginationChangeDetail>;

  @Watch('label')
  protected syncLabel(next?: string): void {
    if (next && next.length > 0) this.resolvedAriaLabel = next;
  }

  @Watch('currentPage')
  protected onCurrentPageChange(newValue: number) {
    const clamped = this.clampPage(newValue);
    if (clamped !== newValue) {
      this.currentPage = clamped;
    }
    this.closeOverflow();
  }

  @Watch('totalPages')
  protected onTotalPagesChange() {
    const clamped = this.clampPage(this.currentPage);
    if (clamped !== this.currentPage) {
      this.currentPage = clamped;
    }
    this.closeOverflow();
  }

  /** Close the overflow dropdown when a click lands outside the component. */
  @Listen('click', { target: 'window' })
  handleOutsideClick(ev: MouseEvent): void {
    if (this.openOverflow === null) return;
    const path = ev.composedPath();
    if (!path.includes(this.host)) {
      this.closeOverflow();
    }
  }

  /** Keyboard support on the open overflow dropdown. */
  @Listen('keydown')
  handleKeyDown(ev: KeyboardEvent): void {
    if (this.openOverflow === null) return;
    const items = this.getOpenOverflowPages();
    switch (ev.key) {
      case 'Escape': {
        ev.stopPropagation();
        const key = this.openOverflow;
        this.closeOverflow();
        this.focusOverflowTrigger(key);
        return;
      }
      case 'ArrowDown': {
        ev.preventDefault();
        if (items.length === 0) return;
        this.focusedOverflowIndex = (this.focusedOverflowIndex + 1) % items.length;
        return;
      }
      case 'ArrowUp': {
        ev.preventDefault();
        if (items.length === 0) return;
        this.focusedOverflowIndex = this.focusedOverflowIndex <= 0 ? items.length - 1 : this.focusedOverflowIndex - 1;
        return;
      }
      case 'Home': {
        ev.preventDefault();
        if (items.length > 0) this.focusedOverflowIndex = 0;
        return;
      }
      case 'End': {
        ev.preventDefault();
        if (items.length > 0) this.focusedOverflowIndex = items.length - 1;
        return;
      }
      case 'Tab': {
        // Tabbing out closes the dropdown and lets focus continue naturally.
        this.closeOverflow();
        return;
      }
      default:
        return;
    }
  }

  componentWillLoad() {
    this.captureAriaLabel();
    // Clamp initial values defensively (consumers may pass garbage props).
    this.currentPage = this.clampPage(this.currentPage);
  }

  componentDidUpdate() {
    // Reflect the AI-managed focus index onto the actual DOM after each render.
    if (this.openOverflow === null || this.focusedOverflowIndex < 0) return;
    const root = this.host.shadowRoot;
    if (!root) return;
    const items = root.querySelectorAll<HTMLButtonElement>('.overflow-menu-item');
    items[this.focusedOverflowIndex]?.focus();
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

  private clampPage(page: number): number {
    if (!Number.isFinite(page)) return 1;
    const total = Math.max(1, Math.floor(this.totalPages));
    return Math.min(Math.max(1, Math.floor(page)), total);
  }

  private goToPage = (target: number) => {
    const next = this.clampPage(target);
    if (next === this.currentPage) return;
    const previousPage = this.currentPage;
    this.currentPage = next;
    this.mudChange.emit({ page: next, previousPage });
  };

  private onPageClick = (page: number) => (ev: MouseEvent) => {
    ev.preventDefault();
    this.goToPage(page);
  };

  private onPrevClick = (ev: MouseEvent) => {
    ev.preventDefault();
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  };

  private onNextClick = (ev: MouseEvent) => {
    ev.preventDefault();
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
  };

  private onPrevIconSlotChange = (ev: Event) => {
    this.hasPrevIcon = this.slotHasContent(ev);
  };

  private onNextIconSlotChange = (ev: Event) => {
    this.hasNextIcon = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedElements({ flatten: true }).length > 0;
  }

  private closeOverflow(): void {
    if (this.openOverflow === null && this.focusedOverflowIndex === -1) return;
    this.openOverflow = null;
    this.focusedOverflowIndex = -1;
  }

  private toggleOverflow(key: OverflowKey): void {
    if (this.openOverflow === key) {
      this.closeOverflow();
    } else {
      this.openOverflow = key;
      this.focusedOverflowIndex = -1;
    }
  }

  private focusOverflowTrigger(key: OverflowKey): void {
    const root = this.host.shadowRoot;
    if (!root) return;
    root.querySelector<HTMLButtonElement>(`.overflow-trigger[data-key="${key}"]`)?.focus();
  }

  private getOpenOverflowPages(): number[] {
    if (this.openOverflow === null) return [];
    const slots = this.computeRange();
    const match = slots.find((s): s is PaginationOverflowSlot => isOverflow(s) && s.key === this.openOverflow);
    return match?.pages ?? [];
  }

  /**
   * Compute the visible slot list. Returns up to ~7 slots including overflow
   * placeholders. Each overflow slot carries the contiguous list of pages it
   * collapses so the dropdown can offer them as jump targets.
   *
   * Mirrors the Figma "Pagination Logic" rules:
   * - Always show first and last page (boundary-count).
   * - Show `siblingCount` pages on each side of `currentPage`.
   * - Insert an overflow when the gap between boundaries and siblings is `>= 2`;
   *   if the gap is exactly `1`, render the actual page number instead.
   */
  private computeRange(): PaginationSlot[] {
    const total = Math.max(1, Math.floor(this.totalPages));
    const current = this.clampPage(this.currentPage);
    const siblings = Math.max(0, Math.floor(this.siblingCount));
    const boundary = Math.max(0, Math.floor(this.boundaryCount));

    // If we can fit every page within the soft cap, return them all.
    // The cap is (boundary*2 + siblings*2 + 3) — boundaries + siblings on
    // each side + current + 2 ellipsis slots.
    const totalNumbers = boundary * 2 + siblings * 2 + 3;
    if (totalNumbers >= total) {
      return Array.from({ length: total }, (_v, i) => i + 1);
    }

    const startPages = range(1, Math.min(boundary, total));
    const endPages = range(Math.max(total - boundary + 1, boundary + 1), total);

    const siblingsStart = Math.max(Math.min(current - siblings, total - boundary - siblings * 2 - 1), boundary + 2);
    const siblingsEnd = Math.min(
      Math.max(current + siblings, boundary + siblings * 2 + 2),
      endPages.length > 0 ? endPages[0] - 2 : total - 1,
    );

    const leadingGapPages = range(boundary + 1, siblingsStart - 1);
    const trailingGapPages = range(siblingsEnd + 1, total - boundary);

    const leading: PaginationSlot[] =
      siblingsStart > boundary + 2
        ? [{ type: 'ellipsis', key: 'leading', pages: leadingGapPages }]
        : boundary + 1 < total - boundary
          ? [boundary + 1]
          : [];

    const trailing: PaginationSlot[] =
      siblingsEnd < total - boundary - 1
        ? [{ type: 'ellipsis', key: 'trailing', pages: trailingGapPages }]
        : total - boundary > boundary
          ? [total - boundary]
          : [];

    return [...startPages, ...leading, ...range(siblingsStart, siblingsEnd), ...trailing, ...endPages];
  }

  private formatLabel(template: string, values: Record<string, string | number>): string {
    return Object.entries(values).reduce((acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)), template);
  }

  private renderPageItem(page: number) {
    const isSelected = page === this.currentPage;
    const ariaLabel = this.formatLabel(this.pageAriaLabel, { page, total: this.totalPages });
    return (
      <li class="item">
        <button
          type="button"
          class={{ 'page-button': true, 'is-selected': isSelected }}
          aria-label={ariaLabel}
          aria-current={isSelected ? 'page' : null}
          onClick={this.onPageClick(page)}
        >
          {page}
        </button>
      </li>
    );
  }

  private renderOverflow(slot: PaginationOverflowSlot) {
    const isOpen = this.openOverflow === slot.key;
    const from = slot.pages[0] ?? this.currentPage;
    const to = slot.pages[slot.pages.length - 1] ?? this.currentPage;
    const triggerLabel = this.formatLabel(this.overflowAriaLabel, { from, to });
    return (
      <li class={{ 'item': true, 'overflow-item': true, 'is-open': isOpen }} key={`overflow-${slot.key}`}>
        <button
          type="button"
          class="overflow-trigger"
          data-key={slot.key}
          aria-haspopup="menu"
          aria-expanded={isOpen ? 'true' : 'false'}
          aria-label={triggerLabel}
          onClick={(ev: MouseEvent) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.toggleOverflow(slot.key);
          }}
        >
          <span aria-hidden="true">…</span>
        </button>
        {isOpen ? (
          <ul class="overflow-menu" role="menu">
            {slot.pages.map((page, index) => {
              const ariaLabel = this.formatLabel(this.pageAriaLabel, { page, total: this.totalPages });
              return (
                <li role="none" key={`overflow-${slot.key}-${page}`}>
                  <button
                    type="button"
                    class="overflow-menu-item"
                    role="menuitem"
                    tabIndex={this.focusedOverflowIndex === index ? 0 : -1}
                    aria-label={ariaLabel}
                    onClick={(ev: MouseEvent) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      const key = slot.key;
                      this.closeOverflow();
                      this.goToPage(page);
                      // Restore focus to the closed trigger so keyboard users
                      // can continue navigating.
                      requestAnimationFrame(() => this.focusOverflowTrigger(key));
                    }}
                  >
                    {page}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </li>
    );
  }

  private renderPrev() {
    if (!this.showPrevNext) return null;
    // Per Figma "first-page" spec: hide rather than disable when on page 1.
    if (this.currentPage <= 1) return null;
    const targetPage = this.currentPage - 1;
    const ariaLabel = this.formatLabel(this.prevAriaLabel, { page: targetPage });
    return (
      <button
        type="button"
        class={{ 'nav-button': true, 'nav-prev': true }}
        aria-label={ariaLabel}
        onClick={this.onPrevClick}
      >
        <span class="nav-icon">
          <slot name="prev-icon" onSlotchange={this.onPrevIconSlotChange} />
          {!this.hasPrevIcon ? <mud-icon name="chevron-left" size={this.size === 'sm' ? 16 : 20} /> : null}
        </span>
        <span class="nav-label">{this.prevLabel}</span>
      </button>
    );
  }

  private renderNext() {
    if (!this.showPrevNext) return null;
    // Per Figma "last-page" spec: hide rather than disable when on last page.
    if (this.currentPage >= this.totalPages) return null;
    const targetPage = this.currentPage + 1;
    const ariaLabel = this.formatLabel(this.nextAriaLabel, { page: targetPage });
    return (
      <button
        type="button"
        class={{ 'nav-button': true, 'nav-next': true }}
        aria-label={ariaLabel}
        onClick={this.onNextClick}
      >
        <span class="nav-label">{this.nextLabel}</span>
        <span class="nav-icon">
          <slot name="next-icon" onSlotchange={this.onNextIconSlotChange} />
          {!this.hasNextIcon ? <mud-icon name="chevron-right" size={this.size === 'sm' ? 16 : 20} /> : null}
        </span>
      </button>
    );
  }

  render() {
    // Hide entirely when there are no real pages to navigate.
    if (this.totalPages <= 1) {
      return <Host aria-hidden="true" />;
    }

    const slots = this.computeRange();

    return (
      <Host>
        <nav class="root" aria-label={this.resolvedAriaLabel}>
          {this.renderPrev()}
          <ul class="pages" role="list">
            {slots.map(slot => (isOverflow(slot) ? this.renderOverflow(slot) : this.renderPageItem(slot)))}
          </ul>
          {this.renderNext()}
        </nav>
      </Host>
    );
  }
}

function range(start: number, end: number): number[] {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_v, i) => start + i);
}
