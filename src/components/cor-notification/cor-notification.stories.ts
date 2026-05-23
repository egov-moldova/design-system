import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { NOTIFICATION_STYLES, NOTIFICATION_VARIANTS } from './cor-notification.types';
import type { NotificationStyle, NotificationVariant } from './cor-notification.types';

type NotificationArgs = {
  variant: NotificationVariant;
  notificationStyle: NotificationStyle;
  closable: boolean;
  titleText: string;
  iconName: string;
  body: string;
  closeLabel: string;
};

const renderNotification = (args: NotificationArgs) => /*html*/ `
  <cor-notification
    variant="${args.variant}"
    notification-style="${args.notificationStyle}"
    ${args.closable ? 'closable' : ''}
    ${args.titleText ? `title-text="${args.titleText}"` : ''}
    ${args.iconName ? `icon-name="${args.iconName}"` : ''}
    close-label="${args.closeLabel}"
  >${args.body}</cor-notification>
`;

const sectionStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); inline-size: 720px; max-inline-size: 100%;';
const captionStyle =
  'font-family: var(--font-family-primary); font-size: 12px; font-weight: 500; color: var(--color-text-base-secondary); margin: 0;';

const meta: Meta<NotificationArgs> = {
  title: 'Atoms/Notification',
  component: 'cor-notification',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: /*md*/ `
**Notification** — semantic messaging banner. Use to communicate scheduled
maintenance, payment confirmations, validation errors, or session expirations.

\`variant\` selects the color family (info / positive / warning / danger / neutral);
\`notification-style\` toggles between the soft tinted background (\`subtle\`) and
the filled high-emphasis treatment (\`strong\`).

Live-region routing follows WCAG status/alert conventions: \`warning\` and
\`danger\` use \`role="alert"\` + \`aria-live="assertive"\`; everything else uses
\`role="status"\` + \`aria-live="polite"\`.

Closable banners emit \`corClose\` when the user activates the trailing × button;
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
    notificationStyle: {
      name: 'notification-style',
      control: 'inline-radio',
      options: NOTIFICATION_STYLES,
      description: 'Visual intensity (subtle = tinted, strong = filled).',
      table: { defaultValue: { summary: 'subtle' } },
    },
    closable: {
      control: 'boolean',
      description: 'Renders a trailing × button that emits `corClose`.',
      table: { defaultValue: { summary: 'false' } },
    },
    titleText: {
      name: 'title-text',
      control: 'text',
      description: 'Optional bold title rendered above the body.',
    },
    iconName: {
      name: 'icon-name',
      control: 'text',
      description: 'Override the default per-variant icon (cor-icon name).',
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
    notificationStyle: 'subtle',
    closable: false,
    titleText: '',
    iconName: '',
    body: 'Sesiunea va expira în 5 minute. Salvați modificările pentru a evita pierderea datelor.',
    closeLabel: 'Închide',
  },
};

export default meta;
type Story = StoryObj<NotificationArgs>;

// ---------------------------------------------------------------------------
// Default — info / subtle, no title, no close button
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderNotification,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: NotificationArgs }) =>
          `<cor-notification variant="${args.variant}" notification-style="${args.notificationStyle}"${
            args.closable ? ' closable' : ''
          }${args.titleText ? ` title-text="${args.titleText}"` : ''}>${args.body}</cor-notification>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// AllVariants — info / positive / warning / danger / neutral (subtle style)
// ---------------------------------------------------------------------------
const renderAllVariants = () => /*html*/ `
  <div style="${sectionStyle}">
    <cor-notification variant="info">Sesiunea va expira în 5 minute.</cor-notification>
    <cor-notification variant="positive">Plata a fost procesată cu succes.</cor-notification>
    <cor-notification variant="warning">Mentenanță programată astăzi între 22:00 și 02:00.</cor-notification>
    <cor-notification variant="danger">Eroare la încărcarea documentului. Reîncercați.</cor-notification>
    <cor-notification variant="neutral">Versiunea 2.3.0 este disponibilă.</cor-notification>
  </div>
`;
const docsSourceAllVariants = /*html*/ `<cor-notification variant="info">Sesiunea va expira în 5 minute.</cor-notification>
<cor-notification variant="positive">Plata a fost procesată cu succes.</cor-notification>
<cor-notification variant="warning">Mentenanță programată astăzi între 22:00 și 02:00.</cor-notification>
<cor-notification variant="danger">Eroare la încărcarea documentului. Reîncercați.</cor-notification>
<cor-notification variant="neutral">Versiunea 2.3.0 este disponibilă.</cor-notification>`;
export const AllVariants: Story = {
  render: renderAllVariants,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllVariants } } },
};

// ---------------------------------------------------------------------------
// AllStyles — subtle vs strong across every variant
// ---------------------------------------------------------------------------
const renderAllStyles = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${captionStyle}">Subtle (tinted background)</p>
    <cor-notification variant="info" notification-style="subtle">Sesiunea va expira în 5 minute.</cor-notification>
    <cor-notification variant="positive" notification-style="subtle">Plata a fost procesată cu succes.</cor-notification>
    <cor-notification variant="warning" notification-style="subtle">Mentenanță programată astăzi între 22:00 și 02:00.</cor-notification>
    <cor-notification variant="danger" notification-style="subtle">Eroare la încărcarea documentului.</cor-notification>
    <cor-notification variant="neutral" notification-style="subtle">Versiunea 2.3.0 este disponibilă.</cor-notification>

    <p style="${captionStyle}">Strong (filled background)</p>
    <cor-notification variant="info" notification-style="strong">Sesiunea va expira în 5 minute.</cor-notification>
    <cor-notification variant="positive" notification-style="strong">Plata a fost procesată cu succes.</cor-notification>
    <cor-notification variant="warning" notification-style="strong">Mentenanță programată astăzi între 22:00 și 02:00.</cor-notification>
    <cor-notification variant="danger" notification-style="strong">Eroare la încărcarea documentului.</cor-notification>
    <cor-notification variant="neutral" notification-style="strong">Versiunea 2.3.0 este disponibilă.</cor-notification>
  </div>
`;
const docsSourceAllStyles = /*html*/ `<!-- subtle -->
<cor-notification variant="info">Sesiunea va expira în 5 minute.</cor-notification>
<cor-notification variant="danger">Eroare la încărcarea documentului.</cor-notification>

<!-- strong -->
<cor-notification variant="info" notification-style="strong">Sesiunea va expira în 5 minute.</cor-notification>
<cor-notification variant="danger" notification-style="strong">Eroare la încărcarea documentului.</cor-notification>`;
export const AllStyles: Story = {
  render: renderAllStyles,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllStyles } } },
};

// ---------------------------------------------------------------------------
// Closable — every variant with the trailing × button
// ---------------------------------------------------------------------------
const renderClosable = () => /*html*/ `
  <div style="${sectionStyle}">
    <cor-notification variant="info" closable>Sesiunea va expira în 5 minute.</cor-notification>
    <cor-notification variant="positive" closable>Plata a fost procesată cu succes.</cor-notification>
    <cor-notification variant="warning" closable>Mentenanță programată astăzi între 22:00 și 02:00.</cor-notification>
    <cor-notification variant="danger" closable>Eroare la încărcarea documentului.</cor-notification>
    <cor-notification variant="neutral" closable>Versiunea 2.3.0 este disponibilă.</cor-notification>
  </div>
`;
const docsSourceClosable = /*html*/ `<cor-notification variant="info" closable>
  Sesiunea va expira în 5 minute.
</cor-notification>

<cor-notification variant="danger" closable close-label="Închide notificarea">
  Eroare la încărcarea documentului.
</cor-notification>`;
export const Closable: Story = {
  render: renderClosable,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceClosable } } },
};

// ---------------------------------------------------------------------------
// WithActions — inline cor-link or cor-button next to the body
// ---------------------------------------------------------------------------
const renderWithActions = () => /*html*/ `
  <div style="${sectionStyle}">
    <cor-notification variant="info" closable>
      Sesiunea va expira în 5 minute.
      <cor-link slot="actions" href="#" underline="always">Prelungește sesiunea</cor-link>
    </cor-notification>

    <cor-notification variant="warning" closable>
      Mentenanță programată astăzi între 22:00 și 02:00.
      <cor-link slot="actions" href="#" underline="always">Vezi detalii</cor-link>
    </cor-notification>

    <cor-notification variant="danger" notification-style="strong" closable>
      Plată refuzată de bancă.
      <cor-link slot="actions" href="#" underline="always" variant="white">Reîncercați</cor-link>
    </cor-notification>
  </div>
`;
const docsSourceWithActions = /*html*/ `<cor-notification variant="info" closable>
  Sesiunea va expira în 5 minute.
  <cor-link slot="actions" href="#">Prelungește sesiunea</cor-link>
</cor-notification>`;
export const WithActions: Story = {
  render: renderWithActions,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceWithActions } } },
};

// ---------------------------------------------------------------------------
// WithTitleAndBody — bold title above the message body
// ---------------------------------------------------------------------------
const renderWithTitleAndBody = () => /*html*/ `
  <div style="${sectionStyle}">
    <cor-notification variant="positive" closable title-text="Plată reușită">
      Tranzacția a fost confirmată. Veți primi o confirmare pe email în câteva minute.
    </cor-notification>

    <cor-notification variant="warning" closable title-text="Sesiunea a expirat">
      Reconectați-vă pentru a continua. Modificările nesalvate au fost pierdute.
    </cor-notification>

    <cor-notification variant="danger" closable title-text="Eroare la încărcare">
      Documentul nu a putut fi procesat. Verificați formatul și încercați din nou.
    </cor-notification>
  </div>
`;
const docsSourceWithTitleAndBody = /*html*/ `<cor-notification variant="positive" closable title-text="Plată reușită">
  Tranzacția a fost confirmată. Veți primi o confirmare pe email în câteva minute.
</cor-notification>`;
export const WithTitleAndBody: Story = {
  render: renderWithTitleAndBody,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceWithTitleAndBody } } },
};

// ---------------------------------------------------------------------------
// EdgeCases — long content wrap, diacritics, title-only, custom icon
// ---------------------------------------------------------------------------
const renderEdgeCases = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${captionStyle}">Conținut foarte lung — se înfășoară corect (multi-line)</p>
    <cor-notification variant="info" closable title-text="Termeni și condiții actualizate">
      Am actualizat termenii și condițiile platformei. Modificările intră în vigoare începând cu 1 iunie 2026 și includ actualizări privind procesarea plăților, drepturile utilizatorilor, politica de confidențialitate și modul în care colectăm și utilizăm datele personale.
    </cor-notification>

    <p style="${captionStyle}">Diacritice românești (ă â î ș ț)</p>
    <cor-notification variant="warning">Înălțime mărită — țineți cont de această modificare.</cor-notification>

    <p style="${captionStyle}">Custom icon override</p>
    <cor-notification variant="info" icon-name="receipt-check-filled" title-text="Bon fiscal generat">
      Vezi detalii în istoricul plăților.
    </cor-notification>

    <p style="${captionStyle}">Strong style cu titlu lung</p>
    <cor-notification variant="positive" notification-style="strong" closable title-text="Plata pentru factura nr. 2026-05-001 a fost procesată cu succes">
      Suma de 1.250,00 MDL a fost debitată de pe cardul ****4521.
    </cor-notification>
  </div>
`;
const docsSourceEdgeCases = /*html*/ `<!-- multi-line wrap -->
<cor-notification variant="info" closable title-text="Termeni și condiții actualizate">
  Am actualizat termenii... [long text]
</cor-notification>

<!-- custom icon -->
<cor-notification variant="info" icon-name="receipt-check-filled" title-text="Bon fiscal generat">
  Vezi detalii în istoricul plăților.
</cor-notification>`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceEdgeCases } } },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<cor-notification>Coverage</cor-notification>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('cor-notification') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!Ctor) throw new Error('cor-notification constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
