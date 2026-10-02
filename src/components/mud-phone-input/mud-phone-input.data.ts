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
 * has a flag: the SVG named by its ISO code (`mud-phone-input.flags.ts`).
 */
export const COUNTRIES: Record<string, PhoneCountry> = {
  MD: { iso: 'MD', code: '+373', name: 'Moldova', mask: 'XXX XX XXX', minLen: 8, maxLen: 8 },
  RO: { iso: 'RO', code: '+40', name: 'Romania', mask: 'XXX XXX XXX', minLen: 9, maxLen: 9 },
  RU: { iso: 'RU', code: '+7', name: 'Russia', mask: 'XXX XXX XX XX', minLen: 10, maxLen: 10 },
  UA: { iso: 'UA', code: '+380', name: 'Ukraine', mask: 'XX XXX XX XX', minLen: 9, maxLen: 9 },
  US: { iso: 'US', code: '+1', name: 'United States', mask: 'XXX XXX XXXX', minLen: 10, maxLen: 10 },
  GB: { iso: 'GB', code: '+44', name: 'United Kingdom', mask: 'XXXX XXX XXX', minLen: 10, maxLen: 10 },
  DE: { iso: 'DE', code: '+49', name: 'Germany', mask: 'XXX XXXX XXXX', minLen: 10, maxLen: 11 },
  FR: { iso: 'FR', code: '+33', name: 'France', mask: 'X XX XX XX XX', minLen: 9, maxLen: 9 },
  IT: { iso: 'IT', code: '+39', name: 'Italy', mask: 'XXX XXX XXXX', minLen: 9, maxLen: 10 },
  ES: { iso: 'ES', code: '+34', name: 'Spain', mask: 'XXX XXX XXX', minLen: 9, maxLen: 9 },
  PT: { iso: 'PT', code: '+351', name: 'Portugal', mask: 'XXX XXX XXX', minLen: 9, maxLen: 9 },
  IL: { iso: 'IL', code: '+972', name: 'Israel', mask: 'XX XXX XXXX', minLen: 9, maxLen: 9 },
  TR: { iso: 'TR', code: '+90', name: 'Turkey', mask: 'XXX XXX XX XX', minLen: 10, maxLen: 10 },
  BG: { iso: 'BG', code: '+359', name: 'Bulgaria', mask: 'XX XXX XXXX', minLen: 8, maxLen: 9 },
  GR: { iso: 'GR', code: '+30', name: 'Greece', mask: 'XXX XXX XXXX', minLen: 10, maxLen: 10 },
};

/** Curated iteration order, Moldova first — the fallback order used before any locale sort. */
export const DEFAULT_COUNTRY_ORDER = Object.keys(COUNTRIES);
