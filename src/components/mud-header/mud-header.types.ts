/**
 * Public types for `mud-header` and `mud-header-nav-item`.
 */

import type { LogoName } from '../mud-logo/mud-logo.types';

/** A selectable language in the pre-header switcher. */
export interface HeaderLanguage {
  /** Language code emitted on selection (e.g. `'ro'`). */
  code: string;
  /** Visible label (e.g. `'Ro'`). */
  label: string;
}

/** Detail for the `mudLanguageChange` event. */
export interface HeaderLanguageChangeDetail {
  /** The newly selected language code. */
  code: string;
}

/** Detail for the `mudNavSelect` event — a non-expandable nav item was activated. */
export interface HeaderNavSelectDetail {
  /** The activated item's `value`. */
  value: string;
}

/** Detail for the `mudNavToggle` event — an expandable nav item was opened/closed. */
export interface HeaderNavToggleDetail {
  /** The item's `value`. */
  value: string;
  /** Whether the item is now expanded. */
  expanded: boolean;
}

/** Default Ro / Ru / En language set used by the EVO header. */
export const HEADER_DEFAULT_LANGUAGES: readonly HeaderLanguage[] = [
  { code: 'ro', label: 'Ro' },
  { code: 'ru', label: 'Ru' },
  { code: 'en', label: 'En' },
];

/** A single link inside a mega-menu column. */
export interface MegaMenuItem {
  /** Visible label. */
  label: string;
  /** Optional destination — renders the option as a real link. */
  href?: string;
  /** Value reported on activation (falls back to `label`). */
  value?: string;
  /** Optional trailing tag (e.g. "Nou"). */
  tag?: string;
}

/** A column of the Servicii mega-menu: a heading over a list of links. */
export interface MegaMenuColumn {
  /** Column heading. */
  heading: string;
  /** Links shown beneath the heading. */
  items: readonly MegaMenuItem[];
}

/** Detail for the `mudMegaMenuSelect` event. */
export interface HeaderMegaMenuSelectDetail {
  /** The activated option's `value` (or `label` when no value was set). */
  value: string;
}

/** A platform card in the "Platforme utile" services menu. */
export interface ServicePlatform {
  /** Reuse a `mud-logo` asset by name (e.g. `'mpay-logo-with-verb'`). */
  logoName?: LogoName;
  /** Or supply a custom logo image URL (for logos not in `mud-logo`). */
  logoSrc?: string;
  /** Accessible name for the card (and `<img>` alt). */
  label: string;
  /** Destination — renders the card as a link. */
  href?: string;
}

/** Detail for the `mudServiceSelect` event. */
export interface HeaderServiceSelectDetail {
  /** The activated platform's `href` (or `label` when no href was set). */
  value: string;
}
