export const SPINNER_SIZES = ['xs', 'sm', 'md', 'lg'] as const;
export const SPINNER_VARIANTS = ['brand', 'dark', 'light', 'light-on-color'] as const;

export type SpinnerSize = (typeof SPINNER_SIZES)[number];
export type SpinnerVariant = (typeof SPINNER_VARIANTS)[number];
