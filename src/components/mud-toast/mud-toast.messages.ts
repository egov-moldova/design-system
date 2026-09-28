import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-toast. */
export interface ToastMessages {
  /** Accessible label for the close (×) button. */
  closeLabel: string;
}

export const TOAST_MESSAGES: LocaleMessages<ToastMessages> = {
  'ro-MD': { closeLabel: 'Închide' },
  'en-US': { closeLabel: 'Close' },
  'ru-MD': { closeLabel: 'Закрыть' },
};
