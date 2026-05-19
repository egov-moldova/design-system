import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SPINNER_SIZES as SIZES, SPINNER_VARIANTS as VARIANTS } from './cor-spinner.types';
import type { SpinnerSize, SpinnerVariant } from './cor-spinner.types';

type SpinnerArgs = {
  size: SpinnerSize;
  variant: SpinnerVariant;
  label: string;
};

const renderSpinner = (args: SpinnerArgs) => /*html*/ `
  <cor-spinner size="${args.size}" variant="${args.variant}" label="${args.label}"></cor-spinner>
`;

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); text-align: center;';
const swatchStyle = (variant: SpinnerVariant) => {
  const base =
    'display: inline-flex; padding: var(--spacing-4); border-radius: var(--border-radius-4); width: fit-content;';
  if (variant === 'light') {
    return `${base} background: var(--color-background-base-inverse-default);`;
  }
  if (variant === 'light-on-color') {
    return `${base} background: var(--color-background-brand-default);`;
  }
  return base;
};

const meta: Meta<SpinnerArgs> = {
  title: 'Atoms/Spinner',
  component: 'cor-spinner',
  argTypes: {
    size: {
      control: 'select',
      options: SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    variant: {
      control: 'select',
      options: VARIANTS,
      description: 'Color treatment.',
      table: { defaultValue: { summary: 'brand' } },
    },
    label: {
      control: 'text',
      description: 'Accessible label announced to screen readers.',
      table: { defaultValue: { summary: 'Loading' } },
    },
  },
};
export default meta;

type Story = StoryObj<SpinnerArgs>;

export const Default: Story = {
  render: renderSpinner,
  args: { size: 'md', variant: 'brand', label: 'Loading' },
  parameters: {
    docs: {
      source: {
        // Override global `type: 'code'` (set in preview.js) — that mode caches the
        // snippet at registration and ignores args changes. `'dynamic'` re-runs the
        // transform whenever controls change, so the snippet stays in sync.
        type: 'dynamic',
        transform: (_code: string, { args }: { args: SpinnerArgs }) =>
          `<cor-spinner size="${args.size}" variant="${args.variant}" label="${args.label}"></cor-spinner>`,
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: var(--spacing-24); padding: var(--spacing-24); flex-wrap: wrap;">
      ${SIZES.map(
        size => /*html*/ `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <cor-spinner size="${size}" variant="brand"></cor-spinner>
          <span style="${cellLabelStyle}">${size}</span>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: SIZES.map(size => `<cor-spinner size="${size}" variant="brand"></cor-spinner>`).join('\n'),
      },
    },
  },
};

export const AllVariants: Story = {
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: var(--spacing-24); padding: var(--spacing-24); flex-wrap: wrap;">
      ${VARIANTS.map(
        variant => /*html*/ `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8);">
          <div style="${swatchStyle(variant)}">
            <cor-spinner size="md" variant="${variant}"></cor-spinner>
          </div>
          <span style="${cellLabelStyle}">${variant}</span>
        </div>`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: VARIANTS.map(variant => `<cor-spinner size="md" variant="${variant}"></cor-spinner>`).join('\n'),
      },
    },
  },
};

export const AllVariantsXSizes: Story = {
  name: 'All Variants + Sizes',
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: 80px repeat(${SIZES.length}, 1fr); gap: var(--spacing-16); padding: var(--spacing-24); place-items: center;">
      <div></div>
      ${SIZES.map(size => /*html*/ `<div style="${cellLabelStyle}">${size}</div>`).join('')}
      ${VARIANTS.map(
        variant => /*html*/ `
          <div style="${cellLabelStyle}; text-align: start;">${variant}</div>
          ${SIZES.map(
            size => /*html*/ `
            <div style="${swatchStyle(variant)}; justify-content: center;">
              <cor-spinner size="${size}" variant="${variant}"></cor-spinner>
            </div>`,
          ).join('')}
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
            SIZES.map(size => `<cor-spinner size="${size}" variant="${variant}"></cor-spinner>`).join('\n'),
        ).join('\n\n'),
      },
    },
  },
};

// Internal coverage story — exercises the Stencil-injected constructor guard
// (`if (registerHost !== false) { ... }`) so browser-mode coverage reports
// 100% branches on the TSX. The element is upgraded via the normal render
// path; the `play` function reaches into the registry to construct a second
// instance with `registerHost=false`, which takes the "else" branch.
// Hidden from sidebar + autodocs — pure infrastructure test.
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<cor-spinner></cor-spinner>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('cor-spinner') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    if (!Ctor) throw new Error('cor-spinner constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};

export const ReducedMotion: Story = {
  render: () => /*html*/ `
    <style>
      .reduced-motion-wrapper {
        --spinner-transition-duration: 0ms;
        display: flex;
        gap: var(--spacing-24);
        padding: var(--spacing-24);
        align-items: center;
      }
    </style>
    <div class="reduced-motion-wrapper">
      ${SIZES.map(size => /*html*/ `<cor-spinner size="${size}" variant="brand" label="Loading (reduced motion)"></cor-spinner>`).join('')}
    </div>
    <p style="${cellLabelStyle}; max-width: 540px; padding: 0 var(--spacing-24); text-align: left; font-style: italic;">
      This story overrides <code>--spinner-transition-duration</code> to demonstrate the
      static state shown when the user enables OS-level "reduce motion".
    </p>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<style>
  /* Honor user's reduce-motion preference, or force it locally. */
  .reduced-motion-wrapper {
    --spinner-transition-duration: 0ms;
  }
</style>

<div class="reduced-motion-wrapper">
  <cor-spinner size="md" variant="brand" label="Loading (reduced motion)"></cor-spinner>
</div>`,
      },
    },
  },
};
