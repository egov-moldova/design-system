import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-table. `selectRowLabel` carries a `{row}` placeholder,
 * filled with the row's 1-based position. */
export interface TableMessages {
  /** Empty-state text shown when `rows` is empty or undefined. */
  emptyText: string;
  /** Accessible label for the header "select all rows" checkbox. */
  selectAllLabel: string;
  /** Accessible label for a row's selection checkbox. Carries a `{row}` placeholder. */
  selectRowLabel: string;
}

export const TABLE_MESSAGES: LocaleMessages<TableMessages> = {
  'ro-RO': {
    emptyText: 'Nu există date de afișat.',
    selectAllLabel: 'Selectează toate rândurile',
    selectRowLabel: 'Selectează rândul {row}',
  },
  'en-US': {
    emptyText: 'No data to display.',
    selectAllLabel: 'Select all rows',
    selectRowLabel: 'Select row {row}',
  },
  'ru-RU': {
    emptyText: 'Нет данных для отображения.',
    selectAllLabel: 'Выбрать все строки',
    selectRowLabel: 'Выбрать строку {row}',
  },
};
