import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { LOGO_NAMES, type LogoName } from '../cor-logo/cor-logo.types';
import { SERVICE_BUTTON_APPEARANCES, type ServiceButtonAppearance } from './cor-service-button.types';

type ServiceButtonArgs = {
  appearance: ServiceButtonAppearance;
  service: LogoName;
  label: string;
  disabled: boolean;
  loading: boolean;
  fullWidth: boolean;
  href: string;
};

/** Default verbose labels per Figma — service name + verb. */
const DEFAULT_LABELS: Record<LogoName, string> = {
  mpay: 'Plătește cu mpay',
  mpass: 'Autentifică-te prin mpass',
  msign: 'Semnează prin msign',
  mpower: 'Împuternicește cu mpower',
  mdelivery: 'Livrează prin mdelivery',
};

const renderButton = (args: ServiceButtonArgs) => /*html*/ `
  <cor-service-button
    appearance="${args.appearance}"
    ${args.disabled ? 'disabled' : ''}
    ${args.loading ? 'loading' : ''}
    ${args.fullWidth ? 'full-width' : ''}
    ${args.href ? `href="${args.href}"` : ''}
  >
    <cor-logo slot="badge" name="${args.service}" variant="logomark-only"></cor-logo>
    ${args.label}
  </cor-service-button>
`;

const meta: Meta<ServiceButtonArgs> = {
  title: 'Atoms/Service Button',
  component: 'cor-service-button',
  argTypes: {
    appearance: {
      control: 'select',
      options: [...SERVICE_BUTTON_APPEARANCES],
      description: 'Visual treatment — `primary` (brand blue) or `neutral` (light surface).',
      table: { defaultValue: { summary: 'primary' } },
    },
    service: {
      control: 'select',
      options: [...LOGO_NAMES],
      description: 'Service identifier — drives the slotted logomark + default label text.',
      table: { defaultValue: { summary: 'mpay' } },
    },
    label: {
      control: 'text',
      description: 'Visible label text passed to the default slot.',
    },
    disabled: { control: 'boolean', table: { defaultValue: { summary: 'false' } } },
    loading: { control: 'boolean', table: { defaultValue: { summary: 'false' } } },
    fullWidth: { control: 'boolean', table: { defaultValue: { summary: 'false' } } },
    href: { control: 'text', description: 'When set, renders as `<a>` instead of `<button>`.' },
  },
};
export default meta;

type Story = StoryObj<ServiceButtonArgs>;

export const Default: Story = {
  render: renderButton,
  args: {
    appearance: 'primary',
    service: 'mpay',
    label: DEFAULT_LABELS.mpay,
    disabled: false,
    loading: false,
    fullWidth: false,
    href: '',
  },
};

const cellLabelStyle =
  'font-family: monospace; font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const stateCellStyle = 'display: flex; flex-direction: column; gap: var(--spacing-8); align-items: flex-start;';

export const AllServices: Story = {
  name: 'All services × appearances',
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: max-content max-content; gap: var(--spacing-12) var(--spacing-24); align-items: center;">
      ${SERVICE_BUTTON_APPEARANCES.flatMap(a =>
        LOGO_NAMES.map(
          n => /*html*/ `
            <span style="${cellLabelStyle}">${a} / ${n}</span>
            <cor-service-button appearance="${a}">
              <cor-logo slot="badge" name="${n}" variant="logomark-only"></cor-logo>
              ${DEFAULT_LABELS[n]}
            </cor-service-button>
          `,
        ),
      ).join('')}
    </div>
  `,
};

export const States: Story = {
  name: 'States grid (primary + neutral)',
  parameters: { controls: { disable: true } },
  render: () => {
    const states: Array<{ label: string; attrs: string }> = [
      { label: 'default', attrs: '' },
      { label: 'disabled', attrs: 'disabled' },
      { label: 'loading', attrs: 'loading' },
    ];
    return /*html*/ `
      <div style="display: grid; grid-template-columns: max-content repeat(${states.length}, max-content); gap: var(--spacing-12) var(--spacing-24); align-items: center;">
        <span></span>
        ${states.map(s => /*html*/ `<span style="${cellLabelStyle}">${s.label}</span>`).join('')}
        ${SERVICE_BUTTON_APPEARANCES.flatMap(
          a => /*html*/ `
            <span style="${cellLabelStyle}">${a}</span>
            ${states
              .map(
                s => /*html*/ `
                  <cor-service-button appearance="${a}" ${s.attrs}>
                    <cor-logo slot="badge" name="mpay" variant="logomark-only"></cor-logo>
                    Plătește cu mpay
                  </cor-service-button>
                `,
              )
              .join('')}
          `,
        ).join('')}
      </div>
      <p style="margin-top: var(--spacing-24); ${cellLabelStyle}">
        Tip: tab onto a button to see the focus ring; hover for the hover state.
      </p>
    `;
  },
};

export const FullWidth: Story = {
  name: 'Full width (inside a narrow container)',
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <div style="${stateCellStyle} max-width: 320px;">
      <cor-service-button full-width appearance="primary">
        <cor-logo slot="badge" name="mpass" variant="logomark-only"></cor-logo>
        Autentifică-te prin mpass
      </cor-service-button>
      <cor-service-button full-width appearance="neutral">
        <cor-logo slot="badge" name="msign" variant="logomark-only"></cor-logo>
        Semnează prin msign
      </cor-service-button>
    </div>
  `,
};

export const LinkMode: Story = {
  name: 'Link mode (renders <a>)',
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <cor-service-button href="https://mpay.gov.md" target="_blank" rel="noopener noreferrer">
      <cor-logo slot="badge" name="mpay" variant="logomark-only"></cor-logo>
      Plătește cu mpay
    </cor-service-button>
  `,
};

export const CustomLabel: Story = {
  name: 'Custom label (slot-based composition)',
  parameters: { controls: { disable: true } },
  render: () => /*html*/ `
    <div style="${stateCellStyle}">
      <cor-service-button appearance="primary">
        <cor-logo slot="badge" name="mpay" variant="logomark-only"></cor-logo>
        Continuă
      </cor-service-button>
      <cor-service-button appearance="neutral">
        <cor-logo slot="badge" name="mpay" variant="logomark-only"></cor-logo>
        Pay
      </cor-service-button>
    </div>
  `,
};
