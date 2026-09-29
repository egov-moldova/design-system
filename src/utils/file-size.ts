import { formatNumber } from './locale';

/** `formatFileSize`'s number options — a stable object identity shared across every call. */
const FILE_SIZE_NUMBER_OPTIONS: Intl.NumberFormatOptions = { useGrouping: false, maximumFractionDigits: 1 };

/**
 * `bytes` as a human-readable size in the component's resolved locale (`1,5 MB` under
 * `ro-MD`, `1.5 MB` under `en-US`): repeatedly divided by 1024 while it stays at or above it
 * (capped at `units`'s last entry), then formatted with `formatNumber`'s cached
 * `Intl.NumberFormat` (`useGrouping: false`, `maximumFractionDigits: 1`).
 *
 * Rounding to that one displayed decimal can itself push the value up to the next unit's
 * threshold even though the raw value stayed under it (1023.96 KB → `1 MB`, never `1024.0
 * KB`), so the promotion check re-runs against the ROUNDED value before formatting.
 *
 * @param units Unit labels, ordered smallest to largest (bytes, KB, MB, GB, …).
 */
export const formatFileSize = (
  bytes: number,
  host: Element,
  locale: string | null | undefined,
  units: readonly string[],
): string => {
  let value = bytes;
  let unitIndex = 0;
  while (Math.abs(value) >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = Math.round(value * 10) / 10;
  if (rounded >= 1024 && unitIndex < units.length - 1) {
    value = rounded / 1024;
    unitIndex += 1;
  }
  const formatted = formatNumber(host, locale, value, FILE_SIZE_NUMBER_OPTIONS);
  return `${formatted} ${units[unitIndex]}`;
};
