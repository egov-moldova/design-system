/* eslint-disable */
/* tslint:disable */
/* auto-generated vue proxies */
import { defineContainer, type StencilVueComponent } from '@stencil/vue-output-target/runtime';

import type { JSX } from '@age/design-system';

export const CorAccordion: StencilVueComponent<JSX.CorAccordion> = /*@__PURE__*/ defineContainer<JSX.CorAccordion>(
  'cor-accordion',
  undefined,
  ['size', 'iconPosition', 'open', 'disabled', 'skeleton', 'corAccordionToggle'],
  ['corAccordionToggle'],
);

export const CorAvatar: StencilVueComponent<JSX.CorAvatar> = /*@__PURE__*/ defineContainer<JSX.CorAvatar>(
  'cor-avatar',
  undefined,
  ['size', 'initials', 'label', 'disabled', 'active', 'pressed', 'hovered', 'skeleton'],
);

export const CorAvatarGroup: StencilVueComponent<JSX.CorAvatarGroup> =
  /*@__PURE__*/ defineContainer<JSX.CorAvatarGroup>('cor-avatar-group', undefined, ['size', 'max', 'label']);

export const CorBadge: StencilVueComponent<JSX.CorBadge> = /*@__PURE__*/ defineContainer<JSX.CorBadge>(
  'cor-badge',
  undefined,
  ['status', 'variant', 'size'],
);

export const CorBadgeInteractive: StencilVueComponent<JSX.CorBadgeInteractive> =
  /*@__PURE__*/ defineContainer<JSX.CorBadgeInteractive>(
    'cor-badge-interactive',
    undefined,
    ['size', 'disabled', 'selected', 'skeleton', 'corClick'],
    ['corClick'],
  );

export const CorBannerNotification: StencilVueComponent<JSX.CorBannerNotification> =
  /*@__PURE__*/ defineContainer<JSX.CorBannerNotification>(
    'cor-banner-notification',
    undefined,
    ['state', 'dismissible', 'corDismiss'],
    ['corDismiss'],
  );

export const CorBreadcrumbs: StencilVueComponent<JSX.CorBreadcrumbs> =
  /*@__PURE__*/ defineContainer<JSX.CorBreadcrumbs>(
    'cor-breadcrumbs',
    undefined,
    ['navLabel', 'disabled', 'corBreadcrumbItemClick'],
    ['corBreadcrumbItemClick'],
  );

export const CorBreadcrumbsEllipsis: StencilVueComponent<JSX.CorBreadcrumbsEllipsis> =
  /*@__PURE__*/ defineContainer<JSX.CorBreadcrumbsEllipsis>(
    'cor-breadcrumbs-ellipsis',
    undefined,
    ['disabled', 'listPosition', 'corEllipsisItemClick', 'corEllipsisOpen', 'corEllipsisClose'],
    ['corEllipsisItemClick', 'corEllipsisOpen', 'corEllipsisClose'],
  );

export const CorButton: StencilVueComponent<JSX.CorButton> = /*@__PURE__*/ defineContainer<JSX.CorButton>(
  'cor-button',
  undefined,
  ['variant', 'size', 'iconOnly'],
);

export const CorCalendar: StencilVueComponent<JSX.CorCalendar> = /*@__PURE__*/ defineContainer<JSX.CorCalendar>(
  'cor-calendar',
  undefined,
  [
    'mode',
    'value',
    'rangeStart',
    'rangeEnd',
    'month',
    'year',
    'disabled',
    'skeleton',
    'events',
    'disabledDates',
    'headerStyle',
    'weekStartsOn',
    'corDateChange',
    'corRangeChange',
    'corMonthChange',
  ],
  ['corDateChange', 'corRangeChange', 'corMonthChange'],
);

export const CorCell: StencilVueComponent<JSX.CorCell> = /*@__PURE__*/ defineContainer<JSX.CorCell>(
  'cor-cell',
  undefined,
  ['align', 'colIndex', 'width', 'minWidth', 'interactive', 'active'],
);

export const CorCheckbox: StencilVueComponent<JSX.CorCheckbox> = /*@__PURE__*/ defineContainer<JSX.CorCheckbox>(
  'cor-checkbox',
  undefined,
  ['size', 'checked', 'indeterminate', 'disabled', 'invalid', 'hovered', 'pressed', 'name', 'value', 'corChange'],
  ['corChange'],
);

export const CorCheckboxGroup: StencilVueComponent<JSX.CorCheckboxGroup> =
  /*@__PURE__*/ defineContainer<JSX.CorCheckboxGroup>(
    'cor-checkbox-group',
    undefined,
    [
      'orientation',
      'columns',
      'gap',
      'name',
      'legend',
      'helperText',
      'size',
      'disabled',
      'invalid',
      'value',
      'corChange',
    ],
    ['corChange'],
  );

export const CorChip: StencilVueComponent<JSX.CorChip> = /*@__PURE__*/ defineContainer<JSX.CorChip>(
  'cor-chip',
  undefined,
  ['size', 'active', 'disabled', 'skeleton', 'error', 'ariaLabel', 'corChipClick'],
  ['corChipClick'],
);

export const CorColumn: StencilVueComponent<JSX.CorColumn> = /*@__PURE__*/ defineContainer<JSX.CorColumn>(
  'cor-column',
  undefined,
  ['field', 'align', 'active', 'width', 'minWidth', 'colIndex'],
);

export const CorColumnAction: StencilVueComponent<JSX.CorColumnAction> =
  /*@__PURE__*/ defineContainer<JSX.CorColumnAction>(
    'cor-column-action',
    undefined,
    ['disabled', 'active', 'tabbable', 'hideFocusRing', 'type', 'corAction', 'corActionBlur'],
    ['corAction', 'corActionBlur'],
  );

export const CorDatepicker: StencilVueComponent<JSX.CorDatepicker> = /*@__PURE__*/ defineContainer<JSX.CorDatepicker>(
  'cor-datepicker',
  undefined,
  [
    'mode',
    'value',
    'rangeStart',
    'rangeEnd',
    'label',
    'labelEnd',
    'placeholder',
    'size',
    'disabled',
    'invalid',
    'required',
    'name',
    'withClearButton',
    'weekStartsOn',
    'disabledDates',
    'corChange',
    'corRangeChange',
    'corBlur',
    'corFocus',
  ],
  ['corChange', 'corRangeChange', 'corBlur', 'corFocus'],
);

export const CorDatepickerDay: StencilVueComponent<JSX.CorDatepickerDay> =
  /*@__PURE__*/ defineContainer<JSX.CorDatepickerDay>(
    'cor-datepicker-day',
    undefined,
    [
      'day',
      'selected',
      'rangeStart',
      'rangeEnd',
      'rangeMiddle',
      'weekend',
      'today',
      'empty',
      'disabled',
      'skeleton',
      'events',
      'dateString',
      'dayTabIndex',
      'corDayClick',
      'corDayFocus',
      'corDayHover',
    ],
    ['corDayClick', 'corDayFocus', 'corDayHover'],
  );

export const CorGrid: StencilVueComponent<JSX.CorGrid> = /*@__PURE__*/ defineContainer<JSX.CorGrid>(
  'cor-grid',
  undefined,
  ['container', 'size', 'spacing', 'rowSpacing'],
);

export const CorIcon: StencilVueComponent<JSX.CorIcon> = /*@__PURE__*/ defineContainer<JSX.CorIcon>(
  'cor-icon',
  undefined,
  ['name', 'color', 'interactive', 'size', 'disabled', 'ariaLabel', 'width', 'height'],
);

export const CorIllustration: StencilVueComponent<JSX.CorIllustration> =
  /*@__PURE__*/ defineContainer<JSX.CorIllustration>('cor-illustration', undefined, ['name', 'alt', 'width', 'height']);

export const CorInlineNotification: StencilVueComponent<JSX.CorInlineNotification> =
  /*@__PURE__*/ defineContainer<JSX.CorInlineNotification>(
    'cor-inline-notification',
    undefined,
    ['state', 'dismissible', 'variant', 'corDismiss'],
    ['corDismiss'],
  );

export const CorInput: StencilVueComponent<JSX.CorInput> = /*@__PURE__*/ defineContainer<JSX.CorInput>(
  'cor-input',
  undefined,
  [
    'size',
    'labelPosition',
    'disabled',
    'invalid',
    'skeleton',
    'showLine',
    'withClearButton',
    'required',
    'inline',
    'labelInfo',
    'type',
    'placeholder',
    'label',
    'value',
    'name',
    'inputId',
    'min',
    'max',
    'step',
    'pattern',
    'minlength',
    'maxlength',
    'autocomplete',
    'corInput',
    'corBlur',
    'corFocus',
  ],
  ['corInput', 'corBlur', 'corFocus'],
);

export const CorLabel: StencilVueComponent<JSX.CorLabel> = /*@__PURE__*/ defineContainer<JSX.CorLabel>(
  'cor-label',
  undefined,
  ['size', 'state', 'showIcon', 'as'],
);

export const CorLink: StencilVueComponent<JSX.CorLink> = /*@__PURE__*/ defineContainer<JSX.CorLink>(
  'cor-link',
  undefined,
  ['size', 'state', 'href', 'target', 'ariaLabel', 'skeleton', 'iconOnly', 'disabled', 'underline'],
);

export const CorLoading: StencilVueComponent<JSX.CorLoading> = /*@__PURE__*/ defineContainer<JSX.CorLoading>(
  'cor-loading',
  undefined,
  ['value', 'state', 'label'],
);

export const CorLoadingDots: StencilVueComponent<JSX.CorLoadingDots> =
  /*@__PURE__*/ defineContainer<JSX.CorLoadingDots>('cor-loading-dots', undefined);

export const CorLoadingPercentage: StencilVueComponent<JSX.CorLoadingPercentage> =
  /*@__PURE__*/ defineContainer<JSX.CorLoadingPercentage>('cor-loading-percentage', undefined, ['value']);

export const CorMenuButton: StencilVueComponent<JSX.CorMenuButton> = /*@__PURE__*/ defineContainer<JSX.CorMenuButton>(
  'cor-menu-button',
  undefined,
  ['value', 'type', 'selected', 'disabled', 'skeleton', 'iconOnly', 'iconLabel', 'corMenuSelect'],
  ['corMenuSelect'],
);

export const CorModal: StencilVueComponent<JSX.CorModal> = /*@__PURE__*/ defineContainer<JSX.CorModal>(
  'cor-modal',
  undefined,
  [
    'open',
    'placement',
    'size',
    'hideHeader',
    'closeOnBackdrop',
    'closeOnEscape',
    'ariaLabel',
    'corModalClose',
    'corModalOpen',
  ],
  ['corModalClose', 'corModalOpen'],
);

export const CorPagination: StencilVueComponent<JSX.CorPagination> = /*@__PURE__*/ defineContainer<JSX.CorPagination>(
  'cor-pagination',
  undefined,
  ['size', 'paginationStyle', 'skeleton', 'currentPage', 'totalPages', 'shown', 'disabled', 'corPageChange'],
  ['corPageChange'],
);

export const CorPaginationGoTo: StencilVueComponent<JSX.CorPaginationGoTo> =
  /*@__PURE__*/ defineContainer<JSX.CorPaginationGoTo>(
    'cor-pagination-go-to',
    undefined,
    ['size', 'page', 'minPage', 'maxPage', 'disabled', 'corGoToPage'],
    ['corGoToPage'],
  );

export const CorPaginationItem: StencilVueComponent<JSX.CorPaginationItem> =
  /*@__PURE__*/ defineContainer<JSX.CorPaginationItem>(
    'cor-pagination-item',
    undefined,
    [
      'size',
      'itemType',
      'page',
      'icon',
      'iconLabel',
      'selected',
      'disabled',
      'skeleton',
      'collapsedPages',
      'listPosition',
      'corItemClick',
    ],
    ['corItemClick'],
  );

export const CorPaginationPageSize: StencilVueComponent<JSX.CorPaginationPageSize> =
  /*@__PURE__*/ defineContainer<JSX.CorPaginationPageSize>(
    'cor-pagination-page-size',
    undefined,
    ['size', 'pageSize', 'pageSizes', 'totalItems', 'disabled', 'corPageSizeChange'],
    ['corPageSizeChange'],
  );

export const CorProgressBar: StencilVueComponent<JSX.CorProgressBar> =
  /*@__PURE__*/ defineContainer<JSX.CorProgressBar>('cor-progress-bar', undefined, [
    'type',
    'size',
    'value',
    'showPercentage',
    'animatePercentage',
    'ariaLabel',
  ]);

export const CorRadioButton: StencilVueComponent<JSX.CorRadioButton> =
  /*@__PURE__*/ defineContainer<JSX.CorRadioButton>(
    'cor-radio-button',
    undefined,
    ['size', 'checked', 'disabled', 'invalid', 'name', 'value', 'corChange'],
    ['corChange'],
  );

export const CorRadioButtonGroup: StencilVueComponent<JSX.CorRadioButtonGroup> =
  /*@__PURE__*/ defineContainer<JSX.CorRadioButtonGroup>(
    'cor-radio-button-group',
    undefined,
    ['orientation', 'gap', 'name', 'legend', 'helperText', 'size', 'disabled', 'invalid', 'value', 'corChange'],
    ['corChange'],
  );

export const CorRow: StencilVueComponent<JSX.CorRow> = /*@__PURE__*/ defineContainer<JSX.CorRow>(
  'cor-row',
  undefined,
  [
    'rowId',
    'selectable',
    'selected',
    'disabled',
    'expandable',
    'expanded',
    'rowIndex',
    'corRowClick',
    'corRowSelect',
    'corRowExpand',
  ],
  ['corRowClick', 'corRowSelect', 'corRowExpand'],
);

export const CorScrollbar: StencilVueComponent<JSX.CorScrollbar> = /*@__PURE__*/ defineContainer<JSX.CorScrollbar>(
  'cor-scrollbar',
  undefined,
);

export const CorSelect: StencilVueComponent<JSX.CorSelect> = /*@__PURE__*/ defineContainer<JSX.CorSelect>(
  'cor-select',
  undefined,
  [
    'size',
    'disabled',
    'invalid',
    'required',
    'inline',
    'value',
    'name',
    'selectId',
    'placeholder',
    'listPosition',
    'corChange',
    'corBlur',
    'corFocus',
  ],
  ['corChange', 'corBlur', 'corFocus'],
);

export const CorSelectItem: StencilVueComponent<JSX.CorSelectItem> = /*@__PURE__*/ defineContainer<JSX.CorSelectItem>(
  'cor-select-item',
  undefined,
  ['variant', 'label', 'description', 'value', 'selected', 'disabled', 'indeterminate', 'corSelectionChange'],
  ['corSelectionChange'],
);

export const CorSeparator: StencilVueComponent<JSX.CorSeparator> = /*@__PURE__*/ defineContainer<JSX.CorSeparator>(
  'cor-separator',
  undefined,
  ['variant'],
);

export const CorSkeleton: StencilVueComponent<JSX.CorSkeleton> = /*@__PURE__*/ defineContainer<JSX.CorSkeleton>(
  'cor-skeleton',
  undefined,
  ['width', 'height', 'borderRadius', 'backgroundColor'],
);

export const CorSlot: StencilVueComponent<JSX.CorSlot> = /*@__PURE__*/ defineContainer<JSX.CorSlot>(
  'cor-slot',
  undefined,
  ['size'],
);

export const CorSorting: StencilVueComponent<JSX.CorSorting> = /*@__PURE__*/ defineContainer<JSX.CorSorting>(
  'cor-sorting',
  undefined,
  ['value', 'size', 'disabled', 'label', 'corSortingChange'],
  ['corSortingChange'],
);

export const CorSpinner: StencilVueComponent<JSX.CorSpinner> = /*@__PURE__*/ defineContainer<JSX.CorSpinner>(
  'cor-spinner',
  undefined,
  ['size', 'label', 'hideDots'],
);

export const CorSystemMessage: StencilVueComponent<JSX.CorSystemMessage> =
  /*@__PURE__*/ defineContainer<JSX.CorSystemMessage>('cor-system-message', undefined, ['state']);

export const CorTabButton: StencilVueComponent<JSX.CorTabButton> = /*@__PURE__*/ defineContainer<JSX.CorTabButton>(
  'cor-tab-button',
  undefined,
  ['value', 'size', 'tabStyle', 'selected', 'disabled', 'skeleton', 'iconOnly', 'iconLabel', 'corTabSelect'],
  ['corTabSelect'],
);

export const CorTable: StencilVueComponent<JSX.CorTable> = /*@__PURE__*/ defineContainer<JSX.CorTable>(
  'cor-table',
  undefined,
  ['size', 'zebra', 'bordered', 'ariaLabel', 'ariaLabelledBy', 'ariaDescribedBy', 'rowCount', 'colCount', 'loading'],
);

export const CorTableHeader: StencilVueComponent<JSX.CorTableHeader> =
  /*@__PURE__*/ defineContainer<JSX.CorTableHeader>('cor-table-header', undefined, ['bottomLine']);

export const CorTabs: StencilVueComponent<JSX.CorTabs> = /*@__PURE__*/ defineContainer<JSX.CorTabs>(
  'cor-tabs',
  undefined,
  ['tabStyle', 'size', 'value', 'disabled', 'error', 'label', 'corTabChange'],
  ['corTabChange'],
);

export const CorTbody: StencilVueComponent<JSX.CorTbody> = /*@__PURE__*/ defineContainer<JSX.CorTbody>(
  'cor-tbody',
  undefined,
);

export const CorTextarea: StencilVueComponent<JSX.CorTextarea> = /*@__PURE__*/ defineContainer<JSX.CorTextarea>(
  'cor-textarea',
  undefined,
  [
    'labelPosition',
    'disabled',
    'invalid',
    'skeleton',
    'required',
    'labelInfo',
    'resize',
    'placeholder',
    'label',
    'value',
    'name',
    'textareaId',
    'rows',
    'cols',
    'maxlength',
    'minlength',
    'corInput',
    'corBlur',
    'corFocus',
  ],
  ['corInput', 'corBlur', 'corFocus'],
);

export const CorTfoot: StencilVueComponent<JSX.CorTfoot> = /*@__PURE__*/ defineContainer<JSX.CorTfoot>(
  'cor-tfoot',
  undefined,
  ['topLine'],
);

export const CorThead: StencilVueComponent<JSX.CorThead> = /*@__PURE__*/ defineContainer<JSX.CorThead>(
  'cor-thead',
  undefined,
  ['selectable', 'expandable', 'selectAllChecked', 'selectAllIndeterminate', 'corSelectAll'],
  ['corSelectAll'],
);

export const CorTimeline: StencilVueComponent<JSX.CorTimeline> = /*@__PURE__*/ defineContainer<JSX.CorTimeline>(
  'cor-timeline',
  undefined,
  ['variant', 'scaleType', 'selectorType', 'min', 'max', 'step', 'value', 'corTimelineChange', 'corTimelineScrollEnd'],
  ['corTimelineChange', 'corTimelineScrollEnd'],
);

export const CorToastNotification: StencilVueComponent<JSX.CorToastNotification> =
  /*@__PURE__*/ defineContainer<JSX.CorToastNotification>(
    'cor-toast-notification',
    undefined,
    ['state', 'position', 'dismissible', 'autoClose', 'corDismiss'],
    ['corDismiss'],
  );

export const CorToggle: StencilVueComponent<JSX.CorToggle> = /*@__PURE__*/ defineContainer<JSX.CorToggle>(
  'cor-toggle',
  undefined,
  ['size', 'checked', 'disabled', 'invalid', 'name', 'value', 'corChange'],
  ['corChange'],
);

export const CorTooltip: StencilVueComponent<JSX.CorTooltip> = /*@__PURE__*/ defineContainer<JSX.CorTooltip>(
  'cor-tooltip',
  undefined,
  [
    'placement',
    'showArrow',
    'trigger',
    'open',
    'showDelay',
    'hideDelay',
    'interactive',
    'maxWidth',
    'disabled',
    'flipFallback',
    'offset',
    'corTooltipShow',
    'corTooltipHide',
  ],
  ['corTooltipShow', 'corTooltipHide'],
);

export const CorTypography: StencilVueComponent<JSX.CorTypography> = /*@__PURE__*/ defineContainer<JSX.CorTypography>(
  'cor-typography',
  undefined,
  ['variant', 'color'],
);

export const CorUploadArea: StencilVueComponent<JSX.CorUploadArea> = /*@__PURE__*/ defineContainer<JSX.CorUploadArea>(
  'cor-upload-area',
  undefined,
  [
    'variant',
    'uploadStyle',
    'isUploading',
    'progress',
    'browseLabel',
    'cancelLabel',
    'accept',
    'constraints',
    'generatePreview',
    'corFilesSelected',
    'corFilesRejected',
    'corBrowseClick',
    'corCancelClick',
    'corDragEnter',
    'corDragLeave',
    'corDrop',
  ],
  [
    'corFilesSelected',
    'corFilesRejected',
    'corBrowseClick',
    'corCancelClick',
    'corDragEnter',
    'corDragLeave',
    'corDrop',
  ],
);

export const CorUploadFileItem: StencilVueComponent<JSX.CorUploadFileItem> =
  /*@__PURE__*/ defineContainer<JSX.CorUploadFileItem>(
    'cor-upload-file-item',
    undefined,
    ['fileState', 'fileName', 'progress', 'errorMessage', 'withFrame', 'card', 'previewUrl', 'corRemoveFile'],
    ['corRemoveFile'],
  );
