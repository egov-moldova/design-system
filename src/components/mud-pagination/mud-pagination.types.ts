export const PAGINATION_SIZES = ['sm', 'md'] as const;

export type PaginationSize = (typeof PAGINATION_SIZES)[number];

export interface PaginationChangeDetail {
  page: number;
  previousPage: number;
}

/** Identifier for which overflow slot a dropdown belongs to. */
export type OverflowKey = 'leading' | 'trailing';

/**
 * Slot that stands in for a contiguous range of skipped pages between the
 * boundary numbers and the visible sibling window. Rendered as an interactive
 * `…` button that opens a dropdown listing the skipped pages so the user can
 * jump directly to any of them (Figma "overflow-active" interaction).
 */
export interface PaginationOverflowSlot {
  type: 'ellipsis';
  key: OverflowKey;
  pages: number[];
}

export type PaginationSlot = number | PaginationOverflowSlot;

export const isOverflow = (slot: PaginationSlot): slot is PaginationOverflowSlot =>
  typeof slot === 'object' && slot !== null && slot.type === 'ellipsis';

/**
 * Legacy ellipsis sentinel kept for backwards compatibility with consumers
 * that imported it from this module. The new `computeRange` returns
 * structured `PaginationOverflowSlot` objects instead of this literal.
 */
export const ELLIPSIS = '...' as const;
