export const TIME_PICKER_COLUMNS = ['hours', 'minutes'] as const;

/** The two option columns of the picker. */
export type TimePickerColumn = (typeof TIME_PICKER_COLUMNS)[number];

/** Detail emitted by `mudChange` once a time is complete (an hour and a minute are picked). */
export interface TimePickerChangeDetail {
  /** `HH:MM`, 24-hour. */
  value: string;
  hours: number;
  minutes: number;
}
