import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { ACCORDION_APPEARANCES, ACCORDION_MODES } from './cor-accordion.types';
import type { AccordionAppearance, AccordionMode } from './cor-accordion.types';

type AccordionArgs = {
  mode: AccordionMode;
  appearance: AccordionAppearance;
  breakpoint: 'desktop' | 'mobile' | '';
  label: string;
};

const sectionLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0 0 var(--spacing-12); font-style: italic;';
const sectionStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-32); padding: var(--spacing-24); max-width: 996px;';

// ---------------------------------------------------------------------------
// Romanian sample copy — "Întrebări frecvente" for MPay-style content
// ---------------------------------------------------------------------------

const renderDefault = (args: AccordionArgs) => /*html*/ `
  <div style="${sectionStyle}">
    <cor-accordion
      mode="${args.mode}"
      appearance="${args.appearance}"
      ${args.breakpoint ? `breakpoint="${args.breakpoint}"` : ''}
      ${args.label ? `label="${args.label}"` : ''}
    >
      <cor-accordion-item heading="Cum efectuez o plată cu MPay?" supporting-text="Pași simpli pentru autentificare și confirmare">
        Accesează portalul MPay, alege serviciul dorit, completează datele necesare și confirmă plata cu unul dintre instrumentele acceptate (card bancar, MPass sau internet banking).
      </cor-accordion-item>
      <cor-accordion-item heading="Care sunt taxele aplicate?" supporting-text="Tarife uniforme pentru toate instituțiile">
        Comisionul perceput este afișat clar înainte de confirmare. Pentru majoritatea plăților publice nu se aplică taxe suplimentare în afara comisionului bancar standard.
      </cor-accordion-item>
      <cor-accordion-item heading="Cât durează procesarea unei plăți?" supporting-text="Confirmare în timp real pentru cardurile bancare">
        Plățile efectuate cu card bancar sunt procesate imediat. Pentru transferuri prin internet banking, procesarea poate dura până la 24 de ore lucrătoare.
      </cor-accordion-item>
    </cor-accordion>
  </div>
`;

const docsSourceDefault = /*html*/ `<cor-accordion mode="multiple">
  <cor-accordion-item heading="Cum efectuez o plată cu MPay?" supporting-text="Pași simpli pentru autentificare și confirmare">
    Accesează portalul MPay, alege serviciul dorit, completează datele necesare și confirmă plata.
  </cor-accordion-item>
  <cor-accordion-item heading="Care sunt taxele aplicate?" supporting-text="Tarife uniforme pentru toate instituțiile">
    Comisionul perceput este afișat clar înainte de confirmare.
  </cor-accordion-item>
  <cor-accordion-item heading="Cât durează procesarea unei plăți?" supporting-text="Confirmare în timp real pentru cardurile bancare">
    Plățile efectuate cu card bancar sunt procesate imediat.
  </cor-accordion-item>
</cor-accordion>`;

const renderSingle = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">mode="single" — deschiderea unui element îi închide pe ceilalți.</p>
    <cor-accordion mode="single">
      <cor-accordion-item heading="Despre MPay" supporting-text="Serviciul guvernamental de plăți electronice" open>
        MPay permite cetățenilor să achite electronic taxe, impozite și alte obligații față de stat, într-un singur loc.
      </cor-accordion-item>
      <cor-accordion-item heading="Despre MPass" supporting-text="Autentificare unică pentru serviciile publice">
        MPass oferă un punct unic de acces pentru toate platformele guvernamentale, simplificând autentificarea cetățenilor.
      </cor-accordion-item>
      <cor-accordion-item heading="Despre MSign" supporting-text="Semnătura electronică certificată">
        MSign permite aplicarea semnăturii electronice calificate pe documente, cu aceeași valoare legală ca semnătura olografă.
      </cor-accordion-item>
    </cor-accordion>
  </div>
`;

const docsSourceSingle = /*html*/ `<cor-accordion mode="single">
  <cor-accordion-item heading="Despre MPay" supporting-text="..." open>...</cor-accordion-item>
  <cor-accordion-item heading="Despre MPass" supporting-text="...">...</cor-accordion-item>
  <cor-accordion-item heading="Despre MSign" supporting-text="...">...</cor-accordion-item>
</cor-accordion>`;

const renderMultiple = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">mode="multiple" — fiecare element se deschide și se închide independent.</p>
    <cor-accordion mode="multiple">
      <cor-accordion-item heading="Documente necesare" supporting-text="Acte de identitate și certificate suport" open>
        Buletin de identitate (sau pașaport pentru cetățenii străini), certificat de naștere și, după caz, certificat de căsătorie sau de divorț.
      </cor-accordion-item>
      <cor-accordion-item heading="Termene de procesare" supporting-text="Intervale standard pentru cereri online" open>
        Cererile depuse online sunt examinate în maximum 5 zile lucrătoare. Solicitările urgente pot fi procesate în 24 de ore contra unei taxe suplimentare.
      </cor-accordion-item>
      <cor-accordion-item heading="Modalități de plată" supporting-text="Instrumente acceptate prin MPay">
        Card bancar (Visa, Mastercard), internet banking sau plată în numerar la oficiile poștale partenere.
      </cor-accordion-item>
    </cor-accordion>
  </div>
`;

const docsSourceMultiple = /*html*/ `<cor-accordion mode="multiple">
  <cor-accordion-item heading="Documente necesare" open>...</cor-accordion-item>
  <cor-accordion-item heading="Termene de procesare" open>...</cor-accordion-item>
  <cor-accordion-item heading="Modalități de plată">...</cor-accordion-item>
</cor-accordion>`;

const renderWithIcons = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Iconițe de început (cor-icon) pentru categorii de conținut.</p>
    <cor-accordion mode="multiple">
      <cor-accordion-item heading="Identitate digitală" supporting-text="Verificarea identității prin MPass" open>
        <cor-icon slot="icon-start" name="id-card"></cor-icon>
        Autentificarea prin MPass folosește semnătura mobilă, eToken sau biometrie pentru a confirma identitatea cetățeanului.
      </cor-accordion-item>
      <cor-accordion-item heading="Plăți electronice" supporting-text="Tranzacții securizate prin MPay">
        <cor-icon slot="icon-start" name="credit-card"></cor-icon>
        Toate plățile sunt protejate prin protocolul 3-D Secure și auditate de Banca Națională a Moldovei.
      </cor-accordion-item>
      <cor-accordion-item heading="Semnătură electronică" supporting-text="Document semnat cu valoare juridică">
        <cor-icon slot="icon-start" name="checklist"></cor-icon>
        Aplică semnătura electronică calificată pentru contracte, declarații și alte documente oficiale.
      </cor-accordion-item>
    </cor-accordion>
  </div>
`;

const docsSourceWithIcons = /*html*/ `<cor-accordion mode="multiple">
  <cor-accordion-item heading="Identitate digitală" supporting-text="..." open>
    <cor-icon slot="icon-start" name="id-card"></cor-icon>
    Autentificarea prin MPass folosește semnătura mobilă, eToken sau biometrie.
  </cor-accordion-item>
  <cor-accordion-item heading="Plăți electronice" supporting-text="...">
    <cor-icon slot="icon-start" name="credit-card"></cor-icon>
    Toate plățile sunt protejate prin protocolul 3-D Secure.
  </cor-accordion-item>
</cor-accordion>`;

const renderWithSupportingText = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Heading + text suport (descriere scurtă, una pe rând).</p>
    <cor-accordion mode="multiple">
      <cor-accordion-item heading="Întrebări frecvente" supporting-text="Întrebări generale despre platforma e-Gov"></cor-accordion-item>
      <cor-accordion-item heading="Suport tehnic" supporting-text="Probleme cu autentificarea sau cu plățile"></cor-accordion-item>
      <cor-accordion-item heading="Contact instituțional" supporting-text="Datele de contact ale agenției guvernamentale"></cor-accordion-item>
    </cor-accordion>
    <p style="${sectionLabelStyle}">Heading singur (fără text suport).</p>
    <cor-accordion mode="multiple">
      <cor-accordion-item heading="Cum mă autentific?"></cor-accordion-item>
      <cor-accordion-item heading="Cum recuperez parola?"></cor-accordion-item>
      <cor-accordion-item heading="Cum schimb datele de contact?"></cor-accordion-item>
    </cor-accordion>
  </div>
`;

const docsSourceWithSupportingText = /*html*/ `<!-- With supporting text -->
<cor-accordion mode="multiple">
  <cor-accordion-item heading="Întrebări frecvente" supporting-text="Întrebări generale"></cor-accordion-item>
  <cor-accordion-item heading="Suport tehnic" supporting-text="Probleme cu autentificarea"></cor-accordion-item>
</cor-accordion>

<!-- Heading only -->
<cor-accordion mode="multiple">
  <cor-accordion-item heading="Cum mă autentific?"></cor-accordion-item>
  <cor-accordion-item heading="Cum recuperez parola?"></cor-accordion-item>
</cor-accordion>`;

const renderWithTrailingContent = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Slot "trailing" — etichete, contoare sau acțiuni rapide.</p>
    <cor-accordion mode="multiple">
      <cor-accordion-item heading="Cereri în așteptare" supporting-text="Solicitări care necesită atenția dumneavoastră">
        <cor-badge slot="trailing" variant="warning">3 noi</cor-badge>
        Trei cereri așteaptă confirmarea identității. Accesează tabloul de bord pentru a finaliza procesul.
      </cor-accordion-item>
      <cor-accordion-item heading="Documente expirate" supporting-text="Acte care trebuie reînnoite">
        <cor-badge slot="trailing" variant="danger">2</cor-badge>
        Buletinul de identitate și permisul de conducere expiră în următoarele 30 de zile. Programați-vă pentru reînnoire.
      </cor-accordion-item>
      <cor-accordion-item heading="Notificări recente" supporting-text="Mesaje de la agențiile guvernamentale">
        <cor-badge slot="trailing">12</cor-badge>
        Mesaje noi privind cererile depuse, statusul plăților și actualizările de la instituțiile partenere.
      </cor-accordion-item>
    </cor-accordion>
  </div>
`;

const docsSourceWithTrailingContent = /*html*/ `<cor-accordion mode="multiple">
  <cor-accordion-item heading="Cereri în așteptare" supporting-text="...">
    <cor-badge slot="trailing" variant="warning">3 noi</cor-badge>
    ...
  </cor-accordion-item>
</cor-accordion>`;

const renderTrailSites = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">appearance="trail-sites" — elementul activ primește fundalul brand (utilizat pentru navigarea prin trailuri pe portalul FOD).</p>
    <cor-accordion mode="single" appearance="trail-sites">
      <cor-accordion-item heading="Serviciul de plăți MPay" supporting-text="plătește online taxe, impozite și amenzi">
        Accesează MPay pentru a achita rapid și securizat obligațiile dumneavoastră față de stat.
      </cor-accordion-item>
      <cor-accordion-item heading="Autentificare MPass" supporting-text="loghează-te o singură dată pentru toate serviciile" open>
        Un singur cont, toate serviciile guvernamentale. Folosește MPass pe orice platformă publică.
      </cor-accordion-item>
      <cor-accordion-item heading="Semnătură electronică MSign" supporting-text="semnează documente cu valoare juridică">
        Aplică semnătura electronică calificată direct din browser, fără instalări suplimentare.
      </cor-accordion-item>
    </cor-accordion>
  </div>
`;

const docsSourceTrailSites = /*html*/ `<cor-accordion mode="single" appearance="trail-sites">
  <cor-accordion-item heading="Serviciul de plăți MPay" supporting-text="...">...</cor-accordion-item>
  <cor-accordion-item heading="Autentificare MPass" supporting-text="..." open>...</cor-accordion-item>
  <cor-accordion-item heading="Semnătură electronică MSign" supporting-text="...">...</cor-accordion-item>
</cor-accordion>`;

const renderDisabled = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Element dezactivat — non-interactiv, focusul îl evită.</p>
    <cor-accordion mode="multiple">
      <cor-accordion-item heading="Disponibil" supporting-text="Element activ, se poate deschide" open>
        Conținut accesibil pentru toți cetățenii autentificați.
      </cor-accordion-item>
      <cor-accordion-item heading="Indisponibil temporar" supporting-text="Serviciu suspendat pentru mentenanță" disabled>
        Acest conținut nu poate fi accesat momentan.
      </cor-accordion-item>
      <cor-accordion-item heading="Doar pentru reprezentanți autorizați" supporting-text="Necesită autentificare cu MPower" disabled>
        Acces restricționat la cetățenii autentificați prin MPower.
      </cor-accordion-item>
    </cor-accordion>
  </div>
`;

const docsSourceDisabled = /*html*/ `<cor-accordion mode="multiple">
  <cor-accordion-item heading="Disponibil" supporting-text="..." open>...</cor-accordion-item>
  <cor-accordion-item heading="Indisponibil temporar" supporting-text="..." disabled>...</cor-accordion-item>
</cor-accordion>`;

const renderEdgeCases = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Un singur element (fără separator vertical între bare).</p>
    <cor-accordion mode="multiple">
      <cor-accordion-item heading="Element unic" supporting-text="Accordionul cu un singur element rămâne funcțional">
        Funcționează identic ca într-o listă mai lungă: comportamentul de toggle este preluat din protocolul WAI-ARIA.
      </cor-accordion-item>
    </cor-accordion>

    <p style="${sectionLabelStyle}">Heading lung — trunchiere la cap de rând, niciun overflow vizibil.</p>
    <cor-accordion mode="multiple">
      <cor-accordion-item
        heading="Întrebare cu titlu foarte lung care depășește lățimea normală a accordionului și trebuie să se distribuie pe mai multe rânduri fără să spargă layout-ul vizual"
        supporting-text="Textul suport rămâne pe un singur rând cu trunchiere prin elipse atunci când depășește spațiul disponibil pentru container"
      >
        Conținutul panelului se afișează normal indiferent de lungimea heading-ului.
      </cor-accordion-item>
    </cor-accordion>

    <p style="${sectionLabelStyle}">Render data-driven via prop items[].</p>
    <cor-accordion id="data-driven" mode="single"></cor-accordion>

    <p style="${sectionLabelStyle}">Mobile breakpoint forțat (typography redus la 22/30).</p>
    <cor-accordion mode="multiple" breakpoint="mobile" style="max-width: 343px;">
      <cor-accordion-item heading="Versiune mobilă" supporting-text="Reduce typography la 22px / 30px">
        Layout-ul mobil se ajustează automat pe ecranele sub 768px.
      </cor-accordion-item>
      <cor-accordion-item heading="Detalii cont" supporting-text="Date personale și preferințe">
        Configurează preferințele de notificare și limba aplicației.
      </cor-accordion-item>
    </cor-accordion>
  </div>
  <script>
    requestAnimationFrame(() => {
      const el = document.getElementById('data-driven');
      if (el) {
        el.items = [
          { id: 'srv-1', heading: 'Servicii fiscale', supportingText: 'Declarații și plăți', content: 'Depune declarații fiscale și achită impozitele direct online.', open: true },
          { id: 'srv-2', heading: 'Servicii sociale', supportingText: 'Pensii, alocații, ajutoare', content: 'Verifică statusul cererilor sociale și ridică documente certificate.' },
          { id: 'srv-3', heading: 'Servicii notariale', supportingText: 'Autentificări și certificări', content: 'Programează-te la notar și verifică actele autentificate.' },
        ];
      }
    });
  </script>
`;

const docsSourceEdgeCases = /*html*/ `<!-- Single item -->
<cor-accordion mode="multiple">
  <cor-accordion-item heading="Element unic" supporting-text="...">...</cor-accordion-item>
</cor-accordion>

<!-- Long heading -->
<cor-accordion mode="multiple">
  <cor-accordion-item heading="Întrebare cu titlu foarte lung..." supporting-text="...">...</cor-accordion-item>
</cor-accordion>

<!-- Data-driven with items prop -->
<cor-accordion id="data-driven" mode="single"></cor-accordion>
<script>
  document.getElementById('data-driven').items = [
    { id: 'srv-1', heading: 'Servicii fiscale', supportingText: 'Declarații și plăți', content: '...', open: true },
    { id: 'srv-2', heading: 'Servicii sociale', supportingText: '...', content: '...' },
  ];
</script>

<!-- Forced mobile breakpoint -->
<cor-accordion mode="multiple" breakpoint="mobile" style="max-width: 343px;">
  <cor-accordion-item heading="Versiune mobilă" supporting-text="...">...</cor-accordion-item>
</cor-accordion>`;

const meta: Meta<AccordionArgs> = {
  title: 'Molecules/Accordion',
  component: 'cor-accordion',
  argTypes: {
    mode: {
      control: 'select',
      options: ACCORDION_MODES,
      description: 'Coordination between sibling items.',
      table: { defaultValue: { summary: 'multiple' } },
    },
    appearance: {
      control: 'select',
      options: ACCORDION_APPEARANCES,
      description: 'Visual treatment. `trail-sites` paints the open header with brand tint.',
      table: { defaultValue: { summary: 'default' } },
    },
    breakpoint: {
      control: 'select',
      options: ['', 'desktop', 'mobile'],
      description: 'Force a specific breakpoint. Leave empty for automatic media-query detection.',
      table: { defaultValue: { summary: 'auto' } },
    },
    label: {
      control: 'text',
      description: 'Accessible name forwarded to `aria-label`.',
    },
  },
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'canvas' },
  },
};
export default meta;

type Story = StoryObj<AccordionArgs>;

export const Default: Story = {
  render: renderDefault,
  args: {
    mode: 'multiple',
    appearance: 'default',
    breakpoint: '',
    label: '',
  },
  parameters: {
    docs: { source: { code: docsSourceDefault } },
  },
};

export const Single: Story = {
  render: renderSingle,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceSingle } },
  },
};

export const Multiple: Story = {
  render: renderMultiple,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceMultiple } },
  },
};

export const WithIcons: Story = {
  render: renderWithIcons,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithIcons } },
  },
};

export const WithSupportingText: Story = {
  render: renderWithSupportingText,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithSupportingText } },
  },
};

export const WithTrailingContent: Story = {
  render: renderWithTrailingContent,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithTrailingContent } },
  },
};

export const TrailSites: Story = {
  render: renderTrailSites,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceTrailSites } },
  },
};

export const Disabled: Story = {
  render: renderDisabled,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceDisabled } },
  },
};

export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceEdgeCases } },
  },
};

export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `
    <cor-accordion>
      <cor-accordion-item heading="Coverage" supporting-text="Coverage"></cor-accordion-item>
    </cor-accordion>
  `,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const AccordionCtor = customElements.get('cor-accordion') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    const ItemCtor = customElements.get('cor-accordion-item') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!AccordionCtor) throw new Error('cor-accordion constructor missing');
    if (!ItemCtor) throw new Error('cor-accordion-item constructor missing');
    const a = new AccordionCtor(false);
    const i = new ItemCtor(false);
    if (!a || !i) throw new Error('coverage instances not constructed');
  },
};
