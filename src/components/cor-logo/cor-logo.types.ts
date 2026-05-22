/**
 * Exhaustive union of logo asset identifiers — each entry is the filename
 * (without `.svg`) of an asset in `src/components/cor-logo/assets/`.
 *
 * Format follows the convention `{service}-logo-{layout}`:
 *   - service: mcloud · mconnect · mdelivery · mdocs · mlearn · mlog · mnotify · mpass · mpay · mpower · msign
 *   - layout : logomark-only · with-name · with-verb · with-long-name-medium · with-long-name-large
 *
 * Adding a new logo: drop the SVG into `./assets/` and append its bare name
 * here — no other change required.
 */
export const LOGO_NAMES = [
  'mcloud-logo-logomark-only',
  'mcloud-logo-with-long-name-large',
  'mcloud-logo-with-long-name-medium',
  'mcloud-logo-with-name',
  'mcloud-logo-with-verb',
  'mconnect-logo-logomark-only',
  'mconnect-logo-with-long-name-large',
  'mconnect-logo-with-long-name-medium',
  'mconnect-logo-with-name',
  'mconnect-logo-with-verb',
  'mdelivery-logo-logomark-only',
  'mdelivery-logo-with-long-name-large',
  'mdelivery-logo-with-long-name-medium',
  'mdelivery-logo-with-name',
  'mdelivery-logo-with-verb',
  'mdocs-logo-logomark-only',
  'mdocs-logo-with-long-name-large',
  'mdocs-logo-with-long-name-medium',
  'mdocs-logo-with-name',
  'mdocs-logo-with-verb',
  'mlearn-logo-logomark-only',
  'mlearn-logo-with-long-name-large',
  'mlearn-logo-with-long-name-medium',
  'mlearn-logo-with-name',
  'mlearn-logo-with-verb',
  'mlog-logo-logomark-only',
  'mlog-logo-with-long-name-large',
  'mlog-logo-with-long-name-medium',
  'mlog-logo-with-name',
  'mlog-logo-with-verb',
  'mnotify-logo-logomark-only',
  'mnotify-logo-with-long-name-large',
  'mnotify-logo-with-long-name-medium',
  'mnotify-logo-with-name',
  'mnotify-logo-with-verb',
  'mpass-logo-logomark-only',
  'mpass-logo-with-long-name-large',
  'mpass-logo-with-long-name-medium',
  'mpass-logo-with-name',
  'mpass-logo-with-verb',
  'mpay-logo-logomark-only',
  'mpay-logo-with-long-name-large',
  'mpay-logo-with-long-name-medium',
  'mpay-logo-with-name',
  'mpay-logo-with-verb',
  'mpower-logo-logomark-only',
  'mpower-logo-with-long-name-large',
  'mpower-logo-with-long-name-medium',
  'mpower-logo-with-name',
  'mpower-logo-with-verb',
  'msign-logo-logomark-only',
  'msign-logo-with-long-name-large',
  'msign-logo-with-long-name-medium',
  'msign-logo-with-name',
  'msign-logo-with-verb',
] as const;

export type LogoName = (typeof LOGO_NAMES)[number];
