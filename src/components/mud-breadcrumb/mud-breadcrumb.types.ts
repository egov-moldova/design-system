/**
 * Public shape of a single crumb when items are passed declaratively
 * via the `items` prop. Consumers can also build crumbs as nested
 * `<mud-breadcrumb-item>` children — the prop and slot paths are
 * mutually exclusive (prop wins when both are provided).
 */
export type BreadcrumbItem = {
  /** Visible label rendered as the crumb text and used for the accessible name. */
  label: string;
  /** Optional navigation target. When omitted, the crumb renders as plain text. */
  href?: string;
  /** Optional mud-icon name shown before the label (Figma "w/ leading-icon"). */
  iconStart?: string;
  /** When true, the crumb shows a spinner in place of the label. */
  loading?: boolean;
  /** When true, the crumb is rendered with the visited (magenta) color. */
  visited?: boolean;
  /** When true, the crumb is rendered as disabled (greyed out, not focusable). */
  disabled?: boolean;
  /** When true, marks the crumb as the active page (`aria-current="page"`). */
  active?: boolean;
};

/** Labels longer than this are truncated and wrapped in a tooltip showing the full text. */
export const BREADCRUMB_TRUNCATE_AT = 30;

/**
 * Emitted by `mud-breadcrumb` when any crumb is activated via click or keyboard.
 */
export type BreadcrumbSelectDetail = {
  /** Zero-based index in the rendered items array. */
  index: number;
  /** The crumb's label. */
  label: string;
  /** The crumb's href (if any). */
  href?: string;
  /** True when the activation came from the overflow menu. */
  fromOverflow: boolean;
};
