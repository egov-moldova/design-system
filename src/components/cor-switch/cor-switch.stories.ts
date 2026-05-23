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

const renderSwitch = (args: SwitchArgs) => /*html*/ `
  <cor-switch
    label="${args.label}"
    name="${args.name}"
    value="${args.value}"
    ${args.checked ? 'checked' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.required ? 'required' : ''}
  ></cor-switch>
`;

const docsSourceDefault = (args: SwitchArgs) => {
  const attrs = [
    args.label ? `label="${args.label}"` : '',
    args.name ? `name="${args.name}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.checked ? 'checked' : '',
    args.disabled ? 'disabled' : '',
    args.required ? 'required' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<cor-switch ${attrs}></cor-switch>`;
};

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
    label: { control: 'text', description: 'Plain-text label.' },
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
  args: {
    ...Default.args,
    checked: true,
    label: 'Mod întunecat',
  } as SwitchArgs,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: SwitchArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8); align-items: flex-start;">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const AllStates: Story = {
  name: 'All States',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 160px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 640px;">
        ${[
          cell('off · default', /*html*/ `<cor-switch></cor-switch>`),
          cell('off · focus', /*html*/ `<cor-switch class="is-focused-demo"></cor-switch>`),
          cell('off · disabled', /*html*/ `<cor-switch disabled></cor-switch>`),
          cell('on · default', /*html*/ `<cor-switch checked></cor-switch>`),
          cell('on · focus', /*html*/ `<cor-switch checked class="is-focused-demo"></cor-switch>`),
          cell('on · disabled', /*html*/ `<cor-switch checked disabled></cor-switch>`),
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
        code: [
          '<cor-switch></cor-switch>',
          '<cor-switch checked></cor-switch>',
          '<cor-switch disabled></cor-switch>',
          '<cor-switch checked disabled></cor-switch>',
        ].join('\n'),
      },
    },
  },
};

export const WithLabel: Story = {
  name: 'With Label',
  render: () => /*html*/ `
      <div style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); max-width: 360px;">
        <cor-switch label="Notificări push"></cor-switch>
        <cor-switch label="Mod întunecat" checked></cor-switch>
        <cor-switch label="Sincronizare automată" checked></cor-switch>
        <cor-switch label="Anunțuri de marketing" disabled></cor-switch>
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-switch label="Notificări push"></cor-switch>',
          '<cor-switch label="Mod întunecat" checked></cor-switch>',
          '<cor-switch label="Sincronizare automată" checked></cor-switch>',
          '<cor-switch label="Anunțuri de marketing" disabled></cor-switch>',
        ].join('\n'),
      },
    },
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 220px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 560px;">
        ${[
          cell('off · disabled', /*html*/ `<cor-switch label="Notificări push" disabled></cor-switch>`),
          cell('on · disabled', /*html*/ `<cor-switch label="Mod întunecat" checked disabled></cor-switch>`),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-switch label="Notificări push" disabled></cor-switch>',
          '<cor-switch label="Mod întunecat" checked disabled></cor-switch>',
        ].join('\n'),
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
        <cor-switch name="push" value="da" label="Notificări push" checked></cor-switch>
        <cor-switch name="email" value="da" label="Notificări prin e-mail"></cor-switch>
        <cor-switch name="sms" value="da" label="Notificări prin SMS"></cor-switch>
        <cor-switch name="marketing" value="da" label="Mesaje de marketing"></cor-switch>
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
        code: [
          '<form>',
          '  <cor-switch name="push" value="da" label="Notificări push" checked></cor-switch>',
          '  <cor-switch name="email" value="da" label="Notificări prin e-mail"></cor-switch>',
          '  <cor-button variant="primary" type="submit">Salvează</cor-button>',
          '</form>',
        ].join('\n'),
      },
    },
  },
};
