/**
 * Shared constants for component slot validation.
 *
 * These constants ensure consistency across all components that use similar slot patterns.
 * Import and use these instead of defining inline validation arrays.
 */

/**
 * Valid HTML tags for helper-text slots across form components.
 *
 * Used by: cor-input, cor-textarea, cor-select, cor-checkbox, cor-radio, etc.
 *
 * @example
 * ```typescript
 * import { VALID_HELPER_TEXT_TAGS } from '../shared.constants';
 *
 * const helperTextSlot = this.host.querySelector('[slot="helper-text"]');
 * if (helperTextSlot && !VALID_HELPER_TEXT_TAGS.includes(helperTextSlot.tagName.toLowerCase())) {
 *   return <Host>{invalidSlottedTag(helperTextSlot.tagName.toLowerCase(), VALID_HELPER_TEXT_TAGS)}</Host>;
 * }
 * ```
 */
export const VALID_HELPER_TEXT_TAGS: readonly string[] = ['span', 'small', 'div', 'p'];

/**
 * Valid HTML tags for icon slots across all components.
 *
 * Icon slots should only accept cor-icon elements to maintain design system consistency.
 *
 * Used by: cor-input, cor-button, cor-card, cor-alert, etc.
 *
 * @example
 * ```typescript
 * import { VALID_ICON_SLOT_TAGS } from '../shared.constants';
 *
 * const iconSlot = this.host.querySelector('[slot="icon-left"]');
 * if (iconSlot && !VALID_ICON_SLOT_TAGS.includes(iconSlot.tagName.toLowerCase())) {
 *   return <Host>{invalidSlottedTag(iconSlot.tagName.toLowerCase(), VALID_ICON_SLOT_TAGS)}</Host>;
 * }
 * ```
 */
export const VALID_ICON_SLOT_TAGS: readonly string[] = ['cor-icon'];

/**
 * Valid HTML tags for avatar image slots.
 *
 * Used by: cor-avatar
 *
 * @example
 * ```typescript
 * import { VALID_AVATAR_IMAGE_TAGS } from '../shared.constants';
 *
 * const imageSlot = this.host.querySelector('[slot="image"]');
 * if (imageSlot && !VALID_AVATAR_IMAGE_TAGS.includes(imageSlot.tagName.toLowerCase())) {
 *   return <Host>{invalidSlottedTag(imageSlot.tagName.toLowerCase(), VALID_AVATAR_IMAGE_TAGS)}</Host>;
 * }
 * ```
 */
export const VALID_AVATAR_IMAGE_TAGS: readonly string[] = ['img', 'svg'];

/**
 * Valid HTML tags for avatar icon slots.
 *
 * Used by: cor-avatar
 *
 * @example
 * ```typescript
 * import { VALID_AVATAR_ICON_TAGS } from '../shared.constants';
 *
 * const iconSlot = this.host.querySelector('[slot="icon"]');
 * if (iconSlot && !VALID_AVATAR_ICON_TAGS.includes(iconSlot.tagName.toLowerCase())) {
 *   return <Host>{invalidSlottedTag(iconSlot.tagName.toLowerCase(), VALID_AVATAR_ICON_TAGS)}</Host>;
 * }
 * ```
 */
export const VALID_AVATAR_ICON_TAGS: readonly string[] = ['cor-icon', 'svg'];

/**
 * Valid HTML tags for avatar slots in parent components.
 *
 * Used by: cor-select-item
 *
 * @example
 * ```typescript
 * import { VALID_AVATAR_SLOT_TAGS } from '../shared.constants';
 *
 * const avatarSlot = this.host.querySelector('[slot="avatar"]');
 * if (avatarSlot && !VALID_AVATAR_SLOT_TAGS.includes(avatarSlot.tagName.toLowerCase())) {
 *   return <Host>{invalidSlottedTag(avatarSlot.tagName.toLowerCase(), VALID_AVATAR_SLOT_TAGS)}</Host>;
 * }
 * ```
 */
export const VALID_AVATAR_SLOT_TAGS: readonly string[] = ['cor-avatar'];

/**
 * Valid tags for cor-table default slot (table sections).
 *
 * Used by: cor-table
 */
export const VALID_TABLE_SECTION_TAGS: readonly string[] = ['cor-thead', 'cor-tbody', 'cor-tfoot'];

/**
 * Valid tags for cor-thead default slot (column headers).
 *
 * Used by: cor-thead
 */
export const VALID_TABLE_HEADER_TAGS: readonly string[] = ['cor-column'];

/**
 * Valid tags for cor-tbody default slot (rows).
 *
 * Used by: cor-tbody
 */
export const VALID_TABLE_ROW_TAGS: readonly string[] = ['cor-row'];

/**
 * Valid tags for cor-row default slot (cells).
 *
 * Used by: cor-row
 */
export const VALID_TABLE_CELL_TAGS: readonly string[] = ['cor-cell'];

/**
 * Valid tags for notification action slots.
 *
 * Used by: cor-notification-base
 */
export const VALID_NOTIFICATION_ACTION_TAGS: readonly string[] = ['cor-button'];

/**
 * Valid tags for notification close icon slot overrides.
 *
 * Used by: cor-notification-base
 */
export const VALID_NOTIFICATION_CLOSE_TAGS: readonly string[] = ['cor-icon'];
