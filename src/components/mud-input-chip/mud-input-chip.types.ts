export const INPUT_CHIP_SIZES = ['md', 'lg'] as const;
export const INPUT_CHIP_VARIANTS = ['default', 'destructive'] as const;
export const INPUT_CHIP_ERROR_CODES = ['pattern', 'duplicate', 'max'] as const;

export type InputChipSize = (typeof INPUT_CHIP_SIZES)[number];
export type InputChipVariant = (typeof INPUT_CHIP_VARIANTS)[number];
export type InputChipErrorCode = (typeof INPUT_CHIP_ERROR_CODES)[number];

export interface InputChipChangeDetail {
  chips: string[];
}

export interface InputChipAddDetail {
  chip: string;
  chips: string[];
}

export interface InputChipRemoveDetail {
  chip: string;
  index: number;
  chips: string[];
}

export interface InputChipErrorDetail {
  code: InputChipErrorCode;
  value: string;
  message: string;
}
