export { ICON_NAMES, isIconName, type IconName } from './icon-names';

export const ICON_SIZES = [16, 20, 24, 32] as const;

export type IconSize = (typeof ICON_SIZES)[number];

export const ICON_VARIANTS = ['outlined', 'filled'] as const;

export type IconVariant = (typeof ICON_VARIANTS)[number];

export type IconManifestEntry = { variants: readonly IconVariant[] };

export type IconManifest = Record<string, IconManifestEntry>;
