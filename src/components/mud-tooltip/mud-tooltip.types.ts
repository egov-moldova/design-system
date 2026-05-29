export const TOOLTIP_SIZES = ['sm', 'lg'] as const;

// 12 placements (mirrors legacy `TooltipPlacement` enum) + 'auto'. 'auto' is a
// convenience alias for `top` with `flipFallback` ON regardless of the prop.
export const TOOLTIP_POSITIONS = [
  'top',
  'top-left',
  'top-right',
  'bottom',
  'bottom-left',
  'bottom-right',
  'left',
  'left-top',
  'left-bottom',
  'right',
  'right-top',
  'right-bottom',
  'auto',
] as const;

export const TOOLTIP_VARIANTS = ['default', 'coach'] as const;
export const TOOLTIP_TRIGGERS = ['hover', 'click', 'focus', 'manual'] as const;

export type TooltipSize = (typeof TOOLTIP_SIZES)[number];
export type TooltipPosition = (typeof TOOLTIP_POSITIONS)[number];
export type TooltipVariant = (typeof TOOLTIP_VARIANTS)[number];
export type TooltipTrigger = (typeof TOOLTIP_TRIGGERS)[number];

export type TooltipResolvedPosition = Exclude<TooltipPosition, 'auto'>;
export type TooltipBaseSide = 'top' | 'bottom' | 'left' | 'right';
export type TooltipAlignment = 'start' | 'center' | 'end';

export type TooltipCloseReason = 'blur' | 'escape' | 'close-button' | 'click-outside' | 'click-trigger';

export interface TooltipCloseEventDetail {
  reason: TooltipCloseReason;
}

export interface TooltipGeometry {
  top: number;
  left: number;
  resolvedPosition: TooltipResolvedPosition;
  arrowOffset: number;
}

// Map every placement to its opposite for flipFallback. Aligned variants flip
// to the opposite base while keeping the same alignment.
export const OPPOSITE_POSITION: Record<TooltipResolvedPosition, TooltipResolvedPosition> = {
  'top': 'bottom',
  'top-left': 'bottom-left',
  'top-right': 'bottom-right',
  'bottom': 'top',
  'bottom-left': 'top-left',
  'bottom-right': 'top-right',
  'left': 'right',
  'left-top': 'right-top',
  'left-bottom': 'right-bottom',
  'right': 'left',
  'right-top': 'left-top',
  'right-bottom': 'left-bottom',
};

// Allowed slot element tags (mirrors legacy slot validation contract).
export const VALID_TRIGGER_TAGS: readonly string[] = [
  'button',
  'a',
  'span',
  'div',
  'mud-button',
  'mud-icon',
  'mud-link',
];
export const VALID_TITLE_TAGS: readonly string[] = ['span', 'strong', 'em', 'mud-icon'];
export const VALID_DESCRIPTION_TAGS: readonly string[] = ['span', 'p', 'div', 'mud-icon'];
