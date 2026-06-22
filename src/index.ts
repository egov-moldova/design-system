// MUD Design System — active exports.
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
export { NOTIFICATION_VARIANTS } from './components/mud-notification/mud-notification.types';
export type { NotificationVariant } from './components/mud-notification/mud-notification.types';

export { MudMenu } from './components/mud-menu/mud-menu';
export { MudMenuItem } from './components/mud-menu/mud-menu-item';
export { MENU_TYPES, MENU_ITEM_LEADINGS } from './components/mud-menu/mud-menu.types';
export type {
  MenuType,
  MenuItemLeading,
  MenuSelectDetail,
  MenuChangeDetail,
  MenuItemSelectDetail,
} from './components/mud-menu/mud-menu.types';

export { MudSidebar } from './components/mud-sidebar/mud-sidebar';
export { MudSidebarGroup } from './components/mud-sidebar/mud-sidebar-group';
export { MudSidebarItem } from './components/mud-sidebar/mud-sidebar-item';
export type { SidebarItemSelectDetail, SidebarItemToggleDetail } from './components/mud-sidebar/mud-sidebar.types';

export { MudHeader } from './components/mud-header/mud-header';
export { MudHeaderNavItem } from './components/mud-header/mud-header-nav-item';
export { MudHeaderMegaMenu } from './components/mud-header/mud-header-mega-menu';
export { MudHeaderServicesMenu } from './components/mud-header/mud-header-services-menu';
export { MudHeaderMobile } from './components/mud-header/mud-header-mobile';
export { HEADER_DEFAULT_LANGUAGES } from './components/mud-header/mud-header.types';
export type {
  HeaderLanguage,
  HeaderLanguageChangeDetail,
  HeaderNavSelectDetail,
  HeaderNavToggleDetail,
  MegaMenuItem,
  MegaMenuColumn,
  HeaderMegaMenuSelectDetail,
  ServicePlatform,
  HeaderServiceSelectDetail,
} from './components/mud-header/mud-header.types';
