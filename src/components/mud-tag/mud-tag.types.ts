export const TAG_VARIANTS = ['status', 'info'] as const;
export const TAG_SIZES = ['md', 'sm'] as const;
export const TAG_TYPES = ['subtle', 'strong', 'outlined'] as const;
export const TAG_SEMANTICS = ['muted', 'neutral', 'accent', 'success', 'brand', 'danger'] as const;

export type TagVariant = (typeof TAG_VARIANTS)[number];
export type TagSize = (typeof TAG_SIZES)[number];
export type TagType = (typeof TAG_TYPES)[number];
export type TagSemantic = (typeof TAG_SEMANTICS)[number];
