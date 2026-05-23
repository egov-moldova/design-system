import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { FOOTER_LOCALES, FOOTER_VARIANTS } from './cor-footer.types';
import type { FooterLocale, FooterVariant } from './cor-footer.types';

type FooterArgs = {
  variant: FooterVariant;
  locale: FooterLocale | '';
  copyrightText: string;
  accessibilityHref: string;
  licenseHref: string;
  ariaLabel: string;
};

const stageStyle =
  'background: var(--color-background-base-secondary, #f5f5f5); min-block-size: 100vh; padding-block-start: 200px;';

const renderFooter = (args: FooterArgs) => /*html*/ `
  <div style="${stageStyle}">
    <cor-footer
      variant="${args.variant}"
      ${args.locale ? `locale="${args.locale}"` : ''}
      ${args.copyrightText ? `copyright-text="${args.copyrightText}"` : ''}
      ${args.accessibilityHref ? `accessibility-href="${args.accessibilityHref}"` : ''}
      ${args.licenseHref ? `license-href="${args.licenseHref}"` : ''}
      ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
    ></cor-footer>
  </div>
`;

const meta: Meta<FooterArgs> = {
  title: 'Organisms/Footer',
  component: 'cor-footer',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: /*md*/ `
**Footer** — civic page-level organism (\`role="contentinfo"\`).

Composes \`cor-link\`, \`cor-logo\` and \`cor-icon\` for atomic pieces. Two
variants share one element:

- **\`evo\`** (default) — full EVO platform footer: branding headline, link
  columns (Servicii guvernamentale / Despre noi / Asistență / Legal),
  contact (email / phone / address), social rows (Facebook / Instagram /
  LinkedIn / YouTube / TikTok), partner logos (Guvernul / AGE / 100% Digital),
  accessibility statement, and a black legal bar with copyright +
  privacy link. Optional Romanian / Russian / English locale switcher in the
  top-right corner.
- **\`simple\`** — slim variant: only the black legal bar with copyright text
  and license/terms links. Used inside embedded flows where the full footer
  is too tall.

Romanian voice ships as defaults; every visible string is overridable via the
public \`@Prop\` surface or the \`branding\` / \`sections\` slots.

The \`corLocaleChange\` event fires with \`{ locale }\` when the user selects
a new language from the switcher.
        `.trim(),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: FOOTER_VARIANTS,
      description: 'Layout flavour (evo = full EVO platform footer, simple = slim legal bar).',
      table: { defaultValue: { summary: 'evo' } },
    },
    locale: {
      control: 'inline-radio',
      options: ['', ...FOOTER_LOCALES],
      description: 'Currently-selected locale. When set, shows the language switcher.',
    },
    copyrightText: { name: 'copyright-text', control: 'text', description: 'Plain-text copyright (Romanian default).' },
    accessibilityHref: {
      name: 'accessibility-href',
      control: 'text',
      description: 'Href for the accessibility statement link.',
    },
    licenseHref: {
      name: 'license-href',
      control: 'text',
      description: 'Href for the privacy/license link in the legal bar.',
    },
    ariaLabel: {
      name: 'aria-label',
      control: 'text',
      description: 'Accessible label for the footer landmark (Romanian default).',
    },
  },
};

export default meta;
type Story = StoryObj<FooterArgs>;

/** Default EVO footer — branding, columns, contact, social, partners, accessibility, legal bar. */
export const Default: Story = {
  args: {
    variant: 'evo',
    locale: '',
    copyrightText: '',
    accessibilityHref: '#accesibilitate',
    licenseHref: '#confidentialitate',
    ariaLabel: '',
  },
  render: renderFooter,
};

/** Slim variant — black legal bar only. Used in embedded flows or single-purpose surfaces. */
export const Simple: Story = {
  args: {
    variant: 'simple',
    locale: '',
    copyrightText: '',
    accessibilityHref: '',
    licenseHref: '#confidentialitate',
    ariaLabel: '',
  },
  render: renderFooter,
};

/** Consumer-supplied sections via the declarative `sections` prop (assigned post-mount). */
export const WithCustomSections: Story = {
  args: {
    variant: 'evo',
    locale: '',
    copyrightText: '',
    accessibilityHref: '',
    licenseHref: '#confidentialitate',
    ariaLabel: '',
  },
  render: (args: FooterArgs) => {
    const id = `cor-footer-custom-${Math.random().toString(36).slice(2, 8)}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(id) as HTMLCorFooterElement | null;
      if (!el) return;
      el.sections = [
        {
          title: 'MPay',
          links: [
            { label: 'Plătește servicii publice', href: '#plateste' },
            { label: 'Plătește impozite', href: '#impozite' },
            { label: 'Plătește amenzi', href: '#amenzi' },
          ],
        },
        {
          title: 'MSign',
          links: [
            { label: 'Semnează documente PDF', href: '#sign-pdf' },
            { label: 'Verifică semnătura', href: '#verifica' },
            { label: 'Solicitare semnătură mobilă', href: '#mobila' },
          ],
        },
        {
          title: 'Suport tehnic',
          links: [
            { label: 'Centru de asistență', href: '#ajutor' },
            { label: 'Status servicii', href: '#status' },
          ],
        },
      ];
    });
    return /*html*/ `
      <div style="${stageStyle}">
        <cor-footer
          id="${id}"
          variant="${args.variant}"
          ${args.licenseHref ? `license-href="${args.licenseHref}"` : ''}
        ></cor-footer>
      </div>
    `;
  },
};

/** EVO footer with the Română / Русский / English locale switcher visible. */
export const WithLocaleSwitcher: Story = {
  args: {
    variant: 'evo',
    locale: 'ro',
    copyrightText: '',
    accessibilityHref: '#accesibilitate',
    licenseHref: '#confidentialitate',
    ariaLabel: '',
  },
  render: renderFooter,
};

/** Mobile breakpoint — columns stack vertically; locale switcher full-width on its own row. */
export const Mobile: Story = {
  args: {
    variant: 'evo',
    locale: 'ro',
    copyrightText: '',
    accessibilityHref: '#accesibilitate',
    licenseHref: '#confidentialitate',
    ariaLabel: '',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: renderFooter,
};

/** Desktop breakpoint — explicit 1440 viewport for pixel-perfect comparison vs Figma. */
export const Desktop: Story = {
  args: {
    variant: 'evo',
    locale: '',
    copyrightText: '',
    accessibilityHref: '#accesibilitate',
    licenseHref: '#confidentialitate',
    ariaLabel: '',
  },
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
  },
  render: renderFooter,
};

/** Edge cases — very long link labels, only one section, missing optional blocks. */
export const EdgeCases: Story = {
  args: {
    variant: 'evo',
    locale: '',
    copyrightText: '',
    accessibilityHref: '',
    licenseHref: '#confidentialitate',
    ariaLabel: '',
  },
  render: (args: FooterArgs) => {
    const id = `cor-footer-edge-${Math.random().toString(36).slice(2, 8)}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(id) as HTMLCorFooterElement | null;
      if (!el) return;
      el.sections = [
        {
          title: 'Servicii cu denumiri foarte lungi pentru testare',
          links: [
            {
              label: 'Cerere pentru eliberarea certificatului de stare civilă cu apostilă (procedură simplificată)',
              href: '#cert',
            },
            { label: 'Înregistrarea modificărilor în registrul persoanelor juridice', href: '#reg' },
            { label: 'Solicitare extrase istorice din registrul de imobile', href: '#imobile' },
          ],
        },
      ];
      el.contact = {};
      el.social = [];
      el.partnerLogos = [];
    });
    return /*html*/ `
      <div style="${stageStyle}">
        <cor-footer
          id="${id}"
          variant="${args.variant}"
          ${args.licenseHref ? `license-href="${args.licenseHref}"` : ''}
        ></cor-footer>
      </div>
    `;
  },
};
