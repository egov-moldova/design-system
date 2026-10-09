export const FILE_ITEM_STATES = ['uploaded', 'uploading', 'success', 'error'] as const;

export type FileItemState = (typeof FILE_ITEM_STATES)[number];

export interface FileItemRemoveDetail {
  /** Filename of the row that fired the remove. */
  filename: string;
}

/**
 * `default` — upload row (glyph, filename · size).
 * `system` — Figma "system-files-item": document card with an issued-on / issuer info row.
 * `upload` — Figma upload-modal "file-item": the state (spinner / success / error) sits before the name,
 *   the remove button stays available while uploading (it cancels), and an uploading row draws a progress bar.
 */
export const FILE_ITEM_VARIANTS = ['default', 'system', 'upload'] as const;

export type FileItemVariant = (typeof FILE_ITEM_VARIANTS)[number];
