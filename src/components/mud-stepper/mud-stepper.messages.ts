import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-stepper. */
export interface StepperMessages {
  /** Accessible name of the `role="list"` host when no consumer `aria-label` is set. */
  navLabel: string;
  /** Appended to a step's accessible name when its status is `completed`. */
  completedSuffix: string;
  /** Appended to a step's accessible name when its status is `current`. */
  currentSuffix: string;
  /** Appended to a step's accessible name when its status is `available`. */
  availableSuffix: string;
  /** Appended to a step's accessible name when its status is `error`. */
  errorSuffix: string;
  /** Appended to a step's accessible name when its status is `pending`. */
  pendingSuffix: string;
  /** Joins a step's `label` and `supportingText` in its accessible name. */
  supportingSeparator: string;
}

export const STEPPER_MESSAGES: LocaleMessages<StepperMessages> = {
  'ro-RO': {
    navLabel: 'Pași',
    completedSuffix: ', finalizat',
    currentSuffix: ', curent',
    availableSuffix: ', disponibil',
    errorSuffix: ', eroare',
    pendingSuffix: ', în așteptare',
    supportingSeparator: ' — ',
  },
  'en-US': {
    navLabel: 'Progress tracker',
    completedSuffix: ', completed',
    currentSuffix: ', current',
    availableSuffix: ', available',
    errorSuffix: ', error',
    pendingSuffix: ', pending',
    supportingSeparator: ' — ',
  },
  'ru-RU': {
    navLabel: 'Индикатор прогресса',
    completedSuffix: ', завершено',
    currentSuffix: ', текущий',
    availableSuffix: ', доступно',
    errorSuffix: ', ошибка',
    pendingSuffix: ', ожидание',
    supportingSeparator: ' — ',
  },
};
