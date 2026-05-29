import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SERVICE_BUTTON_APPEARANCES, type ServiceButtonAppearance } from './mud-service-button.types';

const SERVICES = [
  'mcloud',
  'mconnect',
  'mdelivery',
  'mdocs',
  'mlearn',
  'mlog',
  'mnotify',
  'mpass',
  'mpay',
  'mpower',
  'msign',
] as const;
type Service = (typeof SERVICES)[number];

type ServiceButtonArgs = {
  appearance: ServiceButtonAppearance;
  service: Service;
  label: string;
  disabled: boolean;
  loading: boolean;
  fullWidth: boolean;
  href: string;
};

/** Default verbose labels per Figma — service name + verb. */
const DEFAULT_LABELS: Record<Service, string> = {
  mcloud: 'Stochează cu mcloud',
  mconnect: 'Conectează prin mconnect',
  mdelivery: 'Livrează prin mdelivery',
  mdocs: 'Gestionează prin mdocs',
  mlearn: 'Învață cu mlearn',
  mlog: 'Vezi jurnalul mlog',
  mnotify: 'Trimite prin mnotify',
  mpass: 'Autentifică-te prin mpass',
  mpay: 'Plătește cu mpay',
  mpower: 'Împuternicește cu mpower',
  msign: 'Semnează prin msign',
};

const renderButton = (args: ServiceButtonArgs) => /*html*/ `
  <mud-service-button
    appearance="${args.appearance}"
    ${args.disabled ? 'disabled' : ''}
    ${args.loading ? 'loading' : ''}
    ${args.fullWidth ? 'full-width' : ''}
    ${args.href ? `href="${args.href}"` : ''}
  >
    <mud-logo slot="badge" name="${args.service}-logo-logomark-only"></mud-logo>
    ${args.label}
  </mud-service-button>
`;

// ---------------------------------------------------------------------------
// Docs-source helpers — return clean web-component markup (no demo chrome,
// no wrapper divs, no inline styles) so the Storybook docs "Show code" panel
// shows what a consumer would actually paste into their HTML.
// ---------------------------------------------------------------------------

const docsSourceDefault = (args: ServiceButtonArgs) => {
  const attrs = [
    args.appearance !== 'primary' ? `appearance="${args.appearance}"` : '',
    args.disabled ? 'disabled' : '',
    args.loading ? 'loading' : '',
    args.fullWidth ? 'full-width' : '',
    args.href ? `href="${args.href}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const open = attrs ? `<mud-service-button ${attrs}>` : '<mud-service-button>';
  return `${open}
  <mud-logo slot="badge" name="${args.service}-logo-logomark-only"></mud-logo>
  ${args.label}
</mud-service-button>`;
};

const docsSourceAllServices = SERVICE_BUTTON_APPEARANCES.flatMap(a =>
  SERVICES.map(
    n => /*html*/ `<mud-service-button appearance="${a}">
  <mud-logo slot="badge" name="${n}-logo-logomark-only"></mud-logo>
  ${DEFAULT_LABELS[n]}
</mud-service-button>`,
  ),
).join('\n\n');

const docsSourceStates = /*html*/ `<!-- default · disabled · loading — for each appearance (primary, neutral) -->
${SERVICE_BUTTON_APPEARANCES.map(
  a => `<!-- ${a} -->
<mud-service-button appearance="${a}">
  <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
  Plătește cu mpay
</mud-service-button>

<mud-service-button appearance="${a}" disabled>
  <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
  Plătește cu mpay
</mud-service-button>

<mud-service-button appearance="${a}" loading>
  <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
  Plătește cu mpay
</mud-service-button>`,
).join('\n\n')}`;

const docsSourceFullWidth = /*html*/ `<!-- Add the \`full-width\` attribute to expand the button to its container. -->
<mud-service-button full-width appearance="primary">
  <mud-logo slot="badge" name="mpass-logo-logomark-only"></mud-logo>
  Autentifică-te prin mpass
</mud-service-button>

<mud-service-button full-width appearance="neutral">
  <mud-logo slot="badge" name="msign-logo-logomark-only"></mud-logo>
  Semnează prin msign
</mud-service-button>`;

const docsSourceLinkMode = /*html*/ `<!-- When \`href\` is set, the button renders as <a> instead of <button>. -->
<mud-service-button href="https://mpay.gov.md" target="_blank" rel="noopener noreferrer">
  <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
  Plătește cu mpay
</mud-service-button>`;

const docsSourceCustomLabel = /*html*/ `<!-- The default slot accepts any inline text — override the verbose Figma label
     with shorter copy when the surrounding context already implies intent. -->
<mud-service-button appearance="primary">
  <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
  Continuă
</mud-service-button>

<mud-service-button appearance="neutral">
  <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
  Pay
</mud-service-button>`;

const meta: Meta<ServiceButtonArgs> = {
  title: 'Atoms/Service Button',
  component: 'mud-service-button',
  argTypes: {
    appearance: {
      control: 'select',
      options: [...SERVICE_BUTTON_APPEARANCES],
      description: 'Visual treatment — `primary` (brand blue) or `neutral` (light surface).',
      table: { defaultValue: { summary: 'primary' } },
    },
    service: {
      control: 'select',
      options: [...SERVICES],
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
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        // Returns the minimal `<mud-service-button>…</mud-service-button>` markup a consumer
        // would write — omits default attributes so the snippet stays clean as controls move.
        transform: (_code: string, { args }: { args: ServiceButtonArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const cellLabelStyle =
  'font-family: monospace; font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const stateCellStyle = 'display: flex; flex-direction: column; gap: var(--spacing-8); align-items: flex-start;';

export const AllServices: Story = {
  name: 'All services × appearances',
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllServices } },
  },
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: max-content repeat(${SERVICE_BUTTON_APPEARANCES.length}, max-content); gap: var(--spacing-12) var(--spacing-24); align-items: center;">
      <span></span>
      ${SERVICE_BUTTON_APPEARANCES.map(a => /*html*/ `<span style="${cellLabelStyle}; text-align: center;">${a}</span>`).join('')}
      ${SERVICES.map(
        n => /*html*/ `
          <span style="${cellLabelStyle}">${n}</span>
          ${SERVICE_BUTTON_APPEARANCES.map(
            a => /*html*/ `
              <mud-service-button appearance="${a}">
                <mud-logo slot="badge" name="${n}-logo-logomark-only"></mud-logo>
                ${DEFAULT_LABELS[n]}
              </mud-service-button>
            `,
          ).join('')}
        `,
      ).join('')}
    </div>
  `,
};

export const States: Story = {
  name: 'States grid (primary + neutral)',
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceStates } },
  },
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
                  <mud-service-button appearance="${a}" ${s.attrs}>
                    <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
                    Plătește cu mpay
                  </mud-service-button>
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
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceFullWidth } },
  },
  render: () => /*html*/ `
    <div style="${stateCellStyle} max-width: 320px;">
      <mud-service-button full-width appearance="primary">
        <mud-logo slot="badge" name="mpass-logo-logomark-only"></mud-logo>
        Autentifică-te prin mpass
      </mud-service-button>
      <mud-service-button full-width appearance="neutral">
        <mud-logo slot="badge" name="msign-logo-logomark-only"></mud-logo>
        Semnează prin msign
      </mud-service-button>
    </div>
  `,
};

export const LinkMode: Story = {
  name: 'Link mode (renders <a>)',
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceLinkMode } },
  },
  render: () => /*html*/ `
    <mud-service-button href="https://mpay.gov.md" target="_blank" rel="noopener noreferrer">
      <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
      Plătește cu mpay
    </mud-service-button>
  `,
};

export const CustomLabel: Story = {
  name: 'Custom label (slot-based composition)',
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceCustomLabel } },
  },
  render: () => /*html*/ `
    <div style="${stateCellStyle}">
      <mud-service-button appearance="primary">
        <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
        Continuă
      </mud-service-button>
      <mud-service-button appearance="neutral">
        <mud-logo slot="badge" name="mpay-logo-logomark-only"></mud-logo>
        Pay
      </mud-service-button>
    </div>
  `,
};
