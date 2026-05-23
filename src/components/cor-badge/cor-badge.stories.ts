import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { BADGE_SIZES as SIZES, BADGE_TYPES as TYPES, BADGE_VARIANTS as VARIANTS } from './cor-badge.types';
import type { BadgeSize, BadgeType, BadgeVariant } from './cor-badge.types';

type BadgeArgs = {
  type: BadgeType;
  variant: BadgeVariant;
  size: BadgeSize;
  count?: number;
  max: number;
  ariaLabel?: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); text-align: center;';

const renderBadge = (args: BadgeArgs) => {
  const countAttr = args.type === 'numbered' && args.count !== undefined ? `count="${args.count}"` : '';
  const ariaAttr = args.ariaLabel ? `aria-label="${args.ariaLabel}"` : '';
  return /*html*/ `<cor-badge type="${args.type}" variant="${args.variant}" size="${args.size}" max="${args.max}" ${countAttr} ${ariaAttr}></cor-badge>`;
};

const meta: Meta<BadgeArgs> = {
  title: 'Atoms/Badge',
  component: 'cor-badge',
  argTypes: {
    type: {
      control: 'select',
      options: TYPES,
      description: 'Visual form — `numbered` shows the count, `dot` is a presence indicator.',
      table: { defaultValue: { summary: 'numbered' } },
    },
    variant: {
      control: 'select',
      options: VARIANTS,
      description: 'Semantic color variant.',
      table: { defaultValue: { summary: 'danger' } },
    },
    size: {
      control: 'select',
      options: SIZES,
      description: 'Size rung. `sm` = 12 px, `md` = 16 px.',
      table: { defaultValue: { summary: 'md' } },
    },
    count: {
      control: { type: 'number', min: 0, max: 999 },
      description: 'Numeric count (numbered only).',
    },
    max: {
      control: { type: 'number', min: 1, max: 999 },
      description: 'Counts above this render as `"{max}+"`.',
      table: { defaultValue: { summary: '99' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Override the accessible name.',
    },
  },
};
export default meta;

type Story = StoryObj<BadgeArgs>;

export const Default: Story = {
  render: renderBadge,
  args: { type: 'numbered', variant: 'danger', size: 'md', count: 3, max: 99 },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: BadgeArgs }) => renderBadge(args),
      },
    },
  },
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: var(--spacing-24); padding: var(--spacing-24); flex-wrap: wrap;">
      ${VARIANTS.map(
        variant => /*html*/ `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <cor-badge variant="${variant}" count="3"></cor-badge>
          <span style="${cellLabelStyle}">${variant}</span>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: VARIANTS.map(variant => `<cor-badge variant="${variant}" count="3"></cor-badge>`).join('\n'),
      },
    },
  },
};

export const AllTypes: Story = {
  name: 'All Types',
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: var(--spacing-32); padding: var(--spacing-24); flex-wrap: wrap;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
        <cor-badge type="numbered" variant="danger" count="3"></cor-badge>
        <span style="${cellLabelStyle}">numbered</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
        <cor-badge type="dot" variant="danger"></cor-badge>
        <span style="${cellLabelStyle}">dot</span>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TYPES.map(t =>
          t === 'dot'
            ? `<cor-badge type="dot" variant="danger"></cor-badge>`
            : `<cor-badge type="numbered" variant="danger" count="3"></cor-badge>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: var(--spacing-32); padding: var(--spacing-24); flex-wrap: wrap;">
      ${SIZES.map(
        size => /*html*/ `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <div style="display: flex; align-items: center; gap: var(--spacing-12);">
            <cor-badge type="numbered" variant="danger" size="${size}" count="3"></cor-badge>
            <cor-badge type="dot" variant="danger" size="${size}"></cor-badge>
          </div>
          <span style="${cellLabelStyle}">${size}</span>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SIZES.flatMap(size => [
          `<cor-badge type="numbered" variant="danger" size="${size}" count="3"></cor-badge>`,
          `<cor-badge type="dot" variant="danger" size="${size}"></cor-badge>`,
        ]).join('\n'),
      },
    },
  },
};

export const Numbered: Story = {
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: var(--spacing-24); padding: var(--spacing-24); flex-wrap: wrap;">
      ${[1, 2, 12, 99, 250]
        .map(
          n => /*html*/ `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <cor-badge type="numbered" variant="danger" count="${n}"></cor-badge>
          <span style="${cellLabelStyle}">count=${n}</span>
        </div>`,
        )
        .join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [1, 2, 12, 99, 250]
          .map(n => `<cor-badge type="numbered" variant="danger" count="${n}"></cor-badge>`)
          .join('\n'),
      },
    },
  },
};

export const Dot: Story = {
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: var(--spacing-24); padding: var(--spacing-24); flex-wrap: wrap;">
      ${VARIANTS.map(
        variant => /*html*/ `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <cor-badge type="dot" variant="${variant}"></cor-badge>
          <span style="${cellLabelStyle}">${variant}</span>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: VARIANTS.map(variant => `<cor-badge type="dot" variant="${variant}"></cor-badge>`).join('\n'),
      },
    },
  },
};

export const OverMax: Story = {
  name: 'Over Max',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); display: grid; gap: var(--spacing-16);">
      <p style="${cellLabelStyle}; text-align: start; margin: 0;">
        Counts above <code>max</code> render as <code>"{max}+"</code>. The default <code>max</code> is <code>99</code>.
      </p>
      <div style="display: flex; align-items: center; gap: var(--spacing-24); flex-wrap: wrap;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <cor-badge type="numbered" variant="danger" count="100"></cor-badge>
          <span style="${cellLabelStyle}">count=100 (max=99)</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <cor-badge type="numbered" variant="danger" count="999"></cor-badge>
          <span style="${cellLabelStyle}">count=999 (max=99)</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <cor-badge type="numbered" variant="danger" count="15" max="9"></cor-badge>
          <span style="${cellLabelStyle}">count=15, max=9</span>
        </div>
      </div>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          `<cor-badge type="numbered" variant="danger" count="100"></cor-badge>`,
          `<cor-badge type="numbered" variant="danger" count="999"></cor-badge>`,
          `<cor-badge type="numbered" variant="danger" count="15" max="9"></cor-badge>`,
        ].join('\n'),
      },
    },
  },
};

export const ComposedWithIcon: Story = {
  name: 'Composed with Icon',
  render: () => {
    const iconStyle = `
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 40px;
      block-size: 40px;
      border-radius: var(--border-radius-full, 9999px);
      background: var(--color-background-base-secondary);
      color: var(--color-text-base-default);
    `;
    const badgeWrapStyle = `
      position: absolute;
      inset-block-start: -2px;
      inset-inline-end: -2px;
      transform: translate(25%, -25%);
    `;
    // Simple bell glyph drawn with an inline SVG so the example does not depend on cor-icon assets.
    const bell = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
        <path d="M10 21a2 2 0 0 0 4 0"></path>
      </svg>`;
    return /*html*/ `
      <div style="display: flex; align-items: center; gap: var(--spacing-32); padding: var(--spacing-24); flex-wrap: wrap;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <span style="${iconStyle}">
            ${bell}
            <span style="${badgeWrapStyle}"><cor-badge type="dot" variant="danger" size="sm"></cor-badge></span>
          </span>
          <span style="${cellLabelStyle}">dot · sm</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <span style="${iconStyle}">
            ${bell}
            <span style="${badgeWrapStyle}"><cor-badge type="numbered" variant="danger" count="3"></cor-badge></span>
          </span>
          <span style="${cellLabelStyle}">numbered · 3</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <span style="${iconStyle}">
            ${bell}
            <span style="${badgeWrapStyle}"><cor-badge type="numbered" variant="brand" count="250"></cor-badge></span>
          </span>
          <span style="${cellLabelStyle}">brand · 99+</span>
        </div>
      </div>
    `;
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Badges position over a parent via absolute placement on the parent. The badge itself is unaware — consumers control offset.',
      },
      source: {
        code: `<span style="position: relative;">
  <!-- icon glyph -->
  <span style="position: absolute; inset-block-start: -2px; inset-inline-end: -2px; transform: translate(25%, -25%);">
    <cor-badge type="numbered" variant="danger" count="3"></cor-badge>
  </span>
</span>`,
      },
    },
  },
};
