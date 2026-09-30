import type { LogoName } from '../mud-logo/mud-logo.types';

export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
export const BUTTON_VARIANTS = ['primary', 'secondary', 'strict', 'neutral', 'destructive'] as const;
export const BUTTON_APPEARANCES = ['filled', 'outlined', 'text'] as const;
export const BUTTON_SHAPES = ['rectangular', 'circular'] as const;
export const BUTTON_TYPES = ['button', 'submit', 'reset'] as const;
/** M-services whose logomark the `badge` prop draws (`<service>-logo-logomark-only`). */
export const BUTTON_BADGES = [
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

export type ButtonSize = (typeof BUTTON_SIZES)[number];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonAppearance = (typeof BUTTON_APPEARANCES)[number];
export type ButtonShape = (typeof BUTTON_SHAPES)[number];
export type ButtonType = (typeof BUTTON_TYPES)[number];
export type ButtonBadge = (typeof BUTTON_BADGES)[number];

type AssertTrue<T extends true> = T;
/** Fails to compile if a badge has no `-logo-logomark-only` asset in mud-logo. */
export type ButtonBadgeLogoCheck = AssertTrue<`${ButtonBadge}-logo-logomark-only` extends LogoName ? true : false>;
