import defaultManifest from './assets/icons.manifest.json';
import type { IconName } from './icon-names';

export { ICON_NAMES, isIconName, type IconName } from './icon-names';

export const ICON_SIZES = [16, 20, 24, 32] as const;

export type IconSize = (typeof ICON_SIZES)[number];

export const ICON_VARIANTS = ['outlined', 'filled'] as const;

export type IconVariant = (typeof ICON_VARIANTS)[number];

/** Generated from the asset files, so the list is never empty in practice. */
export type IconManifestEntry = { variants: readonly IconVariant[] };

/**
 * Keyed by `IconName` and PARTIAL on purpose: without the optional value the
 * index access types as a present entry, and the `if (!entry)` guard every
 * lookup relies on compiles as dead code.
 */
export type IconManifest = Partial<Record<IconName, IconManifestEntry>>;

/**
 * Whether an icon is drawn in a given style. 142 of the 174 icons are outlined
 * only, so a caller that wants "filled where one exists" asks here instead of
 * requesting a drawing `mud-icon` would have to warn about.
 */
export function hasIconVariant(name: IconName | undefined, variant: IconVariant): boolean {
  if (!name) return false;
  return (defaultManifest as IconManifest)[name]?.variants.includes(variant) ?? false;
}
