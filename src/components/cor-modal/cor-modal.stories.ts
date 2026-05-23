import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { MODAL_SIZES, MODAL_VARIANTS } from './cor-modal.types';
import type { ModalSize, ModalVariant } from './cor-modal.types';

type ModalArgs = {
  open: boolean;
  size: ModalSize;
  variant: ModalVariant;
  titleText: string;
  closable: boolean;
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  destructive: boolean;
  body: string;
  closeLabel: string;
};

const stageStyle =
  'position: relative; min-block-size: 520px; padding: var(--spacing-24); background: var(--color-background-base-secondary, #f7f7f7); border-radius: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden;';

const triggerRowStyle = 'display: flex; gap: var(--spacing-12); flex-wrap: wrap; align-items: center;';

// Inline script attached to each story that wires the trigger buttons to the
// modals via id. We use plain HTML/DOM so Storybook's "Show code" matches what
// a consumer would actually paste into a project.
const wireTriggersScript = /*html*/ `
  <script>
    (function () {
      const root = document.currentScript.parentElement;
      root.querySelectorAll('[data-modal-open]').forEach(function (trigger) {
        trigger.addEventListener('click', function () {
          const id = trigger.getAttribute('data-modal-open');
          const modal = root.querySelector('#' + id);
          if (modal) modal.setAttribute('open', '');
        });
      });
      root.addEventListener('click', function (e) {
        const target = e.target;
        if (!target) return;
        const closer = target.closest && target.closest('[data-modal-close]');
        if (!closer) return;
        const corBtn = closer.closest && closer.closest('cor-button');
        const modal = (corBtn || closer).closest('cor-modal');
        if (modal) modal.removeAttribute('open');
      });
    })();
  </script>
`;

const renderModal = (args: ModalArgs) => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <cor-button data-modal-open="storybook-modal-default">Deschide modal</cor-button>
    </div>
    <cor-modal
      id="storybook-modal-default"
      ${args.open ? 'open' : ''}
      size="${args.size}"
      variant="${args.variant}"
      ${args.titleText ? `title-text="${args.titleText}"` : ''}
      ${args.closable ? '' : 'closable="false"'}
      ${args.closeOnBackdrop ? '' : 'close-on-backdrop="false"'}
      ${args.closeOnEscape ? '' : 'close-on-escape="false"'}
      ${args.destructive ? 'destructive' : ''}
      close-label="${args.closeLabel}"
    >
      ${args.body}
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Anulează</cor-button>
        <cor-button variant="${args.destructive ? 'destructive' : 'primary'}" shape="circular" data-modal-close>Confirmă</cor-button>
      </div>
    </cor-modal>
    ${wireTriggersScript}
  </div>
`;

const meta: Meta<ModalArgs> = {
  title: 'Molecules/Modal',
  component: 'cor-modal',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: /*md*/ `
**Modal** — overlay dialog for focused decisions and confirmations.

Renders a centered dialog card on a dimmed backdrop using the native
\`<dialog>\` element internally. The native element handles top-layer
rendering, focus trap, and ESC dismissal, so accessibility behavior matches
the platform contract without manual focus juggling.

Three variants control the header treatment:
- \`default\` — title bar + close button (text-only header)
- \`with-image\` — full-bleed hero image header with overlaid close button
- \`with-icon\` — leading 48px icon above the body (no top bar)

Dismissals route through \`corClose\` with a \`reason\` payload — backdrop,
escape, close-button, or action — so consumers can branch on the dismissal
source (e.g. ignore backdrop dismiss for required confirmations).

Set \`destructive\` to add a red top-border accent and pair with a destructive
primary \`cor-button\` in the actions slot for irreversible flows.

Romanian voice: defaults use **Confirmă** / **Anulează** / **Continuă** /
**Închide** — verbs, second-person formal, no exclamation marks.
        `.trim(),
      },
    },
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the modal is shown. Two-way bound — flips back on internal dismiss.',
      table: { defaultValue: { summary: 'false' } },
    },
    size: {
      control: 'inline-radio',
      options: MODAL_SIZES,
      description: 'Visual size rung. Drives max-width and typography scale.',
      table: { defaultValue: { summary: 'md' } },
    },
    variant: {
      control: 'inline-radio',
      options: MODAL_VARIANTS,
      description: 'Header treatment.',
      table: { defaultValue: { summary: 'default' } },
    },
    titleText: {
      name: 'title-text',
      control: 'text',
      description: 'Title text rendered in the header. The `title` slot overrides this when filled.',
    },
    closable: {
      control: 'boolean',
      description: 'Renders the trailing × button.',
      table: { defaultValue: { summary: 'true' } },
    },
    closeOnBackdrop: {
      name: 'close-on-backdrop',
      control: 'boolean',
      description: 'Whether clicking the backdrop dismisses the modal.',
      table: { defaultValue: { summary: 'true' } },
    },
    closeOnEscape: {
      name: 'close-on-escape',
      control: 'boolean',
      description: 'Whether ESC dismisses the modal.',
      table: { defaultValue: { summary: 'true' } },
    },
    destructive: {
      control: 'boolean',
      description: 'Styles the dialog frame for an irreversible action.',
      table: { defaultValue: { summary: 'false' } },
    },
    body: { control: 'text', description: 'Default-slot text content (body copy).' },
    closeLabel: {
      name: 'close-label',
      control: 'text',
      description: 'Accessible label for the × button.',
      table: { defaultValue: { summary: 'Închide' } },
    },
  },
  args: {
    open: true,
    size: 'md',
    variant: 'default',
    titleText: 'Confirmă acțiunea',
    closable: true,
    closeOnBackdrop: true,
    closeOnEscape: true,
    destructive: false,
    body: 'Această acțiune va salva modificările făcute în formular. Continuați?',
    closeLabel: 'Închide',
  },
};
export default meta;

type Story = StoryObj<ModalArgs>;

// ---------------------------------------------------------------------------
// Default — md size, default variant, with title + body + actions
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderModal,
};

// ---------------------------------------------------------------------------
// AllSizes — three triggers, one modal per size selector
//
// Native `<dialog>` in modal mode can only place ONE dialog in the top layer
// at a time. To showcase all three sizes side-by-side we render three trigger
// buttons; clicking each opens the matching-sized modal. The Default story
// already shows the md baseline; this story is the per-size deep-dive.
// ---------------------------------------------------------------------------
const renderAllSizes = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <cor-button shape="circular" size="sm" data-modal-open="storybook-modal-size-sm">Deschide Small</cor-button>
      <cor-button shape="circular" data-modal-open="storybook-modal-size-md">Deschide Medium</cor-button>
      <cor-button shape="circular" data-modal-open="storybook-modal-size-lg">Deschide Large</cor-button>
    </div>
    <cor-modal id="storybook-modal-size-sm" size="sm" title-text="Confirmă plata">
      Suma de 250,00 MDL va fi debitată de pe cardul terminând în ****4521.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" size="sm" data-modal-close>Anulează</cor-button>
        <cor-button variant="primary" shape="circular" size="sm" data-modal-close>Confirmă</cor-button>
      </div>
    </cor-modal>
    <cor-modal id="storybook-modal-size-md" open size="md" title-text="Confirmă plata">
      Suma de 250,00 MDL va fi debitată de pe cardul terminând în ****4521. Veți primi confirmarea pe email în câteva minute.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Anulează</cor-button>
        <cor-button variant="primary" shape="circular" data-modal-close>Confirmă</cor-button>
      </div>
    </cor-modal>
    <cor-modal id="storybook-modal-size-lg" size="lg" title-text="Confirmă plata cumulată">
      Veți confirma plata pentru 4 facturi cumulate, totalizând 1.250,00 MDL. Tranzacția este finală și nu poate fi anulată după confirmare.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Anulează</cor-button>
        <cor-button variant="primary" shape="circular" data-modal-close>Confirmă</cor-button>
      </div>
    </cor-modal>
    ${wireTriggersScript}
  </div>
`;
export const AllSizes: Story = {
  render: renderAllSizes,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// WithImage — full-bleed hero image header
// ---------------------------------------------------------------------------
const renderWithImage = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <cor-button data-modal-open="storybook-modal-with-image">Deschide modal cu imagine</cor-button>
    </div>
    <cor-modal
      id="storybook-modal-with-image"
      open
      size="md"
      variant="with-image"
      title-text="Felicitări"
    >
      <img
        slot="image"
        src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80"
        alt=""
      />
      Contul dumneavoastră a fost confirmat. Puteți accesa serviciile electronice ale statului.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="primary" shape="circular" data-modal-close>Continuă</cor-button>
      </div>
    </cor-modal>
    ${wireTriggersScript}
  </div>
`;
export const WithImage: Story = {
  render: renderWithImage,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// WithIcon — leading 48px icon variant
// ---------------------------------------------------------------------------
const renderWithIcon = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <cor-button data-modal-open="storybook-modal-with-icon">Deschide modal cu iconiță</cor-button>
    </div>
    <cor-modal
      id="storybook-modal-with-icon"
      open
      size="md"
      variant="with-icon"
      title-text="Sesiunea a expirat"
    >
      <cor-icon slot="icon" name="circle-info-filled" size="48" color="currentColor"></cor-icon>
      Reconectați-vă pentru a continua. Modificările nesalvate au fost pierdute.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="primary" shape="circular" data-modal-close>Reconectare</cor-button>
      </div>
    </cor-modal>
    ${wireTriggersScript}
  </div>
`;
export const WithIcon: Story = {
  render: renderWithIcon,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// Confirmation — typical two-action confirmation modal
// ---------------------------------------------------------------------------
const renderConfirmation = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <cor-button data-modal-open="storybook-modal-confirmation">Salvează modificările</cor-button>
    </div>
    <cor-modal
      id="storybook-modal-confirmation"
      open
      size="md"
      title-text="Salvează modificările"
    >
      Modificările vor fi salvate și aplicate imediat. Doriți să continuați?
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Anulează</cor-button>
        <cor-button variant="primary" shape="circular" data-modal-close>Salvează</cor-button>
      </div>
    </cor-modal>
    ${wireTriggersScript}
  </div>
`;
export const Confirmation: Story = {
  render: renderConfirmation,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// Destructive — irreversible action confirmation
// ---------------------------------------------------------------------------
const renderDestructive = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <cor-button variant="destructive" data-modal-open="storybook-modal-destructive">Șterge contul</cor-button>
    </div>
    <cor-modal
      id="storybook-modal-destructive"
      open
      size="md"
      destructive
      title-text="Șterge contul definitiv"
      close-on-backdrop="false"
    >
      Această acțiune este irevocabilă. Toate datele asociate contului vor fi șterse permanent și nu pot fi recuperate.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Anulează</cor-button>
        <cor-button variant="destructive" shape="circular" data-modal-close>Șterge definitiv</cor-button>
      </div>
    </cor-modal>
    ${wireTriggersScript}
  </div>
`;
export const Destructive: Story = {
  render: renderDestructive,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// DisableEscape — required confirmation flow (no backdrop / ESC dismissal)
// ---------------------------------------------------------------------------
const renderDisableEscape = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <cor-button data-modal-open="storybook-modal-required">Confirmare obligatorie</cor-button>
    </div>
    <cor-modal
      id="storybook-modal-required"
      open
      size="md"
      title-text="Acceptați termenii și condițiile"
      close-on-backdrop="false"
      close-on-escape="false"
      closable="false"
    >
      Pentru a continua, trebuie să acceptați termenii și condițiile actualizate. Această confirmare este obligatorie.
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Refuz</cor-button>
        <cor-button variant="primary" shape="circular" data-modal-close>Accept</cor-button>
      </div>
    </cor-modal>
    ${wireTriggersScript}
  </div>
`;
export const DisableEscape: Story = {
  render: renderDisableEscape,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// CustomContent — rich body content (form fields, lists)
// ---------------------------------------------------------------------------
const renderCustomContent = () => /*html*/ `
  <div style="${stageStyle}">
    <div style="${triggerRowStyle}">
      <cor-button data-modal-open="storybook-modal-custom">Editează profilul</cor-button>
    </div>
    <cor-modal
      id="storybook-modal-custom"
      open
      size="md"
      title-text="Editează profilul"
    >
      <p style="margin: 0 0 var(--spacing-16) 0;">Actualizați informațiile personale înainte de a continua.</p>
      <ul style="margin: 0; padding-inline-start: 20px; display: flex; flex-direction: column; gap: var(--spacing-8);">
        <li>Nume complet</li>
        <li>Adresă email validată</li>
        <li>Număr de telefon</li>
        <li>Adresă poștală</li>
      </ul>
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Anulează</cor-button>
        <cor-button variant="primary" shape="circular" data-modal-close>Salvează</cor-button>
      </div>
    </cor-modal>
    ${wireTriggersScript}
  </div>
`;
export const CustomContent: Story = {
  render: renderCustomContent,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// Mobile — narrow viewport (350px stage simulates mobile)
// ---------------------------------------------------------------------------
const renderMobile = () => /*html*/ `
  <div style="${stageStyle} inline-size: 360px; max-inline-size: 360px; min-block-size: 480px;">
    <cor-modal
      open
      size="sm"
      title-text="Confirmă plata"
      style="position: relative;"
    >
      Suma de 125,00 MDL va fi debitată acum. Confirmați tranzacția?
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" size="sm" data-modal-close>Anulează</cor-button>
        <cor-button variant="primary" shape="circular" size="sm" data-modal-close>Confirmă</cor-button>
      </div>
    </cor-modal>
  </div>
`;
export const Mobile: Story = {
  render: renderMobile,
  parameters: {
    controls: { disable: true },
    viewport: { defaultViewport: 'mobile1' },
  },
};

// ---------------------------------------------------------------------------
// EdgeCases — very long content scrolls inside modal, diacritics preserved
// ---------------------------------------------------------------------------
const renderEdgeCases = () => /*html*/ `
  <div style="${stageStyle} min-block-size: 720px;">
    <div style="${triggerRowStyle}">
      <cor-button data-modal-open="storybook-modal-long">Conținut lung — scroll intern</cor-button>
    </div>
    <cor-modal
      id="storybook-modal-long"
      open
      size="md"
      title-text="Termeni și condiții actualizate"
    >
      <p style="margin: 0 0 var(--spacing-12) 0;">Am actualizat termenii și condițiile platformei. Modificările intră în vigoare începând cu 1 iunie 2026 și includ următoarele:</p>
      <ol style="margin: 0 0 var(--spacing-12) 0; padding-inline-start: 20px; display: flex; flex-direction: column; gap: var(--spacing-8);">
        <li>Actualizări privind procesarea plăților electronice și a returnărilor.</li>
        <li>Drepturile utilizatorilor în privința portării datelor personale între servicii.</li>
        <li>Politica de confidențialitate revizuită — colectare minimă, păstrare limitată.</li>
        <li>Modul în care colectăm și utilizăm datele personale pentru autentificare federată.</li>
        <li>Procedura de ștergere a contului și termenele asociate.</li>
        <li>Noile cerințe de validare a identității pentru tranzacțiile peste 5.000 MDL.</li>
        <li>Reguli privind sesiunile concurente și deconectarea automată.</li>
        <li>Actualizări privind acceptarea cookie-urilor și a tehnologiilor similare.</li>
        <li>Mecanismul de notificare a modificărilor viitoare ale termenilor.</li>
        <li>Drepturile utilizatorilor în Republica Moldova privind protecția datelor.</li>
      </ol>
      <p style="margin: 0 0 var(--spacing-12) 0;">Diacriticele românești (ă â î ș ț) sunt suportate complet în titluri și corpul textului. Înălțimea modalului este limitată la viewport pentru a permite scroll intern fără a împinge butoanele de acțiune sub fold.</p>
      <p style="margin: 0;">Confirmați citirea pentru a continua.</p>
      <div slot="actions" style="display: inline-flex; gap: var(--spacing-8);">
        <cor-button variant="strict" appearance="outlined" shape="circular" data-modal-close>Refuz</cor-button>
        <cor-button variant="primary" shape="circular" data-modal-close>Accept termenii</cor-button>
      </div>
    </cor-modal>
    ${wireTriggersScript}
  </div>
`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: { controls: { disable: true } },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<cor-modal>Coverage</cor-modal>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('cor-modal') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('cor-modal constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
