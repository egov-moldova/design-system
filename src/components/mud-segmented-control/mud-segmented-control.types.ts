export const SEGMENTED_CONTROL_SIZES = ['md', 'sm'] as const;

export type SegmentedControlSize = (typeof SEGMENTED_CONTROL_SIZES)[number];

/**
 * Declarative description of a single segment within a `mud-segmented-control`.
 *
 * The host renders one segment per entry of the `segments` prop. Each segment
 * exposes a click + keyboard target that emits `mudChange` when activated.
 */
export interface SegmentedControlSegment {
  /** Submitted form value when this segment is selected. */
  value: string;
  /** Plain-text label shown inside the segment. */
  label: string;
  /** When true the segment cannot be selected and renders muted. */
  disabled?: boolean;
  /**
   * Optional leading icon. Maps to a registered `mud-icon` name.
   * @see src/components/mud-icon/mud-icon.providers.ts
   */
  iconName?: string;
}

/**
 * `detail` payload of the `mudChange` event.
 *
 * `value` is the `value` field of the segment that just became selected.
 */
export interface SegmentedControlChangeDetail {
  value: string;
}
