// AGE Design System — active exports.
//
// Components inherited from the previous DS are archived in `src/legacy/`
// and intentionally not exported here. Each component is added back to this
// surface as it is redesigned for the new design system.
//
// See `src/legacy/index.ts` for a snapshot of the previous export surface.

export { CorSpinner } from './components/cor-spinner/cor-spinner';
export type { SpinnerSize, SpinnerVariant } from './components/cor-spinner/cor-spinner.types';

export { CorButton } from './components/cor-button/cor-button';
export { BUTTON_SIZES, BUTTON_VARIANTS, BUTTON_SHAPES, BUTTON_TYPES } from './components/cor-button/cor-button.types';
export type { ButtonSize, ButtonVariant, ButtonShape, ButtonType } from './components/cor-button/cor-button.types';

export { CorButtonGroup } from './components/cor-button-group/cor-button-group';
export { BUTTON_GROUP_ORIENTATIONS } from './components/cor-button-group/cor-button-group.types';
export type { ButtonGroupOrientation } from './components/cor-button-group/cor-button-group.types';

export { CorLogo } from './components/cor-logo/cor-logo';
export { LOGO_NAMES } from './components/cor-logo/cor-logo.types';
export type { LogoName } from './components/cor-logo/cor-logo.types';

export { CorServiceButton } from './components/cor-service-button/cor-service-button';
export {
  SERVICE_BUTTON_APPEARANCES,
  SERVICE_BUTTON_TYPES,
} from './components/cor-service-button/cor-service-button.types';
export type {
  ServiceButtonAppearance,
  ServiceButtonType,
} from './components/cor-service-button/cor-service-button.types';
