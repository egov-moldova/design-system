import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { SystemMessageState } from './cor-system-message.enums';

/**
 * Default icon names per system-message state.
 */
export const SYSTEM_MESSAGE_ICON_NAME: Partial<Record<SystemMessageState, string>> = {
  [SystemMessageState.ALERT]: ICON_NAMES.WARNING__FILLED,
  [SystemMessageState.INFO]: ICON_NAMES.INFORMATION,
};

/**
 * Default icon color tokens per system-message state.
 */
export const SYSTEM_MESSAGE_ICON_COLOR: Partial<Record<SystemMessageState, string>> = {
  [SystemMessageState.ALERT]: 'system-error-icon',
  [SystemMessageState.INFO]: 'system-info-icon',
};
