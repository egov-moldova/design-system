export const NOTIFICATION_VARIANTS = ['info', 'positive', 'warning', 'danger', 'neutral'] as const;
export const NOTIFICATION_STYLES = ['subtle', 'strong'] as const;

export type NotificationVariant = (typeof NOTIFICATION_VARIANTS)[number];
export type NotificationStyle = (typeof NOTIFICATION_STYLES)[number];

/** Default per-variant icon name resolved by `cor-icon` when `iconName` prop is unset. */
export const NOTIFICATION_DEFAULT_ICONS: Record<NotificationVariant, string> = {
  info: 'circle-info-filled',
  positive: 'circle-checkmark-filled',
  warning: 'warning-filled',
  danger: 'circle-error-filled',
  neutral: 'circle-info-filled',
};

/**
 * Variants that imply an assertive live region (urgent) per WCAG status/alert
 * pattern. Everything else uses the polite `status` role.
 */
export const NOTIFICATION_ASSERTIVE_VARIANTS: ReadonlySet<NotificationVariant> = new Set<NotificationVariant>([
  'warning',
  'danger',
]);
