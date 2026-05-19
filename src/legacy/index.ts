// Snapshot of the previous DS public export surface.
//
// This file is excluded from the TS/Stencil build (see tsconfig.json).
// It exists as a reference for which enums, types, and custom-event interfaces
// the legacy components exposed. Paths have been rewritten from
// `./components/cor-*` to `./cor-*` so that IDE go-to-definition resolves
// to the corresponding `src/legacy/cor-*/...` file.
//
// As each component is redesigned, re-introduce its exports into the active
// `src/index.ts` with updated paths (`./components/cor-*`).

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
} from '../components';

export { default as ICON_NAMES } from './cor-icon/assets/carbon-icon-names.json';
export type IconName = keyof typeof import('./cor-icon/assets/carbon-icon-names.json');

/** @deprecated Use ICON_NAMES instead */
export { default as CARBON_ICON_NAMES } from './cor-icon/assets/carbon-icon-names.json';
/** @deprecated Use IconName instead */
export type CarbonIconName = keyof typeof import('./cor-icon/assets/carbon-icon-names.json');

// Runtime enum values — exported so framework wrappers and consumers can import named constants
export * from './cor-accordion/cor-accordion.enums';
export * from './cor-avatar/cor-avatar.enums';
export * from './cor-badge/cor-badge.enums';
export * from './cor-badge-interactive/cor-badge-interactive.enums';
export { NotificationState as CorBannerNotificationState } from './cor-banner-notification/cor-banner-notification.enums';
export * from './cor-breadcrumbs-ellipsis/cor-breadcrumbs-ellipsis.enums';
export * from './cor-button/cor-button.enums';
export * from './cor-calendar/cor-calendar.enums';
export * from './cor-cell/cor-cell.enums';
export * from './cor-checkbox/cor-checkbox.enums';
export * from './cor-checkbox-group/cor-checkbox-group.enums';
export * from './cor-chip/cor-chip.enums';
export * from './cor-column/cor-column.enums';
export * from './cor-datepicker/cor-datepicker.enums';
export * from './cor-grid/cor-grid.enums';
export {
  NotificationState as CorInlineNotificationState,
  CorInlineNotificationVariant,
} from './cor-inline-notification/cor-inline-notification.enums';
export * from './cor-input/cor-input.enums';
export * from './cor-label/cor-label.enums';
export * from './cor-link/cor-link.enums';
export * from './cor-loading/cor-loading.enums';
export * from './cor-menu-button/cor-menu-button.enums';
export * from './cor-modal/cor-modal.enums';
export * from './cor-pagination/cor-pagination.enums';
export * from './cor-pagination-go-to/cor-pagination-go-to.enums';
export * from './cor-pagination-item/cor-pagination-item.enums';
export * from './cor-pagination-page-size/cor-pagination-page-size.enums';
export * from './cor-progress-bar/cor-progress-bar.enums';
export * from './cor-radio-button/cor-radio-button.enums';
export * from './cor-radio-button-group/cor-radio-button-group.enums';
export * from './cor-select/cor-select.enums';
export * from './cor-select-item/cor-select-item.enums';
export * from './cor-separator/cor-separator.enums';
export * from './cor-sorting/cor-sorting.enums';
export * from './cor-slot/cor-slot.enums';
export * from './cor-system-message/cor-system-message.enums';
export * from './cor-tab-button/cor-tab-button.enums';
export * from './cor-table/cor-table.enums';
export * from './cor-textarea/cor-textarea.enums';
export * from './cor-timeline/cor-timeline.enums';
// `NotificationState` collides with cor-banner-notification + cor-inline-notification
// (each defines its own enum with the same name). Alias here, the same way the
// other two notification components do, so the wrapper sees three distinct names.
export {
  NotificationState as CorToastNotificationState,
  ToastPosition,
} from './cor-toast-notification/cor-toast-notification.enums';
export * from './cor-toggle/cor-toggle.enums';
export * from './cor-tooltip/cor-tooltip.enums';
export * from './cor-typography/cor-typography.enums';
export * from './cor-upload-area/cor-upload-area.enums';
export * from './cor-upload-file-item/cor-upload-file-item.enums';

export type { CorAccordionToggleEventDetail } from './cor-accordion/cor-accordion.types';
export type { BreadcrumbItemClickEvent } from './cor-breadcrumbs/cor-breadcrumbs.types';
export type { BreadcrumbsEllipsisItemClickEvent } from './cor-breadcrumbs-ellipsis/cor-breadcrumbs-ellipsis.types';
export type { CorChipClickEventDetail } from './cor-chip/cor-chip.types';
export type { CorTimelineChangeEvent, CorTimelineScrollEndEvent } from './cor-timeline/cor-timeline.types';
export type {
  DateChangePayload,
  RangeChangePayload,
  MonthChangePayload,
  CorCalendarEvent,
} from './cor-calendar/cor-calendar.types';
export type {
  DatepickerChangePayload,
  DatepickerRangeChangePayload,
} from './cor-datepicker/cor-datepicker.types';
export type {
  CorUploadFile,
  CorRejectedFile,
  CorUploadConstraints,
} from './cor-upload-area/cor-upload-area.types';
