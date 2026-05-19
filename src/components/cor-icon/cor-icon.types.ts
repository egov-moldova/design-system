export const ICON_SIZES = [12, 16, 20, 24] as const;

export type IconSize = (typeof ICON_SIZES)[number];

export type IconRegistryEntry = {
  /** Sizes for which an optimized SVG exists. */
  sizes: readonly IconSize[];
  /** SVG markup keyed by size. */
  svgs: Partial<Record<IconSize, string>>;
};

export type IconRegistry = Record<string, IconRegistryEntry>;
