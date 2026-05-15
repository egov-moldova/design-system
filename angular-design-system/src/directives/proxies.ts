/* tslint:disable */
/* auto-generated angular directive proxies */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  NgZone,
} from '@angular/core';

import { ProxyCmp } from './angular-component-lib/utils';

import type { Components } from '@age/design-system/components';

import { defineCustomElement as defineCorAccordion } from '@age/design-system/components/cor-accordion.js';
import { defineCustomElement as defineCorAvatar } from '@age/design-system/components/cor-avatar.js';
import { defineCustomElement as defineCorAvatarGroup } from '@age/design-system/components/cor-avatar-group.js';
import { defineCustomElement as defineCorBadge } from '@age/design-system/components/cor-badge.js';
import { defineCustomElement as defineCorBadgeInteractive } from '@age/design-system/components/cor-badge-interactive.js';
import { defineCustomElement as defineCorBannerNotification } from '@age/design-system/components/cor-banner-notification.js';
import { defineCustomElement as defineCorBreadcrumbs } from '@age/design-system/components/cor-breadcrumbs.js';
import { defineCustomElement as defineCorBreadcrumbsEllipsis } from '@age/design-system/components/cor-breadcrumbs-ellipsis.js';
import { defineCustomElement as defineCorButton } from '@age/design-system/components/cor-button.js';
import { defineCustomElement as defineCorCalendar } from '@age/design-system/components/cor-calendar.js';
import { defineCustomElement as defineCorCell } from '@age/design-system/components/cor-cell.js';
import { defineCustomElement as defineCorCheckbox } from '@age/design-system/components/cor-checkbox.js';
import { defineCustomElement as defineCorCheckboxGroup } from '@age/design-system/components/cor-checkbox-group.js';
import { defineCustomElement as defineCorChip } from '@age/design-system/components/cor-chip.js';
import { defineCustomElement as defineCorColumn } from '@age/design-system/components/cor-column.js';
import { defineCustomElement as defineCorColumnAction } from '@age/design-system/components/cor-column-action.js';
import { defineCustomElement as defineCorDatepicker } from '@age/design-system/components/cor-datepicker.js';
import { defineCustomElement as defineCorDatepickerDay } from '@age/design-system/components/cor-datepicker-day.js';
import { defineCustomElement as defineCorGrid } from '@age/design-system/components/cor-grid.js';
import { defineCustomElement as defineCorIcon } from '@age/design-system/components/cor-icon.js';
import { defineCustomElement as defineCorIllustration } from '@age/design-system/components/cor-illustration.js';
import { defineCustomElement as defineCorInlineNotification } from '@age/design-system/components/cor-inline-notification.js';
import { defineCustomElement as defineCorInput } from '@age/design-system/components/cor-input.js';
import { defineCustomElement as defineCorLabel } from '@age/design-system/components/cor-label.js';
import { defineCustomElement as defineCorLink } from '@age/design-system/components/cor-link.js';
import { defineCustomElement as defineCorLoading } from '@age/design-system/components/cor-loading.js';
import { defineCustomElement as defineCorLoadingDots } from '@age/design-system/components/cor-loading-dots.js';
import { defineCustomElement as defineCorLoadingPercentage } from '@age/design-system/components/cor-loading-percentage.js';
import { defineCustomElement as defineCorMenuButton } from '@age/design-system/components/cor-menu-button.js';
import { defineCustomElement as defineCorModal } from '@age/design-system/components/cor-modal.js';
import { defineCustomElement as defineCorPagination } from '@age/design-system/components/cor-pagination.js';
import { defineCustomElement as defineCorPaginationGoTo } from '@age/design-system/components/cor-pagination-go-to.js';
import { defineCustomElement as defineCorPaginationItem } from '@age/design-system/components/cor-pagination-item.js';
import { defineCustomElement as defineCorPaginationPageSize } from '@age/design-system/components/cor-pagination-page-size.js';
import { defineCustomElement as defineCorProgressBar } from '@age/design-system/components/cor-progress-bar.js';
import { defineCustomElement as defineCorRadioButton } from '@age/design-system/components/cor-radio-button.js';
import { defineCustomElement as defineCorRadioButtonGroup } from '@age/design-system/components/cor-radio-button-group.js';
import { defineCustomElement as defineCorRow } from '@age/design-system/components/cor-row.js';
import { defineCustomElement as defineCorScrollbar } from '@age/design-system/components/cor-scrollbar.js';
import { defineCustomElement as defineCorSelect } from '@age/design-system/components/cor-select.js';
import { defineCustomElement as defineCorSelectItem } from '@age/design-system/components/cor-select-item.js';
import { defineCustomElement as defineCorSeparator } from '@age/design-system/components/cor-separator.js';
import { defineCustomElement as defineCorSkeleton } from '@age/design-system/components/cor-skeleton.js';
import { defineCustomElement as defineCorSlot } from '@age/design-system/components/cor-slot.js';
import { defineCustomElement as defineCorSorting } from '@age/design-system/components/cor-sorting.js';
import { defineCustomElement as defineCorSpinner } from '@age/design-system/components/cor-spinner.js';
import { defineCustomElement as defineCorSystemMessage } from '@age/design-system/components/cor-system-message.js';
import { defineCustomElement as defineCorTabButton } from '@age/design-system/components/cor-tab-button.js';
import { defineCustomElement as defineCorTable } from '@age/design-system/components/cor-table.js';
import { defineCustomElement as defineCorTableHeader } from '@age/design-system/components/cor-table-header.js';
import { defineCustomElement as defineCorTabs } from '@age/design-system/components/cor-tabs.js';
import { defineCustomElement as defineCorTbody } from '@age/design-system/components/cor-tbody.js';
import { defineCustomElement as defineCorTextarea } from '@age/design-system/components/cor-textarea.js';
import { defineCustomElement as defineCorTfoot } from '@age/design-system/components/cor-tfoot.js';
import { defineCustomElement as defineCorThead } from '@age/design-system/components/cor-thead.js';
import { defineCustomElement as defineCorTimeline } from '@age/design-system/components/cor-timeline.js';
import { defineCustomElement as defineCorToastNotification } from '@age/design-system/components/cor-toast-notification.js';
import { defineCustomElement as defineCorToggle } from '@age/design-system/components/cor-toggle.js';
import { defineCustomElement as defineCorTooltip } from '@age/design-system/components/cor-tooltip.js';
import { defineCustomElement as defineCorTypography } from '@age/design-system/components/cor-typography.js';
import { defineCustomElement as defineCorUploadArea } from '@age/design-system/components/cor-upload-area.js';
import { defineCustomElement as defineCorUploadFileItem } from '@age/design-system/components/cor-upload-file-item.js';
@ProxyCmp({
  defineCustomElementFn: defineCorAccordion,
  inputs: ['disabled', 'iconPosition', 'open', 'size', 'skeleton'],
})
@Component({
  selector: 'cor-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'iconPosition', 'open', 'size', 'skeleton'],
  outputs: ['corAccordionToggle'],
})
export class CorAccordion {
  protected el: HTMLCorAccordionElement;
  @Output() corAccordionToggle = new EventEmitter<CustomEvent<ICorAccordionCorAccordionToggleEventDetail>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

import type { CorAccordionToggleEventDetail as ICorAccordionCorAccordionToggleEventDetail } from '@age/design-system/components';

export declare interface CorAccordion extends Components.CorAccordion {
  /**
   * Emitted after every expand/collapse toggle
   */
  corAccordionToggle: EventEmitter<CustomEvent<ICorAccordionCorAccordionToggleEventDetail>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorAvatar,
  inputs: ['active', 'disabled', 'hovered', 'initials', 'label', 'pressed', 'size', 'skeleton'],
})
@Component({
  selector: 'cor-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['active', 'disabled', 'hovered', 'initials', 'label', 'pressed', 'size', 'skeleton'],
})
export class CorAvatar {
  protected el: HTMLCorAvatarElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorAvatar extends Components.CorAvatar {}

@ProxyCmp({
  defineCustomElementFn: defineCorAvatarGroup,
  inputs: ['label', 'max', 'size'],
})
@Component({
  selector: 'cor-avatar-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'max', 'size'],
})
export class CorAvatarGroup {
  protected el: HTMLCorAvatarGroupElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorAvatarGroup extends Components.CorAvatarGroup {}

@ProxyCmp({
  defineCustomElementFn: defineCorBadge,
  inputs: ['size', 'status', 'variant'],
})
@Component({
  selector: 'cor-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['size', 'status', 'variant'],
})
export class CorBadge {
  protected el: HTMLCorBadgeElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorBadge extends Components.CorBadge {}

@ProxyCmp({
  defineCustomElementFn: defineCorBadgeInteractive,
  inputs: ['disabled', 'selected', 'size', 'skeleton'],
})
@Component({
  selector: 'cor-badge-interactive',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'selected', 'size', 'skeleton'],
  outputs: ['corClick'],
})
export class CorBadgeInteractive {
  protected el: HTMLCorBadgeInteractiveElement;
  @Output() corClick = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorBadgeInteractive extends Components.CorBadgeInteractive {
  /**
   * Emitted when the badge is clicked
   */
  corClick: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorBannerNotification,
  inputs: ['dismissible', 'state'],
})
@Component({
  selector: 'cor-banner-notification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['dismissible', 'state'],
  outputs: ['corDismiss'],
})
export class CorBannerNotification {
  protected el: HTMLCorBannerNotificationElement;
  @Output() corDismiss = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorBannerNotification extends Components.CorBannerNotification {
  /**
   * Emitted when the user dismisses the banner.
   */
  corDismiss: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorBreadcrumbs,
  inputs: ['disabled', 'navLabel'],
})
@Component({
  selector: 'cor-breadcrumbs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'navLabel'],
  outputs: ['corBreadcrumbItemClick'],
})
export class CorBreadcrumbs {
  protected el: HTMLCorBreadcrumbsElement;
  @Output() corBreadcrumbItemClick = new EventEmitter<CustomEvent<ICorBreadcrumbsBreadcrumbItemClickEvent>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

import type { BreadcrumbItemClickEvent as ICorBreadcrumbsBreadcrumbItemClickEvent } from '@age/design-system/components';

export declare interface CorBreadcrumbs extends Components.CorBreadcrumbs {
  /**
   * Emitted when any breadcrumb item is clicked.
   */
  corBreadcrumbItemClick: EventEmitter<CustomEvent<ICorBreadcrumbsBreadcrumbItemClickEvent>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorBreadcrumbsEllipsis,
  inputs: ['disabled', 'listPosition'],
})
@Component({
  selector: 'cor-breadcrumbs-ellipsis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'listPosition'],
  outputs: ['corEllipsisItemClick', 'corEllipsisOpen', 'corEllipsisClose'],
})
export class CorBreadcrumbsEllipsis {
  protected el: HTMLCorBreadcrumbsEllipsisElement;
  @Output() corEllipsisItemClick = new EventEmitter<
    CustomEvent<ICorBreadcrumbsEllipsisBreadcrumbsEllipsisItemClickEvent>
  >();
  @Output() corEllipsisOpen = new EventEmitter<CustomEvent<void>>();
  @Output() corEllipsisClose = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

import type { BreadcrumbsEllipsisItemClickEvent as ICorBreadcrumbsEllipsisBreadcrumbsEllipsisItemClickEvent } from '@age/design-system/components';

export declare interface CorBreadcrumbsEllipsis extends Components.CorBreadcrumbsEllipsis {
  /**
   * Emitted when a dropdown item is clicked.
   */
  corEllipsisItemClick: EventEmitter<CustomEvent<ICorBreadcrumbsEllipsisBreadcrumbsEllipsisItemClickEvent>>;
  /**
   * Emitted when the dropdown opens.
   */
  corEllipsisOpen: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when the dropdown closes.
   */
  corEllipsisClose: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorButton,
  inputs: ['iconOnly', 'size', 'variant'],
})
@Component({
  selector: 'cor-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['iconOnly', 'size', 'variant'],
})
export class CorButton {
  protected el: HTMLCorButtonElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorButton extends Components.CorButton {}

@ProxyCmp({
  defineCustomElementFn: defineCorCalendar,
  inputs: [
    'disabled',
    'disabledDates',
    'events',
    'headerStyle',
    'mode',
    'month',
    'rangeEnd',
    'rangeStart',
    'skeleton',
    'value',
    'weekStartsOn',
    'year',
  ],
})
@Component({
  selector: 'cor-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'disabled',
    'disabledDates',
    'events',
    'headerStyle',
    'mode',
    'month',
    'rangeEnd',
    'rangeStart',
    'skeleton',
    'value',
    'weekStartsOn',
    'year',
  ],
  outputs: ['corDateChange', 'corRangeChange', 'corMonthChange'],
})
export class CorCalendar {
  protected el: HTMLCorCalendarElement;
  @Output() corDateChange = new EventEmitter<CustomEvent<ICorCalendarDateChangePayload>>();
  @Output() corRangeChange = new EventEmitter<CustomEvent<ICorCalendarRangeChangePayload>>();
  @Output() corMonthChange = new EventEmitter<CustomEvent<ICorCalendarMonthChangePayload>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

import type { DateChangePayload as ICorCalendarDateChangePayload } from '@age/design-system/components';
import type { RangeChangePayload as ICorCalendarRangeChangePayload } from '@age/design-system/components';
import type { MonthChangePayload as ICorCalendarMonthChangePayload } from '@age/design-system/components';

export declare interface CorCalendar extends Components.CorCalendar {
  /**
   * Emitted when the user selects a date (single mode)
   */
  corDateChange: EventEmitter<CustomEvent<ICorCalendarDateChangePayload>>;
  /**
   * Emitted when either range boundary changes
   */
  corRangeChange: EventEmitter<CustomEvent<ICorCalendarRangeChangePayload>>;
  /**
   * Emitted when the user navigates to a different month
   */
  corMonthChange: EventEmitter<CustomEvent<ICorCalendarMonthChangePayload>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorCell,
  inputs: ['active', 'align', 'colIndex', 'interactive', 'minWidth', 'width'],
})
@Component({
  selector: 'cor-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['active', 'align', 'colIndex', 'interactive', 'minWidth', 'width'],
})
export class CorCell {
  protected el: HTMLCorCellElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorCell extends Components.CorCell {}

@ProxyCmp({
  defineCustomElementFn: defineCorCheckbox,
  inputs: ['checked', 'disabled', 'hovered', 'indeterminate', 'invalid', 'name', 'pressed', 'size', 'value'],
})
@Component({
  selector: 'cor-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['checked', 'disabled', 'hovered', 'indeterminate', 'invalid', 'name', 'pressed', 'size', 'value'],
  outputs: ['corChange'],
})
export class CorCheckbox {
  protected el: HTMLCorCheckboxElement;
  @Output() corChange = new EventEmitter<CustomEvent<boolean>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorCheckbox extends Components.CorCheckbox {
  /**
   * Emitted when checked state changes
   */
  corChange: EventEmitter<CustomEvent<boolean>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorCheckboxGroup,
  inputs: ['columns', 'disabled', 'gap', 'helperText', 'invalid', 'legend', 'name', 'orientation', 'size', 'value'],
})
@Component({
  selector: 'cor-checkbox-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['columns', 'disabled', 'gap', 'helperText', 'invalid', 'legend', 'name', 'orientation', 'size', 'value'],
  outputs: ['corChange'],
})
export class CorCheckboxGroup {
  protected el: HTMLCorCheckboxGroupElement;
  @Output() corChange = new EventEmitter<CustomEvent<string[]>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorCheckboxGroup extends Components.CorCheckboxGroup {
  /**
   * Emitted when checkbox selection changes (controlled mode)
   */
  corChange: EventEmitter<CustomEvent<string[]>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorChip,
  inputs: ['active', 'ariaLabel', 'disabled', 'error', 'size', 'skeleton'],
})
@Component({
  selector: 'cor-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['active', 'ariaLabel', 'disabled', 'error', 'size', 'skeleton'],
  outputs: ['corChipClick'],
})
export class CorChip {
  protected el: HTMLCorChipElement;
  @Output() corChipClick = new EventEmitter<CustomEvent<ICorChipCorChipClickEventDetail>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

import type { CorChipClickEventDetail as ICorChipCorChipClickEventDetail } from '@age/design-system/components';

export declare interface CorChip extends Components.CorChip {
  /**
   * Emitted when the chip is clicked (not emitted when disabled or skeleton)
   */
  corChipClick: EventEmitter<CustomEvent<ICorChipCorChipClickEventDetail>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorColumn,
  inputs: ['active', 'align', 'colIndex', 'field', 'minWidth', 'width'],
})
@Component({
  selector: 'cor-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['active', 'align', 'colIndex', 'field', 'minWidth', 'width'],
})
export class CorColumn {
  protected el: HTMLCorColumnElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorColumn extends Components.CorColumn {}

@ProxyCmp({
  defineCustomElementFn: defineCorColumnAction,
  inputs: ['active', 'disabled', 'hideFocusRing', 'tabbable', 'type'],
})
@Component({
  selector: 'cor-column-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['active', 'disabled', 'hideFocusRing', 'tabbable', 'type'],
  outputs: ['corAction', 'corActionBlur'],
})
export class CorColumnAction {
  protected el: HTMLCorColumnActionElement;
  @Output() corAction = new EventEmitter<CustomEvent<MouseEvent>>();
  @Output() corActionBlur = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorColumnAction extends Components.CorColumnAction {
  /**
   * Emitted when the action button is clicked
   */
  corAction: EventEmitter<CustomEvent<MouseEvent>>;
  /**
   * Emitted when the action button loses focus or click-outside occurs
   */
  corActionBlur: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorDatepicker,
  inputs: [
    'disabled',
    'disabledDates',
    'invalid',
    'label',
    'labelEnd',
    'mode',
    'name',
    'placeholder',
    'rangeEnd',
    'rangeStart',
    'required',
    'size',
    'value',
    'weekStartsOn',
    'withClearButton',
  ],
})
@Component({
  selector: 'cor-datepicker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'disabled',
    'disabledDates',
    'invalid',
    'label',
    'labelEnd',
    'mode',
    'name',
    'placeholder',
    'rangeEnd',
    'rangeStart',
    'required',
    'size',
    'value',
    'weekStartsOn',
    'withClearButton',
  ],
  outputs: ['corChange', 'corRangeChange', 'corBlur', 'corFocus'],
})
export class CorDatepicker {
  protected el: HTMLCorDatepickerElement;
  @Output() corChange = new EventEmitter<CustomEvent<ICorDatepickerDatepickerChangePayload>>();
  @Output() corRangeChange = new EventEmitter<CustomEvent<ICorDatepickerDatepickerRangeChangePayload>>();
  @Output() corBlur = new EventEmitter<CustomEvent<void>>();
  @Output() corFocus = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

import type { DatepickerChangePayload as ICorDatepickerDatepickerChangePayload } from '@age/design-system/components';
import type { DatepickerRangeChangePayload as ICorDatepickerDatepickerRangeChangePayload } from '@age/design-system/components';

export declare interface CorDatepicker extends Components.CorDatepicker {
  /**
   * Emitted when a date is selected in single mode
   */
  corChange: EventEmitter<CustomEvent<ICorDatepickerDatepickerChangePayload>>;
  /**
   * Emitted when either range boundary changes
   */
  corRangeChange: EventEmitter<CustomEvent<ICorDatepickerDatepickerRangeChangePayload>>;
  /**
   * Emitted when the composite loses focus
   */
  corBlur: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when the composite gains focus
   */
  corFocus: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorDatepickerDay,
  inputs: [
    'dateString',
    'day',
    'dayTabIndex',
    'disabled',
    'empty',
    'events',
    'rangeEnd',
    'rangeMiddle',
    'rangeStart',
    'selected',
    'skeleton',
    'today',
    'weekend',
  ],
})
@Component({
  selector: 'cor-datepicker-day',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'dateString',
    'day',
    'dayTabIndex',
    'disabled',
    'empty',
    'events',
    'rangeEnd',
    'rangeMiddle',
    'rangeStart',
    'selected',
    'skeleton',
    'today',
    'weekend',
  ],
  outputs: ['corDayClick', 'corDayFocus', 'corDayHover'],
})
export class CorDatepickerDay {
  protected el: HTMLCorDatepickerDayElement;
  @Output() corDayClick = new EventEmitter<CustomEvent<{ date: string; day: number }>>();
  @Output() corDayFocus = new EventEmitter<CustomEvent<{ date: string; day: number }>>();
  @Output() corDayHover = new EventEmitter<CustomEvent<{ date: string; active: boolean }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorDatepickerDay extends Components.CorDatepickerDay {
  /**
   * Emitted when this day cell is clicked
   */
  corDayClick: EventEmitter<CustomEvent<{ date: string; day: number }>>;
  /**
   * Emitted when this day cell receives focus
   */
  corDayFocus: EventEmitter<CustomEvent<{ date: string; day: number }>>;
  /**
   * Emitted when this day cell is hovered or unhovered
   */
  corDayHover: EventEmitter<CustomEvent<{ date: string; active: boolean }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorGrid,
  inputs: ['container', 'rowSpacing', 'size', 'spacing'],
})
@Component({
  selector: 'cor-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['container', 'rowSpacing', 'size', 'spacing'],
})
export class CorGrid {
  protected el: HTMLCorGridElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorGrid extends Components.CorGrid {}

@ProxyCmp({
  defineCustomElementFn: defineCorIcon,
  inputs: ['ariaLabel', 'color', 'disabled', 'height', 'interactive', 'name', 'size', 'width'],
})
@Component({
  selector: 'cor-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['ariaLabel', 'color', 'disabled', 'height', 'interactive', 'name', 'size', 'width'],
})
export class CorIcon {
  protected el: HTMLCorIconElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorIcon extends Components.CorIcon {}

@ProxyCmp({
  defineCustomElementFn: defineCorIllustration,
  inputs: ['alt', 'height', 'name', 'width'],
})
@Component({
  selector: 'cor-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['alt', 'height', 'name', 'width'],
})
export class CorIllustration {
  protected el: HTMLCorIllustrationElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorIllustration extends Components.CorIllustration {}

@ProxyCmp({
  defineCustomElementFn: defineCorInlineNotification,
  inputs: ['dismissible', 'state', 'variant'],
})
@Component({
  selector: 'cor-inline-notification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['dismissible', 'state', 'variant'],
  outputs: ['corDismiss'],
})
export class CorInlineNotification {
  protected el: HTMLCorInlineNotificationElement;
  @Output() corDismiss = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorInlineNotification extends Components.CorInlineNotification {
  /**
   * Emitted when the user dismisses the notification.
   */
  corDismiss: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorInput,
  inputs: [
    'autocomplete',
    'disabled',
    'inline',
    'inputId',
    'invalid',
    'label',
    'labelInfo',
    'labelPosition',
    'max',
    'maxlength',
    'min',
    'minlength',
    'name',
    'pattern',
    'placeholder',
    'required',
    'showLine',
    'size',
    'skeleton',
    'step',
    'type',
    'value',
    'withClearButton',
  ],
})
@Component({
  selector: 'cor-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'autocomplete',
    'disabled',
    'inline',
    'inputId',
    'invalid',
    'label',
    'labelInfo',
    'labelPosition',
    'max',
    'maxlength',
    'min',
    'minlength',
    'name',
    'pattern',
    'placeholder',
    'required',
    'showLine',
    'size',
    'skeleton',
    'step',
    'type',
    'value',
    'withClearButton',
  ],
  outputs: ['corInput', 'corBlur', 'corFocus'],
})
export class CorInput {
  protected el: HTMLCorInputElement;
  @Output() corInput = new EventEmitter<CustomEvent<string>>();
  @Output() corBlur = new EventEmitter<CustomEvent<void>>();
  @Output() corFocus = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorInput extends Components.CorInput {
  /**
   * Emitted when input value changes
   */
  corInput: EventEmitter<CustomEvent<string>>;
  /**
   * Emitted when input loses focus
   */
  corBlur: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when input gains focus
   */
  corFocus: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorLabel,
  inputs: ['as', 'showIcon', 'size', 'state'],
})
@Component({
  selector: 'cor-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['as', 'showIcon', 'size', 'state'],
})
export class CorLabel {
  protected el: HTMLCorLabelElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorLabel extends Components.CorLabel {}

@ProxyCmp({
  defineCustomElementFn: defineCorLink,
  inputs: ['ariaLabel', 'disabled', 'href', 'iconOnly', 'size', 'skeleton', 'state', 'target', 'underline'],
})
@Component({
  selector: 'cor-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['ariaLabel', 'disabled', 'href', 'iconOnly', 'size', 'skeleton', 'state', 'target', 'underline'],
})
export class CorLink {
  protected el: HTMLCorLinkElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorLink extends Components.CorLink {}

@ProxyCmp({
  defineCustomElementFn: defineCorLoading,
  inputs: ['label', 'state', 'value'],
})
@Component({
  selector: 'cor-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['label', 'state', 'value'],
})
export class CorLoading {
  protected el: HTMLCorLoadingElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorLoading extends Components.CorLoading {}

@ProxyCmp({
  defineCustomElementFn: defineCorLoadingDots,
})
@Component({
  selector: 'cor-loading-dots',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [],
})
export class CorLoadingDots {
  protected el: HTMLCorLoadingDotsElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorLoadingDots extends Components.CorLoadingDots {}

@ProxyCmp({
  defineCustomElementFn: defineCorLoadingPercentage,
  inputs: ['value'],
})
@Component({
  selector: 'cor-loading-percentage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['value'],
})
export class CorLoadingPercentage {
  protected el: HTMLCorLoadingPercentageElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorLoadingPercentage extends Components.CorLoadingPercentage {}

@ProxyCmp({
  defineCustomElementFn: defineCorMenuButton,
  inputs: ['disabled', 'iconLabel', 'iconOnly', 'selected', 'skeleton', 'type', 'value'],
})
@Component({
  selector: 'cor-menu-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'iconLabel', 'iconOnly', 'selected', 'skeleton', 'type', 'value'],
  outputs: ['corMenuSelect'],
})
export class CorMenuButton {
  protected el: HTMLCorMenuButtonElement;
  @Output() corMenuSelect = new EventEmitter<CustomEvent<{ value: string }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorMenuButton extends Components.CorMenuButton {
  /**
   * Emitted when the button is clicked (not disabled, not skeleton).
Does not update selected state internally — consumer is responsible.
   */
  corMenuSelect: EventEmitter<CustomEvent<{ value: string }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorModal,
  inputs: ['ariaLabel', 'closeOnBackdrop', 'closeOnEscape', 'hideHeader', 'open', 'placement', 'size'],
  methods: ['show', 'close'],
})
@Component({
  selector: 'cor-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['ariaLabel', 'closeOnBackdrop', 'closeOnEscape', 'hideHeader', 'open', 'placement', 'size'],
  outputs: ['corModalClose', 'corModalOpen'],
})
export class CorModal {
  protected el: HTMLCorModalElement;
  @Output() corModalClose = new EventEmitter<CustomEvent<void>>();
  @Output() corModalOpen = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorModal extends Components.CorModal {
  /**
   * Emitted when the modal is closed
   */
  corModalClose: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when the modal is opened
   */
  corModalOpen: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorPagination,
  inputs: ['currentPage', 'disabled', 'paginationStyle', 'shown', 'size', 'skeleton', 'totalPages'],
})
@Component({
  selector: 'cor-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['currentPage', 'disabled', 'paginationStyle', 'shown', 'size', 'skeleton', 'totalPages'],
  outputs: ['corPageChange'],
})
export class CorPagination {
  protected el: HTMLCorPaginationElement;
  @Output() corPageChange = new EventEmitter<CustomEvent<{ page: number }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorPagination extends Components.CorPagination {
  /**
   * Emitted when the user selects a page
   */
  corPageChange: EventEmitter<CustomEvent<{ page: number }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorPaginationGoTo,
  inputs: ['disabled', 'maxPage', 'minPage', 'page', 'size'],
})
@Component({
  selector: 'cor-pagination-go-to',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'maxPage', 'minPage', 'page', 'size'],
  outputs: ['corGoToPage'],
})
export class CorPaginationGoTo {
  protected el: HTMLCorPaginationGoToElement;
  @Output() corGoToPage = new EventEmitter<CustomEvent<{ page: number }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorPaginationGoTo extends Components.CorPaginationGoTo {
  /**
   * Emitted when the user clicks Go — carries the page number entered
   */
  corGoToPage: EventEmitter<CustomEvent<{ page: number }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorPaginationItem,
  inputs: [
    'collapsedPages',
    'disabled',
    'icon',
    'iconLabel',
    'itemType',
    'listPosition',
    'page',
    'selected',
    'size',
    'skeleton',
  ],
})
@Component({
  selector: 'cor-pagination-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'collapsedPages',
    'disabled',
    'icon',
    'iconLabel',
    'itemType',
    'listPosition',
    'page',
    'selected',
    'size',
    'skeleton',
  ],
  outputs: ['corItemClick'],
})
export class CorPaginationItem {
  protected el: HTMLCorPaginationItemElement;
  @Output() corItemClick = new EventEmitter<CustomEvent<{ page: number }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorPaginationItem extends Components.CorPaginationItem {
  /**
   * Emitted when a page number is clicked
   */
  corItemClick: EventEmitter<CustomEvent<{ page: number }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorPaginationPageSize,
  inputs: ['disabled', 'pageSize', 'pageSizes', 'size', 'totalItems'],
})
@Component({
  selector: 'cor-pagination-page-size',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'pageSize', 'pageSizes', 'size', 'totalItems'],
  outputs: ['corPageSizeChange'],
})
export class CorPaginationPageSize {
  protected el: HTMLCorPaginationPageSizeElement;
  @Output() corPageSizeChange = new EventEmitter<CustomEvent<{ pageSize: number }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorPaginationPageSize extends Components.CorPaginationPageSize {
  /**
   * Emitted when the user selects a new page size
   */
  corPageSizeChange: EventEmitter<CustomEvent<{ pageSize: number }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorProgressBar,
  inputs: ['animatePercentage', 'ariaLabel', 'showPercentage', 'size', 'type', 'value'],
})
@Component({
  selector: 'cor-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['animatePercentage', 'ariaLabel', 'showPercentage', 'size', 'type', 'value'],
})
export class CorProgressBar {
  protected el: HTMLCorProgressBarElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorProgressBar extends Components.CorProgressBar {}

@ProxyCmp({
  defineCustomElementFn: defineCorRadioButton,
  inputs: ['checked', 'disabled', 'invalid', 'name', 'size', 'value'],
})
@Component({
  selector: 'cor-radio-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'checked',
    'disabled',
    'invalid',
    { name: 'name', required: true },
    'size',
    { name: 'value', required: true },
  ],
  outputs: ['corChange'],
})
export class CorRadioButton {
  protected el: HTMLCorRadioButtonElement;
  @Output() corChange = new EventEmitter<CustomEvent<boolean>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorRadioButton extends Components.CorRadioButton {
  /**
   * Emitted when checked state changes
   */
  corChange: EventEmitter<CustomEvent<boolean>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorRadioButtonGroup,
  inputs: ['disabled', 'gap', 'helperText', 'invalid', 'legend', 'name', 'orientation', 'size', 'value'],
})
@Component({
  selector: 'cor-radio-button-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'disabled',
    'gap',
    'helperText',
    'invalid',
    'legend',
    { name: 'name', required: true },
    'orientation',
    'size',
    'value',
  ],
  outputs: ['corChange'],
})
export class CorRadioButtonGroup {
  protected el: HTMLCorRadioButtonGroupElement;
  @Output() corChange = new EventEmitter<CustomEvent<string>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorRadioButtonGroup extends Components.CorRadioButtonGroup {
  /**
   * Emitted when radio button selection changes (controlled mode)
   */
  corChange: EventEmitter<CustomEvent<string>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorRow,
  inputs: ['disabled', 'expandable', 'expanded', 'rowId', 'rowIndex', 'selectable', 'selected'],
})
@Component({
  selector: 'cor-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'expandable', 'expanded', 'rowId', 'rowIndex', 'selectable', 'selected'],
  outputs: ['corRowClick', 'corRowSelect', 'corRowExpand'],
})
export class CorRow {
  protected el: HTMLCorRowElement;
  @Output() corRowClick = new EventEmitter<CustomEvent<{ rowId: string }>>();
  @Output() corRowSelect = new EventEmitter<CustomEvent<{ rowId: string; selected: boolean }>>();
  @Output() corRowExpand = new EventEmitter<CustomEvent<{ rowId: string; expanded: boolean }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorRow extends Components.CorRow {
  /**
   * Emitted when the row is clicked
   */
  corRowClick: EventEmitter<CustomEvent<{ rowId: string }>>;
  /**
   * Emitted when selection is requested (checkbox toggle)
   */
  corRowSelect: EventEmitter<CustomEvent<{ rowId: string; selected: boolean }>>;
  /**
   * Emitted when expansion is requested
   */
  corRowExpand: EventEmitter<CustomEvent<{ rowId: string; expanded: boolean }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorScrollbar,
})
@Component({
  selector: 'cor-scrollbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [],
})
export class CorScrollbar {
  protected el: HTMLCorScrollbarElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorScrollbar extends Components.CorScrollbar {}

@ProxyCmp({
  defineCustomElementFn: defineCorSelect,
  inputs: [
    'disabled',
    'inline',
    'invalid',
    'listPosition',
    'name',
    'placeholder',
    'required',
    'selectId',
    'size',
    'value',
  ],
})
@Component({
  selector: 'cor-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'disabled',
    'inline',
    'invalid',
    'listPosition',
    'name',
    'placeholder',
    'required',
    'selectId',
    'size',
    'value',
  ],
  outputs: ['corChange', 'corBlur', 'corFocus'],
})
export class CorSelect {
  protected el: HTMLCorSelectElement;
  @Output() corChange = new EventEmitter<CustomEvent<{ value: string }>>();
  @Output() corBlur = new EventEmitter<CustomEvent<void>>();
  @Output() corFocus = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorSelect extends Components.CorSelect {
  /**
   * Emitted when select value changes
   */
  corChange: EventEmitter<CustomEvent<{ value: string }>>;
  /**
   * Emitted when select loses focus
   */
  corBlur: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when select gains focus
   */
  corFocus: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorSelectItem,
  inputs: ['description', 'disabled', 'indeterminate', 'label', 'selected', 'value', 'variant'],
})
@Component({
  selector: 'cor-select-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['description', 'disabled', 'indeterminate', 'label', 'selected', 'value', 'variant'],
  outputs: ['corSelectionChange'],
})
export class CorSelectItem {
  protected el: HTMLCorSelectItemElement;
  @Output() corSelectionChange = new EventEmitter<CustomEvent<boolean>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorSelectItem extends Components.CorSelectItem {
  /**
   * Emitted when the selected state changes
   */
  corSelectionChange: EventEmitter<CustomEvent<boolean>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorSeparator,
  inputs: ['variant'],
})
@Component({
  selector: 'cor-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['variant'],
})
export class CorSeparator {
  protected el: HTMLCorSeparatorElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorSeparator extends Components.CorSeparator {}

@ProxyCmp({
  defineCustomElementFn: defineCorSkeleton,
  inputs: ['backgroundColor', 'borderRadius', 'height', 'width'],
})
@Component({
  selector: 'cor-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['backgroundColor', 'borderRadius', 'height', 'width'],
})
export class CorSkeleton {
  protected el: HTMLCorSkeletonElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorSkeleton extends Components.CorSkeleton {}

@ProxyCmp({
  defineCustomElementFn: defineCorSlot,
  inputs: ['size'],
})
@Component({
  selector: 'cor-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['size'],
})
export class CorSlot {
  protected el: HTMLCorSlotElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorSlot extends Components.CorSlot {}

@ProxyCmp({
  defineCustomElementFn: defineCorSorting,
  inputs: ['disabled', 'label', 'size', 'value'],
})
@Component({
  selector: 'cor-sorting',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'label', 'size', 'value'],
  outputs: ['corSortingChange'],
})
export class CorSorting {
  protected el: HTMLCorSortingElement;
  @Output() corSortingChange = new EventEmitter<CustomEvent<string>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorSorting extends Components.CorSorting {
  /**
   * Emitted when the user selects an option. Payload is the `value` of the selected `cor-select-item`.
   */
  corSortingChange: EventEmitter<CustomEvent<string>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorSpinner,
  inputs: ['hideDots', 'label', 'size'],
})
@Component({
  selector: 'cor-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['hideDots', 'label', 'size'],
})
export class CorSpinner {
  protected el: HTMLCorSpinnerElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorSpinner extends Components.CorSpinner {}

@ProxyCmp({
  defineCustomElementFn: defineCorSystemMessage,
  inputs: ['state'],
})
@Component({
  selector: 'cor-system-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['state'],
})
export class CorSystemMessage {
  protected el: HTMLCorSystemMessageElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorSystemMessage extends Components.CorSystemMessage {}

@ProxyCmp({
  defineCustomElementFn: defineCorTabButton,
  inputs: ['disabled', 'iconLabel', 'iconOnly', 'selected', 'size', 'skeleton', 'tabStyle', 'value'],
})
@Component({
  selector: 'cor-tab-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'iconLabel', 'iconOnly', 'selected', 'size', 'skeleton', 'tabStyle', 'value'],
  outputs: ['corTabSelect'],
})
export class CorTabButton {
  protected el: HTMLCorTabButtonElement;
  @Output() corTabSelect = new EventEmitter<CustomEvent<{ value: string }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorTabButton extends Components.CorTabButton {
  corTabSelect: EventEmitter<CustomEvent<{ value: string }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorTable,
  inputs: [
    'ariaDescribedBy',
    'ariaLabel',
    'ariaLabelledBy',
    'bordered',
    'colCount',
    'loading',
    'rowCount',
    'size',
    'zebra',
  ],
})
@Component({
  selector: 'cor-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'ariaDescribedBy',
    'ariaLabel',
    'ariaLabelledBy',
    'bordered',
    'colCount',
    'loading',
    'rowCount',
    'size',
    'zebra',
  ],
})
export class CorTable {
  protected el: HTMLCorTableElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorTable extends Components.CorTable {}

@ProxyCmp({
  defineCustomElementFn: defineCorTableHeader,
  inputs: ['bottomLine'],
})
@Component({
  selector: 'cor-table-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['bottomLine'],
})
export class CorTableHeader {
  protected el: HTMLCorTableHeaderElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorTableHeader extends Components.CorTableHeader {}

@ProxyCmp({
  defineCustomElementFn: defineCorTabs,
  inputs: ['disabled', 'error', 'label', 'size', 'tabStyle', 'value'],
})
@Component({
  selector: 'cor-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['disabled', 'error', 'label', 'size', 'tabStyle', 'value'],
  outputs: ['corTabChange'],
})
export class CorTabs {
  protected el: HTMLCorTabsElement;
  @Output() corTabChange = new EventEmitter<CustomEvent<{ value: string }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorTabs extends Components.CorTabs {
  corTabChange: EventEmitter<CustomEvent<{ value: string }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorTbody,
})
@Component({
  selector: 'cor-tbody',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [],
})
export class CorTbody {
  protected el: HTMLCorTbodyElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorTbody extends Components.CorTbody {}

@ProxyCmp({
  defineCustomElementFn: defineCorTextarea,
  inputs: [
    'cols',
    'disabled',
    'invalid',
    'label',
    'labelInfo',
    'labelPosition',
    'maxlength',
    'minlength',
    'name',
    'placeholder',
    'required',
    'resize',
    'rows',
    'skeleton',
    'textareaId',
    'value',
  ],
})
@Component({
  selector: 'cor-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'cols',
    'disabled',
    'invalid',
    'label',
    'labelInfo',
    'labelPosition',
    'maxlength',
    'minlength',
    'name',
    'placeholder',
    'required',
    'resize',
    'rows',
    'skeleton',
    'textareaId',
    'value',
  ],
  outputs: ['corInput', 'corBlur', 'corFocus'],
})
export class CorTextarea {
  protected el: HTMLCorTextareaElement;
  @Output() corInput = new EventEmitter<CustomEvent<string>>();
  @Output() corBlur = new EventEmitter<CustomEvent<void>>();
  @Output() corFocus = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorTextarea extends Components.CorTextarea {
  /**
   * Emitted when textarea value changes
   */
  corInput: EventEmitter<CustomEvent<string>>;
  /**
   * Emitted when textarea loses focus
   */
  corBlur: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when textarea gains focus
   */
  corFocus: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorTfoot,
  inputs: ['topLine'],
})
@Component({
  selector: 'cor-tfoot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['topLine'],
})
export class CorTfoot {
  protected el: HTMLCorTfootElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorTfoot extends Components.CorTfoot {}

@ProxyCmp({
  defineCustomElementFn: defineCorThead,
  inputs: ['expandable', 'selectAllChecked', 'selectAllIndeterminate', 'selectable'],
})
@Component({
  selector: 'cor-thead',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['expandable', 'selectAllChecked', 'selectAllIndeterminate', 'selectable'],
  outputs: ['corSelectAll'],
})
export class CorThead {
  protected el: HTMLCorTheadElement;
  @Output() corSelectAll = new EventEmitter<CustomEvent<{ selected: boolean }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorThead extends Components.CorThead {
  /**
   * Emitted when select-all checkbox is toggled
   */
  corSelectAll: EventEmitter<CustomEvent<{ selected: boolean }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorTimeline,
  inputs: ['max', 'min', 'scaleType', 'selectorType', 'step', 'value', 'variant'],
  methods: ['scrollToValue'],
})
@Component({
  selector: 'cor-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['max', 'min', 'scaleType', 'selectorType', 'step', 'value', 'variant'],
  outputs: ['corTimelineChange', 'corTimelineScrollEnd'],
})
export class CorTimeline {
  protected el: HTMLCorTimelineElement;
  @Output() corTimelineChange = new EventEmitter<CustomEvent<ICorTimelineCorTimelineChangeEvent>>();
  @Output() corTimelineScrollEnd = new EventEmitter<CustomEvent<ICorTimelineCorTimelineScrollEndEvent>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

import type { CorTimelineChangeEvent as ICorTimelineCorTimelineChangeEvent } from '@age/design-system/components';
import type { CorTimelineScrollEndEvent as ICorTimelineCorTimelineScrollEndEvent } from '@age/design-system/components';

export declare interface CorTimeline extends Components.CorTimeline {
  /**
   * Fired when selector value changes via keyboard or programmatic update
   */
  corTimelineChange: EventEmitter<CustomEvent<ICorTimelineCorTimelineChangeEvent>>;
  /**
   * Fired when the scroll container stops scrolling
   */
  corTimelineScrollEnd: EventEmitter<CustomEvent<ICorTimelineCorTimelineScrollEndEvent>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorToastNotification,
  inputs: ['autoClose', 'dismissible', 'position', 'state'],
})
@Component({
  selector: 'cor-toast-notification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['autoClose', 'dismissible', 'position', 'state'],
  outputs: ['corDismiss'],
})
export class CorToastNotification {
  protected el: HTMLCorToastNotificationElement;
  @Output() corDismiss = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorToastNotification extends Components.CorToastNotification {
  /**
   * Emitted when the toast is dismissed (by button, timeout, or programmatically).
   */
  corDismiss: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorToggle,
  inputs: ['checked', 'disabled', 'invalid', 'name', 'size', 'value'],
})
@Component({
  selector: 'cor-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['checked', 'disabled', 'invalid', 'name', 'size', 'value'],
  outputs: ['corChange'],
})
export class CorToggle {
  protected el: HTMLCorToggleElement;
  @Output() corChange = new EventEmitter<CustomEvent<boolean>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorToggle extends Components.CorToggle {
  /**
   * Emitted when checked state changes
   */
  corChange: EventEmitter<CustomEvent<boolean>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorTooltip,
  inputs: [
    'disabled',
    'flipFallback',
    'hideDelay',
    'interactive',
    'maxWidth',
    'offset',
    'open',
    'placement',
    'showArrow',
    'showDelay',
    'trigger',
  ],
})
@Component({
  selector: 'cor-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'disabled',
    'flipFallback',
    'hideDelay',
    'interactive',
    'maxWidth',
    'offset',
    'open',
    'placement',
    'showArrow',
    'showDelay',
    'trigger',
  ],
  outputs: ['corTooltipShow', 'corTooltipHide'],
})
export class CorTooltip {
  protected el: HTMLCorTooltipElement;
  @Output() corTooltipShow = new EventEmitter<CustomEvent<void>>();
  @Output() corTooltipHide = new EventEmitter<CustomEvent<void>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorTooltip extends Components.CorTooltip {
  corTooltipShow: EventEmitter<CustomEvent<void>>;

  corTooltipHide: EventEmitter<CustomEvent<void>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorTypography,
  inputs: ['color', 'variant'],
})
@Component({
  selector: 'cor-typography',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['color', 'variant'],
})
export class CorTypography {
  protected el: HTMLCorTypographyElement;
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorTypography extends Components.CorTypography {}

@ProxyCmp({
  defineCustomElementFn: defineCorUploadArea,
  inputs: [
    'accept',
    'browseLabel',
    'cancelLabel',
    'constraints',
    'generatePreview',
    'isUploading',
    'progress',
    'uploadStyle',
    'variant',
  ],
})
@Component({
  selector: 'cor-upload-area',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: [
    'accept',
    'browseLabel',
    'cancelLabel',
    'constraints',
    'generatePreview',
    'isUploading',
    'progress',
    'uploadStyle',
    'variant',
  ],
  outputs: [
    'corFilesSelected',
    'corFilesRejected',
    'corBrowseClick',
    'corCancelClick',
    'corDragEnter',
    'corDragLeave',
    'corDrop',
  ],
})
export class CorUploadArea {
  protected el: HTMLCorUploadAreaElement;
  @Output() corFilesSelected = new EventEmitter<CustomEvent<{ files: ICorUploadAreaCorUploadFile[] }>>();
  @Output() corFilesRejected = new EventEmitter<CustomEvent<{ files: ICorUploadAreaCorRejectedFile[] }>>();
  @Output() corBrowseClick = new EventEmitter<CustomEvent<void>>();
  @Output() corCancelClick = new EventEmitter<CustomEvent<void>>();
  @Output() corDragEnter = new EventEmitter<CustomEvent<void>>();
  @Output() corDragLeave = new EventEmitter<CustomEvent<void>>();
  @Output() corDrop = new EventEmitter<CustomEvent<{ files: FileList }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

import type { CorUploadFile as ICorUploadAreaCorUploadFile } from '@age/design-system/components';
import type { CorRejectedFile as ICorUploadAreaCorRejectedFile } from '@age/design-system/components';

export declare interface CorUploadArea extends Components.CorUploadArea {
  /**
   * Emitted after file validation succeeds. Payload contains accepted files.
   */
  corFilesSelected: EventEmitter<CustomEvent<{ files: ICorUploadAreaCorUploadFile[] }>>;
  /**
   * Emitted when one or more files fail validation. Payload contains rejected files with reasons.
   */
  corFilesRejected: EventEmitter<CustomEvent<{ files: ICorUploadAreaCorRejectedFile[] }>>;
  /**
   * Emitted when the browse button is clicked.
   */
  corBrowseClick: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when the cancel button is clicked.
   */
  corCancelClick: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when a drag enters the drop zone.
   */
  corDragEnter: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when a drag leaves the drop zone.
   */
  corDragLeave: EventEmitter<CustomEvent<void>>;
  /**
   * Emitted when files are dropped. Payload contains the raw FileList.
   */
  corDrop: EventEmitter<CustomEvent<{ files: FileList }>>;
}

@ProxyCmp({
  defineCustomElementFn: defineCorUploadFileItem,
  inputs: ['card', 'errorMessage', 'fileName', 'fileState', 'previewUrl', 'progress', 'withFrame'],
})
@Component({
  selector: 'cor-upload-file-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['card', 'errorMessage', 'fileName', 'fileState', 'previewUrl', 'progress', 'withFrame'],
  outputs: ['corRemoveFile'],
})
export class CorUploadFileItem {
  protected el: HTMLCorUploadFileItemElement;
  @Output() corRemoveFile = new EventEmitter<CustomEvent<{ fileName: string }>>();
  constructor(
    c: ChangeDetectorRef,
    r: ElementRef,
    protected z: NgZone,
  ) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CorUploadFileItem extends Components.CorUploadFileItem {
  /**
   * Emitted when the remove (×) button is clicked.
   */
  corRemoveFile: EventEmitter<CustomEvent<{ fileName: string }>>;
}
