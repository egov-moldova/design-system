export const TOOLTIP_SIZES = ['sm', 'lg'] as const;
export const TOOLTIP_POSITIONS = ['top', 'bottom', 'left', 'right', 'auto'] as const;
export const TOOLTIP_VARIANTS = ['default', 'coach'] as const;
export const TOOLTIP_TRIGGERS = ['hover', 'focus', 'manual'] as const;

export type TooltipSize = (typeof TOOLTIP_SIZES)[number];
export type TooltipPosition = (typeof TOOLTIP_POSITIONS)[number];
export type TooltipVariant = (typeof TOOLTIP_VARIANTS)[number];
export type TooltipTrigger = (typeof TOOLTIP_TRIGGERS)[number];

export type TooltipResolvedPosition = Exclude<TooltipPosition, 'auto'>;

export type TooltipCloseReason = 'blur' | 'escape' | 'close-button' | 'click-outside';

export interface TooltipCloseEventDetail {
  reason: TooltipCloseReason;
}

export interface TooltipGeometry {
  top: number;
  left: number;
  resolvedPosition: TooltipResolvedPosition;
  arrowOffset: number;
}

export const OPPOSITE_POSITION: Record<TooltipResolvedPosition, TooltipResolvedPosition> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};
