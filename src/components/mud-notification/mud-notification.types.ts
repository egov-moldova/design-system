export const NOTIFICATION_VARIANTS = ['info', 'warning', 'success', 'error'] as const;

export type NotificationVariant = (typeof NOTIFICATION_VARIANTS)[number];

/** Default per-variant icon name resolved by `mud-icon` when `iconName` prop is unset. */
export const NOTIFICATION_DEFAULT_ICONS: Record<NotificationVariant, string> = {
  info: 'circle-info-filled',
  warning: 'warning-filled',
  success: 'circle-checkmark-filled',
  error: 'circle-error-filled',
};

/**
 * Variants that imply an assertive live region (urgent) per WCAG status/alert
 * pattern. Everything else uses the polite `status` role.
 */
export const NOTIFICATION_ASSERTIVE_VARIANTS: ReadonlySet<NotificationVariant> = new Set<NotificationVariant>([
  'warning',
  'error',
]);
