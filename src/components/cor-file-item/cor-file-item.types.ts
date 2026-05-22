export const FILE_ITEM_STATES = ['idle', 'uploading', 'success', 'error'] as const;

export type FileItemState = (typeof FILE_ITEM_STATES)[number];

export interface FileItemRemoveDetail {
  /** Filename of the row that fired the remove. */
  filename: string;
}
