import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { BANNER_EMPHASES, BANNER_VARIANTS } from './mud-banner.types';
import type { BannerEmphasis, BannerVariant } from './mud-banner.types';
import { ICON_NAMES } from '../mud-icon/mud-icon.types';
import type { IconName } from '../mud-icon/mud-icon.types';
import { attr, text } from '../../utils/story-docs-source';

type BannerArgs = {
  variant: BannerVariant;
  emphasis: BannerEmphasis;
  dismissible: boolean;
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
    ${args.iconName ? `icon-name="${args.iconName}"` : ''}
    ${args.locale ? `locale="${args.locale}"` : ''}
    ${args.closeLabel ? `close-label="${args.closeLabel}"` : ''}
  >${args.body}</mud-banner>
`;

const sectionStyle = 'display: flex; flex-direction: column; gap: var(--spacing-16); align-items: stretch;';
const MESSAGE = 'Scheduled maintenance today. Some services may be temporarily unavailable.';

// ---------------------------------------------------------------------------
// Docs-source helpers — consumer markup for the "Show code" panel: no wrapper
// div, no inline styles, attributes at their component default omitted.
// ---------------------------------------------------------------------------

const docsSourceDefault = (args: BannerArgs) => {
  const attrs = [
    args.variant !== 'info' ? `variant="${args.variant}"` : '',
    args.emphasis !== 'subtle' ? `emphasis="${args.emphasis}"` : '',
    args.dismissible ? 'dismissible' : '',
    args.iconName ? `icon-name="${attr(args.iconName)}"` : '',
    args.locale ? `locale="${attr(args.locale)}"` : '',
    args.closeLabel ? `close-label="${attr(args.closeLabel)}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const open = attrs ? `<mud-banner ${attrs}>` : '<mud-banner>';
  return `${open}${text(args.body)}</mud-banner>`;
};

const docsSourceAllVariants = /*html*/ `<mud-banner variant="info" emphasis="strong" dismissible>${MESSAGE}</mud-banner>
<mud-banner variant="warning" emphasis="strong" dismissible>${MESSAGE}</mud-banner>
<mud-banner variant="error" emphasis="strong" dismissible>${MESSAGE}</mud-banner>
<mud-banner variant="info" emphasis="subtle" dismissible>${MESSAGE}</mud-banner>
<mud-banner variant="warning" emphasis="subtle" dismissible>${MESSAGE}</mud-banner>
<mud-banner variant="error" emphasis="subtle" dismissible>${MESSAGE}</mud-banner>`;

const docsSourceWithActions = /*html*/ `<mud-banner variant="info" emphasis="strong" dismissible>
  ${MESSAGE}
  <mud-link slot="actions" href="#" size="md" variant="white">Details</mud-link>
</mud-banner>
<mud-banner variant="warning" emphasis="subtle" dismissible>
  ${MESSAGE}
  <mud-link slot="actions" href="#" size="md">Details</mud-link>
</mud-banner>`;

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
export const Default: Story = {
  render: renderBanner,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: BannerArgs }) => docsSourceDefault(args),
      },
    },
  },
};

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
export const AllVariants: Story = {
  render: renderAllVariants,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllVariants } } },
};

// ---------------------------------------------------------------------------
// WithActions — the inline "Click here" affordance, a mud-link in the actions slot
// ---------------------------------------------------------------------------
const renderWithActions = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-banner variant="info" emphasis="strong" dismissible>
      ${MESSAGE}
      <mud-link slot="actions" href="#" size="md" variant="white">Details</mud-link>
    </mud-banner>
    <mud-banner variant="warning" emphasis="subtle" dismissible>
      ${MESSAGE}
      <mud-link slot="actions" href="#" size="md">Details</mud-link>
    </mud-banner>
  </div>
`;
export const WithActions: Story = {
  render: renderWithActions,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Figma\'s "Click here" is the link component (Primary, 16). Put a `mud-link` in the `actions` slot; on `emphasis="strong"` use `variant="white"`. The `link-text` / `link-href` props are deprecated.',
      },
      source: { code: docsSourceWithActions },
    },
  },
};

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
