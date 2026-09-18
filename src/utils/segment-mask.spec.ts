import { describe, it, expect } from '@stencil/vitest';

import {
  applyMask,
  createSegmentMask,
  ghostParts,
  padSegmentOnSeparator,
  readSegments,
  segmentIndexAt,
  separatorKey,
} from './segment-mask';

const date = [
  { kind: 'DD', length: 2 },
  { kind: 'MM', length: 2 },
  { kind: 'YYYY', length: 4 },
] as const;
const DATE = createSegmentMask(date, ['/', '/']);
const RANGE = createSegmentMask([...date, ...date], ['/', '/', ' - ', '/', '/']);
const TIME = createSegmentMask(
  [
    { kind: 'HH', length: 2 },
    { kind: 'MM', length: 2 },
  ],
  [':'],
);

describe('createSegmentMask', () => {
  it('builds the pattern and segment offsets', () => {
    expect(DATE.pattern).toBe('DD/MM/YYYY');
    expect(DATE.starts).toEqual([0, 3, 6]);
    expect(RANGE.pattern).toBe('DD/MM/YYYY - DD/MM/YYYY');
    expect(RANGE.starts).toEqual([0, 3, 6, 13, 16, 19]);
    expect(TIME.pattern).toBe('HH:MM');
  });

  it('rejects a separator count that does not fit the segments', () => {
    expect(() => createSegmentMask(date, ['/'])).toThrow(/3 segments need 2 separators/);
  });
});

describe('applyMask', () => {
  it('drops non-digits and writes separators between typed segments', () => {
    expect(applyMask(DATE, '1a5-04 2025')).toBe('15/04/2025');
    expect(applyMask(TIME, '0930')).toBe('09:30');
  });

  it('caps the digits at the mask capacity', () => {
    expect(applyMask(DATE, '150420259999')).toBe('15/04/2025');
  });

  it('writes a trailing separator only when asked and the segment is accepted', () => {
    expect(applyMask(DATE, '15')).toBe('15');
    expect(applyMask(DATE, '15', { trailingSeparator: true })).toBe('15/');
    expect(applyMask(DATE, '35', { trailingSeparator: true, acceptsSegment: (_, d) => Number(d) <= 31 })).toBe('35');
  });

  it('writes a multi-character separator between the dates of a range', () => {
    expect(applyMask(RANGE, '18012025', { trailingSeparator: true })).toBe('18/01/2025 - ');
    expect(applyMask(RANGE, '1801202522012025')).toBe('18/01/2025 - 22/01/2025');
  });

  it('never writes a separator after the last segment', () => {
    expect(applyMask(TIME, '0930', { trailingSeparator: true })).toBe('09:30');
  });

  it('treats a missing raw value as empty', () => {
    expect(applyMask(DATE, undefined as unknown as string)).toBe('');
  });
});

describe('segmentIndexAt', () => {
  it('maps caret positions to segments', () => {
    expect(segmentIndexAt(DATE, 0)).toBe(0);
    expect(segmentIndexAt(DATE, 2)).toBe(0);
    expect(segmentIndexAt(DATE, 3)).toBe(1);
    expect(segmentIndexAt(DATE, 10)).toBe(2);
    expect(segmentIndexAt(DATE, 11)).toBeNull();
    expect(segmentIndexAt(RANGE, 14)).toBe(3);
  });
});

describe('readSegments', () => {
  it('slices complete, partial and untyped segments', () => {
    expect(readSegments(RANGE, '18/01/2025 - 2')).toEqual(['18', '01', '2025', '2', '', '']);
  });
});

describe('ghostParts', () => {
  it('returns the untyped rest of the pattern', () => {
    expect(ghostParts(DATE, '')).toEqual({ typed: '', remaining: 'DD/MM/YYYY' });
    expect(ghostParts(DATE, '15/0')).toEqual({ typed: '15/0', remaining: 'M/YYYY' });
    expect(ghostParts(TIME, '09:30')).toEqual({ typed: '09:30', remaining: '' });
  });
});

describe('separatorKey', () => {
  it('uses the visible character of the separator', () => {
    expect(separatorKey('/')).toBe('/');
    expect(separatorKey(' - ')).toBe('-');
    expect(separatorKey(' ')).toBe(' ');
  });
});

describe('padSegmentOnSeparator', () => {
  it('pads a part-typed segment and adds its separator', () => {
    expect(padSegmentOnSeparator(DATE, '3', '/')).toEqual({ index: 0, value: '03/' });
    expect(padSegmentOnSeparator(DATE, '03/4', '/')).toEqual({ index: 1, value: '03/04/' });
    expect(padSegmentOnSeparator(TIME, '9', ':')).toEqual({ index: 0, value: '09:' });
  });

  it('uses the separator that follows the segment', () => {
    expect(padSegmentOnSeparator(RANGE, '18/01/2025 - 3', '/')).toEqual({ index: 3, value: '18/01/2025 - 03/' });
    expect(padSegmentOnSeparator(DATE, '3', ':')).toBeNull();
  });

  it('does nothing on a segment boundary, for the last segment, or for an empty value', () => {
    expect(padSegmentOnSeparator(DATE, '', '/')).toBeNull();
    expect(padSegmentOnSeparator(DATE, '15', '/')).toBeNull();
    expect(padSegmentOnSeparator(DATE, '15/', '/')).toBeNull();
    expect(padSegmentOnSeparator(DATE, '15/04/202', '/')).toBeNull();
    expect(padSegmentOnSeparator(TIME, '09:3', ':')).toBeNull();
  });

  it('ignores a value that runs past the mask', () => {
    expect(padSegmentOnSeparator(TIME, '09:301', ':')).toBeNull();
  });
});
