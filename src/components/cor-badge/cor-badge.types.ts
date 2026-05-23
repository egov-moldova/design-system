export const BADGE_TYPES = ['numbered', 'dot'] as const;
export const BADGE_VARIANTS = ['default', 'brand', 'positive', 'warning', 'danger'] as const;
export const BADGE_SIZES = ['sm', 'md'] as const;

export type BadgeType = (typeof BADGE_TYPES)[number];
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
export type BadgeSize = (typeof BADGE_SIZES)[number];
