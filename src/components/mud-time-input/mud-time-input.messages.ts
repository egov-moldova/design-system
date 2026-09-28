import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-time-input. */
export interface TimeInputMessages {
  /** Accessible label for the clear (×) button. */
  clearLabel: string;
  /** Accessible label for the clock button that opens the picker. */
  triggerLabel: string;
  /** Accessible name of the picker dialog. */
  pickerLabel: string;
  /** Message shown when a complete hour segment is outside 00–23. */
  hourErrorText: string;
  /** Message shown when a complete minute segment is outside 00–59. */
  minuteErrorText: string;
  /** Message shown when a complete time is outside `min` / `max`. */
  rangeErrorText: string;
  /** Message shown when a `required` field is submitted empty. */
  requiredErrorText: string;
}

export const TIME_INPUT_MESSAGES: LocaleMessages<TimeInputMessages> = {
  'ro-MD': {
    clearLabel: 'Șterge',
    triggerLabel: 'Deschide selectorul de oră',
    pickerLabel: 'Selectează ora',
    hourErrorText: 'Ora trebuie să fie între 00 și 23',
    minuteErrorText: 'Minutele trebuie să fie între 00 și 59',
    rangeErrorText: 'Ora este în afara intervalului permis',
    requiredErrorText: 'Introduceți ora',
  },
  'en-US': {
    clearLabel: 'Clear',
    triggerLabel: 'Open the time picker',
    pickerLabel: 'Select time',
    hourErrorText: 'Hour must be between 00 and 23',
    minuteErrorText: 'Minute must be between 00 and 59',
    rangeErrorText: 'Time is outside the allowed range',
    requiredErrorText: 'Enter a time',
  },
  'ru-MD': {
    clearLabel: 'Очистить',
    triggerLabel: 'Открыть выбор времени',
    pickerLabel: 'Выбрать время',
    hourErrorText: 'Час должен быть от 00 до 23',
    minuteErrorText: 'Минуты должны быть от 00 до 59',
    rangeErrorText: 'Время вне допустимого диапазона',
    requiredErrorText: 'Введите время',
  },
};
