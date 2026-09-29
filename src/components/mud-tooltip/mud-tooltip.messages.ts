import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-tooltip. */
export interface TooltipMessages {
  /** Accessible label for the `coach` variant's close button. */
  closeLabel: string;
  /** Dismiss hint shown in the `coach` variant's body. */
  dismissHint: string;
}

export const TOOLTIP_MESSAGES: LocaleMessages<TooltipMessages> = {
  'ro-MD': { closeLabel: 'Închide tooltip-ul', dismissHint: 'Apasă Esc pentru a închide.' },
  'en-US': { closeLabel: 'Close the tooltip', dismissHint: 'Press Esc to close.' },
  'ru-MD': { closeLabel: 'Закрыть подсказку', dismissHint: 'Нажмите Esc, чтобы закрыть.' },
};
