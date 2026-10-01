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
// English sample copy — "Frequently asked questions" for MPay-style content
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
    <p style="${sectionLabelStyle}">mode="single" — opening one item closes the others.</p>
    <mud-accordion mode="single">
      <mud-accordion-item heading="About MPay" supporting-text="The government electronic payments service" open>
        MPay lets citizens pay taxes, duties and other obligations to the state electronically, in one place.
      </mud-accordion-item>
      <mud-accordion-item heading="About MPass" supporting-text="Single sign-on for public services">
        MPass provides a single access point for all government platforms, simplifying citizen sign-in.
      </mud-accordion-item>
      <mud-accordion-item heading="About MSign" supporting-text="Certified electronic signature">
        MSign applies a qualified electronic signature to documents, with the same legal value as a handwritten signature.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceSingle = /*html*/ `<mud-accordion mode="single">
  <mud-accordion-item heading="About MPay" supporting-text="..." open>...</mud-accordion-item>
  <mud-accordion-item heading="About MPass" supporting-text="...">...</mud-accordion-item>
  <mud-accordion-item heading="About MSign" supporting-text="...">...</mud-accordion-item>
</mud-accordion>`;

const renderMultiple = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">mode="multiple" — each item opens and closes independently.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Required documents" supporting-text="Identity documents and supporting certificates" open>
        Identity card (or passport for foreign citizens), birth certificate and, where applicable, a marriage or divorce certificate.
      </mud-accordion-item>
      <mud-accordion-item heading="Processing times" supporting-text="Standard time frames for online requests" open>
        Applications submitted online are reviewed within 5 working days. Urgent requests can be processed within 24 hours for an additional fee.
      </mud-accordion-item>
      <mud-accordion-item heading="Payment methods" supporting-text="Instruments accepted through MPay">
        Bank card (Visa, Mastercard), internet banking or cash payment at partner post offices.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceMultiple = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Required documents" open>...</mud-accordion-item>
  <mud-accordion-item heading="Processing times" open>...</mud-accordion-item>
  <mud-accordion-item heading="Payment methods">...</mud-accordion-item>
</mud-accordion>`;

const renderWithIcons = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Leading icons (mud-icon) for content categories.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Digital identity" supporting-text="Identity verification through MPass" open>
        <mud-icon slot="icon-start" name="id-card"></mud-icon>
        MPass sign-in uses the mobile signature, eToken or biometrics to confirm the citizen's identity.
      </mud-accordion-item>
      <mud-accordion-item heading="Electronic payments" supporting-text="Secure transactions through MPay">
        <mud-icon slot="icon-start" name="credit-card"></mud-icon>
        All payments are protected by the 3-D Secure protocol and audited by the National Bank of Moldova.
      </mud-accordion-item>
      <mud-accordion-item heading="Electronic signature" supporting-text="Signed document with legal value">
        <mud-icon slot="icon-start" name="checklist"></mud-icon>
        Apply the qualified electronic signature to contracts, declarations and other official documents.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceWithIcons = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Digital identity" supporting-text="..." open>
    <mud-icon slot="icon-start" name="id-card"></mud-icon>
    MPass sign-in uses the mobile signature, eToken or biometrics.
  </mud-accordion-item>
  <mud-accordion-item heading="Electronic payments" supporting-text="...">
    <mud-icon slot="icon-start" name="credit-card"></mud-icon>
    All payments are protected by the 3-D Secure protocol.
  </mud-accordion-item>
</mud-accordion>`;

const renderWithSupportingText = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Heading + supporting text (short description, one per row).</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Frequently asked questions" supporting-text="General questions about the e-Gov platform">
        Find answers to the most common questions about government electronic services, sign-in and payments.
      </mud-accordion-item>
      <mud-accordion-item heading="Technical support" supporting-text="Problems with sign-in or payments">
        The support team is available Monday to Friday, 8:00 to 17:00, for problems with sign-in or payment processing.
      </mud-accordion-item>
      <mud-accordion-item heading="Institutional contact" supporting-text="Contact details of the government agency">
        Electronic Governance Agency, Great National Assembly Square 1, Chișinău. Phone: 022 820 000.
      </mud-accordion-item>
    </mud-accordion>
    <p style="${sectionLabelStyle}">Heading only (no supporting text).</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="How do I sign in?">
        Open the sign-in button and use MPass, the mobile signature or the electronic ID card to confirm your identity.
      </mud-accordion-item>
      <mud-accordion-item heading="How do I recover my password?">
        Use the password recovery option and follow the steps sent by e-mail or to your registered phone number.
      </mud-accordion-item>
      <mud-accordion-item heading="How do I change my contact details?">
        Open the Profile section of your account and update your e-mail address or phone number.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceWithSupportingText = /*html*/ `<!-- With supporting text -->
<mud-accordion mode="multiple">
  <mud-accordion-item heading="Frequently asked questions" supporting-text="General questions">
    Find answers to the most common questions about electronic services.
  </mud-accordion-item>
  <mud-accordion-item heading="Technical support" supporting-text="Problems with sign-in">
    The support team is available Monday to Friday, 8:00 to 17:00.
  </mud-accordion-item>
</mud-accordion>

<!-- Heading only -->
<mud-accordion mode="multiple">
  <mud-accordion-item heading="How do I sign in?">
    Use MPass, the mobile signature or the electronic ID card to confirm your identity.
  </mud-accordion-item>
  <mud-accordion-item heading="How do I recover my password?">
    Use the password recovery option and follow the steps sent by e-mail.
  </mud-accordion-item>
</mud-accordion>`;

const renderWithTrailingContent = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Slot "trailing" — tags, counters or quick actions.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Pending requests" supporting-text="Requests that need your attention">
        <mud-badge slot="trailing" variant="warning">3 noi</mud-badge>
        Three requests are waiting for identity confirmation. Open the dashboard to finish the process.
      </mud-accordion-item>
      <mud-accordion-item heading="Expired documents" supporting-text="Documents that must be renewed">
        <mud-badge slot="trailing" variant="danger">2</mud-badge>
        The identity card and driving licence expire within the next 30 days. Book an appointment to renew them.
      </mud-accordion-item>
      <mud-accordion-item heading="Recent notifications" supporting-text="Messages from government agencies">
        <mud-badge slot="trailing">12</mud-badge>
        New messages about submitted requests, payment status and updates from partner institutions.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceWithTrailingContent = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Pending requests" supporting-text="...">
    <mud-badge slot="trailing" variant="warning">3 noi</mud-badge>
    ...
  </mud-accordion-item>
</mud-accordion>`;

// ---------------------------------------------------------------------------
// Panel list — the Figma "expanded" state (Accordion page 670:5171): the panel
// runs edge to edge and the content spaces itself. Here that is .accordion-content,
// which pads 12px at the bottom, holding .service-item rows (padding 24, gap 24,
// radius 12): a heading, a supporting text and a tag. The tag is dropped below
// the 768px breakpoint.
// ---------------------------------------------------------------------------

const panelListStyles = /*css*/ `
  /* Figma .accordion-content (275:8260): 12px below the last row. The panel adds none. */
  .mud-accordion-panel-list {
    display: flex;
    flex-direction: column;
    padding-block-end: var(--spacing-12);
  }
  /* Figma .service-item (659:10895): a white row padded 24 with a 24 gap, radius 12. */
  .mud-accordion-panel-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-24);
    padding: var(--spacing-24);
    border-radius: var(--border-radius-12);
    background: var(--color-background-base-default);
  }
  .mud-accordion-panel-row__text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: var(--spacing-6);
    min-inline-size: 0;
  }
  .mud-accordion-panel-row__label {
    flex-shrink: 0;
  }
  .mud-accordion-panel-row__heading {
    font-family: var(--font-family-primary);
    font-size: var(--font-size-16);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-24);
    color: var(--color-text-base-default);
  }
  .mud-accordion-panel-row__supporting {
    font-family: var(--font-family-primary);
    font-size: var(--font-size-16);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-24);
    color: var(--color-text-base-secondary);
  }
  @media (max-width: 767.98px) {
    .mud-accordion-panel-row__label {
      display: none;
    }
  }
`;

const panelRows = [
  { heading: 'Identity card', supporting: 'Identity document valid on the submission date', label: 'Required' },
  { heading: 'Birth certificate', supporting: 'Issued by the civil registry office', label: 'Required' },
  { heading: 'Marriage certificate', supporting: 'Where applicable, for married persons', label: 'Optional' },
  { heading: 'Divorce certificate', supporting: 'Where applicable, for divorced persons', label: 'Optional' },
  { heading: 'Passport', supporting: 'Only for foreign citizens', label: 'Alternative' },
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
          <mud-tag class="mud-accordion-panel-row__label" type="subtle" semantic="neutral" size="md">${row.label}</mud-tag>
        </div>`,
      )
      .join('')}
  </div>
`;

const renderWithPanelList = () => /*html*/ `
  <style>${panelListStyles}</style>
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Panel with a list of items (heading + supporting text + label) — the label is hidden on mobile.</p>
    <mud-accordion mode="single">
      <mud-accordion-item heading="Required documents" supporting-text="Identity documents and supporting certificates" open>
        ${renderPanelRows(panelRows)}
      </mud-accordion-item>
      <mud-accordion-item heading="Steps to follow" supporting-text="The application process">
        ${renderPanelRows(panelRows)}
      </mud-accordion-item>
      <mud-accordion-item heading="Frequently asked questions" supporting-text="Answers to the most common questions">
        ${renderPanelRows(panelRows)}
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceWithPanelList = /*html*/ `<mud-accordion mode="single">
  <mud-accordion-item heading="Required documents" supporting-text="..." open>
    <div class="panel-list">
      <div class="panel-row">
        <div class="panel-row__text">
          <span class="panel-row__heading">Identity card</span>
          <span class="panel-row__supporting">Identity document valid on the submission date</span>
        </div>
        <mud-tag type="subtle" semantic="neutral" size="md">Required</mud-tag>
      </div>
      <!-- ...more rows -->
    </div>
  </mud-accordion-item>
</mud-accordion>`;

const renderTrailSites = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">appearance="trail-sites" — the active item gets the brand background (used for trail navigation on the FOD portal).</p>
    <mud-accordion mode="single" appearance="trail-sites">
      <mud-accordion-item heading="MPay payment service" supporting-text="pay taxes, duties and fines online">
        Open MPay to pay your obligations to the state quickly and securely.
      </mud-accordion-item>
      <mud-accordion-item heading="MPass sign-in" supporting-text="sign in once for all services" open>
        One account, all government services. Use MPass on any public platform.
      </mud-accordion-item>
      <mud-accordion-item heading="MSign electronic signature" supporting-text="sign documents with legal value">
        Apply the qualified electronic signature straight from the browser, with no extra installs.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceTrailSites = /*html*/ `<mud-accordion mode="single" appearance="trail-sites">
  <mud-accordion-item heading="MPay payment service" supporting-text="...">...</mud-accordion-item>
  <mud-accordion-item heading="MPass sign-in" supporting-text="..." open>...</mud-accordion-item>
  <mud-accordion-item heading="MSign electronic signature" supporting-text="...">...</mud-accordion-item>
</mud-accordion>`;

const renderDisabled = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">Disabled item — non-interactive, focus skips it.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Available" supporting-text="Active item, can be opened" open>
        Content available to all signed-in citizens.
      </mud-accordion-item>
      <mud-accordion-item heading="Temporarily unavailable" supporting-text="Service suspended for maintenance" disabled>
        <mud-badge slot="trailing" variant="warning" count="2"></mud-badge>
        This content cannot be accessed right now.
      </mud-accordion-item>
      <mud-accordion-item heading="Authorised representatives only" supporting-text="Requires MPower sign-in" disabled>
        Access restricted to citizens signed in through MPower.
      </mud-accordion-item>
    </mud-accordion>

    <p style="${sectionLabelStyle}">
      Content slotted under a disabled item. The item disables the buttons you
      put directly in the slot, but on re-enabling it restores exactly the ones it disabled itself.
      Press the button below: the one you disabled yourself stays disabled,
      the one you left enabled becomes enabled again.
    </p>
    <button
      id="disabled-slot-toggle"
      type="button"
      style="align-self: flex-start; margin-block-end: var(--spacing-16); padding: var(--spacing-8) var(--spacing-16); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-4); background: var(--color-background-base-default); color: var(--color-text-base-default); font: inherit; font-size: var(--font-size-14); cursor: pointer;"
    >
      Toggle the state of both items
    </button>
    <mud-accordion mode="multiple">
      <mud-accordion-item
        id="slot-consumer-disabled"
        heading="Overdue payment"
        supporting-text="The button was disabled by you"
        disabled
      >
        <mud-button slot="trailing" variant="secondary" size="sm" disabled>Resume payment</mud-button>
        Resuming the payment is unavailable until the file is unlocked.
      </mud-accordion-item>
      <mud-accordion-item
        id="slot-consumer-enabled"
        heading="Delivery"
        supporting-text="The button was left enabled by you"
        disabled
      >
        <mud-button slot="trailing" variant="secondary" size="sm">Track</mud-button>
        Parcel tracking becomes available together with the item.
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
  <mud-accordion-item heading="Available" supporting-text="..." open>...</mud-accordion-item>
  <mud-accordion-item heading="Temporarily unavailable" supporting-text="..." disabled>
    <!-- The item disables what you slot into trailing, so the badge renders its disabled
         design and regains its colors on re-enable. Do not set disabled on it yourself:
         the item leaves an attribute it did not write in place. -->
    <mud-badge slot="trailing" variant="warning" count="2"></mud-badge>
    ...
  </mud-accordion-item>
</mud-accordion>

<!-- The item sets \`disabled\` on what you slot in directly, and on re-enable removes it
     only from the elements it set it on — a control you shipped disabled stays disabled.
     A control nested inside a slotted wrapper gets no attribute: put controls in the slot. -->
<mud-accordion mode="multiple">
  <mud-accordion-item heading="Overdue payment" disabled>
    <mud-button slot="trailing" variant="secondary" size="sm" disabled>Resume payment</mud-button>
    ...
  </mud-accordion-item>
  <mud-accordion-item heading="Delivery" disabled>
    <mud-button slot="trailing" variant="secondary" size="sm">Track</mud-button>
    ...
  </mud-accordion-item>
</mud-accordion>`;

const renderEdgeCases = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${sectionLabelStyle}">A single item (no vertical separator between bars).</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item heading="Single item" supporting-text="An accordion with a single item stays functional">
        Works the same as in a longer list: the toggle behaviour follows the WAI-ARIA pattern.
      </mud-accordion-item>
    </mud-accordion>

    <p style="${sectionLabelStyle}">Long heading — truncated at the line end, no visible overflow.</p>
    <mud-accordion mode="multiple">
      <mud-accordion-item
        heading="Question with a very long title that exceeds the normal width of the accordion and has to wrap over several lines without breaking the visual layout"
        supporting-text="The supporting text stays on a single line and is truncated with an ellipsis when it exceeds the space available in the container"
      >
        The panel content renders normally regardless of the heading length.
      </mud-accordion-item>
    </mud-accordion>

    <p style="${sectionLabelStyle}">Forced mobile breakpoint (typography reduced to 22/30).</p>
    <mud-accordion mode="multiple" breakpoint="mobile" style="max-width: 343px;">
      <mud-accordion-item heading="Mobile version" supporting-text="Reduces typography to 22px / 30px">
        The mobile layout adjusts automatically on screens under 768px.
      </mud-accordion-item>
      <mud-accordion-item heading="Account details" supporting-text="Personal data and preferences">
        Configure notification preferences and the application language.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceEdgeCases = /*html*/ `<!-- Single item -->
<mud-accordion mode="multiple">
  <mud-accordion-item heading="Single item" supporting-text="...">...</mud-accordion-item>
</mud-accordion>

<!-- Long heading -->
<mud-accordion mode="multiple">
  <mud-accordion-item heading="Question with a very long title..." supporting-text="...">...</mud-accordion-item>
</mud-accordion>

<!-- Forced mobile breakpoint -->
<mud-accordion mode="multiple" breakpoint="mobile" style="max-width: 343px;">
  <mud-accordion-item heading="Mobile version" supporting-text="...">...</mud-accordion-item>
</mud-accordion>`;

// The panel adds no padding (Figma Content Slot): the content spaces itself, and
// .accordion-content pads 12px at the bottom. Stories whose panel is plain text get
// that 12px here. A decorator, not a global rule, so the manifest fixtures and the
// audit measure the component itself.
const PANEL_SPACING = /*css*/ `mud-accordion-item::part(panel) { padding-block-end: var(--spacing-12); }`;
const withPanelSpacing = (story: () => unknown) => `<style>${PANEL_SPACING}</style>${String(story())}`;

const meta: Meta<AccordionArgs> = {
  title: 'Components/Accordion',
  component: 'mud-accordion',
  decorators: [withPanelSpacing],
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
