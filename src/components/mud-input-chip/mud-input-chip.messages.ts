import type { LocaleMessages, Plural } from '../../utils/locale';

/** Every built-in string of mud-input-chip. */
export interface InputChipMessages {
  /** Validity message when a required field is submitted with no chips. */
  requiredText: string;
  /** `mudError` message for a value that fails `validate-pattern`. Carries a `{value}` placeholder. */
  patternRejectionText: string;
  /** `mudError` message for a value already present in `chips`. Carries a `{value}` placeholder. */
  duplicateRejectionText: string;
  /** `mudError` message for a value rejected past `max-chips`. Carries a `{max}` placeholder. */
  maxRejectionText: string;
  /** Live-region announcement when one chip is confirmed. Carries a `{value}` placeholder. */
  addedAnnouncement: string;
  /** Live-region announcement when a chip is removed. Carries a `{value}` placeholder. */
  removedAnnouncement: string;
  /** Live-region announcement after a multi-chip paste. */
  pastedAnnouncement: Plural;
  /** Accessible label for a chip's remove button. Carries a `{chip}` placeholder. */
  removeChipLabel: string;
}

export const INPUT_CHIP_MESSAGES: LocaleMessages<InputChipMessages> = {
  'ro-RO': {
    requiredText: 'Acest câmp este obligatoriu.',
    patternRejectionText: 'Valoarea "{value}" nu este în formatul așteptat.',
    duplicateRejectionText: 'Valoarea "{value}" este deja adăugată.',
    maxRejectionText: 'Maximum {max} valori permise.',
    addedAnnouncement: 'Valoarea {value} a fost adăugată.',
    removedAnnouncement: 'Valoarea {value} a fost eliminată.',
    pastedAnnouncement: {
      one: '{count} valoare adăugată',
      few: '{count} valori adăugate',
      other: '{count} de valori adăugate',
    },
    removeChipLabel: 'Elimină {chip}',
  },
  'en-US': {
    requiredText: 'This field is required.',
    patternRejectionText: 'The value "{value}" is not in the expected format.',
    duplicateRejectionText: 'The value "{value}" is already added.',
    maxRejectionText: 'Maximum {max} values allowed.',
    addedAnnouncement: 'The value {value} was added.',
    removedAnnouncement: 'The value {value} was removed.',
    pastedAnnouncement: { one: '{count} value added', other: '{count} values added' },
    removeChipLabel: 'Remove {chip}',
  },
  'ru-RU': {
    requiredText: 'Это поле обязательно для заполнения.',
    patternRejectionText: 'Значение «{value}» не соответствует ожидаемому формату.',
    duplicateRejectionText: 'Значение «{value}» уже добавлено.',
    maxRejectionText: 'Разрешено не более {max} значений.',
    addedAnnouncement: 'Значение {value} добавлено.',
    removedAnnouncement: 'Значение {value} удалено.',
    pastedAnnouncement: {
      one: 'Добавлено {count} значение',
      few: 'Добавлено {count} значения',
      many: 'Добавлено {count} значений',
      other: 'Добавлено {count} значения',
    },
    removeChipLabel: 'Удалить {chip}',
  },
};
