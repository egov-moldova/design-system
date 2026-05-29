export const FILE_INPUT_SIZES = ['md', 'lg'] as const;

export type FileInputSize = (typeof FILE_INPUT_SIZES)[number];

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
