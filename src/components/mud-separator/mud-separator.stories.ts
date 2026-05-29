import type { Meta, StoryObj } from '@storybook/web-components-vite';

import {
  SEPARATOR_ORIENTATIONS as ORIENTATIONS,
  SEPARATOR_SIZES as SIZES,
  SEPARATOR_VARIANTS as VARIANTS,
} from './mud-separator.types';
import type { SeparatorOrientation, SeparatorSize, SeparatorVariant } from './mud-separator.types';

type SeparatorArgs = {
  orientation: SeparatorOrientation;
  size: SeparatorSize;
  variant: SeparatorVariant;
  inset: boolean;
  label: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); text-align: center;';

const renderSeparator = (args: SeparatorArgs) => /*html*/ `
  <mud-separator
    orientation="${args.orientation}"
    size="${args.size}"
    variant="${args.variant}"
    ${args.inset ? 'inset' : ''}
    ${args.label ? `label="${args.label}"` : ''}
  ></mud-separator>
`;

const meta: Meta<SeparatorArgs> = {
  title: 'Atoms/Separator',
  component: 'mud-separator',
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ORIENTATIONS,
      description: 'Layout orientation.',
      table: { defaultValue: { summary: 'horizontal' } },
    },
    size: {
      control: 'select',
      options: SIZES,
      description: 'Visual thickness of the rule.',
      table: { defaultValue: { summary: 'thin' } },
    },
    variant: {
      control: 'select',
      options: VARIANTS,
      description: 'Color treatment / emphasis.',
      table: { defaultValue: { summary: 'subtle' } },
    },
    inset: {
      control: 'boolean',
      description: 'Adds outer spacing on the cross axis (lists, menus).',
      table: { defaultValue: { summary: 'false' } },
    },
    label: {
      control: 'text',
      description: 'Optional inline plain-text label rendered in the middle.',
    },
  },
};
export default meta;

type Story = StoryObj<SeparatorArgs>;

export const Default: Story = {
  render: args => /*html*/ `
    <div style="inline-size: 360px; padding: var(--spacing-24);">
      ${renderSeparator(args)}
    </div>
  `,
  args: {
    orientation: 'horizontal',
    size: 'thin',
    variant: 'subtle',
    inset: false,
    label: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: SeparatorArgs }) =>
          `<mud-separator orientation="${args.orientation}" size="${args.size}" variant="${args.variant}"${
            args.inset ? ' inset' : ''
          }${args.label ? ` label="${args.label}"` : ''}></mud-separator>`,
      },
    },
  },
};

export const Vertical: Story = {
  name: 'Vertical',
  render: () => /*html*/ `
    <div style="display: inline-flex; align-items: center; gap: var(--spacing-16); padding: var(--spacing-24); block-size: 56px;">
      <span style="font-family: var(--font-family-primary);">Stânga</span>
      <mud-separator orientation="vertical" size="thin" variant="subtle"></mud-separator>
      <span style="font-family: var(--font-family-primary);">Mijloc</span>
      <mud-separator orientation="vertical" size="thin" variant="subtle"></mud-separator>
      <span style="font-family: var(--font-family-primary);">Dreapta</span>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<mud-separator orientation="vertical" size="thin" variant="subtle"></mud-separator>`,
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: 1fr; gap: var(--spacing-24); padding: var(--spacing-24); inline-size: 480px;">
      ${SIZES.map(
        size => /*html*/ `
        <div>
          <span style="${cellLabelStyle}; text-align: start; display: block; margin-block-end: var(--spacing-4);">${size}</span>
          <mud-separator size="${size}" variant="subtle"></mud-separator>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SIZES.map(s => `<mud-separator size="${s}" variant="subtle"></mud-separator>`).join('\n'),
      },
    },
  },
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: 1fr; gap: var(--spacing-24); padding: var(--spacing-24); inline-size: 480px;">
      ${VARIANTS.map(
        variant => /*html*/ `
        <div>
          <span style="${cellLabelStyle}; text-align: start; display: block; margin-block-end: var(--spacing-4);">${variant}</span>
          <mud-separator size="thin" variant="${variant}"></mud-separator>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: VARIANTS.map(v => `<mud-separator size="thin" variant="${v}"></mud-separator>`).join('\n'),
      },
    },
  },
};

export const AllVariantsXSizes: Story = {
  name: 'All Variants × Sizes',
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: 96px repeat(${SIZES.length}, 1fr); gap: var(--spacing-16) var(--spacing-24); padding: var(--spacing-24); align-items: center;">
      <div></div>
      ${SIZES.map(size => /*html*/ `<div style="${cellLabelStyle}">${size}</div>`).join('')}
      ${VARIANTS.map(
        variant => /*html*/ `
          <div style="${cellLabelStyle}; text-align: start;">${variant}</div>
          ${SIZES.map(size => /*html*/ `<mud-separator size="${size}" variant="${variant}"></mud-separator>`).join('')}
        `,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: VARIANTS.map(
          variant =>
            `<!-- variant: ${variant} -->\n` +
            SIZES.map(size => `<mud-separator size="${size}" variant="${variant}"></mud-separator>`).join('\n'),
        ).join('\n\n'),
      },
    },
  },
};

export const WithLabel: Story = {
  name: 'With Label',
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: 1fr; gap: var(--spacing-24); padding: var(--spacing-24); inline-size: 480px;">
      <mud-separator label="sau"></mud-separator>
      <mud-separator label="și"></mud-separator>
      <mud-separator variant="mild" label="continuă cu"></mud-separator>
      <mud-separator variant="strong" size="medium" label="SAU"></mud-separator>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<mud-separator label="sau"></mud-separator>
<mud-separator label="și"></mud-separator>
<mud-separator variant="mild" label="continuă cu"></mud-separator>
<mud-separator variant="strong" size="medium" label="SAU"></mud-separator>`,
      },
    },
  },
};

export const WithIcon: Story = {
  name: 'With Icon (slot)',
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: 1fr; gap: var(--spacing-24); padding: var(--spacing-24); inline-size: 480px;">
      <mud-separator>
        <mud-icon name="info" size="sm"></mud-icon>
        <span>informație</span>
      </mud-separator>
      <mud-separator variant="mild">
        <mud-icon name="star" size="sm"></mud-icon>
      </mud-separator>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<mud-separator>
  <mud-icon name="info" size="sm"></mud-icon>
  <span>informație</span>
</mud-separator>`,
      },
    },
  },
};

export const Inset: Story = {
  name: 'Inset (in lists)',
  render: () => /*html*/ `
    <div style="font-family: var(--font-family-primary); inline-size: 360px; padding: var(--spacing-16); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-8);">
      <div style="padding-block: var(--spacing-12);">Articol unu</div>
      <mud-separator inset></mud-separator>
      <div style="padding-block: var(--spacing-12);">Articol doi</div>
      <mud-separator inset></mud-separator>
      <div style="padding-block: var(--spacing-12);">Articol trei</div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<div>Articol unu</div>
<mud-separator inset></mud-separator>
<div>Articol doi</div>
<mud-separator inset></mud-separator>
<div>Articol trei</div>`,
      },
    },
  },
};

export const InList: Story = {
  name: 'In List (composed)',
  render: () => /*html*/ `
    <ul style="list-style: none; margin: 0; padding: 0; font-family: var(--font-family-primary); inline-size: 360px; border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-8); overflow: hidden;">
      <li style="padding: var(--spacing-12) var(--spacing-16);">Profilul meu</li>
      <li><mud-separator></mud-separator></li>
      <li style="padding: var(--spacing-12) var(--spacing-16);">Setări</li>
      <li><mud-separator></mud-separator></li>
      <li style="padding: var(--spacing-12) var(--spacing-16);">Notificări</li>
      <li><mud-separator variant="mild"></mud-separator></li>
      <li style="padding: var(--spacing-12) var(--spacing-16); color: var(--color-text-danger-default);">Deconectare</li>
    </ul>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<ul>
  <li>Profilul meu</li>
  <li><mud-separator></mud-separator></li>
  <li>Setări</li>
  <li><mud-separator></mud-separator></li>
  <li>Notificări</li>
</ul>`,
      },
    },
  },
};

// Internal coverage story — exercises the Stencil-injected constructor guard
// (`if (registerHost !== false) { ... }`) for 100% branch coverage on the TSX.
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-separator></mud-separator>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-separator') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('mud-separator constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
