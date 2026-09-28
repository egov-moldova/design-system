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
import type { TimePickerChangeDetail } from '../mud-time-picker/mud-time-picker.types';
import { TIME_INPUT_SIZES, TIME_INPUT_VARIANTS } from './mud-time-input.types';
import type {
  TimeInputChangeDetail,
  TimeInputSegment,
  TimeInputSize,
  TimeInputTypingDetail,
  TimeInputValidationError,
  TimeInputVariant,
} from './mud-time-input.types';

let timeInputInstanceCounter = 0;

type TimeSegmentKind = 'HH' | 'MM';

/** `HH:MM`, 24-hour (Figma time-input placeholder). */
const TIME_MASK = createSegmentMask<TimeSegmentKind>(
  [
    { kind: 'HH', length: 2 },
    { kind: 'MM', length: 2 },
  ],
  [':'],
);

/** Highest valid value of each segment. */
const SEGMENT_MAX: Record<TimeSegmentKind, number> = { HH: 23, MM: 59 };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Time Input — segment-masked `HH:MM` entry with an hour / minute picker.
 *
 * Pattern B (atom-interactive, form-associated): renders its own `<input>`
 * inside shadow DOM, like `mud-date-input`, and overlays a ghost format hint
 * that keeps the unfilled segments visible while the user types. The clock
 * button opens `mud-time-picker` (Figma Time frame 13807:8471).
 *
 * @element mud-time-input
 *
 * Without a visible label, name the field with `aria-label` on the element; it
 * is moved onto the internal control.
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when an error message is shown.
 */
@Component({
  tag: 'mud-time-input',
  styleUrl: 'mud-time-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudTimeInput {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: TimeInputVariant = 'default';

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: TimeInputSize = 'md';

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
   * Current display value, `HH:MM` (24-hour). Reflects to the host attribute;
   * typing rewrites it, so consumers can read it back at any time.
   * @default ''
   */
  @Prop({ mutable: true, reflect: true }) value: string = '';

  /** Form-control `name`. Used during form submission. */
  @Prop({ reflect: true }) name?: string;

  /** Earliest accepted time, `HH:MM` inclusive. Earlier entries get a `range` error. */
  @Prop() min?: string;

  /** Latest accepted time, `HH:MM` inclusive. Later entries get a `range` error. */
  @Prop() max?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text helper / hint shown below the control. */
  @Prop() helperText?: string;

  /**
   * Plain-text error message shown below the control when `invalid` is set.
   * When present it replaces `helperText` and pairs with the error icon.
   */
  @Prop() errorText?: string;

  /** Placeholder shown when the control is empty. Defaults to `HH:MM`. */
  @Prop() placeholder?: string;

  /**
   * Shows a trailing clear (×) button while the field holds a value (Figma
   * `👁️ Clear Button` axis). Never shown while empty, disabled or read-only.
   * @default false
   */
  @Prop({ reflect: true }) clearable: boolean = false;

  /** Accessible label for the clear (×) button. */
  @Prop() clearLabel: string = 'Șterge';

  /** Accessible label for the clock button that opens the picker. */
  @Prop() triggerLabel: string = 'Deschide selectorul de oră';

  /** Accessible name of the picker dialog. */
  @Prop() pickerLabel: string = 'Selectează ora';

  /** Message shown when a complete hour segment is outside 00–23. */
  @Prop() hourErrorText: string = 'Ora trebuie să fie între 00 și 23';

  /** Message shown when a complete minute segment is outside 00–59. */
  @Prop() minuteErrorText: string = 'Minutele trebuie să fie între 00 și 59';

  /** Message shown when a complete time is outside `min` / `max`. */
  @Prop() rangeErrorText: string = 'Ora este în afara intervalului permis';

  /**
   * Message shown when a `required` field is empty and a form submit found it
   * so. The same text is the form's validation message.
   */
  @Prop() requiredErrorText: string = 'Introduceți ora';

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private pickerOpen: boolean = false;
  @State() private validationError: TimeInputValidationError | null = null;
  /** Set when a form submit found the required field empty; cleared once it holds a value. */
  @State() private requiredShown: boolean = false;
  /**
   * The host's `aria-label`, moved onto the internal control. Read from the
   * attribute rather than declared as a prop, which would shadow
   * `HTMLElement.ariaLabel` (#88).
   */
  @State() private hostAriaLabel?: string;

  @Element() host!: HTMLMudTimeInputElement;

  @AttachInternals() internals!: ElementInternals;

  /**
   * Fires on every keystroke. `detail.value` is the current display value;
   * `detail.isoValue` is the `HH:MM` time when complete and valid, otherwise
   * `null`. `detail.segment` is the segment under the caret.
   */
  @Event() mudInput!: EventEmitter<TimeInputTypingDetail>;

  /**
   * Fires when the value is committed — on `change` (blur), a picker selection
   * or the clear button.
   */
  @Event() mudChange!: EventEmitter<TimeInputChangeDetail>;

  /** Fires when the internal control gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  /** Fires when the user empties the field via the clear (×) button. */
  @Event() mudClear!: EventEmitter<void>;

  private readonly instanceId = ++timeInputInstanceCounter;
  private readonly inputId = `time-input-${this.instanceId}`;
  private readonly labelId = `mud-time-input-label-${this.instanceId}`;
  private readonly helperId = `mud-time-input-helper-${this.instanceId}`;
  private readonly errorId = `mud-time-input-error-${this.instanceId}`;
  private readonly pickerId = `time-input-picker-${this.instanceId}`;
  private initialValue: string = '';
  private ariaLabelObserver?: MutationObserver;
  /** Set when the picker opens; cleared once focus has moved into it. */
  private focusPickerOnRender: boolean = false;
  /** Whether the next open should move focus into the picker. */
  private focusPickerOnOpen: boolean = true;

  @Watch('variant')
  validateVariant(next: TimeInputVariant) {
    if (!TIME_INPUT_VARIANTS.includes(next)) {
      console.warn(
        `[mud-time-input] variant="${String(next)}" is not supported. Supported: ${TIME_INPUT_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: TimeInputSize) {
    if (!TIME_INPUT_SIZES.includes(next)) {
      console.warn(
        `[mud-time-input] size="${String(next)}" is not supported. Supported: ${TIME_INPUT_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('value')
  handleValueChange(next: string) {
    const value = next ?? '';
    this.internals.setFormValue(value, value);
    this.updateValidation(value);
  }

  @Watch('min')
  @Watch('max')
  @Watch('required')
  @Watch('disabled')
  revalidate() {
    this.updateValidation(this.value);
  }

  /**
   * Opening the picker from the clock button moves focus into it (dialog
   * pattern); opening it from the field leaves focus in the input.
   */
  @Watch('pickerOpen')
  handlePickerOpenChange(open: boolean) {
    if (!open) return;
    // The picker is not rendered yet; componentDidRender moves focus once it is.
    this.focusPickerOnRender = this.focusPickerOnOpen;
    this.focusPickerOnOpen = true;
  }

  /** Close the picker when a click lands outside the field (light or shadow DOM). */
  @Listen('click', { target: 'window' })
  handleOutsideClick(ev: MouseEvent): void {
    if (!this.pickerOpen) return;
    if (!ev.composedPath().includes(this.host)) this.pickerOpen = false;
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

  /** Escape closes the picker and returns focus to the clock button. */
  @Listen('keydown')
  handlePopoverKeyDown(ev: KeyboardEvent): void {
    if (!this.pickerOpen || ev.key !== 'Escape') return;
    ev.stopPropagation();
    this.pickerOpen = false;
    this.host.shadowRoot?.querySelector<HTMLButtonElement>('.trailing-icon')?.focus();
  }

  connectedCallback() {
    this.captureAriaLabel();
    // Keep a later `aria-label` change in sync; removing it re-fires with no attribute.
    if (typeof MutationObserver === 'undefined') return;
    this.ariaLabelObserver = new MutationObserver(() => this.captureAriaLabel());
    this.ariaLabelObserver.observe(this.host, { attributes: true, attributeFilter: ['aria-label'] });
  }

  disconnectedCallback() {
    this.ariaLabelObserver?.disconnect();
    this.ariaLabelObserver = undefined;
  }

  componentWillLoad() {
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
    this.updateValidation(this.value);
  }

  componentDidRender() {
    if (!this.focusPickerOnRender) return;
    const picker = this.host.shadowRoot?.querySelector('mud-time-picker');
    if (!picker) return;
    this.focusPickerOnRender = false;
    picker.componentOnReady?.().then(() => {
      picker.shadowRoot?.querySelector<HTMLElement>('.column.is-active [role="option"][tabindex="0"]')?.focus();
    });
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

  /** Whether focus is on the field, its buttons or anything in its popover. */
  private hasFocusWithin(): boolean {
    return document.activeElement === this.host || Boolean(this.host.shadowRoot?.activeElement);
  }

  /**
   * Move the host's `aria-label` onto the internal control: the host has no
   * role, so a name left on it would not be exposed.
   */
  private captureAriaLabel() {
    const value = this.host.getAttribute('aria-label');
    if (value === null) return;
    this.hostAriaLabel = value.trim() || undefined;
    this.host.removeAttribute('aria-label');
  }

  private readonly togglePicker = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.isInert() || this.readonly) return;
    this.pickerOpen = !this.pickerOpen;
  };

  /**
   * A click anywhere on the field opens the picker, not only the clock button,
   * as the date input opens its calendar. Focus stays where the click put it —
   * the caret in the input — so the user can keep typing; only the clock
   * button moves focus into the picker.
   */
  private readonly handleFieldClick = (ev: MouseEvent) => {
    if (this.isInert() || this.readonly) return;
    // The clear button and the picker itself sit inside `.control`; a click on
    // either is not a click on the field.
    const path = ev.composedPath();
    const own = this.host.shadowRoot;
    for (const selector of ['.clear-button', '.picker-popover']) {
      const el = own?.querySelector(selector);
      if (el && path.includes(el)) return;
    }
    if (this.pickerOpen) return;
    this.focusPickerOnOpen = false;
    this.pickerOpen = true;
  };

  private readonly handlePickerChange = (ev: CustomEvent<TimePickerChangeDetail>) => {
    // The picker's own `mudChange` is composed; stop it here so consumers only
    // receive this component's `mudChange`.
    ev.stopPropagation();
    if (this.isInert() || this.readonly) return;
    const next = ev.detail.value;
    if (next !== this.value) {
      this.value = next;
      this.internals.setFormValue(next, next);
      this.mudChange.emit(this.changeDetail(next));
    }
    this.pickerOpen = false;
    this.host.shadowRoot?.querySelector<HTMLInputElement>('.native')?.focus();
  };

  /**
   * Re-format raw input into `HH:MM`. With `trailingSeparator`, a just-completed
   * valid hour also gets its `:` so the caret moves on to the minutes; an
   * invalid one keeps the caret in place so it can be corrected.
   */
  private formatMasked(raw: string, trailingSeparator: boolean = false): string {
    return applyMask(TIME_MASK, raw, {
      trailingSeparator,
      acceptsSegment: (index, digits) => this.segmentInRange(TIME_MASK.segments[index].kind, digits),
    });
  }

  private segmentAtPosition(pos: number): TimeInputSegment {
    const index = segmentIndexAt(TIME_MASK, pos);
    return index === null ? null : TIME_MASK.segments[index].kind;
  }

  private segmentInRange(kind: TimeSegmentKind, digits: string): boolean {
    return Number(digits) <= SEGMENT_MAX[kind];
  }

  /** Minutes since midnight of a complete `HH:MM`, else `null`. */
  private minuteOfDay(value: string | undefined): number | null {
    const match = TIME_RE.exec(value ?? '');
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  private withinBounds(value: string): boolean {
    const at = this.minuteOfDay(value);
    const min = this.minuteOfDay(this.min);
    const max = this.minuteOfDay(this.max);
    if (at === null) return false;
    return (min === null || at >= min) && (max === null || at <= max);
  }

  /** Validate a (possibly partial) value segment by segment; incomplete segments are not errors yet. */
  private validate(display: string): TimeInputValidationError | null {
    const slices = readSegments(TIME_MASK, display);
    for (let i = 0; i < TIME_MASK.segments.length; i++) {
      const seg = TIME_MASK.segments[i];
      if (slices[i].length < seg.length || !/^\d+$/.test(slices[i])) continue;
      if (!this.segmentInRange(seg.kind, slices[i])) return seg.kind === 'HH' ? 'hour' : 'minute';
    }
    if (!TIME_RE.test(display)) return null;
    return this.withinBounds(display) ? null : 'range';
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

  private validationMessage(error: TimeInputValidationError): string {
    switch (error) {
      case 'hour':
        return this.hourErrorText;
      case 'minute':
        return this.minuteErrorText;
      case 'range':
        return this.rangeErrorText;
    }
  }

  private changeDetail(value: string): TimeInputChangeDetail {
    const isoValue = TIME_RE.test(value) && this.withinBounds(value) ? value : null;
    return { value, isoValue, error: value ? this.validate(value) : null };
  }

  private detail(value: string, segment: TimeInputSegment): TimeInputTypingDetail {
    return { ...this.changeDetail(value), segment };
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };

  private onHelperSlotChange = (ev: Event) => {
    // The helper slot moves between the hidden holder and the helper row. The
    // slot just removed also fires slotchange, now empty; it must not win.
    if (!(ev.target as Node).isConnected) return;
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
    // Deleting must be able to remove the separator, so only typing adds a trailing one.
    const deleting = ((ev as InputEvent).inputType ?? '').startsWith('delete');
    const masked = this.formatMasked(target.value, !deleting);
    if (masked !== target.value) {
      target.value = masked;
      try {
        target.setSelectionRange(masked.length, masked.length);
      } catch {
        // Some input types (rare) throw on selection mutation — ignore.
      }
    }
    this.value = masked;
    this.mudInput.emit(this.detail(masked, this.segmentAtPosition(target.selectionStart ?? masked.length)));
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

  /** `:` while the hour is part-typed pads it with a leading zero (`9` + `:` → `09:`). */
  private handleKeyDown = (ev: KeyboardEvent) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const target = ev.target as HTMLInputElement;
    const padded = padSegmentOnSeparator(TIME_MASK, target.value, ev.key);
    if (!padded) return;
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

  private handleClearClick = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.isInert() || this.readonly || this.value === '') return;
    this.value = '';
    this.internals.setFormValue('', '');
    this.mudInput.emit(this.detail('', null));
    this.mudChange.emit(this.changeDetail(''));
    this.mudClear.emit();
    // Return focus to the field so the user can type a fresh time immediately.
    requestAnimationFrame(() => {
      this.host.shadowRoot?.querySelector<HTMLInputElement>('.native')?.focus();
    });
  };

  private shouldShowClear(): boolean {
    return this.clearable && !this.isInert() && !this.readonly && this.value !== '';
  }

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

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  /** The consumer's `errorText` while `invalid` is set, otherwise the built-in validation message. */
  private errorMessage(): string {
    const consumer = this.errorText?.trim();
    if (this.invalid && consumer) return consumer;
    if (this.validationError && !this.isInert()) return this.validationMessage(this.validationError);
    if (this.requiredShown && this.isValueMissing()) return this.requiredErrorText;
    return '';
  }

  private hasHelperMessage(): boolean {
    if (this.errorMessage()) return false;
    if (this.helperText && this.helperText.trim().length > 0) return true;
    return this.hasHelperSlot;
  }

  private describedBy(): string | undefined {
    if (this.errorMessage()) return this.errorId;
    if (this.hasHelperMessage()) return this.helperId;
    return undefined;
  }

  render() {
    const inert = this.isInert();
    const isInvalid = this.isInvalid();
    const errorText = this.errorMessage();
    // Truthy check, not `??`: an explicit empty placeholder still shows the format hint.
    const placeholder = this.placeholder?.trim() ? this.placeholder : TIME_MASK.pattern;
    const ghost = ghostParts(TIME_MASK, this.value);

    const hostClasses = {
      'is-disabled': inert,
      'is-readonly': this.readonly,
      'is-invalid': isInvalid,
      // The open picker belongs to the field: it is drawn focused while open,
      // although focus has moved into the picker (Figma 13810:9449).
      'is-focused': (this.isFocused || this.pickerOpen) && !inert,
      'is-populated': this.value.length > 0,
      'has-label': this.hasVisibleLabel(),
      [`variant-${isInvalid ? 'destructive' : this.variant}`]: true,
    };

    return (
      <Host class={hostClasses}>
        <label class="label" htmlFor={this.inputId} id={this.labelId} part="label">
          <span class="label-text">
            {this.hasLabelSlot ? null : this.label?.trim()}
            <slot name="label" onSlotchange={this.onLabelSlotChange} />
          </span>
          {this.required ? (
            <span class="required-mark" aria-hidden="true" part="required-mark">
              <mud-icon name="asterisk" size={16} />
            </span>
          ) : null}
        </label>

        <div class="control" part="control" onClick={this.handleFieldClick}>
          <div class="field">
            <input
              id={this.inputId}
              class="native"
              part="native"
              type="text"
              name={this.name}
              value={this.value}
              placeholder={placeholder}
              disabled={inert}
              readonly={this.readonly}
              required={this.required}
              autocomplete="off"
              inputMode="numeric"
              spellcheck={false}
              maxLength={TIME_MASK.pattern.length}
              aria-label={!this.hasVisibleLabel() ? this.hostAriaLabel : undefined}
              aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
              aria-describedby={this.describedBy()}
              aria-invalid={isInvalid ? 'true' : null}
              aria-required={this.required ? 'true' : null}
              aria-disabled={inert ? 'true' : null}
              aria-placeholder={placeholder}
              onInput={this.handleInput}
              onChange={this.handleChange}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
              onKeyDown={this.handleKeyDown}
            />
            {/* Ghost overlay: keeps the unfilled segments of `HH:MM` visible
                under the caret while typing. Focus-only, as in mud-date-input. */}
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
            aria-label={this.triggerLabel}
            aria-haspopup="dialog"
            aria-expanded={this.pickerOpen ? 'true' : 'false'}
            // Only reference the popover while it is mounted (no dangling id for axe).
            aria-controls={this.pickerOpen ? this.pickerId : undefined}
            disabled={inert || this.readonly}
            onClick={this.togglePicker}
          >
            <mud-icon name="clock" size={this.size === 'lg' ? 24 : 20} />
          </button>

          {this.pickerOpen ? (
            <div
              class="picker-popover"
              part="picker-popover"
              role="dialog"
              aria-label={this.pickerLabel}
              id={this.pickerId}
            >
              <mud-time-picker
                value={TIME_RE.test(this.value) ? this.value : undefined}
                min={this.min}
                max={this.max}
                onMudChange={this.handlePickerChange}
              ></mud-time-picker>
            </div>
          ) : null}
        </div>

        {/* Announces the error as it appears or changes (SC 4.1.3). The visible
            error below is aria-hidden so it is not read twice; the field still
            gets it as its description through aria-describedby. */}
        <span class="live-region" role="status" aria-live="polite" aria-atomic="true">
          {errorText}
        </span>

        {errorText ? (
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
              {this.hasHelperSlot ? null : this.helperText?.trim()}
              <slot name="helper" onSlotchange={this.onHelperSlotChange} />
            </span>
          </div>
        ) : (
          // With no helper yet the slot still has to be in the tree, or content
          // slotted into it never fires slotchange and never shows.
          <span class="helper-slot">
            <slot name="helper" onSlotchange={this.onHelperSlotChange} />
          </span>
        )}
      </Host>
    );
  }
}
