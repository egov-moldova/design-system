import { ICON_SIZES, type IconRegistry, type IconSize } from './cor-icon.types';
import { iconRegistry } from './assets/icons.registry';

type ResolveResult = {
  svg: string;
  /** The size whose SVG was actually used. May differ from the requested size if a fallback was applied. */
  resolvedSize: IconSize;
};

export function resolveIcon(
  name: string,
  size: IconSize,
  registry: IconRegistry = iconRegistry,
): ResolveResult | undefined {
  const entry = registry[name];
  if (!entry) return undefined;

  const direct = entry.svgs[size];
  if (direct) return { svg: direct, resolvedSize: size };

  // Prefer a larger size (scaling down stays sharp).
  const larger = ICON_SIZES.filter(s => s > size && entry.sizes.includes(s)).sort((a, b) => a - b);
  if (larger.length) {
    const svg = entry.svgs[larger[0]];
    if (svg) return { svg, resolvedSize: larger[0] };
  }

  // Fall back to the largest available smaller size.
  const smaller = ICON_SIZES.filter(s => s < size && entry.sizes.includes(s)).sort((a, b) => b - a);
  if (smaller.length) {
    const svg = entry.svgs[smaller[0]];
    if (svg) return { svg, resolvedSize: smaller[0] };
  }

  return undefined;
}
