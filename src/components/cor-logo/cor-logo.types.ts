export const LOGO_NAMES = ['mpay', 'mpass', 'msign', 'mpower', 'mdelivery'] as const;

export type LogoName = (typeof LOGO_NAMES)[number];

export const LOGO_VARIANTS = [
  'logomark-only',
  'with-name',
  'with-verb',
  'with-long-name-medium',
  'with-long-name-large',
] as const;

export type LogoVariant = (typeof LOGO_VARIANTS)[number];

export type LogoTextSpec = {
  /** Service name displayed beside the logomark (e.g. "mpay"). */
  name: string;
  /** Verb used in the `with-verb` variant (e.g. "plătește"). */
  verb: string;
  /** Two-line description for the `with-long-name-*` variants. */
  description: readonly [string, string];
};

export type LogoManifest = Record<LogoName, LogoTextSpec>;
