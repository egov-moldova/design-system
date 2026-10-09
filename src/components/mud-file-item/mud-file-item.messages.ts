import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-file-item. The `sizeUnit*` keys are the byte-size
 * suffixes shown after the formatted number (`245 KB`) — locale copy, not a number
 * format: `ru-MD` uses `КБ`/`МБ`/`ГБ`, not the Latin `KB`/`MB`/`GB`. */
export interface FileItemMessages {
  /** Accessible label for the remove button (the file name is added to it). */
  removeLabel: string;
  /** Said, after the file name, when the row starts uploading (the state is otherwise only a spinner). */
  uploadingLabel: string;
  /** Said, after the file name, when an upload finishes. */
  successLabel: string;
  /** Said, after the file name, when the row turns to error and has no message of its own. */
  errorLabel: string;
  /** Suffix for a size under 1024 bytes. */
  sizeUnitBytes: string;
  /** Suffix for a size in kilobytes. */
  sizeUnitKB: string;
  /** Suffix for a size in megabytes. */
  sizeUnitMB: string;
  /** Suffix for a size in gigabytes. */
  sizeUnitGB: string;
}

export const FILE_ITEM_MESSAGES: LocaleMessages<FileItemMessages> = {
  'ro-MD': {
    removeLabel: 'Elimină fișierul',
    uploadingLabel: 'Se încarcă',
    successLabel: 'Încărcat cu succes',
    errorLabel: 'Eroare la încărcare',
    sizeUnitBytes: 'B',
    sizeUnitKB: 'KB',
    sizeUnitMB: 'MB',
    sizeUnitGB: 'GB',
  },
  'en-US': {
    removeLabel: 'Remove file',
    uploadingLabel: 'Uploading',
    successLabel: 'Uploaded successfully',
    errorLabel: 'Upload failed',
    sizeUnitBytes: 'B',
    sizeUnitKB: 'KB',
    sizeUnitMB: 'MB',
    sizeUnitGB: 'GB',
  },
  'ru-MD': {
    removeLabel: 'Удалить файл',
    uploadingLabel: 'Загрузка',
    successLabel: 'Загружено успешно',
    errorLabel: 'Ошибка загрузки',
    sizeUnitBytes: 'Б',
    sizeUnitKB: 'КБ',
    sizeUnitMB: 'МБ',
    sizeUnitGB: 'ГБ',
  },
};
