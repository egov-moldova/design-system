export const CHIP_TYPES = ['filter', 'input'] as const;
export const CHIP_SIZES = ['sm', 'md'] as const;
export const CHIP_SELECTION_MODES = ['mono', 'multi'] as const;

export type ChipType = (typeof CHIP_TYPES)[number];
export type ChipSize = (typeof CHIP_SIZES)[number];

/**
 * Selection behaviour for `type="filter"`:
 * - `mono` — single-choice (radio-like); the selected chip just flips colour.
 * - `multi` — multi-choice (checkbox-like); a leading ✓ appears when selected.
 */
export type ChipSelectionMode = (typeof CHIP_SELECTION_MODES)[number];

export interface ChipSelectEventDetail {
  selected: boolean;
}
