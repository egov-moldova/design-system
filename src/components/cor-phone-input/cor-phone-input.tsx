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

import { PHONE_FLAGS } from './cor-phone-input.flags';
import { PHONE_INPUT_SIZES, PHONE_INPUT_TYPES, PHONE_INPUT_VARIANTS } from './cor-phone-input.types';
import type {
  PhoneCountry,
  PhoneInputChangeDetail,
  PhoneInputCountryChangeDetail,
  PhoneInputInputDetail,
  PhoneInputSize,
  PhoneInputType,
  PhoneInputVariant,
} from './cor-phone-input.types';

let phoneInputInstanceCounter = 0;

/**
 * Curated list of countries relevant to the Moldovan e-Gov audience: the
 * home market plus the diaspora destinations seen in the registry data.
 * Order matches the Figma docs page (Moldova first, then alphabetical by
 * Romanian display name) so the default listbox layout stays predictable.
 *
 * The map is hand-rolled — `libphonenumber-js` would pull in ~140KB to
 * cover countries we don't serve. The `mask` uses `X` for required digits
 * and literal spaces as visual separators; the formatter respects each
 * country's local-segment length window (`minLen` / `maxLen`). Each row
 * carries an inline SVG `flag` glyph from `cor-phone-input.flags.ts`.
 */
const COUNTRIES: Record<string, PhoneCountry> = {
  MD: {
    iso: 'MD',
    code: '+373',
    name: 'Moldova',
    nameRo: 'Moldova',
    mask: 'XXX XX XXX',
    minLen: 8,
    maxLen: 8,
    flag: PHONE_FLAGS.MD,
  },
  RO: {
    iso: 'RO',
    code: '+40',
    name: 'Romania',
    nameRo: 'România',
    mask: 'XXX XXX XXX',
    minLen: 9,
    maxLen: 9,
    flag: PHONE_FLAGS.RO,
  },
  RU: {
    iso: 'RU',
    code: '+7',
    name: 'Russia',
    nameRo: 'Rusia',
    mask: 'XXX XXX XX XX',
    minLen: 10,
    maxLen: 10,
    flag: PHONE_FLAGS.RU,
  },
  UA: {
    iso: 'UA',
    code: '+380',
    name: 'Ukraine',
    nameRo: 'Ucraina',
    mask: 'XX XXX XX XX',
    minLen: 9,
    maxLen: 9,
    flag: PHONE_FLAGS.UA,
  },
  US: {
    iso: 'US',
    code: '+1',
    name: 'United States',
    nameRo: 'Statele Unite',
    mask: 'XXX XXX XXXX',
    minLen: 10,
    maxLen: 10,
    flag: PHONE_FLAGS.US,
  },
  GB: {
    iso: 'GB',
    code: '+44',
    name: 'United Kingdom',
    nameRo: 'Regatul Unit',
    mask: 'XXXX XXX XXX',
    minLen: 10,
    maxLen: 10,
    flag: PHONE_FLAGS.GB,
  },
  DE: {
    iso: 'DE',
    code: '+49',
    name: 'Germany',
    nameRo: 'Germania',
    mask: 'XXX XXXX XXXX',
    minLen: 10,
    maxLen: 11,
    flag: PHONE_FLAGS.DE,
  },
  FR: {
    iso: 'FR',
    code: '+33',
    name: 'France',
    nameRo: 'Franța',
    mask: 'X XX XX XX XX',
    minLen: 9,
    maxLen: 9,
    flag: PHONE_FLAGS.FR,
  },
  IT: {
    iso: 'IT',
    code: '+39',
    name: 'Italy',
    nameRo: 'Italia',
    mask: 'XXX XXX XXXX',
    minLen: 9,
    maxLen: 10,
    flag: PHONE_FLAGS.IT,
  },
  ES: {
    iso: 'ES',
    code: '+34',
    name: 'Spain',
    nameRo: 'Spania',
    mask: 'XXX XXX XXX',
    minLen: 9,
    maxLen: 9,
    flag: PHONE_FLAGS.ES,
  },
  PT: {
    iso: 'PT',
    code: '+351',
    name: 'Portugal',
    nameRo: 'Portugalia',
    mask: 'XXX XXX XXX',
    minLen: 9,
    maxLen: 9,
    flag: PHONE_FLAGS.PT,
  },
  IL: {
    iso: 'IL',
    code: '+972',
    name: 'Israel',
    nameRo: 'Israel',
    mask: 'XX XXX XXXX',
    minLen: 9,
    maxLen: 9,
    flag: PHONE_FLAGS.IL,
  },
  TR: {
    iso: 'TR',
    code: '+90',
    name: 'Turkey',
    nameRo: 'Turcia',
    mask: 'XXX XXX XX XX',
    minLen: 10,
    maxLen: 10,
    flag: PHONE_FLAGS.TR,
  },
  BG: {
    iso: 'BG',
    code: '+359',
    name: 'Bulgaria',
    nameRo: 'Bulgaria',
    mask: 'XX XXX XXXX',
    minLen: 8,
    maxLen: 9,
    flag: PHONE_FLAGS.BG,
  },
  GR: {
    iso: 'GR',
    code: '+30',
    name: 'Greece',
    nameRo: 'Grecia',
    mask: 'XXX XXX XXXX',
    minLen: 10,
    maxLen: 10,
    flag: PHONE_FLAGS.GR,
  },
};

const DEFAULT_COUNTRY_ORDER = Object.keys(COUNTRIES);

/**
 * Phone Input — phone-number entry molecule with country-code prefix and
 * format mask. The most Moldova-specific input in the family: it ships a
 * default `+373` country, a curated diaspora-relevant country list with
 * inline-SVG flag glyphs, and Romanian-voice placeholder + error copy.
 *
 * Pattern B (molecule, form-associated): renders its own `<input type="tel">`
 * inside shadow DOM alongside an inline country trigger that either
 * displays a static flag+dial-code pill (`type="local"`, Moldova-first
 * default) or a combobox that opens a country listbox (`type="international"`).
 * Form participation works via `formAssociated` + `ElementInternals`; the
 * form value is the canonical E.164 string (`+37362123456`).
 *
 * @element cor-phone-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 */
@Component({
  tag: 'cor-phone-input',
  styleUrl: 'cor-phone-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class CorPhoneInput {
  /**
   * Color treatment. `destructive` is forced when `invalid` is set.
   * @default 'default'
   */
  @Prop({ reflect: true }) variant: PhoneInputVariant = 'default';

  /**
   * Visual size rung.
   * @default 'md'
   */
  @Prop({ reflect: true }) size: PhoneInputSize = 'md';

  /**
   * Phone entry mode.
   * - `local` (default — Moldova-first): country trigger renders as a
   *   static flag+dial-code pill (no chevron, no listbox). Assumes the
   *   `defaultCountry` implicitly and only accepts its national format.
   * - `international`: country trigger renders as a combobox (flag + dial
   *   code + chevron); clicking opens a listbox of all eligible
   *   countries. Use when the caller can't guarantee the citizen is
   *   filing from inside the home market.
   * @default 'local'
   */
  @Prop({ reflect: true }) type: PhoneInputType = 'local';

  /**
   * Loading state. When true the control becomes uninteractive and an
   * inline `cor-spinner` renders inside the input row. The host carries
   * `aria-busy="true"` for assistive technologies.
   * @default false
   */
  @Prop({ reflect: true }) loading: boolean = false;

  /**
   * Disables interactivity. Trigger and input receive `aria-disabled` and
   * the native `disabled` attribute.
   * @default false
   */
  @Prop({ reflect: true }) disabled: boolean = false;

  /**
   * Marks the field as mandatory. Adds a red asterisk to the label and
   * sets `aria-required` on the internal control.
   * @default false
   */
  @Prop({ reflect: true }) required: boolean = false;

  /**
   * Renders the field read-only. The input remains focusable and copyable;
   * the country trigger renders inert. Background steps into the soft-gray
   * surface to telegraph "visible but not editable", matching the rest of
   * the input family.
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
   * Reflects the open state of the country listbox. Mutate via
   * `corOpen` / `corClose` events, not by writing to the attribute.
   * Only meaningful when `type="international"` — Local mode never opens
   * a listbox.
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) open: boolean = false;

  /**
   * Current value — canonical E.164 (`+37362123456`). Reflects to the host
   * attribute. Empty string represents an unfilled field.
   * @default ''
   */
  @Prop({ mutable: true, reflect: true }) value: string = '';

  /**
   * Initial country selection (ISO 3166-1 alpha-2). Defaults to Moldova
   * because the system serves citizens calling government services.
   * @default 'MD'
   */
  @Prop({ reflect: true, attribute: 'default-country' }) defaultCountry: string = 'MD';

  /**
   * Optional whitelist of ISO codes to surface in the dropdown. Defaults
   * to the curated 15-country Moldova-diaspora list when omitted.
   */
  @Prop() countries?: string[];

  /** Form-control `name`. Used during form submission with the E.164 value. */
  @Prop() name?: string;

  /** Plain-text label. Use the `label` slot for richer content. */
  @Prop() label?: string;

  /** Plain-text helper / hint shown below the control. */
  @Prop({ attribute: 'helper-text' }) helperText?: string;

  /**
   * Plain-text error message shown below the control when `invalid` is
   * set. When present it replaces `helperText` and pairs with the error
   * icon. Defaults to the Romanian message
   * `"Numărul de telefon este incomplet"` when `invalid` is set without a
   * custom message.
   */
  @Prop({ attribute: 'error-text' }) errorText?: string;

  /** Placeholder shown when the local segment is empty. Defaults to the country's mask. */
  @Prop() placeholder?: string;

  /**
   * Accessible name. Mirrors to the internal control's `aria-label` when
   * no visible label is present.
   */
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private highlightedIndex: number = -1;
  @State() private countryIso: string = 'MD';
  @State() private liveAnnouncement: string = '';

  @Element() host!: HTMLCorPhoneInputElement;

  @AttachInternals() internals!: ElementInternals;

  /**
   * Fires on every keystroke. `detail.value` is the current canonical
   * E.164 string; `detail.countryCode` is the active ISO 3166-1 alpha-2.
   */
  @Event() corInput!: EventEmitter<PhoneInputInputDetail>;

  /**
   * Fires when the value is committed (typically on `blur` or `Enter`).
   * `detail.isValid` reflects whether the local-segment length sits in
   * the active country's window.
   */
  @Event() corChange!: EventEmitter<PhoneInputChangeDetail>;

  /** Fires when the user picks a different country from the dropdown. */
  @Event() corCountryChange!: EventEmitter<PhoneInputCountryChangeDetail>;

  /** Fires when the country listbox opens. */
  @Event() corOpen!: EventEmitter<void>;

  /** Fires when the country listbox closes. */
  @Event() corClose!: EventEmitter<void>;

  /** Fires when the internal input gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() corFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal input loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() corBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++phoneInputInstanceCounter;
  private readonly labelId = `cor-phone-input-label-${this.instanceId}`;
  private readonly helperId = `cor-phone-input-helper-${this.instanceId}`;
  private readonly errorId = `cor-phone-input-error-${this.instanceId}`;
  private readonly triggerId = `cor-phone-input-trigger-${this.instanceId}`;
  private readonly listboxId = `cor-phone-input-listbox-${this.instanceId}`;
  private readonly inputId = `cor-phone-input-${this.instanceId}`;
  private readonly liveId = `cor-phone-input-live-${this.instanceId}`;
  private initialValue: string = '';
  private initialCountry: string = 'MD';
  private triggerEl?: HTMLButtonElement;
  private listboxEl?: HTMLElement;
  private nativeEl?: HTMLInputElement;

  componentWillLoad() {
    this.countryIso = this.resolveInitialCountry();
    this.initialCountry = this.countryIso;
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
    if (this.open && this.type === 'international') this.primeHighlight();
  }

  @Watch('variant')
  validateVariant(next: PhoneInputVariant) {
    if (!PHONE_INPUT_VARIANTS.includes(next)) {
      console.warn(
        `[cor-phone-input] variant="${String(next)}" is not supported. Supported: ${PHONE_INPUT_VARIANTS.join(
          ', ',
        )}. Falling back to "default".`,
      );
      this.variant = 'default';
    }
  }

  @Watch('size')
  validateSize(next: PhoneInputSize) {
    if (!PHONE_INPUT_SIZES.includes(next)) {
      console.warn(
        `[cor-phone-input] size="${String(next)}" is not supported. Supported: ${PHONE_INPUT_SIZES.join(
          ', ',
        )}. Falling back to "md".`,
      );
      this.size = 'md';
    }
  }

  @Watch('type')
  validateType(next: PhoneInputType) {
    if (!PHONE_INPUT_TYPES.includes(next)) {
      console.warn(
        `[cor-phone-input] type="${String(next)}" is not supported. Supported: ${PHONE_INPUT_TYPES.join(
          ', ',
        )}. Falling back to "local".`,
      );
      this.type = 'local';
      return;
    }
    // Local mode can't keep the listbox open — close it silently if the
    // caller switches modes mid-flight.
    if (next === 'local' && this.open) {
      this.open = false;
    }
  }

  @Watch('defaultCountry')
  validateDefaultCountry(next: string) {
    if (!COUNTRIES[next]) {
      console.warn(
        `[cor-phone-input] defaultCountry="${String(next)}" is not in the country map. Falling back to "MD".`,
      );
      this.defaultCountry = 'MD';
      return;
    }
    if (this.countryIso !== next) {
      this.countryIso = next;
      this.value = this.toE164(this.localDigits(this.value), this.countryIso);
    }
  }

  @Watch('value')
  handleValueChange(next: string) {
    const value = next ?? '';
    this.internals.setFormValue(value, value);
  }

  @Watch('open')
  handleOpenChange(next: boolean) {
    if (next) {
      this.primeHighlight();
      this.corOpen.emit();
    } else {
      this.highlightedIndex = -1;
      this.corClose.emit();
    }
  }

  /** Mirrors `disabled` from an ancestor `<fieldset disabled>`. */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.countryIso = this.initialCountry;
    this.internals.setFormValue(this.initialValue, this.initialValue);
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      this.value = state;
      const detected = this.detectCountryFromValue(state);
      if (detected) this.countryIso = detected;
      this.internals.setFormValue(state, state);
    }
  }

  @Listen('click', { target: 'document' })
  handleDocumentClick(ev: MouseEvent) {
    if (!this.open) return;
    if (ev.target === this.host) return;
    const path = typeof ev.composedPath === 'function' ? ev.composedPath() : [];
    if (path.includes(this.host)) return;
    const target = ev.target as Node | null;
    if (target && this.host.contains(target)) return;
    this.closeListbox();
  }

  private resolveInitialCountry(): string {
    const detected = this.detectCountryFromValue(this.value);
    if (detected) return detected;
    if (this.defaultCountry && COUNTRIES[this.defaultCountry]) return this.defaultCountry;
    return 'MD';
  }

  private activeCountries(): PhoneCountry[] {
    const ordered = this.countries && this.countries.length > 0 ? this.countries : DEFAULT_COUNTRY_ORDER;
    return ordered.map(iso => COUNTRIES[iso]).filter((c): c is PhoneCountry => Boolean(c));
  }

  private currentCountry(): PhoneCountry {
    return COUNTRIES[this.countryIso] ?? COUNTRIES.MD;
  }

  private primeHighlight() {
    const opts = this.activeCountries();
    const idx = opts.findIndex(c => c.iso === this.countryIso);
    this.highlightedIndex = idx >= 0 ? idx : 0;
  }

  private localDigits(e164: string): string {
    const country = this.currentCountry();
    const digitsOnly = (e164 ?? '').replace(/\D/g, '');
    const codeDigits = country.code.replace(/\D/g, '');
    if (digitsOnly.startsWith(codeDigits)) return digitsOnly.slice(codeDigits.length);
    return digitsOnly;
  }

  private toE164(digits: string, iso: string): string {
    const country = COUNTRIES[iso] ?? COUNTRIES.MD;
    const trimmed = digits.replace(/\D/g, '').slice(0, country.maxLen);
    if (trimmed.length === 0) return '';
    return `${country.code}${trimmed}`;
  }

  private formatMasked(raw: string): string {
    const country = this.currentCountry();
    const digits = (raw ?? '').replace(/\D/g, '').slice(0, country.maxLen);
    let out = '';
    let cursor = 0;
    for (let i = 0; i < country.mask.length && cursor < digits.length; i++) {
      const ch = country.mask[i];
      if (ch === 'X') {
        out += digits[cursor];
        cursor++;
      } else {
        out += ch;
      }
    }
    return out;
  }

  private detectCountryFromValue(value: string): string | null {
    if (!value || !value.startsWith('+')) return null;
    const digitsOnly = value.replace(/\D/g, '');
    const sorted = [...this.activeCountries()].sort((a, b) => b.code.length - a.code.length);
    for (const country of sorted) {
      const codeDigits = country.code.replace(/\D/g, '');
      if (digitsOnly.startsWith(codeDigits)) return country.iso;
    }
    return null;
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
    const masked = this.formatMasked(target.value);
    if (masked !== target.value) {
      target.value = masked;
      try {
        target.setSelectionRange(masked.length, masked.length);
      } catch {
        // Selection mutation is best-effort.
      }
    }
    const digits = masked.replace(/\D/g, '');
    this.value = this.toE164(digits, this.countryIso);
    this.corInput.emit({ value: this.value, countryCode: this.countryIso });
  };

  private handleChange = () => {
    this.corChange.emit({
      value: this.value,
      countryCode: this.countryIso,
      isValid: this.isLengthValid(),
    });
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.corFocus.emit(ev);
  };

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.corBlur.emit(ev);
  };

  private handlePaste = (ev: ClipboardEvent) => {
    const text = ev.clipboardData?.getData('text') ?? '';
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed.startsWith('+')) return;
    ev.preventDefault();
    const detected = this.detectCountryFromValue(trimmed);
    // Only auto-switch country in International mode — Local mode is
    // locked to its `defaultCountry` and silently rejects cross-border
    // paste attempts (still strips the prefix).
    if (detected && detected !== this.countryIso && this.type === 'international') {
      this.changeCountry(detected, { silentLive: true });
    }
    const country = this.currentCountry();
    const codeDigits = country.code.replace(/\D/g, '');
    const digits = trimmed.replace(/\D/g, '').slice(codeDigits.length, codeDigits.length + country.maxLen);
    const masked = this.formatMasked(digits);
    if (this.nativeEl) {
      this.nativeEl.value = masked;
      try {
        this.nativeEl.setSelectionRange(masked.length, masked.length);
      } catch {
        // ignore
      }
    }
    this.value = this.toE164(digits, this.countryIso);
    this.corInput.emit({ value: this.value, countryCode: this.countryIso });
  };

  private isLengthValid(): boolean {
    const country = this.currentCountry();
    const digits = this.localDigits(this.value).length;
    if (digits === 0) return false;
    return digits >= country.minLen && digits <= country.maxLen;
  }

  private openListbox = () => {
    if (this.isInert() || this.readonly || this.loading) return;
    if (this.type !== 'international') return;
    if (!this.open) this.open = true;
  };

  private closeListbox = () => {
    if (this.open) {
      this.open = false;
      this.triggerEl?.focus();
    }
  };

  private toggleListbox = (ev?: MouseEvent) => {
    ev?.stopPropagation();
    if (this.isInert() || this.readonly || this.loading) return;
    if (this.type !== 'international') return;
    if (this.open) this.closeListbox();
    else this.openListbox();
  };

  private changeCountry(nextIso: string, opts?: { silentLive?: boolean }) {
    const country = COUNTRIES[nextIso];
    if (!country) return;
    const previousDigits = this.localDigits(this.value);
    this.countryIso = nextIso;
    const trimmed = previousDigits.slice(0, country.maxLen);
    this.value = this.toE164(trimmed, nextIso);
    if (this.nativeEl) {
      this.nativeEl.value = this.formatMasked(trimmed);
    }
    this.corCountryChange.emit({ countryCode: nextIso });
    if (!opts?.silentLive) {
      this.liveAnnouncement = `${country.nameRo}, ${country.code}`;
    }
  }

  private handleTriggerKeyDown = (ev: KeyboardEvent) => {
    if (this.isInert() || this.readonly || this.loading) return;
    if (this.type !== 'international') return;
    const key = ev.key;
    const opts = this.activeCountries();

    if (!this.open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        ev.preventDefault();
        this.openListbox();
      }
      return;
    }

    switch (key) {
      case 'ArrowDown':
        ev.preventDefault();
        this.highlightedIndex = (this.highlightedIndex + 1) % opts.length;
        this.scrollHighlightedIntoView();
        break;
      case 'ArrowUp':
        ev.preventDefault();
        this.highlightedIndex = (this.highlightedIndex - 1 + opts.length) % opts.length;
        this.scrollHighlightedIntoView();
        break;
      case 'Home':
        ev.preventDefault();
        this.highlightedIndex = 0;
        this.scrollHighlightedIntoView();
        break;
      case 'End':
        ev.preventDefault();
        this.highlightedIndex = opts.length - 1;
        this.scrollHighlightedIntoView();
        break;
      case 'Enter':
      case ' ':
        ev.preventDefault();
        if (this.highlightedIndex >= 0 && this.highlightedIndex < opts.length) {
          this.changeCountry(opts[this.highlightedIndex].iso);
          this.closeListbox();
        }
        break;
      case 'Escape':
        ev.preventDefault();
        this.closeListbox();
        break;
      case 'Tab':
        this.open = false;
        break;
    }
  };

  private scrollHighlightedIntoView() {
    requestAnimationFrame(() => {
      const list = this.listboxEl;
      if (!list) return;
      const opt = list.querySelector(`[data-option-index="${this.highlightedIndex}"]`) as HTMLElement | null;
      opt?.scrollIntoView({ block: 'nearest' });
    });
  }

  private handleOptionPointerEnter = (index: number) => () => {
    this.highlightedIndex = index;
  };

  private handleOptionClick = (index: number) => (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    const opts = this.activeCountries();
    const target = opts[index];
    if (!target) return;
    this.changeCountry(target.iso);
    this.closeListbox();
  };

  private isInert(): boolean {
    return this.disabled || this.fieldsetDisabled;
  }

  private resolvedVariant(): PhoneInputVariant {
    return this.invalid ? 'destructive' : this.variant;
  }

  private hasVisibleLabel(): boolean {
    return Boolean(this.label && this.label.trim().length > 0) || this.hasLabelSlot;
  }

  private resolvedErrorText(): string {
    if (this.errorText && this.errorText.trim().length > 0) return this.errorText.trim();
    return 'Numărul de telefon este incomplet';
  }

  private hasErrorMessage(): boolean {
    return this.invalid;
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
    if (this.placeholder && this.placeholder.length > 0) return this.placeholder;
    return this.currentCountry().mask.replace(/X/g, '0');
  }

  private renderFlag(country: PhoneCountry) {
    return (
      <span
        class="flag"
        part="flag"
        aria-hidden="true"
        // Inline SVG glyph — see cor-phone-input.flags.ts for the
        // hand-drawn 20×16 set. innerHTML is safe here because the
        // strings are author-controlled constants, not user input.
        innerHTML={country.flag}
      />
    );
  }

  render() {
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.resolvedErrorText();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.ariaLabel : undefined;
    const country = this.currentCountry();
    const opts = this.activeCountries();
    const placeholder = this.resolvedPlaceholder();
    const localDisplay = this.formatMasked(this.localDigits(this.value));
    const isInternational = this.type === 'international';
    const isOpen = this.open && isInternational && !effectivelyDisabled && !this.readonly && !this.loading;
    const activeDescendantId =
      isOpen && this.highlightedIndex >= 0 ? `${this.listboxId}-opt-${this.highlightedIndex}` : undefined;
    const spinnerSize = this.size === 'lg' ? 'sm' : 'xs';

    const hostClasses = {
      'is-disabled': effectivelyDisabled,
      'is-readonly': this.readonly,
      'is-loading': this.loading,
      'is-invalid': this.invalid,
      'is-focused': this.isFocused && !effectivelyDisabled && !this.readonly,
      'is-open': isOpen,
      'is-populated': this.localDigits(this.value).length > 0,
      'has-label': this.hasVisibleLabel(),
      'is-international': isInternational,
      'is-local': !isInternational,
      [`variant-${variant}`]: true,
    };

    const triggerCommon = {
      class: 'country-trigger',
      part: 'country-trigger',
      id: this.triggerId,
    };
    const triggerAriaLabel = `${country.nameRo}, ${country.code}`;

    return (
      <Host class={hostClasses} aria-busy={this.loading ? 'true' : null}>
        <label class="label" htmlFor={this.inputId} id={this.labelId} part="label">
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

        <div class="control-wrapper">
          <div class="control" part="control">
            {isInternational ? (
              <button
                ref={el => (this.triggerEl = el)}
                {...triggerCommon}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isOpen ? 'true' : 'false'}
                aria-controls={this.listboxId}
                aria-activedescendant={activeDescendantId}
                aria-label={triggerAriaLabel}
                aria-disabled={effectivelyDisabled ? 'true' : null}
                aria-readonly={this.readonly ? 'true' : null}
                disabled={effectivelyDisabled}
                onClick={this.toggleListbox}
                onKeyDown={this.handleTriggerKeyDown}
              >
                {this.renderFlag(country)}
                <span class="country-trigger-code" part="country-trigger-code">
                  {country.code}
                </span>
                <cor-icon class="country-trigger-chevron" name="chevron-bottom" size={16} color="currentColor" />
              </button>
            ) : (
              <span {...triggerCommon} aria-label={triggerAriaLabel} role="img">
                {this.renderFlag(country)}
                <span class="country-trigger-code" part="country-trigger-code">
                  {country.code}
                </span>
              </span>
            )}

            <input
              ref={el => (this.nativeEl = el)}
              id={this.inputId}
              class="native"
              part="native"
              type="tel"
              name={this.name}
              value={localDisplay}
              placeholder={placeholder}
              disabled={effectivelyDisabled || this.loading}
              readonly={this.readonly}
              required={this.required}
              autocomplete="tel-national"
              inputMode="tel"
              spellcheck={false}
              maxLength={country.mask.length}
              aria-label={ariaLabelAttr}
              aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
              aria-describedby={this.describedBy()}
              aria-invalid={this.invalid ? 'true' : null}
              aria-required={this.required ? 'true' : null}
              aria-disabled={effectivelyDisabled ? 'true' : null}
              aria-readonly={this.readonly ? 'true' : null}
              aria-busy={this.loading ? 'true' : null}
              onInput={this.handleInput}
              onChange={this.handleChange}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
              onPaste={this.handlePaste}
            />

            {this.loading ? (
              <span class="control-spinner" part="spinner" aria-hidden="true">
                <cor-spinner size={spinnerSize} variant="brand" label="" />
              </span>
            ) : null}

            {this.readonly && this.isLengthValid() && !this.invalid ? (
              <cor-icon
                class="valid-icon"
                part="valid-icon"
                name="checkmark-circle-filled"
                size={20}
                color="icon-positive-default"
              />
            ) : null}
          </div>

          {isInternational ? (
            <div
              ref={el => (this.listboxEl = el)}
              id={this.listboxId}
              class="listbox"
              part="listbox"
              role="listbox"
              aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
              aria-label={!this.hasVisibleLabel() ? (this.ariaLabel ?? 'Țară') : undefined}
              hidden={!isOpen}
            >
              {opts.length === 0 ? (
                <div class="listbox-empty" role="presentation">
                  Nu există țări disponibile
                </div>
              ) : (
                opts.map((opt, index) => {
                  const isSelected = opt.iso === this.countryIso;
                  const isHighlighted = index === this.highlightedIndex;
                  return (
                    <div
                      id={`${this.listboxId}-opt-${index}`}
                      class={{
                        'option': true,
                        'is-selected': isSelected,
                        'is-highlighted': isHighlighted,
                      }}
                      role="option"
                      aria-selected={isSelected ? 'true' : 'false'}
                      data-option-index={index}
                      data-iso={opt.iso}
                      onClick={this.handleOptionClick(index)}
                      onMouseEnter={this.handleOptionPointerEnter(index)}
                    >
                      <span class="option-flag" aria-hidden="true" innerHTML={opt.flag} />
                      <span class="option-name">{opt.nameRo}</span>
                      <span class="option-code">{opt.code}</span>
                      {isSelected ? (
                        <cor-icon class="option-check" name="checkmark-small" size={16} color="currentColor" />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error">
            <cor-icon class="assistive-icon" name="circle-error-filled" size={20} color="icon-danger-default" />
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

        {/* Live region for screen readers — announces country change and form validity transitions. */}
        <span id={this.liveId} class="live-region" role="status" aria-live="polite" aria-atomic="true">
          {this.liveAnnouncement}
        </span>
      </Host>
    );
  }
}
