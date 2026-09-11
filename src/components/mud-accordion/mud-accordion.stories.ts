import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { ACCORDION_APPEARANCES, ACCORDION_MODES } from './mud-accordion.types';
import type { AccordionAppearance, AccordionMode } from './mud-accordion.types';

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
    <mud-accordion
      mode="${args.mode}"
      appearance="${args.appearance}"
      ${args.breakpoint ? `breakpoint="${args.breakpoint}"` : ''}
      ${args.label ? `label="${args.label}"` : ''}
    >
      <mud-accordion-item heading="Cum efectuez o plată cu MPay?" supporting-text="Pași simpli pentru autentificare și confirmare">
        Accesează portalul MPay, alege serviciul dorit, completează datele necesare și confirmă plata cu unul dintre instrumentele acceptate (card bancar, MPass sau internet banking).
      </mud-accordion-item>
      <mud-accordion-item heading="Care sunt taxele aplicate?" supporting-text="Tarife uniforme pentru toate instituțiile">
        Comisionul perceput este afișat clar înainte de confirmare. Pentru majoritatea plăților publice nu se aplică taxe suplimentare în afara comisionului bancar standard.
      </mud-accordion-item>
      <mud-accordion-item heading="Cât durează procesarea unei plăți?" supporting-text="Confirmare în timp real pentru cardurile bancare">
        Plățile efectuate cu card bancar sunt procesate imediat. Pentru transferuri prin internet banking, procesarea poate dura până la 24 de ore lucrătoare.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceDefault = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Cum efectuez o plată cu MPay?" supporting-text="Pași simpli pentru autentificare și confirmare">
    Accesează portalul MPay, alege serviciul dorit, completează datele necesare și confirmă plata.
  </mud-accordion-item>
  <mud-accordion-item heading="Care sunt taxele aplicate?" supporting-text="Tarife uniforme pentru toate instituțiile">
    Comisionul perceput este afișat clar înainte de confirmare.
  </mud-accordion-item>
  <mud-accordion-item heading="Cât durează procesarea unei plăți?" supporting-text="Confirmare în timp real pentru cardurile bancare">
    Plățile efectuate cu card bancar sunt procesate imediat.
  </mud-accordion-item>
</mud-accordion>`;

const renderSingle = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">mode="single" — deschiderea unui element îi închide pe ceilalți.</p>
    <mud-accordion mode="single">
      <mud-accordion-item heading="Despre MPay" supporting-text="Serviciul guvernamental de plăți electronice" open>
        MPay permite cetățenilor să achite electronic taxe, impozite și alte obligații față de stat, într-un singur loc.
      </mud-accordion-item>
      <mud-accordion-item heading="Despre MPass" supporting-text="Autentificare unică pentru serviciile publice">
        MPass oferă un punct unic de acces pentru toate platformele guvernamentale, simplificând autentificarea cetățenilor.
      </mud-accordion-item>
      <mud-accordion-item heading="Despre MSign" supporting-text="Semnătura electronică certificată">
        MSign permite aplicarea semnăturii electronice calificate pe documente, cu aceeași valoare legală ca semnătura olografă.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceSingle = /*html*/ `<mud-accordion mode="single">
  <mud-accordion-item heading="Despre MPay" supporting-text="..." open>...</mud-accordion-item>
  <mud-accordion-item heading="Despre MPass" supporting-text="...">...</mud-accordion-item>
  <mud-accordion-item heading="Despre MSign" supporting-text="...">...</mud-accordion-item>
</mud-accordion>`;

const renderMultiple = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">mode="multiple" — fiecare element se deschide și se închide independent.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Documente necesare" supporting-text="Acte de identitate și certificate suport" open>
        Buletin de identitate (sau pașaport pentru cetățenii străini), certificat de naștere și, după caz, certificat de căsătorie sau de divorț.
      </mud-accordion-item>
      <mud-accordion-item heading="Termene de procesare" supporting-text="Intervale standard pentru cereri online" open>
        Cererile depuse online sunt examinate în maximum 5 zile lucrătoare. Solicitările urgente pot fi procesate în 24 de ore contra unei taxe suplimentare.
      </mud-accordion-item>
      <mud-accordion-item heading="Modalități de plată" supporting-text="Instrumente acceptate prin MPay">
        Card bancar (Visa, Mastercard), internet banking sau plată în numerar la oficiile poștale partenere.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceMultiple = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Documente necesare" open>...</mud-accordion-item>
  <mud-accordion-item heading="Termene de procesare" open>...</mud-accordion-item>
  <mud-accordion-item heading="Modalități de plată">...</mud-accordion-item>
</mud-accordion>`;

const renderWithIcons = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Iconițe de început (mud-icon) pentru categorii de conținut.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Identitate digitală" supporting-text="Verificarea identității prin MPass" open>
        <mud-icon slot="icon-start" name="id-card"></mud-icon>
        Autentificarea prin MPass folosește semnătura mobilă, eToken sau biometrie pentru a confirma identitatea cetățeanului.
      </mud-accordion-item>
      <mud-accordion-item heading="Plăți electronice" supporting-text="Tranzacții securizate prin MPay">
        <mud-icon slot="icon-start" name="credit-card"></mud-icon>
        Toate plățile sunt protejate prin protocolul 3-D Secure și auditate de Banca Națională a Moldovei.
      </mud-accordion-item>
      <mud-accordion-item heading="Semnătură electronică" supporting-text="Document semnat cu valoare juridică">
        <mud-icon slot="icon-start" name="checklist"></mud-icon>
        Aplică semnătura electronică calificată pentru contracte, declarații și alte documente oficiale.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceWithIcons = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Identitate digitală" supporting-text="..." open>
    <mud-icon slot="icon-start" name="id-card"></mud-icon>
    Autentificarea prin MPass folosește semnătura mobilă, eToken sau biometrie.
  </mud-accordion-item>
  <mud-accordion-item heading="Plăți electronice" supporting-text="...">
    <mud-icon slot="icon-start" name="credit-card"></mud-icon>
    Toate plățile sunt protejate prin protocolul 3-D Secure.
  </mud-accordion-item>
</mud-accordion>`;

const renderWithSupportingText = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Heading + text suport (descriere scurtă, una pe rând).</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Întrebări frecvente" supporting-text="Întrebări generale despre platforma e-Gov">
        Găsești răspunsuri la cele mai frecvente întrebări despre serviciile electronice guvernamentale, autentificare și plăți.
      </mud-accordion-item>
      <mud-accordion-item heading="Suport tehnic" supporting-text="Probleme cu autentificarea sau cu plățile">
        Echipa de suport este disponibilă de luni până vineri, între orele 8:00 și 17:00, pentru probleme legate de autentificare sau procesarea plăților.
      </mud-accordion-item>
      <mud-accordion-item heading="Contact instituțional" supporting-text="Datele de contact ale agenției guvernamentale">
        Agenția de Guvernare Electronică, Piața Marii Adunări Naționale 1, Chișinău. Telefon: 022 820 000.
      </mud-accordion-item>
    </mud-accordion>
    <p style="${sectionLabelStyle}">Heading singur (fără text suport).</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Cum mă autentific?">
        Accesează butonul de autentificare și folosește MPass, semnătura mobilă sau buletinul electronic pentru a-ți confirma identitatea.
      </mud-accordion-item>
      <mud-accordion-item heading="Cum recuperez parola?">
        Folosește opțiunea de recuperare a parolei și urmează pașii primiți prin e-mail sau prin numărul de telefon înregistrat.
      </mud-accordion-item>
      <mud-accordion-item heading="Cum schimb datele de contact?">
        Accesează secțiunea Profil din contul tău și actualizează adresa de e-mail sau numărul de telefon.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceWithSupportingText = /*html*/ `<!-- With supporting text -->
<mud-accordion mode="multiple">
  <mud-accordion-item heading="Întrebări frecvente" supporting-text="Întrebări generale">
    Găsești răspunsuri la cele mai frecvente întrebări despre serviciile electronice.
  </mud-accordion-item>
  <mud-accordion-item heading="Suport tehnic" supporting-text="Probleme cu autentificarea">
    Echipa de suport este disponibilă de luni până vineri, între orele 8:00 și 17:00.
  </mud-accordion-item>
</mud-accordion>

<!-- Heading only -->
<mud-accordion mode="multiple">
  <mud-accordion-item heading="Cum mă autentific?">
    Folosește MPass, semnătura mobilă sau buletinul electronic pentru a-ți confirma identitatea.
  </mud-accordion-item>
  <mud-accordion-item heading="Cum recuperez parola?">
    Folosește opțiunea de recuperare a parolei și urmează pașii primiți prin e-mail.
  </mud-accordion-item>
</mud-accordion>`;

const renderWithTrailingContent = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Slot "trailing" — etichete, contoare sau acțiuni rapide.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Cereri în așteptare" supporting-text="Solicitări care necesită atenția dumneavoastră">
        <mud-badge slot="trailing" variant="warning">3 noi</mud-badge>
        Trei cereri așteaptă confirmarea identității. Accesează tabloul de bord pentru a finaliza procesul.
      </mud-accordion-item>
      <mud-accordion-item heading="Documente expirate" supporting-text="Acte care trebuie reînnoite">
        <mud-badge slot="trailing" variant="danger">2</mud-badge>
        Buletinul de identitate și permisul de conducere expiră în următoarele 30 de zile. Programați-vă pentru reînnoire.
      </mud-accordion-item>
      <mud-accordion-item heading="Notificări recente" supporting-text="Mesaje de la agențiile guvernamentale">
        <mud-badge slot="trailing">12</mud-badge>
        Mesaje noi privind cererile depuse, statusul plăților și actualizările de la instituțiile partenere.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceWithTrailingContent = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Cereri în așteptare" supporting-text="...">
    <mud-badge slot="trailing" variant="warning">3 noi</mud-badge>
    ...
  </mud-accordion-item>
</mud-accordion>`;

// ---------------------------------------------------------------------------
// Panel list — matches the Figma "expanded" state: the open panel reveals a
// list of rows, each with a heading + supporting text and a trailing label.
// The label is dropped below the 768px breakpoint, per the mobile design.
// ---------------------------------------------------------------------------

const panelListStyles = /*css*/ `
  .mud-accordion-panel-list {
    display: flex;
    flex-direction: column;
    /* Rows separated by whitespace only — no dividers, per the design. */
    gap: var(--spacing-32);
    /* Inset is provided by the accordion panel itself (panel-inner). */
  }
  .mud-accordion-panel-row {
    display: flex;
    /* Label is vertically centered on the heading + supporting block. */
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-16);
  }
  .mud-accordion-panel-row__text {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-8);
    min-inline-size: 0;
  }
  .mud-accordion-panel-row__label {
    flex-shrink: 0;
  }
  .mud-accordion-panel-row__heading {
    font-family: var(--font-family-primary);
    font-size: var(--font-size-16);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-24);
    color: var(--color-text-base-default);
  }
  .mud-accordion-panel-row__supporting {
    font-family: var(--font-family-primary);
    font-size: var(--font-size-14);
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-20);
    color: var(--color-text-base-tertiary);
  }
  @media (max-width: 767.98px) {
    .mud-accordion-panel-row__label {
      display: none;
    }
  }
`;

const panelRows = [
  { heading: 'Buletin de identitate', supporting: 'Act de identitate valabil la data depunerii', label: 'Obligatoriu' },
  { heading: 'Certificat de naștere', supporting: 'Eliberat de oficiul stării civile', label: 'Obligatoriu' },
  { heading: 'Certificat de căsătorie', supporting: 'După caz, pentru persoanele căsătorite', label: 'Opțional' },
  { heading: 'Certificat de divorț', supporting: 'După caz, pentru persoanele divorțate', label: 'Opțional' },
  { heading: 'Pașaport', supporting: 'Doar pentru cetățenii străini', label: 'Alternativ' },
];

const renderPanelRows = (rows: typeof panelRows) => /*html*/ `
  <div class="mud-accordion-panel-list">
    ${rows
      .map(
        row => /*html*/ `<div class="mud-accordion-panel-row">
          <div class="mud-accordion-panel-row__text">
            <span class="mud-accordion-panel-row__heading">${row.heading}</span>
            <span class="mud-accordion-panel-row__supporting">${row.supporting}</span>
          </div>
          <mud-tag class="mud-accordion-panel-row__label" variant="info" type="subtle" semantic="neutral" size="sm">${row.label}</mud-tag>
        </div>`,
      )
      .join('')}
  </div>
`;

const renderWithPanelList = () => /*html*/ `
  <style>${panelListStyles}</style>
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Panel cu listă de elemente (heading + text suport + etichetă) — eticheta se ascunde pe mobil.</p>
    <mud-accordion mode="single">
      <mud-accordion-item heading="Documente necesare" supporting-text="Acte de identitate și certificate suport" open>
        ${renderPanelRows(panelRows)}
      </mud-accordion-item>
      <mud-accordion-item heading="Pași de urmat" supporting-text="Procesul de depunere a cererii">
        ${renderPanelRows(panelRows)}
      </mud-accordion-item>
      <mud-accordion-item heading="Întrebări frecvente" supporting-text="Răspunsuri la cele mai comune întrebări">
        ${renderPanelRows(panelRows)}
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceWithPanelList = /*html*/ `<mud-accordion mode="single">
  <mud-accordion-item heading="Documente necesare" supporting-text="..." open>
    <div class="panel-list">
      <div class="panel-row">
        <div class="panel-row__text">
          <span class="panel-row__heading">Buletin de identitate</span>
          <span class="panel-row__supporting">Act de identitate valabil la data depunerii</span>
        </div>
        <mud-tag variant="info" type="subtle" semantic="neutral" size="sm">Obligatoriu</mud-tag>
      </div>
      <!-- ...more rows -->
    </div>
  </mud-accordion-item>
</mud-accordion>`;

const renderTrailSites = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">appearance="trail-sites" — elementul activ primește fundalul brand (utilizat pentru navigarea prin trailuri pe portalul FOD).</p>
    <mud-accordion mode="single" appearance="trail-sites">
      <mud-accordion-item heading="Serviciul de plăți MPay" supporting-text="plătește online taxe, impozite și amenzi">
        Accesează MPay pentru a achita rapid și securizat obligațiile dumneavoastră față de stat.
      </mud-accordion-item>
      <mud-accordion-item heading="Autentificare MPass" supporting-text="loghează-te o singură dată pentru toate serviciile" open>
        Un singur cont, toate serviciile guvernamentale. Folosește MPass pe orice platformă publică.
      </mud-accordion-item>
      <mud-accordion-item heading="Semnătură electronică MSign" supporting-text="semnează documente cu valoare juridică">
        Aplică semnătura electronică calificată direct din browser, fără instalări suplimentare.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceTrailSites = /*html*/ `<mud-accordion mode="single" appearance="trail-sites">
  <mud-accordion-item heading="Serviciul de plăți MPay" supporting-text="...">...</mud-accordion-item>
  <mud-accordion-item heading="Autentificare MPass" supporting-text="..." open>...</mud-accordion-item>
  <mud-accordion-item heading="Semnătură electronică MSign" supporting-text="...">...</mud-accordion-item>
</mud-accordion>`;

const renderDisabled = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Element dezactivat — non-interactiv, focusul îl evită.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Disponibil" supporting-text="Element activ, se poate deschide" open>
        Conținut accesibil pentru toți cetățenii autentificați.
      </mud-accordion-item>
      <mud-accordion-item heading="Indisponibil temporar" supporting-text="Serviciu suspendat pentru mentenanță" disabled>
        Acest conținut nu poate fi accesat momentan.
      </mud-accordion-item>
      <mud-accordion-item heading="Doar pentru reprezentanți autorizați" supporting-text="Necesită autentificare cu MPower" disabled>
        Acces restricționat la cetățenii autentificați prin MPower.
      </mud-accordion-item>
    </mud-accordion>

    <p style="${sectionLabelStyle}">
      Conținut slotat sub un element dezactivat. Elementul dezactivează butoanele pe care le
      puneți direct în slot, dar la reactivare le redă exact pe cele pe care le-a dezactivat el.
      Apăsați butonul de mai jos: cel pe care l-ați dezactivat dumneavoastră rămâne dezactivat,
      cel lăsat activ redevine activ.
    </p>
    <button
      id="disabled-slot-toggle"
      type="button"
      style="align-self: flex-start; margin-block-end: var(--spacing-16); padding: var(--spacing-8) var(--spacing-16); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-4); background: var(--color-background-base-default); color: var(--color-text-base-default); font: inherit; font-size: var(--font-size-14); cursor: pointer;"
    >
      Comută starea celor două elemente
    </button>
    <mud-accordion mode="multiple">
      <mud-accordion-item
        id="slot-consumer-disabled"
        heading="Plată restantă"
        supporting-text="Butonul a fost dezactivat de dumneavoastră"
        disabled
      >
        <mud-button slot="trailing" variant="secondary" size="sm" disabled>Reia plata</mud-button>
        Reluarea plății este indisponibilă până la deblocarea dosarului.
      </mud-accordion-item>
      <mud-accordion-item
        id="slot-consumer-enabled"
        heading="Livrare"
        supporting-text="Butonul a fost lăsat activ de dumneavoastră"
        disabled
      >
        <mud-button slot="trailing" variant="secondary" size="sm">Urmărește</mud-button>
        Urmărirea coletului devine disponibilă odată cu elementul.
      </mud-accordion-item>
    </mud-accordion>

    <script>
      // Shows the contract as a TRANSITION, which is what issue #17 broke and a static
      // frame cannot render: the disabled attribute the consumer authored has to survive
      // the item going enabled and back. A toggle is the only way a reader sees that here.
      // No backticks in this block: it lives inside a template literal, which they close.
      (() => {
        const ids = ['slot-consumer-disabled', 'slot-consumer-enabled'];
        document.getElementById('disabled-slot-toggle')?.addEventListener('click', () => {
          for (const id of ids) {
            const el = document.getElementById(id);
            if (el) el.toggleAttribute('disabled');
          }
        });
      })();
    </script>
  </div>
`;

const docsSourceDisabled = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Disponibil" supporting-text="..." open>...</mud-accordion-item>
  <mud-accordion-item heading="Indisponibil temporar" supporting-text="..." disabled>...</mud-accordion-item>
</mud-accordion>

<!-- The item sets \`disabled\` on what you slot in directly, and on re-enable removes it
     only from the elements it set it on — a control you shipped disabled stays disabled.
     A control nested inside a slotted wrapper gets no attribute: put controls in the slot. -->
<mud-accordion mode="multiple">
  <mud-accordion-item heading="Plată restantă" disabled>
    <mud-button slot="trailing" variant="secondary" size="sm" disabled>Reia plata</mud-button>
    ...
  </mud-accordion-item>
  <mud-accordion-item heading="Livrare" disabled>
    <mud-button slot="trailing" variant="secondary" size="sm">Urmărește</mud-button>
    ...
  </mud-accordion-item>
</mud-accordion>`;

const renderEdgeCases = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Un singur element (fără separator vertical între bare).</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Element unic" supporting-text="Accordionul cu un singur element rămâne funcțional">
        Funcționează identic ca într-o listă mai lungă: comportamentul de toggle este preluat din protocolul WAI-ARIA.
      </mud-accordion-item>
    </mud-accordion>

    <p style="${sectionLabelStyle}">Heading lung — trunchiere la cap de rând, niciun overflow vizibil.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item
        heading="Întrebare cu titlu foarte lung care depășește lățimea normală a accordionului și trebuie să se distribuie pe mai multe rânduri fără să spargă layout-ul vizual"
        supporting-text="Textul suport rămâne pe un singur rând cu trunchiere prin elipse atunci când depășește spațiul disponibil pentru container"
      >
        Conținutul panelului se afișează normal indiferent de lungimea heading-ului.
      </mud-accordion-item>
    </mud-accordion>

    <p style="${sectionLabelStyle}">Render data-driven via prop items[].</p>
    <mud-accordion id="data-driven" mode="single"></mud-accordion>

    <p style="${sectionLabelStyle}">Mobile breakpoint forțat (typography redus la 22/30).</p>
    <mud-accordion mode="multiple" breakpoint="mobile" style="max-width: 343px;">
      <mud-accordion-item heading="Versiune mobilă" supporting-text="Reduce typography la 22px / 30px">
        Layout-ul mobil se ajustează automat pe ecranele sub 768px.
      </mud-accordion-item>
      <mud-accordion-item heading="Detalii cont" supporting-text="Date personale și preferințe">
        Configurează preferințele de notificare și limba aplicației.
      </mud-accordion-item>
    </mud-accordion>
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
<mud-accordion mode="multiple">
  <mud-accordion-item heading="Element unic" supporting-text="...">...</mud-accordion-item>
</mud-accordion>

<!-- Long heading -->
<mud-accordion mode="multiple">
  <mud-accordion-item heading="Întrebare cu titlu foarte lung..." supporting-text="...">...</mud-accordion-item>
</mud-accordion>

<!-- Data-driven with items prop -->
<mud-accordion id="data-driven" mode="single"></mud-accordion>
<script>
  document.getElementById('data-driven').items = [
    { id: 'srv-1', heading: 'Servicii fiscale', supportingText: 'Declarații și plăți', content: '...', open: true },
    { id: 'srv-2', heading: 'Servicii sociale', supportingText: '...', content: '...' },
  ];
</script>

<!-- Forced mobile breakpoint -->
<mud-accordion mode="multiple" breakpoint="mobile" style="max-width: 343px;">
  <mud-accordion-item heading="Versiune mobilă" supporting-text="...">...</mud-accordion-item>
</mud-accordion>`;

const meta: Meta<AccordionArgs> = {
  title: 'Molecules/Accordion',
  component: 'mud-accordion',
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
    // The manifest feeds this component's argTypes (see .storybook/preview.js), and
    // `wca` lists every public class field as a property — so `@Element() host`
    // arrives as a control over a live DOM node. The docs blocks exclude it too;
    // this key is what keeps it out of the Canvas Controls panel.
    controls: { exclude: ['host'] },
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

export const WithPanelList: Story = {
  render: renderWithPanelList,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithPanelList } },
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
    <mud-accordion>
      <mud-accordion-item heading="Coverage" supporting-text="Coverage"></mud-accordion-item>
    </mud-accordion>
  `,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const AccordionCtor = customElements.get('mud-accordion') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    const ItemCtor = customElements.get('mud-accordion-item') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!AccordionCtor) throw new Error('mud-accordion constructor missing');
    if (!ItemCtor) throw new Error('mud-accordion-item constructor missing');
    const a = new AccordionCtor(false);
    const i = new ItemCtor(false);
    if (!a || !i) throw new Error('coverage instances not constructed');
  },
};
