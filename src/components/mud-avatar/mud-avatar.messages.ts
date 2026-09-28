import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-avatar. `initialsLabel` carries a `{initials}` placeholder. */
export interface AvatarMessages {
  /** Accessible-name fallback when only initials (no `name`) are set. Carries `{initials}`. */
  initialsLabel: string;
  /** Accessible-name fallback when neither `name` nor initials are set. */
  fallbackLabel: string;
}

export const AVATAR_MESSAGES: LocaleMessages<AvatarMessages> = {
  'ro-MD': {
    initialsLabel: 'Avatar pentru {initials}',
    fallbackLabel: 'Avatar utilizator',
  },
  'en-US': {
    initialsLabel: 'Avatar for {initials}',
    fallbackLabel: 'User avatar',
  },
  'ru-MD': {
    initialsLabel: 'Аватар для {initials}',
    fallbackLabel: 'Аватар пользователя',
  },
};
