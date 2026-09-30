import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-badge. */
export interface BadgeMessages {
  /** Accessible-name fallback when no count and no consumer `aria-label` are set. */
  notificationLabel: string;
}

export const BADGE_MESSAGES: LocaleMessages<BadgeMessages> = {
  'ro-MD': {
    notificationLabel: 'Notificare',
  },
  'en-US': {
    notificationLabel: 'Notification',
  },
  'ru-MD': {
    notificationLabel: 'Уведомление',
  },
};
