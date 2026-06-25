import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { INFO_BOX_EMPHASES, INFO_BOX_VARIANTS } from './mud-info-box.types';
import type { InfoBoxEmphasis, InfoBoxVariant } from './mud-info-box.types';

type InfoBoxArgs = {
  variant: InfoBoxVariant;
  emphasis: InfoBoxEmphasis;
  closable: boolean;
  hideIcon: boolean;
  titleText: string;
  iconName: string;
  body: string;
  closeLabel: string;
};

const DEMO_BODY =
  'For enhanced security, always use two-factor authentication when accessing your digital identity or personal records online.';

const renderInfoBox = (args: InfoBoxArgs) => /*html*/ `
  <mud-info-box
    variant="${args.variant}"
    emphasis="${args.emphasis}"
    ${args.closable ? 'closable' : ''}
    ${args.hideIcon ? 'hide-icon' : ''}
    ${args.titleText ? `title-text="${args.titleText}"` : ''}
    ${args.iconName ? `icon-name="${args.iconName}"` : ''}
    close-label="${args.closeLabel}"
  >${args.body}</mud-info-box>
`;

const captionStyle =
  'font-family: var(--font-family-primary); font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-text-base-secondary); margin: 0;';
const stackStyle = 'display: flex; flex-direction: column; gap: var(--spacing-16); max-width: 560px;';

const meta: Meta<InfoBoxArgs> = {
  title: 'Atoms/InfoBox',
  component: 'mud-info-box',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: /*md*/ `
**Informational Box** — an inline, in-content callout that highlights key
messages, announcements, alerts, or explanations within the page flow. It fills
its container's width and supports an optional heading, a multi-line body, an
inline action group, and a close button.

Two axes: \`variant\` (\`info\` neutral icon / \`info-moderate\` brand-blue icon /
\`warning\` / \`error\`) and \`emphasis\` (\`subtle\` grey surface / \`strong\` tinted
surface).

It is static in-flow content, so it is **not** an ARIA live region. For
transient, announced messages use \`mud-notification\` (toast) or \`mud-banner\`
(page bar).
        `.trim(),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: INFO_BOX_VARIANTS,
      description: 'Semantic variant.',
      table: { defaultValue: { summary: 'info' } },
    },
    emphasis: {
      control: 'inline-radio',
      options: INFO_BOX_EMPHASES,
      description: 'Surface weight — `subtle` (grey) or `strong` (tinted).',
      table: { defaultValue: { summary: 'subtle' } },
    },
    closable: {
      control: 'boolean',
      description: 'Renders a trailing × button that emits `mudClose`.',
      table: { defaultValue: { summary: 'false' } },
    },
    hideIcon: {
      name: 'hide-icon',
      control: 'boolean',
      description: 'Suppress the leading icon (the `icon-none` variation).',
      table: { defaultValue: { summary: 'false' } },
    },
    titleText: { name: 'title-text', control: 'text', description: 'Optional bold heading above the body.' },
    iconName: { name: 'icon-name', control: 'text', description: 'Override the default per-variant icon.' },
    body: { control: 'text', description: 'Default-slot body content.' },
    closeLabel: {
      name: 'close-label',
      control: 'text',
      description: 'Accessible label for the close button.',
      table: { defaultValue: { summary: 'Închide' } },
    },
  },
  args: {
    variant: 'info',
    emphasis: 'subtle',
    closable: false,
    hideIcon: false,
    titleText: '',
    iconName: '',
    body: DEMO_BODY,
    closeLabel: 'Închide',
  },
};

export default meta;
type Story = StoryObj<InfoBoxArgs>;

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderInfoBox,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: InfoBoxArgs }) =>
          `<mud-info-box variant="${args.variant}" emphasis="${args.emphasis}"${args.closable ? ' closable' : ''}${
            args.hideIcon ? ' hide-icon' : ''
          }${args.titleText ? ` title-text="${args.titleText}"` : ''}>${args.body}</mud-info-box>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Styles — the four variants on the subtle (grey) surface
// ---------------------------------------------------------------------------
const renderStyles = () => /*html*/ `
  <div style="${stackStyle}">
    ${INFO_BOX_VARIANTS.map(
      v => /*html*/ `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
        <span style="${captionStyle}">${v}</span>
        <mud-info-box variant="${v}" emphasis="subtle">${DEMO_BODY}</mud-info-box>
      </div>`,
    ).join('')}
  </div>
`;
const docsSourceStyles = INFO_BOX_VARIANTS.map(
  v => `<mud-info-box variant="${v}" emphasis="subtle">${DEMO_BODY}</mud-info-box>`,
).join('\n');
export const Styles: Story = {
  render: renderStyles,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceStyles } } },
};

// ---------------------------------------------------------------------------
// Types — strong vs subtle (info / warning / error)
// ---------------------------------------------------------------------------
const TYPE_VARIANTS: InfoBoxVariant[] = ['info', 'warning', 'error'];
const renderTypes = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-24);">
    <div style="${stackStyle}">
      <span style="${captionStyle}">Strong</span>
      ${TYPE_VARIANTS.map(v => /*html*/ `<mud-info-box variant="${v}" emphasis="strong">${DEMO_BODY}</mud-info-box>`).join('')}
    </div>
    <div style="${stackStyle}">
      <span style="${captionStyle}">Subtle</span>
      ${TYPE_VARIANTS.map(v => /*html*/ `<mud-info-box variant="${v}" emphasis="subtle">${DEMO_BODY}</mud-info-box>`).join('')}
    </div>
  </div>
`;
const docsSourceTypes = INFO_BOX_EMPHASES.flatMap(e =>
  TYPE_VARIANTS.map(v => `<mud-info-box variant="${v}" emphasis="${e}">…</mud-info-box>`),
).join('\n');
export const Types: Story = {
  render: renderTypes,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceTypes } } },
};

// ---------------------------------------------------------------------------
// Variations — icon / icon-none / heading / close / link / action / actions
// ---------------------------------------------------------------------------
const renderVariations = () => /*html*/ `
  <div style="${stackStyle}">
    <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
      <span style="${captionStyle}">w/ icon</span>
      <mud-info-box variant="info-moderate" emphasis="subtle">${DEMO_BODY}</mud-info-box>
    </div>
    <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
      <span style="${captionStyle}">icon-none</span>
      <mud-info-box variant="info-moderate" emphasis="subtle" hide-icon>${DEMO_BODY}</mud-info-box>
    </div>
    <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
      <span style="${captionStyle}">w/ heading</span>
      <mud-info-box variant="info-moderate" emphasis="subtle" title-text="Understanding Your Digital Identity">${DEMO_BODY}</mud-info-box>
    </div>
    <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
      <span style="${captionStyle}">w/ close</span>
      <mud-info-box variant="info-moderate" emphasis="subtle" closable>${DEMO_BODY}</mud-info-box>
    </div>
    <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
      <span style="${captionStyle}">w/ link</span>
      <mud-info-box variant="info-moderate" emphasis="subtle">
        ${DEMO_BODY}
        <mud-link slot="actions" href="#" size="sm">Learn more</mud-link>
      </mud-info-box>
    </div>
    <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
      <span style="${captionStyle}">w/ action</span>
      <mud-info-box variant="info-moderate" emphasis="subtle">
        ${DEMO_BODY}
        <mud-button slot="actions" size="sm">Confirm your identity</mud-button>
      </mud-info-box>
    </div>
    <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
      <span style="${captionStyle}">w/ actions</span>
      <mud-info-box variant="info-moderate" emphasis="subtle">
        ${DEMO_BODY}
        <mud-button slot="actions" size="sm">Confirm your identity</mud-button>
        <mud-link slot="actions" href="#" size="sm">Learn more</mud-link>
      </mud-info-box>
    </div>
  </div>
`;
const docsSourceVariations = /*html*/ `<mud-info-box variant="info-moderate" hide-icon>…</mud-info-box>
<mud-info-box variant="info-moderate" title-text="Heading">…</mud-info-box>
<mud-info-box variant="info-moderate" closable>…</mud-info-box>
<mud-info-box variant="info-moderate">
  …
  <mud-button slot="actions" size="sm">Confirm your identity</mud-button>
  <mud-link slot="actions" href="#" size="sm">Learn more</mud-link>
</mud-info-box>`;
export const Variations: Story = {
  render: renderVariations,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceVariations } } },
};

// ---------------------------------------------------------------------------
// WithHeading — heading + body + nested content (the desktop master)
// ---------------------------------------------------------------------------
const renderWithHeading = () => /*html*/ `
  <div style="${stackStyle}">
    <mud-info-box variant="info" emphasis="subtle" title-text="Understanding Your Digital Identity">
      Digital identity is the foundation of accessing modern government services online. It ensures that your
      personal information is secure, verifiable, and only accessible to you.
      <mud-link slot="actions" href="#" size="sm">Learn more</mud-link>
    </mud-info-box>
  </div>
`;
export const WithHeading: Story = {
  name: 'With Heading',
  render: renderWithHeading,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<mud-info-box variant="info" title-text="Understanding Your Digital Identity">
  Digital identity is the foundation of accessing modern government services online…
  <mud-link slot="actions" href="#" size="sm">Learn more</mud-link>
</mud-info-box>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Target Sizes — close-button hit area on pointer vs touch
// ---------------------------------------------------------------------------
const renderTargetSizes = () => /*html*/ `
  <div style="${stackStyle}">
    <span style="${captionStyle}">Pointer devices — 32px close target (40px on touch)</span>
    <mud-info-box variant="info-moderate" emphasis="subtle" closable>${DEMO_BODY}</mud-info-box>
    <span style="${captionStyle}; font-weight: var(--font-weight-regular);">
      The close button is 32px on pointer devices and grows to 40px under
      <code>@media (pointer: coarse)</code>. The × glyph stays 16px.
    </span>
  </div>
`;
export const TargetSizes: Story = {
  name: 'Target Sizes',
  render: renderTargetSizes,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: `<mud-info-box variant="info-moderate" closable>${DEMO_BODY}</mud-info-box>` } },
  },
};

// ---------------------------------------------------------------------------
// EdgeCases — long body, heading + close + actions together, diacritics
// ---------------------------------------------------------------------------
const renderEdgeCases = () => /*html*/ `
  <div style="${stackStyle}">
    <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
      <span style="${captionStyle}">Heading + close + actions</span>
      <mud-info-box variant="warning" emphasis="strong" title-text="Sesiunea va expira" closable>
        Salvați modificările pentru a evita pierderea datelor. Veți fi deconectat automat în 2 minute.
        <mud-button slot="actions" size="sm">Prelungește sesiunea</mud-button>
        <mud-link slot="actions" href="#" size="sm">Detalii</mud-link>
      </mud-info-box>
    </div>
    <div style="display: flex; flex-direction: column; gap: var(--spacing-4);">
      <span style="${captionStyle}">Long body, diacritics (ă â î ș ț)</span>
      <mud-info-box variant="error" emphasis="subtle">
        Înălțimea conținutului poate depăși o singură linie; caseta crește pe verticală păstrând alinierea
        pictogramei la prima linie de text, fără a deplasa butonul de închidere.
      </mud-info-box>
    </div>
  </div>
`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: '<mud-info-box variant="warning" title-text="…" closable>…</mud-info-box>' } },
  },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-info-box>Coverage</mud-info-box>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-info-box') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('mud-info-box constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
