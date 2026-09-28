import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-breadcrumb-item. */
export interface BreadcrumbItemMessages {
  /** Accessible label of the spinner shown while `loading` is set. */
  loadingLabel: string;
}

export const BREADCRUMB_ITEM_MESSAGES: LocaleMessages<BreadcrumbItemMessages> = {
  'ro-MD': {
    loadingLabel: 'Se încarcă',
  },
  'en-US': {
    loadingLabel: 'Loading',
  },
  'ru-MD': {
    loadingLabel: 'Загрузка',
  },
};
