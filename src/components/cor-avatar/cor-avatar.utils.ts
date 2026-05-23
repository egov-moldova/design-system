import type { AvatarSize } from './cor-avatar.types';

/**
 * Maps the avatar `size` rung to the icon glyph size in CSS pixels.
 *
 * The avatar slot is a circle whose diameter is the rung value
 * (24 / 32 / 40 / 48 / 72 px); the glyph inside follows the design system's
 * icon scale (12 / 16 / 20 / 24 / 32 px). `xl` is clamped to 24 because
 * `cor-icon` does not yet ship a 32-px variant — the icon visually centres
 * inside the larger circle.
 */
export const ICON_SIZE_FOR: Record<AvatarSize, 12 | 16 | 20 | 24> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 24,
};

/**
 * Derives initials from a person's full name. Returns at most two characters,
 * uppercased. Returns an empty string for blank input.
 *
 * The split happens on whitespace or hyphens so compound first names
 * (`Maria-Andreea Pop`) collapse to the first letter of the first segment
 * plus the first letter of the last segment.
 *
 * @example
 *   deriveInitials('Ion Popescu')          // 'IP'
 *   deriveInitials('Maria-Andreea Pop')    // 'MP'
 *   deriveInitials('Ștefan')               // 'Ș'
 *   deriveInitials('')                     // ''
 */
export function deriveInitials(name: string | undefined): string {
  if (!name) return '';
  const parts = name
    .trim()
    .split(/[\s-]+/u)
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    return (parts[0][0] ?? '').toUpperCase();
  }
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1][0] ?? '';
  return (first + last).toUpperCase();
}
