import type { Meta, StoryObj } from '@storybook/web-components-vite';

import econsulatLogo from './assets/econsulat-logo.svg';
import epermitsLogo from './assets/epermits-logo.svg';
import evoLogo from './assets/evo-logo.svg';
import governmentCrest from './assets/government-crest.svg';

type HeaderArgs = {
  governmentLabel: string;
  language: string;
  navLabel: string;
};

const actions = /*html*/ `
  <div slot="actions" style="display:flex; align-items:center; gap: var(--spacing-8, 8px);">
    <mud-button appearance="text" variant="strict" shape="circular" icon-only aria-label="Căutare">
      <mud-icon slot="icon" name="search" size="24"></mud-icon>
    </mud-button>
    <mud-button appearance="text" variant="strict" shape="circular" icon-only aria-label="Ajutor">
      <mud-icon slot="icon" name="bubble-question" size="24"></mud-icon>
    </mud-button>
    <mud-button appearance="text" variant="strict" shape="circular" icon-only aria-label="Platforme utile">
      <mud-icon slot="icon" name="dot-grid" size="24"></mud-icon>
    </mud-button>
  </div>
  <div slot="actions" style="display:flex; align-items:center; gap: var(--spacing-12, 12px);">
    <mud-button variant="primary" appearance="filled" shape="circular">Intră în cabinet</mud-button>
    <mud-button variant="secondary" appearance="filled" shape="circular">Obține semnătura</mud-button>
  </div>
`;

const renderHeader = (args: HeaderArgs) => /*html*/ `
  <mud-header
    ${args.governmentLabel ? `government-label="${args.governmentLabel}"` : ''}
    ${args.language ? `language="${args.language}"` : ''}
    ${args.navLabel ? `nav-label="${args.navLabel}"` : ''}
  >
    <img slot="government" src="${governmentCrest}" alt="" width="24" height="24" style="display:block;" />
    <img slot="logo" src="${evoLogo}" alt="EVO" style="display:block; height:52px; width:auto;" />
    <mud-header-nav-item slot="nav" value="servicii" label="Servicii" expandable></mud-header-nav-item>
    <mud-header-nav-item slot="nav" value="evenimente" label="Evenimente de viață" tag="În curând" expandable disabled></mud-header-nav-item>
    <mud-header-nav-item slot="nav" value="prestatori" label="Prestatori servicii" href="#prestatori"></mud-header-nav-item>
    ${actions}
  </mud-header>
`;

const meta: Meta<HeaderArgs> = {
  title: 'Organisms/Header',
  component: 'mud-header',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: /*md*/ `
**Header** — the EVO government portal masthead (\`role="banner"\`).

**Phase 1 — desktop shell.** A pre-header band (government crest + label +
Ro / Ru / En language switcher) above the main bar, which exposes \`logo\`,
\`nav\` and \`actions\` slots. Navigation entries use \`mud-header-nav-item\`
(label + optional status tag + chevron, with default / hover / active /
disabled states). Action icons and CTA buttons compose \`mud-button\` +
\`mud-icon\`.

Follow-up phases: the **Servicii** mega-menu (reusing \`mud-menu\`), the
"Platforme utile" services dropdown, the mobile header, and the
authenticated user state.

\`mudLanguageChange\` fires with \`{ code }\` when a language is chosen.
        `.trim(),
      },
    },
  },
  args: {
    governmentLabel: 'Guvernul Republicii Moldova',
    language: 'ro',
    navLabel: 'Principal',
  },
  argTypes: {
    governmentLabel: { control: 'text' },
    language: { control: 'select', options: ['ro', 'ru', 'en'] },
    navLabel: { control: 'text' },
  },
  render: renderHeader,
};

export default meta;
type Story = StoryObj<HeaderArgs>;

/** The full EVO desktop header at the 1248px breakpoint, anonymous user. */
export const Default: Story = {};

const SERVICII_COLUMNS = [
  {
    heading: 'Acte și identitate',
    items: [
      { label: 'Pașaport', href: '#' },
      { label: 'Buletin de identitate', href: '#' },
      { label: 'Permis de conducere', href: '#' },
      { label: 'Certificat de naștere', href: '#' },
      { label: 'Cazier judiciar', href: '#' },
      { label: 'Apostilă', href: '#' },
      { label: 'Viză de reședință', href: '#' },
    ],
  },
  {
    heading: 'Sănătate și protecție socială',
    items: [
      { label: 'Asigurare medicală', href: '#' },
      { label: 'Indemnizații', href: '#' },
      { label: 'Pensii', href: '#' },
      { label: 'Concediu medical', href: '#' },
      { label: 'Vaccinare', href: '#', tag: 'Nou' },
      { label: 'Programări medicale', href: '#' },
      { label: 'Ajutor social', href: '#' },
    ],
  },
  {
    heading: 'Afaceri și impozite',
    items: [
      { label: 'Înregistrare firmă', href: '#' },
      { label: 'Declarații fiscale', href: '#' },
      { label: 'TVA', href: '#' },
      { label: 'Licențe și autorizații', href: '#' },
      { label: 'Achiziții publice', href: '#' },
      { label: 'Patentă', href: '#' },
      { label: 'Raportare financiară', href: '#' },
    ],
  },
];

const renderHeaderWithMega = () => /*html*/ `
  <div>
    <mud-header government-label="Guvernul Republicii Moldova" language="ro" nav-label="Principal">
      <img slot="government" src="${governmentCrest}" alt="" width="24" height="24" style="display:block;" />
      <img slot="logo" src="${evoLogo}" alt="EVO" style="display:block; height:52px; width:auto;" />
      <mud-header-nav-item slot="nav" value="servicii" label="Servicii" expandable expanded active></mud-header-nav-item>
      <mud-header-nav-item slot="nav" value="evenimente" label="Evenimente de viață" tag="În curând" expandable disabled></mud-header-nav-item>
      <mud-header-nav-item slot="nav" value="prestatori" label="Prestatori servicii" href="#prestatori"></mud-header-nav-item>
      ${actions}
    </mud-header>
    <mud-header-mega-menu id="evo-mega" aria-label="Servicii" open></mud-header-mega-menu>
  </div>
`;

/**
 * The "Servicii" mega-menu open beneath the header — a full-width, 3-column
 * panel of headings + links. Click the Servicii nav item to toggle it.
 */
export const ServiciiMegaMenu: Story = {
  parameters: { controls: { disable: true } },
  render: () => renderHeaderWithMega(),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const mega = canvasElement.querySelector('#evo-mega') as
      | (HTMLElement & { columns?: unknown; open?: boolean })
      | null;
    const servicii = canvasElement.querySelector('mud-header-nav-item[value="servicii"]') as
      | (HTMLElement & { active?: boolean })
      | null;
    if (mega) mega.columns = SERVICII_COLUMNS;
    // Toggle the mega-menu open/closed from the Servicii nav item.
    canvasElement.addEventListener('mudNavToggle', (ev: Event) => {
      const detail = (ev as CustomEvent<{ value: string; expanded: boolean }>).detail;
      if (!detail || detail.value !== 'servicii') return;
      if (mega) mega.open = detail.expanded;
      if (servicii) servicii.active = detail.expanded;
    });
  },
};

const PLATFORMS = [
  { logoName: 'mpay-logo-with-verb', label: 'mpay — plătește', href: 'https://mpay.gov.md' },
  { logoName: 'msign-logo-with-verb', label: 'msign — semnează', href: 'https://msign.gov.md' },
  { logoName: 'mpower-logo-with-verb', label: 'mpower — împuternicește', href: 'https://mpower.gov.md' },
  { logoName: 'mnotify-logo-with-verb', label: 'mnotify — primește notificări', href: 'https://mnotify.gov.md' },
  { logoSrc: epermitsLogo, label: 'epermits — obține', href: 'https://actpermisiv.gov.md' },
  { logoSrc: econsulatLogo, label: 'econsulat — când ești departe', href: 'https://econsulat.gov.md' },
];

/**
 * The "Platforme utile" services dropdown — a 2-column grid of platform logos
 * over a full-width "discover all" button. Opens from the header's grid action.
 */
export const ServicesMenu: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24, 24px); display:flex; justify-content:center;">
      <mud-header-services-menu id="evo-services" open discover-href="https://egov.md/ro/advanced-page-type/platforme-operate"></mud-header-services-menu>
    </div>
  `,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const menu = canvasElement.querySelector('#evo-services') as (HTMLElement & { platforms?: unknown }) | null;
    if (menu) menu.platforms = PLATFORMS;
  },
};

const mobileBarActions = /*html*/ `
  <div slot="bar-actions" style="display:flex; align-items:center; gap: var(--spacing-16, 16px);">
    <mud-button variant="primary" appearance="filled" shape="circular">Autentificare</mud-button>
    <mud-button appearance="text" variant="strict" shape="circular" icon-only aria-label="Căutare">
      <mud-icon slot="icon" name="search" size="24"></mud-icon>
    </mud-button>
  </div>
`;

const mobileDrawer = /*html*/ `
  <div slot="search" style="display:flex; align-items:center; gap: var(--spacing-8, 8px); height:44px; padding-inline: var(--spacing-16, 16px); border:1px solid var(--color-border-base-default, #d9d9d9); border-radius: var(--border-radius-full, 999px); color: var(--color-text-base-tertiary, #757575);">
    <mud-icon name="search" size="20"></mud-icon>
    <span>Caută</span>
  </div>
  <mud-sidebar-item slot="nav" label="Servicii" expandable></mud-sidebar-item>
  <mud-sidebar-item slot="nav" label="Evenimente de viață" expandable></mud-sidebar-item>
  <mud-sidebar-item slot="nav" label="Prestatori servicii" expandable></mud-sidebar-item>
  <mud-sidebar-item slot="nav" label="Despre noi"></mud-sidebar-item>
  <mud-sidebar-item slot="secondary" icon="dot-grid" label="Platforme utile"></mud-sidebar-item>
  <mud-sidebar-item slot="secondary" icon="bubble-question" label="Asistență"></mud-sidebar-item>
  <mud-button slot="actions" variant="primary" appearance="filled" shape="circular" full-width>Intră în cabinet</mud-button>
  <mud-button slot="actions" variant="secondary" appearance="filled" shape="circular" full-width>Obține semnătura</mud-button>
`;

/** The compact mobile bar (closed): logo, auth button, search and a hamburger. */
export const MobileClosed: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `<div style="max-width:390px;">
    <mud-header-mobile logo-src="${evoLogo}" logo-alt="EVO">${mobileBarActions}</mud-header-mobile>
  </div>`,
};

/** The mobile navigation drawer, open over the full screen. */
export const MobileOpen: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <mud-header-mobile logo-src="${evoLogo}" logo-alt="EVO" language="ro" open>
      ${mobileBarActions}
      ${mobileDrawer}
    </mud-header-mobile>
  `,
};

// --- Authenticated state -----------------------------------------------------
// No new component is needed: the authenticated header is the same shell with a
// user avatar (instead of the login CTAs) in the `actions` slot, and an
// optional profile menu (mud-menu) — all via reuse.

const authActions = /*html*/ `
  <div slot="actions" style="display:flex; align-items:center; gap: var(--spacing-8, 8px);">
    <mud-button appearance="text" variant="strict" shape="circular" icon-only aria-label="Căutare"><mud-icon slot="icon" name="search" size="24"></mud-icon></mud-button>
    <mud-button appearance="text" variant="strict" shape="circular" icon-only aria-label="Ajutor"><mud-icon slot="icon" name="bubble-question" size="24"></mud-icon></mud-button>
    <mud-button appearance="text" variant="strict" shape="circular" icon-only aria-label="Platforme utile"><mud-icon slot="icon" name="dot-grid" size="24"></mud-icon></mud-button>
  </div>
  <button slot="actions" aria-label="Contul meu" aria-haspopup="menu" style="border:0; background:transparent; padding:0; cursor:pointer; border-radius: var(--border-radius-full, 999px);">
    <mud-avatar name="Ion Popescu" initials="IP" size="md"></mud-avatar>
  </button>
`;

/** Authenticated desktop header: the login CTAs give way to a user avatar, with a profile menu (mud-menu) below it. */
export const HeaderAuthenticated: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <div>
      <mud-header government-label="Guvernul Republicii Moldova" language="ro" nav-label="Principal">
        <img slot="government" src="${governmentCrest}" alt="" width="24" height="24" style="display:block;" />
        <img slot="logo" src="${evoLogo}" alt="EVO" style="display:block; height:52px; width:auto;" />
        <mud-header-nav-item slot="nav" value="servicii" label="Servicii" expandable></mud-header-nav-item>
        <mud-header-nav-item slot="nav" value="prestatori" label="Prestatori servicii" href="#prestatori"></mud-header-nav-item>
        ${authActions}
      </mud-header>
      <div style="display:flex; justify-content:flex-end; max-width:1280px; margin-inline:auto; padding-inline: var(--spacing-24, 24px); margin-block-start: var(--spacing-8, 8px);">
        <mud-menu type="contextual" aria-label="Contul meu">
          <mud-menu-item value="profile" label="Profilul meu"></mud-menu-item>
          <mud-menu-item value="services" label="Serviciile mele"></mud-menu-item>
          <mud-menu-item value="settings" label="Setări cont"></mud-menu-item>
          <mud-menu-item heading></mud-menu-item>
          <mud-menu-item value="logout" label="Ieși din cont"></mud-menu-item>
        </mud-menu>
      </div>
    </div>
  `,
};

const mobileAuthBar = /*html*/ `
  <div slot="bar-actions" style="display:flex; align-items:center; gap: var(--spacing-12, 12px);">
    <mud-button appearance="text" variant="strict" shape="circular" icon-only aria-label="Căutare"><mud-icon slot="icon" name="search" size="24"></mud-icon></mud-button>
    <mud-avatar name="Ion Popescu" initials="IP" size="md"></mud-avatar>
  </div>
`;

/** Authenticated mobile bar: a user avatar replaces the "Autentificare" button. */
export const MobileAuthenticated: Story = {
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `<div style="max-width:390px;">
    <mud-header-mobile logo-src="${evoLogo}" logo-alt="EVO">${mobileAuthBar}</mud-header-mobile>
  </div>`,
};

/**
 * Responsive EVO header. At ≥1248px (the EVO desktop breakpoint) the full
 * desktop bar shows; below it, the desktop nav + pre-header collapse and the
 * compact `mud-header-mobile` (bar + drawer — tap the hamburger) takes over.
 * **Resize the canvas across 1248px** to see the switch.
 */
export const Responsive: Story = {
  parameters: { controls: { disable: true }, layout: 'fullscreen' },
  render: () => /*html*/ `
    <style>
      .evo-h-desktop { display: none; }
      .evo-h-mobile { display: block; }
      @media (min-width: 1248px) {
        .evo-h-desktop { display: block; }
        .evo-h-mobile { display: none; }
      }
    </style>
    <div class="evo-h-desktop">
      ${renderHeader({ governmentLabel: 'Guvernul Republicii Moldova', language: 'ro', navLabel: 'Principal' })}
    </div>
    <div class="evo-h-mobile">
      <mud-header-mobile logo-src="${evoLogo}" logo-alt="EVO">${mobileBarActions}${mobileDrawer}</mud-header-mobile>
    </div>
  `,
};
