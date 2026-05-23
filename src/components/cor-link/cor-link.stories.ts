import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { LINK_SIZES, LINK_UNDERLINES, LINK_VARIANTS } from './cor-link.types';
import type { LinkSize, LinkUnderline, LinkVariant } from './cor-link.types';

type LinkArgs = {
  variant: LinkVariant;
  size: LinkSize;
  underline: LinkUnderline;
  standalone: boolean;
  disabled: boolean;
  href: string;
  target: string;
  label: string;
};

const renderLink = (args: LinkArgs) => /*html*/ `
  <cor-link
    variant="${args.variant}"
    size="${args.size}"
    underline="${args.underline}"
    ${args.standalone ? 'standalone' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.href ? `href="${args.href}"` : ''}
    ${args.target ? `target="${args.target}"` : ''}
  >${args.label}</cor-link>
`;

const docsSourceDefault = (args: LinkArgs) => {
  const attrs = [
    args.variant !== 'primary' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.underline !== 'always' ? `underline="${args.underline}"` : '',
    args.standalone ? 'standalone' : '',
    args.disabled ? 'disabled' : '',
    args.href ? `href="${args.href}"` : '',
    args.target ? `target="${args.target}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const open = attrs ? `<cor-link ${attrs}>` : '<cor-link>';
  return `${open}${args.label}</cor-link>`;
};

const cellLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin-top: var(--spacing-4); font-family: var(--font-family-primary);';

// ---------------------------------------------------------------------------
// renderInline — single inline link inside a paragraph of body copy.
// Verifies the link sits on the baseline next to surrounding text.
// ---------------------------------------------------------------------------
const renderInline = () => /*html*/ `
  <p style="font-family: var(--font-family-primary); font-size: var(--font-size-16); line-height: var(--line-height-24); color: var(--color-text-base-default); max-width: 560px; padding: var(--spacing-24); margin: 0;">
    Înainte de a continua,
    <cor-link href="https://gov.md/ro/content/politica-de-confidentialitate" target="_blank">
      citește politica de confidențialitate
    </cor-link>
    pentru a înțelege cum sunt prelucrate datele dumneavoastră personale.
  </p>
`;

const docsSourceInline = /*html*/ `<p>
  Înainte de a continua,
  <cor-link href="https://gov.md/ro/content/politica-de-confidentialitate" target="_blank">
    citește politica de confidențialitate
  </cor-link>
  pentru a înțelege cum sunt prelucrate datele dumneavoastră personale.
</p>`;

// ---------------------------------------------------------------------------
// renderAllSizes — four sizes shown together with descriptive labels.
// ---------------------------------------------------------------------------
const renderAllSizes = () => /*html*/ `
  <div style="display: flex; align-items: flex-end; gap: var(--spacing-32); padding: var(--spacing-24); flex-wrap: wrap; font-family: var(--font-family-primary);">
    ${LINK_SIZES.map(
      size => /*html*/ `
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-4);">
        <cor-link size="${size}" href="#">Mai multe detalii</cor-link>
        <span style="${cellLabelStyle}">${size} (${size === 'xs' ? '12px' : size === 'sm' ? '14px' : size === 'md' ? '16px' : '18px'})</span>
      </div>`,
    ).join('')}
  </div>
`;

const docsSourceAllSizes = LINK_SIZES.map(
  s => /*html*/ `<cor-link size="${s}" href="#">Mai multe detalii</cor-link>`,
).join('\n');

// ---------------------------------------------------------------------------
// renderAllVariants — primary / strict / white shown together.
// The "white" cell sits on a dark surface so the variant is legible.
// ---------------------------------------------------------------------------
const renderAllVariants = () => /*html*/ `
  <div style="display: flex; align-items: stretch; gap: var(--spacing-16); padding: var(--spacing-24); flex-wrap: wrap; font-family: var(--font-family-primary);">
    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-4); padding: var(--spacing-16); background: var(--color-background-base-default); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-6); min-width: 160px;">
      <cor-link variant="primary" href="#">Citește acordul</cor-link>
      <span style="${cellLabelStyle}">primary</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-4); padding: var(--spacing-16); background: var(--color-background-base-default); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-6); min-width: 160px;">
      <cor-link variant="strict" href="#">Citește acordul</cor-link>
      <span style="${cellLabelStyle}">strict</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-4); padding: var(--spacing-16); background: var(--color-background-base-inverse-default, #1e1e1e); border-radius: var(--border-radius-6); min-width: 160px;">
      <cor-link variant="white" href="#">Citește acordul</cor-link>
      <span style="${cellLabelStyle}; color: var(--color-text-base-inverse-on-color, #fff);">white (on dark)</span>
    </div>
  </div>
`;

const docsSourceAllVariants = LINK_VARIANTS.map(
  v => /*html*/ `<cor-link variant="${v}" href="#">Citește acordul</cor-link>`,
).join('\n');

// ---------------------------------------------------------------------------
// renderStates — default / hover / focus / active / visited / disabled.
// Each cell carries a forced :focus or :hover where possible via .force-* classes.
// ---------------------------------------------------------------------------
const renderStates = () => /*html*/ `
  <style>
    .state-grid {
      display: grid;
      grid-template-columns: 140px repeat(6, auto);
      column-gap: var(--spacing-32);
      row-gap: var(--spacing-16);
      padding: var(--spacing-24);
      align-items: center;
      font-family: var(--font-family-primary);
    }
    .state-grid > .col-label,
    .state-grid > .row-label {
      font-size: var(--font-size-12);
      color: var(--color-text-base-tertiary);
      font-style: italic;
    }
    .state-grid > .col-label { text-align: center; }
    .state-grid > .row-label { text-align: right; }
    .state-grid > .cell { display: inline-flex; justify-content: center; }
    .state-grid .visited-demo { color: var(--color-text-brand-visited); text-decoration: underline; text-underline-offset: 2px; font-size: var(--font-size-16); font-family: var(--font-family-primary); }
  </style>
  <div class="state-grid">
    <span></span>
    <span class="col-label">default</span>
    <span class="col-label">hover</span>
    <span class="col-label">focus</span>
    <span class="col-label">active</span>
    <span class="col-label">visited *</span>
    <span class="col-label">disabled</span>

    <span class="row-label">primary</span>
    <span class="cell"><cor-link variant="primary" href="#">Link</cor-link></span>
    <span class="cell"><cor-link variant="primary" href="#" id="link-hover-primary">Link</cor-link></span>
    <span class="cell"><cor-link variant="primary" href="#" id="link-focus-primary">Link</cor-link></span>
    <span class="cell"><cor-link variant="primary" href="#" id="link-active-primary">Link</cor-link></span>
    <span class="cell"><span class="visited-demo">Link</span></span>
    <span class="cell"><cor-link variant="primary" href="#" disabled>Link</cor-link></span>

    <span class="row-label">strict</span>
    <span class="cell"><cor-link variant="strict" href="#">Link</cor-link></span>
    <span class="cell"><cor-link variant="strict" href="#">Link</cor-link></span>
    <span class="cell"><cor-link variant="strict" href="#">Link</cor-link></span>
    <span class="cell"><cor-link variant="strict" href="#">Link</cor-link></span>
    <span class="cell"><span class="visited-demo">Link</span></span>
    <span class="cell"><cor-link variant="strict" href="#" disabled>Link</cor-link></span>
  </div>
  <p style="font-family: var(--font-family-primary); font-size: var(--font-size-12); color: var(--color-text-base-tertiary); padding: 0 var(--spacing-24) var(--spacing-24); margin: 0; font-style: italic;">
    * The "visited" column is a swatch — the real <code>:visited</code> pseudo-class only triggers after a user actually navigates to <code>href</code>. See the <strong>Visited</strong> story for the live demo.
  </p>
`;

const docsSourceStates = /*html*/ `<cor-link href="#">Default</cor-link>
<cor-link href="#" disabled>Disabled</cor-link>

<!-- Focus / hover / active / visited are pseudo-class driven and cannot be
     authored on the element itself. Use keyboard focus and pointer hover to
     verify, and navigate to the href once for visited. -->`;

// ---------------------------------------------------------------------------
// renderStandalone — block-level standalone link with leading icon.
// ---------------------------------------------------------------------------
const renderStandalone = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-24); align-items: flex-start; font-family: var(--font-family-primary);">
    <cor-link standalone href="/servicii/mpay">
      <cor-icon slot="icon-start" name="arrow-right" size="20" color="currentColor"></cor-icon>
      Continuă către MPay
    </cor-link>
    <cor-link standalone variant="strict" href="/profil">
      <cor-icon slot="icon-start" name="arrow-left" size="20" color="currentColor"></cor-icon>
      Înapoi la profil
    </cor-link>
    <cor-link standalone size="lg" href="/raport">
      Vezi raportul complet
      <cor-icon slot="icon-end" name="arrow-up-right" size="20" color="currentColor"></cor-icon>
    </cor-link>
  </div>
`;

const docsSourceStandalone = /*html*/ `<cor-link standalone href="/servicii/mpay">
  <cor-icon slot="icon-start" name="arrow-right" size="20" color="currentColor"></cor-icon>
  Continuă către MPay
</cor-link>

<cor-link standalone variant="strict" href="/profil">
  <cor-icon slot="icon-start" name="arrow-left" size="20" color="currentColor"></cor-icon>
  Înapoi la profil
</cor-link>

<cor-link standalone size="lg" href="/raport">
  Vezi raportul complet
  <cor-icon slot="icon-end" name="arrow-up-right" size="20" color="currentColor"></cor-icon>
</cor-link>`;

// ---------------------------------------------------------------------------
// renderExternalLink — target=_blank auto-applies rel + external indicator.
// ---------------------------------------------------------------------------
const renderExternalLink = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-24); align-items: flex-start; font-family: var(--font-family-primary);">
    <cor-link href="https://moldova.md" target="_blank">
      Site-ul oficial al Republicii Moldova
    </cor-link>
    <cor-link href="https://www.gov.md/ro/content/legislatie" target="_blank">
      Legislația în vigoare
    </cor-link>
    <cor-link href="https://wikipedia.org/wiki/E-guvernare" target="_blank" external="false">
      Fără indicator extern (external="false")
    </cor-link>
  </div>
  <p style="font-family: var(--font-family-primary); font-size: var(--font-size-12); color: var(--color-text-base-tertiary); padding: 0 var(--spacing-24) var(--spacing-24); margin: 0; font-style: italic; max-width: 540px;">
    When <code>target="_blank"</code>, the component auto-applies <code>rel="noopener noreferrer"</code> and renders an external-link indicator after the label. Set <code>external="false"</code> to suppress the indicator.
  </p>
`;

const docsSourceExternalLink = /*html*/ `<cor-link href="https://moldova.md" target="_blank">
  Site-ul oficial al Republicii Moldova
</cor-link>

<cor-link href="https://wikipedia.org/wiki/E-guvernare" target="_blank" external="false">
  Fără indicator extern
</cor-link>`;

// ---------------------------------------------------------------------------
// renderWithDownload — download attribute triggers file download.
// ---------------------------------------------------------------------------
const renderWithDownload = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-24); align-items: flex-start; font-family: var(--font-family-primary);">
    <cor-link href="/files/cerere-mpay.pdf" download="cerere-mpay.pdf">
      <cor-icon slot="icon-start" name="download" size="20" color="currentColor"></cor-icon>
      Descarcă cererea (PDF)
    </cor-link>
    <cor-link href="/files/raport-anual.xlsx" download standalone>
      <cor-icon slot="icon-start" name="file-download" size="20" color="currentColor"></cor-icon>
      Raport anual 2025 (XLSX)
    </cor-link>
  </div>
`;

const docsSourceWithDownload = /*html*/ `<cor-link href="/files/cerere-mpay.pdf" download="cerere-mpay.pdf">
  <cor-icon slot="icon-start" name="download" size="20" color="currentColor"></cor-icon>
  Descarcă cererea (PDF)
</cor-link>`;

// ---------------------------------------------------------------------------
// renderUnderlineVariations — always / hover / none
// ---------------------------------------------------------------------------
const renderUnderlineVariations = () => /*html*/ `
  <div style="display: flex; align-items: flex-end; gap: var(--spacing-32); padding: var(--spacing-24); flex-wrap: wrap; font-family: var(--font-family-primary);">
    ${LINK_UNDERLINES.map(
      u => /*html*/ `
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-4);">
        <cor-link underline="${u}" href="#">Citește mai mult</cor-link>
        <span style="${cellLabelStyle}">underline="${u}"</span>
      </div>`,
    ).join('')}
  </div>
`;

const docsSourceUnderlineVariations = LINK_UNDERLINES.map(
  u => /*html*/ `<cor-link underline="${u}" href="#">Citește mai mult</cor-link>`,
).join('\n');

// ---------------------------------------------------------------------------
// renderVisited — link list where one item is pre-visited via JS for demo.
// ---------------------------------------------------------------------------
const renderVisited = () => /*html*/ `
  <style>
    .visited-demo-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-8);
      padding: var(--spacing-24);
      max-width: 360px;
      font-family: var(--font-family-primary);
    }
    .visited-demo-list cor-link { display: inline-flex; }
  </style>
  <div class="visited-demo-list">
    <p style="font-size: var(--font-size-14); color: var(--color-text-base-secondary); margin: 0 0 var(--spacing-8);">
      Click any link below — once the browser records it as visited, the color flips to magenta on next render.
    </p>
    <cor-link href="https://www.gov.md/ro/about">Despre guvern</cor-link>
    <cor-link href="https://www.gov.md/ro/news">Noutăți recente</cor-link>
    <cor-link href="https://www.gov.md/ro/contacte">Date de contact</cor-link>
    <cor-link href="https://www.gov.md/ro/transparenta">Transparență decizională</cor-link>
  </div>
`;

const docsSourceVisited = /*html*/ `<!-- Visited links flip to brand magenta (#aa18ce) per DESIGN.md.
     The :visited pseudo-class is browser-managed and triggers only after
     real navigation to the href. -->
<cor-link href="https://www.gov.md/ro/about">Despre guvern</cor-link>
<cor-link href="https://www.gov.md/ro/news">Noutăți recente</cor-link>`;

// ---------------------------------------------------------------------------
// renderEdgeCases — very long label wrapping, empty link warning fallback.
// ---------------------------------------------------------------------------
const renderEdgeCases = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); max-width: 480px; font-family: var(--font-family-primary);">

    <div>
      <p style="${cellLabelStyle}; margin: 0 0 var(--spacing-8);">Very long label inside a constrained-width paragraph — must wrap with the rest of the inline text.</p>
      <p style="font-size: var(--font-size-16); line-height: var(--line-height-24); color: var(--color-text-base-default); margin: 0;">
        Citizen-facing forms often need to surface
        <cor-link href="https://www.gov.md/ro/content/aviz-de-confidentialitate-detaliat-privind-prelucrarea-datelor-personale-de-catre-agentia-de-guvernare-electronica">
          un aviz de confidențialitate foarte lung referitor la prelucrarea datelor personale
        </cor-link>
        înainte ca pasul următor să devină accesibil.
      </p>
    </div>

    <div>
      <p style="${cellLabelStyle}; margin: 0 0 var(--spacing-8);">Standalone with a very long label — wraps without breaking layout.</p>
      <cor-link standalone href="/raport-trimestrial">
        <cor-icon slot="icon-start" name="arrow-right" size="20" color="currentColor"></cor-icon>
        Vezi raportul trimestrial complet cu toate metricile, comparațiile și anexele
      </cor-link>
    </div>

    <div>
      <p style="${cellLabelStyle}; margin: 0 0 var(--spacing-8);">No href — renders as <code>&lt;button&gt;</code> for keyboard semantics.</p>
      <cor-link>Trigger callback action</cor-link>
    </div>

    <div>
      <p style="${cellLabelStyle}; margin: 0 0 var(--spacing-8);">Small (xs) link inside helper text.</p>
      <p style="font-size: var(--font-size-12); line-height: var(--line-height-16); color: var(--color-text-base-secondary); margin: 0;">
        Parola trebuie să conțină cel puțin 8 caractere.
        <cor-link size="xs" href="/parola">Vezi cerințele complete</cor-link>
      </p>
    </div>

  </div>
`;

const docsSourceEdgeCases = /*html*/ `<!-- Long label inside body copy: wraps as inline text. -->
<p>
  Citizen-facing forms often need to surface
  <cor-link href="…">un aviz de confidențialitate foarte lung…</cor-link>
  înainte ca pasul următor să devină accesibil.
</p>

<!-- Standalone long label: wraps gracefully. -->
<cor-link standalone href="/raport">
  <cor-icon slot="icon-start" name="arrow-right" size="20"></cor-icon>
  Vezi raportul trimestrial complet cu toate metricile…
</cor-link>

<!-- No href: renders as <button>. -->
<cor-link>Trigger callback action</cor-link>`;

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
const meta: Meta<LinkArgs> = {
  title: 'Atoms/Link',
  component: 'cor-link',
  argTypes: {
    variant: {
      control: 'select',
      options: LINK_VARIANTS,
      description: 'Color treatment.',
      table: { defaultValue: { summary: 'primary' } },
    },
    size: {
      control: 'select',
      options: LINK_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    underline: {
      control: 'select',
      options: LINK_UNDERLINES,
      description: 'Underline treatment.',
      table: { defaultValue: { summary: 'always' } },
    },
    standalone: {
      control: 'boolean',
      description: 'Block-level standalone affordance with a larger target.',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables interactivity.',
      table: { defaultValue: { summary: 'false' } },
    },
    href: { control: 'text', description: 'Anchor URL. Falls back to `<button>` when absent.' },
    target: {
      control: 'text',
      description: 'Anchor `target` (e.g. `_blank`). Auto-applies `rel` + external indicator.',
    },
    label: { control: 'text', description: 'Link label text.', table: { defaultValue: { summary: 'Link' } } },
  },
};
export default meta;

type Story = StoryObj<LinkArgs>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderLink,
  args: {
    variant: 'primary',
    size: 'md',
    underline: 'always',
    standalone: false,
    disabled: false,
    href: '#',
    target: '',
    label: 'Citește politica de confidențialitate',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: LinkArgs }) => docsSourceDefault(args),
      },
    },
  },
};

export const Inline: Story = {
  render: renderInline,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceInline } },
  },
};

export const AllSizes: Story = {
  render: renderAllSizes,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllSizes } },
  },
};

export const AllVariants: Story = {
  render: renderAllVariants,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllVariants } },
  },
};

export const UnderlineVariations: Story = {
  render: renderUnderlineVariations,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceUnderlineVariations } },
  },
};

export const States: Story = {
  render: renderStates,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceStates } },
  },
};

export const Standalone: Story = {
  render: renderStandalone,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceStandalone } },
  },
};

export const ExternalLink: Story = {
  render: renderExternalLink,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceExternalLink } },
  },
};

export const WithDownload: Story = {
  render: renderWithDownload,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithDownload } },
  },
};

export const Visited: Story = {
  render: renderVisited,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceVisited } },
  },
};

export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceEdgeCases } },
  },
};
