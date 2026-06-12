/**
 * Lightweight XHR-based file upload utility.
 *
 * Standalone import only — not exported from `src/index.ts`.
 *
 * Usage:
 * ```ts
 * import { createFileUploader } from '@egovmd/mud/utils/file-upload-helper';
 *
 * const uploader = createFileUploader({
 *   url: '/api/upload',
 *   onProgress: (id, pct) => updateFileItem(id, pct),
 *   onSuccess: (id, res) => markFileUploaded(id),
 *   onError: (id, err) => markFileError(id, err.message),
 * });
 *
 * // After corFilesSelected fires:
 * event.detail.files.forEach(f => uploader.upload(f));
 *
 * // On corCancelClick or corRemoveFile:
 * uploader.cancel(fileId);
 * ```
 */

import type { CorUploadFile } from './cor-upload-area/cor-upload-area.types';

/**
 * Options passed to `createFileUploader`.
 */
export interface FileUploadOptions {
  /** Upload endpoint URL. */
  url: string;
  /** Optional additional request headers. */
  headers?: Record<string, string>;
  /** Form field name for the file. Defaults to `'file'`. */
  fieldName?: string;
  /**
   * Called as the upload progresses.
   * @param fileId - The `id` from `CorUploadFile`.
   * @param percent - Current progress 0–100.
   */
  onProgress?: (fileId: string, percent: number) => void;
  /**
   * Called when the upload completes successfully (HTTP 2xx).
   * @param fileId - The `id` from `CorUploadFile`.
   * @param response - Parsed JSON response body, or raw text if not JSON.
   */
  onSuccess?: (fileId: string, response: unknown) => void;
  /**
   * Called when the upload fails (network error or non-2xx status).
   * @param fileId - The `id` from `CorUploadFile`.
   * @param error - The error that occurred.
   */
  onError?: (fileId: string, error: Error) => void;
}

/**
 * Return type of `createFileUploader`.
 */
export interface FileUploader {
  /**
   * Start uploading a single file.
   * @param uploadFile - A `CorUploadFile` object from the `corFilesSelected` event payload.
   */
  upload(uploadFile: CorUploadFile): void;
  /**
   * Cancel an in-progress upload by file ID.
   * Silently ignored if the file is not currently uploading.
   */
  cancel(fileId: string): void;
  /** Cancel all in-progress uploads. */
  cancelAll(): void;
}

/**
 * Creates a lightweight XHR-based file uploader factory.
 * No retry logic, no queue management, no state storage.
 *
 * @param options - Upload configuration.
 * @returns An object with `upload`, `cancel`, and `cancelAll` methods.
 */
export function createFileUploader(options: FileUploadOptions): FileUploader {
  const { url, headers = {}, fieldName = 'file', onProgress, onSuccess, onError } = options;

  const xhrMap = new Map<string, XMLHttpRequest>();

  function upload(uploadFile: CorUploadFile): void {
    const { id, file } = uploadFile;

    const xhr = new XMLHttpRequest();
    xhrMap.set(id, xhr);

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(id, percent);
      }
    };

    xhr.onload = () => {
      xhrMap.delete(id);
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onSuccess) {
          let response: unknown = xhr.responseText;
          try {
            response = JSON.parse(xhr.responseText);
          } catch {
            // leave as raw text
          }
          onSuccess(id, response);
        }
      } else {
        if (onError) {
          onError(id, new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => {
      xhrMap.delete(id);
      if (onError) {
        onError(id, new Error('Network error during upload'));
      }
    };

    xhr.onabort = () => {
      xhrMap.delete(id);
    };

    xhr.open('POST', url, true);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    const formData = new FormData();
    formData.append(fieldName, file, file.name);

    xhr.send(formData);
  }

  function cancel(fileId: string): void {
    const xhr = xhrMap.get(fileId);
    if (xhr) {
      xhr.abort();
      xhrMap.delete(fileId);
    }
  }

  function cancelAll(): void {
    xhrMap.forEach(xhr => xhr.abort());
    xhrMap.clear();
  }

  return { upload, cancel, cancelAll };
}
