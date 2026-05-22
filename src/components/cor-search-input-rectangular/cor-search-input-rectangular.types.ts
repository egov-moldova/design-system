export const SEARCH_INPUT_RECTANGULAR_SIZES = ['md', 'lg'] as const;
export const SEARCH_INPUT_RECTANGULAR_VARIANTS = ['default', 'destructive'] as const;

export type SearchInputRectangularSize = (typeof SEARCH_INPUT_RECTANGULAR_SIZES)[number];
export type SearchInputRectangularVariant = (typeof SEARCH_INPUT_RECTANGULAR_VARIANTS)[number];

export interface SearchInputRectangularChangeDetail {
  value: string;
}

export interface SearchInputRectangularSearchDetail {
  value: string;
}
