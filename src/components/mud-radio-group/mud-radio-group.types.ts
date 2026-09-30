export const RADIO_GROUP_ORIENTATIONS = ['vertical', 'horizontal'] as const;

export type RadioGroupOrientation = (typeof RADIO_GROUP_ORIENTATIONS)[number];

/** Payload of `mud-radio-group`'s `mudChange`. */
export interface RadioGroupChangeDetail {
  /** `value` of the radio the user selected. */
  value: string | undefined;
}
