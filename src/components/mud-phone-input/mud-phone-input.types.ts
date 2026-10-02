export const PHONE_INPUT_SIZES = ['md', 'lg'] as const;
export const PHONE_INPUT_VARIANTS = ['default', 'warning', 'destructive', 'success'] as const;
export const PHONE_INPUT_TYPES = ['local', 'international'] as const;

export type PhoneInputSize = (typeof PHONE_INPUT_SIZES)[number];
export type PhoneInputVariant = (typeof PHONE_INPUT_VARIANTS)[number];
export type PhoneInputType = (typeof PHONE_INPUT_TYPES)[number];

/**
 * ISO 3166-1 alpha-2 country code keying the internal `COUNTRIES` map.
 * The component accepts any string at the prop boundary but warns and
 * falls back to `'MD'` when the value isn't in the active list.
 */
export type PhoneCountryCode = string;

/**
 * One row in the country list: ISO code, dial code, mask and length window.
 * The table covers every country with a numbering plan; the `countries` prop
 * limits the list to a chosen few.
 *
 * Flags are SVG files under `assets/flags/`, named by the lower-case ISO code
 * and shown through an `<img>` (see `mud-phone-input.flags.ts`).
 *
 * The row itself lives in `mud-phone-input.data.ts` (data, not copy — the
 * `mud/no-hardcoded-copy` guard lints only `.tsx`); this re-exports its type.
 */
export type { PhoneCountry } from './mud-phone-input.data';

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
