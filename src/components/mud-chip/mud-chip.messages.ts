import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-chip. */
export interface ChipMessages {
  /** Accessible label for the remove button. The chip's own text is appended to it. */
  removeLabel: string;
}

export const CHIP_MESSAGES: LocaleMessages<ChipMessages> = {
  'ro-RO': {
    removeLabel: 'Elimină',
  },
  'en-US': {
    removeLabel: 'Remove',
  },
  'ru-RU': {
    removeLabel: 'Удалить',
  },
};
