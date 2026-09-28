import type { LocaleMessages, Plural } from '../../utils/locale';

/** Every built-in string of mud-file-input. `supportedFormatsText` and `maxSizeText`
 * carry a `{formats}` / `{size}` placeholder, filled once the caption is derived from
 * `accept` / `max-size`. The `sizeUnit*` keys are the same byte-size suffixes as
 * `mud-file-item`, used when deriving `maxSizeText`. */
export interface FileInputMessages {
  /** Lead-in CTA body text inside the drop area at rest, before the inline link. */
  ctaText: string;
  /** Label for the inline "choose files" link / the button variant's button. */
  chooseFilesText: string;
  /** Body text shown while a drag is over the drop zone. */
  dropzoneActiveText: string;
  /** Top-left caption template below the dropzone. Carries a `{formats}` placeholder. */
  supportedFormatsText: string;
  /** Top-right caption template below the dropzone. Carries a `{size}` placeholder. */
  maxSizeText: string;
  /** Suffix for a size under 1024 bytes. */
  sizeUnitBytes: string;
  /** Suffix for a size in kilobytes. */
  sizeUnitKB: string;
  /** Suffix for a size in megabytes. */
  sizeUnitMB: string;
  /** Suffix for a size in gigabytes. */
  sizeUnitGB: string;
  /** Suffix for a size in terabytes. */
  sizeUnitTB: string;
  /** Validity message when a required field is submitted with no files. */
  requiredText: string;
  /** Live-region announcement when exactly one file was accepted. Carries a `{name}` placeholder. */
  addedOneAnnouncement: string;
  /** Live-region announcement when more than one file was accepted. */
  addedManyAnnouncement: Plural;
  /** Live-region announcement when every dropped/picked file was rejected. */
  rejectedAnnouncement: Plural;
  /** Live-region announcement after a file is removed from the list. Carries a `{name}` placeholder. */
  removedAnnouncement: string;
  /** `mudError` message for an oversize file with a known name. Carries a `{name}` placeholder. */
  sizeRejectionText: string;
  /** `mudError` message for an oversize file with no known name. */
  sizeRejectionGenericText: string;
  /** `mudError` message for a file whose type doesn't match `accept`, with a known name. Carries a `{name}` placeholder. */
  typeRejectionText: string;
  /** `mudError` message for a file whose type doesn't match `accept`, with no known name. */
  typeRejectionGenericText: string;
  /** `mudError` message for a file rejected past `max-files`. Carries a `{max}` placeholder. */
  countRejectionText: string;
}

export const FILE_INPUT_MESSAGES: LocaleMessages<FileInputMessages> = {
  'ro-MD': {
    ctaText: 'Trage și plasează sau ',
    chooseFilesText: 'Alege fișiere',
    dropzoneActiveText: 'Eliberează pentru a încărca',
    supportedFormatsText: 'Formate acceptate: {formats}',
    maxSizeText: 'Mărime maximă: {size}',
    sizeUnitBytes: 'B',
    sizeUnitKB: 'KB',
    sizeUnitMB: 'MB',
    sizeUnitGB: 'GB',
    sizeUnitTB: 'TB',
    requiredText: 'Acest câmp este obligatoriu.',
    addedOneAnnouncement: 'Fișierul {name} a fost adăugat.',
    addedManyAnnouncement: {
      one: '{count} fișier a fost adăugat',
      few: '{count} fișiere au fost adăugate',
      other: '{count} de fișiere au fost adăugate',
    },
    rejectedAnnouncement: {
      one: '{count} fișier respins',
      few: '{count} fișiere respinse',
      other: '{count} de fișiere respinse',
    },
    removedAnnouncement: 'Fișierul {name} a fost eliminat.',
    sizeRejectionText: 'Fișierul "{name}" depășește limita de mărime.',
    sizeRejectionGenericText: 'Fișier prea mare.',
    typeRejectionText: 'Formatul fișierului "{name}" nu este acceptat.',
    typeRejectionGenericText: 'Format nepermis.',
    countRejectionText: 'Maximum {max} fișiere permise.',
  },
  'en-US': {
    ctaText: 'Drag and drop or ',
    chooseFilesText: 'Choose files',
    dropzoneActiveText: 'Release to upload',
    supportedFormatsText: 'Supported formats: {formats}',
    maxSizeText: 'Maximum size: {size}',
    sizeUnitBytes: 'B',
    sizeUnitKB: 'KB',
    sizeUnitMB: 'MB',
    sizeUnitGB: 'GB',
    sizeUnitTB: 'TB',
    requiredText: 'This field is required.',
    addedOneAnnouncement: 'File {name} was added.',
    addedManyAnnouncement: { one: '{count} file was added', other: '{count} files were added' },
    rejectedAnnouncement: { one: '{count} file rejected', other: '{count} files rejected' },
    removedAnnouncement: 'File {name} was removed.',
    sizeRejectionText: 'File "{name}" exceeds the size limit.',
    sizeRejectionGenericText: 'File too large.',
    typeRejectionText: 'The format of file "{name}" is not accepted.',
    typeRejectionGenericText: 'Format not allowed.',
    countRejectionText: 'Maximum {max} files allowed.',
  },
  'ru-MD': {
    ctaText: 'Перетащите или ',
    chooseFilesText: 'выберите файлы',
    dropzoneActiveText: 'Отпустите, чтобы загрузить',
    supportedFormatsText: 'Допустимые форматы: {formats}',
    maxSizeText: 'Максимальный размер: {size}',
    sizeUnitBytes: 'Б',
    sizeUnitKB: 'КБ',
    sizeUnitMB: 'МБ',
    sizeUnitGB: 'ГБ',
    sizeUnitTB: 'ТБ',
    requiredText: 'Это поле обязательно для заполнения.',
    addedOneAnnouncement: 'Файл {name} добавлен.',
    addedManyAnnouncement: {
      one: 'Добавлен {count} файл',
      few: 'Добавлено {count} файла',
      many: 'Добавлено {count} файлов',
      other: 'Добавлено {count} файла',
    },
    rejectedAnnouncement: {
      one: '{count} файл отклонён',
      few: '{count} файла отклонены',
      many: '{count} файлов отклонены',
      other: '{count} файла отклонены',
    },
    removedAnnouncement: 'Файл {name} удалён.',
    sizeRejectionText: 'Файл «{name}» превышает допустимый размер.',
    sizeRejectionGenericText: 'Файл слишком большой.',
    typeRejectionText: 'Формат файла «{name}» не поддерживается.',
    typeRejectionGenericText: 'Недопустимый формат.',
    countRejectionText: 'Разрешено не более {max} файлов.',
  },
};
