import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-search-input. */
export interface SearchInputMessages {
  /** Accessible label for the trailing submit button. */
  submitLabel: string;
  /** Accessible label for the trailing clear button. */
  clearLabel: string;
  /** Validation message reported when the field is `required` and empty. */
  requiredMessage: string;
}

export const SEARCH_INPUT_MESSAGES: LocaleMessages<SearchInputMessages> = {
  'ro-RO': {
    submitLabel: 'Caută',
    clearLabel: 'Șterge',
    requiredMessage: 'Completați acest câmp.',
  },
  'en-US': {
    submitLabel: 'Search',
    clearLabel: 'Clear',
    requiredMessage: 'Fill in this field.',
  },
  'ru-RU': {
    submitLabel: 'Поиск',
    clearLabel: 'Очистить',
    requiredMessage: 'Заполните это поле.',
  },
};
