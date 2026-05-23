import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { CHIP_SIZES, CHIP_TYPES } from './cor-chip.types';
import type { ChipSize, ChipType } from './cor-chip.types';

type ChipArgs = {
  type: ChipType;
  size: ChipSize;
  selected: boolean;
  disabled: boolean;
  removable: boolean;
  label: string;
};

const renderChip = (args: ChipArgs) => /*html*/ `
  <cor-chip
    type="${args.type}"
    size="${args.size}"
    ${args.selected ? 'selected' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.removable ? 'removable' : ''}
  >${args.label}</cor-chip>
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
  const open = attrs ? `<cor-chip ${attrs}>` : '<cor-chip>';
  return `${open}${args.label}</cor-chip>`;
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
  component: 'cor-chip',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: /*md*/ `
**Chip** — compact, pill-shaped control. Use it to filter a result set
(\`type="filter"\`) or to surface a discrete value entered by the user
(\`type="input"\`).

Filter chips toggle on click and emit \`corSelect\` with the new selected
state. Input chips can be \`removable\`, rendering a trailing close button
that emits \`corRemove\` on activation.

Both modes inherit the \`cor-button\` focus-ring vocabulary and meet the
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
    docs: { source: { code: docsSourceDefault({ ...meta.args! } as ChipArgs) } },
  },
};

// ---------------------------------------------------------------------------
// Selected — filter chip in the selected state
// ---------------------------------------------------------------------------
export const Selected: Story = {
  args: { selected: true, label: 'Apartament' },
  render: renderChip,
  parameters: {
    docs: { source: { code: '<cor-chip selected>Apartament</cor-chip>' } },
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
        <cor-chip>Apartament</cor-chip>
        <cor-chip selected>Casă</cor-chip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Input — default / removable</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <cor-chip type="input">Comercial</cor-chip>
        <cor-chip type="input" removable>Ion Popescu</cor-chip>
      </div>
    </div>
  </div>
`;
const docsSourceAllTypes = /*html*/ `<!-- filter -->
<cor-chip>Apartament</cor-chip>
<cor-chip selected>Casă</cor-chip>

<!-- input -->
<cor-chip type="input">Comercial</cor-chip>
<cor-chip type="input" removable>Ion Popescu</cor-chip>`;
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
        <cor-chip size="sm">Apartament</cor-chip>
        <cor-chip size="md">Apartament</cor-chip>
        <cor-chip size="sm" selected>Casă</cor-chip>
        <cor-chip size="md" selected>Casă</cor-chip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Input</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <cor-chip type="input" size="sm">Comercial</cor-chip>
        <cor-chip type="input" size="md">Comercial</cor-chip>
        <cor-chip type="input" size="sm" removable>Ion Popescu</cor-chip>
        <cor-chip type="input" size="md" removable>Ion Popescu</cor-chip>
      </div>
    </div>
  </div>
`;
const docsSourceAllSizes = /*html*/ `<cor-chip size="sm">Apartament</cor-chip>
<cor-chip size="md">Apartament</cor-chip>
<cor-chip size="md" selected>Casă</cor-chip>
<cor-chip type="input" size="md" removable>Ion Popescu</cor-chip>`;
export const AllSizes: Story = {
  render: renderAllSizes,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceAllSizes } } },
};

// ---------------------------------------------------------------------------
// WithIcon — filter chip with a leading icon (slot="icon-start")
// ---------------------------------------------------------------------------
const renderWithIcon = () => /*html*/ `
  <div style="${rowStyle}; padding: var(--spacing-24);">
    <cor-chip>
      <cor-icon slot="icon-start" name="map-pin" size="20" color="currentColor"></cor-icon>
      Apartament
    </cor-chip>
    <cor-chip selected>
      <cor-icon slot="icon-start" name="checkmark-small" size="20" color="currentColor"></cor-icon>
      Casă
    </cor-chip>
    <cor-chip type="input" removable>
      <cor-icon slot="icon-start" name="map-pin" size="20" color="currentColor"></cor-icon>
      Chișinău
    </cor-chip>
  </div>
`;
const docsSourceWithIcon = /*html*/ `<cor-chip>
  <cor-icon slot="icon-start" name="map-pin" size="20" color="currentColor"></cor-icon>
  Apartament
</cor-chip>

<cor-chip selected>
  <cor-icon slot="icon-start" name="checkmark-small" size="20" color="currentColor"></cor-icon>
  Casă
</cor-chip>

<cor-chip type="input" removable>
  <cor-icon slot="icon-start" name="map-pin" size="20" color="currentColor"></cor-icon>
  Chișinău
</cor-chip>`;
export const WithIcon: Story = {
  render: renderWithIcon,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceWithIcon } } },
};

// ---------------------------------------------------------------------------
// Removable — input chip with a trailing × button
// ---------------------------------------------------------------------------
const renderRemovable = () => /*html*/ `
  <div style="${rowStyle}; padding: var(--spacing-24);">
    <cor-chip type="input" removable>Ion Popescu</cor-chip>
    <cor-chip type="input" size="sm" removable>Maria Ionescu</cor-chip>
    <cor-chip type="input" removable disabled>Vasile (dezactivat)</cor-chip>
  </div>
`;
const docsSourceRemovable = /*html*/ `<cor-chip type="input" removable>Ion Popescu</cor-chip>
<cor-chip type="input" size="sm" removable>Maria Ionescu</cor-chip>
<cor-chip type="input" removable disabled>Vasile (dezactivat)</cor-chip>`;
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
      <cor-chip selected>Apartament</cor-chip>
      <cor-chip>Casă</cor-chip>
      <cor-chip selected>Comercial</cor-chip>
      <cor-chip>Teren</cor-chip>
      <cor-chip>Garaj</cor-chip>
      <cor-chip>Depozit</cor-chip>
    </div>
  </div>
`;
const docsSourceMultiSelectionGroup = /*html*/ `<div role="group" aria-label="Tip de proprietate">
  <cor-chip selected>Apartament</cor-chip>
  <cor-chip>Casă</cor-chip>
  <cor-chip selected>Comercial</cor-chip>
  <cor-chip>Teren</cor-chip>
  <cor-chip>Garaj</cor-chip>
  <cor-chip>Depozit</cor-chip>
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
    <cor-chip disabled>Apartament</cor-chip>
    <cor-chip selected disabled>Casă</cor-chip>
    <cor-chip type="input" disabled>Comercial</cor-chip>
    <cor-chip type="input" removable disabled>Ion Popescu</cor-chip>
  </div>
`;
const docsSourceDisabled = /*html*/ `<cor-chip disabled>Apartament</cor-chip>
<cor-chip selected disabled>Casă</cor-chip>
<cor-chip type="input" disabled>Comercial</cor-chip>
<cor-chip type="input" removable disabled>Ion Popescu</cor-chip>`;
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
        <cor-chip style="inline-size: 100%;">Apartament cu trei camere în centrul Chișinăului</cor-chip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Diacritice românești (ă â î ș ț)</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <cor-chip selected>Înălțime mărită</cor-chip>
        <cor-chip>Țărănești</cor-chip>
        <cor-chip>Așteaptă confirmarea</cor-chip>
      </div>
    </div>
    <div>
      <p style="${captionStyle}">Doar prop label (slot gol)</p>
      <div style="${rowStyle}; margin-top: var(--spacing-8);">
        <cor-chip label="Apartament din prop"></cor-chip>
      </div>
    </div>
  </div>
`;
const docsSourceEdgeCases = /*html*/ `<!-- truncation -->
<div style="max-inline-size: 220px;">
  <cor-chip>Apartament cu trei camere în centrul Chișinăului</cor-chip>
</div>

<!-- diacritics -->
<cor-chip selected>Înălțime mărită</cor-chip>

<!-- label prop fallback -->
<cor-chip label="Apartament din prop"></cor-chip>`;
export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceEdgeCases } } },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<cor-chip>Coverage</cor-chip>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('cor-chip') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('cor-chip constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
