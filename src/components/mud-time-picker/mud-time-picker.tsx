import type { EventEmitter } from '@stencil/core';
import { Component, Element, Event, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import type { TimePickerChangeDetail, TimePickerColumn } from './mud-time-picker.types';

/** `HH:MM`, 24-hour. */
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/** Rows visible at once (Figma 13810:9451 shows seven); the columns scroll the rest. */
const VISIBLE_ROWS = 7;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Minutes since midnight of a valid `HH:MM`, else `null`. */
function parseTime(value: string | undefined | null): { hours: number; minutes: number } | null {
  const match = TIME_RE.exec(value ?? '');
  return match ? { hours: Number(match[1]), minutes: Number(match[2]) } : null;
}

function minuteOfDay(value: string | undefined | null): number | null {
  const time = parseTime(value);
  return time ? time.hours * 60 + time.minutes : null;
}

/**
 * Time picker — an hour column and a minute column, the dropdown of
 * `mud-time-input` (Figma Time frame 13807:8471, dropdown 13810:9450).
 *
 * The selected value of the column being edited is solid (`.day-cell` Active);
 * the other column's selected value is tinted (`.day-cell` Middle). Picking an
 * hour moves on to the minutes; picking a minute completes the time and fires
 * `mudChange`.
 *
 * Keyboard: each column is a listbox with one tab stop. Up / Down move within a
 * column, Home / End jump to its ends, Left / Right switch columns, Enter or
 * Space picks the focused option.
 *
 * @element mud-time-picker
 */
@Component({
  tag: 'mud-time-picker',
  styleUrl: 'mud-time-picker.css',
  shadow: true,
})
export class MudTimePicker {
  /** Selected time, `HH:MM` (24-hour). Updated when a time is completed. */
  @Prop({ mutable: true }) value?: string;

  /** Earliest selectable time, `HH:MM` inclusive. */
  @Prop() min?: string;

  /** Latest selectable time, `HH:MM` inclusive. */
  @Prop() max?: string;

  /** Accessible name of the picker. */
  @Prop() label: string = 'Selectează ora';

  /** Accessible name of the hour column. */
  @Prop({ attribute: 'hours-label' }) hoursLabel: string = 'Ore';

  /** Accessible name of the minute column. */
  @Prop({ attribute: 'minutes-label' }) minutesLabel: string = 'Minute';

  @State() private hours: number | null = null;
  @State() private minutes: number | null = null;
  @State() private activeColumn: TimePickerColumn = 'hours';
  /** The option of each column that holds the tab stop. */
  @State() private focusedHour: number | null = null;
  @State() private focusedMinute: number | null = null;

  @Element() host!: HTMLMudTimePickerElement;

  /** Fires when a time is complete — a minute is picked while an hour is set. */
  @Event() mudChange!: EventEmitter<TimePickerChangeDetail>;

  /** Column whose tab-stop option takes focus after the next render. */
  private focusColumnOnRender: TimePickerColumn | null = null;

  @Watch('value')
  syncFromValue(): void {
    const time = parseTime(this.value);
    this.hours = time?.hours ?? null;
    this.minutes = time?.minutes ?? null;
  }

  @Listen('keydown')
  handleKeyDown(ev: KeyboardEvent): void {
    // A host listener sees the event retargeted to the host; the option is the
    // first node of the composed path.
    const target = (ev.composedPath?.()[0] ?? ev.target) as HTMLElement | null;
    const option = target?.closest?.('[role="option"]') as HTMLElement | null;
    if (!option) return;
    const column = option.getAttribute('data-column') as TimePickerColumn;
    const current = Number(option.getAttribute('data-value'));
    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault();
        this.moveFocus(column, this.nextEnabled(column, current, 1));
        return;
      case 'ArrowUp':
        ev.preventDefault();
        this.moveFocus(column, this.nextEnabled(column, current, -1));
        return;
      case 'Home':
        ev.preventDefault();
        this.moveFocus(column, this.nextEnabled(column, -1, 1));
        return;
      case 'End':
        ev.preventDefault();
        this.moveFocus(column, this.nextEnabled(column, this.options(column).length, -1));
        return;
      case 'ArrowRight':
      case 'ArrowLeft': {
        const other: TimePickerColumn = column === 'hours' ? 'minutes' : 'hours';
        if ((ev.key === 'ArrowRight') !== (column === 'hours')) return;
        ev.preventDefault();
        this.activeColumn = other;
        this.focusColumnOnRender = other;
        return;
      }
      case 'Enter':
      case ' ':
        ev.preventDefault();
        this.pick(column, current);
        return;
    }
  }

  componentWillLoad() {
    this.syncFromValue();
  }

  componentDidLoad() {
    // Open with each selected value at the top of its column, as in Figma.
    this.scrollToTop('hours', this.hours);
    this.scrollToTop('minutes', this.minutes);
  }

  componentDidRender() {
    if (!this.focusColumnOnRender) return;
    const column = this.focusColumnOnRender;
    this.focusColumnOnRender = null;
    const option = this.host.shadowRoot?.querySelector<HTMLElement>(
      `[role="option"][data-column="${column}"][tabindex="0"]`,
    );
    option?.focus();
    option?.scrollIntoView?.({ block: 'nearest' });
  }

  private options(column: TimePickerColumn): number[] {
    return column === 'hours' ? HOURS : MINUTES;
  }

  /** Whether an hour has any selectable minute, or a minute is selectable in the chosen hour. */
  private isDisabled(column: TimePickerColumn, n: number): boolean {
    const min = minuteOfDay(this.min);
    const max = minuteOfDay(this.max);
    if (min === null && max === null) return false;
    if (column === 'hours') {
      return (min !== null && n * 60 + 59 < min) || (max !== null && n * 60 > max);
    }
    if (this.hours === null) return false;
    const at = this.hours * 60 + n;
    return (min !== null && at < min) || (max !== null && at > max);
  }

  /** The next enabled option from `from` in `direction`, or `from` when there is none. */
  private nextEnabled(column: TimePickerColumn, from: number, direction: 1 | -1): number {
    const all = this.options(column);
    for (let n = from + direction; n >= 0 && n < all.length; n += direction) {
      if (!this.isDisabled(column, n)) return n;
    }
    return from;
  }

  /** Option that holds the column's tab stop: the focused one, else the selected, else the first enabled. */
  private tabStop(column: TimePickerColumn): number {
    const focused = column === 'hours' ? this.focusedHour : this.focusedMinute;
    const selected = column === 'hours' ? this.hours : this.minutes;
    if (focused !== null) return focused;
    if (selected !== null && !this.isDisabled(column, selected)) return selected;
    return this.nextEnabled(column, -1, 1);
  }

  private moveFocus(column: TimePickerColumn, n: number) {
    if (column === 'hours') this.focusedHour = n;
    else this.focusedMinute = n;
    this.focusColumnOnRender = column;
  }

  private pick(column: TimePickerColumn, n: number) {
    if (this.isDisabled(column, n)) return;
    if (column === 'hours') {
      this.hours = n;
      this.focusedHour = n;
      // A minute that the new hour puts out of bounds cannot stay selected.
      if (this.minutes !== null && this.isDisabled('minutes', this.minutes)) this.minutes = null;
      this.activeColumn = 'minutes';
      this.focusColumnOnRender = 'minutes';
      return;
    }
    this.minutes = n;
    this.focusedMinute = n;
    if (this.hours === null) {
      this.activeColumn = 'hours';
      this.focusColumnOnRender = 'hours';
      return;
    }
    const value = `${pad(this.hours)}:${pad(n)}`;
    this.value = value;
    this.mudChange.emit({ value, hours: this.hours, minutes: n });
  }

  private scrollToTop(column: TimePickerColumn, n: number | null) {
    if (n === null) return;
    const list = this.host.shadowRoot?.querySelector<HTMLElement>(`.column[data-column="${column}"]`);
    const option = list?.querySelector<HTMLElement>(`[role="option"][data-value="${n}"]`);
    if (!list || !option) return;
    list.scrollTop = option.offsetTop - list.offsetTop - parseFloat(getComputedStyle(list).paddingTop || '0');
  }

  private renderColumn(column: TimePickerColumn) {
    const selected = column === 'hours' ? this.hours : this.minutes;
    const tabStop = this.tabStop(column);
    const isActive = this.activeColumn === column;
    return (
      <div
        class={{ 'column': true, 'is-active': isActive }}
        part={`column ${column}`}
        role="listbox"
        aria-label={column === 'hours' ? this.hoursLabel : this.minutesLabel}
        data-column={column}
      >
        {this.options(column).map(n => {
          const isSelected = n === selected;
          const disabled = this.isDisabled(column, n);
          return (
            <div
              class={{
                'option': true,
                'is-selected': isSelected,
                'is-active': isSelected && isActive,
                'is-disabled': disabled,
              }}
              part="option"
              role="option"
              data-column={column}
              data-value={String(n)}
              tabindex={n === tabStop ? 0 : -1}
              aria-selected={isSelected ? 'true' : 'false'}
              aria-disabled={disabled ? 'true' : null}
              onClick={() => this.pick(column, n)}
              onFocus={() => {
                this.activeColumn = column;
                if (column === 'hours') this.focusedHour = n;
                else this.focusedMinute = n;
              }}
            >
              {pad(n)}
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    return (
      <Host role="group" aria-label={this.label}>
        <div class="columns" part="columns">
          {this.renderColumn('hours')}
          <div class="separator" part="separator" aria-hidden="true">
            {Array.from({ length: VISIBLE_ROWS }, () => (
              <span class="separator-cell">:</span>
            ))}
          </div>
          {this.renderColumn('minutes')}
        </div>
      </Host>
    );
  }
}
