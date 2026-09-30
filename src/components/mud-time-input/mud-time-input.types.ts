export const TIME_INPUT_SIZES = ['md', 'lg'] as const;
export const TIME_INPUT_VARIANTS = ['default', 'destructive'] as const;

export type TimeInputSize = (typeof TIME_INPUT_SIZES)[number];
export type TimeInputVariant = (typeof TIME_INPUT_VARIANTS)[number];

/**
 * Segment identifier emitted by `mudInput` while the user types. `null` means
 * the value is empty or the caret is outside any segment.
 */
export type TimeInputSegment = 'HH' | 'MM' | null;

/**
 * Built-in validation result, checked segment by segment as the user types.
 * - `hour` — a complete hour segment outside 00–23.
 * - `minute` — a complete minute segment outside 00–59.
 * - `range` — a complete, valid time outside `min` / `max`.
 */
export type TimeInputValidationError = 'hour' | 'minute' | 'range';

export interface TimeInputChangeDetail {
  /** Display value, `HH:MM` (possibly partial while typing). */
  value: string;
  /** ISO 8601 time `HH:MM` when complete, valid and within `min` / `max`; otherwise `null`. */
  isoValue: string | null;
  /** Built-in validation error for the current value, or `null` when it has none. */
  error: TimeInputValidationError | null;
}

export interface TimeInputTypingDetail extends TimeInputChangeDetail {
  /** Segment the caret is currently in. */
  segment: TimeInputSegment;
}
