export const DATE_INPUT_SIZES = ['md', 'lg'] as const;
export const DATE_INPUT_VARIANTS = ['default', 'destructive'] as const;
export const DATE_INPUT_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
export const DATE_INPUT_BREAKPOINTS = ['auto', 'desktop', 'mobile'] as const;
export const DATE_INPUT_MODES = ['single', 'range'] as const;

export type DateInputSize = (typeof DATE_INPUT_SIZES)[number];
export type DateInputVariant = (typeof DATE_INPUT_VARIANTS)[number];
export type DateInputFormat = (typeof DATE_INPUT_FORMATS)[number];

/**
 * What the field holds.
 * - `single` (default) — one date, e.g. `15/04/2025`.
 * - `range` — a start and an end date, e.g. `18/01/2025 - 22/01/2025` (Figma
 *   Date Picker page, Types → `date-range`).
 */
export type DateInputMode = (typeof DATE_INPUT_MODES)[number];

/**
 * Calendar-popover placement.
 * - `auto` (default) — desktop dropdown on wide viewports, full-width bottom
 *   sheet on narrow ones (resolved via `matchMedia`).
 * - `desktop` — always the anchored dropdown.
 * - `mobile` — always the bottom sheet.
 */
export type DateInputBreakpoint = (typeof DATE_INPUT_BREAKPOINTS)[number];

/**
 * Segment identifier emitted by `mudInput` while the user types. `null` means
 * the value is empty or the caret is outside any segment.
 */
export type DateInputSegment = 'DD' | 'MM' | 'YYYY' | null;

/**
 * Built-in validation result, checked segment by segment as the user types.
 * - `day` — a complete day segment outside 01–31.
 * - `month` — a complete month segment outside 01–12.
 * - `year` — a complete year outside the allowed years (`min` / `max`, else 1900–2100).
 * - `date` — a complete date that does not exist (e.g. `31/02/2025`).
 * - `range` — a complete, real date outside `min` / `max`.
 * - `order` — `mode="range"` only: the end date is before the start date.
 */
export type DateInputValidationError = 'day' | 'month' | 'year' | 'date' | 'range' | 'order';

export interface DateInputChangeDetail {
  /** Display value matching the configured `format`, e.g. `15/04/2025` (or `18/01/2025 - 22/01/2025` in range mode). */
  value: string;
  /**
   * Canonical ISO value. `YYYY-MM-DD` for a single date; for a range, the ISO 8601
   * interval `YYYY-MM-DD/YYYY-MM-DD`. `null` when the value is incomplete or invalid.
   */
  isoValue: string | null;
  /** `mode="range"` only: ISO start date, or `null` until it is complete and valid. */
  isoStart?: string | null;
  /** `mode="range"` only: ISO end date, or `null` until it is complete and valid. */
  isoEnd?: string | null;
  /** Built-in validation error for the current value, or `null` when it has none. */
  error: DateInputValidationError | null;
}

export interface DateInputTypingDetail extends DateInputChangeDetail {
  /** Segment the caret is currently in. */
  segment: DateInputSegment;
}
