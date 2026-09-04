// Single source of truth for the demo playground's structure.
//
// Drives both the table of contents (index.html, rendered by main.ts) and the injected
// per-page header (back link + prev/next within a category). Add a component by
// dropping its `pages/<category>/<tag>.html` file and appending the tag here.

export type ComponentEntry = {
  /** Custom-element tag, e.g. `mud-button`. Also the page filename. */
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
      { tag: 'mud-spinner', blurb: 'Loading indicator — sizes × variants' },
      { tag: 'mud-icon', blurb: 'SVG icon glyphs — sizes, colors, states' },
    ],
  },
  {
    slug: 'actions',
    title: 'Actions',
    components: [
      { tag: 'mud-button', blurb: 'Primary action — variants × appearances × sizes' },
      { tag: 'mud-button-group', blurb: 'Grouped buttons — horizontal / vertical' },
      { tag: 'mud-service-button', blurb: 'e-Gov service CTA with logomark' },
      { tag: 'mud-link', blurb: 'Inline / standalone hyperlink' },
      { tag: 'mud-chip', blurb: 'Filter / input chip' },
    ],
  },
  {
    slug: 'text-inputs',
    title: 'Form — text inputs',
    components: [
      { tag: 'mud-text-input', blurb: 'Single-line text field' },
      { tag: 'mud-textarea', blurb: 'Multi-line text field' },
      { tag: 'mud-numeric-input', blurb: 'Stepper numeric field' },
      { tag: 'mud-search-input', blurb: 'Search field (rectangular / circular)' },
      { tag: 'mud-input-chip', blurb: 'Tokenised multi-value input' },
    ],
  },
  {
    slug: 'selection',
    title: 'Form — selection',
    components: [
      { tag: 'mud-checkbox', blurb: 'Checkbox + indeterminate' },
      { tag: 'mud-radio', blurb: 'Radio group member' },
      { tag: 'mud-switch', blurb: 'On/off toggle' },
      { tag: 'mud-select-input', blurb: 'Dropdown select (options prop)' },
      { tag: 'mud-segmented-control', blurb: 'Segmented selector (segments prop)' },
      { tag: 'mud-date-input', blurb: 'Masked date field' },
      { tag: 'mud-phone-input', blurb: 'Country-aware phone field' },
    ],
  },
  {
    slug: 'feedback',
    title: 'Feedback & display',
    components: [
      { tag: 'mud-avatar', blurb: 'Photo / initials / icon avatar' },
      { tag: 'mud-badge', blurb: 'Numbered / dot badge' },
      { tag: 'mud-tag', blurb: 'Status / info tag' },
      { tag: 'mud-separator', blurb: 'Divider — h/v, sizes, label' },
      { tag: 'mud-notification', blurb: 'Inline notification banner' },
      { tag: 'mud-tooltip', blurb: 'Hover / focus / manual tooltip' },
      { tag: 'mud-progress-tracker', blurb: 'Stepped progress (steps prop)' },
    ],
  },
  {
    slug: 'navigation',
    title: 'Navigation & containers',
    components: [
      { tag: 'mud-accordion', blurb: 'Collapsible panels (items prop / slotted)' },
      { tag: 'mud-breadcrumb', blurb: 'Breadcrumb trail (items prop / slotted)' },
      { tag: 'mud-tabs', blurb: 'Tabbed navigation (tabs prop / slotted)' },
      { tag: 'mud-pagination', blurb: 'Page navigation' },
      { tag: 'mud-modal', blurb: 'Dialog overlay (trigger-driven)' },
    ],
  },
  {
    slug: 'molecules',
    title: 'Molecules',
    components: [
      { tag: 'mud-logo', blurb: 'Service logomarks (LogoName union)' },
      { tag: 'mud-file-input', blurb: 'Drag-and-drop upload zone' },
      { tag: 'mud-file-item', blurb: 'Upload row — uploaded/uploading/success/error' },
      { tag: 'mud-cookie-banner', blurb: 'GDPR consent banner' },
    ],
  },
  {
    slug: 'data',
    title: 'Data & layout',
    components: [
      { tag: 'mud-table', blurb: 'Data table (columns/rows props, cell slots)' },
      { tag: 'mud-receipt', blurb: 'Transaction receipt molecule' },
      { tag: 'mud-footer', blurb: 'Site footer (evo / simple)' },
      { tag: 'mud-date-picker', blurb: 'Calendar — single / range / multi' },
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
