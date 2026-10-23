import type { ToastVariant } from '../mud-toast/mud-toast.types';

/**
 * Variants that close on their own after `duration` (Figma 14830:13653,
 * Dismissal › auto-dismissive: "for most informational or success
 * messages"). Warnings, errors and any toast with an action stay until the
 * user closes them (Dismissal › manually-dismissive).
 */
export const TOAST_REGION_AUTO_DISMISS_VARIANTS: ReadonlySet<ToastVariant> = new Set<ToastVariant>(['info', 'success']);

/** Default auto-dismiss delay — Figma recommends 4 to 6 seconds. */
export const TOAST_REGION_DEFAULT_DURATION_MS = 5000;

/** What `show()` builds a toast from. */
export interface ToastRegionShowOptions {
  /** Semantic color family. Defaults to `info`. */
  variant?: ToastVariant;
  /** Optional bold heading above the message. */
  titleText?: string;
  /** The message, set as text (never parsed as HTML). */
  message: string;
  /** Whether the toast has a close button. Defaults to `true`. */
  closable?: boolean;
}
