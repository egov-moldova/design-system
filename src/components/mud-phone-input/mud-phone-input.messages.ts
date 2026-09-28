import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-phone-input. */
export interface PhoneInputMessages {
  /** Validity message when a required field is submitted with no digits. */
  requiredText: string;
  /** Message for a value whose local-segment length is outside the active country's window. */
  incompleteText: string;
  /** Accessible label + placeholder for the country search input inside the listbox. */
  searchCountryText: string;
  /** Accessible label for the value clear (×) button. */
  clearValueLabel: string;
  /** Accessible label for the search clear (×) button. */
  clearSearchLabel: string;
  /** `role="presentation"` message shown when the search filters out every country. */
  noCountryFoundText: string;
  /** Fallback `aria-label` for the listbox when no visible field label is present. */
  countryListLabel: string;
}

export const PHONE_INPUT_MESSAGES: LocaleMessages<PhoneInputMessages> = {
  'ro-RO': {
    requiredText: 'Acest câmp este obligatoriu.',
    incompleteText: 'Numărul de telefon este incomplet',
    searchCountryText: 'Caută țara',
    clearValueLabel: 'Șterge numărul',
    clearSearchLabel: 'Șterge căutarea',
    noCountryFoundText: 'Nicio țară găsită',
    countryListLabel: 'Țară',
  },
  'en-US': {
    requiredText: 'This field is required.',
    incompleteText: 'The phone number is incomplete',
    searchCountryText: 'Search country',
    clearValueLabel: 'Clear number',
    clearSearchLabel: 'Clear search',
    noCountryFoundText: 'No country found',
    countryListLabel: 'Country',
  },
  'ru-RU': {
    requiredText: 'Это поле обязательно для заполнения.',
    incompleteText: 'Номер телефона неполный',
    searchCountryText: 'Поиск страны',
    clearValueLabel: 'Очистить номер',
    clearSearchLabel: 'Очистить поиск',
    noCountryFoundText: 'Страна не найдена',
    countryListLabel: 'Страна',
  },
};
