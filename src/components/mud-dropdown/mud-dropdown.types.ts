/**
 * Which edge of the trigger the menu lines up with:
 * - `start` — the menu's left edge under the trigger's (Figma Menu › Dismissal, 430:25768).
 * - `end` — the menu's right edge under the trigger's, for a trigger at the end of a row
 *   (a table's row actions), so the menu opens inwards.
 */
export const DROPDOWN_ALIGNS = ['start', 'end'] as const;

export type DropdownAlign = (typeof DROPDOWN_ALIGNS)[number];

/** Payload of `mudToggle`. */
export interface DropdownToggleDetail {
  open: boolean;
}
