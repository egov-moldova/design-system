export const MODAL_SIZES = ['sm', 'md', 'lg'] as const;
export const MODAL_VARIANTS = ['default', 'with-image', 'with-icon'] as const;

export type ModalSize = (typeof MODAL_SIZES)[number];
export type ModalVariant = (typeof MODAL_VARIANTS)[number];

/**
 * Reason payload carried by the `corClose` event so consumers can route
 * dismissal sources (e.g. backdrop click → cancel; close-button → cancel;
 * action button → consumer-defined outcome).
 */
export const MODAL_CLOSE_REASONS = ['backdrop', 'escape', 'close-button', 'action'] as const;
export type ModalCloseReason = (typeof MODAL_CLOSE_REASONS)[number];

export type ModalCloseEvent = { reason: ModalCloseReason };
