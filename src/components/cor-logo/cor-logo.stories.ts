import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { LOGO_NAMES, LOGO_VARIANTS, type LogoName, type LogoVariant } from './cor-logo.types';

type LogoArgs = {
  name: LogoName;
  variant: LogoVariant;
  ariaLabel?: string;
};

const meta: Meta<LogoArgs> = {
  title: 'Atoms/Logo',
  component: 'cor-logo',
  argTypes: {
    name: {
      control: 'select',
      options: [...LOGO_NAMES],
      description:
        'Service identifier — mcloud, mconnect, mdelivery, mdocs, mlearn, mlog, mnotify, mpass, mpay, mpower, msign.',
      table: { defaultValue: { summary: 'mpay' } },
    },
    variant: {
      control: 'select',
      options: [...LOGO_VARIANTS],
      description: 'Layout: logomark only, or paired with name / verb / 2-line description.',
      table: { defaultValue: { summary: 'logomark-only' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible label. When provided the logo is announced; when omitted it is decorative.',
    },
  },
};
export default meta;

type Story = StoryObj<LogoArgs>;

const renderLogo = (args: LogoArgs) => /*html*/ `
  <cor-logo
    name="${args.name}"
    variant="${args.variant}"
    ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
  ></cor-logo>
`;

const cellStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-16); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-8); align-items: flex-start;';

const cellLabelStyle =
  'font-family: monospace; font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

export const Default: Story = {
  render: renderLogo,
  args: { name: 'mpay', variant: 'logomark-only' },
};

export const AllLogos: Story = {
  name: 'All logos × variants',
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: repeat(${LOGO_VARIANTS.length}, minmax(280px, 1fr)); gap: var(--spacing-16);">
      ${LOGO_VARIANTS.map(v => /*html*/ `<div style="${cellLabelStyle} text-align: center;">${v}</div>`).join('')}
      ${LOGO_NAMES.flatMap(n =>
        LOGO_VARIANTS.map(
          v => /*html*/ `
              <div style="${cellStyle}">
                <span style="${cellLabelStyle}">${n}</span>
                <cor-logo name="${n}" variant="${v}"></cor-logo>
              </div>
            `,
        ),
      ).join('')}
    </div>
  `,
};

export const Logomarks: Story = {
  name: 'Logomarks only',
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <div style="display: flex; gap: var(--spacing-24); align-items: center;">
      ${LOGO_NAMES.map(
        n => /*html*/ `
          <div style="${cellStyle} align-items: center;">
            <cor-logo name="${n}" variant="logomark-only"></cor-logo>
            <span style="${cellLabelStyle}">${n}</span>
          </div>
        `,
      ).join('')}
    </div>
  `,
};
