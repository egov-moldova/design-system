import { getAssetPath } from '@stencil/core';

import { sanitizeSvgToElement } from '../../utils/svg-sanitizer';
import defaultManifest from './assets/icons.manifest.json';
import { ICON_SIZES, type IconManifest, type IconSize } from './cor-icon.types';

type ResolveResult = {
  url: string;
  resolvedSize: IconSize;
};

export function resolveIconAsset(
  name: string,
  size: IconSize,
  manifest: IconManifest = defaultManifest as IconManifest,
): ResolveResult | undefined {
  const entry = manifest[name];
  if (!entry) return undefined;

  const sizes = entry.sizes as readonly IconSize[];

  if (sizes.includes(size)) {
    return { url: getAssetPath(`./assets/${size}/${name}.svg`), resolvedSize: size };
  }

  // Prefer a larger size (scaling down stays sharp).
  const larger = ICON_SIZES.filter(s => s > size && sizes.includes(s)).sort((a, b) => a - b);
  if (larger.length) {
    const resolved = larger[0];
    return { url: getAssetPath(`./assets/${resolved}/${name}.svg`), resolvedSize: resolved };
  }

  // Fall back to the largest available smaller size.
  const smaller = ICON_SIZES.filter(s => s < size && sizes.includes(s)).sort((a, b) => b - a);
  if (smaller.length) {
    const resolved = smaller[0];
    return { url: getAssetPath(`./assets/${resolved}/${name}.svg`), resolvedSize: resolved };
  }

  return undefined;
}

const svgCache = new Map<string, Promise<Element | null>>();

export function fetchIconSvg(url: string): Promise<Element | null> {
  if (svgCache.has(url)) return svgCache.get(url)!;

  const p = fetch(url)
    .then(r => (r.ok ? r.text() : null))
    .then(t => (t ? sanitizeSvgToElement(t) : null))
    .catch(() => null);

  svgCache.set(url, p);
  return p;
}

/** Exposed for tests — clears the module-level SVG fetch cache. */
export function clearIconSvgCache(): void {
  svgCache.clear();
}
