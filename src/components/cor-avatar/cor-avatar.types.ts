export const AVATAR_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export const AVATAR_TYPES = ['photo', 'initials', 'icon'] as const;

export type AvatarSize = (typeof AVATAR_SIZES)[number];
export type AvatarType = (typeof AVATAR_TYPES)[number];
