export const RADIO_SIZES = ['md', 'sm'] as const;

export type RadioSize = (typeof RADIO_SIZES)[number];

export interface RadioChangeDetail {
  checked: boolean;
  value?: string;
}
