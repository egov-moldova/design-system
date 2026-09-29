import { describe, expect, it } from '@stencil/vitest';

import { formatFileSize } from './file-size';

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

describe('formatFileSize', () => {
  const host = document.createElement('div');

  it('formats an exact fraction with the locale decimal separator', () => {
    // 1_572_864 B = 1.5 MB exactly.
    expect(formatFileSize(1572864, host, 'ro-MD', UNITS)).toBe('1,5 MB');
    expect(formatFileSize(1572864, host, 'en-US', UNITS)).toBe('1.5 MB');
  });

  it('rounds to one decimal without promoting when the rounded value stays under 1024', () => {
    // 1_047_962 B / 1024 = 1023.400390625 KB, rounds to 1023.4 KB.
    expect(formatFileSize(1047962, host, 'ro-MD', UNITS)).toBe('1023,4 KB');
  });

  it('promotes to the next unit when rounding pushes the value up to 1024 (1023.96 KB -> 1 MB)', () => {
    // 1_048_535 B / 1024 = 1023.9599609375 KB, which rounds to 1024.0 KB.
    expect(formatFileSize(1048535, host, 'ro-MD', UNITS)).toBe('1 MB');
  });
});
