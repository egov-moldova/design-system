import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-select. */
export interface SelectMessages {
  /** Shown in place of the list when nothing matches the query. */
  emptyLabel: string;
  /** Names the listbox for assistive technology when the field has no visible label. */
  listboxLabel: string;
  /** Validation message reported when the field is `required` and nothing is selected. */
  requiredMessage: string;
}

export const SELECT_MESSAGES: LocaleMessages<SelectMessages> = {
  'ro-MD': {
    emptyLabel: 'Nicio opțiune',
    listboxLabel: 'Opțiuni',
    requiredMessage: 'Selectați o opțiune.',
  },
  'en-US': {
    emptyLabel: 'No options',
    listboxLabel: 'Options',
    requiredMessage: 'Select an option.',
  },
  'ru-MD': {
    emptyLabel: 'Нет вариантов',
    listboxLabel: 'Варианты',
    requiredMessage: 'Выберите вариант.',
  },
};
