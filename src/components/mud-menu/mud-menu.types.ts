/**
 * Public types for `mud-menu` and `mud-menu-item`.
 */

/** Menu semantics. `selection` = single-select list (ARIA listbox); `contextual` = actions (ARIA menu). */
export const MENU_TYPES = ['contextual', 'selection'] as const;
export type MenuType = (typeof MENU_TYPES)[number];

/** Leading element rendered before a menu item's label. */
export const MENU_ITEM_LEADINGS = ['none', 'checkbox', 'radio', 'icon'] as const;
export type MenuItemLeading = (typeof MENU_ITEM_LEADINGS)[number];

/** Detail for the `mudSelect` event — fired when any item is activated. */
export interface MenuSelectDetail {
  /** The `value` of the activated item (empty string when the item declared no value). */
  value: string;
}

/** Detail for the `mudChange` event — fired when the selected value changes (selection menus). */
export interface MenuChangeDetail {
  /** The newly selected value. */
  value: string;
}

/** Detail for the `mudMenuItemSelect` event — emitted by an item and consumed by its parent menu. */
export interface MenuItemSelectDetail {
  /** The activated item's `value` (empty string when the item declared no value). */
  value: string;
}
