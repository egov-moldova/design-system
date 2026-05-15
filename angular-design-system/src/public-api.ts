/* eslint-disable */
/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: angular-design-system/scripts/generate-public-api.mjs
 *
 * Re-exports the upstream @age/design-system public surface that
 * Angular consumers need: component prop interfaces (Components, JSX),
 * runtime enums, icon name constants, and Stencil CustomEvent generics.
 *
 * The wrapper's main entry point (src/index.ts) re-exports from here so
 * everything is reachable as `import { … } from '@age/angular-design-system'`.
 */

// ---------------------------------------------------------------------------
// Component prop interfaces & JSX namespace
// ---------------------------------------------------------------------------

/** Stencil-generated namespace; `Components.CorButton` etc. for typing refs. */
export type { Components, JSX } from '@age/design-system';

// ---------------------------------------------------------------------------
// Icon name constant + literal-union type
// ---------------------------------------------------------------------------

export { ICON_NAMES } from '@age/design-system';
export type { IconName } from '@age/design-system';

// ---------------------------------------------------------------------------
// Component-specific runtime enums (auto-discovered from upstream build)
// ---------------------------------------------------------------------------

export {
  AccordionIconPosition,
  AccordionSize,
  AvatarSize,
  BadgeInteractiveSize,
  BadgeSize,
  BadgeStatus,
  BadgeVariant,
  BreadcrumbsEllipsisListPosition,
  ButtonSize,
  ButtonVariant,
  CalendarMode,
  CalendarWeekStart,
  CellAlign,
  CheckboxGroupOrientation,
  CheckboxSize,
  ChipSize,
  ColumnAlign,
  CorBannerNotificationState,
  CorInlineNotificationState,
  CorInlineNotificationVariant,
  CorTimelineScaleType,
  CorTimelineSelectorType,
  CorTimelineVariant,
  CorToastNotificationState,
  DatepickerMode,
  DatepickerSize,
  FileItemState,
  GridBreakpoint,
  InputLabelPosition,
  InputSize,
  InputType,
  LabelSize,
  LabelState,
  LinkSize,
  LinkState,
  LinkUnderline,
  LoadingState,
  MenuButtonType,
  ModalPlacement,
  ModalSize,
  PaginationGoToSize,
  PaginationItemListPosition,
  PaginationItemSize,
  PaginationItemType,
  PaginationPageSizeSize,
  PaginationSize,
  PaginationStyle,
  ProgressBarSize,
  ProgressBarType,
  RadioButtonGroupOrientation,
  RadioButtonSize,
  SelectItemVariant,
  SelectListPosition,
  SelectSize,
  SeparatorVariant,
  SlotSize,
  SortingSize,
  SpinnerSize,
  SystemMessageState,
  TabSize,
  TabStyle,
  TableSize,
  TextareaLabelPosition,
  TextareaResize,
  ToastPosition,
  ToggleSize,
  TooltipPlacement,
  TooltipTrigger,
  UploadStyle,
  UploadVariant,
  textVariants,
} from '@age/design-system';

// ---------------------------------------------------------------------------
// Stencil CustomEvent<T> generic helpers — `@Output` payload typing
// ---------------------------------------------------------------------------

export type {
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
} from '@age/design-system';

// ---------------------------------------------------------------------------
// Named event-detail interfaces (the `detail` payload inside CustomEvent<T>)
// ---------------------------------------------------------------------------

export type {
  BreadcrumbItemClickEvent,
  BreadcrumbsEllipsisItemClickEvent,
  CorAccordionToggleEventDetail,
  CorCalendarEvent,
  CorChipClickEventDetail,
  CorRejectedFile,
  CorTimelineChangeEvent,
  CorTimelineScrollEndEvent,
  CorUploadConstraints,
  CorUploadFile,
  DateChangePayload,
  DatepickerChangePayload,
  DatepickerRangeChangePayload,
  MonthChangePayload,
  RangeChangePayload,
} from '@age/design-system';
