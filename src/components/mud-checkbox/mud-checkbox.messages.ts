import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-checkbox. */
export interface CheckboxMessages {
  /** Validation message reported when the field is `required` and unchecked. */
  requiredMessage: string;
}

export const CHECKBOX_MESSAGES: LocaleMessages<CheckboxMessages> = {
  'ro-RO': {
    requiredMessage: 'Bifați această casetă pentru a continua.',
  },
  'en-US': {
    requiredMessage: 'Please check this box if you want to proceed.',
  },
  'ru-RU': {
    requiredMessage: 'Пожалуйста, отметьте этот пункт, чтобы продолжить.',
  },
};
