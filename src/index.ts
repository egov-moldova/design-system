export type {
  Components,
  JSX,
  CorAccordionCustomEvent,
  CorBadgeInteractiveCustomEvent,
  CorBannerNotificationCustomEvent,
  CorBreadcrumbsCustomEvent,
  CorBreadcrumbsEllipsisCustomEvent,
  CorCalendarCustomEvent,
  CorCheckboxCustomEvent,
  CorCheckboxGroupCustomEvent,
  CorChipCustomEvent,
  CorColumnActionCustomEvent,
  CorDatepickerCustomEvent,
  CorDatepickerDayCustomEvent,
  CorInlineNotificationCustomEvent,
  CorInputCustomEvent,
  CorMenuButtonCustomEvent,
  CorModalCustomEvent,
  CorPaginationCustomEvent,
  CorPaginationGoToCustomEvent,
  CorPaginationItemCustomEvent,
  CorPaginationPageSizeCustomEvent,
  CorRadioButtonCustomEvent,
  CorRadioButtonGroupCustomEvent,
  CorRowCustomEvent,
  CorSelectCustomEvent,
  CorSelectItemCustomEvent,
  CorSortingCustomEvent,
  CorTabButtonCustomEvent,
  CorTabsCustomEvent,
  CorTextareaCustomEvent,
  CorTheadCustomEvent,
  CorTimelineCustomEvent,
  CorToastNotificationCustomEvent,
  CorToggleCustomEvent,
  CorTooltipCustomEvent,
  CorUploadAreaCustomEvent,
  CorUploadFileItemCustomEvent,
} from './components';

export { default as ICON_NAMES } from './components/cor-icon/assets/carbon-icon-names.json';
export type IconName = keyof typeof import('./components/cor-icon/assets/carbon-icon-names.json');

/** @deprecated Use ICON_NAMES instead */
export { default as CARBON_ICON_NAMES } from './components/cor-icon/assets/carbon-icon-names.json';
/** @deprecated Use IconName instead */
export type CarbonIconName = keyof typeof import('./components/cor-icon/assets/carbon-icon-names.json');

// Runtime enum values — exported so framework wrappers and consumers can import named constants
export * from './components/cor-accordion/cor-accordion.enums';
export * from './components/cor-avatar/cor-avatar.enums';
export * from './components/cor-badge/cor-badge.enums';
export * from './components/cor-badge-interactive/cor-badge-interactive.enums';
export { NotificationState as CorBannerNotificationState } from './components/cor-banner-notification/cor-banner-notification.enums';
export * from './components/cor-breadcrumbs-ellipsis/cor-breadcrumbs-ellipsis.enums';
export * from './components/cor-button/cor-button.enums';
export * from './components/cor-calendar/cor-calendar.enums';
export * from './components/cor-cell/cor-cell.enums';
export * from './components/cor-checkbox/cor-checkbox.enums';
export * from './components/cor-checkbox-group/cor-checkbox-group.enums';
export * from './components/cor-chip/cor-chip.enums';
export * from './components/cor-column/cor-column.enums';
export * from './components/cor-datepicker/cor-datepicker.enums';
export * from './components/cor-grid/cor-grid.enums';
export {
  NotificationState as CorInlineNotificationState,
  CorInlineNotificationVariant,
} from './components/cor-inline-notification/cor-inline-notification.enums';
export * from './components/cor-input/cor-input.enums';
export * from './components/cor-label/cor-label.enums';
export * from './components/cor-link/cor-link.enums';
export * from './components/cor-loading/cor-loading.enums';
export * from './components/cor-menu-button/cor-menu-button.enums';
export * from './components/cor-modal/cor-modal.enums';
export * from './components/cor-pagination/cor-pagination.enums';
export * from './components/cor-pagination-go-to/cor-pagination-go-to.enums';
export * from './components/cor-pagination-item/cor-pagination-item.enums';
export * from './components/cor-pagination-page-size/cor-pagination-page-size.enums';
export * from './components/cor-progress-bar/cor-progress-bar.enums';
export * from './components/cor-radio-button/cor-radio-button.enums';
export * from './components/cor-radio-button-group/cor-radio-button-group.enums';
export * from './components/cor-select/cor-select.enums';
export * from './components/cor-select-item/cor-select-item.enums';
export * from './components/cor-separator/cor-separator.enums';
export * from './components/cor-sorting/cor-sorting.enums';
export * from './components/cor-slot/cor-slot.enums';
export * from './components/cor-spinner/cor-spinner.enums';
export * from './components/cor-system-message/cor-system-message.enums';
export * from './components/cor-tab-button/cor-tab-button.enums';
export * from './components/cor-table/cor-table.enums';
export * from './components/cor-textarea/cor-textarea.enums';
export * from './components/cor-timeline/cor-timeline.enums';
// `NotificationState` collides with cor-banner-notification + cor-inline-notification
// (each defines its own enum with the same name). Alias here, the same way the
// other two notification components do, so the wrapper sees three distinct names.
export {
  NotificationState as CorToastNotificationState,
  ToastPosition,
} from './components/cor-toast-notification/cor-toast-notification.enums';
export * from './components/cor-toggle/cor-toggle.enums';
export * from './components/cor-tooltip/cor-tooltip.enums';
export * from './components/cor-typography/cor-typography.enums';
export * from './components/cor-upload-area/cor-upload-area.enums';
export * from './components/cor-upload-file-item/cor-upload-file-item.enums';

export type { CorAccordionToggleEventDetail } from './components/cor-accordion/cor-accordion.types';
export type { BreadcrumbItemClickEvent } from './components/cor-breadcrumbs/cor-breadcrumbs.types';
export type { BreadcrumbsEllipsisItemClickEvent } from './components/cor-breadcrumbs-ellipsis/cor-breadcrumbs-ellipsis.types';
export type { CorChipClickEventDetail } from './components/cor-chip/cor-chip.types';
export type { CorTimelineChangeEvent, CorTimelineScrollEndEvent } from './components/cor-timeline/cor-timeline.types';
export type {
  DateChangePayload,
  RangeChangePayload,
  MonthChangePayload,
  CorCalendarEvent,
} from './components/cor-calendar/cor-calendar.types';
export type {
  DatepickerChangePayload,
  DatepickerRangeChangePayload,
} from './components/cor-datepicker/cor-datepicker.types';
export type {
  CorUploadFile,
  CorRejectedFile,
  CorUploadConstraints,
} from './components/cor-upload-area/cor-upload-area.types';
