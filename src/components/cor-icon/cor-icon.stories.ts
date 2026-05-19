import type { Meta, StoryObj } from '@storybook/web-components-vite';

import manifest from './assets/icons.manifest.json';
import { ICON_SIZES } from './cor-icon.types';
import type { IconSize } from './cor-icon.types';

type IconArgs = {
  name: string;
  size: IconSize;
  color: string;
  interactive: boolean;
  disabled: boolean;
  ariaLabel?: string;
};

const ICON_NAMES = Object.keys(manifest).sort();
const FILLED_PAIRS = ICON_NAMES.filter(
  n => n.endsWith('-filled') && ICON_NAMES.includes(n.slice(0, -'-filled'.length)),
).map(filled => ({ outlined: filled.slice(0, -'-filled'.length), filled }));

const cellLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); text-align: center; font-family: monospace;';
const gridCellStyle =
  'display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8); padding: var(--spacing-12); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-4); min-width: 80px;';

const meta: Meta<IconArgs> = {
  title: 'Atoms/Icon',
  component: 'cor-icon',
  argTypes: {
    name: {
      control: 'select',
      options: ICON_NAMES,
      description: 'Icon identifier (kebab-case). Suffix `-filled` selects the filled variant.',
      table: { defaultValue: { summary: 'check' } },
    },
    size: {
      control: 'select',
      options: ICON_SIZES,
      description: 'Pixel size (12, 16, 20, 24). Matches Figma Foundations.',
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
  <cor-icon
    name="${args.name}"
    size="${args.size}"
    color="${args.color}"
    ${args.interactive ? 'interactive' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
  ></cor-icon>
`;

export const Default: Story = {
  render: renderIcon,
  args: {
    name: 'checkmark-large',
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
            `size="${args.size}"`,
            `color="${args.color}"`,
            args.interactive ? 'interactive' : '',
            args.disabled ? 'disabled' : '',
            args.ariaLabel ? `aria-label="${args.ariaLabel}"` : '',
          ]
            .filter(Boolean)
            .join(' ');
          return `<cor-icon ${attrs}></cor-icon>`;
        },
      },
    },
  },
};

const allSizesName =
  ICON_NAMES.find(n => (manifest as Record<string, { sizes: number[] }>)[n].sizes.length === 4) ?? 'checkmark-large';

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => {
    return /*html*/ `
      <div style="display: flex; align-items: flex-end; gap: var(--spacing-24); padding: var(--spacing-24);">
        ${ICON_SIZES.map(
          size => /*html*/ `
          <div style="${gridCellStyle}">
            <cor-icon name="${allSizesName}" size="${size}"></cor-icon>
            <span style="${cellLabelStyle}">${size}px</span>
          </div>`,
        ).join('')}
      </div>
      <p style="${cellLabelStyle}; padding: 0 var(--spacing-24);">
        Showing <code>${allSizesName}</code> at each available size. When a size is missing
        the provider falls back to the closest larger SVG (preferred) or smaller.
      </p>
    `;
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: ICON_SIZES.map(size => `<cor-icon name="${allSizesName}" size="${size}"></cor-icon>`).join('\n'),
      },
    },
  },
};

const OUTLINED_VS_FILLED_SAMPLE = FILLED_PAIRS.slice(0, 10);

export const OutlinedVsFilled: Story = {
  name: 'Outlined vs Filled',
  render: () => {
    if (!FILLED_PAIRS.length) {
      return `<p>No icons have both outlined and filled variants.</p>`;
    }
    return /*html*/ `
      <div style="display: grid; grid-template-columns: 120px repeat(2, 1fr); gap: var(--spacing-16); padding: var(--spacing-24); place-items: center;">
        <div></div>
        <div style="${cellLabelStyle}">outlined</div>
        <div style="${cellLabelStyle}">filled</div>
        ${OUTLINED_VS_FILLED_SAMPLE.map(
          ({ outlined, filled }) => /*html*/ `
              <code style="${cellLabelStyle}; text-align: start;">${outlined}</code>
              <cor-icon name="${outlined}" size="24"></cor-icon>
              <cor-icon name="${filled}" size="24"></cor-icon>
            `,
        ).join('')}
      </div>
      <p style="${cellLabelStyle}; padding: 0 var(--spacing-24);">
        Append <code>-filled</code> to the base name to select the filled variant.
        Showing first ${OUTLINED_VS_FILLED_SAMPLE.length} of ${FILLED_PAIRS.length} pairs.
      </p>
    `;
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: OUTLINED_VS_FILLED_SAMPLE.map(
          ({ outlined, filled }) =>
            `<cor-icon name="${outlined}" size="24"></cor-icon>\n<cor-icon name="${filled}" size="24"></cor-icon>`,
        ).join('\n\n'),
      },
    },
  },
};

export const Gallery: Story = {
  render: () => {
    const rows = ICON_NAMES.map(name => {
      const entry = (manifest as Record<string, { sizes: number[] }>)[name];
      const cells = ICON_SIZES.map(size => {
        if (entry.sizes.includes(size)) {
          return /*html*/ `<td style="text-align: center; padding: var(--spacing-8);">
            <cor-icon name="${name}" size="${size}"></cor-icon>
          </td>`;
        }
        return /*html*/ `<td style="text-align: center; padding: var(--spacing-8); color: var(--color-text-base-tertiary); font-size: var(--font-size-12);">—</td>`;
      }).join('');
      return /*html*/ `<tr>
        <td style="padding: var(--spacing-8) var(--spacing-12); font-family: monospace; font-size: var(--font-size-12);">${name}</td>
        ${cells}
      </tr>`;
    }).join('');
    return /*html*/ `
      <div style="padding: var(--spacing-24); max-height: 720px; overflow: auto;">
        <p style="${cellLabelStyle}; text-align: left; margin-bottom: var(--spacing-12);">
          ${ICON_NAMES.length} icons across ${ICON_SIZES.join(' / ')} px. Em-dash = no optimized SVG at that size.
        </p>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left; padding: var(--spacing-8) var(--spacing-12); ${cellLabelStyle}">name</th>
              ${ICON_SIZES.map(s => /*html*/ `<th style="${cellLabelStyle}">${s}px</th>`).join('')}
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
        // Full coverage matrix — show the rendering pattern for one icon at every
        // available size. The page itself renders all 195 names × 4 sizes; the
        // snippet only documents the markup shape.
        code: ICON_NAMES.slice(0, 3)
          .flatMap(name => {
            const sizes = (manifest as Record<string, { sizes: number[] }>)[name].sizes;
            return sizes.map(size => `<cor-icon name="${name}" size="${size}"></cor-icon>`);
          })
          .concat([`<!-- …${ICON_NAMES.length - 3} more icons at their available sizes -->`])
          .join('\n'),
      },
    },
  },
};

const fallbackName =
  ICON_NAMES.find(n => {
    const sizes = (manifest as Record<string, { sizes: number[] }>)[n].sizes;
    return sizes.length > 0 && sizes.length < 4;
  }) ?? ICON_NAMES[0];

export const FallbackBehavior: Story = {
  name: 'Fallback Behavior',
  render: () => {
    const availableSizes = (manifest as Record<string, { sizes: number[] }>)[fallbackName].sizes;
    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24);">
        <p style="${cellLabelStyle}; text-align: left;">
          <code>${fallbackName}</code> has optimized SVGs at: <strong>${availableSizes.join(', ')}px</strong>.
          Requesting unavailable sizes triggers the fallback (prefer larger size, else largest smaller).
        </p>
        <div style="display: flex; gap: var(--spacing-24);">
          ${ICON_SIZES.map(
            size => /*html*/ `
            <div style="${gridCellStyle}">
              <cor-icon name="${fallbackName}" size="${size}"></cor-icon>
              <span style="${cellLabelStyle}">requested ${size}px${availableSizes.includes(size) ? '' : ' (fallback)'}</span>
            </div>`,
          ).join('')}
        </div>
      </div>
    `;
  },
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: ICON_SIZES.map(size => `<cor-icon name="${fallbackName}" size="${size}"></cor-icon>`).join('\n'),
      },
    },
  },
};

export const Interactive: Story = {
  render: () => /*html*/ `
    <div style="display: flex; gap: var(--spacing-16); padding: var(--spacing-24); align-items: center;">
      <cor-icon
        name="checkmark-large"
        size="24"
        interactive
        aria-label="Confirm"
        onclick="window.dispatchEvent(new CustomEvent('cor-icon-storybook-click', { detail: 'confirm' })); this.style.outline = '2px dashed var(--color-icon-brand-default)'"
      ></cor-icon>
      <cor-icon
        name="cross-large"
        size="24"
        interactive
        aria-label="Cancel"
        onclick="window.dispatchEvent(new CustomEvent('cor-icon-storybook-click', { detail: 'cancel' })); this.style.outline = '2px dashed var(--color-icon-brand-default)'"
      ></cor-icon>
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
          `<cor-icon name="checkmark-large" size="24" interactive aria-label="Confirm"></cor-icon>`,
          `<cor-icon name="cross-large" size="24" interactive aria-label="Cancel"></cor-icon>`,
        ].join('\n'),
      },
    },
  },
};

export const Disabled: Story = {
  render: () => /*html*/ `
    <div style="display: flex; gap: var(--spacing-16); padding: var(--spacing-24); align-items: center;">
      <cor-icon name="checkmark-large" size="24" interactive aria-label="Confirm"></cor-icon>
      <cor-icon name="checkmark-large" size="24" interactive disabled aria-label="Confirm (disabled)"></cor-icon>
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
          `<cor-icon name="checkmark-large" size="24" interactive aria-label="Confirm"></cor-icon>`,
          `<cor-icon name="checkmark-large" size="24" interactive disabled aria-label="Confirm (disabled)"></cor-icon>`,
        ].join('\n'),
      },
    },
  },
};

export const NotFound: Story = {
  name: 'Not Found (graceful failure)',
  render: () => /*html*/ `
    <div style="display: flex; gap: var(--spacing-16); padding: var(--spacing-24); align-items: center;">
      <cor-icon name="this-icon-does-not-exist" size="24"></cor-icon>
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
        code: `<cor-icon name="this-icon-does-not-exist" size="24"></cor-icon>`,
      },
    },
  },
};
