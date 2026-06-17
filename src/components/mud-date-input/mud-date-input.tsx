import {
  AttachInternals,
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';

import { DATE_INPUT_FORMATS, DATE_INPUT_SIZES, DATE_INPUT_VARIANTS } from './mud-date-input.types';
import type {
  DateInputChangeDetail,
  DateInputFormat,
  DateInputSegment,
  DateInputSize,
  DateInputTypingDetail,
  DateInputVariant,
} from './mud-date-input.types';

let dateInputInstanceCounter = 0;

interface SegmentSpec {
  kind: 'DD' | 'MM' | 'YYYY';
  length: number;
}

interface FormatSpec {
  pattern: string;
  separator: string;
  segments: SegmentSpec[];
  /** Lookup: segment kind → index in the typed value where it starts. */
  offsets: Record<'DD' | 'MM' | 'YYYY', number>;
}

const FORMAT_SPECS: Record<DateInputFormat, FormatSpec> = {
  'DD/MM/YYYY': {
    pattern: 'DD/MM/YYYY',
    separator: '/',
    segments: [
      { kind: 'DD', length: 2 },
      { kind: 'MM', length: 2 },
      { kind: 'YYYY', length: 4 },
    ],
    offsets: { DD: 0, MM: 3, YYYY: 6 },
  },
  'MM/DD/YYYY': {
    pattern: 'MM/DD/YYYY',
    separator: '/',
    segments: [
      { kind: 'MM', length: 2 },
      { kind: 'DD', length: 2 },
      { kind: 'YYYY', length: 4 },
    ],
    offsets: { MM: 0, DD: 3, YYYY: 6 },
  },
  'YYYY-MM-DD': {
    pattern: 'YYYY-MM-DD',
    separator: '-',
    segments: [
      { kind: 'YYYY', length: 4 },
      { kind: 'MM', length: 2 },
      { kind: 'DD', length: 2 },
    ],
    offsets: { YYYY: 0, MM: 5, DD: 8 },
  },
};

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
  @Prop() name?: string;

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

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private pickerOpen: boolean = false;

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

  componentWillLoad() {
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
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

  @Watch('value')
  handleValueChange(next: string) {
    const value = next ?? '';
    this.internals.setFormValue(value, value);
  }

  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.internals.setFormValue(this.initialValue, this.initialValue);
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

  /** Escape closes the popover and returns focus to the trailing-icon trigger. */
  @Listen('keydown')
  handlePopoverKeyDown(ev: KeyboardEvent): void {
    if (!this.pickerOpen || ev.key !== 'Escape') return;
    ev.stopPropagation();
    this.pickerOpen = false;
    const trigger = this.host.shadowRoot?.querySelector<HTMLButtonElement>('.trailing-icon');
    trigger?.focus();
  }

  private spec(): FormatSpec {
    return FORMAT_SPECS[this.format];
  }

  /**
   * Reverse of `toIsoValue`: format an ISO `YYYY-MM-DD` into the configured
   * display pattern (DD/MM/YYYY, MM/DD/YYYY, etc.). Used when the popover
   * picker emits a selection and we need to mirror it back into the masked
   * field.
   */
  private fromIsoValue(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [yyyy, mm, dd] = iso.split('-');
    const spec = this.spec();
    let display = '';
    for (let i = 0; i < spec.segments.length; i += 1) {
      const seg = spec.segments[i];
      const value = seg.kind === 'YYYY' ? yyyy : seg.kind === 'MM' ? mm : dd;
      display += value;
      if (i < spec.segments.length - 1) display += spec.separator;
    }
    return display;
  }

  private readonly togglePicker = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.isInert()) return;
    this.pickerOpen = !this.pickerOpen;
  };

  private readonly handlePickerChange = (ev: CustomEvent<{ value: string | string[] }>) => {
    const next = ev.detail.value;
    const iso = typeof next === 'string' ? next : Array.isArray(next) ? next[0] : '';
    if (!iso) return;
    const display = this.fromIsoValue(iso);
    if (display === this.value) {
      this.pickerOpen = false;
      return;
    }
    this.value = display;
    this.internals.setFormValue(display, display);
    this.mudChange.emit({ value: display, isoValue: this.withinBounds(iso) ? iso : null });
    this.pickerOpen = false;
  };

  /**
   * Re-format a raw input string into the configured pattern.
   * Strips everything that isn't a digit, then walks the segment spec and
   * inserts the separator after each segment when the next one starts.
   */
  private formatMasked(raw: string): string {
    const spec = this.spec();
    const digits = (raw ?? '').replace(/\D/g, '').slice(
      0,
      spec.segments.reduce((sum, s) => sum + s.length, 0),
    );
    let out = '';
    let cursor = 0;
    for (let i = 0; i < spec.segments.length; i++) {
      const seg = spec.segments[i];
      const slice = digits.slice(cursor, cursor + seg.length);
      if (slice.length === 0) break;
      out += slice;
      cursor += seg.length;
      if (slice.length === seg.length && cursor < digits.length) {
        out += spec.separator;
      }
    }
    return out;
  }

  /** Identify which segment the caret currently sits inside. */
  private segmentAtPosition(pos: number): DateInputSegment {
    const spec = this.spec();
    let start = 0;
    for (const seg of spec.segments) {
      const end = start + seg.length;
      if (pos <= end) return seg.kind;
      start = end + 1; // skip separator
    }
    return null;
  }

  /** Split the typed prefix into typed / remaining parts for the ghost overlay. */
  private ghostParts(): { typed: string; remaining: string } {
    const spec = this.spec();
    if (this.value.length === 0) {
      return { typed: '', remaining: spec.pattern };
    }
    if (this.value.length >= spec.pattern.length) {
      return { typed: this.value, remaining: '' };
    }
    return {
      typed: this.value,
      remaining: spec.pattern.slice(this.value.length),
    };
  }

  /**
   * Parse a display value into ISO `YYYY-MM-DD`. Returns `null` when the value
   * is incomplete, malformed, or designates a non-existent calendar date
   * (e.g. 31/02/2025).
   */
  private toIsoValue(display: string): string | null {
    const spec = this.spec();
    if (display.length !== spec.pattern.length) return null;
    const parts: Partial<Record<'DD' | 'MM' | 'YYYY', string>> = {};
    let cursor = 0;
    for (const seg of spec.segments) {
      const slice = display.slice(cursor, cursor + seg.length);
      if (!/^\d+$/.test(slice)) return null;
      parts[seg.kind] = slice;
      cursor += seg.length + 1; // +1 for separator (last loop overshoots harmlessly)
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

  private detail(value: string, segment: DateInputSegment): DateInputTypingDetail {
    const iso = this.toIsoValue(value);
    return { value, isoValue: iso && this.withinBounds(iso) ? iso : null, segment };
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
    const masked = this.formatMasked(raw);
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
    const iso = this.toIsoValue(this.value);
    this.mudChange.emit({ value: this.value, isoValue: iso && this.withinBounds(iso) ? iso : null });
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
    this.mudChange.emit({ value: '', isoValue: null });
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
    // Pressing `/` (or `-` for ISO format) jumps to the next segment when the
    // current one isn't filled yet — matches the Figma "auto-jump after valid
    // segment" behavior with an explicit user trigger.
    if (ev.key === this.spec().separator && !ev.ctrlKey && !ev.metaKey) {
      const target = ev.target as HTMLInputElement;
      const value = target.value;
      // Already at a separator slot? Just advance.
      if (value.length > 0 && !value.endsWith(this.spec().separator)) {
        // If we're mid-segment, the formatter will insert the separator on the
        // next valid digit. We pad the current segment with leading zero when
        // the user typed only one digit and presses separator.
        const lastSegmentStart = value.lastIndexOf(this.spec().separator) + 1;
        const lastSegment = value.slice(lastSegmentStart);
        const expectedLength = this.spec().segments.find(s => {
          const offset = this.spec().offsets[s.kind];
          return offset === lastSegmentStart;
        })?.length;
        if (lastSegment.length > 0 && expectedLength !== undefined && lastSegment.length < expectedLength) {
          ev.preventDefault();
          const padded = lastSegment.padStart(expectedLength, '0');
          const next = value.slice(0, lastSegmentStart) + padded + this.spec().separator;
          target.value = this.formatMasked(next);
          this.value = target.value;
          try {
            target.setSelectionRange(target.value.length, target.value.length);
          } catch {
            // Ignore selection errors.
          }
          this.mudInput.emit(this.detail(target.value, this.segmentAtPosition(target.value.length)));
        }
      }
    }
  };

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private resolvedVariant(): DateInputVariant {
    return this.invalid ? 'destructive' : this.variant;
  }

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  private hasErrorMessage(): boolean {
    return this.invalid && Boolean(this.errorText && this.errorText.trim().length > 0);
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
    return this.placeholder ?? this.spec().pattern;
  }

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.ariaLabel : undefined;
    const placeholder = this.resolvedPlaceholder();
    const iconSize = this.size === 'lg' ? 24 : 20;

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled,
      'is-populated': this.value.length > 0,
      'has-label': this.hasVisibleLabel(),
      [`variant-${variant}`]: true,
    };

    const ghost = this.ghostParts();

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
              *
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
              maxLength={this.spec().pattern.length}
              aria-label={ariaLabelAttr}
              aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
              aria-describedby={this.describedBy()}
              aria-invalid={this.invalid ? 'true' : null}
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
              <mud-icon name="cross-small" size={iconSize} />
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
            disabled={effectivelyDisabled}
            onClick={this.togglePicker}
          >
            <mud-icon name="calendar" size={iconSize} />
          </button>
        </div>

        {this.pickerOpen ? (
          <div class="picker-popover" part="picker-popover" role="dialog" id={`date-input-picker-${this.instanceId}`}>
            <mud-date-picker
              mode="single"
              breakpoint="desktop"
              locale="ro-RO"
              value={this.toIsoValue(this.value) ?? undefined}
              min={this.min}
              max={this.max}
              onMudChange={this.handlePickerChange}
            ></mud-date-picker>
          </div>
        ) : null}

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error">
            <mud-icon class="assistive-icon" name="circle-error-filled" size={20} color="icon-danger-default" />
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
