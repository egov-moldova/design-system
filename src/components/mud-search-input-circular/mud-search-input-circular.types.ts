export const SEARCH_INPUT_CIRCULAR_SIZES = ['md', 'lg'] as const;
export const SEARCH_INPUT_CIRCULAR_VARIANTS = ['default', 'destructive'] as const;

export type SearchInputCircularSize = (typeof SEARCH_INPUT_CIRCULAR_SIZES)[number];
export type SearchInputCircularVariant = (typeof SEARCH_INPUT_CIRCULAR_VARIANTS)[number];

export interface SearchInputCircularChangeDetail {
  value: string;
}

export interface SearchInputCircularSearchDetail {
  value: string;
}
