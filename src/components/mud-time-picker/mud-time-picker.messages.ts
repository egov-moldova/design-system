import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-time-picker. */
export interface TimePickerMessages {
  /** Accessible name of the picker. */
  label: string;
  /** Accessible name of the hour column. */
  hoursLabel: string;
  /** Accessible name of the minute column. */
  minutesLabel: string;
}

export const TIME_PICKER_MESSAGES: LocaleMessages<TimePickerMessages> = {
  'ro-MD': {
    label: 'Selectează ora',
    hoursLabel: 'Ore',
    minutesLabel: 'Minute',
  },
  'en-US': {
    label: 'Select time',
    hoursLabel: 'Hours',
    minutesLabel: 'Minutes',
  },
  'ru-MD': {
    label: 'Выбрать время',
    hoursLabel: 'Часы',
    minutesLabel: 'Минуты',
  },
};
