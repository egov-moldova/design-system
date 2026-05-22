import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { LOGO_NAMES, type LogoName } from './cor-logo.types';

type LogoArgs = {
  name: LogoName;
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
        'Logo asset identifier — the bare filename (without `.svg`) of an asset in `./assets/`. Format: `{service}-logo-{layout}`.',
      table: { defaultValue: { summary: 'mpay-logo-logomark-only' } },
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
    ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
  ></cor-logo>
`;

const cellStyle =
  'display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-16); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-8); align-items: flex-start;';

const cellLabelStyle =
  'font-family: monospace; font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

// Group the flat name list by service + layout so the cross-product grid still reads naturally.
const SERVICES = [...new Set(LOGO_NAMES.map(n => n.split('-logo-')[0]))];
const LAYOUTS = [...new Set(LOGO_NAMES.map(n => n.split('-logo-')[1]))];

export const Default: Story = {
  render: renderLogo,
  args: { name: 'mpay-logo-logomark-only' },
};

export const AllLogos: Story = {
  name: 'All services × layouts',
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: repeat(${LAYOUTS.length}, minmax(280px, 1fr)); gap: var(--spacing-16);">
      ${LAYOUTS.map(l => /*html*/ `<div style="${cellLabelStyle} text-align: center;">${l}</div>`).join('')}
      ${SERVICES.flatMap(s =>
        LAYOUTS.map(
          l => /*html*/ `
              <div style="${cellStyle}">
                <span style="${cellLabelStyle}">${s}-logo-${l}</span>
                <cor-logo name="${s}-logo-${l}"></cor-logo>
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
      ${SERVICES.map(
        s => /*html*/ `
          <div style="${cellStyle} align-items: center;">
            <cor-logo name="${s}-logo-logomark-only"></cor-logo>
            <span style="${cellLabelStyle}">${s}</span>
          </div>
        `,
      ).join('')}
    </div>
  `,
};
