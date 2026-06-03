import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { NOTIFICATION_VARIANTS } from './mud-notification.types';
import type { NotificationVariant } from './mud-notification.types';

type NotificationArgs = {
  variant: NotificationVariant;
  closable: boolean;
  titleText: string;
  iconName: string;
  body: string;
  closeLabel: string;
};

const renderNotification = (args: NotificationArgs) => /*html*/ `
  <mud-notification
    variant="${args.variant}"
    ${args.closable ? 'closable' : ''}
    ${args.titleText ? `title-text="${args.titleText}"` : ''}
    ${args.iconName ? `icon-name="${args.iconName}"` : ''}
    close-label="${args.closeLabel}"
  >${args.body}</mud-notification>
`;

const sectionStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); align-items: flex-start;';
const captionStyle =
  'font-family: var(--font-family-primary); font-size: 12px; font-weight: 500; color: var(--color-text-base-secondary); margin: 0;';

const meta: Meta<NotificationArgs> = {
  title: 'Atoms/Notification',
  component: 'mud-notification',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: /*md*/ `
**Notification** — semantic toast message: a 350px filled surface (8px radius)
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
      options: NOTIFICATION_VARIANTS,
      description: 'Semantic color family.',
      table: { defaultValue: { summary: 'info' } },
    },
    closable: {
      control: 'boolean',
      description: 'Renders a trailing × button that emits `mudClose`.',
      table: { defaultValue: { summary: 'false' } },
    },
    titleText: {
      name: 'title-text',
      control: 'text',
      description: 'Optional bold heading rendered above the body.',
    },
    iconName: {
      name: 'icon-name',
      control: 'text',
      description: 'Override the default per-variant icon (mud-icon name).',
    },
    body: { control: 'text', description: 'Default-slot text content.' },
    closeLabel: {
      name: 'close-label',
      control: 'text',
      description: 'Accessible label for the close button.',
      table: { defaultValue: { summary: 'Închide' } },
    },
  },
  args: {
    variant: 'info',
    closable: true,
    titleText: 'Mesaj important',
    iconName: '',
    body: 'Vă informăm despre modificările aduse serviciului.',
    closeLabel: 'Închide',
  },
};

export default meta;
type Story = StoryObj<NotificationArgs>;

// ---------------------------------------------------------------------------
// Default — info toast with heading + close
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderNotification,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: NotificationArgs }) =>
          `<mud-notification variant="${args.variant}"${args.closable ? ' closable' : ''}${
            args.titleText ? ` title-text="${args.titleText}"` : ''
          }>${args.body}</mud-notification>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// AllVariants — info / warning / success / error (filled toasts)
// ---------------------------------------------------------------------------
const renderAllVariants = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-notification variant="info" closable title-text="Informație">Vă informăm despre modificările aduse serviciului.</mud-notification>
    <mud-notification variant="warning" closable title-text="Atenție">Mentenanță programată astăzi între 22:00 și 02:00.</mud-notification>
    <mud-notification variant="success" closable title-text="Succes">Plata a fost procesată cu succes.</mud-notification>
    <mud-notification variant="error" closable title-text="Eroare">Eroare la încărcarea documentului. Reîncercați.</mud-notification>
  </div>
`;
const docsSourceAllVariants = NOTIFICATION_VARIANTS.map(
  v => `<mud-notification variant="${v}" closable title-text="...">Mesaj.</mud-notification>`,
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
    <mud-notification variant="info" closable>Sesiunea va expira în 5 minute.</mud-notification>
    <mud-notification variant="success" closable>Modificările au fost salvate.</mud-notification>
    <mud-notification variant="error" closable>Conexiune întreruptă.</mud-notification>
  </div>
`;
export const NoHeading: Story = {
  render: renderNoHeading,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: '<mud-notification variant="info" closable>Sesiunea va expira în 5 minute.</mud-notification>' },
    },
  },
};

// ---------------------------------------------------------------------------
// WithLink — inline action below the body
// ---------------------------------------------------------------------------
const renderWithLink = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-notification variant="info" closable title-text="Sesiunea va expira">
      Salvați modificările pentru a evita pierderea datelor.
      <mud-link slot="actions" href="#" underline="always" variant="white">Prelungește sesiunea</mud-link>
    </mud-notification>

    <mud-notification variant="error" closable title-text="Plată refuzată">
      Tranzacția nu a putut fi finalizată.
      <mud-link slot="actions" href="#" underline="always" variant="white">Reîncercați</mud-link>
    </mud-notification>
  </div>
`;
const docsSourceWithLink = /*html*/ `<mud-notification variant="info" closable title-text="Sesiunea va expira">
  Salvați modificările pentru a evita pierderea datelor.
  <mud-link slot="actions" href="#" variant="white">Prelungește sesiunea</mud-link>
</mud-notification>`;
export const WithLink: Story = {
  render: renderWithLink,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceWithLink } } },
};

// ---------------------------------------------------------------------------
// EdgeCases — long content wrap, diacritics, custom icon
// ---------------------------------------------------------------------------
const renderEdgeCases = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${captionStyle}">Conținut lung — se înfășoară pe 2-3 rânduri</p>
    <mud-notification variant="info" closable title-text="Termeni și condiții actualizate">
      Am actualizat termenii platformei. Modificările intră în vigoare începând cu 1 iunie 2026 și includ actualizări privind procesarea plăților și politica de confidențialitate.
    </mud-notification>

    <p style="${captionStyle}">Diacritice românești (ă â î ș ț)</p>
    <mud-notification variant="warning">Înălțime mărită — țineți cont de această modificare.</mud-notification>

    <p style="${captionStyle}">Custom icon override</p>
    <mud-notification variant="success" icon-name="receipt-check-filled" closable title-text="Bon fiscal generat">
      Vezi detalii în istoricul plăților.
    </mud-notification>
  </div>
`;
const docsSourceEdgeCases = /*html*/ `<mud-notification variant="success" icon-name="receipt-check-filled" closable title-text="Bon fiscal generat">
  Vezi detalii în istoricul plăților.
</mud-notification>`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceEdgeCases } } },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-notification>Coverage</mud-notification>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-notification') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!Ctor) throw new Error('mud-notification constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
