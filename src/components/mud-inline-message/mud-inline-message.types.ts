export const INLINE_MESSAGE_VARIANTS = ['info', 'warning', 'success', 'error'] as const;
export const INLINE_MESSAGE_SIZES = ['small', 'medium'] as const;

export type InlineMessageVariant = (typeof INLINE_MESSAGE_VARIANTS)[number];
export type InlineMessageSize = (typeof INLINE_MESSAGE_SIZES)[number];

/** Default per-variant icon name resolved by `mud-icon` when `iconName` is unset. */
export const INLINE_MESSAGE_DEFAULT_ICONS: Record<InlineMessageVariant, string> = {
  info: 'circle-info-filled',
  warning: 'warning-filled',
  success: 'circle-checkmark-filled',
  error: 'circle-error-filled',
};
