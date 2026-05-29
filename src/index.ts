// AGE Design System — active exports.
//
// Components inherited from the previous DS are archived in `src/legacy/`
// and intentionally not exported here. Each component is added back to this
// surface as it is redesigned for the new design system.
//
// See `src/legacy/index.ts` for a snapshot of the previous export surface.

export { MudSpinner } from './components/mud-spinner/mud-spinner';
export type { SpinnerSize, SpinnerVariant } from './components/mud-spinner/mud-spinner.types';

export { MudButton } from './components/mud-button/mud-button';
export { BUTTON_SIZES, BUTTON_VARIANTS, BUTTON_SHAPES, BUTTON_TYPES } from './components/mud-button/mud-button.types';
export type { ButtonSize, ButtonVariant, ButtonShape, ButtonType } from './components/mud-button/mud-button.types';

export { MudButtonGroup } from './components/mud-button-group/mud-button-group';
export { BUTTON_GROUP_ORIENTATIONS } from './components/mud-button-group/mud-button-group.types';
export type { ButtonGroupOrientation } from './components/mud-button-group/mud-button-group.types';

export { MudLogo } from './components/mud-logo/mud-logo';
export { LOGO_NAMES } from './components/mud-logo/mud-logo.types';
export type { LogoName } from './components/mud-logo/mud-logo.types';

export { MudServiceButton } from './components/mud-service-button/mud-service-button';
export {
  SERVICE_BUTTON_APPEARANCES,
  SERVICE_BUTTON_TYPES,
} from './components/mud-service-button/mud-service-button.types';
export type {
  ServiceButtonAppearance,
  ServiceButtonType,
} from './components/mud-service-button/mud-service-button.types';

export { MudNotification } from './components/mud-notification/mud-notification';
export { NOTIFICATION_VARIANTS, NOTIFICATION_STYLES } from './components/mud-notification/mud-notification.types';
export type { NotificationVariant, NotificationStyle } from './components/mud-notification/mud-notification.types';
