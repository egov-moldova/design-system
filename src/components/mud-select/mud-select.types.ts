export const SELECT_SIZES = ['medium', 'large'] as const;
export const SELECT_VARIANTS = ['default', 'destructive'] as const;

export type SelectSize = (typeof SELECT_SIZES)[number];
export type SelectVariant = (typeof SELECT_VARIANTS)[number];

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectChangeDetail {
  value: string;
}
