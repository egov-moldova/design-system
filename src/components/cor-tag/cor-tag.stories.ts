import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TAG_SEMANTICS, TAG_SIZES, TAG_TYPES, TAG_VARIANTS } from './cor-tag.types';
import type { TagSemantic, TagSize, TagType, TagVariant } from './cor-tag.types';

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
  neutral: 'Nou',
  info: 'Schiță',
  accent: 'În așteptare',
  success: 'Aprobat',
  warning: 'Expirat',
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
  const iconStart = args.iconStart ? `<cor-icon slot="icon-start" name="${args.iconStart}"></cor-icon>` : '';
  const iconEnd = args.iconEnd ? `<cor-icon slot="icon-end" name="${args.iconEnd}"></cor-icon>` : '';
  return /*html*/ `<cor-tag ${attrs}>${iconStart}${args.label}${iconEnd}</cor-tag>`;
};

const meta: Meta<TagArgs> = {
  title: 'Atoms/Tag',
  component: 'cor-tag',
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
  treatments (\`subtle\`, \`strong\`, \`outlined\`) across seven semantic
  colors.
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
      description: 'Leading icon name (uses cor-icon).',
    },
    iconEnd: {
      control: 'select',
      options: ['', ...Object.keys(ICON_PATHS)],
      description: 'Trailing icon name (uses cor-icon).',
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
            s => /*html*/ `<cor-tag type="subtle" semantic="${s}">${ROMANIAN_LABELS[s]}</cor-tag>`,
          ).join('')}
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Strong</p>
        <div style="${rowStyle}">
          ${TAG_SEMANTICS.map(
            s => /*html*/ `<cor-tag type="strong" semantic="${s}">${ROMANIAN_LABELS[s]}</cor-tag>`,
          ).join('')}
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Outlined</p>
        <div style="${rowStyle}">
          ${TAG_SEMANTICS.map(
            s => /*html*/ `<cor-tag type="outlined" semantic="${s}">${ROMANIAN_LABELS[s]}</cor-tag>`,
          ).join('')}
        </div>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TAG_SEMANTICS.map(s => `<cor-tag type="subtle" semantic="${s}">${ROMANIAN_LABELS[s]}</cor-tag>`).join(
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
              <cor-tag type="${t}" semantic="neutral">Nou</cor-tag>
              <cor-tag type="${t}" semantic="brand">Activ</cor-tag>
              <cor-tag type="${t}" semantic="success">Aprobat</cor-tag>
              <cor-tag type="${t}" semantic="danger">Refuzat</cor-tag>
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
        code: TAG_TYPES.map(t => `<cor-tag type="${t}" semantic="brand">Activ</cor-tag>`).join('\n'),
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
                s => /*html*/ `<cor-tag size="${size}" type="subtle" semantic="${s}">${ROMANIAN_LABELS[s]}</cor-tag>`,
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
        code: ['md', 'sm'].map(size => `<cor-tag size="${size}" semantic="brand">Activ</cor-tag>`).join('\n'),
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
          <cor-tag type="subtle" semantic="success">
            <cor-icon slot="icon-start" name="checkmark-small" size="16"></cor-icon>
            Aprobat
          </cor-tag>
          <cor-tag type="subtle" semantic="accent">
            <cor-icon slot="icon-start" name="time" size="16"></cor-icon>
            În așteptare
          </cor-tag>
          <cor-tag type="subtle" semantic="danger">
            <cor-icon slot="icon-start" name="cross-small" size="16"></cor-icon>
            Refuzat
          </cor-tag>
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Trailing icon</p>
        <div style="${rowStyle}">
          <cor-tag type="strong" semantic="brand">
            Detalii
            <cor-icon slot="icon-end" name="arrow-right" size="16"></cor-icon>
          </cor-tag>
          <cor-tag type="outlined" semantic="warning">
            Expiră curând
            <cor-icon slot="icon-end" name="bubble-alert" size="16"></cor-icon>
          </cor-tag>
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Both</p>
        <div style="${rowStyle}">
          <cor-tag type="subtle" semantic="brand">
            <cor-icon slot="icon-start" name="checkmark-small" size="16"></cor-icon>
            Verificat
            <cor-icon slot="icon-end" name="arrow-right" size="16"></cor-icon>
          </cor-tag>
        </div>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: /*html*/ `
<cor-tag type="subtle" semantic="success">
  <cor-icon slot="icon-start" name="checkmark-small" size="16"></cor-icon>
  Aprobat
</cor-tag>`.trim(),
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
        <cor-tag variant="info" type="subtle" semantic="brand">Nou</cor-tag>
        și include două zone de parcare
        <cor-tag variant="info" type="subtle" semantic="success">Inclus</cor-tag>.
      </p>
      <div>
        <p style="${captionStyle}">Info — Subtle</p>
        <div style="${rowStyle}">
          ${TAG_SEMANTICS.map(
            s => /*html*/ `<cor-tag variant="info" type="subtle" semantic="${s}">${ROMANIAN_LABELS[s]}</cor-tag>`,
          ).join('')}
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Info — Strong</p>
        <div style="${rowStyle}">
          ${TAG_SEMANTICS.map(
            s => /*html*/ `<cor-tag variant="info" type="strong" semantic="${s}">${ROMANIAN_LABELS[s]}</cor-tag>`,
          ).join('')}
        </div>
      </div>
      <div>
        <p style="${captionStyle}">Info — With leading icon</p>
        <div style="${rowStyle}">
          <cor-tag variant="info" type="subtle" semantic="success">
            <cor-icon slot="icon-start" name="checkmark-small" size="16"></cor-icon>
            Inclus
          </cor-tag>
          <cor-tag variant="info" type="subtle" semantic="brand">
            <cor-icon slot="icon-start" name="circle-info" size="16"></cor-icon>
            Recomandat
          </cor-tag>
        </div>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: '<cor-tag variant="info" semantic="brand">Nou</cor-tag>',
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
        <cor-tag type="subtle" semantic="brand">Activ</cor-tag>
        <cor-tag type="subtle" semantic="success">Aprobat</cor-tag>
        <cor-tag type="subtle" semantic="accent">În așteptare</cor-tag>
        <cor-tag type="subtle" semantic="danger">Refuzat</cor-tag>
        <cor-tag type="subtle" semantic="warning">Expirat</cor-tag>
        <cor-tag type="subtle" semantic="neutral">Nou</cor-tag>
      </div>
      <div style="${groupStyle}">
        <cor-tag type="outlined" semantic="brand">
          <cor-icon slot="icon-start" name="checkmark-small" size="16"></cor-icon>
          Verificat
        </cor-tag>
        <cor-tag type="outlined" semantic="success">Aprobat</cor-tag>
        <cor-tag type="outlined" semantic="danger">Refuzat</cor-tag>
        <cor-tag type="outlined" semantic="neutral">Schiță</cor-tag>
      </div>
      <div style="${groupStyle}; max-width: 320px;">
        <cor-tag type="subtle" semantic="brand">Apartament</cor-tag>
        <cor-tag type="subtle" semantic="brand">3 camere</cor-tag>
        <cor-tag type="subtle" semantic="brand">Etaj 2/5</cor-tag>
        <cor-tag type="subtle" semantic="brand">76 m²</cor-tag>
        <cor-tag type="subtle" semantic="success">Disponibil</cor-tag>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: /*html*/ `
<div style="display: flex; gap: var(--spacing-8); flex-wrap: wrap;">
  <cor-tag type="subtle" semantic="brand">Activ</cor-tag>
  <cor-tag type="subtle" semantic="success">Aprobat</cor-tag>
  <cor-tag type="subtle" semantic="accent">În așteptare</cor-tag>
</div>`.trim(),
      },
    },
  },
};
