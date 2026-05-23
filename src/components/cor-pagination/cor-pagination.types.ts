export const PAGINATION_SIZES = ['sm', 'md'] as const;

export type PaginationSize = (typeof PAGINATION_SIZES)[number];

export interface PaginationChangeDetail {
  page: number;
  previousPage: number;
}

/** Special slot in the visible page list representing skipped pages. */
export const ELLIPSIS = '...' as const;
export type PaginationSlot = number | typeof ELLIPSIS;
