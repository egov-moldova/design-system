export const TOAST_VARIANTS = ['info', 'warning', 'success', 'error'] as const;

export type ToastVariant = (typeof TOAST_VARIANTS)[number];

/** Default per-variant icon name resolved by `mud-icon` when `iconName` prop is unset. */
export const TOAST_DEFAULT_ICONS: Record<ToastVariant, string> = {
  info: 'circle-info-filled',
  warning: 'warning-filled',
  success: 'circle-checkmark-filled',
  error: 'circle-error-filled',
};

/**
 * Variants that imply an assertive live region (urgent) per WCAG status/alert
 * pattern. Everything else uses the polite `status` role.
 */
export const TOAST_ASSERTIVE_VARIANTS: ReadonlySet<ToastVariant> = new Set<ToastVariant>([
  'warning',
  'error',
]);
