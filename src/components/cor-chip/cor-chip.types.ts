export const CHIP_TYPES = ['filter', 'input'] as const;
export const CHIP_SIZES = ['sm', 'md'] as const;

export type ChipType = (typeof CHIP_TYPES)[number];
export type ChipSize = (typeof CHIP_SIZES)[number];

export interface ChipSelectEventDetail {
  selected: boolean;
}
