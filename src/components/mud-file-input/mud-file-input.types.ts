export const FILE_INPUT_SIZES = ['md', 'lg'] as const;
export const FILE_INPUT_VARIANTS = ['dropzone', 'button'] as const;

export type FileInputSize = (typeof FILE_INPUT_SIZES)[number];

/**
 * Presentation axis:
 * - `dropzone` (default) — the dashed drag-and-drop area.
 * - `button` — a plain "Choose file" button (the Figma "Upload Button"); the
 *   file list, captions and validation behave identically.
 */
export type FileInputVariant = (typeof FILE_INPUT_VARIANTS)[number];

export type FileInputRejectionReason = 'size' | 'type' | 'count';

export interface FileInputChangeDetail {
  files: File[];
}

export interface FileInputDropDetail {
  accepted: File[];
  rejected: File[];
  reason?: FileInputRejectionReason;
}

export interface FileInputErrorDetail {
  code: FileInputRejectionReason;
  message: string;
  file?: File;
}

export interface FileInputRemoveDetail {
  file: File;
  index: number;
}
