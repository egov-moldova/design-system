import type { Meta, StoryObj } from '@storybook/web-components-vite';

import {
  COOKIE_BANNER_DEFAULT_CATEGORIES,
  COOKIE_BANNER_POSITIONS,
  COOKIE_BANNER_VARIANTS,
} from './cor-cookie-banner.types';
import type { CookieBannerPosition, CookieBannerVariant } from './cor-cookie-banner.types';

type BannerArgs = {
  variant: CookieBannerVariant;
  expanded: boolean;
  position: CookieBannerPosition;
  titleText: string;
  body: string;
  acceptLabel: string;
  rejectLabel: string;
  manageLabel: string;
  saveLabel: string;
  privacyHref: string;
  privacyLabel: string;
};

const stageStyle =
  'padding: var(--spacing-32, 32px); background: var(--color-background-base-secondary, #f5f5f5); display: flex; justify-content: center; align-items: flex-end; min-block-size: 320px;';

const escapeAttr = (value: string): string => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const renderCookieBanner = (args: BannerArgs) => /*html*/ `
  <div style="${stageStyle}">
    <cor-cookie-banner
      variant="${args.variant}"
      ${args.expanded ? 'expanded' : ''}
      position="${args.position}"
      ${args.titleText ? `title-text="${escapeAttr(args.titleText)}"` : ''}
      ${args.body ? `body="${escapeAttr(args.body)}"` : ''}
      ${args.acceptLabel ? `accept-label="${escapeAttr(args.acceptLabel)}"` : ''}
      ${args.rejectLabel ? `reject-label="${escapeAttr(args.rejectLabel)}"` : ''}
      ${args.manageLabel ? `manage-label="${escapeAttr(args.manageLabel)}"` : ''}
      ${args.saveLabel ? `save-label="${escapeAttr(args.saveLabel)}"` : ''}
      ${args.privacyHref ? `privacy-href="${escapeAttr(args.privacyHref)}"` : ''}
      ${args.privacyLabel ? `privacy-label="${escapeAttr(args.privacyLabel)}"` : ''}
    ></cor-cookie-banner>
  </div>
`;

const meta: Meta<BannerArgs> = {
  title: 'Molecules/Cookie Banner',
  component: 'cor-cookie-banner',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: /*md*/ `
**Cookie banner** — GDPR consent surface (molecule).

A non-modal dialog (\`role="dialog" aria-modal="false"\`) anchored to the
bottom (or top) of the viewport. Romanian copy is the default; every label
is overridable via the public \`@Prop\` surface.

Two variants share one element:

- **\`simple\`** (default) — three CTAs (\`Personalizează\` / \`Refuză toate\`
  / \`Accept toate\`). \`Personalizează\` switches the banner to expanded
  mode.
- **\`detailed\`** — adds a category list (necessary / analytics / marketing
  by default) with per-row switches, plus a single \`Salvează preferințele\`
  CTA in the expanded state.

The banner emits four events: \`corAccept\` and \`corReject\` (with the
resulting consent payload), \`corExpand\` (collapsed → expanded transition),
and \`corSavePreferences\` (when the user confirms a custom selection). All
payloads include the \`{ categories: Record<string, boolean> }\` shape.

\`Escape\` collapses an expanded banner back to the compact view and emits
\`corDismiss\`.
        `.trim(),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: COOKIE_BANNER_VARIANTS,
      description: 'Layout flavour (simple = three CTAs, detailed = category list on expand).',
      table: { defaultValue: { summary: 'simple' } },
    },
    expanded: {
      control: 'boolean',
      description: 'Whether the banner is currently in the expanded (preferences) state.',
      table: { defaultValue: { summary: 'false' } },
    },
    position: {
      control: 'inline-radio',
      options: COOKIE_BANNER_POSITIONS,
      description: 'Edge of the viewport the banner is anchored to.',
      table: { defaultValue: { summary: 'bottom' } },
    },
    titleText: { name: 'title-text', control: 'text', description: 'Plain-text title (Romanian default).' },
    body: { control: 'text', description: 'Plain-text body copy (Romanian default).' },
    acceptLabel: { name: 'accept-label', control: 'text' },
    rejectLabel: { name: 'reject-label', control: 'text' },
    manageLabel: { name: 'manage-label', control: 'text' },
    saveLabel: { name: 'save-label', control: 'text' },
    privacyHref: { name: 'privacy-href', control: 'text', description: 'Href for the inline privacy-policy link.' },
    privacyLabel: { name: 'privacy-label', control: 'text' },
  },
  args: {
    variant: 'simple',
    expanded: false,
    position: 'bottom',
    titleText: '',
    body: '',
    acceptLabel: '',
    rejectLabel: '',
    manageLabel: '',
    saveLabel: '',
    privacyHref: '',
    privacyLabel: '',
  },
};

export default meta;
type Story = StoryObj<BannerArgs>;

// ---------------------------------------------------------------------------
// Default — simple, collapsed
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderCookieBanner,
};

// ---------------------------------------------------------------------------
// Detailed — collapsed (same compact footprint as simple)
// ---------------------------------------------------------------------------
export const Detailed: Story = {
  args: { variant: 'detailed' },
  render: renderCookieBanner,
};

// ---------------------------------------------------------------------------
// Expanded — detailed + expanded with default Romanian categories
// ---------------------------------------------------------------------------
export const Expanded: Story = {
  args: { variant: 'detailed', expanded: true },
  render: renderCookieBanner,
};

// ---------------------------------------------------------------------------
// TopPosition — anchored to the top of the viewport
// ---------------------------------------------------------------------------
export const TopPosition: Story = {
  args: { position: 'top' },
  render: (args: BannerArgs) => /*html*/ `
    <div style="${stageStyle} align-items: flex-start;">
      <cor-cookie-banner
        variant="${args.variant}"
        position="${args.position}"
        ${args.expanded ? 'expanded' : ''}
      ></cor-cookie-banner>
    </div>
  `,
};

// ---------------------------------------------------------------------------
// Mobile — narrow viewport (uses Storybook viewport config when available)
// ---------------------------------------------------------------------------
export const Mobile: Story = {
  args: { variant: 'detailed', expanded: true },
  parameters: {
    viewport: { defaultViewport: 'iphone14' },
    layout: 'fullscreen',
  },
  render: (args: BannerArgs) => /*html*/ `
    <div style="padding: 16px; background: var(--color-background-base-secondary, #f5f5f5); display: flex; justify-content: center; align-items: flex-end; min-block-size: 100vh; max-inline-size: 375px; margin: 0 auto;">
      <cor-cookie-banner
        variant="${args.variant}"
        ${args.expanded ? 'expanded' : ''}
        position="${args.position}"
        style="inline-size: 100%; max-inline-size: 359px;"
      ></cor-cookie-banner>
    </div>
  `,
};

// ---------------------------------------------------------------------------
// WithCustomCopy — Moldovan / Romanian-government tone overrides
// ---------------------------------------------------------------------------
export const WithCustomCopy: Story = {
  args: {
    titleText: 'Confidențialitatea ta este importantă',
    body: 'Folosim cookie-uri esențiale pentru a oferi serviciile platformei MPay și cookie-uri opționale pentru a îmbunătăți experiența ta.',
    acceptLabel: 'Sunt de acord',
    rejectLabel: 'Doar esențiale',
    manageLabel: 'Setări',
  },
  render: renderCookieBanner,
};

// ---------------------------------------------------------------------------
// WithPrivacyLink — inline link to policy
// ---------------------------------------------------------------------------
export const WithPrivacyLink: Story = {
  args: {
    privacyHref: 'https://mpay.gov.md/politica-confidentialitate',
    privacyLabel: 'Politica de confidențialitate',
  },
  render: renderCookieBanner,
};

// ---------------------------------------------------------------------------
// Programmatic categories — render once with a known payload, then expand
// ---------------------------------------------------------------------------
const customCategoriesScript = /*html*/ `
  <div id="cor-cookie-banner-custom-host" style="${stageStyle}">
    <cor-cookie-banner variant="detailed" expanded id="cor-cookie-banner-custom"></cor-cookie-banner>
  </div>
  <script>
    (function () {
      var el = document.getElementById('cor-cookie-banner-custom');
      if (!el) return;
      el.categories = ${JSON.stringify(COOKIE_BANNER_DEFAULT_CATEGORIES)};
    })();
  </script>
`;

export const WithCustomCategories: Story = {
  render: () => customCategoriesScript,
  parameters: { controls: { disable: true } },
};
