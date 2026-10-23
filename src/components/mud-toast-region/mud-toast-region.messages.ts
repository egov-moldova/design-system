import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-toast-region. */
export interface ToastRegionMessages {
  /** Accessible name of the notifications landmark. */
  label: string;
}

export const TOAST_REGION_MESSAGES: LocaleMessages<ToastRegionMessages> = {
  'ro-MD': { label: 'Notificări' },
  'en-US': { label: 'Notifications' },
  'ru-MD': { label: 'Уведомления' },
};
