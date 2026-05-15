/**
 * A file that passed validation and is ready for upload.
 */
export interface CorUploadFile {
  /** Unique identifier assigned by cor-upload-area (crypto.randomUUID or fallback). */
  id: string;
  /** The native File object. */
  file: File;
  /** Object URL for image preview. Defined when `generatePreview=true` and file is an image. */
  previewUrl?: string;
}

/**
 * A file that failed validation.
 */
export interface CorRejectedFile {
  /** The native File object that was rejected. */
  file: File;
  /** Human-readable rejection reasons (e.g. 'File type not allowed', 'Exceeds maximum size'). */
  reasons: string[];
}

/**
 * Constraints applied during the file validation pipeline.
 * All fields are optional — only the fields provided are enforced.
 */
export interface CorUploadConstraints {
  /**
   * Allowed MIME type categories (e.g. `'image'`, `'video'`, `'application'`).
   * Expands internally: `'image'` → `['image/jpeg','image/png','image/gif','image/svg+xml','image/webp','image/bmp','image/tiff','image/heic']`
   */
  types?: string[];
  /**
   * Allowed file extensions without leading dot (e.g. `['pdf', 'docx']`).
   * If both `types` and `extensions` are set, a file must pass both checks.
   */
  extensions?: string[];
  /** Maximum number of files that may be selected at once. */
  maxFiles?: number;
  /** Minimum number of files that must be selected. */
  minFiles?: number;
  /** Maximum file size in bytes. */
  maxFileSize?: number;
  /** Minimum file size in bytes. */
  minFileSize?: number;
}
