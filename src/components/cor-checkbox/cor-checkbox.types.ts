export const CHECKBOX_SIZES = ['sm', 'md'] as const;

export type CheckboxSize = (typeof CHECKBOX_SIZES)[number];

export interface CheckboxChangeDetail {
  checked: boolean;
  indeterminate: boolean;
  value?: string;
}
