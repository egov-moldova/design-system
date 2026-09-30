import type { h } from '@stencil/core';

import { PHONE_FLAGS } from './mud-phone-input.flags';

/** One row in the country list. Data, never copy — the guard lints only `.tsx`. */
export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 (`MD`, `RO`, ...). */
  iso: string;
  /** International dial code with leading `+` (`+373`, `+40`). */
  code: string;
  /**
   * English display name, used only as a fallback when `Intl.DisplayNames` is
   * unavailable or returns nothing for this ISO code — the normal path renders
   * a per-locale name from `Intl.DisplayNames([tag], { type: 'region' }).of(iso)`.
   */
  name: string;
  /** Local-segment format mask using `X` for digits and space separators (`XXX XX XXX`). */
  mask: string;
  /** Inclusive minimum digit count of the local segment. */
  minLen: number;
  /** Inclusive maximum digit count of the local segment. */
  maxLen: number;
  /** Inline SVG renderer for the country flag glyph. */
  flag: () => ReturnType<typeof h>;
}

/**
 * Curated list of countries relevant to the Moldovan e-Gov audience: the
 * home market plus the diaspora destinations seen in the registry data.
 * Moldova is always shown first; the rest are sorted at render time by the
 * component (`Intl.Collator` on the resolved display name).
 *
 * The map is hand-rolled — `libphonenumber-js` would pull in ~140KB to
 * cover countries we don't serve. The `mask` uses `X` for required digits
 * and literal spaces as visual separators; the formatter respects each
 * country's local-segment length window (`minLen` / `maxLen`). Each row
 * carries an inline SVG `flag` glyph from `mud-phone-input.flags.ts`.
 */
export const COUNTRIES: Record<string, PhoneCountry> = {
  MD: { iso: 'MD', code: '+373', name: 'Moldova', mask: 'XXX XX XXX', minLen: 8, maxLen: 8, flag: PHONE_FLAGS.MD },
  RO: { iso: 'RO', code: '+40', name: 'Romania', mask: 'XXX XXX XXX', minLen: 9, maxLen: 9, flag: PHONE_FLAGS.RO },
  RU: { iso: 'RU', code: '+7', name: 'Russia', mask: 'XXX XXX XX XX', minLen: 10, maxLen: 10, flag: PHONE_FLAGS.RU },
  UA: { iso: 'UA', code: '+380', name: 'Ukraine', mask: 'XX XXX XX XX', minLen: 9, maxLen: 9, flag: PHONE_FLAGS.UA },
  US: {
    iso: 'US',
    code: '+1',
    name: 'United States',
    mask: 'XXX XXX XXXX',
    minLen: 10,
    maxLen: 10,
    flag: PHONE_FLAGS.US,
  },
  GB: {
    iso: 'GB',
    code: '+44',
    name: 'United Kingdom',
    mask: 'XXXX XXX XXX',
    minLen: 10,
    maxLen: 10,
    flag: PHONE_FLAGS.GB,
  },
  DE: {
    iso: 'DE',
    code: '+49',
    name: 'Germany',
    mask: 'XXX XXXX XXXX',
    minLen: 10,
    maxLen: 11,
    flag: PHONE_FLAGS.DE,
  },
  FR: { iso: 'FR', code: '+33', name: 'France', mask: 'X XX XX XX XX', minLen: 9, maxLen: 9, flag: PHONE_FLAGS.FR },
  IT: { iso: 'IT', code: '+39', name: 'Italy', mask: 'XXX XXX XXXX', minLen: 9, maxLen: 10, flag: PHONE_FLAGS.IT },
  ES: { iso: 'ES', code: '+34', name: 'Spain', mask: 'XXX XXX XXX', minLen: 9, maxLen: 9, flag: PHONE_FLAGS.ES },
  PT: {
    iso: 'PT',
    code: '+351',
    name: 'Portugal',
    mask: 'XXX XXX XXX',
    minLen: 9,
    maxLen: 9,
    flag: PHONE_FLAGS.PT,
  },
  IL: { iso: 'IL', code: '+972', name: 'Israel', mask: 'XX XXX XXXX', minLen: 9, maxLen: 9, flag: PHONE_FLAGS.IL },
  TR: { iso: 'TR', code: '+90', name: 'Turkey', mask: 'XXX XXX XX XX', minLen: 10, maxLen: 10, flag: PHONE_FLAGS.TR },
  BG: {
    iso: 'BG',
    code: '+359',
    name: 'Bulgaria',
    mask: 'XX XXX XXXX',
    minLen: 8,
    maxLen: 9,
    flag: PHONE_FLAGS.BG,
  },
  GR: { iso: 'GR', code: '+30', name: 'Greece', mask: 'XXX XXX XXXX', minLen: 10, maxLen: 10, flag: PHONE_FLAGS.GR },
};

/** Curated iteration order, Moldova first — the fallback order used before any locale sort. */
export const DEFAULT_COUNTRY_ORDER = Object.keys(COUNTRIES);
