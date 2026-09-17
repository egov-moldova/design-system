import type { Meta, StoryObj } from '@storybook/web-components-vite';

import manifest from './assets/icons.manifest.json';
import { ICON_NAMES, ICON_SIZES, ICON_VARIANTS } from './mud-icon.types';
import type { IconManifest, IconName, IconSize, IconVariant } from './mud-icon.types';

type IconArgs = {
  name: IconName;
  variant: IconVariant;
  size: IconSize;
  color: string;
  interactive: boolean;
  disabled: boolean;
  ariaLabel?: string;
};

const ICONS = manifest as IconManifest;
const hasVariant = (name: IconName, variant: IconVariant) => ICONS[name]?.variants.includes(variant) ?? false;
const BOTH_VARIANTS = ICON_NAMES.filter(name => hasVariant(name, 'outlined') && hasVariant(name, 'filled'));
const FILLED_ONLY = ICON_NAMES.filter(name => !hasVariant(name, 'outlined'));

const cellLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); text-align: center; font-family: monospace;';
const gridCellStyle =
  'display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8); padding: var(--spacing-12); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-4); min-width: 80px;';

const meta: Meta<IconArgs> = {
  title: 'Atoms/Icon',
  component: 'mud-icon',
  argTypes: {
    name: {
      control: 'select',
      options: ICON_NAMES,
      description: 'Icon identifier (kebab-case), one of `ICON_NAMES` — generated from the assets folder.',
    },
    variant: {
      control: 'inline-radio',
      options: ICON_VARIANTS,
      description: 'Icon style. Falls back to the drawing that exists when the icon has only one.',
      table: { defaultValue: { summary: 'outlined' } },
    },
    size: {
      control: 'select',
      options: ICON_SIZES,
      description: 'Pixel size (16, 20, 24, 32). Matches Figma Foundations.',
      table: { defaultValue: { summary: '16' } },
    },
    color: {
      control: 'text',
      description: 'Design-token suffix mapped to `var(--color-{value})`, or `currentColor` to inherit text color.',
      table: { defaultValue: { summary: 'icon-base-secondary' } },
    },
    interactive: {
      control: 'boolean',
      description: 'Enables button-like treatment (cursor, hover, focus ring, keyboard activation).',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Visually disables the icon.',
      table: { defaultValue: { summary: 'false' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible label. When provided the icon is announced; when omitted it is decorative.',
    },
  },
};
export default meta;

type Story = StoryObj<IconArgs>;

const renderIcon = (args: IconArgs) => /*html*/ `
  <mud-icon
    name="${args.name}"
    variant="${args.variant}"
    size="${args.size}"
    color="${args.color}"
    ${args.interactive ? 'interactive' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
  ></mud-icon>
`;

export const Default: Story = {
  render: renderIcon,
  args: {
    name: 'checkmark-large',
    variant: 'outlined',
    size: 24,
    color: 'icon-base-secondary',
    interactive: false,
    disabled: false,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: IconArgs }) => {
          const attrs = [
            `name="${args.name}"`,
            `variant="${args.variant}"`,
            `size="${args.size}"`,
            `color="${args.color}"`,
            args.interactive ? 'interactive' : '',
            args.disabled ? 'disabled' : '',
            args.ariaLabel ? `aria-label="${args.ariaLabel}"` : '',
          ]
            .filter(Boolean)
            .join(' ');
          return `<mud-icon ${attrs}></mud-icon>`;
        },
      },
    },
  },
};

const allSizesName: IconName = 'checkmark-large';

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => {
    return /*html*/ `
      <div style="display: flex; align-items: flex-end; gap: var(--spacing-24); padding: var(--spacing-24);">
        ${ICON_SIZES.map(
          size => /*html*/ `
          <div style="${gridCellStyle}">
            <mud-icon name="${allSizesName}" size="${size}"></mud-icon>
            <span style="${cellLabelStyle}">${size}px</span>
          </div>`,
        ).join('')}
      </div>
      <p style="${cellLabelStyle}; padding: 0 var(--spacing-24);">
        One drawing per style covers every size — <code>size</code> sets the rendered box.
      </p>
    `;
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: ICON_SIZES.map(size => `<mud-icon name="${allSizesName}" size="${size}"></mud-icon>`).join('\n'),
      },
    },
  },
};

const OUTLINED_VS_FILLED_SAMPLE = BOTH_VARIANTS.slice(0, 10);

export const OutlinedVsFilled: Story = {
  name: 'Outlined vs Filled',
  render: () => {
    if (!BOTH_VARIANTS.length) {
      return `<p>No icons are drawn in both styles.</p>`;
    }
    return /*html*/ `
      <div style="display: grid; grid-template-columns: 160px repeat(2, 1fr); gap: var(--spacing-16); padding: var(--spacing-24); place-items: center;">
        <div></div>
        <div style="${cellLabelStyle}">outlined</div>
        <div style="${cellLabelStyle}">filled</div>
        ${OUTLINED_VS_FILLED_SAMPLE.map(
          name => /*html*/ `
              <code style="${cellLabelStyle}; text-align: start;">${name}</code>
              <mud-icon name="${name}" variant="outlined" size="24"></mud-icon>
              <mud-icon name="${name}" variant="filled" size="24"></mud-icon>
            `,
        ).join('')}
      </div>
      <p style="${cellLabelStyle}; padding: 0 var(--spacing-24);">
        The same <code>name</code> under both styles.
        Showing first ${OUTLINED_VS_FILLED_SAMPLE.length} of ${BOTH_VARIANTS.length} icons drawn in both.
      </p>
    `;
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: OUTLINED_VS_FILLED_SAMPLE.map(
          name =>
            `<mud-icon name="${name}" variant="outlined" size="24"></mud-icon>\n<mud-icon name="${name}" variant="filled" size="24"></mud-icon>`,
        ).join('\n\n'),
      },
    },
  },
};

export const Gallery: Story = {
  render: () => {
    const rows = ICON_NAMES.map(name => {
      const cells = ICON_VARIANTS.map(variant =>
        hasVariant(name, variant)
          ? /*html*/ `<td style="text-align: center; padding: var(--spacing-8);">
            <mud-icon name="${name}" variant="${variant}" size="24"></mud-icon>
          </td>`
          : /*html*/ `<td style="text-align: center; padding: var(--spacing-8); color: var(--color-text-base-tertiary); font-size: var(--font-size-12);">—</td>`,
      ).join('');
      return /*html*/ `<tr>
        <td style="padding: var(--spacing-8) var(--spacing-12); font-family: monospace; font-size: var(--font-size-12);">${name}</td>
        ${cells}
      </tr>`;
    }).join('');
    return /*html*/ `
      <div style="padding: var(--spacing-24); overflow: auto;">
        <p style="${cellLabelStyle}; text-align: left; margin-bottom: var(--spacing-12);">
          ${ICON_NAMES.length} icons in ${ICON_VARIANTS.join(' / ')}. Em-dash = not drawn in that style.
        </p>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left; padding: var(--spacing-8) var(--spacing-12); ${cellLabelStyle}">name</th>
              ${ICON_VARIANTS.map(variant => /*html*/ `<th style="${cellLabelStyle}">${variant}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        // The page renders every name in every style it is drawn in; the
        // snippet only documents the markup shape.
        code: ICON_NAMES.slice(0, 3)
          .flatMap(name =>
            ICON_VARIANTS.filter(variant => hasVariant(name, variant)).map(
              variant => `<mud-icon name="${name}" variant="${variant}" size="24"></mud-icon>`,
            ),
          )
          .concat([`<!-- …${ICON_NAMES.length - 3} more icons -->`])
          .join('\n'),
      },
    },
  },
};

const fallbackName: IconName = FILLED_ONLY[0] ?? ICON_NAMES[0];

export const VariantFallback: Story = {
  name: 'Variant Fallback',
  render: () => /*html*/ `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24);">
        <p style="${cellLabelStyle}; text-align: left;">
          <code>${fallbackName}</code> is drawn in <strong>${ICONS[fallbackName]?.variants.join(', ')}</strong> only.
          Requesting the missing style renders the available one and logs a <code>console.warn</code>.
        </p>
        <div style="display: flex; gap: var(--spacing-24);">
          ${ICON_VARIANTS.map(
            variant => /*html*/ `
            <div style="${gridCellStyle}">
              <mud-icon name="${fallbackName}" variant="${variant}" size="24"></mud-icon>
              <span style="${cellLabelStyle}">requested ${variant}${hasVariant(fallbackName, variant) ? '' : ' (fallback)'}</span>
            </div>`,
          ).join('')}
        </div>
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: ICON_VARIANTS.map(
          variant => `<mud-icon name="${fallbackName}" variant="${variant}" size="24"></mud-icon>`,
        ).join('\n'),
      },
    },
  },
};

export const Interactive: Story = {
  render: () => /*html*/ `
    <div style="display: flex; gap: var(--spacing-16); padding: var(--spacing-24); align-items: center;">
      <mud-icon
        name="checkmark-large"
        size="24"
        interactive
        aria-label="Confirm"
        onclick="window.dispatchEvent(new CustomEvent('mud-icon-storybook-click', { detail: 'confirm' })); this.style.outline = '2px dashed var(--color-icon-brand-default)'"
      ></mud-icon>
      <mud-icon
        name="cross-large"
        size="24"
        interactive
        aria-label="Cancel"
        onclick="window.dispatchEvent(new CustomEvent('mud-icon-storybook-click', { detail: 'cancel' })); this.style.outline = '2px dashed var(--color-icon-brand-default)'"
      ></mud-icon>
      <p style="${cellLabelStyle}; text-align: left;">
        Hover to see cursor change. Click or press <kbd>Enter</kbd> / <kbd>Space</kbd> when focused.
      </p>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          `<mud-icon name="checkmark-large" size="24" interactive aria-label="Confirm"></mud-icon>`,
          `<mud-icon name="cross-large" size="24" interactive aria-label="Cancel"></mud-icon>`,
        ].join('\n'),
      },
    },
  },
};

export const Disabled: Story = {
  render: () => /*html*/ `
    <div style="display: flex; gap: var(--spacing-16); padding: var(--spacing-24); align-items: center;">
      <mud-icon name="checkmark-large" size="24" interactive aria-label="Confirm"></mud-icon>
      <mud-icon name="checkmark-large" size="24" interactive disabled aria-label="Confirm (disabled)"></mud-icon>
      <p style="${cellLabelStyle}; text-align: left;">
        Same icon, second one has <code>disabled</code> — pointer cursor becomes not-allowed,
        fill becomes the disabled color token.
      </p>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          `<mud-icon name="checkmark-large" size="24" interactive aria-label="Confirm"></mud-icon>`,
          `<mud-icon name="checkmark-large" size="24" interactive disabled aria-label="Confirm (disabled)"></mud-icon>`,
        ].join('\n'),
      },
    },
  },
};

export const NotFound: Story = {
  name: 'Not Found (graceful failure)',
  render: () => /*html*/ `
    <div style="display: flex; gap: var(--spacing-16); padding: var(--spacing-24); align-items: center;">
      <mud-icon name="this-icon-does-not-exist" size="24"></mud-icon>
      <p style="${cellLabelStyle}; text-align: left;">
        Requesting an unknown name renders nothing and emits a <code>console.warn</code>.
        No layout shift, no error thrown.
      </p>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<mud-icon name="this-icon-does-not-exist" size="24"></mud-icon>`,
      },
    },
  },
};
