export const TEXTAREA_SIZES = ['md', 'lg'] as const;
export const TEXTAREA_VARIANTS = ['default', 'warning', 'destructive', 'success'] as const;
export const TEXTAREA_RESIZE = ['vertical', 'none'] as const;

export type TextareaSize = (typeof TEXTAREA_SIZES)[number];
export type TextareaVariant = (typeof TEXTAREA_VARIANTS)[number];
export type TextareaResize = (typeof TEXTAREA_RESIZE)[number];

export interface TextareaChangeDetail {
  value: string;
}
