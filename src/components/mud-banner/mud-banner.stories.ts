import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { BANNER_EMPHASES, BANNER_VARIANTS } from './mud-banner.types';
import type { BannerEmphasis, BannerVariant } from './mud-banner.types';

type BannerArgs = {
  variant: BannerVariant;
  emphasis: BannerEmphasis;
  dismissible: boolean;
  linkText: string;
  linkHref: string;
  iconName: string;
  body: string;
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
    close-label="${args.closeLabel}"
  >${args.body}</mud-banner>
`;

const sectionStyle = 'display: flex; flex-direction: column; gap: var(--spacing-16); align-items: stretch;';
const MESSAGE = 'Mentenanță programată astăzi. Unele servicii pot fi temporar indisponibile.';

const meta: Meta<BannerArgs> = {
  title: 'Atoms/Banner',
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
    iconName: { name: 'icon-name', control: 'text', description: 'Override the default per-variant icon.' },
    body: { control: 'text', description: 'Default-slot message text.' },
    closeLabel: {
      name: 'close-label',
      control: 'text',
      description: 'Accessible label for the close button.',
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
    closeLabel: 'Închide',
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
    <mud-banner variant="info" emphasis="strong" dismissible link-text="Detalii" link-href="#">${MESSAGE}</mud-banner>
    <mud-banner variant="warning" emphasis="subtle" dismissible link-text="Detalii" link-href="#">${MESSAGE}</mud-banner>
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
