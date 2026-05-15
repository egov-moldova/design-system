import { Component, Host, Prop, Event, EventEmitter, h, State, Listen } from '@stencil/core';

import { CorCalendarEvent } from '../cor-calendar/cor-calendar.types';

/**
 * Individual day cell for the datepicker calendar grid.
 * Used internally by cor-datepicker.
 *
 * @element cor-datepicker-day
 */
@Component({
  tag: 'cor-datepicker-day',
  styleUrl: 'cor-datepicker-day.css',
  shadow: true,
})
export class CorDatepickerDay {
  /**
   * The day number to display (1–31). Use 0 for empty placeholder cells.
   * @default 0
   */
  @Prop({ reflect: true }) day: number = 0;

  /**
   * Whether this day is selected (single mode)
   * @default false
   */
  @Prop({ reflect: true }) selected: boolean = false;

  /**
   * Whether this day is the range start endpoint
   * @default false
   */
  @Prop({ reflect: true }) rangeStart: boolean = false;

  /**
   * Whether this day is the range end endpoint
   * @default false
   */
  @Prop({ reflect: true }) rangeEnd: boolean = false;

  /**
   * Whether this day is in the middle of a range
   * @default false
   */
  @Prop({ reflect: true }) rangeMiddle: boolean = false;

  /**
   * Whether this is a weekend day (Saturday or Sunday)
   * @default false
   */
  @Prop({ reflect: true }) weekend: boolean = false;

  /**
   * Whether this is today's date
   * @default false
   */
  @Prop({ reflect: true }) today: boolean = false;

  /**
   * Whether this cell is a placeholder (out-of-month day, non-interactive)
   * @default false
   */
  @Prop({ reflect: true }) empty: boolean = false;

  /**
   * Whether this day is disabled
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Whether to show the skeleton loading state
   * @default false
   */
  @Prop({ reflect: true }) skeleton: boolean = false;

  /**
   * Event markers for this day (up to 2 rendered)
   */
  @Prop() events: CorCalendarEvent[] = [];

  /**
   * ISO date string for this day cell (YYYY-MM-DD)
   */
  @Prop() dateString: string = '';

  /**
   * Tab index for keyboard navigation
   * @default -1
   */
  @Prop() dayTabIndex: number = -1;

  @State() private hovered: boolean = false;
  @State() private focused: boolean = false;

  /**
   * Emitted when this day cell is clicked
   */
  @Event() corDayClick!: EventEmitter<{ date: string; day: number }>;

  /**
   * Emitted when this day cell receives focus
   */
  @Event() corDayFocus!: EventEmitter<{ date: string; day: number }>;

  /**
   * Emitted when this day cell is hovered or unhovered
   */
  @Event() corDayHover!: EventEmitter<{ date: string; active: boolean }>;

  @Listen('mouseenter')
  handleMouseEnter() {
    if (!this.disabled && !this.empty && !this.skeleton) {
      this.hovered = true;
      this.corDayHover.emit({ date: this.dateString, active: true });
    }
  }

  @Listen('mouseleave')
  handleMouseLeave() {
    this.hovered = false;
    if (!this.empty) {
      this.corDayHover.emit({ date: this.dateString, active: false });
    }
  }

  private handleClick = () => {
    if (this.disabled || this.empty || this.skeleton) return;
    this.corDayClick.emit({ date: this.dateString, day: this.day });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  };

  private handleFocus = () => {
    this.focused = true;
    if (!this.disabled && !this.empty) {
      this.corDayFocus.emit({ date: this.dateString, day: this.day });
    }
  };

  private handleBlur = () => {
    this.focused = false;
  };

  private getHostClasses(): string {
    const classes: string[] = [];
    if (this.empty) classes.push('is-empty');
    if (this.disabled) classes.push('is-disabled');
    if (this.skeleton) classes.push('is-skeleton');
    if (this.selected) classes.push('is-selected');
    if (this.rangeStart) classes.push('is-range-start');
    if (this.rangeEnd) classes.push('is-range-end');
    if (this.rangeMiddle) classes.push('is-range-middle');
    if (this.weekend) classes.push('is-weekend');
    if (this.today) classes.push('is-today');
    if (this.hovered && !this.disabled && !this.empty) classes.push('is-hovered');
    if (this.focused && !this.disabled && !this.empty) classes.push('is-focused');
    return classes.join(' ');
  }

  private renderEventSigns() {
    const visibleEvents = (this.events ?? []).slice(0, 4);
    if (visibleEvents.length === 0) return null;

    // Separate events by position
    const rightEvents = visibleEvents.filter(ev => (ev.position ?? 'right') === 'right');
    const bottomEvents = visibleEvents.filter(ev => ev.position === 'bottom');

    return (
      <div>
        {rightEvents.length > 0 && (
          <div class="event-signs event-signs--right">
            {rightEvents.map((ev, i) => {
              const signType = ev.signType ?? 'circle';
              const signColor = ev.color ?? 'primary';
              const colorClass = `event-sign--${signColor.replace('-', '_')}`;

              if (signType === 'circle') {
                return <span key={`right-${i}`} class={`event-sign event-sign--circle ${colorClass}`} />;
              } else {
                return <span key={`right-${i}`} class={`event-sign event-sign--diamond ${colorClass}`} />;
              }
            })}
          </div>
        )}
        {bottomEvents.length > 0 && (
          <div class="event-signs event-signs--bottom">
            {bottomEvents.map((ev, i) => {
              const signType = ev.signType ?? 'circle';
              const signColor = ev.color ?? 'primary';
              const colorClass = `event-sign--${signColor.replace('-', '_')}`;

              if (signType === 'circle') {
                return <span key={`bottom-${i}`} class={`event-sign event-sign--circle ${colorClass}`} />;
              } else {
                return <span key={`bottom-${i}`} class={`event-sign event-sign--diamond ${colorClass}`} />;
              }
            })}
          </div>
        )}
      </div>
    );
  }

  render() {
    const hasEvents = (this.events ?? []).length > 0;
    const isInteractive = !this.empty && !this.disabled && !this.skeleton;
    const isReversed = this.selected || this.rangeStart || this.rangeEnd;

    return (
      <Host class={this.getHostClasses()}>
        <div
          class={{
            'day-cell': true,
            'day-cell--reversed': isReversed,
            'day-cell--range-middle': this.rangeMiddle,
            'day-cell--has-events': hasEvents,
          }}
          role={isInteractive ? 'gridcell' : undefined}
          aria-selected={isReversed ? 'true' : this.empty ? undefined : 'false'}
          aria-disabled={this.disabled ? 'true' : undefined}
          aria-current={this.today && !this.empty ? 'date' : undefined}
          aria-label={!this.empty && this.dateString ? this.dateString : undefined}
          tabIndex={isInteractive ? this.dayTabIndex : undefined}
          onClick={isInteractive ? this.handleClick : undefined}
          onKeyDown={isInteractive ? this.handleKeyDown : undefined}
          onFocus={isInteractive ? this.handleFocus : undefined}
          onBlur={isInteractive ? this.handleBlur : undefined}
        >
          {this.skeleton ? (
            <cor-skeleton width="24px" height="24px" borderRadius="4px" />
          ) : (
            <span class="day-label">{this.empty ? '\u00a0' : this.day}</span>
          )}
          {!this.empty && hasEvents && this.renderEventSigns()}
        </div>
      </Host>
    );
  }
}
