import { getAssetPath } from '@stencil/core';

import { sanitizeSvgToElement } from '../../utils/svg-sanitizer';
import defaultManifest from './assets/icons.manifest.json';
import { ICON_SIZES, type IconManifest, type IconSize } from './cor-icon.types';

type ResolveResult = {
  url: string;
  resolvedSize: IconSize;
};

// Stencil's `getAssetPath` throws `TypeError: Failed to construct 'URL'` when
// invoked from a context where the component's base URL hasn't been registered
// — e.g. vitest browser-mode with `stencilVitestPlugin` (customelement compile)
// or any host that loads components outside the lazy bundle. The sync throw
// escapes `resolveIconAsset`, bubbles up through `loadSvg` /
// `componentWillLoad`, and Stencil's lifecycle reporter prints it to stderr.
// Catch it here so the icon degrades to "asset unresolved" without noise.
function tryAssetPath(relativePath: string): string | null {
  try {
    return getAssetPath(relativePath);
  } catch {
    return null;
  }
}

export function resolveIconAsset(
  name: string,
  size: IconSize,
  manifest: IconManifest = defaultManifest as IconManifest,
): ResolveResult | undefined {
  const entry = manifest[name];
  if (!entry) return undefined;

  const sizes = entry.sizes as readonly IconSize[];

  const pick = (resolved: IconSize): ResolveResult | undefined => {
    const url = tryAssetPath(`./assets/${resolved}/${name}.svg`);
    return url ? { url, resolvedSize: resolved } : undefined;
  };

  if (sizes.includes(size)) {
    return pick(size);
  }

  // Prefer a larger size (scaling down stays sharp).
  const larger = ICON_SIZES.filter(s => s > size && sizes.includes(s)).sort((a, b) => a - b);
  if (larger.length) {
    return pick(larger[0]);
  }

  // Fall back to the largest available smaller size.
  const smaller = ICON_SIZES.filter(s => s < size && sizes.includes(s)).sort((a, b) => b - a);
  if (smaller.length) {
    return pick(smaller[0]);
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
  // Evict null results so a transient failure (network blip, 404 during deploy)
  // doesn't permanently lock subsequent consumers out of retrying.
  p.then(result => {
    if (result === null) svgCache.delete(url);
  });
  return p;
}

/** Exposed for tests — clears the module-level SVG fetch cache. */
export function clearIconSvgCache(): void {
  svgCache.clear();
}
