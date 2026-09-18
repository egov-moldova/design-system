/**
 * Fixed-width segment masks for typed fields — a date (`DD/MM/YYYY`), a date
 * range (`DD/MM/YYYY - DD/MM/YYYY`), a time (`HH:MM`). The field accepts digits
 * only; the mask places them into segments and writes the separators in.
 *
 * Pure functions: the components own the segment-level rules (a day is 01–31,
 * an hour 00–23) and pass them in through `acceptsSegment`.
 */

export interface MaskSegment<K extends string = string> {
  /** Segment name; also its placeholder text in `pattern` (`DD`, `HH`, …). */
  readonly kind: K;
  readonly length: number;
}

export interface SegmentMask<K extends string = string> {
  readonly segments: readonly MaskSegment<K>[];
  /** Separator after each segment but the last: `separators.length === segments.length - 1`. */
  readonly separators: readonly string[];
  /** The whole placeholder, e.g. `DD/MM/YYYY`. */
  readonly pattern: string;
  /** Index in a display value where each segment starts. */
  readonly starts: readonly number[];
}

export function createSegmentMask<K extends string>(
  segments: readonly MaskSegment<K>[],
  separators: readonly string[],
): SegmentMask<K> {
  if (separators.length !== segments.length - 1) {
    throw new Error(`segment mask: ${segments.length} segments need ${segments.length - 1} separators`);
  }
  const starts: number[] = [];
  let pattern = '';
  segments.forEach((segment, i) => {
    starts.push(pattern.length);
    pattern += segment.kind + (separators[i] ?? '');
  });
  return { segments, separators, pattern, starts };
}

export interface ApplyMaskOptions {
  /**
   * Also write the separator after a segment that the typed digits just
   * completed, so the caret moves on to the next segment. Off while deleting,
   * so a separator can be removed.
   */
  trailingSeparator?: boolean;
  /**
   * Whether a complete segment is valid. A trailing separator is only written
   * after a valid one, so the caret stays on a segment the user must correct.
   */
  acceptsSegment?: (index: number, digits: string) => boolean;
}

/** Re-format raw input: keep the digits the mask has room for and write the separators in. */
export function applyMask(mask: SegmentMask, raw: string, options: ApplyMaskOptions = {}): string {
  const { trailingSeparator = false, acceptsSegment = () => true } = options;
  const capacity = mask.segments.reduce((sum, s) => sum + s.length, 0);
  const digits = (raw ?? '').replace(/\D/g, '').slice(0, capacity);
  let out = '';
  let cursor = 0;
  for (let i = 0; i < mask.segments.length; i++) {
    const segment = mask.segments[i];
    const slice = digits.slice(cursor, cursor + segment.length);
    if (slice.length === 0) break;
    out += slice;
    cursor += segment.length;
    const isLast = i === mask.segments.length - 1;
    const complete = slice.length === segment.length;
    if (complete && !isLast && (cursor < digits.length || (trailingSeparator && acceptsSegment(i, slice)))) {
      out += mask.separators[i];
    }
  }
  return out;
}

/** Index of the segment a caret position falls in, or `null` past the end. */
export function segmentIndexAt(mask: SegmentMask, position: number): number | null {
  for (let i = 0; i < mask.segments.length; i++) {
    if (position <= mask.starts[i] + mask.segments[i].length) return i;
  }
  return null;
}

/** The text of each segment in a display value; partial or empty where not typed yet. */
export function readSegments(mask: SegmentMask, display: string): string[] {
  return mask.segments.map((segment, i) => display.slice(mask.starts[i], mask.starts[i] + segment.length));
}

/**
 * Split a typed prefix into the part typed and the rest of the pattern, for a
 * ghost hint that keeps the unfilled segments visible after the caret.
 */
export function ghostParts(mask: SegmentMask, value: string): { typed: string; remaining: string } {
  if (value.length >= mask.pattern.length) return { typed: value, remaining: '' };
  return { typed: value, remaining: mask.pattern.slice(value.length) };
}

/** The key that types a separator: its visible character (`/`, `:`, `-` for ` - `). */
export function separatorKey(separator: string): string {
  return separator.trim().charAt(0) || separator.charAt(0);
}

/**
 * Pressing a segment's separator key while that segment is part-typed
 * completes it with leading zeros and moves on (`3` + `/` → `03/`).
 * Returns the segment index and the new value, or `null` when the key does not
 * apply (the value ends on a boundary, or the key is not that separator).
 */
export function padSegmentOnSeparator(
  mask: SegmentMask,
  value: string,
  key: string,
): { index: number; value: string } | null {
  if (value.length === 0) return null;
  const index = segmentIndexAt(mask, value.length);
  if (index === null || index >= mask.segments.length - 1) return null;
  const start = mask.starts[index];
  const typed = value.slice(start);
  const { length } = mask.segments[index];
  if (typed.length === 0 || typed.length >= length || !/^\d+$/.test(typed)) return null;
  if (key !== separatorKey(mask.separators[index])) return null;
  return { index, value: value.slice(0, start) + typed.padStart(length, '0') + mask.separators[index] };
}
