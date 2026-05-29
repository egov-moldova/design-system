export const DATE_PICKER_MODES = ['single', 'range', 'multi'] as const;
export const DATE_PICKER_BREAKPOINTS = ['desktop', 'mobile', 'docked'] as const;
export const DATE_PICKER_VIEWS = ['days', 'months', 'years'] as const;

export type DatePickerMode = (typeof DATE_PICKER_MODES)[number];
export type DatePickerBreakpoint = (typeof DATE_PICKER_BREAKPOINTS)[number];
export type DatePickerView = (typeof DATE_PICKER_VIEWS)[number];

/**
 * Detail emitted by `mudChange`.
 *
 * - `value` is always an array of ISO YYYY-MM-DD strings (single → length 0 or 1; range → length 0 to 2;
 *   multi → length 0..n). The component also reflects to its primary `value` Prop in the format expected
 *   per mode (string for single, string[] for range/multi).
 * - `rangeStart` / `rangeEnd` are populated only in `mode="range"`.
 */
export interface DatePickerChangeDetail {
  value: string | string[];
  rangeStart?: string;
  rangeEnd?: string;
}

/** Detail emitted by `mudMonthChange` whenever the visible month changes (nav, jump, keyboard). */
export interface DatePickerMonthChangeDetail {
  year: number;
  /** 0-indexed month (Jan=0). */
  month: number;
}
