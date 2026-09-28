import type { LocaleMessages } from '../../utils/locale';

/**
 * Every built-in string of mud-pagination. `prevAriaLabel` / `nextAriaLabel` carry a
 * `{page}` placeholder; `pageAriaLabel` carries `{page}` and `{total}`; `overflowAriaLabel`
 * carries `{from}` and `{to}`.
 */
export interface PaginationMessages {
  /** Accessible name for the navigation landmark. */
  navLabel: string;
  /** Visible label for the Previous button (desktop only — hidden on `sm`). */
  prevLabel: string;
  /** Visible label for the Next button (desktop only — hidden on `sm`). */
  nextLabel: string;
  /** Accessible label template for the Previous button. Carries `{page}`. */
  prevAriaLabel: string;
  /** Accessible label template for the Next button. Carries `{page}`. */
  nextAriaLabel: string;
  /** Accessible label template for an individual page button. Carries `{page}` and `{total}`. */
  pageAriaLabel: string;
  /** Accessible label template for the overflow ("…") button. Carries `{from}` and `{to}`. */
  overflowAriaLabel: string;
}

export const PAGINATION_MESSAGES: LocaleMessages<PaginationMessages> = {
  'ro-MD': {
    navLabel: 'Navigare pagini',
    prevLabel: 'Anterior',
    nextLabel: 'Următor',
    prevAriaLabel: 'Pagina anterioară, mergi la pagina {page}',
    nextAriaLabel: 'Pagina următoare, mergi la pagina {page}',
    pageAriaLabel: 'Pagina {page} din {total}',
    overflowAriaLabel: 'Arată paginile de la {from} la {to}',
  },
  'en-US': {
    navLabel: 'Pagination',
    prevLabel: 'Previous',
    nextLabel: 'Next',
    prevAriaLabel: 'Previous page, go to page {page}',
    nextAriaLabel: 'Next page, go to page {page}',
    pageAriaLabel: 'Page {page} of {total}',
    overflowAriaLabel: 'Show pages {from} to {to}',
  },
  'ru-MD': {
    navLabel: 'Навигация по страницам',
    prevLabel: 'Назад',
    nextLabel: 'Далее',
    prevAriaLabel: 'Предыдущая страница, перейти на страницу {page}',
    nextAriaLabel: 'Следующая страница, перейти на страницу {page}',
    pageAriaLabel: 'Страница {page} из {total}',
    overflowAriaLabel: 'Показать страницы с {from} по {to}',
  },
};
