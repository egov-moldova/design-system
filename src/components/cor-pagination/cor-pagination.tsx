import { Component, Host, Element, Prop, Event, EventEmitter, h } from '@stencil/core';

import { PaginationSize, PaginationStyle } from './cor-pagination.enums';
import {
  PaginationItemListPosition,
  PaginationItemSize,
  PaginationItemType,
} from '../cor-pagination-item/cor-pagination-item.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

/**
 * Pagination navigation control with two style variants, three sizes, and smart page range computation.
 *
 * Style 1: prev/next chevrons, page numbers with "..." collapsed ranges.
 * Style 2: first/prev/next/last icon buttons, page numbers only.
 *
 * @element cor-pagination
 */
@Component({
  tag: 'cor-pagination',
  styleUrl: 'cor-pagination.css',
  shadow: true,
})
export class CorPagination {
  /**
   * Size of the pagination component
   * @default lg
   */
  @Prop({ reflect: true }) size: PaginationSize = PaginationSize.LG;

  /**
   * Visual style variant
   * @default 1
   */
  @Prop({ reflect: true }) paginationStyle: PaginationStyle = PaginationStyle.STYLE_1;

  /**
   * Shows skeleton loading state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Currently selected page (1-indexed)
   * @default 1
   */
  @Prop({ mutable: true }) currentPage: number = 1;

  /**
   * Total number of pages
   * @default 1
   */
  @Prop() totalPages: number = 1;

  /**
   * Maximum number of page number buttons to show at once (not counting first/last always-shown pages)
   * @default 4
   */
  @Prop() shown: number = 4;

  /**
   * Disables all interactions
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Host element reference
   */
  @Element() host!: HTMLElement;

  /**
   * Emitted when the user selects a page
   */
  @Event() corPageChange!: EventEmitter<{ page: number }>;

  private get safeTotalPages(): number {
    return Math.max(1, Math.floor(Number(this.totalPages) || 1));
  }

  private get safeShown(): number {
    return Math.max(1, Math.floor(Number(this.shown) || 1));
  }

  private get normalizedCurrentPage(): number {
    const currentPage = Math.floor(Number(this.currentPage) || 1);
    return Math.min(Math.max(1, currentPage), this.safeTotalPages);
  }

  private handleItemClick = (event: CustomEvent<{ page: number }>) => {
    const page = Math.min(Math.max(1, Math.floor(event.detail.page || 1)), this.safeTotalPages);
    if (page === this.normalizedCurrentPage) return;
    this.corPageChange.emit({ page });
  };

  private handlePrevClick = () => {
    const currentPage = this.normalizedCurrentPage;
    if (currentPage > 1) {
      this.corPageChange.emit({ page: currentPage - 1 });
    }
  };

  private handleNextClick = () => {
    const currentPage = this.normalizedCurrentPage;
    const totalPages = this.safeTotalPages;
    if (currentPage < totalPages) {
      this.corPageChange.emit({ page: currentPage + 1 });
    }
  };

  private handleFirstClick = () => {
    if (this.normalizedCurrentPage !== 1) {
      this.corPageChange.emit({ page: 1 });
    }
  };

  private handleLastClick = () => {
    const totalPages = this.safeTotalPages;
    if (this.normalizedCurrentPage !== totalPages) {
      this.corPageChange.emit({ page: totalPages });
    }
  };

  /**
   * Computes the page range to display.
   * Always shows page 1 and totalPages.
   * Shows `shown` pages centered around currentPage.
   * Uses -1 to represent a collapsed "..." button.
   * Returns a tuple of [pages, leftCollapsedRange, rightCollapsedRange].
   */
  private computePageRange(): { pages: number[]; leftCollapsed: number[]; rightCollapsed: number[] } {
    const currentPage = this.normalizedCurrentPage;
    const totalPages = this.safeTotalPages;
    const shown = this.safeShown;

    if (totalPages <= shown + 2) {
      const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
      return { pages, leftCollapsed: [], rightCollapsed: [] };
    }

    const half = Math.floor(shown / 2);
    let rangeStart = Math.max(2, currentPage - half);
    const rangeEnd = Math.min(totalPages - 1, rangeStart + shown - 1);

    if (rangeEnd === totalPages - 1) {
      rangeStart = Math.max(2, rangeEnd - shown + 1);
    }

    const leftCollapsed: number[] = [];
    const rightCollapsed: number[] = [];

    if (rangeStart > 2) {
      for (let i = 2; i < rangeStart; i++) leftCollapsed.push(i);
    }

    if (rangeEnd < totalPages - 1) {
      for (let i = rangeEnd + 1; i < totalPages; i++) rightCollapsed.push(i);
    }

    const pages: number[] = [];
    pages.push(1);
    if (leftCollapsed.length > 0) pages.push(-1);
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rightCollapsed.length > 0) pages.push(-2);
    pages.push(totalPages);

    return { pages, leftCollapsed, rightCollapsed };
  }

  private get itemSize(): PaginationItemSize {
    return this.size as unknown as PaginationItemSize;
  }

  private renderStyle1() {
    const { pages, leftCollapsed, rightCollapsed } = this.computePageRange();
    const currentPage = this.normalizedCurrentPage;
    const totalPages = this.safeTotalPages;
    const isPrevDisabled = this.disabled || this.skeleton || currentPage <= 1;
    const isNextDisabled = this.disabled || this.skeleton || currentPage >= totalPages;

    return [
      <cor-pagination-item
        key="prev"
        size={this.itemSize}
        itemType={PaginationItemType.ICON}
        icon={ICON_NAMES.CHEVRON__LEFT}
        iconLabel="Previous page"
        disabled={isPrevDisabled}
        skeleton={this.skeleton}
        onCorItemClick={() => this.handlePrevClick()}
      />,
      ...pages.map(p => {
        if (p === -1) {
          return (
            <cor-pagination-item
              key="collapsed-left"
              size={this.itemSize}
              itemType={PaginationItemType.COLLAPSED}
              collapsedPages={leftCollapsed}
              listPosition={PaginationItemListPosition.AUTO}
              disabled={this.disabled}
              skeleton={this.skeleton}
              onCorItemClick={this.handleItemClick}
            />
          );
        }
        if (p === -2) {
          return (
            <cor-pagination-item
              key="collapsed-right"
              size={this.itemSize}
              itemType={PaginationItemType.COLLAPSED}
              collapsedPages={rightCollapsed}
              listPosition={PaginationItemListPosition.AUTO}
              disabled={this.disabled}
              skeleton={this.skeleton}
              onCorItemClick={this.handleItemClick}
            />
          );
        }
        return (
          <cor-pagination-item
            key={`page-${p}`}
            size={this.itemSize}
            itemType={PaginationItemType.NUMBER}
            page={p}
            selected={p === currentPage}
            disabled={this.disabled}
            skeleton={this.skeleton}
            onCorItemClick={this.handleItemClick}
          />
        );
      }),
      <cor-pagination-item
        key="next"
        size={this.itemSize}
        itemType={PaginationItemType.ICON}
        icon={ICON_NAMES.CHEVRON__RIGHT}
        iconLabel="Next page"
        disabled={isNextDisabled}
        skeleton={this.skeleton}
        onCorItemClick={() => this.handleNextClick()}
      />,
    ];
  }

  /**
   * Style 2 uses a simple sliding window — no "..." or fixed first/last anchors.
   * Shows `shown + 1` pages centered around currentPage (Figma: 5 pages window).
   */
  private computeStyle2Pages(): number[] {
    const currentPage = this.normalizedCurrentPage;
    const totalPages = this.safeTotalPages;
    const shown = this.safeShown;
    const windowSize = shown + 1;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + windowSize - 1);
    if (end === totalPages) {
      start = Math.max(1, end - windowSize + 1);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  private renderStyle2() {
    const pages = this.computeStyle2Pages();
    const currentPage = this.normalizedCurrentPage;
    const totalPages = this.safeTotalPages;
    const isPrevDisabled = this.disabled || this.skeleton || currentPage <= 1;
    const isNextDisabled = this.disabled || this.skeleton || currentPage >= totalPages;

    return [
      <cor-pagination-item
        key="first"
        size={this.itemSize}
        itemType={PaginationItemType.ICON}
        icon={ICON_NAMES.PAGE__FIRST}
        iconLabel="First page"
        disabled={isPrevDisabled}
        skeleton={this.skeleton}
        onCorItemClick={() => this.handleFirstClick()}
      />,
      <cor-pagination-item
        key="prev"
        size={this.itemSize}
        itemType={PaginationItemType.ICON}
        icon={ICON_NAMES.CHEVRON__LEFT}
        iconLabel="Previous page"
        disabled={isPrevDisabled}
        skeleton={this.skeleton}
        onCorItemClick={() => this.handlePrevClick()}
      />,
      ...pages.map(p => (
        <cor-pagination-item
          key={`page-${p}`}
          size={this.itemSize}
          itemType={PaginationItemType.NUMBER}
          page={p}
          selected={p === currentPage}
          disabled={this.disabled}
          skeleton={this.skeleton}
          onCorItemClick={this.handleItemClick}
        />
      )),
      <cor-pagination-item
        key="next"
        size={this.itemSize}
        itemType={PaginationItemType.ICON}
        icon={ICON_NAMES.CHEVRON__RIGHT}
        iconLabel="Next page"
        disabled={isNextDisabled}
        skeleton={this.skeleton}
        onCorItemClick={() => this.handleNextClick()}
      />,
      <cor-pagination-item
        key="last"
        size={this.itemSize}
        itemType={PaginationItemType.ICON}
        icon={ICON_NAMES.PAGE__LAST}
        iconLabel="Last page"
        disabled={isNextDisabled}
        skeleton={this.skeleton}
        onCorItemClick={() => this.handleLastClick()}
      />,
    ];
  }

  render() {
    return (
      <Host>
        <nav class="pagination" aria-label="Pagination" role="navigation">
          {this.paginationStyle === PaginationStyle.STYLE_1 ? this.renderStyle1() : this.renderStyle2()}
        </nav>
      </Host>
    );
  }
}
