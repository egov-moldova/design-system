import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TOAST_VARIANTS } from './mud-toast.types';
import type { ToastVariant } from './mud-toast.types';
import { ICON_NAMES } from '../mud-icon/mud-icon.types';
import type { IconName } from '../mud-icon/mud-icon.types';

type ToastArgs = {
  variant: ToastVariant;
  closable: boolean;
  titleText: string;
  iconName: IconName | '';
  body: string;
  locale: string;
  closeLabel: string;
};

const renderToast = (args: ToastArgs) => /*html*/ `
  <mud-toast
    variant="${args.variant}"
    closable="${args.closable}"
    ${args.titleText ? `title-text="${args.titleText}"` : ''}
    ${args.iconName ? `icon-name="${args.iconName}"` : ''}
    ${args.locale ? `locale="${args.locale}"` : ''}
    ${args.closeLabel ? `close-label="${args.closeLabel}"` : ''}
  >${args.body}</mud-toast>
`;

const sectionStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); align-items: flex-start;';
const captionStyle =
  'font-family: var(--font-family-primary); font-size: 12px; font-weight: 500; color: var(--color-text-base-secondary); margin: 0;';

const meta: Meta<ToastArgs> = {
  title: 'Components/Toast',
  component: 'mud-toast',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: /*md*/ `
**Toast** — semantic toast message: a 350px filled surface (8px radius)
with a leading icon, an optional bold heading, the body, an optional inline
link/action, and an optional close button.

\`variant\` selects the color family — \`info\`, \`warning\`, \`success\`, or
\`error\` — each a filled toast with its own icon.

Live-region routing follows WCAG status/alert conventions: \`warning\` and
\`error\` use \`role="alert"\` + \`aria-live="assertive"\`; \`info\` and
\`success\` use \`role="status"\` + \`aria-live="polite"\`.

Closable toasts emit \`mudClose\` when the user activates the trailing × button;
the consumer is responsible for animating out and removing the element.
        `.trim(),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: TOAST_VARIANTS,
      description: 'Semantic color family.',
      table: { defaultValue: { summary: 'info' } },
    },
    closable: {
      control: 'boolean',
      description:
        'Renders a trailing × button that emits `mudClose`. Set `false` for a toast the user cannot dismiss manually.',
      table: { defaultValue: { summary: 'true' } },
    },
    titleText: {
      name: 'title-text',
      control: 'text',
      description: 'Optional bold heading rendered above the body.',
    },
    iconName: {
      name: 'icon-name',
      control: 'select',
      options: ['', ...ICON_NAMES],
      description: 'Override the default per-variant icon (mud-icon name). Empty keeps the variant default.',
    },
    body: { control: 'text', description: 'Default-slot text content.' },
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
    closable: true,
    titleText: 'Important message',
    iconName: '',
    body: 'We are letting you know about the changes made to the service.',
    locale: '',
    closeLabel: '',
  },
};

export default meta;
type Story = StoryObj<ToastArgs>;

// ---------------------------------------------------------------------------
// Default — info toast with heading + close
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderToast,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: ToastArgs }) =>
          `<mud-toast variant="${args.variant}"${args.closable ? '' : ' closable="false"'}${
            args.titleText ? ` title-text="${args.titleText}"` : ''
          }>${args.body}</mud-toast>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// AllVariants — info / warning / success / error (filled toasts)
// ---------------------------------------------------------------------------
const renderAllVariants = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-toast variant="info" closable title-text="Information">We are letting you know about the changes made to the service.</mud-toast>
    <mud-toast variant="warning" closable title-text="Attention">Scheduled maintenance today between 22:00 and 02:00.</mud-toast>
    <mud-toast variant="success" closable title-text="Success">The payment was processed successfully.</mud-toast>
    <mud-toast variant="error" closable title-text="Error">Error uploading the document. Try again.</mud-toast>
  </div>
`;
const docsSourceAllVariants = TOAST_VARIANTS.map(
  v => `<mud-toast variant="${v}" closable title-text="...">Message.</mud-toast>`,
).join('\n');
export const AllVariants: Story = {
  render: renderAllVariants,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllVariants } } },
};

// ---------------------------------------------------------------------------
// NoHeading — body-only compact toast
// ---------------------------------------------------------------------------
const renderNoHeading = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-toast variant="info" closable>Your session will expire in 5 minutes.</mud-toast>
    <mud-toast variant="success" closable>The changes were saved.</mud-toast>
    <mud-toast variant="error" closable>Connection lost.</mud-toast>
  </div>
`;
export const NoHeading: Story = {
  render: renderNoHeading,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: '<mud-toast variant="info">Your session will expire in 5 minutes.</mud-toast>' },
    },
  },
};

// ---------------------------------------------------------------------------
// NotClosable — closable="false" (auto-dismiss-only toast, no × button)
// ---------------------------------------------------------------------------
const renderNotClosable = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-toast variant="success" closable="false" title-text="Saved">The changes were saved.</mud-toast>
    <mud-toast variant="info" closable="false">Syncing data…</mud-toast>
  </div>
`;
export const NotClosable: Story = {
  render: renderNotClosable,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: '<mud-toast variant="success" closable="false" title-text="Saved">The changes were saved.</mud-toast>',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// WithLink — inline action below the body
// ---------------------------------------------------------------------------
const renderWithLink = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-toast variant="info" closable title-text="Session about to expire">
      Save your changes to avoid losing data.
      <mud-link slot="actions" href="#" underline="always" variant="white">Extend session</mud-link>
    </mud-toast>

    <mud-toast variant="error" closable title-text="Payment declined">
      The transaction could not be completed.
      <mud-link slot="actions" href="#" underline="always" variant="white">Try again</mud-link>
    </mud-toast>
  </div>
`;
const docsSourceWithLink = /*html*/ `<mud-toast variant="info" closable title-text="Session about to expire">
  Save your changes to avoid losing data.
  <mud-link slot="actions" href="#" variant="white">Extend session</mud-link>
</mud-toast>`;
export const WithLink: Story = {
  render: renderWithLink,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceWithLink } } },
};

// ---------------------------------------------------------------------------
// EdgeCases — long content wrap, diacritics, custom icon
// ---------------------------------------------------------------------------
const renderEdgeCases = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${captionStyle}">Long content — wraps onto 2-3 lines</p>
    <mud-toast variant="info" closable title-text="Updated terms and conditions">
      We have updated the platform terms. The changes take effect on 1 June 2026 and include updates to payment processing and the privacy policy.
    </mud-toast>

    <p style="${captionStyle}">Accented characters (é ü ñ)</p>
    <mud-toast variant="warning">Accented characters (é ü ñ) render correctly.</mud-toast>

    <p style="${captionStyle}">Custom icon override</p>
    <mud-toast variant="success" icon-name="receipt-check" closable title-text="Receipt generated">
      See details in the payment history.
    </mud-toast>
  </div>
`;
const docsSourceEdgeCases = /*html*/ `<mud-toast variant="success" icon-name="receipt-check" closable title-text="Receipt generated">
  See details in the payment history.
</mud-toast>`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceEdgeCases } } },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-toast>Coverage</mud-toast>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-toast') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('mud-toast constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
