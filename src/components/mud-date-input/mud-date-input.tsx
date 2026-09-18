import type { EventEmitter } from '@stencil/core';
import { AttachInternals, Component, Element, Event, Host, Listen, Prop, State, Watch, h } from '@stencil/core';

import {
  applyMask,
  createSegmentMask,
  ghostParts,
  padSegmentOnSeparator,
  readSegments,
  segmentIndexAt,
} from '../../utils/segment-mask';
import type { MaskSegment, SegmentMask } from '../../utils/segment-mask';
import type { DatePickerChangeDetail } from '../mud-date-picker/mud-date-picker.types';
import {
  DATE_INPUT_BREAKPOINTS,
  DATE_INPUT_FORMATS,
  DATE_INPUT_TYPES,
  DATE_INPUT_SIZES,
  DATE_INPUT_VARIANTS,
} from './mud-date-input.types';
import type {
  DateInputBreakpoint,
  DateInputChangeDetail,
  DateInputFormat,
  DateInputSegment,
  DateInputSize,
  DateInputType,
  DateInputTypingDetail,
  DateInputValidationError,
  DateInputVariant,
} from './mud-date-input.types';

let dateInputInstanceCounter = 0;

/** Viewport query that flips the `auto` breakpoint into the bottom-sheet layout. */
const MOBILE_VIEWPORT_QUERY = '(max-width: 640px)';

/** Years accepted when neither `min` nor `max` narrows them. */
const DEFAULT_MIN_YEAR = 1900;
const DEFAULT_MAX_YEAR = 2100;

/** Highest valid value of a two-digit segment. */
const SEGMENT_MAX: Record<'DD' | 'MM', number> = { DD: 31, MM: 12 };

type DateSegmentKind = 'DD' | 'MM' | 'YYYY';

/** Separator between the two dates of a range (Figma 483:5708: `18/01/2025 - 22/01/2025`). */
const RANGE_SEPARATOR = ' - ';

const DAY = { kind: 'DD', length: 2 } as const;
const MONTH = { kind: 'MM', length: 2 } as const;
const YEAR = { kind: 'YYYY', length: 4 } as const;

const FORMAT_SEGMENTS: Record<DateInputFormat, { separator: string; segments: MaskSegment<DateSegmentKind>[] }> = {
  'DD/MM/YYYY': { separator: '/', segments: [DAY, MONTH, YEAR] },
  'MM/DD/YYYY': { separator: '/', segments: [MONTH, DAY, YEAR] },
  'YYYY-MM-DD': { separator: '-', segments: [YEAR, MONTH, DAY] },
};

/** One date, or two for `type="date-range"`. */
type MaskMode = 'single' | 'range';

/** One mask per format and mask mode: a date, or two dates joined by `RANGE_SEPARATOR`. */
const MASKS = Object.fromEntries(
  DATE_INPUT_FORMATS.map(format => {
    const { separator, segments } = FORMAT_SEGMENTS[format];
    const separators = segments.slice(1).map(() => separator);
    const masks: Record<MaskMode, SegmentMask<DateSegmentKind>> = {
      single: createSegmentMask(segments, separators),
      range: createSegmentMask([...segments, ...segments], [...separators, RANGE_SEPARATOR, ...separators]),
    };
    return [format, masks];
  }),
) as Record<DateInputFormat, Record<MaskMode, SegmentMask<DateSegmentKind>>>;

/**
 * Date Input — segment-masked date entry molecule.
 *
 * Pattern B (atom-interactive, form-associated): renders its own `<input>`
 * inside shadow DOM and overlays a ghost format hint that lets the unfilled
 * `DD/MM/YYYY` segments stay visible while the user types — matching the
 * "focus: date-populated / month-populated / fully-populated" Figma states.
 *
 * @element mud-date-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 */
@Component({
  tag: 'mud-date-input',
  styleUrl: 'mud-date-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudDateInput {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: DateInputVariant = 'default';

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: DateInputSize = 'md';

  /**
   * Display format. The component accepts only the digits the format permits
   * and rewrites the value with the separator inline as the user types.
   * @default 'DD/MM/YYYY'
   */
  @Prop({ reflect: true }) format: DateInputFormat = 'DD/MM/YYYY';

  /**
   * The date-input type of the Figma Date Picker page (Types, 470:32035):
   * - `default` — one date; the calendar has a "Month Year" title.
   * - `advanced` — one date; the calendar has month and year dropdown chips.
   * - `date-range` — a start and an end date in one field
   *   (`18/01/2025 - 22/01/2025`); the value changes once both ends are picked.
   *
   * The mobile bottom sheet always uses the chips, as in the Figma Breakpoints.
   * @default 'default'
   */
  @Prop({ reflect: true }) type: DateInputType = 'default';

  /**
   * Calendar-popover placement. `auto` opens a desktop dropdown on wide
   * viewports and a full-width bottom sheet on narrow ones; `desktop` / `mobile`
   * force one layout.
   * @default 'auto'
   */
  @Prop({ reflect: true }) breakpoint: DateInputBreakpoint = 'auto';

  /**
   * Disables interactivity. The internal control receives `aria-disabled` and
   * the native `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Marks the field as mandatory. Adds a red asterisk to the label and sets
   * `aria-required` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Renders the field read-only. The control remains focusable and copyable.
   * @default false
   */
  @Prop({ reflect: true }) readonly: boolean = false;

  /**
   * Forces destructive visuals regardless of `variant`. Sets `aria-invalid`.
   * Use together with `errorText` to surface the message.
   * @default false
   */
  @Prop({ reflect: true }) invalid: boolean = false;

  /**
   * Current display value, matching the configured `format` (e.g. `15/04/2025`).
   * Reflects to the host attribute. Internal entry rewrites this prop as the
   * user types — consumers can read it back at any time.
   * @default ''
   */
  @Prop({ mutable: true, reflect: true }) value: string = '';

  /** Form-control `name`. Used during form submission. */
  @Prop({ reflect: true }) name?: string;

  /**
   * Inclusive lower bound in ISO `YYYY-MM-DD`. The validator rejects entries
   * below this date with an `out-of-range` error.
   */
  @Prop() min?: string;

  /**
   * Inclusive upper bound in ISO `YYYY-MM-DD`. The validator rejects entries
   * above this date with an `out-of-range` error.
   */
  @Prop() max?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text helper / hint shown below the control. */
  @Prop({ attribute: 'helper-text' }) helperText?: string;

  /**
   * Plain-text error message shown below the control when `invalid` is set.
   * When present it replaces `helperText` and pairs with the error icon.
   */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  /**
   * Placeholder shown when the control is empty. Defaults to the format
   * pattern (`DD/MM/YYYY` / `MM/DD/YYYY` / `YYYY-MM-DD`).
   */
  @Prop() placeholder?: string;

  /**
   * Accessible name. Mirrors to the internal control's `aria-label` when no
   * visible label is present.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  /**
   * Shows a trailing clear (×) button while the field holds a value, wiping the
   * entry in one click. Matches the Figma `clearButton` axis shown in the
   * Focus / Filled states. The button never appears while the field is empty,
   * disabled, or read-only. Opt-in, mirroring the Figma boolean axis.
   * @default false
   */
  @Prop({ reflect: true }) clearable: boolean = false;

  /** Accessible label for the clear (×) button. */
  @Prop({ attribute: 'clear-label' }) clearLabel: string = 'Șterge';

  /** Accessible name of the calendar dialog. */
  @Prop({ attribute: 'picker-label' }) pickerLabel: string = 'Selectează data';

  /** Message shown when a complete day segment is outside 01–31. */
  @Prop({ attribute: 'day-error-text' }) dayErrorText: string = 'Ziua trebuie să fie între 01 și 31';

  /** Message shown when a complete month segment is outside 01–12. */
  @Prop({ attribute: 'month-error-text' }) monthErrorText: string = 'Luna trebuie să fie între 01 și 12';

  /** Message shown when a complete year is outside the allowed years. */
  @Prop({ attribute: 'year-error-text' }) yearErrorText: string = 'Introduceți un an valid';

  /** Message shown when a complete date does not exist (e.g. `31/02/2025`). */
  @Prop({ attribute: 'date-error-text' }) dateErrorText: string = 'Introduceți o dată validă';

  /** Message shown when a complete date is outside `min` / `max`. */
  @Prop({ attribute: 'range-error-text' }) rangeErrorText: string = 'Data este în afara intervalului permis';

  /** `type="date-range"`: message shown when the end date is before the start date. */
  @Prop({ attribute: 'order-error-text' }) orderErrorText: string =
    'Data de sfârșit trebuie să fie după data de început';

  /**
   * Message shown when a `required` field is empty and a form submit found it
   * so. The same text is the form's validation message.
   */
  @Prop({ attribute: 'required-error-text' }) requiredErrorText: string = 'Introduceți data';

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private pickerOpen: boolean = false;
  @State() private isMobileViewport: boolean = false;
  @State() private validationError: DateInputValidationError | null = null;
  /** Set when a form submit found the required field empty; cleared once it holds a value. */
  @State() private requiredShown: boolean = false;

  @Element() host!: HTMLMudDateInputElement;

  @AttachInternals() internals!: ElementInternals;

  /**
   * Fires on every keystroke. `detail.value` is the current display value;
   * `detail.isoValue` is the ISO `YYYY-MM-DD` when fully populated and valid,
   * otherwise `null`. `detail.segment` is the segment under the caret.
   */
  @Event() mudInput!: EventEmitter<DateInputTypingDetail>;

  /**
   * Fires when the value is committed (typically on `blur` or `Enter`).
   * `detail.value` is the committed display value; `detail.isoValue` is the
   * ISO `YYYY-MM-DD` when fully populated and valid, otherwise `null`.
   */
  @Event() mudChange!: EventEmitter<DateInputChangeDetail>;

  /** Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  /** Fires when the user empties the field via the clear (×) button. */
  @Event() mudClear!: EventEmitter<void>;

  private readonly instanceId = ++dateInputInstanceCounter;
  private readonly labelId = `mud-date-input-label-${this.instanceId}`;
  private readonly helperId = `mud-date-input-helper-${this.instanceId}`;
  private readonly errorId = `mud-date-input-error-${this.instanceId}`;
  private initialValue: string = '';
  private mql?: MediaQueryList;
  /** Set when the calendar opens; cleared once focus has moved into it. */
  private focusPickerOnRender: boolean = false;
  /** Body `overflow` before the mobile bottom sheet locked page scroll; `undefined` while unlocked. */
  private lockedBodyOverflow?: string;

  private handleViewportChange = (ev: MediaQueryListEvent | MediaQueryList) => {
    this.isMobileViewport = ev.matches;
  };

  connectedCallback() {
    // Resolve the `auto` breakpoint from the viewport and keep it in sync.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.mql = window.matchMedia(MOBILE_VIEWPORT_QUERY);
      this.isMobileViewport = this.mql.matches;
      this.mql.addEventListener('change', this.handleViewportChange);
    }
  }

  disconnectedCallback() {
    this.mql?.removeEventListener('change', this.handleViewportChange);
    this.mql = undefined;
    this.unlockPageScroll();
  }

  componentWillLoad() {
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
    this.updateValidation(this.value);
  }

  componentDidRender() {
    if (!this.focusPickerOnRender) return;
    const picker = this.host.shadowRoot?.querySelector('mud-date-picker');
    if (!picker) return;
    this.focusPickerOnRender = false;
    picker.componentOnReady?.().then(() => {
      picker.shadowRoot?.querySelector<HTMLButtonElement>('button.day-cell[tabindex="0"]')?.focus();
    });
  }

  @Watch('variant')
  validateVariant(next: DateInputVariant) {
    if (!DATE_INPUT_VARIANTS.includes(next)) {
      console.warn(
        `[mud-date-input] variant="${String(next)}" is not supported. Supported: ${DATE_INPUT_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: DateInputSize) {
    if (!DATE_INPUT_SIZES.includes(next)) {
      console.warn(
        `[mud-date-input] size="${String(next)}" is not supported. Supported: ${DATE_INPUT_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('format')
  validateFormat(next: DateInputFormat) {
    if (!DATE_INPUT_FORMATS.includes(next)) {
      console.warn(
        `[mud-date-input] format="${String(next)}" is not supported. Supported: ${DATE_INPUT_FORMATS.join(
          ', ',
        )}. Falling back to "DD/MM/YYYY".`,
      );
      this.format = 'DD/MM/YYYY';
    }
  }

  @Watch('type')
  validateType(next: DateInputType) {
    if (!DATE_INPUT_TYPES.includes(next)) {
      console.warn(
        `[mud-date-input] type="${String(next)}" is not supported. Supported: ${DATE_INPUT_TYPES.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.type = 'default';
    }
  }

  @Watch('breakpoint')
  validateBreakpoint(next: DateInputBreakpoint) {
    if (!DATE_INPUT_BREAKPOINTS.includes(next)) {
      console.warn(
        `[mud-date-input] breakpoint="${String(next)}" is not supported. Supported: ${DATE_INPUT_BREAKPOINTS.join(
          ', ',
        )}. Falling back to "auto".`,
      );
      this.breakpoint = 'auto';
    }
  }

  /** Effective picker placement once `auto` is resolved against the viewport. */
  private resolvedBreakpoint(): 'desktop' | 'mobile' {
    if (this.breakpoint === 'desktop') return 'desktop';
    if (this.breakpoint === 'mobile') return 'mobile';
    return this.isMobileViewport ? 'mobile' : 'desktop';
  }

  @Watch('value')
  handleValueChange(next: string) {
    const value = next ?? '';
    this.internals.setFormValue(value, value);
    this.updateValidation(value);
  }

  @Watch('min')
  @Watch('max')
  @Watch('format')
  @Watch('type')
  @Watch('required')
  @Watch('disabled')
  revalidate() {
    this.updateValidation(this.value);
  }

  /**
   * Opening the calendar moves focus into it (dialog pattern) and, for the
   * modal bottom sheet, locks page scroll behind the scrim.
   */
  @Watch('pickerOpen')
  handlePickerOpenChange(open: boolean) {
    if (!open) {
      this.unlockPageScroll();
      return;
    }
    if (this.resolvedBreakpoint() === 'mobile') this.lockPageScroll();
    // The picker is not rendered yet; componentDidRender moves focus once it is.
    this.focusPickerOnRender = true;
  }

  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.internals.setFormValue(this.initialValue, this.initialValue);
    this.requiredShown = false;
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      this.value = state;
      this.internals.setFormValue(state, state);
    }
  }

  /**
   * Close the popover when a click lands outside the input (light DOM or
   * shadow DOM). The picker itself lives inside the input's shadow, so the
   * composedPath includes both surfaces.
   */
  @Listen('click', { target: 'window' })
  handleOutsideClick(ev: MouseEvent): void {
    if (!this.pickerOpen) return;
    const path = ev.composedPath();
    if (!path.includes(this.host)) {
      this.pickerOpen = false;
    }
  }

  /**
   * A form submit (or `checkValidity()`) found the field invalid. When it is a
   * required field left empty, show the required message under it.
   */
  @Listen('invalid')
  handleInvalid(): void {
    if (this.isValueMissing()) this.requiredShown = true;
  }

  /**
   * Close the popover when focus leaves the field and its popover — Tab past
   * the last control, or focus moved elsewhere on the page. A view switch
   * inside the popover briefly drops focus before moving it on, so a focus
   * loss with no destination is checked again two frames later.
   */
  @Listen('focusout')
  handleFocusOut(ev: FocusEvent): void {
    if (!this.pickerOpen) return;
    const next = ev.relatedTarget as Node | null;
    if (next && (next === this.host || this.host.contains(next))) return;
    if (next) {
      this.pickerOpen = false;
      return;
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (this.pickerOpen && !this.hasFocusWithin()) this.pickerOpen = false;
      }),
    );
  }

  /** Escape closes the popover and returns focus to the trailing-icon trigger. */
  @Listen('keydown')
  handlePopoverKeyDown(ev: KeyboardEvent): void {
    if (!this.pickerOpen || ev.key !== 'Escape') return;
    ev.stopPropagation();
    this.pickerOpen = false;
    const trigger = this.host.shadowRoot?.querySelector<HTMLButtonElement>('.trailing-icon');
    trigger?.focus();
  }

  /** Whether focus is on the field, its buttons or anything in its popover. */
  private hasFocusWithin(): boolean {
    return document.activeElement === this.host || Boolean(this.host.shadowRoot?.activeElement);
  }

  /** Whether the field holds a start and an end date. */
  private isRange(): boolean {
    return this.type === 'date-range';
  }

  /** The field's mask: one date, or two for `type="date-range"`. */
  private mask(): SegmentMask<DateSegmentKind> {
    return MASKS[this.format][this.isRange() ? 'range' : 'single'];
  }

  /** The mask of one date in the configured format. */
  private dateMask(): SegmentMask<DateSegmentKind> {
    return MASKS[this.format].single;
  }

  /**
   * The dates in a display value: one, or two for `type="date-range"`, split
   * at the range separator (the second is empty until typed).
   */
  private dateParts(display: string): string[] {
    if (!this.isRange()) return [display];
    const length = this.dateMask().pattern.length;
    return [display.slice(0, length), display.slice(length + RANGE_SEPARATOR.length)];
  }

  /**
   * Reverse of `toIsoDate`: format an ISO `YYYY-MM-DD` into the configured
   * display pattern (DD/MM/YYYY, MM/DD/YYYY, etc.). Used when the popover
   * picker emits a selection and we need to mirror it back into the masked
   * field.
   */
  private fromIsoValue(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [yyyy, mm, dd] = iso.split('-');
    const parts: Record<DateSegmentKind, string> = { YYYY: yyyy, MM: mm, DD: dd };
    const mask = this.dateMask();
    return mask.segments.map((seg, i) => parts[seg.kind] + (mask.separators[i] ?? '')).join('');
  }

  private readonly togglePicker = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.isInert() || this.readonly) return;
    this.pickerOpen = !this.pickerOpen;
  };

  private lockPageScroll() {
    if (this.lockedBodyOverflow !== undefined || typeof document === 'undefined') return;
    this.lockedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockPageScroll() {
    if (this.lockedBodyOverflow === undefined || typeof document === 'undefined') return;
    document.body.style.overflow = this.lockedBodyOverflow;
    this.lockedBodyOverflow = undefined;
  }

  private readonly handlePickerChange = (ev: CustomEvent<DatePickerChangeDetail>) => {
    // The picker's own `mudChange` is composed; stop it here so consumers only
    // receive this component's `mudChange` with the display value.
    ev.stopPropagation();
    if (this.isInert() || this.readonly) return;
    const display = this.pickedDisplay(ev.detail);
    // A range with only its start picked keeps the calendar open and the field
    // unchanged: closing now (outside click, Escape) must not apply anything.
    if (!display) return;
    if (display === this.value) {
      this.closePickerToField();
      return;
    }
    this.value = display;
    this.internals.setFormValue(display, display);
    this.mudChange.emit(this.changeDetail(display));
    this.closePickerToField();
  };

  /** The display value a picker selection resolves to, or `''` while a range is half picked. */
  private pickedDisplay(detail: DatePickerChangeDetail): string {
    if (this.isRange()) {
      if (!detail.rangeStart || !detail.rangeEnd) return '';
      return this.fromIsoValue(detail.rangeStart) + RANGE_SEPARATOR + this.fromIsoValue(detail.rangeEnd);
    }
    const next = detail.value;
    const iso = typeof next === 'string' ? next : Array.isArray(next) ? (next[0] ?? '') : '';
    return iso ? this.fromIsoValue(iso) : '';
  }

  /** Close the calendar and hand focus back to the field it filled. */
  private closePickerToField() {
    this.pickerOpen = false;
    this.host.shadowRoot?.querySelector<HTMLInputElement>('.native')?.focus();
  }

  /**
   * Re-format a raw input string into the configured pattern.
   * Strips everything that isn't a digit, then walks the segment spec and
   * inserts the separator after each segment when the next one starts. With
   * `trailingSeparator`, a just-completed valid segment also gets its separator
   * so the caret jumps to the next segment (Figma 487:7841); an invalid one
   * keeps the caret in place so the error can be corrected (489:8104).
   */
  private formatMasked(raw: string, trailingSeparator: boolean = false): string {
    const mask = this.mask();
    return applyMask(mask, raw, {
      trailingSeparator,
      acceptsSegment: (index, digits) => this.segmentInRange(mask.segments[index].kind, digits),
    });
  }

  /** Identify which segment the caret currently sits inside. */
  private segmentAtPosition(pos: number): DateInputSegment {
    const mask = this.mask();
    const index = segmentIndexAt(mask, pos);
    return index === null ? null : mask.segments[index].kind;
  }

  /**
   * Parse one date in the display format into ISO `YYYY-MM-DD`. Returns `null`
   * when it is incomplete, malformed, or a non-existent calendar date
   * (e.g. 31/02/2025).
   */
  private toIsoDate(display: string): string | null {
    const mask = this.dateMask();
    if (display.length !== mask.pattern.length) return null;
    const parts: Partial<Record<DateSegmentKind, string>> = {};
    const slices = readSegments(mask, display);
    for (let i = 0; i < mask.segments.length; i++) {
      if (!/^\d+$/.test(slices[i])) return null;
      parts[mask.segments[i].kind] = slices[i];
    }
    const dd = parts.DD ?? '';
    const mm = parts.MM ?? '';
    const yyyy = parts.YYYY ?? '';
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    // Reject impossible day-of-month (e.g. 30/02 or 31/04).
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return null;
    }
    return `${yyyy}-${mm}-${dd}`;
  }

  private withinBounds(iso: string): boolean {
    if (this.min && iso < this.min) return false;
    if (this.max && iso > this.max) return false;
    return true;
  }

  /** Day and month segments must fall in 01–31 / 01–12; the year is checked once complete. */
  private segmentInRange(kind: DateSegmentKind, digits: string): boolean {
    if (kind === 'YYYY') return true;
    const n = Number(digits);
    return n >= 1 && n <= SEGMENT_MAX[kind];
  }

  private yearBounds(): [number, number] {
    const min = /^\d{4}/.test(this.min ?? '') ? Number(this.min!.slice(0, 4)) : DEFAULT_MIN_YEAR;
    const max = /^\d{4}/.test(this.max ?? '') ? Number(this.max!.slice(0, 4)) : DEFAULT_MAX_YEAR;
    return [min, max];
  }

  /**
   * Validate a (possibly partial) display value segment by segment, in the
   * order the segments appear. Incomplete segments are not errors yet.
   */
  private validate(display: string): DateInputValidationError | null {
    const mask = this.mask();
    const slices = readSegments(mask, display);
    for (let i = 0; i < mask.segments.length; i++) {
      const seg = mask.segments[i];
      const slice = slices[i];
      if (slice.length < seg.length || !/^\d+$/.test(slice)) continue;
      if (!this.segmentInRange(seg.kind, slice)) return seg.kind === 'DD' ? 'day' : 'month';
      if (seg.kind === 'YYYY') {
        const [minYear, maxYear] = this.yearBounds();
        const year = Number(slice);
        if (year < minYear || year > maxYear) return 'year';
      }
    }
    // Each complete date on its own, then — for a range — their order.
    const isos: string[] = [];
    for (const part of this.dateParts(display)) {
      if (part.length !== this.dateMask().pattern.length) continue;
      const iso = this.toIsoDate(part);
      if (!iso) return 'date';
      if (!this.withinBounds(iso)) return 'range';
      isos.push(iso);
    }
    if (isos.length === 2 && isos[1] < isos[0]) return 'order';
    return null;
  }

  private updateValidation(display: string) {
    this.validationError = display ? this.validate(display) : null;
    if (!this.isValueMissing()) this.requiredShown = false;
    const message = this.validationError ? this.validationMessage(this.validationError) : '';
    // `setValidity` is missing in some test environments.
    if (typeof this.internals?.setValidity !== 'function') return;
    const anchor = this.host.shadowRoot?.querySelector<HTMLInputElement>('.native') ?? undefined;
    if (message) {
      this.internals.setValidity({ customError: true }, message, anchor);
    } else if (this.isValueMissing()) {
      // An empty required field blocks the form submit (SC 3.3.1).
      this.internals.setValidity({ valueMissing: true }, this.requiredErrorText, anchor);
    } else {
      this.internals.setValidity({});
    }
  }

  /** A required, editable field with no value. */
  private isValueMissing(): boolean {
    return this.required && (this.value ?? '') === '' && !this.isInert() && !this.readonly;
  }

  private validationMessage(error: DateInputValidationError): string {
    switch (error) {
      case 'day':
        return this.dayErrorText;
      case 'month':
        return this.monthErrorText;
      case 'year':
        return this.yearErrorText;
      case 'date':
        return this.dateErrorText;
      case 'range':
        return this.rangeErrorText;
      case 'order':
        return this.orderErrorText;
    }
  }

  private changeDetail(value: string): DateInputChangeDetail {
    const error = value ? this.validate(value) : null;
    const [first, second] = this.dateParts(value).map(part => {
      const iso = this.toIsoDate(part);
      return iso && this.withinBounds(iso) ? iso : null;
    });
    if (!this.isRange()) return { value, isoValue: first, error };
    const isoStart = first;
    const isoEnd = second ?? null;
    const isoValue = isoStart && isoEnd && error === null ? `${isoStart}/${isoEnd}` : null;
    return { value, isoValue, isoStart, isoEnd, error };
  }

  private detail(value: string, segment: DateInputSegment): DateInputTypingDetail {
    return { ...this.changeDetail(value), segment };
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };

  private onHelperSlotChange = (ev: Event) => {
    this.hasHelperSlot = this.slotHasContent(ev);
  };

  private slotHasContent(ev: Event): boolean {
    const slot = ev.target as HTMLSlotElement;
    return slot.assignedNodes({ flatten: true }).some(node => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim().length > 0;
      return true;
    });
  }

  private handleInput = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    const raw = target.value;
    // Deleting must be able to remove a separator, so only typing adds a trailing one.
    const deleting = ((ev as InputEvent).inputType ?? '').startsWith('delete');
    const masked = this.formatMasked(raw, !deleting);
    if (masked !== target.value) {
      // Re-write the field with the masked value and keep the caret at the
      // end of the typed prefix.
      target.value = masked;
      try {
        target.setSelectionRange(masked.length, masked.length);
      } catch {
        // Some input types (rare) throw on selection mutation — ignore.
      }
    }
    this.value = masked;
    const caret = target.selectionStart ?? masked.length;
    const segment = this.segmentAtPosition(caret);
    this.mudInput.emit(this.detail(masked, segment));
  };

  private handleChange = () => {
    this.mudChange.emit(this.changeDetail(this.value));
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.mudFocus.emit(ev);
  };

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.mudBlur.emit(ev);
  };

  private handleClearClick = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.isInert() || this.readonly || this.value === '') return;
    this.value = '';
    this.internals.setFormValue('', '');
    this.mudInput.emit(this.detail('', null));
    this.mudChange.emit(this.changeDetail(''));
    this.mudClear.emit();
    // Return focus to the field so the user can type a fresh date immediately.
    requestAnimationFrame(() => {
      this.host.shadowRoot?.querySelector<HTMLInputElement>('.native')?.focus();
    });
  };

  /** The clear (×) button is gated on having an editable, non-empty value. */
  private shouldShowClear(): boolean {
    return this.clearable && !this.isInert() && !this.readonly && this.value !== '';
  }

  private handleKeyDown = (ev: KeyboardEvent) => {
    // Pressing a segment's separator (`/`, `-` for ISO, `-` between the dates of
    // a range) while the segment is part-typed pads it with a leading zero and
    // jumps to the next one — the Figma "auto-jump after valid segment"
    // behavior with an explicit user trigger. Years are never padded.
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const target = ev.target as HTMLInputElement;
    const mask = this.mask();
    const padded = padSegmentOnSeparator(mask, target.value, ev.key);
    if (!padded || mask.segments[padded.index].kind === 'YYYY') return;
    ev.preventDefault();
    target.value = this.formatMasked(padded.value, true);
    this.value = target.value;
    try {
      target.setSelectionRange(target.value.length, target.value.length);
    } catch {
      // Ignore selection errors.
    }
    this.mudInput.emit(this.detail(target.value, this.segmentAtPosition(target.value.length)));
  };

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  /** Invalid when the consumer says so or the built-in validation fails. */
  private isInvalid(): boolean {
    return (
      this.invalid ||
      (this.validationError !== null && !this.isInert()) ||
      (this.requiredShown && this.isValueMissing())
    );
  }

  private resolvedVariant(): DateInputVariant {
    return this.isInvalid() ? 'destructive' : this.variant;
  }

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  /**
   * Message under the field: the consumer's `errorText` while `invalid` is
   * set, otherwise the built-in validation message.
   */
  private errorMessage(): string {
    const consumer = this.errorText?.trim();
    if (this.invalid && consumer) return consumer;
    if (this.validationError && !this.isInert()) return this.validationMessage(this.validationError);
    if (this.requiredShown && this.isValueMissing()) return this.requiredErrorText;
    return '';
  }

  private hasErrorMessage(): boolean {
    return this.errorMessage().length > 0;
  }

  private hasHelperMessage(): boolean {
    if (this.hasErrorMessage()) return false;
    if (this.helperText && this.helperText.trim().length > 0) return true;
    return this.hasHelperSlot;
  }

  private describedBy(): string | undefined {
    const ids: string[] = [];
    if (this.hasErrorMessage()) ids.push(this.errorId);
    else if (this.hasHelperMessage()) ids.push(this.helperId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  private resolvedPlaceholder(): string {
    // Fall back to the format pattern (e.g. "DD/MM/YYYY") whenever no meaningful
    // placeholder is set. Use a truthy check (not `??`) so an explicit empty
    // string doesn't blank the format hint — the empty field always shows it.
    return this.placeholder?.trim() ? this.placeholder : this.mask().pattern;
  }

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorMessage();
    const isInvalid = this.isInvalid();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.ariaLabel : undefined;
    const placeholder = this.resolvedPlaceholder();
    const iconSize = this.size === 'lg' ? 24 : 20;
    const pickerBreakpoint = this.resolvedBreakpoint();
    const isMobilePopover = pickerBreakpoint === 'mobile';
    // The calendar shows the typed dates when they are real; a range shows only
    // once its start is valid.
    const pickerDates = this.dateParts(this.value).map(part => this.toIsoDate(part));

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-invalid': isInvalid,
      // The open calendar belongs to the field: Figma draws the field focused
      // while it is open, although focus has moved into the calendar.
      'is-focused': (this.isFocused || this.pickerOpen) && !effectivelyDisabled,
      'is-populated': this.value.length > 0,
      'has-label': this.hasVisibleLabel(),
      [`variant-${variant}`]: true,
    };

    const ghost = ghostParts(this.mask(), this.value);

    return (
      <Host class={hostClasses}>
        <label class="label" htmlFor={`date-input-${this.instanceId}`} id={this.labelId} part="label">
          <span class="label-text">
            <slot name="label" onSlotchange={this.onLabelSlotChange}>
              {labelText}
            </slot>
          </span>
          {this.required ? (
            <span class="required-mark" aria-hidden="true" part="required-mark">
              <mud-icon name="asterisk" size={16} />
            </span>
          ) : null}
        </label>

        <div class="control" part="control">
          <div class="field">
            <input
              id={`date-input-${this.instanceId}`}
              class="native"
              part="native"
              type="text"
              name={this.name}
              value={this.value}
              placeholder={placeholder}
              disabled={effectivelyDisabled}
              readonly={this.readonly}
              required={this.required}
              autocomplete="off"
              inputMode="numeric"
              spellcheck={false}
              maxLength={this.mask().pattern.length}
              aria-label={ariaLabelAttr}
              aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
              aria-describedby={this.describedBy()}
              aria-invalid={isInvalid ? 'true' : null}
              aria-required={this.required ? 'true' : null}
              aria-disabled={effectivelyDisabled ? 'true' : null}
              aria-placeholder={placeholder}
              onInput={this.handleInput}
              onChange={this.handleChange}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
              onKeyDown={this.handleKeyDown}
            />
            {/* Ghost overlay: keeps the unfilled segments of the format pattern
                visible under the caret WHILE the user types. Gated on
                `isFocused` so partial-typed-blurred values stop showing the
                hint — that's a transient state and exposing the ghost there
                trips axe's `color-contrast.bgOverlap` heuristic without
                adding real value (the input has already lost focus; the user
                isn't actively being guided). The empty case still relies on
                the native `placeholder`. */}
            {this.isFocused && this.value.length > 0 && ghost.remaining ? (
              <span class="ghost" aria-hidden="true" part="ghost">
                <span class="ghost-typed">{ghost.typed}</span>
                <span class="ghost-remaining">{ghost.remaining}</span>
              </span>
            ) : null}
          </div>

          {this.shouldShowClear() ? (
            <button
              type="button"
              class="clear-button"
              part="clear-button"
              tabindex={-1}
              aria-label={this.clearLabel}
              onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
              onClick={this.handleClearClick}
            >
              <mud-icon name="cross-small" size={16} />
            </button>
          ) : null}

          <button
            type="button"
            class="trailing-icon"
            part="trailing-icon"
            aria-label="Deschide calendarul"
            aria-haspopup="dialog"
            aria-expanded={this.pickerOpen ? 'true' : 'false'}
            /* `aria-controls` references the popover ID — only emit it while the
               popover is actually mounted so axe's `aria-valid-attr-value` rule
               doesn't see a dangling id. */
            aria-controls={this.pickerOpen ? `date-input-picker-${this.instanceId}` : undefined}
            disabled={effectivelyDisabled || this.readonly}
            onClick={this.togglePicker}
          >
            <mud-icon name="calendar" size={iconSize} />
          </button>

          {/* The popover lives inside `.control` so it anchors under the field,
              not under the helper / error text below it. */}
          {this.pickerOpen
            ? [
                isMobilePopover ? (
                  <div
                    class="picker-backdrop"
                    part="picker-backdrop"
                    aria-hidden="true"
                    onClick={() => (this.pickerOpen = false)}
                  ></div>
                ) : null,
                <div
                  class={{ 'picker-popover': true, 'is-mobile': isMobilePopover }}
                  part="picker-popover"
                  role="dialog"
                  aria-label={this.pickerLabel}
                  aria-modal={isMobilePopover ? 'true' : undefined}
                  id={`date-input-picker-${this.instanceId}`}
                >
                  <mud-date-picker
                    mode={this.isRange() ? 'range' : 'single'}
                    breakpoint={pickerBreakpoint}
                    headerStyle={isMobilePopover || this.type === 'advanced' ? 'dropdown' : 'title'}
                    locale="ro-RO"
                    value={this.isRange() ? undefined : (pickerDates[0] ?? undefined)}
                    rangeStart={this.isRange() ? (pickerDates[0] ?? undefined) : undefined}
                    rangeEnd={this.isRange() ? (pickerDates[1] ?? undefined) : undefined}
                    min={this.min}
                    max={this.max}
                    onMudChange={this.handlePickerChange}
                  ></mud-date-picker>
                </div>,
              ]
            : null}
        </div>

        {/* Announces the error as it appears or changes (SC 4.1.3). The visible
            error below is aria-hidden so it is not read twice; the field still
            gets it as its description through aria-describedby. */}
        <span class="live-region" role="status" aria-live="polite" aria-atomic="true">
          {errorText}
        </span>

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error" aria-hidden="true">
            <mud-icon
              class="assistive-icon"
              name="circle-error"
              variant="filled"
              size={20}
              color="icon-danger-default"
            />
            <span class="assistive-text">{errorText}</span>
          </div>
        ) : this.hasHelperMessage() ? (
          <div class="assistive assistive-helper" id={this.helperId} part="helper">
            <span class="assistive-text">
              <slot name="helper" onSlotchange={this.onHelperSlotChange}>
                {helperText}
              </slot>
            </span>
          </div>
        ) : null}
      </Host>
    );
  }
}
