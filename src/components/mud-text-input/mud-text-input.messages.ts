import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-text-input. */
export interface TextInputMessages {
  /** Accessible label for the clear (×) button. */
  clearLabel: string;
  /** Validation message reported when the field is `required` and empty. */
  requiredMessage: string;
}

export const TEXT_INPUT_MESSAGES: LocaleMessages<TextInputMessages> = {
  'ro-MD': {
    clearLabel: 'Golește câmpul',
    requiredMessage: 'Acest câmp este obligatoriu.',
  },
  'en-US': {
    clearLabel: 'Clear field',
    requiredMessage: 'This field is required.',
  },
  'ru-MD': {
    clearLabel: 'Очистить поле',
    requiredMessage: 'Это поле обязательно для заполнения.',
  },
};
