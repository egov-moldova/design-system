import type { LocaleMessages, Plural } from '../../utils/locale';

/**
 * Every built-in string of mud-text-input. The five native-constraint messages replace the
 * browser's own `validationMessage`, which is written in the browser's UI language rather than
 * the component's locale.
 */
export interface TextInputMessages {
  /** Accessible label for the clear (×) button. */
  clearLabel: string;
  /** Validation message reported when the field is `required` and empty. */
  requiredMessage: string;
  /** Validation message reported when the value does not match `pattern`. */
  patternMismatch: string;
  /** Validation message reported when the value is shorter than `minlength`. Carries `{min}`; plural on `min`. */
  tooShort: Plural;
  /** Validation message reported when the value is longer than `maxlength`. Carries `{max}`; plural on `max`. */
  tooLong: Plural;
  /** Validation message reported when a `type="email"` value is not an email address. */
  typeMismatchEmail: string;
  /** Validation message reported when a `type="url"` value is not a URL. */
  typeMismatchUrl: string;
}

export const TEXT_INPUT_MESSAGES: LocaleMessages<TextInputMessages> = {
  'ro-MD': {
    clearLabel: 'Golește câmpul',
    requiredMessage: 'Acest câmp este obligatoriu.',
    patternMismatch: 'Valoarea nu respectă formatul cerut.',
    tooShort: {
      one: 'Introduceți cel puțin {min} caracter.',
      few: 'Introduceți cel puțin {min} caractere.',
      other: 'Introduceți cel puțin {min} de caractere.',
    },
    tooLong: {
      one: 'Introduceți cel mult {max} caracter.',
      few: 'Introduceți cel mult {max} caractere.',
      other: 'Introduceți cel mult {max} de caractere.',
    },
    typeMismatchEmail: 'Introduceți o adresă de e-mail validă.',
    typeMismatchUrl: 'Introduceți o adresă URL validă.',
  },
  'en-US': {
    clearLabel: 'Clear field',
    requiredMessage: 'This field is required.',
    patternMismatch: 'Please match the requested format.',
    tooShort: {
      one: 'Use at least {min} character.',
      other: 'Use at least {min} characters.',
    },
    tooLong: {
      one: 'Use at most {max} character.',
      other: 'Use at most {max} characters.',
    },
    typeMismatchEmail: 'Enter a valid email address.',
    typeMismatchUrl: 'Enter a valid URL.',
  },
  'ru-MD': {
    clearLabel: 'Очистить поле',
    requiredMessage: 'Это поле обязательно для заполнения.',
    patternMismatch: 'Значение не соответствует требуемому формату.',
    tooShort: {
      one: 'Введите не менее {min} символа.',
      few: 'Введите не менее {min} символов.',
      many: 'Введите не менее {min} символов.',
      other: 'Введите не менее {min} символа.',
    },
    tooLong: {
      one: 'Введите не более {max} символа.',
      few: 'Введите не более {max} символов.',
      many: 'Введите не более {max} символов.',
      other: 'Введите не более {max} символа.',
    },
    typeMismatchEmail: 'Введите действительный адрес электронной почты.',
    typeMismatchUrl: 'Введите действительный URL-адрес.',
  },
};
