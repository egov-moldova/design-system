export const INPUT_SIZES = ['md', 'lg'] as const;
export const INPUT_VARIANTS = ['default', 'warning', 'destructive', 'success'] as const;
export const INPUT_TYPES = ['text', 'email', 'password', 'tel', 'url', 'search'] as const;

export type InputSize = (typeof INPUT_SIZES)[number];
export type InputVariant = (typeof INPUT_VARIANTS)[number];
export type InputType = (typeof INPUT_TYPES)[number];

export interface InputChangeDetail {
  value: string;
}
