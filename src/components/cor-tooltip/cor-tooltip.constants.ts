import { TooltipPlacement } from './cor-tooltip.enums';
import tooltipTokens from '../../../tokens/core/components/tooltip.tokens.json';
import { parsePixelToken } from '../../utils/token-parser';

export const VALID_TRIGGER_TAGS = ['button', 'a', 'span', 'div', 'cor-button', 'cor-icon', 'cor-typography'];
export const VALID_TITLE_TAGS = ['cor-typography', 'cor-icon', 'span'];
export const VALID_DESCRIPTION_TAGS = ['cor-typography', 'cor-icon', 'span'];

export const OPPOSITE_PLACEMENT: Record<string, TooltipPlacement> = {
  [TooltipPlacement.TOP]: TooltipPlacement.BOTTOM,
  [TooltipPlacement.TOP_LEFT]: TooltipPlacement.BOTTOM_LEFT,
  [TooltipPlacement.TOP_RIGHT]: TooltipPlacement.BOTTOM_RIGHT,
  [TooltipPlacement.BOTTOM]: TooltipPlacement.TOP,
  [TooltipPlacement.BOTTOM_LEFT]: TooltipPlacement.TOP_LEFT,
  [TooltipPlacement.BOTTOM_RIGHT]: TooltipPlacement.TOP_RIGHT,
  [TooltipPlacement.LEFT]: TooltipPlacement.RIGHT,
  [TooltipPlacement.LEFT_TOP]: TooltipPlacement.RIGHT_TOP,
  [TooltipPlacement.LEFT_BOTTOM]: TooltipPlacement.RIGHT_BOTTOM,
  [TooltipPlacement.RIGHT]: TooltipPlacement.LEFT,
  [TooltipPlacement.RIGHT_TOP]: TooltipPlacement.LEFT_TOP,
  [TooltipPlacement.RIGHT_BOTTOM]: TooltipPlacement.LEFT_BOTTOM,
};

export const ARROW_SIZE = parsePixelToken(tooltipTokens.tooltip.arrow.size.$value);
export const ARROW_WIDTH = parsePixelToken(tooltipTokens.tooltip.arrow.width.$value);
export const TOOLTIP_BORDER_WIDTH = parsePixelToken(tooltipTokens.tooltip.borderWidth.$value);
export const ARROW_EDGE_MARGIN = parsePixelToken(tooltipTokens.tooltip.arrow.edge.margin.$value);
