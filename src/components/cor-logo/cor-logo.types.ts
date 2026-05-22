export const LOGO_NAMES = [
  'mcloud',
  'mconnect',
  'mdelivery',
  'mdocs',
  'mlearn',
  'mlog',
  'mnotify',
  'mpass',
  'mpay',
  'mpower',
  'msign',
] as const;

export type LogoName = (typeof LOGO_NAMES)[number];

export const LOGO_VARIANTS = [
  'logomark-only',
  'with-name',
  'with-verb',
  'with-long-name-medium',
  'with-long-name-large',
] as const;

export type LogoVariant = (typeof LOGO_VARIANTS)[number];
