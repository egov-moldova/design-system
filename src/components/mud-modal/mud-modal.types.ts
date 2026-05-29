export const MODAL_SIZES = ['sm', 'md', 'lg'] as const;
export const MODAL_VARIANTS = ['default', 'with-image', 'with-icon'] as const;
export const MODAL_ACTIONS_LAYOUTS = ['inline', 'stacked'] as const;

export type ModalSize = (typeof MODAL_SIZES)[number];
export type ModalVariant = (typeof MODAL_VARIANTS)[number];
/**
 * Footer button arrangement per Figma 358:16247.
 * - `inline` (default) — buttons sit side-by-side, right-aligned
 * - `stacked` — buttons span the full footer width, stacked vertically (primary on top)
 */
export type ModalActionsLayout = (typeof MODAL_ACTIONS_LAYOUTS)[number];

/**
 * Reason payload carried by the `mudClose` event so consumers can route
 * dismissal sources (e.g. backdrop click → cancel; close-button → cancel;
 * action button → consumer-defined outcome).
 */
export const MODAL_CLOSE_REASONS = ['backdrop', 'escape', 'close-button', 'action'] as const;
export type ModalCloseReason = (typeof MODAL_CLOSE_REASONS)[number];

export type ModalCloseEvent = { reason: ModalCloseReason };
