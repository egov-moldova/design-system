import type { Meta, StoryObj } from '@storybook/web-components-vite';

type SwitchArgs = {
  checked: boolean;
  disabled: boolean;
  required: boolean;
  label: string;
  name: string;
  value: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

// ---------- Slot-first markup helper ----------
//
// `label` prop is ARIA-only (see component JSDoc); visible content lives
// exclusively in the `label` slot.

type CbOpts = {
  label?: string;
  flags?: string;
  name?: string;
  value?: string;
  ariaLabel?: string;
  /** Extra inline class for focus-demo etc. */
  klass?: string;
};

const cb = (opts: CbOpts = {}): string => {
  const attrs = [
    opts.klass ? `class="${opts.klass}"` : '',
    opts.name ? `name="${opts.name}"` : '',
    opts.value ? `value="${opts.value}"` : '',
    opts.ariaLabel ? `aria-label="${opts.ariaLabel}"` : '',
    opts.flags ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const opener = attrs ? `<cor-switch ${attrs}>` : '<cor-switch>';
  const slots = opts.label ? `<span slot="label">${opts.label}</span>` : '';
  return `${opener}${slots}</cor-switch>`;
};

const renderSwitch = (args: SwitchArgs) =>
  cb({
    label: args.label,
    name: args.name || undefined,
    value: args.value || undefined,
    flags: [args.checked && 'checked', args.disabled && 'disabled', args.required && 'required']
      .filter(Boolean)
      .join(' '),
  });

const docsSourceDefault = (args: SwitchArgs) =>
  renderSwitch(args).replace(/<\/cor-switch>/, '\n</cor-switch>').replace(/<span slot=/g, '\n  <span slot=');

const meta: Meta<SwitchArgs> = {
  title: 'Atoms/Switch',
  component: 'cor-switch',
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Whether the switch is currently on.',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables interactivity.',
      table: { defaultValue: { summary: 'false' } },
    },
    required: {
      control: 'boolean',
      description: 'Marks the field as mandatory.',
      table: { defaultValue: { summary: 'false' } },
    },
    label: {
      control: 'text',
      description: 'Slotted visible label (rendered as `<span slot="label">…</span>`).',
    },
    name: { control: 'text', description: 'Form-control `name`.' },
    value: { control: 'text', description: 'Value submitted with the form when on.' },
  },
};

export default meta;

type Story = StoryObj<SwitchArgs>;

export const Default: Story = {
  render: renderSwitch,
  args: {
    checked: false,
    disabled: false,
    required: false,
    label: 'Notificări push',
    name: '',
    value: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: SwitchArgs }) => docsSourceDefault(args),
      },
    },
  },
};

export const Checked: Story = {
  render: renderSwitch,
  args: { ...Default.args, checked: true, label: 'Mod întunecat' } as SwitchArgs,
  parameters: Default.parameters,
};

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8); align-items: flex-start;">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

const docsCode = (...lines: string[]) => lines.join('\n');

export const AllStates: Story = {
  name: 'All States',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 160px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 640px;">
        ${[
          cell('off · default', cb({})),
          cell('off · focus', cb({ klass: 'is-focused-demo' })),
          cell('off · disabled', cb({ flags: 'disabled' })),
          cell('on · default', cb({ flags: 'checked' })),
          cell('on · focus', cb({ flags: 'checked', klass: 'is-focused-demo' })),
          cell('on · disabled', cb({ flags: 'checked disabled' })),
        ].join('')}
      </div>
      <style>
        cor-switch.is-focused-demo::part(track) {
          box-shadow:
            0 0 0 var(--switch-focus-ring-inner-width) var(--switch-focus-ring-inner-color),
            0 0 0 calc(var(--switch-focus-ring-inner-width) + var(--switch-focus-ring-outer-width))
              var(--switch-focus-ring-outer-color);
        }
      </style>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The full off/on × default/focus/disabled matrix from the Figma "States" frame. The focus row is approximated visually here; in real use the focus ring appears when the control receives keyboard focus.',
      },
      source: {
        code: docsCode(cb({}), cb({ flags: 'checked' }), cb({ flags: 'disabled' }), cb({ flags: 'checked disabled' })),
      },
    },
  },
};

export const WithLabel: Story = {
  name: 'With Label',
  render: () => /*html*/ `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); max-width: 360px;">
        ${cb({ label: 'Notificări push' })}
        ${cb({ label: 'Mod întunecat', flags: 'checked' })}
        ${cb({ label: 'Sincronizare automată', flags: 'checked' })}
        ${cb({ label: 'Anunțuri de marketing', flags: 'disabled' })}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Notificări push' }),
          cb({ label: 'Mod întunecat', flags: 'checked' }),
          cb({ label: 'Sincronizare automată', flags: 'checked' }),
          cb({ label: 'Anunțuri de marketing', flags: 'disabled' }),
        ),
      },
    },
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 220px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 560px;">
        ${[
          cell('off · disabled', cb({ label: 'Notificări push', flags: 'disabled' })),
          cell('on · disabled', cb({ label: 'Mod întunecat', flags: 'checked disabled' })),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Notificări push', flags: 'disabled' }),
          cb({ label: 'Mod întunecat', flags: 'checked disabled' }),
        ),
      },
    },
  },
};

export const InForm: Story = {
  name: 'In Form',
  render: () => /*html*/ `
      <form
        id="settings-form"
        style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-8); max-width: 420px;"
        onsubmit="event.preventDefault(); const data = new FormData(event.target); const out = document.getElementById('settings-form-output'); out.textContent = JSON.stringify(Object.fromEntries(data.entries()), null, 2);"
      >
        <legend style="font-family: var(--font-family-primary); font-size: var(--font-size-14); font-weight: var(--font-weight-medium); color: var(--color-text-base-default); margin: 0;">
          Preferințe notificări
        </legend>
        ${cb({ name: 'push', value: 'da', label: 'Notificări push', flags: 'checked' })}
        ${cb({ name: 'email', value: 'da', label: 'Notificări prin e-mail' })}
        ${cb({ name: 'sms', value: 'da', label: 'Notificări prin SMS' })}
        ${cb({ name: 'marketing', value: 'da', label: 'Mesaje de marketing' })}
        <div style="display: flex; gap: var(--spacing-12); margin-top: var(--spacing-8);">
          <cor-button variant="primary" size="md" type="submit">Salvează</cor-button>
          <cor-button variant="secondary" size="md" type="reset">Resetează</cor-button>
        </div>
        <pre id="settings-form-output" style="font-family: var(--font-family-primary); font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0;"></pre>
      </form>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Submit the form to see which switches contribute values. Off switches are excluded from the FormData, mirroring native checkbox semantics.',
      },
      source: {
        code: docsCode(
          '<form>',
          `  ${cb({ name: 'push', value: 'da', label: 'Notificări push', flags: 'checked' })}`,
          `  ${cb({ name: 'email', value: 'da', label: 'Notificări prin e-mail' })}`,
          '  <cor-button variant="primary" type="submit">Salvează</cor-button>',
          '</form>',
        ),
      },
    },
  },
};
