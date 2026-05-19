export const TEXT_TAGS = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

export const TEXT_COLOR_TOKENS = [
  'color-neutral-text-default',
  'color-neutral-text-weak',
  'color-neutral-text-weaker',
  'color-neutral-text-weakest',
  'color-neutral-text-inverted',
  'color-neutral-text-inverted-weak',
  'color-neutral-text-inverted-weaker',
  'color-neutral-text-inverted-weakest',
  'color-neutral-text-inverted-static',
  'color-neutral-text-static',
  'color-primary-text-default',
  'color-primary-text-weak',
  'color-primary-text-weaker',
  'color-primary-text-weakest',
  'color-primary-text-inverted',
  'color-primary-text-inverted-weak',
  'color-primary-text-inverted-weakest',
  'color-secondary-text-default',
  'color-secondary-text-weak',
  'color-secondary-text-weakest',
  'color-system-warning-text',
  'color-system-warning-text-inverted',
  'color-system-success-text',
  'color-system-success-text-inverted',
  'color-system-error-text',
  'color-system-error-text-inverted',
  'color-system-info-text',
  'color-system-info-text-inverted',
] as const;

export type TextColorToken = (typeof TEXT_COLOR_TOKENS)[number];
