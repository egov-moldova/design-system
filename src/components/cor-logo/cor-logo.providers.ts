import { getAssetPath } from '@stencil/core';

import { sanitizeSvgToElement } from '../../utils/svg-sanitizer';
import type { LogoName, LogoVariant } from './cor-logo.types';

export function resolveLogoAssetUrl(name: LogoName, variant: LogoVariant): string {
  return getAssetPath(`./assets/${name}-logo-${variant}.svg`);
}

const svgCache = new Map<string, Promise<Element | null>>();

export function fetchLogoSvg(url: string): Promise<Element | null> {
  if (svgCache.has(url)) return svgCache.get(url)!;

  const p = fetch(url)
    .then(r => (r.ok ? r.text() : null))
    .then(t => (t ? sanitizeSvgToElement(t) : null))
    .catch(() => null);

  svgCache.set(url, p);
  return p;
}

/** Exposed for tests — clears the module-level SVG fetch cache. */
export function clearLogoSvgCache(): void {
  svgCache.clear();
}
