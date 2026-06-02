import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TAG_SEMANTICS, TAG_SIZES, TAG_TYPES, TAG_VARIANTS } from './mud-tag.types';
import type { TagSemantic, TagSize, TagType, TagVariant } from './mud-tag.types';

type TagArgs = {
  variant: TagVariant;
  size: TagSize;
  type: TagType;
  semantic: TagSemantic;
  label: string;
  iconStart?: string;
  iconEnd?: string;
  ariaLabel?: string;
};

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

const sectionStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); align-items: flex-start;';
const rowStyle = 'display: flex; flex-wrap: wrap; gap: var(--spacing-12); align-items: center;';
const groupStyle = 'display: flex; flex-wrap: wrap; gap: var(--spacing-8); align-items: center;';
const captionStyle =
  'font-family: var(--font-family-primary); font-size: 12px; font-weight: 500; color: var(--color-text-base-secondary); margin: 0;';
const hintStyle =
  'font-family: var(--font-family-primary); font-size: 11px; color: var(--color-text-base-tertiary); margin: 0;';

// ---------------------------------------------------------------------------
// Romanian-voice labels per semantic (matches PRODUCT.md voice)
// ---------------------------------------------------------------------------

const ROMANIAN_LABELS: Record<TagSemantic, string> = {
  muted: 'Schiță',
  neutral: 'Nou',
  accent: 'În așteptare',
  success: 'Aprobat',
  brand: 'Activ',
  danger: 'Refuzat',
};

const ICON_PATHS: Record<string, string> = {
  'checkmark-small': 'checkmark-small',
  'cross-small': 'cross-small',
  'clock': 'clock',
  'time': 'time',
  'circle-info': 'circle-info',
  'arrow-right': 'arrow-right',
  'bubble-alert': 'bubble-alert',
};

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

const renderTag = (args: TagArgs) => {
  const attrs = [
    `variant="${args.variant}"`,
    `size="${args.size}"`,
    `type="${args.type}"`,
    `semantic="${args.semantic}"`,
    args.ariaLabel ? `aria-label="${args.ariaLabel}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const iconStart = args.iconStart ? `<mud-icon slot="icon-start" name="${args.iconStart}"></mud-icon>` : '';
  const iconEnd = args.iconEnd ? `<mud-icon slot="icon-end" name="${args.iconEnd}"></mud-icon>` : '';
  return /*html*/ `<mud-tag ${attrs}>${iconStart}${args.label}${iconEnd}</mud-tag>`;
};

const meta: Meta<TagArgs> = {
  title: 'Atoms/Tag',
  component: 'mud-tag',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: /*md*/ `
**Tag** — compact, non-interactive label that marks state, category, or
supplementary metadata.

Two visual scales coexist behind the same element:

- \`variant="status"\` — the canonical **Status Tag** for state ("Activ",
  "În așteptare", "Refuzat"). Medium-weight label, three surface
  treatments (\`subtle\`, \`strong\`, \`outlined\`) across six semantic
  colors (\`muted\`, \`neutral\`, \`accent\`, \`success\`, \`brand\`, \`danger\`).
- \`variant="info"\` — the lighter **Info Tag**, intended for metadata
  embedded in body text. Regular-weight label, tighter padding.

For horizontally stacked groups, wrap multiple tags in a flex container
with an 8 px gap. Tags are decorative by default; supply \`aria-label\`
when the tag conveys a live state and the element will adopt
\`role="status"\` automatically.
        `.trim(),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: TAG_VARIANTS,
      description: 'Visual scale.',
      table: { defaultValue: { summary: 'status' } },
    },
    size: {
      control: 'inline-radio',
      options: TAG_SIZES,
      description: 'Size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    type: {
      control: 'inline-radio',
      options: TAG_TYPES,
      description: 'Surface treatment.',
      table: { defaultValue: { summary: 'subtle' } },
    },
    semantic: {
      control: 'select',
      options: TAG_SEMANTICS,
      description: 'Semantic color role.',
      table: { defaultValue: { summary: 'neutral' } },
    },
    label: { control: 'text', description: 'Default-slot text content.' },
    iconStart: {
      control: 'select',
      options: ['', ...Object.keys(ICON_PATHS)],
      description: 'Leading icon name (uses mud-icon).',
    },
    iconEnd: {
      control: 'select',
      options: ['', ...Object.keys(ICON_PATHS)],
      description: 'Trailing icon name (uses mud-icon).',
    },
    ariaLabel: {
      control: 'text',
      description: 'Sets role="status" + aria-label when set.',
    },
  },
  args: {
    variant: 'status',
    size: 'md',
    type: 'subtle',
    semantic: 'neutral',
    label: 'Activ',
    iconStart: '',
    iconEnd: '',
  },
};

export default meta;
type Story = StoryObj<TagArgs>;

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------

export const Default: Story = {
  render: renderTag,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: TagArgs }) => renderTag(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// All Semantics (subtle row + strong row)
// ---------------------------------------------------------------------------

export const AllSemantics: Story = {
  name: 'All Semantics',
  render: () => /*html*/ `
    <div style="${sectionStyle}">
      <div>
        <p style="${captionStyle}">Subtle</p>
        <div style="${rowStyle}">
          ${TAG_SEMANTICS.map(
            s => /*html*/ `<mud-tag type="subtle" semantic="${s}">${ROMANIAN_LABELS[s]}</mud-tag>`,
          ).join('')}
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Strong</p>
        <div style="${rowStyle}">
          ${TAG_SEMANTICS.map(
            s => /*html*/ `<mud-tag type="strong" semantic="${s}">${ROMANIAN_LABELS[s]}</mud-tag>`,
          ).join('')}
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Outlined</p>
        <div style="${rowStyle}">
          ${TAG_SEMANTICS.map(
            s => /*html*/ `<mud-tag type="outlined" semantic="${s}">${ROMANIAN_LABELS[s]}</mud-tag>`,
          ).join('')}
        </div>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TAG_SEMANTICS.map(s => `<mud-tag type="subtle" semantic="${s}">${ROMANIAN_LABELS[s]}</mud-tag>`).join(
          '\n',
        ),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// All Types — one semantic per row to make the surface differences obvious
// ---------------------------------------------------------------------------

export const AllTypes: Story = {
  name: 'All Types',
  render: () => /*html*/ `
    <div style="${sectionStyle}">
      ${TAG_TYPES.map(
        t => /*html*/ `
          <div>
            <p style="${captionStyle}">${t}</p>
            <div style="${rowStyle}">
              <mud-tag type="${t}" semantic="neutral">Nou</mud-tag>
              <mud-tag type="${t}" semantic="brand">Activ</mud-tag>
              <mud-tag type="${t}" semantic="success">Aprobat</mud-tag>
              <mud-tag type="${t}" semantic="danger">Refuzat</mud-tag>
            </div>
          </div>
        `,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TAG_TYPES.map(t => `<mud-tag type="${t}" semantic="brand">Activ</mud-tag>`).join('\n'),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// All Sizes — md vs sm side by side
// ---------------------------------------------------------------------------

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => /*html*/ `
    <div style="${sectionStyle}">
      ${TAG_SIZES.map(
        size => /*html*/ `
          <div>
            <p style="${captionStyle}">${size}</p>
            <div style="${rowStyle}">
              ${TAG_SEMANTICS.map(
                s => /*html*/ `<mud-tag size="${size}" type="subtle" semantic="${s}">${ROMANIAN_LABELS[s]}</mud-tag>`,
              ).join('')}
            </div>
          </div>
        `,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: ['md', 'sm'].map(size => `<mud-tag size="${size}" semantic="brand">Activ</mud-tag>`).join('\n'),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// With Icon — leading + trailing + both
// ---------------------------------------------------------------------------

export const WithIcon: Story = {
  name: 'With Icon',
  render: () => /*html*/ `
    <div style="${sectionStyle}">
      <div>
        <p style="${captionStyle}">Leading icon</p>
        <div style="${rowStyle}">
          <mud-tag type="subtle" semantic="success">
            <mud-icon slot="icon-start" name="checkmark-small" size="16"></mud-icon>
            Aprobat
          </mud-tag>
          <mud-tag type="subtle" semantic="accent">
            <mud-icon slot="icon-start" name="time" size="16"></mud-icon>
            În așteptare
          </mud-tag>
          <mud-tag type="subtle" semantic="danger">
            <mud-icon slot="icon-start" name="cross-small" size="16"></mud-icon>
            Refuzat
          </mud-tag>
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Trailing icon</p>
        <div style="${rowStyle}">
          <mud-tag type="strong" semantic="brand">
            Detalii
            <mud-icon slot="icon-end" name="arrow-right" size="16"></mud-icon>
          </mud-tag>
          <mud-tag type="outlined" semantic="accent">
            Expiră curând
            <mud-icon slot="icon-end" name="bubble-alert" size="16"></mud-icon>
          </mud-tag>
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Both</p>
        <div style="${rowStyle}">
          <mud-tag type="subtle" semantic="brand">
            <mud-icon slot="icon-start" name="checkmark-small" size="16"></mud-icon>
            Verificat
            <mud-icon slot="icon-end" name="arrow-right" size="16"></mud-icon>
          </mud-tag>
        </div>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: /*html*/ `
<mud-tag type="subtle" semantic="success">
  <mud-icon slot="icon-start" name="checkmark-small" size="16"></mud-icon>
  Aprobat
</mud-tag>`.trim(),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Info Variant — lighter inline metadata
// ---------------------------------------------------------------------------

export const InfoVariant: Story = {
  name: 'Info Variant',
  render: () => /*html*/ `
    <div style="${sectionStyle}">
      <p style="${hintStyle}">
        Inline metadata example — tag is inserted next to body copy so the
        regular-weight label and tighter padding read as part of the paragraph.
      </p>
      <p style="font-family: var(--font-family-primary); font-size: 14px; color: var(--color-text-base-default); margin: 0; max-width: 640px; line-height: 1.6;">
        Apartamentul a fost adăugat pe platformă în ultimele 24 de ore
        <mud-tag variant="info" type="subtle" semantic="brand">Nou</mud-tag>
        și include două zone de parcare
        <mud-tag variant="info" type="subtle" semantic="success">Inclus</mud-tag>.
      </p>
      <div>
        <p style="${captionStyle}">Info — Subtle</p>
        <div style="${rowStyle}">
          ${TAG_SEMANTICS.map(
            s => /*html*/ `<mud-tag variant="info" type="subtle" semantic="${s}">${ROMANIAN_LABELS[s]}</mud-tag>`,
          ).join('')}
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Info — Strong</p>
        <div style="${rowStyle}">
          ${TAG_SEMANTICS.map(
            s => /*html*/ `<mud-tag variant="info" type="strong" semantic="${s}">${ROMANIAN_LABELS[s]}</mud-tag>`,
          ).join('')}
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Info — With leading icon</p>
        <div style="${rowStyle}">
          <mud-tag variant="info" type="subtle" semantic="success">
            <mud-icon slot="icon-start" name="checkmark-small" size="16"></mud-icon>
            Inclus
          </mud-tag>
          <mud-tag variant="info" type="subtle" semantic="brand">
            <mud-icon slot="icon-start" name="circle-info" size="16"></mud-icon>
            Recomandat
          </mud-tag>
        </div>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: '<mud-tag variant="info" semantic="brand">Nou</mud-tag>',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Group — horizontal stacked with 8 px gutter
// ---------------------------------------------------------------------------

export const Group: Story = {
  name: 'Group',
  render: () => /*html*/ `
    <div style="${sectionStyle}">
      <p style="${hintStyle}">
        Tags stacked horizontally with an 8 px gutter wrap onto multiple lines
        when the row overflows. Used inside cards, table rows, and filter bars.
      </p>
      <div style="${groupStyle}">
        <mud-tag type="subtle" semantic="brand">Activ</mud-tag>
        <mud-tag type="subtle" semantic="success">Aprobat</mud-tag>
        <mud-tag type="subtle" semantic="accent">În așteptare</mud-tag>
        <mud-tag type="subtle" semantic="danger">Refuzat</mud-tag>
        <mud-tag type="subtle" semantic="accent">Expirat</mud-tag>
        <mud-tag type="subtle" semantic="neutral">Nou</mud-tag>
      </div>
      <div style="${groupStyle}">
        <mud-tag type="outlined" semantic="brand">
          <mud-icon slot="icon-start" name="checkmark-small" size="16"></mud-icon>
          Verificat
        </mud-tag>
        <mud-tag type="outlined" semantic="success">Aprobat</mud-tag>
        <mud-tag type="outlined" semantic="danger">Refuzat</mud-tag>
        <mud-tag type="outlined" semantic="muted">Schiță</mud-tag>
      </div>
      <div style="${groupStyle}; max-width: 320px;">
        <mud-tag type="subtle" semantic="brand">Apartament</mud-tag>
        <mud-tag type="subtle" semantic="brand">3 camere</mud-tag>
        <mud-tag type="subtle" semantic="brand">Etaj 2/5</mud-tag>
        <mud-tag type="subtle" semantic="brand">76 m²</mud-tag>
        <mud-tag type="subtle" semantic="success">Disponibil</mud-tag>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: /*html*/ `
<div style="display: flex; gap: var(--spacing-8); flex-wrap: wrap;">
  <mud-tag type="subtle" semantic="brand">Activ</mud-tag>
  <mud-tag type="subtle" semantic="success">Aprobat</mud-tag>
  <mud-tag type="subtle" semantic="accent">În așteptare</mud-tag>
</div>`.trim(),
      },
    },
  },
};
