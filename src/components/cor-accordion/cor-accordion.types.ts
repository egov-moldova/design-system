/**
 * Coordination mode for child `cor-accordion-item` elements.
 * - `multiple` (default) — items expand/collapse independently
 * - `single` — opening one item collapses the others (radio-style)
 */
export const ACCORDION_MODES = ['multiple', 'single'] as const;
export type AccordionMode = (typeof ACCORDION_MODES)[number];

/**
 * Visual treatment for the accordion container.
 * - `default` — flat surface, dividers between items
 * - `trail-sites` — open item gets brand-tint background (per Figma "Trail Sites" pattern)
 */
export const ACCORDION_APPEARANCES = ['default', 'trail-sites'] as const;
export type AccordionAppearance = (typeof ACCORDION_APPEARANCES)[number];

/**
 * Item size rung — controls header height, font size, icon size, padding.
 * Independent of `breakpoint` (which is media-query driven). Use `size` when
 * you need a compact accordion regardless of viewport — sidebars, dense
 * panels, modal-embedded disclosures.
 */
export const ACCORDION_SIZES = ['md', 'sm'] as const;
export type AccordionSize = (typeof ACCORDION_SIZES)[number];

/**
 * Trigger-icon placement relative to the header content.
 * - `right` (default) — FAQ-style; trigger sits at the trailing edge
 * - `left` — sidebar-nav style; chevron leads, content indented
 */
export const ACCORDION_ICON_POSITIONS = ['left', 'right'] as const;
export type AccordionIconPosition = (typeof ACCORDION_ICON_POSITIONS)[number];

/**
 * Declarative shape of a single accordion item, used when consumers pass the
 * `items` prop instead of slotting `<cor-accordion-item>` children.
 */
export type AccordionItemDescriptor = {
  /** Stable identifier used by `corChange.openIds`. Auto-generated if omitted. */
  id?: string;
  /** Header text. */
  heading: string;
  /** Secondary text below the heading. */
  supportingText?: string;
  /** Panel body text. For rich content, slot `<cor-accordion-item>` children instead. */
  content?: string;
  /** Initial open state. The accordion still owns the active set after first render. */
  open?: boolean;
  /** Marks the item non-interactive. */
  disabled?: boolean;
};

/**
 * Payload dispatched by `corChange` whenever the open set changes.
 * `openIds` is the full active set after the change.
 */
export type AccordionChangeDetail = {
  openIds: string[];
};
