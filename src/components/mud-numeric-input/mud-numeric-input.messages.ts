import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-numeric-input. `minMessage` / `maxMessage` carry a
 * `{min}` / `{max}` placeholder, filled with the configured bound. */
export interface NumericInputMessages {
  /** Accessible label for the increment button. */
  incrementLabel: string;
  /** Accessible label for the decrement button. */
  decrementLabel: string;
  /** Accessible label for the clear button. */
  clearLabel: string;
  /** Validation message reported when the field is `required` and empty. */
  requiredMessage: string;
  /** Validation message reported when the value is below `min`. Carries a `{min}` placeholder. */
  minMessage: string;
  /** Validation message reported when the value is above `max`. Carries a `{max}` placeholder. */
  maxMessage: string;
  /** `mudError` text for an entry that could be a thousands group or a decimal. Carries a `{decimal}` placeholder. */
  ambiguousMessage: string;
}

export const NUMERIC_INPUT_MESSAGES: LocaleMessages<NumericInputMessages> = {
  'ro-MD': {
    incrementLabel: 'Crește',
    decrementLabel: 'Scade',
    clearLabel: 'Șterge',
    requiredMessage: 'Acest câmp este obligatoriu.',
    minMessage: 'Valoarea minimă este {min}.',
    maxMessage: 'Valoarea maximă este {max}.',
    ambiguousMessage:
      'Valoarea este ambiguă. Scrieți numărul fără separator de mii și folosiți „{decimal}” pentru zecimale.',
  },
  'en-US': {
    incrementLabel: 'Increase',
    decrementLabel: 'Decrease',
    clearLabel: 'Clear',
    requiredMessage: 'This field is required.',
    minMessage: 'The minimum value is {min}.',
    maxMessage: 'The maximum value is {max}.',
    ambiguousMessage:
      'The value is ambiguous. Write the number without a thousands separator and use “{decimal}” for decimals.',
  },
  'ru-MD': {
    incrementLabel: 'Увеличить',
    decrementLabel: 'Уменьшить',
    clearLabel: 'Очистить',
    requiredMessage: 'Это поле обязательно для заполнения.',
    minMessage: 'Минимальное значение — {min}.',
    maxMessage: 'Максимальное значение — {max}.',
    ambiguousMessage:
      'Значение неоднозначно. Запишите число без разделителя тысяч и используйте «{decimal}» для десятичных знаков.',
  },
};
