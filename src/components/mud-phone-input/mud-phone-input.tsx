import type { EventEmitter } from '@stencil/core';
import {
  AttachInternals,
  Component,
  Element,
  Event,
  Host,
  Listen,
  Prop,
  State,
  Watch,
  forceUpdate,
  h,
} from '@stencil/core';

import { COUNTRIES, DEFAULT_COUNTRY_ORDER } from './mud-phone-input.data';
import type { PhoneCountry } from './mud-phone-input.data';
import { PHONE_INPUT_SIZES, PHONE_INPUT_TYPES, PHONE_INPUT_VARIANTS } from './mud-phone-input.types';
import type {
  PhoneInputChangeDetail,
  PhoneInputCountryChangeDetail,
  PhoneInputInputDetail,
  PhoneInputSize,
  PhoneInputType,
  PhoneInputVariant,
} from './mud-phone-input.types';
import { observeAriaLabel } from '../../utils/aria-label';
import { formatLocale, localeMessages, observeDocumentLang } from '../../utils/locale';
import type { LocaleProp } from '../../utils/locale';
import { PHONE_INPUT_MESSAGES } from './mud-phone-input.messages';
import type { PhoneInputMessages } from './mud-phone-input.messages';

let phoneInputInstanceCounter = 0;

/**
 * The country's display name in `tag`: `Intl.DisplayNames`'s region name, falling
 * back to the curated English `name` when `Intl.DisplayNames` is unavailable or
 * returns nothing (older engines, an unrecognised ISO code).
 */
const countryDisplayName = (country: PhoneCountry, tag: string): string => {
  try {
    if (typeof Intl.DisplayNames === 'function') {
      const resolved = new Intl.DisplayNames([tag], { type: 'region' }).of(country.iso);
      if (resolved && resolved.trim().length > 0) return resolved;
    }
  } catch {
    // Falls through to the static fallback below.
  }
  return country.name;
};

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
 * @element mud-phone-input
 *
 * @slot label - Rich label content, replaces the `label` prop when present.
 * @slot helper - Rich helper / hint content, replaces the `helper-text` prop. Hidden when invalid + error-text is shown.
 */
@Component({
  tag: 'mud-phone-input',
  styleUrl: 'mud-phone-input.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class MudPhoneInput {
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
   * inline `mud-spinner` renders inside the input row. The host carries
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
   * `mudOpen` / `mudClose` events, not by writing to the attribute.
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
  @Prop({ reflect: true }) name?: string;

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
   * Language of the built-in copy and of the country names shown in the listbox
   * (`Intl.DisplayNames`). Unset, the component follows the closest ancestor `lang`
   * (`<html lang>` included), else `ro-MD`.
   */
  @Prop({ reflect: true }) locale?: LocaleProp;

  @State() private hasLabelSlot: boolean = false;
  @State() private hasHelperSlot: boolean = false;
  @State() private isFocused: boolean = false;
  @State() private fieldsetDisabled: boolean = false;
  @State() private highlightedIndex: number = -1;
  @State() private countryIso: string = 'MD';
  @State() private liveAnnouncement: string = '';
  /** The host's `aria-label` (attribute or native `ariaLabel` property), mirrored to the internal control when no visible label is present. */
  @State() private resolvedAriaLabel?: string;
  @State() private searchQuery: string = '';

  @Element() host!: HTMLMudPhoneInputElement;

  @AttachInternals() internals!: ElementInternals;

  /**
   * Fires on every keystroke. `detail.value` is the current canonical
   * E.164 string; `detail.countryCode` is the active ISO 3166-1 alpha-2.
   */
  @Event() mudInput!: EventEmitter<PhoneInputInputDetail>;

  /**
   * Fires when the value is committed (typically on `blur` or `Enter`).
   * `detail.isValid` reflects whether the local-segment length sits in
   * the active country's window.
   */
  @Event() mudChange!: EventEmitter<PhoneInputChangeDetail>;

  /** Fires when the user picks a different country from the dropdown. */
  @Event() mudCountryChange!: EventEmitter<PhoneInputCountryChangeDetail>;

  /** Fires when the country listbox opens. */
  @Event() mudOpen!: EventEmitter<void>;

  /** Fires when the country listbox closes. */
  @Event() mudClose!: EventEmitter<void>;

  /** Fires when the internal input gains focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudFocus!: EventEmitter<FocusEvent>;

  /** Fires when the internal input loses focus. The native `FocusEvent` is forwarded as-is. */
  @Event() mudBlur!: EventEmitter<FocusEvent>;

  private readonly instanceId = ++phoneInputInstanceCounter;
  private readonly labelId = `mud-phone-input-label-${this.instanceId}`;
  private readonly helperId = `mud-phone-input-helper-${this.instanceId}`;
  private readonly errorId = `mud-phone-input-error-${this.instanceId}`;
  private readonly triggerId = `mud-phone-input-trigger-${this.instanceId}`;
  private readonly listboxId = `mud-phone-input-listbox-${this.instanceId}`;
  private readonly inputId = `mud-phone-input-${this.instanceId}`;
  private readonly liveId = `mud-phone-input-live-${this.instanceId}`;
  private initialValue: string = '';
  private initialCountry: string = 'MD';
  private triggerEl?: HTMLButtonElement;
  private listboxEl?: HTMLElement;
  private searchInputEl?: HTMLInputElement;
  private nativeEl?: HTMLInputElement;
  private stopAriaLabel?: () => void;
  private stopLang?: () => void;

  connectedCallback() {
    this.stopAriaLabel = observeAriaLabel(this.host, label => (this.resolvedAriaLabel = label));
    this.stopLang = observeDocumentLang(() => {
      this.syncValidity();
      forceUpdate(this);
    });
  }

  disconnectedCallback() {
    this.stopAriaLabel?.();
    this.stopLang?.();
  }

  /** Built-in strings in the resolved locale. This component has no override props —
   * every key is a validity/announcement message or a listbox affordance label. */
  private messages(): PhoneInputMessages {
    return localeMessages('mud-phone-input', this.host, this.locale, PHONE_INPUT_MESSAGES, {});
  }

  /** The `Intl` tag whose dictionary/region names are shown — the resolved `MudLocale`, canonicalised. */
  private displayTag(): string {
    return formatLocale(this.host, this.locale);
  }

  private displayName(country: PhoneCountry): string {
    return countryDisplayName(country, this.displayTag());
  }

  componentWillLoad() {
    this.countryIso = this.resolveInitialCountry();
    this.initialCountry = this.countryIso;
    this.initialValue = this.value;
    this.internals.setFormValue(this.value, this.value);
    this.syncValidity();
    if (this.open && this.type === 'international') this.primeHighlight();
  }

  @Watch('required')
  onRequiredChange() {
    this.syncValidity();
  }

  // The validity message is a string handed to `setValidity` once, so a new locale must re-run it.
  @Watch('locale')
  onLocaleChange() {
    this.syncValidity();
  }

  private syncValidity() {
    if (!this.internals) return;
    const digits = this.localDigits(this.value).length;
    const country = this.currentCountry();
    const flags: ValidityStateFlags = {};
    let message: string | undefined;

    if (this.required && digits === 0) {
      flags.valueMissing = true;
      message = this.errorText && this.errorText.length > 0 ? this.errorText : this.messages().requiredText;
    } else if (digits > 0 && (digits < country.minLen || digits > country.maxLen)) {
      flags.tooShort = digits < country.minLen ? true : undefined;
      flags.tooLong = digits > country.maxLen ? true : undefined;
      message = this.errorText && this.errorText.length > 0 ? this.errorText : this.messages().incompleteText;
    }

    const anchor = this.nativeEl ?? undefined;
    const hasFlag = Object.values(flags).some(v => v === true);
    if (hasFlag) {
      this.internals.setValidity(flags, message, anchor);
    } else {
      this.internals.setValidity({}, undefined, anchor);
    }
  }

  @Watch('variant')
  validateVariant(next: PhoneInputVariant) {
    if (!PHONE_INPUT_VARIANTS.includes(next)) {
      console.warn(
        `[mud-phone-input] variant="${String(next)}" is not supported. Supported: ${PHONE_INPUT_VARIANTS.join(
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
        `[mud-phone-input] size="${String(next)}" is not supported. Supported: ${PHONE_INPUT_SIZES.join(
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
        `[mud-phone-input] type="${String(next)}" is not supported. Supported: ${PHONE_INPUT_TYPES.join(
          ', ',
        )}. Falling back to "local".`,
      );
      this.type = 'local';
      return;
    }
    // Local mode can't keep the listbox open — close it silently if the
    // caller switches modes mid-flight.
    if (next === 'local' && this.open) {
      this.setListboxOpen(false);
    }
  }

  @Watch('defaultCountry')
  validateDefaultCountry(next: string) {
    if (!COUNTRIES[next]) {
      console.warn(
        `[mud-phone-input] defaultCountry="${String(next)}" is not in the country map. Falling back to "MD".`,
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
    this.syncValidity();
  }

  /** Mirrors `disabled` from an ancestor `<fieldset disabled>`. */
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }

  formResetCallback() {
    this.value = this.initialValue;
    this.countryIso = this.initialCountry;
    this.internals.setFormValue(this.initialValue, this.initialValue);
    this.syncValidity();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      this.value = state;
      const detected = this.detectCountryFromValue(state);
      if (detected) this.countryIso = detected;
      this.internals.setFormValue(state, state);
      this.syncValidity();
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

  /**
   * The active country list. An explicit `countries` whitelist keeps the caller's
   * order verbatim; the default curated list keeps Moldova first and sorts the rest
   * by `Intl.Collator` on the resolved display name.
   */
  private activeCountries(): PhoneCountry[] {
    if (this.countries && this.countries.length > 0) {
      return this.countries.map(iso => COUNTRIES[iso]).filter((c): c is PhoneCountry => Boolean(c));
    }
    const tag = this.displayTag();
    const collator = new Intl.Collator(tag);
    const [moldova, rest] = DEFAULT_COUNTRY_ORDER.reduce<[PhoneCountry[], PhoneCountry[]]>(
      ([md, others], iso) => {
        const country = COUNTRIES[iso];
        if (!country) return [md, others];
        if (iso === 'MD') return [[...md, country], others];
        return [md, [...others, country]];
      },
      [[], []],
    );
    rest.sort((a, b) => collator.compare(this.displayName(a), this.displayName(b)));
    return [...moldova, ...rest];
  }

  /**
   * Apply the search-query filter on top of the active list. Empty query → full list.
   * Matches the displayed (localized) name and the data table's English `name` too, so
   * "Germany" still finds Germany on a Romanian or Russian page.
   */
  private filteredCountries(): PhoneCountry[] {
    const all = this.activeCountries();
    const q = this.searchQuery.trim().toLowerCase();
    if (q.length === 0) return all;
    return all.filter(c => {
      const haystack = `${this.displayName(c)} ${c.name} ${c.code} ${c.iso}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  private currentCountry(): PhoneCountry {
    return COUNTRIES[this.countryIso] ?? COUNTRIES.MD;
  }

  private primeHighlight() {
    const opts = this.filteredCountries();
    if (opts.length === 0) {
      this.highlightedIndex = -1;
      return;
    }
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

  private detectCountryFromValue(value: string): string | undefined {
    if (!value || !value.startsWith('+')) return undefined;
    const digitsOnly = value.replace(/\D/g, '');
    const sorted = [...this.activeCountries()].sort((a, b) => b.code.length - a.code.length);
    for (const country of sorted) {
      const codeDigits = country.code.replace(/\D/g, '');
      if (digitsOnly.startsWith(codeDigits)) return country.iso;
    }
    return undefined;
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
    this.mudInput.emit({ value: this.value, countryCode: this.countryIso });
  };

  private handleChange = () => {
    this.mudChange.emit({
      value: this.value,
      countryCode: this.countryIso,
      isValid: this.isLengthValid(),
    });
  };

  private handleFocus = (ev: FocusEvent) => {
    this.isFocused = true;
    this.mudFocus.emit(ev);
  };

  private handleBlur = (ev: FocusEvent) => {
    this.isFocused = false;
    this.mudBlur.emit(ev);
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
    this.mudInput.emit({ value: this.value, countryCode: this.countryIso });
  };

  private isLengthValid(): boolean {
    const country = this.currentCountry();
    const digits = this.localDigits(this.value).length;
    if (digits === 0) return false;
    return digits >= country.minLen && digits <= country.maxLen;
  }

  private hasValidationError(): boolean {
    const country = this.currentCountry();
    const digits = this.localDigits(this.value).length;
    if (this.required && digits === 0) return true;
    return digits > 0 && (digits < country.minLen || digits > country.maxLen);
  }

  private setListboxOpen(next: boolean, opts?: { emit?: boolean; focusTrigger?: boolean; focusSearch?: boolean }) {
    if (this.open === next) return;
    this.open = next;

    if (next) {
      this.searchQuery = '';
      this.primeHighlight();
      if (opts?.emit) this.mudOpen.emit();
      if (opts?.focusSearch) requestAnimationFrame(() => this.searchInputEl?.focus());
      return;
    }

    this.highlightedIndex = -1;
    this.searchQuery = '';
    if (opts?.emit) this.mudClose.emit();
    if (opts?.focusTrigger) this.triggerEl?.focus();
  }

  private openListbox = () => {
    if (this.isInert() || this.readonly || this.loading) return;
    if (this.type !== 'international') return;
    this.setListboxOpen(true, { emit: true, focusSearch: true });
  };

  private closeListbox = () => {
    this.setListboxOpen(false, { emit: true, focusTrigger: true });
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
    this.mudCountryChange.emit({ countryCode: nextIso });
    if (!opts?.silentLive) {
      this.liveAnnouncement = `${this.displayName(country)}, ${country.code}`;
    }
  }

  private handleTriggerKeyDown = (ev: KeyboardEvent) => {
    if (this.isInert() || this.readonly || this.loading) return;
    if (this.type !== 'international') return;
    const key = ev.key;

    if (!this.open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        ev.preventDefault();
        this.openListbox();
      }
      return;
    }

    this.handleListNavKey(ev);
  };

  /**
   * Shared keyboard-navigation routine used by both the trigger button (when
   * focus is parked on it after a pointer click) and the search input (where
   * focus moves on open). Operates on `filteredCountries()` so navigation and
   * selection stay in sync with the active filter.
   */
  private handleListNavKey = (ev: KeyboardEvent) => {
    const opts = this.filteredCountries();
    const key = ev.key;
    switch (key) {
      case 'ArrowDown':
        ev.preventDefault();
        if (opts.length === 0) return;
        this.highlightedIndex = (this.highlightedIndex + 1) % opts.length;
        this.scrollHighlightedIntoView();
        break;
      case 'ArrowUp':
        ev.preventDefault();
        if (opts.length === 0) return;
        this.highlightedIndex = (this.highlightedIndex - 1 + opts.length) % opts.length;
        this.scrollHighlightedIntoView();
        break;
      case 'Home':
        ev.preventDefault();
        if (opts.length === 0) return;
        this.highlightedIndex = 0;
        this.scrollHighlightedIntoView();
        break;
      case 'End':
        ev.preventDefault();
        if (opts.length === 0) return;
        this.highlightedIndex = opts.length - 1;
        this.scrollHighlightedIntoView();
        break;
      case 'Enter':
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
        this.setListboxOpen(false);
        break;
    }
  };

  private handleSearchInput = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    this.searchQuery = target.value;
    // Each keystroke can shrink the list; re-anchor the highlight so the next
    // ArrowDown lands on a visible row.
    const opts = this.filteredCountries();
    if (opts.length === 0) {
      this.highlightedIndex = -1;
      return;
    }
    const stillVisible = opts.findIndex(c => c.iso === this.countryIso);
    this.highlightedIndex = stillVisible >= 0 ? stillVisible : 0;
  };

  private clearSearch = () => {
    this.searchQuery = '';
    this.primeHighlight();
    requestAnimationFrame(() => this.searchInputEl?.focus());
  };

  /** Clear the phone-number value via the trailing × icon. Restores focus to the input. */
  private clearValue = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.isInert() || this.readonly || this.loading) return;
    this.value = this.toE164('', this.countryIso);
    if (this.nativeEl) {
      this.nativeEl.value = '';
      requestAnimationFrame(() => this.nativeEl?.focus());
    }
    this.mudInput.emit({ value: this.value, countryCode: this.countryIso });
    this.mudChange.emit({ value: this.value, countryCode: this.countryIso, isValid: false });
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
    const opts = this.filteredCountries();
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
    return this.messages().incompleteText;
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
      <span class="flag" part="flag" aria-hidden="true">
        {country.flag()}
      </span>
    );
  }

  render() {
    const m = this.messages();
    const effectivelyDisabled = this.isInert();
    const variant = this.resolvedVariant();
    const labelText = this.label?.trim();
    const helperText = this.helperText?.trim();
    const errorText = this.resolvedErrorText();
    const ariaLabelAttr = !this.hasVisibleLabel() ? this.resolvedAriaLabel : undefined;
    const country = this.currentCountry();
    const opts = this.filteredCountries();
    const placeholder = this.resolvedPlaceholder();
    const localDisplay = this.formatMasked(this.localDigits(this.value));
    const isInternational = this.type === 'international';
    const isOpen = this.open && isInternational && !effectivelyDisabled && !this.readonly && !this.loading;
    const isPopulated = this.localDigits(this.value).length > 0;
    const isAriaInvalid = this.invalid || this.hasValidationError();
    const showClearButton = isPopulated && this.isFocused && !effectivelyDisabled && !this.readonly && !this.loading;
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
    const triggerAriaLabel = `${this.displayName(country)}, ${country.code}`;
    const hostLang = this.locale ? formatLocale(this.host, this.locale) : undefined;

    return (
      <Host class={hostClasses} lang={hostLang} aria-busy={this.loading ? 'true' : null}>
        <label class="label" htmlFor={this.inputId} id={this.labelId} part="label">
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

        <div class="control-wrapper">
          <div class="control" part="control">
            {/* No `aria-haspopup`: implicit for a combobox whose popup is a
                listbox, as `mud-select` notes at greater length. */}
            {isInternational ? (
              <button
                ref={el => (this.triggerEl = el)}
                {...triggerCommon}
                type="button"
                role="combobox"
                aria-expanded={isOpen ? 'true' : 'false'}
                aria-controls={this.listboxId}
                aria-activedescendant={activeDescendantId}
                aria-label={triggerAriaLabel}
                disabled={effectivelyDisabled || this.readonly}
                onClick={this.toggleListbox}
                onKeyDown={this.handleTriggerKeyDown}
              >
                {this.renderFlag(country)}
                <span class="country-trigger-code" part="country-trigger-code">
                  {country.code}
                </span>
                <mud-icon class="country-trigger-chevron" name="chevron-bottom" size={16} />
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
              aria-invalid={isAriaInvalid ? 'true' : null}
              aria-busy={this.loading ? 'true' : null}
              onInput={this.handleInput}
              onChange={this.handleChange}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
              onPaste={this.handlePaste}
            />

            {this.loading ? (
              <span class="control-spinner" part="spinner" aria-hidden="true">
                <mud-spinner size={spinnerSize} variant="brand" label="" />
              </span>
            ) : null}

            {this.readonly && this.isLengthValid() && !this.invalid ? (
              <mud-icon
                class="valid-icon"
                part="valid-icon"
                name="circle-checkmark"
                variant="filled"
                size={20}
                color="icon-positive-default"
              />
            ) : null}

            {showClearButton ? (
              <button
                type="button"
                class="clear-button"
                part="clear-button"
                aria-label={m.clearValueLabel}
                // Prevent the input from losing focus on click so the focus
                // ring + clear visibility don't flicker before the value is
                // cleared.
                onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
                onClick={this.clearValue}
              >
                <mud-icon name="cross-small" size={16} />
              </button>
            ) : null}
          </div>

          {isInternational ? (
            <div ref={el => (this.listboxEl = el)} class="listbox-popover" part="listbox-popover" hidden={!isOpen}>
              <div class="listbox-search" part="listbox-search">
                <mud-icon class="listbox-search-icon" name="search" size={16} />
                <input
                  ref={el => (this.searchInputEl = el)}
                  class="listbox-search-input"
                  part="listbox-search-input"
                  type="text"
                  autocomplete="off"
                  spellcheck={false}
                  placeholder={m.searchCountryText}
                  aria-label={m.searchCountryText}
                  aria-controls={this.listboxId}
                  aria-activedescendant={activeDescendantId}
                  value={this.searchQuery}
                  onInput={this.handleSearchInput}
                  onKeyDown={this.handleListNavKey}
                />
                {this.searchQuery.length > 0 ? (
                  <button
                    type="button"
                    class="listbox-search-clear"
                    part="listbox-search-clear"
                    aria-label={m.clearSearchLabel}
                    onMouseDown={(ev: MouseEvent) => ev.preventDefault()}
                    onClick={this.clearSearch}
                  >
                    <mud-icon name="cross-small" size={16} />
                  </button>
                ) : null}
              </div>
              <div
                id={this.listboxId}
                class="listbox"
                part="listbox"
                role="listbox"
                aria-labelledby={this.hasVisibleLabel() ? this.labelId : undefined}
                aria-label={!this.hasVisibleLabel() ? (this.resolvedAriaLabel ?? m.countryListLabel) : undefined}
              >
                {opts.length === 0 ? (
                  <div class="listbox-empty" role="presentation">
                    {m.noCountryFoundText}
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
                        <span class="option-flag" aria-hidden="true">
                          {opt.flag()}
                        </span>
                        <span class="option-name">{this.displayName(opt)}</span>
                        <span class="option-code">{opt.code}</span>
                        {isSelected ? <mud-icon class="option-check" name="checkmark-small" size={16} /> : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>

        {this.hasErrorMessage() ? (
          <div class="assistive assistive-error" id={this.errorId} part="error">
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
            {variant === 'warning' ? (
              <mud-icon class="assistive-icon" name="warning" variant="filled" size={20} color="icon-warning-default" />
            ) : variant === 'success' ? (
              <mud-icon
                class="assistive-icon"
                name="circle-checkmark"
                variant="filled"
                size={20}
                color="icon-positive-default"
              />
            ) : null}
            <span class="assistive-text">
              {this.hasHelperSlot ? null : helperText}
              <slot name="helper" onSlotchange={this.onHelperSlotChange} />
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
