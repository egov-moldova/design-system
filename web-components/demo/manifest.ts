// Single source of truth for the demo playground's structure.
//
// Drives both the table of contents (index.html, rendered by main.ts) and the injected
// per-page header (back link + prev/next within a category). Add a component by
// dropping its `pages/<category>/<tag>.html` file and appending the tag here.

export type ComponentEntry = {
  /** Custom-element tag, e.g. `cor-button`. Also the page filename. */
  tag: string;
  /** Optional one-line blurb shown under the link in the table of contents. */
  blurb?: string;
};

export type Category = {
  /** URL slug + folder name under `pages/`. */
  slug: string;
  /** Human title shown as the table of contents group heading. */
  title: string;
  components: ComponentEntry[];
};

export const CATEGORIES: Category[] = [
  {
    slug: 'foundations',
    title: 'Foundations',
    components: [
      { tag: 'cor-spinner', blurb: 'Loading indicator — sizes × variants' },
      { tag: 'cor-icon', blurb: 'SVG icon glyphs — sizes, colors, states' },
    ],
  },
  {
    slug: 'actions',
    title: 'Actions',
    components: [
      { tag: 'cor-button', blurb: 'Primary action — variants × appearances × sizes' },
      { tag: 'cor-button-group', blurb: 'Grouped buttons — horizontal / vertical' },
      { tag: 'cor-service-button', blurb: 'e-Gov service CTA with logomark' },
      { tag: 'cor-link', blurb: 'Inline / standalone hyperlink' },
      { tag: 'cor-chip', blurb: 'Filter / input chip' },
    ],
  },
  {
    slug: 'text-inputs',
    title: 'Form — text inputs',
    components: [
      { tag: 'cor-input', blurb: 'Single-line text field' },
      { tag: 'cor-textarea', blurb: 'Multi-line text field' },
      { tag: 'cor-numeric-input', blurb: 'Stepper numeric field' },
      { tag: 'cor-search-input-rectangular', blurb: 'Rectangular search field' },
      { tag: 'cor-search-input-circular', blurb: 'Pill-shaped search field' },
      { tag: 'cor-input-chip', blurb: 'Tokenised multi-value input' },
    ],
  },
  {
    slug: 'selection',
    title: 'Form — selection',
    components: [
      { tag: 'cor-checkbox', blurb: 'Checkbox + indeterminate' },
      { tag: 'cor-radio', blurb: 'Radio group member' },
      { tag: 'cor-switch', blurb: 'On/off toggle' },
      { tag: 'cor-select-input', blurb: 'Dropdown select (options prop)' },
      { tag: 'cor-segmented-control', blurb: 'Segmented selector (segments prop)' },
      { tag: 'cor-date-input', blurb: 'Masked date field' },
      { tag: 'cor-phone-input', blurb: 'Country-aware phone field' },
    ],
  },
  {
    slug: 'feedback',
    title: 'Feedback & display',
    components: [
      { tag: 'cor-avatar', blurb: 'Photo / initials / icon avatar' },
      { tag: 'cor-badge', blurb: 'Numbered / dot badge' },
      { tag: 'cor-tag', blurb: 'Status / info tag' },
      { tag: 'cor-separator', blurb: 'Divider — h/v, sizes, label' },
      { tag: 'cor-notification', blurb: 'Inline notification banner' },
      { tag: 'cor-tooltip', blurb: 'Hover / focus / manual tooltip' },
      { tag: 'cor-progress-tracker', blurb: 'Stepped progress (steps prop)' },
    ],
  },
  {
    slug: 'navigation',
    title: 'Navigation & containers',
    components: [
      { tag: 'cor-accordion', blurb: 'Collapsible panels (items prop / slotted)' },
      { tag: 'cor-breadcrumb', blurb: 'Breadcrumb trail (items prop / slotted)' },
      { tag: 'cor-tabs', blurb: 'Tabbed navigation (tabs prop / slotted)' },
      { tag: 'cor-pagination', blurb: 'Page navigation' },
      { tag: 'cor-modal', blurb: 'Dialog overlay (trigger-driven)' },
    ],
  },
  {
    slug: 'molecules',
    title: 'Molecules',
    components: [
      { tag: 'cor-logo', blurb: 'Service logomarks (LogoName union)' },
      { tag: 'cor-file-input', blurb: 'Drag-and-drop upload zone' },
      { tag: 'cor-file-item', blurb: 'Upload row — uploaded/uploading/success/error' },
      { tag: 'cor-cookie-banner', blurb: 'GDPR consent banner' },
    ],
  },
  {
    slug: 'data',
    title: 'Data & layout',
    components: [
      { tag: 'cor-table', blurb: 'Data table (columns/rows props, cell slots)' },
      { tag: 'cor-receipt', blurb: 'Transaction receipt molecule' },
      { tag: 'cor-footer', blurb: 'Site footer (evo / simple)' },
      { tag: 'cor-date-picker', blurb: 'Calendar — single / range / multi' },
    ],
  },
];

/**
 * Path-prefix back to `dist-demo/` from the currently-rendered page.
 *
 * The TOC (`index.html`) is at the root, so it needs `./`. Per-component pages
 * (`pages/<cat>/<tag>.html`) are two levels deep, so they need `../../`.
 * Using a relative prefix (rather than an absolute `/…`) lets the same build
 * work from any base path AND from `file://`.
 */
function rootPrefix(): string {
  return document.body?.dataset?.component ? '../../' : './';
}

/** Resolve the page URL for a component tag within a category. */
export function pagePath(categorySlug: string, tag: string): string {
  return `${rootPrefix()}pages/${categorySlug}/${tag}.html`;
}

/** Resolve the URL of the table-of-contents page. */
export function indexPath(): string {
  return `${rootPrefix()}index.html`;
}

/** Flattened lookup: tag → { category, index-in-category }. */
export type Located = { category: Category; index: number };

export function locate(tag: string): Located | undefined {
  for (const category of CATEGORIES) {
    const index = category.components.findIndex(c => c.tag === tag);
    if (index !== -1) return { category, index };
  }
  return undefined;
}
