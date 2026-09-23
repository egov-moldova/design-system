import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect, waitFor } from 'storybook/test';

import { BADGE_SIZES as SIZES, BADGE_TYPES as TYPES, BADGE_VARIANTS as VARIANTS } from './mud-badge.types';
import type { BadgeSize, BadgeType, BadgeVariant } from './mud-badge.types';

type BadgeArgs = {
  type: BadgeType;
  variant: BadgeVariant;
  size: BadgeSize;
  count?: number;
  max: number;
  ariaLabel?: string;
  disabled?: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); text-align: center;';

const renderBadge = (args: BadgeArgs) => {
  const countAttr = args.type === 'numbered' && args.count !== undefined ? `count="${args.count}"` : '';
  const ariaAttr = args.ariaLabel ? `aria-label="${args.ariaLabel}"` : '';
  const disabledAttr = args.disabled ? 'disabled' : '';
  return /*html*/ `<mud-badge type="${args.type}" variant="${args.variant}" size="${args.size}" max="${args.max}" ${countAttr} ${ariaAttr} ${disabledAttr}></mud-badge>`;
};

const meta: Meta<BadgeArgs> = {
  title: 'Components/Badge',
  component: 'mud-badge',
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
      description: 'Size rung — `xs` 8 px (dot only), `sm` 12, `md` 16, `lg` 20, `xl` 24 px.',
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
    disabled: {
      control: 'boolean',
      description: 'Renders the disabled design, replacing the variant colors.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
};
export default meta;

type Story = StoryObj<BadgeArgs>;

export const Default: Story = {
  render: renderBadge,
  args: { type: 'numbered', variant: 'danger', size: 'md', count: 3, max: 99, disabled: false },
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
          <mud-badge variant="${variant}" count="3"></mud-badge>
          <span style="${cellLabelStyle}">${variant}</span>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: VARIANTS.map(variant => `<mud-badge variant="${variant}" count="3"></mud-badge>`).join('\n'),
      },
    },
  },
};

export const AllTypes: Story = {
  name: 'All Types',
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: var(--spacing-32); padding: var(--spacing-24); flex-wrap: wrap;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
        <mud-badge type="numbered" variant="danger" count="3"></mud-badge>
        <span style="${cellLabelStyle}">numbered</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
        <mud-badge type="dot" variant="danger"></mud-badge>
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
            ? `<mud-badge type="dot" variant="danger"></mud-badge>`
            : `<mud-badge type="numbered" variant="danger" count="3"></mud-badge>`,
        ).join('\n'),
      },
    },
  },
};

export const Disabled: Story = {
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: var(--spacing-24); padding: var(--spacing-24); flex-wrap: wrap;">
      ${VARIANTS.map(
        variant => /*html*/ `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <mud-badge variant="${variant}" count="3" disabled></mud-badge>
          <span style="${cellLabelStyle}">${variant}</span>
        </div>`,
      ).join('')}
      ${SIZES.map(
        size => /*html*/ `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <mud-badge type="dot" size="${size}" disabled></mud-badge>
          <span style="${cellLabelStyle}">dot ${size}</span>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<mud-badge variant="danger" count="3" disabled></mud-badge>\n<mud-badge type="dot" disabled></mud-badge>`,
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
            ${size === 'xs' ? '' : /*html*/ `<mud-badge type="numbered" variant="danger" size="${size}" count="3"></mud-badge>`}
            <mud-badge type="dot" variant="danger" size="${size}"></mud-badge>
          </div>
          <span style="${cellLabelStyle}">${size}${size === 'xs' ? ' (dot only)' : ''}</span>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        // xs is a dot-only size in Figma — numbered starts at sm.
        code: SIZES.flatMap(size =>
          size === 'xs'
            ? [`<mud-badge type="dot" variant="danger" size="${size}"></mud-badge>`]
            : [
                `<mud-badge type="numbered" variant="danger" size="${size}" count="3"></mud-badge>`,
                `<mud-badge type="dot" variant="danger" size="${size}"></mud-badge>`,
              ],
        ).join('\n'),
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
          <mud-badge type="numbered" variant="danger" count="${n}"></mud-badge>
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
          .map(n => `<mud-badge type="numbered" variant="danger" count="${n}"></mud-badge>`)
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
          <mud-badge type="dot" variant="${variant}"></mud-badge>
          <span style="${cellLabelStyle}">${variant}</span>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: VARIANTS.map(variant => `<mud-badge type="dot" variant="${variant}"></mud-badge>`).join('\n'),
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
          <mud-badge type="numbered" variant="danger" count="100"></mud-badge>
          <span style="${cellLabelStyle}">count=100 (max=99)</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <mud-badge type="numbered" variant="danger" count="999"></mud-badge>
          <span style="${cellLabelStyle}">count=999 (max=99)</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <mud-badge type="numbered" variant="danger" count="15" max="9"></mud-badge>
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
          `<mud-badge type="numbered" variant="danger" count="100"></mud-badge>`,
          `<mud-badge type="numbered" variant="danger" count="999"></mud-badge>`,
          `<mud-badge type="numbered" variant="danger" count="15" max="9"></mud-badge>`,
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
    // Simple bell glyph drawn with an inline SVG so the example does not depend on mud-icon assets.
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
            <span style="${badgeWrapStyle}"><mud-badge type="dot" variant="danger" size="sm"></mud-badge></span>
          </span>
          <span style="${cellLabelStyle}">dot · sm</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <span style="${iconStyle}">
            ${bell}
            <span style="${badgeWrapStyle}"><mud-badge type="numbered" variant="danger" count="3"></mud-badge></span>
          </span>
          <span style="${cellLabelStyle}">numbered · 3</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <span style="${iconStyle}">
            ${bell}
            <span style="${badgeWrapStyle}"><mud-badge type="numbered" variant="brand" count="250"></mud-badge></span>
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
    <mud-badge type="numbered" variant="danger" count="3"></mud-badge>
  </span>
</span>`,
      },
    },
  },
};

/**
 * The host carries the `status` role, so it keeps the accessible name. With no `aria-label` the
 * badge names itself from its count; the consumer's `aria-label` wins, even when it matches the
 * current count, and removing it brings the count back.
 */
export const AccessibleName: Story = {
  name: 'Accessible Name (aria-label)',
  render: () => /*html*/ `<mud-badge count="3"></mud-badge>`,
  parameters: {
    controls: { disable: true },
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('mud-badge') as HTMLElement;

    await waitFor(() => expect(host.getAttribute('aria-label')).toBe('3'));

    host.setAttribute('aria-label', '3');
    host.setAttribute('count', '4');
    await waitFor(() => expect(host.shadowRoot?.textContent).toContain('4'));
    await expect(host.getAttribute('aria-label')).toBe('3');

    host.removeAttribute('aria-label');
    await waitFor(() => expect(host.getAttribute('aria-label')).toBe('4'));
  },
};
