export const DATE_INPUT_SIZES = ['md', 'lg'] as const;
export const DATE_INPUT_VARIANTS = ['default', 'destructive'] as const;
export const DATE_INPUT_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
export const DATE_INPUT_BREAKPOINTS = ['auto', 'desktop', 'mobile'] as const;
/** Locales with a built-in translation for every label / error message on this component. */
export const DATE_INPUT_LOCALES = ['ro-RO', 'en-US', 'ru-RU'] as const;

export type DateInputSize = (typeof DATE_INPUT_SIZES)[number];
export type DateInputVariant = (typeof DATE_INPUT_VARIANTS)[number];
export type DateInputFormat = (typeof DATE_INPUT_FORMATS)[number];
export type DateInputLocale = (typeof DATE_INPUT_LOCALES)[number];

/** All built-in, translatable strings on this component. */
export interface DateInputMessages {
  /** Accessible label for the clear (×) button. */
  clearLabel: string;
  /** Accessible name of the calendar dialog. */
  pickerLabel: string;
  /** Accessible name of the trailing button that opens the calendar. */
  openPickerLabel: string;
  /**
   * Message for a day outside 01–31, or (once the month is known) past the
   * number of days in that month. Supports a `{max}` placeholder.
   */
  dayErrorText: string;
  /** Message for a month outside 01–12. */
  monthErrorText: string;
  /** Message for a year outside the allowed years. */
  yearErrorText: string;
  /** Message for a complete date that does not otherwise exist. */
  dateErrorText: string;
  /** Message for a complete date outside `min` / `max`. */
  rangeErrorText: string;
}

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
 * - `day` — a day segment outside 01–31, or (once the month is known) a day
 *   past the number of days in that month (e.g. `31/04/2025`, `29/02/2025`).
 * - `month` — a complete month segment outside 01–12.
 * - `year` — a complete year outside the allowed years (`min` / `max`, else 1900–2100).
 * - `date` — a complete date that does not exist for a reason other than the
 *   day/month combination (rare — e.g. a `min`/`max` narrowing years below 1000).
 * - `range` — a complete, real date outside `min` / `max`.
 */
export type DateInputValidationError = 'day' | 'month' | 'year' | 'date' | 'range';

export interface DateInputChangeDetail {
  /** Display value matching the configured `format`, e.g. `15/04/2025`. */
  value: string;
  /** Canonical ISO `YYYY-MM-DD`. `null` when the value is incomplete or invalid. */
  isoValue: string | null;
  /** Built-in validation error for the current value, or `null` when it has none. */
  error: DateInputValidationError | null;
}

export interface DateInputTypingDetail extends DateInputChangeDetail {
  /** Segment the caret is currently in. */
  segment: DateInputSegment;
}
