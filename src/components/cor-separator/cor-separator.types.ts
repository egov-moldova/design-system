export const SEPARATOR_ORIENTATIONS = ['horizontal', 'vertical'] as const;
export const SEPARATOR_SIZES = ['extra-thin', 'thin', 'medium', 'thick'] as const;
export const SEPARATOR_VARIANTS = ['subtle', 'mild', 'strong'] as const;

export type SeparatorOrientation = (typeof SEPARATOR_ORIENTATIONS)[number];
export type SeparatorSize = (typeof SEPARATOR_SIZES)[number];
export type SeparatorVariant = (typeof SEPARATOR_VARIANTS)[number];
