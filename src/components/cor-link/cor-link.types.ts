export const LINK_SIZES = ['xs', 'sm', 'md', 'lg'] as const;
export const LINK_VARIANTS = ['primary', 'strict', 'white'] as const;
export const LINK_UNDERLINES = ['always', 'hover', 'none'] as const;

export type LinkSize = (typeof LINK_SIZES)[number];
export type LinkVariant = (typeof LINK_VARIANTS)[number];
export type LinkUnderline = (typeof LINK_UNDERLINES)[number];
