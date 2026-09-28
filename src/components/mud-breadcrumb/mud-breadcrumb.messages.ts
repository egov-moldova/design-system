import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-breadcrumb. */
export interface BreadcrumbMessages {
  /** Accessible name of the navigation landmark. */
  navLabel: string;
  /** Accessible label of the overflow ("…") trigger that reveals the collapsed crumbs. */
  overflowLabel: string;
  /** Accessible label of the spinner shown for a `loading` crumb. */
  loadingLabel: string;
}

export const BREADCRUMB_MESSAGES: LocaleMessages<BreadcrumbMessages> = {
  'ro-MD': {
    navLabel: 'Fir de navigare',
    overflowLabel: 'Arată paginile ascunse',
    loadingLabel: 'Se încarcă',
  },
  'en-US': {
    navLabel: 'Breadcrumb',
    overflowLabel: 'Show collapsed pages',
    loadingLabel: 'Loading',
  },
  'ru-MD': {
    navLabel: 'Хлебные крошки',
    overflowLabel: 'Показать скрытые страницы',
    loadingLabel: 'Загрузка',
  },
};
