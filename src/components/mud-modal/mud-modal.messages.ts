import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-modal. */
export interface ModalMessages {
  /** Accessible label for the close (×) button. */
  closeLabel: string;
}

export const MODAL_MESSAGES: LocaleMessages<ModalMessages> = {
  'ro-RO': { closeLabel: 'Închide' },
  'en-US': { closeLabel: 'Close' },
  'ru-RU': { closeLabel: 'Закрыть' },
};
