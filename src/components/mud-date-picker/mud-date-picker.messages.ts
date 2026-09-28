import type { LocaleMessages } from '../../utils/locale';

/** Every built-in, non-`Intl`-derived string of mud-date-picker. */
export interface DatePickerMessages {
  /** Label of the "jump to today" footer shortcut, when `todayShortcut` is set. */
  todayLabel: string;
}

export const DATE_PICKER_MESSAGES: LocaleMessages<DatePickerMessages> = {
  'ro-RO': { todayLabel: 'Azi' },
  'en-US': { todayLabel: 'Today' },
  'ru-RU': { todayLabel: 'Сегодня' },
};
