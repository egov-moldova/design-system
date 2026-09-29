import type { LocaleMessages } from '../../utils/locale';

/** Every built-in string of mud-file-item. The `sizeUnit*` keys are the byte-size
 * suffixes shown after the formatted number (`245 KB`) — locale copy, not a number
 * format: `ru-MD` uses `КБ`/`МБ`/`ГБ`, not the Latin `KB`/`MB`/`GB`. */
export interface FileItemMessages {
  /** Accessible label for the remove button. */
  removeLabel: string;
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
    sizeUnitBytes: 'B',
    sizeUnitKB: 'KB',
    sizeUnitMB: 'MB',
    sizeUnitGB: 'GB',
  },
  'en-US': {
    removeLabel: 'Remove file',
    sizeUnitBytes: 'B',
    sizeUnitKB: 'KB',
    sizeUnitMB: 'MB',
    sizeUnitGB: 'GB',
  },
  'ru-MD': {
    removeLabel: 'Удалить файл',
    sizeUnitBytes: 'Б',
    sizeUnitKB: 'КБ',
    sizeUnitMB: 'МБ',
    sizeUnitGB: 'ГБ',
  },
};
