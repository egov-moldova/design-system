import type { EventEmitter } from '@stencil/core';
import { AttachInternals, Component, Element, Event, Host, Prop, State, Watch, forceUpdate, h } from '@stencil/core';

import { NUMERIC_INPUT_SIZES, NUMERIC_INPUT_VARIANTS } from './mud-numeric-input.types';
import type {
  NumericInputChangeDetail,
  NumericInputErrorDetail,
  NumericInputSize,
  NumericInputStepDetail,
  NumericInputStepDirection,
  NumericInputVariant,
} from './mud-numeric-input.types';
import { observeAriaLabel } from '../../utils/aria-label';
import { formatLocale, formatMessage, localeMessages, watchDocumentLang, hostLang } from '../../utils/locale';
import type { LocaleProp } from '../../utils/locale';
import { NUMERIC_INPUT_MESSAGES } from './mud-numeric-input.messages';
import type { NumericInputMessages } from './mud-numeric-input.messages';

let numericInputInstanceCounter = 0;

/** What a typed or pasted string means to the field. */
type ParsedEntry = { kind: 'number'; value: number } | { kind: 'ambiguous' } | { kind: 'invalid' };

const INVALID_ENTRY: ParsedEntry = { kind: 'invalid' };

/** `1`–`3` digits, then only groups of exactly three: the shape a thousands-grouped integer has. */
const isGroupedInteger = (parts: string[]): boolean =>
  parts.length > 0 && /^\d{1,3}$/.test(parts[0]) && parts.slice(1).every(part => /^\d{3}$/.test(part));

/**
 * Numeric Input — numeric-entry control with stacked step buttons.
 *
 * Pattern B (atom-interactive, form-associated): renders its own `<input>`
 * inside shadow DOM and pairs it with a trailing stepper stack (chevron-up
 * over chevron-bottom). Shares the visual primitives of `mud-text-input` (border,
 * focus ring, label, helper / error, sizes, states) and adds a
 * `--numeric-input-stepper-*` token namespace for the increment / decrement
 * affordance.
 *
 * Why `<input type="text" inputmode="decimal">` instead of
 * `<input type="number">`: native `type="number"` mixes parsing, locale, and
 * UI affordances in ways that interact poorly with `precision` rounding and
 * `min`/`max` clamping. The component delegates parsing + clamping to its own
 * logic and exposes `inputmode="decimal"` so mobile devices still surface the
 * numeric keypad.
 *
 * @element mud-numeric-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 * @slot icon-start - Leading icon (a `mud-icon`, icon-leading variant) rendered before the prefix / value. Sized to the square icon box.
 * @slot prefix - Leading unit / currency symbol rendered before the value (e.g. `€`, `$`, `MDL`). Shares the suffix's text styling — auto-width rather than the fixed icon box, so multi-character symbols don't clip. Distinct from `icon-start`, mirroring the Figma master's separate `prefix` and `leadingIcon` properties.
 * @slot suffix - Trailing unit text rendered after the value (e.g. `lei`, `kg`). Sits before the stepper stack.
 */
@Component({
  tag: 'mud-numeric-input',
  styleUrl: 'mud-numeric-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudNumericInput {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * Numeric inputs ship 3 styles per Figma (no Warning) — invalid numeric
   * values are typically out-of-range (Destructive) or confirmed-valid
   * (Success); there is no in-between state worth a Warning tone.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: NumericInputVariant = 'default';

  /**
   * Loading state. When true the control becomes uninteractive and a
   * brand `mud-spinner` replaces the trailing stepper stack. The host
   * carries `aria-busy="true"` for assistive technologies.
   * @default false
   */
  @Prop({ reflect: true }) loading: boolean = false;

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: NumericInputSize = 'md';

  /**
   * Disables interactivity. The internal control receives `aria-disabled` and
   * the native `disabled` attribute. Stepper buttons are also disabled.
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
   * Renders the field read-only. The control remains focusable; steppers are
   * suppressed.
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
   * Show the trailing stacked stepper (chevron-up / chevron-bottom) buttons.
   * Off by default per Figma master, which renders the canonical numeric input
   * without steppers (suffix-only). Opt in via `show-steppers` for compact
   * quantity / rating fields where stepper affordance is valuable.
   * @default false
   */
  @Prop({ reflect: true, attribute: 'show-steppers' }) showSteppers: boolean = false;

  /**
   * Current numeric value. `undefined` represents an empty field. Reflects to
   * the host attribute when set.
   */
  @Prop({ mutable: true, reflect: true }) value?: number;

  /** Inclusive lower bound. Stepper-down disables at this value; manual entries below clamp on blur. */
  @Prop() min?: number;

  /** Inclusive upper bound. Stepper-up disables at this value; manual entries above clamp on blur. */
  @Prop() max?: number;

  /**
   * Increment / decrement amount applied by the stepper buttons and arrow keys.
   * @default 1
   */
  @Prop() step: number = 1;

  /**
   * Decimal precision applied on blur (number of decimal places). When unset
   * the value is preserved as typed (subject to clamping).
   */
  @Prop() precision?: number;

  /** Form-control `name`. Used during form submission. */
  @Prop({ reflect: true }) name?: string;

  /** Placeholder shown when the control is empty. */
  @Prop() placeholder?: string;

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
   * Accessible label for the increment button. Overrides the `locale`'s copy when set to a
   * non-empty string.
   * @default 'Crește' (ro-MD)
   */
  @Prop({ attribute: 'increment-label' }) incrementLabel?: string;

  /**
   * Accessible label for the decrement button. Overrides the `locale`'s copy when set to a
   * non-empty string.
   * @default 'Scade' (ro-MD)
   */
  @Prop({ attribute: 'decrement-label' }) decrementLabel?: string;

  /**
   * Validation message reported when the field is `required` and empty. Overrides the
   * `locale`'s copy when set to a non-empty string.
   * @default 'Acest câmp este obligatoriu.' (ro-MD)
   */
  @Prop({ attribute: 'required-message' }) requiredMessage?: string;

  /**
   * Validation message reported when the value is below `min`. Carries a `{min}` placeholder.
   * Overrides the `locale`'s copy when set to a non-empty string.
   * @default 'Valoarea minimă este {min}.' (ro-MD)
   */
  @Prop({ attribute: 'min-message' }) minMessage?: string;

  /**
   * Validation message reported when the value is above `max`. Carries a `{max}` placeholder.
   * Overrides the `locale`'s copy when set to a non-empty string.
   * @default 'Valoarea maximă este {max}.' (ro-MD)
   */
  @Prop({ attribute: 'max-message' }) maxMessage?: string;

  /**
   * Text of the `mudError` (`reason: 'ambiguous'`) raised for an entry that could be a thousands
   * group or a decimal, such as `1.234` under `ro-MD`. `{decimal}` is replaced by the locale's
   * decimal separator. Overrides the `locale`'s copy when set to a non-empty string.
   * @default 'Valoarea este ambiguă. Scrieți numărul fără separator de mii și folosiți „{decimal}” pentru zecimale.' (ro-MD)
   */
  @Prop({ attribute: 'ambiguous-message' }) ambiguousMessage?: string;

  /**
   * Human-readable value announcement for screen readers (e.g. `"5 lei"`).
   * Maps to the native `aria-valuetext` on the spinbutton. An `aria-valuetext`
   * attribute on the host is read once on load and stripped; later updates go
   * through this prop, and setting it empty does not clear the value.
   */
  // The rule matches names case-insensitively; `ariaValuetext` does not shadow `HTMLElement.ariaValueText` (#88).
  // eslint-disable-next-line @stencil/reserved-member-names
  @Prop() ariaValuetext?: string;

  /**
   * Allow fractional input. When `false` the field is integer-only: typing a
   * decimal separator is blocked and any fractional part is truncated on commit.
   * @default true
   */
  @Prop({ attribute: 'allow-decimal' }) allowDecimal: boolean = true;

  /**
   * Allow negative input. When `false` the field is positive-only: typing `-`
   * is blocked and negative entries are rejected on commit.
   * @default true
   */
  @Prop({ attribute: 'allow-negative' }) allowNegative: boolean = true;

  /**
   * BCP-47 locale used to group the displayed value with thousands separators
   * (e.g. `ro-MD` → `1.250,00`). When unset the value displays ungrouped. Grouping
   * is applied while the field is not being edited; on focus the number is shown
   * with the locale's decimal separator and no grouping (`1250,00`) so the caret
   * stays sane. Typed input is read the same way under every locale: spaces and `'`
   * are ignored, and when both `.` and `,` occur the last one is the decimal. A
   * single separator is a decimal, except the locale's own grouping character
   * followed by exactly three digits (`1.234` under `ro-MD`), which raises `mudError`
   * with `reason: 'ambiguous'` instead of guessing.
   *
   * Also selects the language of the built-in copy (steppers, clear button, validation
   * messages): unset, the copy follows the closest ancestor `lang` (`<html lang>`
   * included), else `ro-MD`. Number grouping is unaffected by that fallback — it stays off
   * unless `locale` itself is set.
   */
  @Prop() locale?: LocaleProp;

  /**
   * When `true`, renders a trailing clear (×) button while the field holds a
   * value. Activating it clears the value and emits `mudChange` with `null`.
   * @default false
   */
  @Prop({ reflect: true }) clearable: boolean = false;

  /**
   * Accessible label for the clear button. Overrides the `locale`'s copy when set to a
   * non-empty string.
   * @default 'Șterge' (ro-MD)
   */
  @Prop({ attribute: 'clear-label' }) clearLabel?: string;

  /**
   * Maximum number of characters accepted by the field (native `maxlength`).
   * When set, a character counter renders in the assistive row unless
   * `show-counter` is `false`.
   */
  @Prop({ attribute: 'maxlength' }) maxLength?: number;

  /**
   * Force the character counter to show or hide. Auto-shows when `maxlength`
   * is set; pass `false` to suppress it.
   * @default true
   */
  @Prop({ attribute: 'show-counter' }) showCounter: boolean = true;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private hasIconStart: boolean = false;
  @State() private hasPrefix: boolean = false;
  @State() private hasSuffix: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private displayValue: string = '';
  /**
   * The raw text of the last commit reported through `mudError`/`mudChange` — both the native
   * `change` handler and `blur` call `commitFromDisplay` for the same user commit, so a repeat
   * with the exact same text is that duplicate call, not a second commit, whatever the commit's
   * result (number, blank, not-a-number, ambiguous). Reset — so the next identical text DOES
   * emit again — by a keystroke (`handleInput`), `formResetCallback`, and a programmatic
   * `value` write (`handleValueChange`); `commitFromDisplay` itself re-affirms it at the end,
   * after any of those resets that its own `value` assignment may have triggered mid-commit.
   */
  private lastCommittedText?: string;
  /**
   * The host's `aria-label` (attribute or native `ariaLabel` property), moved onto the
   * internal control when no visible label is present.
   */
  @State() private resolvedAriaLabel?: string;
  @State() private resolvedAriaValuetext?: string;

  /**
   * Whether the current value falls outside `min` / `max`. Kept as state so the
   * control can carry `aria-invalid` for a value that is actually wrong, the
   * way `internals.validity` already reports it to the form.
   */
  @State() private outOfRange: boolean = false;

  @Element() host!: HTMLMudNumericInputElement;

  @AttachInternals() internals!: ElementInternals;

  /** Fires on every keystroke. `detail.value` is the parsed current value or `null`. */
  @Event() mudInput!: EventEmitter<NumericInputChangeDetail>;

  /** Fires when the value is committed (blur / Enter / stepper). `detail.value` is the clamped, precision-rounded value or `null`. */
  @Event() mudChange!: EventEmitter<NumericInputChangeDetail>;

  /** Fires when a stepper button (or arrow key) bumps the value. */
  @Event() mudStep!: EventEmitter<NumericInputStepDetail>;

  /** Fires when validation rejects the current input (out-of-range, NaN). */
  @Event() mudError!: EventEmitter<NumericInputErrorDetail>;

  /** Fires when the internal control gains focus. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal control loses focus. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  /** Fires when the clear button empties the field. `detail.value` is `null`. */
  @Event() mudClear!: EventEmitter<NumericInputChangeDetail>;

  private readonly instanceId = ++numericInputInstanceCounter;
  private readonly labelId = `mud-numeric-input-label-${this.instanceId}`;
  private readonly helperId = `mud-numeric-input-helper-${this.instanceId}`;
  private readonly errorId = `mud-numeric-input-error-${this.instanceId}`;
  private readonly counterId = `mud-numeric-input-counter-${this.instanceId}`;
  private initialValue: number | undefined;
  private nativeEl?: HTMLInputElement;
  private stopAriaLabel?: () => void;
  private stopLang?: () => void;

  @Watch('ariaValuetext')
  syncAriaValuetextProp(next?: string) {
    if (next && next.length > 0) this.resolvedAriaValuetext = next;
  }

  @Watch('required')
  onRequiredChange() {
    this.syncValidity();
  }

  @Watch('min')
  onMinChange() {
    this.syncValidity();
  }

  @Watch('max')
  onMaxChange() {
    this.syncValidity();
  }

  // The visible number and the validity message are strings built once from the locale, so a
  // new locale rebuilds both.
  @Watch('locale')
  onLocaleChange() {
    if (!this.isFocused) this.displayValue = this.formatForDisplay(this.value);
    this.syncValidity();
  }

  // Validation lives at the @Prop boundary (PRINCIPLES.md §D). Bad enum values
  // warn in dev and fall back to the default instead of throwing.
  @Watch('variant')
  validateVariant(next: NumericInputVariant) {
    if (!NUMERIC_INPUT_VARIANTS.includes(next)) {
      console.warn(
        `[mud-numeric-input] variant="${String(next)}" is not supported. Supported: ${NUMERIC_INPUT_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: NumericInputSize) {
    if (!NUMERIC_INPUT_SIZES.includes(next)) {
      console.warn(
        `[mud-numeric-input] size="${String(next)}" is not supported. Supported: ${NUMERIC_INPUT_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('value')
  handleValueChange(next: number | undefined) {
    // Any `value` write — programmatic or `commitFromDisplay`'s own — resets the dedupe key;
    // `commitFromDisplay` re-affirms it afterward for its own commit (see `lastCommittedText`).
    this.lastCommittedText = undefined;
    this.syncFormValue(next);
    // Keep the visible field in sync when the prop is changed externally and
    // the user isn't actively editing — before `syncValidity`, which reads
    // `displayValue` for its ambiguous-text check: syncing after it would grade
    // validity against the stale text a fresh `value` just replaced.
    if (!this.isFocused) {
      this.displayValue = this.formatForDisplay(next);
    }
    this.syncValidity();
  }

  connectedCallback() {
    this.stopAriaLabel = observeAriaLabel(this.host, label => (this.resolvedAriaLabel = label));
    this.stopLang = watchDocumentLang(this.host, () => {
      this.syncValidity();
      forceUpdate(this);
    });
  }

  disconnectedCallback() {
    this.stopAriaLabel?.();
    this.stopLang?.();
  }

  /** Built-in strings in the resolved locale, with the override props on top. */
  private messages(): NumericInputMessages {
    return localeMessages('mud-numeric-input', this.host, this.locale, NUMERIC_INPUT_MESSAGES, {
      incrementLabel: this.incrementLabel,
      decrementLabel: this.decrementLabel,
      clearLabel: this.clearLabel,
      requiredMessage: this.requiredMessage,
      minMessage: this.minMessage,
      maxMessage: this.maxMessage,
      ambiguousMessage: this.ambiguousMessage,
    });
  }

  componentWillLoad() {
    this.captureAriaValuetext();
    this.initialValue = this.value;
    this.displayValue = this.formatForDisplay(this.value);
    this.syncFormValue(this.value);
    this.syncValidity();
  }

  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.lastCommittedText = undefined;
    this.value = this.initialValue;
    this.displayValue = this.formatForDisplay(this.initialValue);
    this.syncFormValue(this.initialValue);
    this.syncValidity();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      // The state is this component's own `String(value)`: plain dot-decimal, whatever the locale.
      const parsed = state.trim() === '' ? Number.NaN : Number(state);
      this.value = Number.isFinite(parsed) ? parsed : undefined;
      this.displayValue = this.formatForDisplay(this.value);
      this.syncFormValue(this.value);
      this.syncValidity();
    }
  }

  private captureAriaValuetext() {
    const valueTextAttr = this.host.getAttribute('aria-valuetext');
    if (valueTextAttr && valueTextAttr.length > 0) {
      this.resolvedAriaValuetext = valueTextAttr;
      this.host.removeAttribute('aria-valuetext');
    } else if (this.ariaValuetext && this.ariaValuetext.length > 0) {
      this.resolvedAriaValuetext = this.ariaValuetext;
    }
  }

  private syncValidity() {
    if (!this.internals) return;
    const flags: ValidityStateFlags = {};
    let message: string | undefined;
    const isEmpty = this.value === undefined || this.value === null || !Number.isFinite(this.value);
    const messages = this.messages();

    if (isEmpty && this.parseRaw(this.displayValue).kind === 'ambiguous') {
      // The raw text is still on screen and could be read two ways: not the same as empty.
      flags.badInput = true;
      message = this.ambiguousText();
    } else if (this.required && isEmpty) {
      flags.valueMissing = true;
      message = this.errorText && this.errorText.length > 0 ? this.errorText : messages.requiredMessage;
    } else if (!isEmpty) {
      const v = this.value as number;
      if (this.min !== undefined && v < this.min) {
        flags.rangeUnderflow = true;
        message =
          this.errorText && this.errorText.length > 0
            ? this.errorText
            : formatMessage(messages.minMessage, this.host, this.locale, { min: this.formatNumber(this.min, true) });
      } else if (this.max !== undefined && v > this.max) {
        flags.rangeOverflow = true;
        message =
          this.errorText && this.errorText.length > 0
            ? this.errorText
            : formatMessage(messages.maxMessage, this.host, this.locale, { max: this.formatNumber(this.max, true) });
      }
    }

    // `valueMissing` deliberately does NOT raise `aria-invalid`: an untouched
    // required field is empty, not wrong, and announcing it as invalid before
    // the citizen has typed anything is noise. A value outside min/max is a
    // concrete error and does raise it.
    this.outOfRange = Boolean(flags.rangeUnderflow || flags.rangeOverflow);

    const anchor = this.nativeEl ?? undefined;
    if (Object.keys(flags).length > 0) {
      this.internals.setValidity(flags, message, anchor);
    } else {
      this.internals.setValidity({}, undefined, anchor);
    }
  }

  private syncFormValue(value: number | undefined): void {
    const serialized = value === undefined ? '' : String(value);
    this.internals.setFormValue(serialized, serialized);
  }

  /**
   * Resolve the active locale's grouping + decimal separators. Empty `locale`
   * → no grouping and a dot decimal (legacy behaviour; comma is still accepted).
   */
  private localeSeparators(): { group: string; decimal: string } {
    if (!this.locale) return { group: '', decimal: '.' };
    try {
      const parts = new Intl.NumberFormat(formatLocale(this.host, this.locale)).formatToParts(12345.6);
      return {
        group: parts.find(p => p.type === 'group')?.value ?? '',
        decimal: parts.find(p => p.type === 'decimal')?.value ?? '.',
      };
    } catch {
      return { group: '', decimal: '.' };
    }
  }

  /**
   * Read a typed or pasted entry, the same way under every locale. Every Unicode space and `'`
   * is dropped and the Unicode minus (U+2212, which `ru-*` writes) counts as `-`. Then:
   * - `.` and `,` both present: the last one is the decimal, the other groups thousands;
   * - one of them repeated: it groups thousands (`1.234.567`);
   * - one of them once: it is the decimal (`1.5`, `1,5`, `1234.5`) — except the locale's own
   *   grouping character followed by exactly three digits (`1.234` under `ro-MD`), which could
   *   be either, so the entry is `ambiguous` rather than guessed.
   * Stays lenient about sign and fractions — `allow-negative` / `allow-decimal` are enforced in
   * `commit`.
   */
  private parseRaw(raw: string): ParsedEntry {
    const compact = (raw ?? '').replace(/[\s']/g, '').replace(/\u2212/g, '-');
    const negative = compact.startsWith('-');
    const body = negative ? compact.slice(1) : compact;
    if (!/^[\d.,]+$/.test(body) || !/\d/.test(body)) return INVALID_ENTRY;

    const dots = body.split('.').length - 1;
    const commas = body.split(',').length - 1;
    let canonical: string;
    if (dots > 0 && commas > 0) {
      const decimal = body.lastIndexOf('.') > body.lastIndexOf(',') ? '.' : ',';
      const grouping = decimal === '.' ? ',' : '.';
      const halves = body.split(decimal);
      if (halves.length !== 2) return INVALID_ENTRY;
      const integerParts = halves[0].split(grouping);
      if (!isGroupedInteger(integerParts)) return INVALID_ENTRY;
      canonical = `${integerParts.join('')}.${halves[1]}`;
    } else if (dots + commas > 1) {
      const parts = body.split(dots > 0 ? '.' : ',');
      if (!isGroupedInteger(parts)) return INVALID_ENTRY;
      canonical = parts.join('');
    } else if (dots + commas === 1) {
      const separator = dots > 0 ? '.' : ',';
      const [integer, fraction] = body.split(separator);
      // A thousands group cannot start at 0, so `0.125` is a decimal whatever the locale.
      if (/^[1-9]\d{0,2}$/.test(integer) && fraction.length === 3 && separator === this.localeSeparators().group) {
        return { kind: 'ambiguous' };
      }
      canonical = `${integer || '0'}.${fraction}`;
    } else {
      canonical = body;
    }
    const num = Number(negative ? `-${canonical}` : canonical);
    return Number.isFinite(num) ? { kind: 'number', value: num } : INVALID_ENTRY;
  }

  /** Clamp a number to `[min, max]`. */
  private clamp(value: number): number {
    let v = value;
    if (this.min !== undefined && v < this.min) v = this.min;
    if (this.max !== undefined && v > this.max) v = this.max;
    return v;
  }

  /** Round to the configured `precision` decimal places (no-op when unset). */
  private round(value: number): number {
    if (this.precision === undefined) return value;
    const factor = Math.pow(10, Math.max(0, Math.floor(this.precision)));
    return Math.round(value * factor) / factor;
  }

  /** Apply sign / integer policy, then clamp + round, in one step. */
  private commit(value: number): number {
    let v = value;
    if (!this.allowDecimal && !Number.isInteger(v)) v = Math.trunc(v);
    if (!this.allowNegative && v < 0) v = Math.max(0, this.min ?? 0);
    return this.round(this.clamp(v));
  }

  /** Render a number for display. Grouped per `locale` while not being edited. */
  private formatForDisplay(value: number | undefined): string {
    if (value === undefined || value === null || !Number.isFinite(value)) return '';
    return this.formatNumber(value, this.isFocused);
  }

  /**
   * The field's own number rule, also used for the `{min}` / `{max}` of its messages so they
   * read like the field. With a `locale`: its decimal separator, grouped unless `focused`
   * (typing needs a plain number, and the parser never sees a group separator this component
   * wrote). Without one: `String(value)`, or `toFixed(precision)`.
   */
  private formatNumber(value: number, focused: boolean): string {
    const digits = this.precision !== undefined ? Math.max(0, Math.floor(this.precision)) : undefined;
    if (this.locale) {
      try {
        return new Intl.NumberFormat(formatLocale(this.host, this.locale), {
          useGrouping: !focused,
          minimumFractionDigits: digits,
          maximumFractionDigits: digits ?? 20,
        }).format(value);
      } catch {
        /* fall through to the plain rendering */
      }
    }
    return digits !== undefined ? value.toFixed(digits) : String(value);
  }

  private canStep(direction: NumericInputStepDirection): boolean {
    if (this.isInert() || this.readonly || this.loading) return false;
    const current = this.value ?? 0;
    const next = direction === 'up' ? current + this.step : current - this.step;
    if (direction === 'up' && this.max !== undefined && current >= this.max) return false;
    if (direction === 'down' && this.min !== undefined && current <= this.min) return false;
    // Disallow the case where stepping would only move the value further past
    // the bound it already exceeds.
    if (direction === 'up' && this.max !== undefined && next > this.max && current >= this.max) return false;
    if (direction === 'down' && this.min !== undefined && next < this.min && current <= this.min) return false;
    return true;
  }

  private performStep(direction: NumericInputStepDirection): void {
    if (!this.canStep(direction)) return;
    const base = this.value ?? this.startValueForStep();
    const raw = direction === 'up' ? base + this.step : base - this.step;
    const next = this.commit(raw);
    if (next === this.value) return;
    this.value = next;
    this.displayValue = this.formatForDisplay(next);
    this.mudStep.emit({ direction, value: next });
    this.mudInput.emit({ value: next });
    this.mudChange.emit({ value: next });
  }

  /**
   * Choose the seed value when the field is empty and the user presses a
   * stepper or arrow key: snap into `[min, max]` when defined, else 0.
   */
  private startValueForStep(): number {
    if (this.min !== undefined && this.max !== undefined) return this.clamp(0);
    if (this.min !== undefined) return this.min;
    if (this.max !== undefined) return Math.min(0, this.max);
    return 0;
  }

  private onLabelSlotChange = (ev: Event) => {
    this.hasLabelSlot = this.slotHasContent(ev);
  };
  private onHelperSlotChange = (ev: Event) => {
    this.hasHelperSlot = this.slotHasContent(ev);
  };
  private onIconStartSlotChange = (ev: Event) => {
    this.hasIconStart = this.slotHasContent(ev);
  };
  private onPrefixSlotChange = (ev: Event) => {
    this.hasPrefix = this.slotHasContent(ev);
  };
  private onSuffixSlotChange = (ev: Event) => {
    this.hasSuffix = this.slotHasContent(ev);
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
    // A keystroke always resets the dedupe key, even when it leaves `this.value` unchanged
    // (e.g. still-invalid text), so the next commit of unchanged text still emits.
    this.lastCommittedText = undefined;
    this.displayValue = raw;
    const entry = this.parseRaw(raw);
    if (entry.kind === 'ambiguous') {
      this.value = undefined;
      this.mudInput.emit({ value: null });
      this.emitAmbiguous(raw);
      this.syncValidity();
      return;
    }
    if (entry.kind === 'invalid') {
      // Empty / partial entry (e.g. "-" or ".") — emit current parsed state
      // (null) but don't clear the @Prop so the user's keystroke survives.
      this.value = raw.trim() === '' ? undefined : this.value;
      this.mudInput.emit({ value: null });
      this.syncValidity();
      return;
    }
    const parsed = entry.value;
    // Surface out-of-range as a soft error event but DO NOT clamp during
    // typing — clamping mid-entry would yank the caret and confuse the user.
    if (this.min !== undefined && parsed < this.min) {
      this.mudError.emit({ reason: 'out-of-range', rawValue: raw });
    } else if (this.max !== undefined && parsed > this.max) {
      this.mudError.emit({ reason: 'out-of-range', rawValue: raw });
    }
    this.value = parsed;
    this.mudInput.emit({ value: parsed });
  };

  /** Ambiguous entries yield no value; the raw text stays so the user can fix it. */
  private emitAmbiguous(raw: string): void {
    this.mudError.emit({ reason: 'ambiguous', rawValue: raw, message: this.ambiguousText() });
  }

  private ambiguousText(): string {
    return formatMessage(this.messages().ambiguousMessage, this.host, this.locale, {
      decimal: this.localeSeparators().decimal,
    });
  }

  private handleChange = () => {
    // Native `change` fires after the user commits (blur / Enter on most
    // engines). Clamp + round here, then publish.
    this.commitFromDisplay();
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    // Drop locale grouping while editing so the caret behaves — formatForDisplay
    // returns the plain number now that isFocused is true.
    if (this.locale && this.value !== undefined) this.displayValue = this.formatForDisplay(this.value);
    this.mudFocus.emit(ev);
  };

  private handleClearClick = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!this.canClear()) return;
    this.value = undefined;
    this.displayValue = '';
    this.mudInput.emit({ value: null });
    this.mudChange.emit({ value: null });
    this.mudClear.emit({ value: null });
    requestAnimationFrame(() => this.nativeEl?.focus());
  };

  private canClear(): boolean {
    return this.clearable && !this.isInert() && !this.readonly && !this.loading && this.value !== undefined;
  }

  private hasCharacterCounter(): boolean {
    return this.showCounter && typeof this.maxLength === 'number' && this.maxLength > 0;
  }

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.commitFromDisplay();
    this.mudBlur.emit(ev);
  };

  private commitFromDisplay(): void {
    // `change` and `blur` both call this for the same user commit; a repeat with the exact
    // same text is that duplicate call, not a second commit — whatever its result. A `value`
    // assignment below re-runs `handleValueChange`, which resets this key; it is re-affirmed
    // to `text` at every return point, after any such reset, so it reflects THIS commit once
    // the function is done.
    const text = this.displayValue;
    if (this.lastCommittedText === text) return;
    const entry = this.parseRaw(text);
    if (entry.kind === 'ambiguous') {
      this.value = undefined;
      this.emitAmbiguous(text);
      this.syncValidity();
      this.mudChange.emit({ value: null });
      this.lastCommittedText = text;
      return;
    }
    if (entry.kind === 'invalid') {
      // The field is empty or contains an unparseable string.
      if (text.trim() === '') {
        this.value = undefined;
        this.displayValue = '';
        this.mudChange.emit({ value: null });
      } else {
        // Non-numeric residue (rare with our input mask) — surface an error
        // and reset the display to the last committed value.
        this.mudError.emit({ reason: 'not-a-number', rawValue: text });
        this.displayValue = this.formatForDisplay(this.value);
      }
      this.lastCommittedText = text;
      return;
    }
    const committed = this.commit(entry.value);
    this.value = committed;
    this.displayValue = this.formatForDisplay(committed);
    this.mudChange.emit({ value: committed });
    this.lastCommittedText = text;
  }

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (this.isInert() || this.readonly || this.loading) return;
    // Integer-only / positive-only: block the forbidden separator / sign at the
    // source so the field can never hold an invalid character.
    if (!this.allowDecimal && (ev.key === '.' || ev.key === ',')) {
      ev.preventDefault();
      return;
    }
    if (!this.allowNegative && ev.key === '-') {
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Escape' && this.canClear()) {
      ev.preventDefault();
      this.handleClearClick(ev as unknown as MouseEvent);
      return;
    }
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.performStep('up');
      return;
    }
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.performStep('down');
      return;
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this.commitFromDisplay();
    }
  };

  private handleStepClick = (direction: NumericInputStepDirection) => (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.performStep(direction);
    // Re-focus the input so subsequent typing / arrow keys keep working.
    requestAnimationFrame(() => this.nativeEl?.focus());
  };

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private resolvedVariant(): NumericInputVariant {
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
    if (this.hasCharacterCounter()) ids.push(this.counterId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  private showSteppersStack(): boolean {
    return this.showSteppers && !this.isInert() && !this.readonly && !this.loading;
  }

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const m = this.messages();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.errorText?.trim();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined;
    const lang = hostLang(this.host, this.locale);
    const iconSize = this.size === 'lg' ? 24 : 20;
    const stepperIconSize = this.size === 'lg' ? 20 : 16;
    const canStepUp = this.canStep('up');
    const canStepDown = this.canStep('down');
    const showSteppers = this.showSteppersStack();
    const showClear = this.canClear();
    const showCounter = this.hasCharacterCounter();

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-loading': this.loading,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled && !this.readonly,
      'has-label': this.hasVisibleLabel(),
      'has-icon-start': this.hasIconStart,
      'has-prefix': this.hasPrefix,
      'has-suffix': this.hasSuffix,
      'has-steppers': showSteppers,
      'has-clear': showClear,
      'has-counter': showCounter,
      [`variant-${variant}`]: true,
    };

    const ariaValueNow = this.value !== undefined && Number.isFinite(this.value) ? String(this.value) : undefined;

    return (
      <Host class={hostClasses} aria-busy={this.loading ? 'true' : null} lang={lang}>
        <label class="label" htmlFor={`numeric-input-${this.instanceId}`} id={this.labelId} part="label">
          <span class="label-text">
            {this.hasLabelSlot ? null : labelText}
            <slot name="label" onSlotchange={this.onLabelSlotChange} />
          </span>
          {this.required ? (
            <span class="required-mark" aria-hidden="true" part="required-mark">
              *
            </span>
          ) : null}
        </label>

        <div class="control" part="control">
          <span class="control-icon control-icon-start" aria-hidden={this.hasIconStart ? null : 'true'}>
            <slot name="icon-start" onSlotchange={this.onIconStartSlotChange} />
          </span>

          <span class="prefix" part="prefix" aria-hidden={this.hasPrefix ? null : 'true'}>
            <slot name="prefix" onSlotchange={this.onPrefixSlotChange} />
          </span>

          <input
            id={`numeric-input-${this.instanceId}`}
            ref={el => (this.nativeEl = el)}
            class="native"
            part="native"
            type="text"
            role="spinbutton"
            name={this.name}
            value={this.displayValue}
            placeholder={this.placeholder}
            maxLength={this.maxLength}
            disabled={effectivelyDisabled}
            readonly={this.readonly}
            required={this.required}
            autocomplete="off"
            inputMode="decimal"
            spellcheck={false}
            aria-label={ariaLabelAttr}
            aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
            aria-describedby={this.describedBy()}
            aria-invalid={this.invalid || this.outOfRange ? 'true' : null}
            aria-valuenow={ariaValueNow}
            aria-valuemin={this.min !== undefined ? String(this.min) : undefined}
            aria-valuemax={this.max !== undefined ? String(this.max) : undefined}
            aria-valuetext={this.resolvedAriaValuetext}
            onInput={this.handleInput}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            onKeyDown={this.handleKeyDown}
          />

          {/* Spinner sits before the suffix so the unit (e.g. `lei`) stays pinned
              to the right edge across every state — matching the Figma master. */}
          {this.loading ? (
            <span class="control-spinner" part="spinner" aria-hidden="true">
              <mud-spinner size={this.size === 'lg' ? 'sm' : 'xs'} variant="brand" label="" />
            </span>
          ) : null}

          <span class="suffix" part="suffix" aria-hidden={this.hasSuffix ? null : 'true'}>
            <slot name="suffix" onSlotchange={this.onSuffixSlotChange} />
          </span>

          {showClear ? (
            <button
              type="button"
              class="clear-button"
              part="clear-button"
              tabindex={-1}
              aria-label={m.clearLabel}
              onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
              onClick={this.handleClearClick}
            >
              {/* Figma 210:2287 keeps the glyph at 16px on both field sizes. */}
              <mud-icon name="cross-small" size={16} />
            </button>
          ) : null}

          {showSteppers ? (
            <div class="stepper" part="stepper" aria-hidden="true">
              <button
                type="button"
                class="stepper-button stepper-button-up"
                part="stepper-up"
                tabindex={-1}
                aria-label={m.incrementLabel}
                disabled={!canStepUp}
                onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
                onClick={this.handleStepClick('up')}
              >
                <mud-icon name="chevron-top" size={stepperIconSize} />
              </button>
              <button
                type="button"
                class="stepper-button stepper-button-down"
                part="stepper-down"
                tabindex={-1}
                aria-label={m.decrementLabel}
                disabled={!canStepDown}
                onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
                onClick={this.handleStepClick('down')}
              >
                <mud-icon name="chevron-bottom" size={stepperIconSize} />
              </button>
            </div>
          ) : null}
        </div>

        {this.hasErrorMessage() || this.hasHelperMessage() || showCounter ? (
          <div class="assistive-row">
            {this.hasErrorMessage() ? (
              <div class="assistive assistive-error" id={this.errorId} part="error">
                <mud-icon
                  class="assistive-icon"
                  name="circle-error"
                  variant="filled"
                  size={iconSize}
                  color="icon-danger-default"
                />
                <span class="assistive-text">{errorText}</span>
              </div>
            ) : this.hasHelperMessage() ? (
              <div class="assistive assistive-helper" id={this.helperId} part="helper">
                {variant === 'success' ? (
                  <mud-icon
                    class="assistive-icon"
                    name="circle-checkmark"
                    variant="filled"
                    size={iconSize}
                    color="icon-positive-default"
                  />
                ) : null}
                <span class="assistive-text">
                  {this.hasHelperSlot ? null : helperText}
                  <slot name="helper" onSlotchange={this.onHelperSlotChange} />
                </span>
              </div>
            ) : (
              <span class="assistive-spacer" aria-hidden="true" />
            )}

            {showCounter ? (
              <span class="counter" id={this.counterId} part="counter" aria-live="polite">
                {this.displayValue.length}
                {this.maxLength !== undefined ? `/${this.maxLength}` : ''}
              </span>
            ) : null}
          </div>
        ) : null}
      </Host>
    );
  }
}
