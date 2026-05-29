export const TABS_SIZES = ['md', 'sm'] as const;

export type TabsSize = (typeof TABS_SIZES)[number];

/**
 * Declarative description of a single tab in a `mud-tabs` molecule.
 *
 * Each entry of `tabs` renders one tab item. As an alternative, consumers may
 * slot `<mud-tab>` children directly — the host then derives its model from
 * the slotted DOM rather than from the `tabs` prop.
 */
export interface TabDescriptor {
  /** Identity of the tab. Reflected as `value` on the underlying `<mud-tab>`. */
  value: string;
  /** Plain-text label rendered inside the tab. */
  label: string;
  /** Optional leading icon — maps to a registered `mud-icon` name. */
  iconName?: string;
  /**
   * Optional trailing numbered badge. When >= 0 the host renders a count;
   * to render a dot or skip the badge, omit the field.
   */
  badgeCount?: number;
  /** When true the tab is announced as `aria-disabled` and cannot be selected. */
  disabled?: boolean;
}

/**
 * `detail` payload of the `mudChange` event emitted by `mud-tabs` when the
 * selection changes either via click or keyboard.
 */
export interface TabsChangeDetail {
  value: string;
}
