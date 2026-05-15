import { Component, Host, Prop, Event, EventEmitter, State, Listen, Element, h } from '@stencil/core';

import { IconSize } from '../cor-icon/cor-icon.types';
import { CalendarMode, CalendarWeekStart } from './cor-calendar.enums';
import { CorCalendarEvent, DateChangePayload, MonthChangePayload, RangeChangePayload } from './cor-calendar.types';
import { ICON_NAMES } from '../..';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS_SUN: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAYS_MON: string[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const WEEKEND_INDICES_SUN: number[] = [0, 6];
const WEEKEND_INDICES_MON: number[] = [5, 6];

function toIso(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  if (!iso) return null;
  const parts = iso.split('-');
  if (parts.length !== 3) return null;
  return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
}

function compareDates(a: string, b: string): number {
  if (!a || !b) return 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Standalone calendar panel component — single date or range selection with optional event markers.
 *
 * @element cor-calendar
 */
@Component({
  tag: 'cor-calendar',
  styleUrl: 'cor-calendar.css',
  shadow: true,
})
export class CorCalendar {
  /**
   * Selection mode: single date or date range
   * @default single
   */
  @Prop({ reflect: true }) mode: CalendarMode = CalendarMode.SINGLE;

  /**
   * Selected date in ISO format (YYYY-MM-DD) — single mode
   */
  @Prop({ mutable: true }) value?: string;

  /**
   * Range start date in ISO format (YYYY-MM-DD)
   */
  @Prop({ mutable: true }) rangeStart?: string;

  /**
   * Range end date in ISO format (YYYY-MM-DD)
   */
  @Prop({ mutable: true }) rangeEnd?: string;

  /**
   * Displayed month (1–12)
   */
  @Prop({ mutable: true }) month?: number;

  /**
   * Displayed year (4-digit)
   */
  @Prop({ mutable: true }) year?: number;

  /**
   * Disables all interaction
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Shows skeleton loading state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Array of event markers to display per date
   */
  @Prop() events: CorCalendarEvent[] = [];

  /**
   * Array of ISO date strings (YYYY-MM-DD) that are individually disabled.
   * These dates cannot be clicked/selected even when the calendar is not fully disabled.
   */
  @Prop({ mutable: true }) disabledDates: string[] = [];

  /**
   * Header layout variant.
   * Style 1 (default): [‹] [Month Year] [›]
   * Style 2: [Month Year ————] [‹] [›]
   * @default 1
   */
  @Prop({ reflect: true }) headerStyle: '1' | '2' = '1';

  /**
   * First day of the week
   * @default sun
   */
  @Prop({ reflect: true }) weekStartsOn: CalendarWeekStart = CalendarWeekStart.SUN;

  @Element() el!: HTMLElement;

  @State() private displayMonth: number = new Date().getMonth() + 1;
  @State() private displayYear: number = new Date().getFullYear();
  @State() private focusedDate: string = '';
  @State() private rangeActiveBoundary: 'start' | 'end' = 'start';
  @State() private hoverDate: string = '';

  private pendingFocusDate: string = '';

  componentWillLoad() {
    this.syncDisplayFromProps();
    this.focusedDate = this.findFirstFocusableDate();
  }

  componentDidUpdate() {
    if (this.pendingFocusDate) {
      const dateStr = this.pendingFocusDate;
      this.pendingFocusDate = '';
      this.focusDayCell(dateStr);
    }
  }

  private syncDisplayFromProps() {
    const now = new Date();
    this.displayMonth = this.month ?? now.getMonth() + 1;
    this.displayYear = this.year ?? now.getFullYear();
  }

  /**
   * Emitted when the user selects a date (single mode)
   */
  @Event() corDateChange!: EventEmitter<DateChangePayload>;

  /**
   * Emitted when either range boundary changes
   */
  @Event() corRangeChange!: EventEmitter<RangeChangePayload>;

  /**
   * Emitted when the user navigates to a different month
   */
  @Event() corMonthChange!: EventEmitter<MonthChangePayload>;

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    if (this.disabled || this.skeleton) return;

    const modifier = e.ctrlKey || e.metaKey;
    const isRange = this.mode === CalendarMode.RANGE;

    switch (e.key) {
      case 'Tab':
        if (isRange && this.rangeStart && this.rangeEnd) {
          e.preventDefault();
          this.cycleRangeBoundary(e.shiftKey);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (modifier) {
          this.navigateMonth(-1);
        } else if (isRange && this.rangeStart && this.rangeEnd) {
          this.moveRangeBoundary(-1);
        } else {
          this.moveFocus(-1);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (modifier) {
          this.navigateMonth(1);
        } else if (isRange && this.rangeStart && this.rangeEnd) {
          this.moveRangeBoundary(1);
        } else {
          this.moveFocus(1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (modifier) {
          this.navigateYear(-1);
        } else if (isRange && this.rangeStart && this.rangeEnd) {
          this.moveRangeBoundary(-7);
        } else {
          this.moveFocus(-7);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (modifier) {
          this.navigateYear(1);
        } else if (isRange && this.rangeStart && this.rangeEnd) {
          this.moveRangeBoundary(7);
        } else {
          this.moveFocus(7);
        }
        break;
      case 'Home':
        e.preventDefault();
        this.moveFocusToWeekEdge('start');
        break;
      case 'End':
        e.preventDefault();
        this.moveFocusToWeekEdge('end');
        break;
      case 'PageUp':
        e.preventDefault();
        this.navigateMonth(-1);
        break;
      case 'PageDown':
        e.preventDefault();
        this.navigateMonth(1);
        break;
    }
  }

  private cycleRangeBoundary(reverse: boolean) {
    const next = this.rangeActiveBoundary === 'start' ? 'end' : 'start';
    const targetDate = reverse
      ? this.rangeActiveBoundary === 'end'
        ? this.rangeStart!
        : this.rangeEnd!
      : this.rangeActiveBoundary === 'start'
        ? this.rangeEnd!
        : this.rangeStart!;
    this.rangeActiveBoundary = next;
    this.navigateToDateAndFocus(targetDate);
  }

  private moveRangeBoundary(deltaDays: number) {
    this.hoverDate = '';
    const boundary = this.rangeActiveBoundary;
    const current = boundary === 'start' ? this.rangeStart : this.rangeEnd;
    if (!current) return;

    const parsed = parseIso(current);
    if (!parsed) return;

    const d = new Date(parsed.year, parsed.month - 1, parsed.day + deltaDays);
    const newDate = toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());

    let start = boundary === 'start' ? newDate : (this.rangeStart ?? newDate);
    let end = boundary === 'end' ? newDate : (this.rangeEnd ?? newDate);

    if (compareDates(start, end) > 0) {
      [start, end] = [end, start];
      this.rangeActiveBoundary = boundary === 'start' ? 'end' : 'start';
    }

    this.rangeStart = start;
    this.rangeEnd = end;
    this.corRangeChange.emit({ start, end, confirmed: false });
    this.navigateToDateAndFocus(newDate);
  }

  private navigateToDateAndFocus(dateStr: string) {
    const parsed = parseIso(dateStr);
    if (!parsed) return;
    const newMonth = parsed.month;
    const newYear = parsed.year;
    const monthChanged = newMonth !== this.displayMonth || newYear !== this.displayYear;
    this.focusedDate = dateStr;
    if (monthChanged) {
      this.pendingFocusDate = dateStr;
      this.displayMonth = newMonth;
      this.displayYear = newYear;
      if (this.month !== undefined) {
        this.month = newMonth;
        this.year = newYear;
      }
      this.corMonthChange.emit({ month: newMonth, year: newYear });
    } else {
      this.focusDayCell(dateStr);
    }
  }

  private moveFocus(deltaDays: number) {
    const current = this.focusedDate || this.findFirstFocusableDate();
    const parsed = parseIso(current);
    if (!parsed) return;

    const d = new Date(parsed.year, parsed.month - 1, parsed.day + deltaDays);
    const newDate = toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const newMonth = d.getMonth() + 1;
    const newYear = d.getFullYear();

    const monthChanged = newMonth !== this.displayMonth || newYear !== this.displayYear;

    if (monthChanged) {
      this.pendingFocusDate = newDate;
      this.displayMonth = newMonth;
      this.displayYear = newYear;
      if (this.month !== undefined) {
        this.month = newMonth;
        this.year = newYear;
      }
      this.corMonthChange.emit({ month: newMonth, year: newYear });
    }

    this.focusedDate = newDate;

    if (!monthChanged) {
      this.focusDayCell(newDate);
    }
  }

  private moveFocusToWeekEdge(edge: 'start' | 'end') {
    const current = this.focusedDate || this.findFirstFocusableDate();
    const parsed = parseIso(current);
    if (!parsed) return;

    const d = new Date(parsed.year, parsed.month - 1, parsed.day);
    const dow = d.getDay();

    let startOffset: number;
    if (this.weekStartsOn === CalendarWeekStart.MON) {
      startOffset = (dow + 6) % 7;
    } else {
      startOffset = dow;
    }

    const delta = edge === 'start' ? -startOffset : 6 - startOffset;
    if (delta === 0) {
      this.focusedDate = current;
      this.focusDayCell(current);
    } else {
      this.moveFocus(delta);
    }
  }

  private focusDayCell(dateStr: string) {
    const cells = this.el.shadowRoot?.querySelectorAll('cor-datepicker-day');
    if (!cells) return;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i] as HTMLElement & { dateString?: string };
      if (cell.dateString === dateStr) {
        const inner = cell.shadowRoot?.querySelector<HTMLElement>('.day-cell');
        inner?.focus();
        return;
      }
    }
  }

  private clampFocusToMonth(year: number, month: number): string {
    const current = this.focusedDate || this.findFirstFocusableDate();
    const parsed = parseIso(current);
    if (!parsed) return toIso(year, month, 1);
    const daysInNew = this.getDaysInMonth(year, month);
    const day = Math.min(parsed.day, daysInNew);
    return toIso(year, month, day);
  }

  private navigateMonth(delta: number) {
    if (this.disabled || this.skeleton) return;
    let m = this.displayMonth + delta;
    let y = this.displayYear;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    this.pendingFocusDate = this.clampFocusToMonth(y, m);
    this.focusedDate = this.pendingFocusDate;
    this.displayMonth = m;
    this.displayYear = y;
    if (this.month !== undefined) {
      this.month = m;
      this.year = y;
    }
    this.corMonthChange.emit({ month: m, year: y });
  }

  private navigateYear(delta: number) {
    if (this.disabled || this.skeleton) return;
    const y = this.displayYear + delta;
    this.pendingFocusDate = this.clampFocusToMonth(y, this.displayMonth);
    this.focusedDate = this.pendingFocusDate;
    this.displayYear = y;
    if (this.year !== undefined) {
      this.year = y;
    }
    this.corMonthChange.emit({ month: this.displayMonth, year: y });
  }

  private isDateDisabled(dateStr: string): boolean {
    if (!dateStr) return false;
    return (this.disabledDates ?? []).includes(dateStr);
  }

  private handleDayClick = (e: CustomEvent<{ date: string; day: number }>) => {
    if (this.disabled || this.skeleton) return;
    const { date } = e.detail;
    if (this.isDateDisabled(date)) return;

    if (this.mode === CalendarMode.SINGLE) {
      this.value = date;
      this.corDateChange.emit({ date });
    } else {
      const hasStart = !!this.rangeStart;
      const hasEnd = !!this.rangeEnd;

      if (hasStart && hasEnd) {
        // Both set → restart with new start, clear end
        this.rangeStart = date;
        this.rangeEnd = undefined;
        this.rangeActiveBoundary = 'start';
        this.corRangeChange.emit({ start: date, end: null, confirmed: false });
      } else if (hasStart && !hasEnd) {
        // Only start set → complete range by setting end
        let start = this.rangeStart!;
        let end = date;
        if (compareDates(end, start) < 0) [start, end] = [end, start];
        this.rangeStart = start;
        this.rangeEnd = end;
        this.rangeActiveBoundary = 'end';
        this.corRangeChange.emit({ start, end, confirmed: true });
      } else if (!hasStart && hasEnd) {
        // Only end set → complete range by setting start
        let start = date;
        let end = this.rangeEnd!;
        if (compareDates(end, start) < 0) [start, end] = [end, start];
        this.rangeStart = start;
        this.rangeEnd = end;
        this.rangeActiveBoundary = 'start';
        this.corRangeChange.emit({ start, end, confirmed: true });
      } else {
        // Neither set → set start
        this.rangeStart = date;
        this.rangeEnd = undefined;
        this.rangeActiveBoundary = 'start';
        this.corRangeChange.emit({ start: date, end: null, confirmed: false });
      }
    }
  };

  private handleDayHover = (e: CustomEvent<{ date: string; active: boolean }>) => {
    if (this.mode !== CalendarMode.RANGE) return;
    this.hoverDate = e.detail.active ? e.detail.date : '';
  };

  private handleDayFocus = (e: CustomEvent<{ date: string }>) => {
    const date = e.detail.date;
    if (this.focusedDate !== date) {
      this.focusedDate = date;
    }
    if (this.mode === CalendarMode.RANGE) {
      if (date === this.rangeEnd) {
        this.rangeActiveBoundary = 'end';
      } else {
        this.rangeActiveBoundary = 'start';
      }
      const hasOnlyStart = !!this.rangeStart && !this.rangeEnd;
      const hasOnlyEnd = !this.rangeStart && !!this.rangeEnd;
      if (hasOnlyStart || hasOnlyEnd) {
        this.hoverDate = date;
      }
    }
  };

  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  private getFirstDayOfWeek(year: number, month: number): number {
    const raw = new Date(year, month - 1, 1).getDay();
    if (this.weekStartsOn === CalendarWeekStart.MON) {
      return (raw + 6) % 7;
    }
    return raw;
  }

  private isWeekend(colIndex: number): boolean {
    if (this.weekStartsOn === CalendarWeekStart.MON) {
      return WEEKEND_INDICES_MON.includes(colIndex);
    }
    return WEEKEND_INDICES_SUN.includes(colIndex);
  }

  private getEventsForDate(dateStr: string): CorCalendarEvent[] {
    return (this.events ?? []).filter(ev => ev.date === dateStr);
  }

  private buildDayGrid(): Array<Array<{ day: number; dateStr: string; empty: boolean }>> {
    const year = this.displayYear;
    const month = this.displayMonth;
    const daysInMonth = this.getDaysInMonth(year, month);
    const firstDow = this.getFirstDayOfWeek(year, month);

    const cells: Array<{ day: number; dateStr: string; empty: boolean }> = [];

    for (let i = 0; i < firstDow; i++) {
      cells.push({ day: 0, dateStr: '', empty: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateStr: toIso(year, month, d), empty: false });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: 0, dateStr: '', empty: true });
    }

    const rows: Array<Array<{ day: number; dateStr: string; empty: boolean }>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }

  private isDaySelected(dateStr: string): boolean {
    return this.mode === CalendarMode.SINGLE && this.value === dateStr;
  }

  private getPreviewRange(): { start: string; end: string } | null {
    if (this.mode !== CalendarMode.RANGE) return null;
    const hasStart = !!this.rangeStart;
    const hasEnd = !!this.rangeEnd;
    if (hasStart && hasEnd) return null;
    const anchor = hasStart ? this.rangeStart! : hasEnd ? this.rangeEnd! : null;
    if (!anchor || !this.hoverDate) return null;
    const [s, e] = compareDates(anchor, this.hoverDate) <= 0 ? [anchor, this.hoverDate] : [this.hoverDate, anchor];
    return { start: s, end: e };
  }

  private isDayRangeStart(dateStr: string): boolean {
    if (this.mode !== CalendarMode.RANGE) return false;
    if (this.rangeStart === dateStr) return true;
    const preview = this.getPreviewRange();
    return !!preview && preview.start === dateStr;
  }

  private isDayRangeEnd(dateStr: string): boolean {
    if (this.mode !== CalendarMode.RANGE) return false;
    if (this.rangeEnd && this.rangeEnd === dateStr) return true;
    const preview = this.getPreviewRange();
    return !!preview && preview.end === dateStr;
  }

  private isDayRangeMiddle(dateStr: string): boolean {
    if (this.mode !== CalendarMode.RANGE) return false;
    const start = this.rangeStart;
    const end = this.rangeEnd;
    if (start && end) {
      return compareDates(dateStr, start) > 0 && compareDates(dateStr, end) < 0;
    }
    const preview = this.getPreviewRange();
    if (!preview) return false;
    return compareDates(dateStr, preview.start) > 0 && compareDates(dateStr, preview.end) < 0;
  }

  private isToday(dateStr: string): boolean {
    const now = new Date();
    const todayStr = toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return dateStr === todayStr;
  }

  private findFirstFocusableDate(): string {
    const year = this.displayYear;
    const month = this.displayMonth;

    const isInDisplayMonth = (iso: string | undefined): boolean => {
      if (!iso) return false;
      const p = parseIso(iso);
      return !!p && p.year === year && p.month === month;
    };

    if (this.mode === CalendarMode.SINGLE && isInDisplayMonth(this.value)) {
      return this.value!;
    }

    if (this.mode === CalendarMode.RANGE) {
      if (isInDisplayMonth(this.rangeStart)) return this.rangeStart!;
      if (isInDisplayMonth(this.rangeEnd)) return this.rangeEnd!;
    }

    return toIso(year, month, 1);
  }

  private renderNavButtons() {
    return [
      <cor-button variant="ghost" iconOnly class="nav-btn nav-btn--prev" size="sm">
        <button
          aria-label="Previous month"
          disabled={this.disabled || this.skeleton}
          onClick={() => this.navigateMonth(-1)}
          type="button"
          tabIndex={-1}
          icon-only
        >
          <cor-icon name={ICON_NAMES.ARROW__LEFT} size={IconSize.SM} color="primary-text-weak"></cor-icon>
        </button>
      </cor-button>,
      <cor-button variant="ghost" iconOnly class="nav-btn nav-btn--next" size="sm">
        <button
          aria-label="Next month"
          disabled={this.disabled || this.skeleton}
          onClick={() => this.navigateMonth(1)}
          type="button"
          tabIndex={-1}
          icon-only
        >
          <cor-icon name={ICON_NAMES.ARROW__RIGHT} size={IconSize.SM} color="primary-text-weak"></cor-icon>
        </button>
      </cor-button>,
    ];
  }

  private renderHeader() {
    const label = `${MONTH_NAMES[this.displayMonth - 1]} ${this.displayYear}`;
    const navBtns = this.renderNavButtons();

    if (this.headerStyle === '2') {
      return (
        <div class="header header--style-2">
          <span class="header-label">{label}</span>
          <div class="header-nav-group">{navBtns}</div>
        </div>
      );
    }

    return (
      <div class="header">
        {navBtns[0]}
        <span class="header-label">{label}</span>
        {navBtns[1]}
      </div>
    );
  }

  private renderWeekdays() {
    const labels = this.weekStartsOn === CalendarWeekStart.MON ? WEEKDAYS_MON : WEEKDAYS_SUN;

    return (
      <div class="weekdays" role="row">
        {labels.map((label, i) => (
          <div
            key={label + i}
            class={{ 'weekday': true, 'weekday--weekend': this.isWeekend(i) }}
            role="columnheader"
            aria-label={label}
          >
            {label}
          </div>
        ))}
      </div>
    );
  }

  private renderGrid() {
    const rows = this.buildDayGrid();
    const focusTarget = this.focusedDate || this.findFirstFocusableDate();

    return (
      <div class="grid" role="grid" aria-label={`${MONTH_NAMES[this.displayMonth - 1]} ${this.displayYear}`}>
        {rows.map((row, ri) => (
          <div key={`row-${ri}`} class="grid-row" role="row">
            {row.map((cell, ci) => {
              const isWeekend = this.isWeekend(ci);
              const eventsForDay = cell.empty ? [] : this.getEventsForDate(cell.dateStr);
              const tabIdx = !cell.empty && cell.dateStr === focusTarget ? 0 : -1;

              return (
                <cor-datepicker-day
                  key={cell.empty ? `empty-${ri}-${ci}` : cell.dateStr}
                  day={cell.day}
                  dateString={cell.dateStr}
                  empty={cell.empty}
                  weekend={isWeekend}
                  today={!cell.empty && !this.skeleton && this.isToday(cell.dateStr)}
                  selected={!cell.empty && !this.skeleton && this.isDaySelected(cell.dateStr)}
                  rangeStart={!cell.empty && !this.skeleton && this.isDayRangeStart(cell.dateStr)}
                  rangeEnd={!cell.empty && !this.skeleton && this.isDayRangeEnd(cell.dateStr)}
                  rangeMiddle={!cell.empty && !this.skeleton && this.isDayRangeMiddle(cell.dateStr)}
                  disabled={this.disabled || (!cell.empty && this.isDateDisabled(cell.dateStr))}
                  skeleton={this.skeleton}
                  events={this.skeleton ? [] : eventsForDay}
                  dayTabIndex={tabIdx}
                  onCorDayClick={this.handleDayClick}
                  onCorDayFocus={this.handleDayFocus}
                  onCorDayHover={this.handleDayHover}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  render() {
    return (
      <Host>
        <div class="panel">
          {this.renderHeader()}
          {this.renderWeekdays()}
          {this.renderGrid()}
        </div>
      </Host>
    );
  }
}
