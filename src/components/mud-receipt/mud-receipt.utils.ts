/**
 * Pure helpers used by `mud-receipt`. Extracted so they can be unit-tested
 * without rendering the component.
 */

import type { LogoName } from '../mud-logo/mud-logo.types';
import type { TagSemantic } from '../mud-tag/mud-tag.types';
import type { ReceiptService, ReceiptStatus } from './mud-receipt.types';

/**
 * Mask a Moldovan IDNP: keep the first 4 and last 3 digits, replace the
 * middle 6 with asterisks. Input that does not look like a 13-digit IDNP
 * is returned unchanged (the receipt is a presentation surface; validation
 * belongs upstream).
 *
 *   "2002003456789" → "2002******789"
 */
export const maskIdnp = (idnp: string | undefined): string => {
  if (!idnp) return '';
  const digits = idnp.trim();
  if (!/^\d{13}$/.test(digits)) return idnp;
  return `${digits.slice(0, 4)}******${digits.slice(-3)}`;
};

/**
 * Format an ISO date or a Date as a Romanian-locale string. Falls back to
 * the raw input on a parse failure.
 *
 *   "2026-05-22T14:32:00Z" → "22 mai 2026, 14:32"
 */
export const formatReceiptDate = (date: string | undefined, locale = 'ro-RO'): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString();
  }
};

/**
 * Mapping from service → mud-logo asset name (`with-name` layout).
 * Centralized so the component, stories, and tests cannot drift.
 */
export const SERVICE_LOGO_NAME: Record<ReceiptService, LogoName> = {
  mpay: 'mpay-logo-with-name',
  mpass: 'mpass-logo-with-name',
  msign: 'msign-logo-with-name',
  mdelivery: 'mdelivery-logo-with-name',
};

/**
 * Default Romanian receipt title per service. Overridable via `title` prop.
 */
export const SERVICE_DEFAULT_TITLE: Record<ReceiptService, string> = {
  mpay: 'Bon de plată',
  mpass: 'Confirmare autentificare',
  msign: 'Confirmare semnătură',
  mdelivery: 'Confirmare livrare',
};

/**
 * Mapping from status → mud-tag semantic role.
 * mud-tag's semantic vocabulary uses `success` (not `positive`); the
 * Romanian convention `Plătit` maps to the success token surface.
 */
export const STATUS_TAG_SEMANTIC: Record<ReceiptStatus, TagSemantic> = {
  paid: 'success',
  confirmed: 'brand',
  pending: 'accent',
  failed: 'danger',
};

/**
 * Mapping from status → Romanian label rendered inside the tag.
 */
export const STATUS_DEFAULT_LABEL: Record<ReceiptStatus, string> = {
  paid: 'Plătit',
  confirmed: 'Confirmat',
  pending: 'În curs',
  failed: 'Refuzat',
};
