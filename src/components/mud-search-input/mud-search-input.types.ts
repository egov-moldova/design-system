export const SEARCH_INPUT_SHAPES = ['rectangular', 'circular'] as const;
export const SEARCH_INPUT_SIZES = ['sm', 'md'] as const;

export type SearchInputShape = (typeof SEARCH_INPUT_SHAPES)[number];
export type SearchInputSize = (typeof SEARCH_INPUT_SIZES)[number];

export interface SearchInputChangeDetail {
  value: string;
}

export interface SearchInputSearchDetail {
  value: string;
}
