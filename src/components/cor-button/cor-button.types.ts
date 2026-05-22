export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
export const BUTTON_VARIANTS = ['primary', 'secondary', 'strict', 'neutral', 'destructive'] as const;
export const BUTTON_APPEARANCES = ['filled', 'outlined', 'text'] as const;
export const BUTTON_SHAPES = ['rectangular', 'circular'] as const;
export const BUTTON_TYPES = ['button', 'submit', 'reset'] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonAppearance = (typeof BUTTON_APPEARANCES)[number];
export type ButtonShape = (typeof BUTTON_SHAPES)[number];
export type ButtonType = (typeof BUTTON_TYPES)[number];
