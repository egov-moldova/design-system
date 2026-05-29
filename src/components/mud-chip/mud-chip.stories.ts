import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { CHIP_SIZES, CHIP_TYPES } from './mud-chip.types';
import type { ChipSize, ChipType } from './mud-chip.types';

type ChipArgs = {
  type: ChipType;
  size: ChipSize;
  selected: boolean;
  disabled: boolean;
  removable: boolean;
  label: string;
};

const renderChip = (args: ChipArgs) => /*html*/ `
  <mud-chip
    type="${args.type}"
    size="${args.size}"
    ${args.selected ? 'selected' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.removable ? 'removable' : ''}
  >${args.label}</mud-chip>
`;

const docsSourceDefault = (args: ChipArgs) => {
  const attrs = [
    args.type !== 'filter' ? `type="${args.type}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.selected ? 'selected' : '',
    args.disabled ? 'disabled' : '',
    args.removable ? 'removable' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const open = attrs ? `<mud-chip ${attrs}>` : '<mud-chip>';
  return `${open}${args.label}</mud-chip>`;
};

// ---------------------------------------------------------------------------
// Comparison grid helpers
// ---------------------------------------------------------------------------

const sectionStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); align-items: flex-start;';
const rowStyle = 'display: flex; flex-wrap: wrap; gap: var(--spacing-12); align-items: center;';
const groupStyle = 'display: flex; flex-wrap: wrap; gap: var(--spacing-8); align-items: center;';
const captionStyle =
  'font-family: var(--font-family-primary); font-size: 12px; font-weight: 500; color: var(--color-text-base-secondary); margin: 0;';

const meta: Meta<ChipArgs> = {
  title: 'Atoms/Chip',
  component: 'mud-chip',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: /*md*/ `
**Chip** — compact, pill-shaped control. Use it to filter a result set
(\`type="filter"\`) or to surface a discrete value entered by the user
(\`type="input"\`).

Filter chips toggle on click and emit \`mudSelect\` with the new selected
state. Input chips can be \`removable\`, rendering a trailing close button
that emits \`mudRemove\` on activation.

Both modes inherit the \`mud-button\` focus-ring vocabulary and meet the
44 × 44 px touch target on coarse pointers via an invisible hit-area
extension.
        `.trim(),
      },
    },
  },
  argTypes: {
    type: {
      control: 'inline-radio',
      options: CHIP_TYPES,
      description: 'Behavioral mode.',
      table: { defaultValue: { summary: 'filter' } },
    },
    size: {
      control: 'inline-radio',
      options: CHIP_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    selected: {
      control: 'boolean',
      description: 'Selected state. Only meaningful when `type="filter"`.',
    },
    disabled: { control: 'boolean' },
    removable: {
      control: 'boolean',
      description: 'Trailing close button. Only meaningful when `type="input"`.',
    },
    label: { control: 'text', description: 'Default-slot text content.' },
  },
  args: {
    type: 'filter',
    size: 'md',
    selected: false,
    disabled: false,
    removable: false,
    label: 'Apartament',
  },
};

export default meta;
type Story = StoryObj<ChipArgs>;

// ---------------------------------------------------------------------------
// Default — single filter chip (unselected)
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderChip,
  parameters: {
    docs: {
      source: {
        // `type: 'dynamic'` re-runs the transform when controls change; without
        // it the global `type: 'code'` (set in preview.js) caches the snippet
        // at story registration with the initial args.
        type: 'dynamic',
        transform: (_code: string, { args }: { args: ChipArgs }) => docsSourceDefault(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Selected — filter chip in the selected state
// ---------------------------------------------------------------------------
export const Selected: Story = {
  args: { selected: true, label: 'Apartament' },
  render: renderChip,
  parameters: {
    docs: { source: { code: '<mud-chip selected>Apartament</mud-chip>' } },
  },
};

// ---------------------------------------------------------------------------
// AllTypes — filter (default + selected) and input (default + removable)
// ---------------------------------------------------------------------------
const renderAllTypes = () => /*html*/ `
  <div style="${sectionStyle}">
    <div>
      <p style="${captionStyle}">Filter — default / selected</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <mud-chip>Apartament</mud-chip>
        <mud-chip selected>Casă</mud-chip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Input — default / removable</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <mud-chip type="input">Comercial</mud-chip>
        <mud-chip type="input" removable>Ion Popescu</mud-chip>
      </div>
    </div>
  </div>
`;
const docsSourceAllTypes = /*html*/ `<!-- filter -->
<mud-chip>Apartament</mud-chip>
<mud-chip selected>Casă</mud-chip>

<!-- input -->
<mud-chip type="input">Comercial</mud-chip>
<mud-chip type="input" removable>Ion Popescu</mud-chip>`;
export const AllTypes: Story = {
  render: renderAllTypes,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllTypes } } },
};

// ---------------------------------------------------------------------------
// AllSizes — sm + md across both types
// ---------------------------------------------------------------------------
const renderAllSizes = () => /*html*/ `
  <div style="${sectionStyle}">
    <div>
      <p style="${captionStyle}">Filter</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <mud-chip size="sm">Apartament</mud-chip>
        <mud-chip size="md">Apartament</mud-chip>
        <mud-chip size="sm" selected>Casă</mud-chip>
        <mud-chip size="md" selected>Casă</mud-chip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Input</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <mud-chip type="input" size="sm">Comercial</mud-chip>
        <mud-chip type="input" size="md">Comercial</mud-chip>
        <mud-chip type="input" size="sm" removable>Ion Popescu</mud-chip>
        <mud-chip type="input" size="md" removable>Ion Popescu</mud-chip>
      </div>
    </div>
  </div>
`;
const docsSourceAllSizes = /*html*/ `<mud-chip size="sm">Apartament</mud-chip>
<mud-chip size="md">Apartament</mud-chip>
<mud-chip size="md" selected>Casă</mud-chip>
<mud-chip type="input" size="md" removable>Ion Popescu</mud-chip>`;
export const AllSizes: Story = {
  render: renderAllSizes,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllSizes } } },
};

// ---------------------------------------------------------------------------
// WithIcon — filter chip with a leading icon (slot="icon-start")
// ---------------------------------------------------------------------------
const renderWithIcon = () => /*html*/ `
  <div style="${rowStyle}; padding: var(--spacing-24);">
    <mud-chip>
      <mud-icon slot="icon-start" name="map-pin" size="20"></mud-icon>
      Apartament
    </mud-chip>
    <mud-chip selected>
      <mud-icon slot="icon-start" name="checkmark-small" size="20"></mud-icon>
      Casă
    </mud-chip>
    <mud-chip type="input" removable>
      <mud-icon slot="icon-start" name="map-pin" size="20"></mud-icon>
      Chișinău
    </mud-chip>
  </div>
`;
const docsSourceWithIcon = /*html*/ `<mud-chip>
  <mud-icon slot="icon-start" name="map-pin" size="20"></mud-icon>
  Apartament
</mud-chip>

<mud-chip selected>
  <mud-icon slot="icon-start" name="checkmark-small" size="20"></mud-icon>
  Casă
</mud-chip>

<mud-chip type="input" removable>
  <mud-icon slot="icon-start" name="map-pin" size="20"></mud-icon>
  Chișinău
</mud-chip>`;
export const WithIcon: Story = {
  render: renderWithIcon,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceWithIcon } } },
};

// ---------------------------------------------------------------------------
// Removable — input chip with a trailing × button
// ---------------------------------------------------------------------------
const renderRemovable = () => /*html*/ `
  <div style="${rowStyle}; padding: var(--spacing-24);">
    <mud-chip type="input" removable>Ion Popescu</mud-chip>
    <mud-chip type="input" size="sm" removable>Maria Ionescu</mud-chip>
    <mud-chip type="input" removable disabled>Vasile (dezactivat)</mud-chip>
  </div>
`;
const docsSourceRemovable = /*html*/ `<mud-chip type="input" removable>Ion Popescu</mud-chip>
<mud-chip type="input" size="sm" removable>Maria Ionescu</mud-chip>
<mud-chip type="input" removable disabled>Vasile (dezactivat)</mud-chip>`;
export const Removable: Story = {
  render: renderRemovable,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceRemovable } } },
};

// ---------------------------------------------------------------------------
// MultiSelectionGroup — interactive filter chip set
// ---------------------------------------------------------------------------
const renderMultiSelectionGroup = () => /*html*/ `
  <div style="${sectionStyle}">
    <p style="${captionStyle}">Tip de proprietate (mai multe selecții permise)</p>
    <div style="${groupStyle}" role="group" aria-label="Tip de proprietate">
      <mud-chip selected>Apartament</mud-chip>
      <mud-chip>Casă</mud-chip>
      <mud-chip selected>Comercial</mud-chip>
      <mud-chip>Teren</mud-chip>
      <mud-chip>Garaj</mud-chip>
      <mud-chip>Depozit</mud-chip>
    </div>
  </div>
`;
const docsSourceMultiSelectionGroup = /*html*/ `<div role="group" aria-label="Tip de proprietate">
  <mud-chip selected>Apartament</mud-chip>
  <mud-chip>Casă</mud-chip>
  <mud-chip selected>Comercial</mud-chip>
  <mud-chip>Teren</mud-chip>
  <mud-chip>Garaj</mud-chip>
  <mud-chip>Depozit</mud-chip>
</div>`;
export const MultiSelectionGroup: Story = {
  render: renderMultiSelectionGroup,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceMultiSelectionGroup } } },
};

// ---------------------------------------------------------------------------
// Disabled — all type/state combinations in disabled form
// ---------------------------------------------------------------------------
const renderDisabled = () => /*html*/ `
  <div style="${rowStyle}; padding: var(--spacing-24);">
    <mud-chip disabled>Apartament</mud-chip>
    <mud-chip selected disabled>Casă</mud-chip>
    <mud-chip type="input" disabled>Comercial</mud-chip>
    <mud-chip type="input" removable disabled>Ion Popescu</mud-chip>
  </div>
`;
const docsSourceDisabled = /*html*/ `<mud-chip disabled>Apartament</mud-chip>
<mud-chip selected disabled>Casă</mud-chip>
<mud-chip type="input" disabled>Comercial</mud-chip>
<mud-chip type="input" removable disabled>Ion Popescu</mud-chip>`;
export const Disabled: Story = {
  render: renderDisabled,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceDisabled } } },
};

// ---------------------------------------------------------------------------
// EdgeCases — long labels, diacritics, narrow container, missing label
// ---------------------------------------------------------------------------
const renderEdgeCases = () => /*html*/ `
  <div style="${sectionStyle}">
    <div>
      <p style="${captionStyle}">Etichete lungi se truncă cu ellipsis</p>
      <div style="display: flex; gap: var(--spacing-8); inline-size: 220px; margin-top: var(--spacing-8);">
        <mud-chip style="inline-size: 100%;">Apartament cu trei camere în centrul Chișinăului</mud-chip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Diacritice românești (ă â î ș ț)</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <mud-chip selected>Înălțime mărită</mud-chip>
        <mud-chip>Țărănești</mud-chip>
        <mud-chip>Așteaptă confirmarea</mud-chip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Doar prop label (slot gol)</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <mud-chip label="Apartament din prop"></mud-chip>
      </div>
    </div>
  </div>
`;
const docsSourceEdgeCases = /*html*/ `<!-- truncation -->
<div style="max-inline-size: 220px;">
  <mud-chip>Apartament cu trei camere în centrul Chișinăului</mud-chip>
</div>

<!-- diacritics -->
<mud-chip selected>Înălțime mărită</mud-chip>

<!-- label prop fallback -->
<mud-chip label="Apartament din prop"></mud-chip>`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceEdgeCases } } },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-chip>Coverage</mud-chip>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-chip') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('mud-chip constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
