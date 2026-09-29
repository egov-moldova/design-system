import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-spinner. */
export interface SpinnerMessages {
  /** Accessible label announced to screen readers. */
  label: string;
}

export const SPINNER_MESSAGES: LocaleMessages<SpinnerMessages> = {
  'ro-MD': {
    label: 'Se încarcă',
  },
  'en-US': {
    label: 'Loading',
  },
  'ru-MD': {
    label: 'Загрузка',
  },
};
