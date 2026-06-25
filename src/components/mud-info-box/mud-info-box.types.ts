export const INFO_BOX_VARIANTS = ['info', 'info-moderate', 'warning', 'error'] as const;
export const INFO_BOX_EMPHASES = ['strong', 'subtle'] as const;

export type InfoBoxVariant = (typeof INFO_BOX_VARIANTS)[number];
export type InfoBoxEmphasis = (typeof INFO_BOX_EMPHASES)[number];

/** Default per-variant icon name resolved by `mud-icon` when `iconName` is unset. */
export const INFO_BOX_DEFAULT_ICONS: Record<InfoBoxVariant, string> = {
  'info': 'circle-info-filled',
  'info-moderate': 'circle-info-filled',
  'warning': 'warning-filled',
  'error': 'circle-error-filled',
};
