import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { BANNER_EMPHASES, BANNER_VARIANTS } from './mud-banner.types';
import type { BannerEmphasis, BannerVariant } from './mud-banner.types';
import { ICON_NAMES } from '../mud-icon/mud-icon.types';
import type { IconName } from '../mud-icon/mud-icon.types';

type BannerArgs = {
  variant: BannerVariant;
  emphasis: BannerEmphasis;
  dismissible: boolean;
  linkText: string;
  linkHref: string;
  iconName: IconName | '';
  body: string;
  locale: string;
  closeLabel: string;
};

const renderBanner = (args: BannerArgs) => /*html*/ `
  <mud-banner
    variant="${args.variant}"
    emphasis="${args.emphasis}"
    ${args.dismissible ? 'dismissible' : ''}
    ${args.linkText ? `link-text="${args.linkText}"` : ''}
    ${args.linkHref ? `link-href="${args.linkHref}"` : ''}
    ${args.iconName ? `icon-name="${args.iconName}"` : ''}
    ${args.locale ? `locale="${args.locale}"` : ''}
    ${args.closeLabel ? `close-label="${args.closeLabel}"` : ''}
  >${args.body}</mud-banner>
`;

const sectionStyle = 'display: flex; flex-direction: column; gap: var(--spacing-16); align-items: stretch;';
const MESSAGE = 'Scheduled maintenance today. Some services may be temporarily unavailable.';

const meta: Meta<BannerArgs> = {
  title: 'Components/Banner',
  component: 'mud-banner',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: /*md*/ `
**Banner** — a persistent, full-width, top-of-page system message (scheduled
maintenance, outages, announcements). It draws attention without blocking
interaction and stays visible until dismissed or resolved.

\`variant\` selects the color family — \`info\`, \`warning\`, or \`error\`
(no \`success\`). \`emphasis\` selects the surface — \`subtle\` (tinted) or
\`strong\` (filled, on-color foreground).

Live-region routing follows WCAG status/alert conventions: \`warning\` and
\`error\` use \`role="alert"\` + \`aria-live="assertive"\`; \`info\` uses
\`role="status"\` + \`aria-live="polite"\`.

Dismissible banners emit \`mudDismiss\` when the user activates the trailing ×
button; the consumer animates out and removes the element.
        `.trim(),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: BANNER_VARIANTS,
      description: 'Semantic color family.',
      table: { defaultValue: { summary: 'info' } },
    },
    emphasis: {
      control: 'inline-radio',
      options: BANNER_EMPHASES,
      description: 'Surface treatment: subtle (tinted) or strong (filled).',
      table: { defaultValue: { summary: 'subtle' } },
    },
    dismissible: {
      control: 'boolean',
      description: 'Renders a trailing × button that emits `mudDismiss`.',
      table: { defaultValue: { summary: 'false' } },
    },
    linkText: { name: 'link-text', control: 'text', description: 'Optional inline link text.' },
    linkHref: { name: 'link-href', control: 'text', description: 'Href for the inline link.' },
    iconName: {
      name: 'icon-name',
      control: 'select',
      options: ['', ...ICON_NAMES],
      description: 'Override the default per-variant icon. Empty keeps the variant default.',
    },
    body: { control: 'text', description: 'Default-slot message text.' },
    locale: {
      control: 'select',
      options: ['', 'ro-MD', 'en-US', 'ru-MD'],
      description: 'Language of the built-in copy. Unset follows the closest ancestor `lang`, else `ro-MD`.',
    },
    closeLabel: {
      name: 'close-label',
      control: 'text',
      description: "Accessible label for the close button. Overrides the locale's copy.",
      table: { defaultValue: { summary: 'Închide' } },
    },
  },
  args: {
    variant: 'info',
    emphasis: 'strong',
    dismissible: true,
    linkText: '',
    linkHref: '#',
    iconName: '',
    body: MESSAGE,
    locale: '',
    closeLabel: '',
  },
};

export default meta;
type Story = StoryObj<BannerArgs>;

// ---------------------------------------------------------------------------
// Default — interactive playground
// ---------------------------------------------------------------------------
export const Default: Story = { render: renderBanner };

// ---------------------------------------------------------------------------
// AllVariants — info / warning / error × strong / subtle
// ---------------------------------------------------------------------------
const renderAllVariants = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-banner variant="info" emphasis="strong" dismissible>${MESSAGE}</mud-banner>
    <mud-banner variant="warning" emphasis="strong" dismissible>${MESSAGE}</mud-banner>
    <mud-banner variant="error" emphasis="strong" dismissible>${MESSAGE}</mud-banner>
    <mud-banner variant="info" emphasis="subtle" dismissible>${MESSAGE}</mud-banner>
    <mud-banner variant="warning" emphasis="subtle" dismissible>${MESSAGE}</mud-banner>
    <mud-banner variant="error" emphasis="subtle" dismissible>${MESSAGE}</mud-banner>
  </div>
`;
export const AllVariants: Story = { render: renderAllVariants, parameters: { controls: { disable: true } } };

// ---------------------------------------------------------------------------
// WithLink — inline "Click here" affordance
// ---------------------------------------------------------------------------
const renderWithLink = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-banner variant="info" emphasis="strong" dismissible link-text="Details" link-href="#">${MESSAGE}</mud-banner>
    <mud-banner variant="warning" emphasis="subtle" dismissible link-text="Details" link-href="#">${MESSAGE}</mud-banner>
  </div>
`;
export const WithLink: Story = { render: renderWithLink, parameters: { controls: { disable: true } } };

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-banner>Coverage</mud-banner>`,
  parameters: { controls: { disable: true }, docs: { disable: true } },
  play: async () => {
    const Ctor = customElements.get('mud-banner') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('mud-banner constructor missing from registry');
    if (!new Ctor(false)) throw new Error('instance not constructed');
  },
};
