import type { IconName } from '../mud-icon/mud-icon.types';

export const TOAST_VARIANTS = ['info', 'warning', 'success', 'error'] as const;

export type ToastVariant = (typeof TOAST_VARIANTS)[number];

/** Default per-variant icon name resolved by `mud-icon` when `iconName` prop is unset. */
export const TOAST_DEFAULT_ICONS: Record<ToastVariant, IconName> = {
  info: 'circle-info',
  warning: 'warning',
  success: 'circle-checkmark',
  error: 'circle-error',
};

/**
 * Variants that imply an assertive live region (urgent) per WCAG status/alert
 * pattern. Everything else uses the polite `status` role.
 */
export const TOAST_ASSERTIVE_VARIANTS: ReadonlySet<ToastVariant> = new Set<ToastVariant>(['warning', 'error']);

/**
 * Fallback for the close fade-out: `mudClose` still fires this long after the
 * close if `animationend` never arrives (a hidden toast does not animate).
 * Longer than `--toast-container-dismiss-duration` (250ms).
 */
export const TOAST_DISMISS_FALLBACK_MS = 400;
