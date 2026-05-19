/**
 * Semantic state values for cor-inline-notification.
 */
export enum NotificationState {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  INFO = 'info',
}

/**
 * Visual layout variant for cor-inline-notification.
 *
 * - `default` — standalone notification with full chrome.
 * - `in-form` — compact variant for inline use under form fields.
 */
export enum CorInlineNotificationVariant {
  DEFAULT = 'default',
  IN_FORM = 'in-form',
}
