export const SELECT_INPUT_SIZES = ['md', 'lg'] as const;
export const SELECT_INPUT_VARIANTS = ['default', 'destructive'] as const;

export type SelectInputSize = (typeof SELECT_INPUT_SIZES)[number];
export type SelectInputVariant = (typeof SELECT_INPUT_VARIANTS)[number];

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectChangeDetail {
  value: string;
}
