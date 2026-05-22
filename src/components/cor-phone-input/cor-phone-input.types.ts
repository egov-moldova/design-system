export const PHONE_INPUT_SIZES = ['md', 'lg'] as const;
export const PHONE_INPUT_VARIANTS = ['default', 'destructive'] as const;

export type PhoneInputSize = (typeof PHONE_INPUT_SIZES)[number];
export type PhoneInputVariant = (typeof PHONE_INPUT_VARIANTS)[number];

/**
 * ISO 3166-1 alpha-2 country code keying the internal `COUNTRIES` map.
 * The component accepts any string at the prop boundary but warns and
 * falls back to `'MD'` when the value isn't in the active list.
 */
export type PhoneCountryCode = string;

/**
 * One row in the country list. The Moldovan diaspora list is curated for
 * the e-Gov audience — additional ITU-T E.164 entries can be threaded
 * through the `countries` prop without changing the runtime contract.
 */
export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 (`MD`, `RO`, ...). */
  iso: string;
  /** International dial code with leading `+` (`+373`, `+40`). */
  code: string;
  /** English display name (`Moldova`). */
  name: string;
  /** Romanian display name (`Moldova`, `Germania`). */
  nameRo: string;
  /** Local-segment format mask using `X` for digits and space separators (`XXX XX XXX`). */
  mask: string;
  /** Inclusive minimum digit count of the local segment. */
  minLen: number;
  /** Inclusive maximum digit count of the local segment. */
  maxLen: number;
}

export interface PhoneInputChangeDetail {
  /** Canonical E.164 representation: dial code + digits (e.g. `+37362123456`). Empty string when no digits are present. */
  value: string;
  /** ISO 3166-1 alpha-2 of the currently selected country (`MD`). */
  countryCode: string;
  /** Whether the local-segment digit count satisfies the country's `minLen / maxLen` window. */
  isValid: boolean;
}

export interface PhoneInputInputDetail {
  /** Canonical E.164 representation. */
  value: string;
  /** ISO 3166-1 alpha-2 of the currently selected country. */
  countryCode: string;
}

export interface PhoneInputCountryChangeDetail {
  /** ISO 3166-1 alpha-2 of the newly selected country. */
  countryCode: string;
}
