import type { IconName } from './icon-names';

export { FILLED_ICON_NAMES, hasIconVariant, ICON_NAMES, isIconName, type IconName } from './icon-names';

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

/** Runtime guard for a `variant` that arrives untyped (HTML attribute, JSON data). */
export function isIconVariant(value: unknown): value is IconVariant {
  return typeof value === 'string' && (ICON_VARIANTS as readonly string[]).includes(value);
}
