import { Component, Element, Event, EventEmitter, Host, Prop, State, Watch, h } from '@stencil/core';

import { ELLIPSIS } from './cor-pagination.types';
import type { PaginationChangeDetail, PaginationSize, PaginationSlot } from './cor-pagination.types';

/**
 * Pagination — navigation control for paged content.
 *
 * Renders a list of page-number buttons flanked by Previous / Next controls.
 * The visible page list is computed from `currentPage`, `totalPages`,
 * `siblingCount`, and `boundaryCount`. When the total exceeds the visible
 * window, ellipses (`...`) appear at the start and/or end of the range.
 *
 * The component is internally controlled but exposes a `corChange` event so
 * the host can drive the active page. Updating `current-page` from outside
 * is also honoured (e.g. when the URL changes via routing).
 *
 * @element cor-pagination
 *
 * @slot prev-icon - Optional icon override for the Previous button.
 *                   Defaults to a left chevron sized for the current rung.
 * @slot next-icon - Optional icon override for the Next button.
 *                   Defaults to a right chevron.
 *
 * @event corChange - Fires when the user activates a different page.
 *                    Detail: `{ page, previousPage }`.
 */
@Component({
  tag: 'cor-pagination',
  styleUrl: 'cor-pagination.css',
  shadow: true,
})
export class CorPagination {
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
   * Whether to render the Previous / Next navigation buttons.
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
   * Accessible name for the outer `<nav>` landmark.
   * @default 'Navigare pagini'
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel: string = 'Navigare pagini';

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

  @State() private hasPrevIcon: boolean = false;
  @State() private hasNextIcon: boolean = false;

  @Element() host!: HTMLCorPaginationElement;

  @Event() corChange!: EventEmitter<PaginationChangeDetail>;

  @Watch('currentPage')
  protected onCurrentPageChange(newValue: number) {
    const clamped = this.clampPage(newValue);
    if (clamped !== newValue) {
      this.currentPage = clamped;
    }
  }

  @Watch('totalPages')
  protected onTotalPagesChange() {
    const clamped = this.clampPage(this.currentPage);
    if (clamped !== this.currentPage) {
      this.currentPage = clamped;
    }
  }

  componentWillLoad() {
    // Clamp initial values defensively (consumers may pass garbage props).
    this.currentPage = this.clampPage(this.currentPage);
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
    this.corChange.emit({ page: next, previousPage });
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

  /**
   * Compute the visible slot list. Returns up to ~7 slots including ellipses.
   * Mirrors the Figma "Pagination Logic" rules:
   * - Always show first and last page (boundary-count).
   * - Show `siblingCount` pages on each side of `currentPage`.
   * - Insert `...` when the gap between boundaries and siblings is `>= 2`;
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

    const slots: PaginationSlot[] = [
      ...startPages,
      // start ellipsis or the page in between
      ...(siblingsStart > boundary + 2 ? [ELLIPSIS] : boundary + 1 < total - boundary ? [boundary + 1] : []),
      ...range(siblingsStart, siblingsEnd),
      ...(siblingsEnd < total - boundary - 1 ? [ELLIPSIS] : total - boundary > boundary ? [total - boundary] : []),
      ...endPages,
    ];

    return slots;
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

  private renderEllipsis(key: string) {
    return (
      <li class="item" key={key}>
        <span class="ellipsis" aria-hidden="true">
          …
        </span>
      </li>
    );
  }

  private renderPrev() {
    if (!this.showPrevNext) return null;
    const disabled = this.currentPage <= 1;
    const targetPage = Math.max(1, this.currentPage - 1);
    const ariaLabel = this.formatLabel(this.prevAriaLabel, { page: targetPage });
    return (
      <button
        type="button"
        class={{ 'nav-button': true, 'nav-prev': true, 'is-disabled': disabled }}
        aria-label={ariaLabel}
        aria-disabled={disabled ? 'true' : null}
        disabled={disabled}
        onClick={this.onPrevClick}
      >
        <span class="nav-icon">
          <slot name="prev-icon" onSlotchange={this.onPrevIconSlotChange} />
          {!this.hasPrevIcon ? (
            <cor-icon name="chevron-left" size={this.size === 'sm' ? 16 : 20} color="currentColor" />
          ) : null}
        </span>
        <span class="nav-label">{this.prevLabel}</span>
      </button>
    );
  }

  private renderNext() {
    if (!this.showPrevNext) return null;
    const disabled = this.currentPage >= this.totalPages;
    const targetPage = Math.min(this.totalPages, this.currentPage + 1);
    const ariaLabel = this.formatLabel(this.nextAriaLabel, { page: targetPage });
    return (
      <button
        type="button"
        class={{ 'nav-button': true, 'nav-next': true, 'is-disabled': disabled }}
        aria-label={ariaLabel}
        aria-disabled={disabled ? 'true' : null}
        disabled={disabled}
        onClick={this.onNextClick}
      >
        <span class="nav-label">{this.nextLabel}</span>
        <span class="nav-icon">
          <slot name="next-icon" onSlotchange={this.onNextIconSlotChange} />
          {!this.hasNextIcon ? (
            <cor-icon name="chevron-right" size={this.size === 'sm' ? 16 : 20} color="currentColor" />
          ) : null}
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
    let ellipsisCount = 0;

    return (
      <Host>
        <nav class="root" aria-label={this.ariaLabel}>
          {this.renderPrev()}
          <ul class="pages" role="list">
            {slots.map(slot => {
              if (slot === ELLIPSIS) {
                ellipsisCount += 1;
                return this.renderEllipsis(`ellipsis-${ellipsisCount}`);
              }
              return this.renderPageItem(slot);
            })}
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
