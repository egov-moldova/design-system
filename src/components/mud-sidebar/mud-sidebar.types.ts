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
