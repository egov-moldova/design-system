import { Component, Host, Prop, Event, EventEmitter, State, Listen, Element, Watch, h } from '@stencil/core';

import { DatepickerMode, DatepickerSize } from './cor-datepicker.enums';
import { DatepickerChangePayload, DatepickerRangeChangePayload } from './cor-datepicker.types';
import { CalendarMode, CalendarWeekStart } from '../cor-calendar/cor-calendar.enums';
import { InputLabelPosition, InputSize } from '../cor-input/cor-input.enums';
import { ICON_NAMES } from '../..';
import { IconSize } from '../cor-icon/cor-icon.types';

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIso(value: string): boolean {
  if (!ISO_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Datepicker composite component — text input(s) with popover calendar for single date or range selection.
 *
 * @element cor-datepicker
 */
@Component({
  tag: 'cor-datepicker',
  styleUrl: 'cor-datepicker.css',
  shadow: true,
})
export class CorDatepicker {
  /**
   * Selection mode: single date or date range
   * @default single
   */
  @Prop({ reflect: true }) mode: DatepickerMode = DatepickerMode.SINGLE;

  /**
   * Selected date in ISO format (YYYY-MM-DD) — single mode
   */
  @Prop({ mutable: true }) value: string = '';

  /**
   * Range start date in ISO format (YYYY-MM-DD) — range mode
   */
  @Prop({ mutable: true }) rangeStart: string = '';

  /**
   * Range end date in ISO format (YYYY-MM-DD) — range mode
   */
  @Prop({ mutable: true }) rangeEnd: string = '';

  /**
   * Label for the single input or the start input in range mode
   */
  @Prop() label: string = '';

  /**
   * Label for the end input in range mode
   */
  @Prop() labelEnd: string = '';

  /**
   * Placeholder text shown when input has no value
   * @default YYYY-MM-DD
   */
  @Prop() placeholder: string = 'YYYY-MM-DD';

  /**
   * Size of the input fields
   * @default lg
   */
  @Prop({ reflect: true }) size: DatepickerSize = DatepickerSize.LG;

  /**
   * Disables all interaction
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Shows invalid state on the input
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Marks the field as required
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Form field name attribute
   */
  @Prop() name: string = '';

  /**
   * Show clear button on input(s)
   * @default false
   */
  @Prop({ reflect: true }) withClearButton: boolean = false;

  /**
   * First day of the week in the calendar
   * @default sun
   */
  @Prop({ reflect: true }) weekStartsOn: CalendarWeekStart = CalendarWeekStart.SUN;

  /**
   * Array of ISO date strings (YYYY-MM-DD) that are individually disabled in the calendar.
   * These dates cannot be selected even when the datepicker is not fully disabled.
   */
  @Prop({ mutable: true }) disabledDates: string[] = [];

  @Element() el!: HTMLElement;

  /** Whether the calendar popover is open */
  @State() private open: boolean = false;

  /** Which input triggered the popover (range mode) */
  @State() private activeInput: 'start' | 'end' = 'start';

  /** Tracks typed value in start/single input before commit */
  @State() private typedValueStart: string = '';

  /** Tracks typed value in end input before commit */
  @State() private typedValueEnd: string = '';

  /** Whether start input has a typing error */
  @State() private typeErrorStart: boolean = false;

  /** Whether end input has a typing error */
  @State() private typeErrorEnd: boolean = false;

  /** Combined range value for range-single-input mode: "YYYY-MM-DD – YYYY-MM-DD" */
  @State() private typedValueCombined: string = '';

  /**
   * Emitted when a date is selected in single mode
   */
  @Event() corChange!: EventEmitter<DatepickerChangePayload>;

  /**
   * Emitted when either range boundary changes
   */
  @Event() corRangeChange!: EventEmitter<DatepickerRangeChangePayload>;

  /**
   * Emitted when the composite loses focus
   */
  @Event() corBlur!: EventEmitter<void>;

  /**
   * Emitted when the composite gains focus
   */
  @Event() corFocus!: EventEmitter<void>;

  @Watch('value')
  onValueChange(newVal: string) {
    this.typedValueStart = newVal ?? '';
    this.typeErrorStart = false;
  }

  @Watch('rangeStart')
  onRangeStartChange(newVal: string) {
    this.typedValueStart = newVal ?? '';
    this.typeErrorStart = false;
    if (this.mode === DatepickerMode.RANGE_SINGLE_INPUT) {
      this.updateCombinedValue();
    }
  }

  @Watch('rangeEnd')
  onRangeEndChange(newVal: string) {
    this.typedValueEnd = newVal ?? '';
    this.typeErrorEnd = false;
    if (this.mode === DatepickerMode.RANGE_SINGLE_INPUT) {
      this.updateCombinedValue();
    }
  }

  @Watch('disabledDates')
  onDisabledDatesChange() {
    // Force re-render when disabledDates changes
    // This ensures the calendar receives the updated array
    if (this.open) {
      // If calendar is already open, update it directly
      const calendar = this.el.shadowRoot?.querySelector('cor-calendar') as HTMLCorCalendarElement;
      if (calendar) {
        calendar.disabledDates = [...this.disabledDates];
      }
    }
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.open) {
      e.stopPropagation();
      this.closePopover();
    }
  }

  componentWillLoad() {
    this.typedValueStart = this.mode === DatepickerMode.RANGE ? (this.rangeStart ?? '') : (this.value ?? '');
    this.typedValueEnd = this.rangeEnd ?? '';
    if (this.mode === DatepickerMode.RANGE_SINGLE_INPUT) {
      this.updateCombinedValue();
    }
  }

  componentDidRender() {
    // Manually set disabledDates on calendar after render
    // This is needed because Stencil's JSX prop binding doesn't work correctly for arrays
    if (this.open && this.disabledDates.length > 0) {
      const calendar = this.el.shadowRoot?.querySelector('cor-calendar') as HTMLCorCalendarElement;
      if (calendar && (!calendar.disabledDates || calendar.disabledDates.length === 0)) {
        calendar.disabledDates = [...this.disabledDates];
      }
    }
  }

  private skipNextDocumentClick: boolean = false;

  private openPopover(input: 'start' | 'end' = 'start') {
    this.activeInput = input;
    this.skipNextDocumentClick = true;
    this.open = true;
    document.addEventListener('click', this.handleDocumentClick);
  }

  private closePopover() {
    this.open = false;
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private handleDocumentClick = (e: MouseEvent) => {
    if (this.skipNextDocumentClick) {
      this.skipNextDocumentClick = false;
      return;
    }
    const path = e.composedPath();
    if (!path.includes(this.el)) {
      this.closePopover();
    }
  };

  disconnectedCallback() {
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private handleInputClick = (input: 'start' | 'end') => {
    if (this.disabled) return;
    if (this.open && this.activeInput === input) {
      this.closePopover();
    } else {
      this.openPopover(input);
    }
  };

  private handleStartInputClick = () => this.handleInputClick('start');
  private handleEndInputClick = () => this.handleInputClick('end');

  private handleStartInput = (e: CustomEvent<string>) => {
    this.typedValueStart = e.detail;
    this.typeErrorStart = false;
  };

  private handleEndInput = (e: CustomEvent<string>) => {
    this.typedValueEnd = e.detail;
    this.typeErrorEnd = false;
  };

  private commitTypedValue(which: 'start' | 'end') {
    const typed = which === 'start' ? this.typedValueStart : this.typedValueEnd;
    if (!typed) {
      if (which === 'start') {
        if (this.mode === DatepickerMode.SINGLE) {
          this.value = '';
          this.corChange.emit({ value: '' });
        } else {
          this.rangeStart = '';
          this.corRangeChange.emit({ start: '', end: this.rangeEnd || null });
        }
        this.typeErrorStart = false;
      } else {
        this.rangeEnd = '';
        this.corRangeChange.emit({ start: this.rangeStart || null, end: '' });
        this.typeErrorEnd = false;
      }
      return;
    }

    if (!isValidIso(typed)) {
      if (which === 'start') {
        this.typeErrorStart = true;
      } else {
        this.typeErrorEnd = true;
      }
      return;
    }

    if (which === 'start') {
      if (this.mode === DatepickerMode.SINGLE) {
        this.value = typed;
        this.corChange.emit({ value: typed });
      } else {
        this.rangeStart = typed;
        this.corRangeChange.emit({ start: typed, end: this.rangeEnd || null });
      }
      this.typeErrorStart = false;
    } else {
      this.rangeEnd = typed;
      this.corRangeChange.emit({ start: this.rangeStart || null, end: typed });
      this.typeErrorEnd = false;
    }
  }

  private handleStartBlur = () => {
    this.commitTypedValue('start');
  };

  private handleEndBlur = () => {
    this.commitTypedValue('end');
  };

  private handleCalendarDateChange = (e: CustomEvent<{ date: string }>) => {
    const { date } = e.detail;
    this.value = date;
    this.typedValueStart = date;
    this.typeErrorStart = false;
    this.corChange.emit({ value: date });
    this.closePopover();
  };

  private handleCalendarRangeChange = (
    e: CustomEvent<{ start: string | null; end: string | null; confirmed?: boolean }>,
  ) => {
    const { start, end, confirmed } = e.detail;
    this.rangeStart = start ?? '';
    this.rangeEnd = end ?? '';
    this.typedValueStart = start ?? '';
    this.typedValueEnd = end ?? '';
    this.typeErrorStart = false;
    this.typeErrorEnd = false;
    if (this.mode === DatepickerMode.RANGE_SINGLE_INPUT) {
      this.updateCombinedValue();
    }
    this.corRangeChange.emit({ start, end });
    if (end && confirmed) {
      this.closePopover();
    }
  };

  private updateCombinedValue() {
    const start = this.rangeStart ?? '';
    const end = this.rangeEnd ?? '';
    if (start && end) {
      this.typedValueCombined = `${start} – ${end}`;
    } else if (start) {
      this.typedValueCombined = start;
    } else {
      this.typedValueCombined = '';
    }
  }

  private parseCombinedValue(s: string): { start: string; end: string } | null {
    // Accept en-dash separator (typed by user copy-paste) or regular hyphen separator
    const enDashIdx = s.indexOf(' – ');
    const hyphenIdx = s.indexOf(' - ', 10); // offset past first date to avoid matching date separators
    const sepIdx = enDashIdx !== -1 ? enDashIdx : hyphenIdx !== -1 ? hyphenIdx : -1;
    if (sepIdx !== 10) return null; // first date must be exactly 10 chars
    const start = s.slice(0, sepIdx);
    const sepLen = s[sepIdx + 1] === '–' ? 3 : 3; // ' – ' or ' - ' are both 3 chars
    const end = s.slice(sepIdx + sepLen);
    return { start, end };
  }

  private commitCombinedValue() {
    const raw = this.typedValueCombined.trim();
    if (!raw) {
      this.rangeStart = '';
      this.rangeEnd = '';
      this.typeErrorStart = false;
      this.corRangeChange.emit({ start: null, end: null });
      return;
    }
    const parsed = this.parseCombinedValue(raw);
    if (!parsed || !isValidIso(parsed.start) || !isValidIso(parsed.end)) {
      this.typeErrorStart = true;
      return;
    }
    this.rangeStart = parsed.start;
    this.rangeEnd = parsed.end;
    this.typeErrorStart = false;
    this.corRangeChange.emit({ start: parsed.start, end: parsed.end });
  }

  private handleCombinedInput = (e: CustomEvent<string>) => {
    this.typedValueCombined = e.detail;
    this.typeErrorStart = false;
  };

  private handleCombinedBlur = () => {
    this.commitCombinedValue();
  };

  private getCalendarMonth(): number {
    const dateStr =
      this.activeInput === 'end' ? this.rangeEnd : this.mode === DatepickerMode.SINGLE ? this.value : this.rangeStart;
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return parseInt(parts[1], 10);
    }
    return new Date().getMonth() + 1;
  }

  private getCalendarYear(): number {
    const dateStr =
      this.activeInput === 'end' ? this.rangeEnd : this.mode === DatepickerMode.SINGLE ? this.value : this.rangeStart;
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return parseInt(parts[0], 10);
    }
    return new Date().getFullYear();
  }

  private renderSingleInput() {
    const isInvalid = this.invalid || this.typeErrorStart;
    return (
      <cor-input
        label={this.label || undefined}
        labelPosition={InputLabelPosition.OUTSIDE}
        placeholder={this.placeholder}
        value={this.typedValueStart}
        size={this.size as unknown as InputSize}
        disabled={this.disabled}
        invalid={isInvalid}
        required={this.required}
        name={this.name || undefined}
        withClearButton={this.withClearButton}
        showLine={true}
        class={{ 'datepicker__input': true, 'datepicker__input--no-label': !this.label }}
        onClick={this.handleStartInputClick}
        onCorInput={this.handleStartInput}
        onCorBlur={this.handleStartBlur}
        onCorFocus={() => this.corFocus.emit()}
      >
        <cor-icon
          slot="icon-right"
          name={ICON_NAMES.CALENDAR}
          size={IconSize.SM}
          color="neutral-icon-default"
        ></cor-icon>
      </cor-input>
    );
  }

  private renderRangeSingleInput() {
    const isInvalid = this.invalid || this.typeErrorStart;
    const combinedPlaceholder = `${this.placeholder} – ${this.placeholder}`;
    return (
      <cor-input
        label={this.label || undefined}
        labelPosition={InputLabelPosition.OUTSIDE}
        placeholder={combinedPlaceholder}
        value={this.typedValueCombined}
        size={this.size as unknown as InputSize}
        disabled={this.disabled}
        invalid={isInvalid}
        required={this.required}
        name={this.name || undefined}
        withClearButton={this.withClearButton}
        showLine={true}
        class={{ 'datepicker__input': true, 'datepicker__input--no-label': !this.label }}
        onClick={this.handleStartInputClick}
        onCorInput={this.handleCombinedInput}
        onCorBlur={this.handleCombinedBlur}
        onCorFocus={() => this.corFocus.emit()}
      >
        <cor-icon
          slot="icon-right"
          name={ICON_NAMES.CALENDAR}
          size={IconSize.SM}
          color="neutral-icon-default"
        ></cor-icon>
      </cor-input>
    );
  }

  private renderRangeInputs() {
    const startInvalid = this.invalid || this.typeErrorStart;
    const endInvalid = this.invalid || this.typeErrorEnd;
    return [
      <cor-input
        key="start"
        label={this.label || undefined}
        labelPosition={InputLabelPosition.OUTSIDE}
        placeholder={this.placeholder}
        value={this.typedValueStart}
        size={this.size as unknown as InputSize}
        disabled={this.disabled}
        invalid={startInvalid}
        required={this.required}
        withClearButton={this.withClearButton}
        showLine={true}
        class={{ 'datepicker__input': true, 'datepicker__input--no-label': !this.label }}
        onClick={this.handleStartInputClick}
        onCorInput={this.handleStartInput}
        onCorBlur={this.handleStartBlur}
        onCorFocus={() => this.corFocus.emit()}
        name={this.name ? `${this.name}-start` : undefined}
      >
        <cor-icon
          slot="icon-right"
          name={ICON_NAMES.CALENDAR}
          size={IconSize.SM}
          color="neutral-icon-default"
        ></cor-icon>
      </cor-input>,
      <cor-input
        key="end"
        label={this.labelEnd || undefined}
        labelPosition={InputLabelPosition.OUTSIDE}
        placeholder={this.placeholder}
        value={this.typedValueEnd}
        size={this.size as unknown as InputSize}
        disabled={this.disabled}
        invalid={endInvalid}
        withClearButton={this.withClearButton}
        showLine={true}
        class={{ 'datepicker__input': true, 'datepicker__input--no-label': !this.labelEnd }}
        onClick={this.handleEndInputClick}
        onCorInput={this.handleEndInput}
        onCorBlur={this.handleEndBlur}
        onCorFocus={() => this.corFocus.emit()}
        name={this.name ? `${this.name}-end` : undefined}
      >
        <cor-icon
          slot="icon-right"
          name={ICON_NAMES.CALENDAR}
          size={IconSize.SM}
          color="neutral-icon-default"
        ></cor-icon>
      </cor-input>,
    ];
  }

  private renderPopover() {
    if (!this.open) return null;

    const isRangeMode = this.mode === DatepickerMode.RANGE || this.mode === DatepickerMode.RANGE_SINGLE_INPUT;
    const month = this.getCalendarMonth();
    const year = this.getCalendarYear();

    return (
      <div class="datepicker__popover">
        <cor-calendar
          ref={el => {
            if (el && this.disabledDates.length > 0) {
              (el as HTMLCorCalendarElement).disabledDates = [...this.disabledDates];
            }
          }}
          mode={isRangeMode ? CalendarMode.RANGE : CalendarMode.SINGLE}
          value={!isRangeMode ? this.value || undefined : undefined}
          rangeStart={isRangeMode ? this.rangeStart || undefined : undefined}
          rangeEnd={isRangeMode ? this.rangeEnd || undefined : undefined}
          month={month}
          year={year}
          weekStartsOn={this.weekStartsOn}
          disabledDates={this.disabledDates}
          onCorDateChange={this.handleCalendarDateChange}
          onCorRangeChange={this.handleCalendarRangeChange}
        ></cor-calendar>
      </div>
    );
  }

  render() {
    const isRange = this.mode === DatepickerMode.RANGE;
    const isRangeSingleInput = this.mode === DatepickerMode.RANGE_SINGLE_INPUT;

    let inputContent: unknown;
    if (isRange) {
      inputContent = this.renderRangeInputs();
    } else if (isRangeSingleInput) {
      inputContent = this.renderRangeSingleInput();
    } else {
      inputContent = this.renderSingleInput();
    }

    return (
      <Host>
        <div
          class={{
            'datepicker': true,
            'datepicker--open': this.open,
            'datepicker--range': isRange,
            'datepicker--range-single': isRangeSingleInput,
          }}
        >
          <div class="datepicker__inputs">{inputContent}</div>
          {this.renderPopover()}
        </div>
      </Host>
    );
  }
}
