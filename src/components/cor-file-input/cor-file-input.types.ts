export const FILE_INPUT_SIZES = ['md', 'lg'] as const;
export const FILE_INPUT_VARIANTS = ['default', 'destructive'] as const;

export type FileInputSize = (typeof FILE_INPUT_SIZES)[number];
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
