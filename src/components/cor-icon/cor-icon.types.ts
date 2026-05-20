export const ICON_SIZES = [12, 16, 20, 24] as const;

export type IconSize = (typeof ICON_SIZES)[number];

export type IconManifestEntry = { sizes: readonly IconSize[] };

export type IconManifest = Record<string, IconManifestEntry>;
