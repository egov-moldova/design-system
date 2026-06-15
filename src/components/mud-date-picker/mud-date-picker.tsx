import { Component, Element, Event, EventEmitter, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import { DATE_PICKER_BREAKPOINTS, DATE_PICKER_MODES, DATE_PICKER_VIEWS } from './mud-date-picker.types';
import type {
  DatePickerBreakpoint,
  DatePickerChangeDetail,
  DatePickerMode,
  DatePickerMonthChangeDetail,
  DatePickerView,
} from './mud-date-picker.types';

let datePickerInstanceCounter = 0;

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a `YYYY-MM-DD` ISO date into a UTC `Date` or null if malformed. */
function parseIso(iso: string | undefined | null): Date | null {
  if (!iso || !ISO_RE.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

function toIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${date.getUTCDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

function addUtcDays(date: Date, delta: number): Date {
  return new Date(date.getTime() + delta * MS_PER_DAY);
}

function compareIso(a: string, b: string): number {
  // ISO YYYY-MM-DD strings are lexicographically comparable.
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Romanian date picker — locale-aware calendar molecule.
 *
 * Three modes:
 * - `single` — pick exactly one date. `value` is `string` (ISO YYYY-MM-DD) or empty.
 * - `range` — pick a start + end. Click once to set `rangeStart`, click again to set `rangeEnd`;
 *   click outside the range to start a new range.
 * - `multi` — toggle individual dates. `value` is `string[]`.
 *
 * Three breakpoints (visual modes):
 * - `desktop` — 320px elevated card with shadow.
 * - `mobile` — full-width bottom-sheet style with drag handle.
 * - `docked` — compact (no shadow) intended to attach beneath a `mud-date-input`.
 *
 * All weekday + month labels come from `Intl.DateTimeFormat` so the locale prop drives the language —
 * no hard-coded strings. Romanian (`ro-RO`) is the default.
 *
 * Keyboard:
 * - Arrow keys move focus by day
 * - PageUp/PageDown change month
 * - Shift+PageUp/PageDown change year
 * - Home/End jump to the start/end of the visible week
 * - Enter/Space selects the focused day
 *
 * @element mud-date-picker
 */
@Component({
  tag: 'mud-date-picker',
  styleUrl: 'mud-date-picker.css',
  shadow: true,
})
export class MudDatePicker {
  /**
   * Selection mode.
   * @default 'single'
   */
  @Prop({ reflect: true }) mode: DatePickerMode = 'single';

  /**
   * Visual breakpoint / placement.
   * @default 'desktop'
   */
  @Prop({ reflect: true }) breakpoint: DatePickerBreakpoint = 'desktop';

  /**
   * Selected value:
   * - `single` → ISO `YYYY-MM-DD` string (or empty)
   * - `range` → ISO array `[start, end]` (use `rangeStart`/`rangeEnd` for explicit access)
   * - `multi` → array of ISO strings
   */
  @Prop({ mutable: true }) value?: string | string[];

  /** Range mode: start date (ISO `YYYY-MM-DD`). Set together with `rangeEnd`. */
  @Prop({ mutable: true }) rangeStart?: string;

  /** Range mode: end date (ISO `YYYY-MM-DD`). Set together with `rangeStart`. */
  @Prop({ mutable: true }) rangeEnd?: string;

  /** Inclusive lower bound (ISO `YYYY-MM-DD`). Dates before this are disabled. */
  @Prop() min?: string;

  /** Inclusive upper bound (ISO `YYYY-MM-DD`). Dates after this are disabled. */
  @Prop() max?: string;

  /** ISO `YYYY-MM-DD` strings that should be marked disabled (e.g. holidays). */
  @Prop() disabledDates?: string[];

  /** BCP-47 locale tag for weekday/month rendering. Defaults to Romanian. */
  @Prop() locale: string = 'ro-RO';

  /**
   * Accessible label for the entire picker. Set the `aria-label` attribute on
   * the host (or use this prop) and the component captures it on connect into
   * `resolvedAriaLabel`, then strips the host attribute to avoid Stencil's
   * attribute-observer / render-loop antipattern (same pattern as mud-radio /
   * mud-switch / mud-tooltip / mud-accordion / mud-breadcrumb).
   */
  @Prop() label?: string;

  /**
   * Week starts on this day of the week (0 = Sunday, 1 = Monday). Defaults to 1 (Monday)
   * which matches the Romanian + most European convention.
   */
  @Prop() firstDayOfWeek: number = 1;

  /** Hide the "Today" quick-jump shortcut. Default keeps it visible. */
  @Prop() hideTodayShortcut: boolean = false;

  /**
   * ISO `YYYY-MM-DD` date that controls the initially displayed month without affecting selection.
   * Useful for tests and controlled scenarios where you need a specific month in view.
   */
  @Prop() viewDate?: string;

  @State() private viewYear: number = new Date().getUTCFullYear();
  @State() private viewMonth: number = new Date().getUTCMonth();
  @State() private view: DatePickerView = 'days';
  @State() private focusedIso: string | null = null;
  @State() private hoverIso: string | null = null;
  @State() private resolvedAriaLabel?: string;

  @Element() host!: HTMLMudDatePickerElement;

  /**
   * Fires whenever the selection changes. For `range` mode, `detail.rangeStart` / `detail.rangeEnd`
   * carry the canonical ISO strings; for `multi`, `detail.value` is `string[]`.
   */
  @Event() mudChange!: EventEmitter<DatePickerChangeDetail>;

  /** Fires when the visible month changes (arrows, swipe, keyboard). `month` is 0-indexed. */
  @Event() mudMonthChange!: EventEmitter<DatePickerMonthChangeDetail>;

  private readonly instanceId = ++datePickerInstanceCounter;
  private readonly gridLabelId = `mud-date-picker-grid-${this.instanceId}`;
  private readonly titleId = `mud-date-picker-title-${this.instanceId}`;
  private todayIso = toIso(new Date());

  componentWillLoad() {
    this.captureAriaLabel();
    this.syncViewFromValue();
    this.todayIso = toIso(new Date());
  }

  private captureAriaLabel(): void {
    const userLabel = this.host.getAttribute('aria-label');
    if (userLabel && userLabel.length > 0) {
      this.resolvedAriaLabel = userLabel;
      this.host.removeAttribute('aria-label');
    } else if (this.label && this.label.length > 0) {
      this.resolvedAriaLabel = this.label;
    }
  }

  @Watch('label')
  syncLabel(next?: string): void {
    if (next && next.length > 0) this.resolvedAriaLabel = next;
  }

  @Watch('mode')
  validateMode(next: DatePickerMode) {
    if (!DATE_PICKER_MODES.includes(next)) {
      console.warn(
        `[mud-date-picker] mode="${String(next)}" is not supported. Supported: ${DATE_PICKER_MODES.join(
          ', ',
        )}. Falling back to "single".`,
      );
      this.mode = 'single';
    }
  }

  @Watch('breakpoint')
  validateBreakpoint(next: DatePickerBreakpoint) {
    if (!DATE_PICKER_BREAKPOINTS.includes(next)) {
      console.warn(
        `[mud-date-picker] breakpoint="${String(next)}" is not supported. Supported: ${DATE_PICKER_BREAKPOINTS.join(
          ', ',
        )}. Falling back to "desktop".`,
      );
      this.breakpoint = 'desktop';
    }
  }

  @Watch('value')
  handleValueChange() {
    this.syncViewFromValue();
  }

  @Watch('rangeStart')
  handleRangeStartChange() {
    this.syncViewFromValue();
  }

  @Watch('viewDate')
  handleViewDateChange() {
    this.syncViewFromValue();
  }

  /** Move the visible month to whatever the selection (or today) implies. */
  private syncViewFromValue() {
    // Explicit viewDate takes highest priority.
    if (this.viewDate) {
      const anchor = parseIso(this.viewDate);
      if (anchor) {
        this.viewYear = anchor.getUTCFullYear();
        this.viewMonth = anchor.getUTCMonth();
        return;
      }
    }
    let anchor: Date | null = null;
    if (this.mode === 'single' && typeof this.value === 'string') {
      anchor = parseIso(this.value);
    } else if (this.mode === 'range' && this.rangeStart) {
      anchor = parseIso(this.rangeStart);
    } else if (this.mode === 'multi' && Array.isArray(this.value) && this.value.length > 0) {
      anchor = parseIso(this.value[0]);
    }
    if (!anchor) anchor = new Date();
    this.viewYear = anchor.getUTCFullYear();
    this.viewMonth = anchor.getUTCMonth();
  }

  /** Localized month + weekday strings via Intl. Never hard-coded. */
  private monthLabel(year: number, month: number): string {
    const date = new Date(Date.UTC(year, month, 1));
    return new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
  }

  /** Short weekday names starting at `firstDayOfWeek`. Locale-driven. */
  private weekdayLabels(): { short: string; long: string }[] {
    const formatterShort = new Intl.DateTimeFormat(this.locale, { weekday: 'short', timeZone: 'UTC' });
    const formatterLong = new Intl.DateTimeFormat(this.locale, { weekday: 'long', timeZone: 'UTC' });
    // 2024-01-07 is a Sunday in UTC — use as anchor.
    const sunday = Date.UTC(2024, 0, 7);
    const labels: { short: string; long: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = (this.firstDayOfWeek + i) % 7;
      const date = new Date(sunday + dayOfWeek * MS_PER_DAY);
      labels.push({
        short: formatterShort.format(date),
        long: formatterLong.format(date),
      });
    }
    return labels;
  }

  /**
   * Build the 6×7 day grid for the current view month. Includes outside-month
   * spillover so the grid is always 42 cells.
   */
  private buildDayGrid(): { iso: string; date: Date; outside: boolean }[] {
    const first = startOfMonth(this.viewYear, this.viewMonth);
    const firstDow = first.getUTCDay();
    const leading = (firstDow - this.firstDayOfWeek + 7) % 7;
    const start = addUtcDays(first, -leading);
    const cells: { iso: string; date: Date; outside: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const date = addUtcDays(start, i);
      cells.push({
        iso: toIso(date),
        date,
        outside: date.getUTCMonth() !== this.viewMonth,
      });
    }
    return cells;
  }

  private isDisabled(iso: string): boolean {
    if (this.min && compareIso(iso, this.min) < 0) return true;
    if (this.max && compareIso(iso, this.max) > 0) return true;
    if (this.disabledDates && this.disabledDates.includes(iso)) return true;
    return false;
  }

  private isSelected(iso: string): boolean {
    if (this.mode === 'single') return typeof this.value === 'string' && this.value === iso;
    if (this.mode === 'range') return this.rangeStart === iso || this.rangeEnd === iso;
    if (this.mode === 'multi') return Array.isArray(this.value) && this.value.includes(iso);
    return false;
  }

  private isRangeMiddle(iso: string): boolean {
    if (this.mode !== 'range') return false;
    if (!this.rangeStart || !this.rangeEnd) {
      // Hover preview while picking the second endpoint.
      if (this.rangeStart && !this.rangeEnd && this.hoverIso) {
        const [lo, hi] =
          compareIso(this.rangeStart, this.hoverIso) <= 0
            ? [this.rangeStart, this.hoverIso]
            : [this.hoverIso, this.rangeStart];
        return compareIso(iso, lo) > 0 && compareIso(iso, hi) < 0;
      }
      return false;
    }
    return compareIso(iso, this.rangeStart) > 0 && compareIso(iso, this.rangeEnd) < 0;
  }

  private isRangeEndpoint(iso: string): 'start' | 'end' | null {
    if (this.mode !== 'range') return null;
    if (this.rangeStart === iso) return 'start';
    if (this.rangeEnd === iso) return 'end';
    return null;
  }

  private goToMonth(delta: number) {
    const next = new Date(Date.UTC(this.viewYear, this.viewMonth + delta, 1));
    this.viewYear = next.getUTCFullYear();
    this.viewMonth = next.getUTCMonth();
    this.mudMonthChange.emit({ year: this.viewYear, month: this.viewMonth });
  }

  private goToYear(delta: number) {
    this.viewYear = this.viewYear + delta;
    this.mudMonthChange.emit({ year: this.viewYear, month: this.viewMonth });
  }

  private selectDay(iso: string) {
    if (this.isDisabled(iso)) return;
    if (this.mode === 'single') {
      this.value = iso;
      this.mudChange.emit({ value: iso });
      return;
    }
    if (this.mode === 'range') {
      // No start → set start; start without end → set end (swap if reversed); both set → start over.
      if (!this.rangeStart || (this.rangeStart && this.rangeEnd)) {
        this.rangeStart = iso;
        this.rangeEnd = undefined;
        this.value = [iso];
        this.mudChange.emit({ value: [iso], rangeStart: iso, rangeEnd: undefined });
        return;
      }
      // Second click: set end.
      let start = this.rangeStart;
      let end = iso;
      if (compareIso(end, start) < 0) {
        [start, end] = [end, start];
      }
      this.rangeStart = start;
      this.rangeEnd = end;
      this.value = [start, end];
      this.mudChange.emit({ value: [start, end], rangeStart: start, rangeEnd: end });
      return;
    }
    if (this.mode === 'multi') {
      const current = Array.isArray(this.value) ? [...this.value] : [];
      const i = current.indexOf(iso);
      if (i >= 0) current.splice(i, 1);
      else current.push(iso);
      current.sort(compareIso);
      this.value = current;
      this.mudChange.emit({ value: current });
    }
  }

  private moveFocus(deltaDays: number) {
    const focusFrom = parseIso(this.focusedIso) ?? parseIso(this.todayIso) ?? new Date();
    const next = addUtcDays(focusFrom, deltaDays);
    const iso = toIso(next);
    this.focusedIso = iso;
    if (next.getUTCFullYear() !== this.viewYear || next.getUTCMonth() !== this.viewMonth) {
      this.viewYear = next.getUTCFullYear();
      this.viewMonth = next.getUTCMonth();
      this.mudMonthChange.emit({ year: this.viewYear, month: this.viewMonth });
    }
    // Focus the new cell after render.
    requestAnimationFrame(() => {
      const node = this.host.shadowRoot?.querySelector<HTMLButtonElement>(`button.day-cell[data-iso="${iso}"]`);
      node?.focus();
    });
  }

  @Listen('keydown')
  handleHostKeyDown(ev: KeyboardEvent) {
    const target = ev.target as HTMLElement | null;
    const dayCell = target?.closest?.('button.day-cell') as HTMLElement | null;
    if (!dayCell) return;
    const iso = dayCell.getAttribute('data-iso') ?? this.focusedIso;
    if (!iso) return;
    this.handleDayKeyDown(ev, iso);
  }

  private handleDayKeyDown = (ev: KeyboardEvent, iso: string) => {
    switch (ev.key) {
      case 'ArrowLeft':
        ev.preventDefault();
        this.moveFocus(-1);
        return;
      case 'ArrowRight':
        ev.preventDefault();
        this.moveFocus(1);
        return;
      case 'ArrowUp':
        ev.preventDefault();
        this.moveFocus(-7);
        return;
      case 'ArrowDown':
        ev.preventDefault();
        this.moveFocus(7);
        return;
      case 'PageUp':
        ev.preventDefault();
        if (ev.shiftKey) this.goToYear(-1);
        else this.goToMonth(-1);
        return;
      case 'PageDown':
        ev.preventDefault();
        if (ev.shiftKey) this.goToYear(1);
        else this.goToMonth(1);
        return;
      case 'Home': {
        ev.preventDefault();
        const cur = parseIso(iso) ?? new Date();
        const dow = cur.getUTCDay();
        const back = (dow - this.firstDayOfWeek + 7) % 7;
        this.moveFocus(-back);
        return;
      }
      case 'End': {
        ev.preventDefault();
        const cur = parseIso(iso) ?? new Date();
        const dow = cur.getUTCDay();
        const back = (dow - this.firstDayOfWeek + 7) % 7;
        this.moveFocus(6 - back);
        return;
      }
      case 'Enter':
      case ' ':
        ev.preventDefault();
        this.selectDay(iso);
        return;
      case 'Escape':
        if (this.view !== 'days') {
          ev.preventDefault();
          this.view = 'days';
        }
        return;
    }
  };

  private todayLabel(): string {
    // Localized "Today" label. We rely on Intl.RelativeTimeFormat for accuracy
    // — `numeric: 'auto'` returns "today" / "azi" / "heute" depending on locale.
    try {
      return new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' }).format(0, 'day');
    } catch {
      return 'Today';
    }
  }

  private capitalize(s: string): string {
    if (!s) return s;
    return s.charAt(0).toLocaleUpperCase(this.locale) + s.slice(1);
  }

  private renderHeader() {
    const monthYear = this.capitalize(this.monthLabel(this.viewYear, this.viewMonth));
    const onPrev = () => (this.view === 'years' ? this.goToYear(-12) : this.goToMonth(-1));
    const onNext = () => (this.view === 'years' ? this.goToYear(12) : this.goToMonth(1));
    const prevAria = new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(Date.UTC(this.viewYear, this.viewMonth - 1, 1)),
    );
    const nextAria = new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(Date.UTC(this.viewYear, this.viewMonth + 1, 1)),
    );
    return (
      <div class="header" part="header">
        <button type="button" class="nav-button" part="nav-button" aria-label={prevAria} onClick={onPrev}>
          <mud-icon name="chevron-left-small" size={20}></mud-icon>
        </button>
        <button
          type="button"
          class="title"
          part="title"
          id={this.titleId}
          aria-live="polite"
          onClick={() => (this.view = this.view === 'days' ? 'months' : this.view === 'months' ? 'years' : 'days')}
        >
          {monthYear}
        </button>
        <button type="button" class="nav-button" part="nav-button" aria-label={nextAria} onClick={onNext}>
          <mud-icon name="chevron-right-small" size={20}></mud-icon>
        </button>
      </div>
    );
  }

  private renderDayLabels() {
    const labels = this.weekdayLabels();
    return (
      <div class="row day-labels" role="row" part="day-labels">
        {labels.map(label => (
          <div class="day-label" role="columnheader" aria-label={label.long} part="day-label">
            <span aria-hidden="true">{this.capitalize(label.short)}</span>
            <span class="visually-hidden">{label.long}</span>
          </div>
        ))}
      </div>
    );
  }

  private renderDayGrid() {
    const cells = this.buildDayGrid();
    const rows: { iso: string; date: Date; outside: boolean }[][] = [];
    for (let i = 0; i < 6; i++) rows.push(cells.slice(i * 7, i * 7 + 7));
    const today = this.todayIso;
    return (
      <div class="day-grid" role="grid" aria-labelledby={this.titleId} part="day-grid">
        {this.renderDayLabels()}
        {rows.map(row => (
          <div class="row" role="row">
            {row.map(cell => {
              const isToday = cell.iso === today;
              const isSelected = this.isSelected(cell.iso);
              const isMiddle = this.isRangeMiddle(cell.iso);
              const endpoint = this.isRangeEndpoint(cell.iso);
              const disabled = this.isDisabled(cell.iso);
              const isFocused = this.focusedIso === cell.iso;
              const classes = {
                'day-cell': true,
                'is-outside': cell.outside,
                'is-today': isToday,
                'is-selected': isSelected,
                'is-disabled': disabled,
                'is-middle': isMiddle,
                'range-start': endpoint === 'start',
                'range-end': endpoint === 'end',
              };
              const tabIndex = isFocused || (!this.focusedIso && cell.iso === today && !cell.outside) ? 0 : -1;
              return (
                <button
                  type="button"
                  class={classes}
                  part="day-cell"
                  role="gridcell"
                  data-iso={cell.iso}
                  tabindex={tabIndex}
                  aria-selected={isSelected ? 'true' : 'false'}
                  aria-disabled={disabled ? 'true' : null}
                  aria-current={isToday ? 'date' : null}
                  aria-label={new Intl.DateTimeFormat(this.locale, {
                    dateStyle: 'full',
                    timeZone: 'UTC',
                  }).format(cell.date)}
                  disabled={disabled}
                  onClick={() => this.selectDay(cell.iso)}
                  onMouseEnter={() => (this.hoverIso = cell.iso)}
                  onMouseLeave={() => (this.hoverIso = null)}
                  onFocus={() => (this.focusedIso = cell.iso)}
                >
                  <span class="day-cell-number">{cell.date.getUTCDate()}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  private renderMonthGrid() {
    const formatter = new Intl.DateTimeFormat(this.locale, { month: 'short', timeZone: 'UTC' });
    return (
      <div class="month-grid" role="grid" aria-labelledby={this.titleId} part="month-grid">
        {Array.from({ length: 12 }, (_, m) => {
          const label = this.capitalize(formatter.format(new Date(Date.UTC(this.viewYear, m, 1))));
          const isCurrent = m === this.viewMonth;
          return (
            <button
              type="button"
              class={{ 'picker-cell': true, 'is-selected': isCurrent }}
              part="month-cell"
              role="gridcell"
              aria-selected={isCurrent ? 'true' : 'false'}
              onClick={() => {
                this.viewMonth = m;
                this.view = 'days';
                this.mudMonthChange.emit({ year: this.viewYear, month: this.viewMonth });
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  private renderYearGrid() {
    const base = Math.floor(this.viewYear / 12) * 12;
    return (
      <div class="year-grid" role="grid" aria-labelledby={this.titleId} part="year-grid">
        {Array.from({ length: 12 }, (_, i) => {
          const year = base + i;
          const isCurrent = year === this.viewYear;
          return (
            <button
              type="button"
              class={{ 'picker-cell': true, 'is-selected': isCurrent }}
              part="year-cell"
              role="gridcell"
              aria-selected={isCurrent ? 'true' : 'false'}
              onClick={() => {
                this.viewYear = year;
                this.view = 'months';
                this.mudMonthChange.emit({ year: this.viewYear, month: this.viewMonth });
              }}
            >
              {year}
            </button>
          );
        })}
      </div>
    );
  }

  private renderFooter() {
    if (this.hideTodayShortcut) return null;
    const today = this.todayLabel();
    const jumpToToday = () => {
      const now = new Date();
      this.viewYear = now.getUTCFullYear();
      this.viewMonth = now.getUTCMonth();
      this.focusedIso = this.todayIso;
      this.view = 'days';
      this.mudMonthChange.emit({ year: this.viewYear, month: this.viewMonth });
    };
    return (
      <div class="footer" part="footer">
        <button type="button" class="today-button" part="today-button" onClick={jumpToToday}>
          {this.capitalize(today)}
        </button>
      </div>
    );
  }

  render() {
    if (!DATE_PICKER_VIEWS.includes(this.view)) this.view = 'days';
    const hostClasses = {
      [`mode-${this.mode}`]: true,
      [`breakpoint-${this.breakpoint}`]: true,
      [`view-${this.view}`]: true,
    };
    // Always materialise an aria-label on the host — pointing aria-labelledby at
    // a shadow-DOM ID is technically valid (screen readers resolve it), but axe
    // flags it as `aria-valid-attr-value` Incomplete because the rule can't
    // cross the shadow boundary. Synthesising the label from the visible title
    // keeps the a11y tree deterministic and clears the inspector warning.
    const hostLabel = this.resolvedAriaLabel ?? this.capitalize(this.monthLabel(this.viewYear, this.viewMonth));
    return (
      <Host class={hostClasses} role="application" aria-label={hostLabel} id={this.gridLabelId}>
        {this.breakpoint === 'mobile' ? <div class="drag-handle" aria-hidden="true" part="drag-handle"></div> : null}
        {this.renderHeader()}
        {this.view === 'days' ? this.renderDayGrid() : null}
        {this.view === 'months' ? this.renderMonthGrid() : null}
        {this.view === 'years' ? this.renderYearGrid() : null}
        {this.renderFooter()}
      </Host>
    );
  }
}
