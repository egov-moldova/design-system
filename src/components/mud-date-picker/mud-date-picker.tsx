import type { EventEmitter } from '@stencil/core';
import { Component, Element, Event, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import {
  DATE_PICKER_BREAKPOINTS,
  DATE_PICKER_HEADER_STYLES,
  DATE_PICKER_MODES,
  DATE_PICKER_VIEWS,
} from './mud-date-picker.types';
import type {
  DatePickerBreakpoint,
  DatePickerChangeDetail,
  DatePickerHeaderStyle,
  DatePickerMode,
  DatePickerMonthChangeDetail,
  DatePickerView,
} from './mud-date-picker.types';

let datePickerInstanceCounter = 0;

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Year view: 12 cells starting at a decade; the arrows page by a decade (Figma 524:1858). */
const YEAR_GRID_SIZE = 12;
const YEARS_PER_PAGE_STEP = 10;

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
   * Header presentation. `title` (default) shows one "Month Year" button that
   * cycles views; `dropdown` shows separate month + year dropdown chips (the
   * "advanced" variant from the Figma spec).
   * @default 'title'
   */
  @Prop({ reflect: true }) headerStyle: DatePickerHeaderStyle = 'title';

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

  /**
   * Show the "Today" quick-jump shortcut under the grid. Off by default: no
   * date-picker variant in the Figma spec (159:904) has it.
   * @default false
   */
  @Prop() todayShortcut: boolean = false;

  /**
   * Hide the "Today" quick-jump shortcut.
   * @deprecated The shortcut is hidden by default now; use `todayShortcut` to show it. When set,
   * this still wins over `todayShortcut`.
   */
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
  /**
   * Selector of the control to focus after the next render — set when a view
   * switch removes the control that had focus (a header chip, a month / year
   * cell).
   */
  private focusOnRender: string | null = null;

  componentWillLoad() {
    this.captureAriaLabel();
    this.syncViewFromValue();
    this.todayIso = toIso(new Date());
  }

  componentDidRender() {
    const selector = this.focusOnRender;
    if (!selector) return;
    this.focusOnRender = null;
    this.host.shadowRoot?.querySelector<HTMLElement>(selector)?.focus();
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

  @Watch('headerStyle')
  validateHeaderStyle(next: DatePickerHeaderStyle) {
    if (!DATE_PICKER_HEADER_STYLES.includes(next)) {
      console.warn(
        `[mud-date-picker] header-style="${String(next)}" is not supported. Supported: ${DATE_PICKER_HEADER_STYLES.join(
          ', ',
        )}. Falling back to "title".`,
      );
      this.headerStyle = 'title';
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
    // `narrow` → single-letter weekday headers (M T W T F S S), per the Figma.
    const formatterShort = new Intl.DateTimeFormat(this.locale, { weekday: 'narrow', timeZone: 'UTC' });
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
    // A host listener sees `ev.target` retargeted to the host; the day cell is
    // the first node of the composed path.
    const target = (ev.composedPath?.()[0] ?? ev.target) as HTMLElement | null;
    // Escape backs out of the month / year view first; only the day view lets
    // it through to a host popover (mud-date-input closes on it).
    if (ev.key === 'Escape' && this.view !== 'days') {
      ev.preventDefault();
      ev.stopPropagation();
      // Back to the control that opened the view: the chip, or the title.
      const chip = this.view === 'months' ? 'month-dropdown' : 'year-dropdown';
      this.switchView('days', this.headerStyle === 'dropdown' ? `[part="${chip}"]` : 'button.title');
      return;
    }
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
    }
  };

  /**
   * Change view and move focus once rendered — by default into the new view:
   * its tab-stop day, or its selected month / year (the view year and month
   * are always in their grids).
   */
  private switchView(next: DatePickerView, focus?: string) {
    this.view = next;
    this.focusOnRender = focus ?? (next === 'days' ? 'button.day-cell[tabindex="0"]' : '.picker-cell.is-selected');
  }

  /**
   * The day holding the grid's single tab stop: the focused day, else the
   * selection, today, or the first enabled day — whichever is first in the
   * visible month. The grid always keeps one, or focus would fall to <body>
   * when neither today nor a focused day is in view.
   */
  private dayTabStop(cells: { iso: string; outside: boolean }[]): string | null {
    const enabled = cells.filter(cell => !cell.outside && !this.isDisabled(cell.iso)).map(cell => cell.iso);
    const selection = this.mode === 'range' ? this.rangeStart : Array.isArray(this.value) ? this.value[0] : this.value;
    const candidate = [this.focusedIso, selection, this.todayIso].find(iso => iso && enabled.includes(iso));
    return candidate ?? enabled[0] ?? null;
  }

  /** First year of the 12-cell year grid: the decade the view year falls in (Figma 524:1858). */
  private yearGridBase(): number {
    return Math.floor(this.viewYear / YEARS_PER_PAGE_STEP) * YEARS_PER_PAGE_STEP;
  }

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
    // Year view titles the decade it starts at ("2020-2030"), per the Figma
    // year picker 494:13301, whose 12-cell grid runs on to 2031.
    const yearBase = this.yearGridBase();
    const decadeLabel = (base: number) => `${base}-${base + YEARS_PER_PAGE_STEP}`;
    const isYears = this.view === 'years';
    const onPrev = () => (isYears ? this.goToYear(-YEARS_PER_PAGE_STEP) : this.goToMonth(-1));
    const onNext = () => (isYears ? this.goToYear(YEARS_PER_PAGE_STEP) : this.goToMonth(1));
    const monthAria = (delta: number) =>
      new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(Date.UTC(this.viewYear, this.viewMonth + delta, 1)),
      );
    const prevAria = isYears ? decadeLabel(yearBase - YEARS_PER_PAGE_STEP) : monthAria(-1);
    const nextAria = isYears ? decadeLabel(yearBase + YEARS_PER_PAGE_STEP) : monthAria(1);
    return (
      <div class="header" part="header">
        <button type="button" class="nav-button" part="nav-button" aria-label={prevAria} onClick={onPrev}>
          <mud-icon name="chevron-left-small" size={20}></mud-icon>
        </button>
        {isYears
          ? this.renderHeaderTitle(decadeLabel(yearBase))
          : this.headerStyle === 'dropdown'
            ? this.renderHeaderDropdowns()
            : this.renderHeaderTitle(monthYear)}
        <button type="button" class="nav-button" part="nav-button" aria-label={nextAria} onClick={onNext}>
          <mud-icon name="chevron-right-small" size={20}></mud-icon>
        </button>
      </div>
    );
  }

  private renderHeaderTitle(monthYear: string) {
    return (
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
    );
  }

  private renderHeaderDropdowns() {
    const monthName = this.capitalize(
      new Intl.DateTimeFormat(this.locale, { month: 'long', timeZone: 'UTC' }).format(
        new Date(Date.UTC(this.viewYear, this.viewMonth, 1)),
      ),
    );
    return (
      <div class="header-dropdowns" part="header-dropdowns" id={this.titleId}>
        {/* Each chip swaps the day grid for its own view, and the chips leave
            the DOM with it (the Month Picker 524:1973 has no header; the year
            view shows the decade title), so `switchView` re-homes focus. */}
        <button
          type="button"
          class="dropdown-trigger"
          part="month-dropdown"
          aria-haspopup="grid"
          aria-expanded="false"
          onClick={() => this.switchView('months')}
        >
          <span class="dropdown-label">{monthName}</span>
          <mud-icon name="chevron-bottom-small" size={16}></mud-icon>
        </button>
        <button
          type="button"
          class="dropdown-trigger"
          part="year-dropdown"
          aria-haspopup="grid"
          aria-expanded="false"
          onClick={() => this.switchView('years')}
        >
          <span class="dropdown-label">{this.viewYear}</span>
          <mud-icon name="chevron-bottom-small" size={16}></mud-icon>
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
    const tabStop = this.dayTabStop(cells);
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
              // Spill-over days are inactive (Figma .day-cell Inactive 158:453);
              // the arrow keys still cross into the next month.
              const disabled = cell.outside || this.isDisabled(cell.iso);
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
              const tabIndex = cell.iso === tabStop ? 0 : -1;
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
                  onClick={() => {
                    if (!disabled) this.selectDay(cell.iso);
                  }}
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
                this.switchView('days');
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
    const base = this.yearGridBase();
    return (
      <div class="year-grid" role="grid" aria-labelledby={this.titleId} part="year-grid">
        {Array.from({ length: YEAR_GRID_SIZE }, (_, i) => {
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
                // The title cycles days → months → years, so it continues to the
                // months; the year chip was a shortcut and returns to the days.
                this.switchView(this.headerStyle === 'dropdown' ? 'days' : 'months');
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
    if (!this.todayShortcut || this.hideTodayShortcut) return null;
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
    // The Month Picker variant (524:1973) — reached from the month chip — has no header.
    const showHeader = !(this.view === 'months' && this.headerStyle === 'dropdown');
    return (
      <Host class={hostClasses} role="application" aria-label={hostLabel} id={this.gridLabelId}>
        {this.breakpoint === 'mobile' ? <div class="drag-handle" aria-hidden="true" part="drag-handle"></div> : null}
        {showHeader ? this.renderHeader() : null}
        {this.view === 'days' ? this.renderDayGrid() : null}
        {this.view === 'months' ? this.renderMonthGrid() : null}
        {this.view === 'years' ? this.renderYearGrid() : null}
        {this.renderFooter()}
      </Host>
    );
  }
}
