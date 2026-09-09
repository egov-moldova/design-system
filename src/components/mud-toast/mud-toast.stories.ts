import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TOAST_VARIANTS } from './mud-toast.types';
import type { ToastVariant } from './mud-toast.types';

type ToastArgs = {
  variant: ToastVariant;
  closable: boolean;
  titleText: string;
  iconName: string;
  body: string;
  closeLabel: string;
};

const renderToast = (args: ToastArgs) => /*html*/ `
  <mud-toast
    variant="${args.variant}"
    closable="${args.closable}"
    ${args.titleText ? `title-text="${args.titleText}"` : ''}
    ${args.iconName ? `icon-name="${args.iconName}"` : ''}
    close-label="${args.closeLabel}"
  >${args.body}</mud-toast>
`;

const sectionStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); align-items: flex-start;';
const captionStyle =
  'font-family: var(--font-family-primary); font-size: 12px; font-weight: 500; color: var(--color-text-base-secondary); margin: 0;';

const meta: Meta<ToastArgs> = {
  title: 'Atoms/Toast',
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
      description: 'Renders a trailing × button that emits `mudClose`. Set `false` for a toast the user cannot dismiss manually.',
      table: { defaultValue: { summary: 'true' } },
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
    <mud-toast variant="info" closable title-text="Informație">Vă informăm despre modificările aduse serviciului.</mud-toast>
    <mud-toast variant="warning" closable title-text="Atenție">Mentenanță programată astăzi între 22:00 și 02:00.</mud-toast>
    <mud-toast variant="success" closable title-text="Succes">Plata a fost procesată cu succes.</mud-toast>
    <mud-toast variant="error" closable title-text="Eroare">Eroare la încărcarea documentului. Reîncercați.</mud-toast>
  </div>
`;
const docsSourceAllVariants = TOAST_VARIANTS.map(
  v => `<mud-toast variant="${v}" closable title-text="...">Mesaj.</mud-toast>`,
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
    <mud-toast variant="info" closable>Sesiunea va expira în 5 minute.</mud-toast>
    <mud-toast variant="success" closable>Modificările au fost salvate.</mud-toast>
    <mud-toast variant="error" closable>Conexiune întreruptă.</mud-toast>
  </div>
`;
export const NoHeading: Story = {
  render: renderNoHeading,
  parameters: {
    controls: { disable: true },
    docs: {
      source: { code: '<mud-toast variant="info">Sesiunea va expira în 5 minute.</mud-toast>' },
    },
  },
};

// ---------------------------------------------------------------------------
// NotClosable — closable="false" (auto-dismiss-only toast, no × button)
// ---------------------------------------------------------------------------
const renderNotClosable = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-toast variant="success" closable="false" title-text="Salvat">Modificările au fost salvate.</mud-toast>
    <mud-toast variant="info" closable="false">Se sincronizează datele…</mud-toast>
  </div>
`;
export const NotClosable: Story = {
  render: renderNotClosable,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: '<mud-toast variant="success" closable="false" title-text="Salvat">Modificările au fost salvate.</mud-toast>',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// WithLink — inline action below the body
// ---------------------------------------------------------------------------
const renderWithLink = () => /*html*/ `
  <div style="${sectionStyle}">
    <mud-toast variant="info" closable title-text="Sesiunea va expira">
      Salvați modificările pentru a evita pierderea datelor.
      <mud-link slot="actions" href="#" underline="always" variant="white">Prelungește sesiunea</mud-link>
    </mud-toast>

    <mud-toast variant="error" closable title-text="Plată refuzată">
      Tranzacția nu a putut fi finalizată.
      <mud-link slot="actions" href="#" underline="always" variant="white">Reîncercați</mud-link>
    </mud-toast>
  </div>
`;
const docsSourceWithLink = /*html*/ `<mud-toast variant="info" closable title-text="Sesiunea va expira">
  Salvați modificările pentru a evita pierderea datelor.
  <mud-link slot="actions" href="#" variant="white">Prelungește sesiunea</mud-link>
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
    <p style="${captionStyle}">Conținut lung — se înfășoară pe 2-3 rânduri</p>
    <mud-toast variant="info" closable title-text="Termeni și condiții actualizate">
      Am actualizat termenii platformei. Modificările intră în vigoare începând cu 1 iunie 2026 și includ actualizări privind procesarea plăților și politica de confidențialitate.
    </mud-toast>

    <p style="${captionStyle}">Diacritice românești (ă â î ș ț)</p>
    <mud-toast variant="warning">Înălțime mărită — țineți cont de această modificare.</mud-toast>

    <p style="${captionStyle}">Custom icon override</p>
    <mud-toast variant="success" icon-name="receipt-check-filled" closable title-text="Bon fiscal generat">
      Vezi detalii în istoricul plăților.
    </mud-toast>
  </div>
`;
const docsSourceEdgeCases = /*html*/ `<mud-toast variant="success" icon-name="receipt-check-filled" closable title-text="Bon fiscal generat">
  Vezi detalii în istoricul plăților.
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
    const Ctor = customElements.get('mud-toast') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!Ctor) throw new Error('mud-toast constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
