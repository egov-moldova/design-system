export const DATE_INPUT_SIZES = ['md', 'lg'] as const;
export const DATE_INPUT_VARIANTS = ['default', 'destructive'] as const;
export const DATE_INPUT_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;

export type DateInputSize = (typeof DATE_INPUT_SIZES)[number];
export type DateInputVariant = (typeof DATE_INPUT_VARIANTS)[number];
export type DateInputFormat = (typeof DATE_INPUT_FORMATS)[number];

/**
 * Segment identifier emitted by `mudInput` while the user types. `null` means
 * the value is empty or the caret is outside any segment.
 */
export type DateInputSegment = 'DD' | 'MM' | 'YYYY' | null;

export interface DateInputChangeDetail {
  /** Display value matching the configured `format`, e.g. `15/04/2025`. */
  value: string;
  /** Canonical ISO `YYYY-MM-DD`. `null` when the value is incomplete or invalid. */
  isoValue: string | null;
}

export interface DateInputTypingDetail extends DateInputChangeDetail {
  /** Segment the caret is currently in. */
  segment: DateInputSegment;
}
