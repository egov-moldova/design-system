export const BANNER_VARIANTS = ['info', 'warning', 'error'] as const;

export type BannerVariant = (typeof BANNER_VARIANTS)[number];

export const BANNER_EMPHASES = ['subtle', 'strong'] as const;

export type BannerEmphasis = (typeof BANNER_EMPHASES)[number];

/** Default per-variant icon name resolved by `mud-icon` when `iconName` is unset. */
export const BANNER_DEFAULT_ICONS: Record<BannerVariant, string> = {
  info: 'circle-info-filled',
  warning: 'warning-filled',
  error: 'circle-error-filled',
};

/**
 * Variants that imply an assertive live region (urgent) per the WCAG
 * status/alert pattern. `info` stays polite. Mirrors mud-toast
 * convention for cross-component consistency.
 */
export const BANNER_ASSERTIVE_VARIANTS: ReadonlySet<BannerVariant> = new Set<BannerVariant>(['warning', 'error']);
