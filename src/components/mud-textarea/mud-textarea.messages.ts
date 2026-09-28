import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-textarea. */
export interface TextareaMessages {
  /** Validation message reported when the field is `required` and empty. */
  requiredMessage: string;
}

export const TEXTAREA_MESSAGES: LocaleMessages<TextareaMessages> = {
  'ro-MD': {
    requiredMessage: 'Completați acest câmp.',
  },
  'en-US': {
    requiredMessage: 'Fill in this field.',
  },
  'ru-MD': {
    requiredMessage: 'Заполните это поле.',
  },
};
