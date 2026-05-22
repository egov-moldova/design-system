import { getAssetPath } from '@stencil/core';

import { sanitizeSvgToElement } from '../../utils/svg-sanitizer';
import type { LogoName } from './cor-logo.types';

export function resolveLogoAssetUrl(name: LogoName): string {
  return getAssetPath(`./assets/${name}.svg`);
}

const svgCache = new Map<string, Promise<Element | null>>();

export function fetchLogoSvg(url: string): Promise<Element | null> {
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
export function clearLogoSvgCache(): void {
  svgCache.clear();
}
