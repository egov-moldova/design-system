import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { INLINE_MESSAGE_SIZES, INLINE_MESSAGE_VARIANTS } from './mud-inline-message.types';
import type { InlineMessageSize, InlineMessageVariant } from './mud-inline-message.types';

type InlineMessageArgs = {
  variant: InlineMessageVariant;
  size: InlineMessageSize;
  hideIcon: boolean;
  iconName: string;
  text: string;
};

const renderInlineMessage = (args: InlineMessageArgs) => /*html*/ `
  <mud-inline-message
    variant="${args.variant}"
    size="${args.size}"
    ${args.hideIcon ? 'hide-icon' : ''}
    ${args.iconName ? `icon-name="${args.iconName}"` : ''}
  >${args.text}</mud-inline-message>
`;

const captionStyle =
  'font-family: var(--font-family-primary); font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-text-base-secondary); margin: 0 0 var(--spacing-8); font-family: monospace;';
const cellStyle = 'display: flex; flex-direction: column; gap: var(--spacing-8);';
const rowStyle = 'display: flex; flex-wrap: wrap; gap: var(--spacing-32) var(--spacing-48);';

const meta: Meta<InlineMessageArgs> = {
  title: 'Atoms/InlineMessage',
  component: 'mud-inline-message',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: /*md*/ `
**Inline Message** — lightweight, in-context feedback: a coloured leading icon
plus a short text line, with no surface, border, or padding. It's the same
visual pattern the form controls render as assistive / error text, exposed as a
standalone atom for use alongside any element.

\`variant\` selects the semantic colour (\`info\` keeps neutral text with a
brand-blue icon; \`warning\` / \`success\` / \`error\` colour both). \`size\` is
\`small\` (12px) or \`medium\` (14px). Set \`hide-icon\` for the \`icon-none\` variation.

It is plain in-flow text, **not** an ARIA live region — associate it with a
field via \`aria-describedby\` on the consumer side. For transient announced
messages use \`mud-notification\` / \`mud-banner\`.
        `.trim(),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: INLINE_MESSAGE_VARIANTS,
      description: 'Semantic colour.',
      table: { defaultValue: { summary: 'info' } },
    },
    size: {
      control: 'inline-radio',
      options: INLINE_MESSAGE_SIZES,
      description: 'Size rung.',
      table: { defaultValue: { summary: 'medium' } },
    },
    hideIcon: {
      name: 'hide-icon',
      control: 'boolean',
      description: 'Suppress the leading icon (the `icon-none` variation).',
      table: { defaultValue: { summary: 'false' } },
    },
    iconName: { name: 'icon-name', control: 'text', description: 'Override the default per-variant icon.' },
    text: { control: 'text', description: 'Message text (default slot).' },
  },
  args: {
    variant: 'info',
    size: 'medium',
    hideIcon: false,
    iconName: '',
    text: 'Inline message',
  },
};

export default meta;
type Story = StoryObj<InlineMessageArgs>;

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderInlineMessage,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: InlineMessageArgs }) =>
          `<mud-inline-message variant="${args.variant}" size="${args.size}"${args.hideIcon ? ' hide-icon' : ''}>${args.text}</mud-inline-message>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Variations — icon-none vs icon-leading
// ---------------------------------------------------------------------------
const renderVariations = () => /*html*/ `
  <div style="${rowStyle}">
    <div style="${cellStyle}">
      <span style="${captionStyle}">icon-none</span>
      <mud-inline-message variant="info" hide-icon>Inline message</mud-inline-message>
    </div>
    <div style="${cellStyle}">
      <span style="${captionStyle}">icon-leading</span>
      <mud-inline-message variant="info">Inline message</mud-inline-message>
    </div>
  </div>
`;
const docsSourceVariations = /*html*/ `<mud-inline-message variant="info" hide-icon>Inline message</mud-inline-message>
<mud-inline-message variant="info">Inline message</mud-inline-message>`;
export const Variations: Story = {
  render: renderVariations,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceVariations } } },
};

// ---------------------------------------------------------------------------
// Styles — info / warning / success / error
// ---------------------------------------------------------------------------
const renderStyles = () => /*html*/ `
  <div style="${rowStyle}">
    ${INLINE_MESSAGE_VARIANTS.map(
      v => /*html*/ `
      <div style="${cellStyle}">
        <span style="${captionStyle}">${v}</span>
        <mud-inline-message variant="${v}">Inline message</mud-inline-message>
      </div>`,
    ).join('')}
  </div>
`;
const docsSourceStyles = INLINE_MESSAGE_VARIANTS.map(
  v => `<mud-inline-message variant="${v}">Inline message</mud-inline-message>`,
).join('\n');
export const Styles: Story = {
  render: renderStyles,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceStyles } } },
};

// ---------------------------------------------------------------------------
// Sizes — small + medium, each across the four variants
// ---------------------------------------------------------------------------
const sizeRow = (size: InlineMessageSize) => /*html*/ `
  <div style="${cellStyle}">
    <span style="${captionStyle}">${size}</span>
    <div style="${rowStyle}">
      ${INLINE_MESSAGE_VARIANTS.map(
        v => /*html*/ `<mud-inline-message variant="${v}" size="${size}">Inline message</mud-inline-message>`,
      ).join('')}
    </div>
  </div>
`;
const renderSizes = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-24);">
    ${INLINE_MESSAGE_SIZES.map(s => sizeRow(s)).join('')}
  </div>
`;
const docsSourceSizes = INLINE_MESSAGE_SIZES.flatMap(s =>
  INLINE_MESSAGE_VARIANTS.map(
    v => `<mud-inline-message variant="${v}" size="${s}">Inline message</mud-inline-message>`,
  ),
).join('\n');
export const Sizes: Story = {
  render: renderSizes,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceSizes } } },
};

// ---------------------------------------------------------------------------
// Usage — assistive / error text beneath a form field
// ---------------------------------------------------------------------------
const renderUsage = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8); max-width: 320px;">
    <mud-text-input label="Label" placeholder="Placeholder" invalid></mud-text-input>
    <mud-inline-message variant="error" size="small">Error message displayed here</mud-inline-message>
  </div>
`;
export const Usage: Story = {
  name: 'Usage — assistive text',
  render: renderUsage,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Standalone inline feedback beneath a field. Associate it with the input via `aria-describedby` (and `aria-invalid` for errors) on the consumer side.',
      },
      source: {
        code: `<mud-text-input label="Label" placeholder="Placeholder" invalid aria-describedby="err"></mud-text-input>
<mud-inline-message id="err" variant="error" size="small">Error message displayed here</mud-inline-message>`,
      },
    },
  },
};

// ---------------------------------------------------------------------------
// EdgeCases — long wrapping text, diacritics, custom icon
// ---------------------------------------------------------------------------
const renderEdgeCases = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-16); max-width: 360px;">
    <div style="${cellStyle}">
      <span style="${captionStyle}">long text — wraps, icon stays on first line</span>
      <mud-inline-message variant="warning">
        Mesajul depășește o singură linie și se înfășoară pe mai multe rânduri, păstrând pictograma aliniată la prima linie.
      </mud-inline-message>
    </div>
    <div style="${cellStyle}">
      <span style="${captionStyle}">custom icon override</span>
      <mud-inline-message variant="success" icon-name="sparkles-filled">Profil verificat cu succes.</mud-inline-message>
    </div>
  </div>
`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: '<mud-inline-message variant="warning">…long text…</mud-inline-message>' } },
  },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-inline-message>Coverage</mud-inline-message>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-inline-message') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!Ctor) throw new Error('mud-inline-message constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
