/**
 * Public types for `mud-sidebar`, `mud-sidebar-group` and `mud-sidebar-item`.
 */

/** Detail for the `mudSelect` event — fired when a (non-expandable) item is activated. */
export interface SidebarItemSelectDetail {
  /** The activated item's `value` (empty string when none was declared). */
  value: string;
}

/** Detail for the `mudToggle` event — fired when an expandable item is expanded/collapsed. */
export interface SidebarItemToggleDetail {
  /** The expandable item's `value`. */
  value: string;
  /** Whether the item is now expanded. */
  expanded: boolean;
}

/**
 * Which badge a row's `badge` count renders as: Figma's grey `numbered-badge`
 * (149:4955) or its red `notification-badge` (797:43130).
 */
export const SIDEBAR_ITEM_BADGE_VARIANTS = ['neutral', 'notification'] as const;
export type SidebarItemBadgeVariant = (typeof SIDEBAR_ITEM_BADGE_VARIANTS)[number];
