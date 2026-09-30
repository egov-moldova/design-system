import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-info-box. */
export interface InfoBoxMessages {
  /** Accessible label for the close (×) button. */
  closeLabel: string;
}

export const INFO_BOX_MESSAGES: LocaleMessages<InfoBoxMessages> = {
  'ro-MD': { closeLabel: 'Închide' },
  'en-US': { closeLabel: 'Close' },
  'ru-MD': { closeLabel: 'Закрыть' },
};
