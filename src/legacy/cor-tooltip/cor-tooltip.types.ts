import type { TooltipPlacement } from './cor-tooltip.enums';

export interface TooltipPosition {
  top: number;
  left: number;
  actualPlacement: TooltipPlacement;
  arrowOffset: number;
}
