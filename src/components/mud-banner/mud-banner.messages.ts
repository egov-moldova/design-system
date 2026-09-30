import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-banner. */
export interface BannerMessages {
  /** Accessible label for the close (×) button. */
  closeLabel: string;
}

export const BANNER_MESSAGES: LocaleMessages<BannerMessages> = {
  'ro-MD': { closeLabel: 'Închide' },
  'en-US': { closeLabel: 'Close' },
  'ru-MD': { closeLabel: 'Закрыть' },
};
