import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-date-input. `dayErrorText` carries a `{max}` placeholder,
 * filled with the number of days the chosen month actually has. */
export interface DateInputMessages {
  /** Accessible label for the clear (×) button. */
  clearLabel: string;
  /** Accessible name of the calendar dialog. */
  pickerLabel: string;
  /** Accessible name of the trailing button that opens the calendar. */
  openPickerLabel: string;
  /**
   * Message for a day outside 01–31, or (once the month is known) past the number of days
   * in that month. Carries a `{max}` placeholder.
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
  /** `type="date-range"` only: message for an end date before the start date. */
  orderErrorText: string;
  /** Message shown when a required field is submitted empty. */
  requiredErrorText: string;
}

export const DATE_INPUT_MESSAGES: LocaleMessages<DateInputMessages> = {
  'ro-MD': {
    clearLabel: 'Șterge',
    pickerLabel: 'Selectează data',
    openPickerLabel: 'Deschide calendarul',
    dayErrorText: 'Ziua trebuie să fie între 01 și {max}',
    monthErrorText: 'Luna trebuie să fie între 01 și 12',
    yearErrorText: 'Introduceți un an valid',
    dateErrorText: 'Introduceți o dată validă',
    rangeErrorText: 'Data este în afara intervalului permis',
    orderErrorText: 'Data de sfârșit trebuie să fie după data de început',
    requiredErrorText: 'Introduceți data',
  },
  'en-US': {
    clearLabel: 'Clear',
    pickerLabel: 'Select date',
    openPickerLabel: 'Open the calendar',
    dayErrorText: 'Day must be between 01 and {max}',
    monthErrorText: 'Month must be between 01 and 12',
    yearErrorText: 'Enter a valid year',
    dateErrorText: 'Enter a valid date',
    rangeErrorText: 'Date is outside the allowed range',
    orderErrorText: 'The end date must be after the start date',
    requiredErrorText: 'Enter a date',
  },
  'ru-MD': {
    clearLabel: 'Очистить',
    pickerLabel: 'Выбрать дату',
    openPickerLabel: 'Открыть календарь',
    dayErrorText: 'День должен быть от 01 до {max}',
    monthErrorText: 'Месяц должен быть от 01 до 12',
    yearErrorText: 'Введите корректный год',
    dateErrorText: 'Введите корректную дату',
    rangeErrorText: 'Дата вне допустимого диапазона',
    orderErrorText: 'Дата окончания должна быть позже даты начала',
    requiredErrorText: 'Введите дату',
  },
};
