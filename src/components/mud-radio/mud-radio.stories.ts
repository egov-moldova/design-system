import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { RADIO_SIZES } from './mud-radio.types';
import type { RadioSize } from './mud-radio.types';

type RadioArgs = {
  size: RadioSize;
  checked: boolean;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
  readonly: boolean;
  label: string;
  supportingText: string;
  name: string;
  value: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

// ---------- Slot-first markup helper ----------
//
// `label` / `supportingText` props are ARIA-only fallbacks (see component
// JSDoc); visible content lives exclusively in the `label` / `supporting-text`
// slots. This helper composes the consumer-ready markup so stories stay
// readable.

type CbOpts = {
  size?: RadioSize;
  label?: string;
  supporting?: string;
  /** Space-separated boolean attribute list. */
  flags?: string;
  /** Form-control name (used by the Group story). */
  name?: string;
  /** Submitted value when this radio is checked. */
  value?: string;
  /** Aria-label override — wins over the `label` prop for AT only. */
  ariaLabel?: string;
};

const cb = (opts: CbOpts = {}): string => {
  const attrs = [
    opts.size && opts.size !== 'md' ? `size="${opts.size}"` : '',
    opts.name ? `name="${opts.name}"` : '',
    opts.value ? `value="${opts.value}"` : '',
    opts.ariaLabel ? `aria-label="${opts.ariaLabel}"` : '',
    opts.flags ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const opener = attrs ? `<mud-radio ${attrs}>` : '<mud-radio>';
  const slots = [
    opts.label ? `<span slot="label">${opts.label}</span>` : '',
    opts.supporting ? `<span slot="supporting-text">${opts.supporting}</span>` : '',
  ]
    .filter(Boolean)
    .join('');
  return `${opener}${slots}</mud-radio>`;
};

const renderRadio = (args: RadioArgs) =>
  cb({
    size: args.size,
    label: args.label,
    supporting: args.supportingText,
    name: args.name || undefined,
    value: args.value || undefined,
    flags: [
      args.checked && 'checked',
      args.disabled && 'disabled',
      args.invalid && 'invalid',
      args.required && 'required',
      args.readonly && 'readonly',
    ]
      .filter(Boolean)
      .join(' '),
  });

const docsSourceDefault = (args: RadioArgs) =>
  renderRadio(args)
    .replace(/<\/mud-radio>/, '\n</mud-radio>')
    .replace(/<span slot=/g, '\n  <span slot=');

const meta: Meta<RadioArgs> = {
  title: 'Atoms/Radio',
  component: 'mud-radio',
  argTypes: {
    size: {
      control: 'select',
      options: RADIO_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    checked: { control: 'boolean', description: 'Whether the radio is currently selected.' },
    disabled: { control: 'boolean', description: 'Disables interactivity.' },
    invalid: { control: 'boolean', description: 'Maps to Figma "Error" state — border + dot turn red.' },
    required: { control: 'boolean', description: 'Marks the field as mandatory.' },
    readonly: { control: 'boolean', description: 'Renders the control read-only.' },
    label: {
      control: 'text',
      description: 'Slotted visible label (rendered as `<span slot="label">…</span>`).',
    },
    supportingText: {
      control: 'text',
      description: 'Slotted supporting text (rendered as `<span slot="supporting-text">…</span>`).',
    },
    name: { control: 'text', description: 'Form-control `name`.' },
    value: { control: 'text', description: 'Value submitted with the form when checked.' },
  },
};

export default meta;

type Story = StoryObj<RadioArgs>;

export const Default: Story = {
  render: renderRadio,
  args: {
    size: 'md',
    checked: false,
    disabled: false,
    invalid: false,
    required: false,
    readonly: false,
    label: 'Acord',
    supportingText: '',
    name: '',
    value: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: RadioArgs }) => docsSourceDefault(args),
      },
    },
  },
};

export const Selected: Story = {
  render: renderRadio,
  args: { ...Default.args, checked: true, label: 'Acord' } as RadioArgs,
  parameters: Default.parameters,
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 240px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 600px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

const docsCode = (...lines: string[]) => lines.join('\n');

export const AllStates: Story = {
  name: 'All States',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 220px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 560px;">
        ${[
          cell('default', cb({ label: 'Acord' })),
          cell('selected', cb({ label: 'Acord', flags: 'checked' })),
          cell('disabled', cb({ label: 'Acord', flags: 'disabled' })),
          cell('selected + disabled', cb({ label: 'Acord', flags: 'checked disabled' })),
          cell('error', cb({ label: 'Acord', flags: 'invalid' })),
          cell('selected + error', cb({ label: 'Acord', flags: 'checked invalid' })),
          cell('focus (use Tab)', cb({ label: 'Acord' })),
          cell('readonly', cb({ label: 'Acord', flags: 'checked readonly' })),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Acord' }),
          cb({ label: 'Acord', flags: 'checked' }),
          cb({ label: 'Acord', flags: 'disabled' }),
          cb({ label: 'Acord', flags: 'checked disabled' }),
          cb({ label: 'Acord', flags: 'invalid' }),
          cb({ label: 'Acord', flags: 'checked invalid' }),
          cb({ label: 'Acord', flags: 'checked readonly' }),
        ),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      RADIO_SIZES.map(size =>
        cell(
          size,
          /*html*/ `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-12);">
              ${cb({ size, label: 'Acord' })}
              ${cb({ size, label: 'Acord', flags: 'checked' })}
            </div>
          `,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          ...RADIO_SIZES.flatMap(s => [
            cb({ size: s, label: 'Acord' }),
            cb({ size: s, label: 'Acord', flags: 'checked' }),
          ]),
        ),
      },
    },
  },
};

export const WithLabel: Story = {
  name: 'With Label',
  render: () =>
    wrap(
      [
        cell('default', cb({ label: 'Doresc să primesc actualizări' })),
        cell('selected', cb({ label: 'Doresc să primesc actualizări', flags: 'checked' })),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Doresc să primesc actualizări' }),
          cb({ label: 'Doresc să primesc actualizări', flags: 'checked' }),
        ),
      },
    },
  },
};

export const WithSupportingText: Story = {
  name: 'With Supporting Text',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
        ${[
          cell(
            'default (md)',
            cb({ label: 'Acord', supporting: 'Sunt de acord cu termenii și condițiile serviciului.' }),
          ),
          cell(
            'selected (md)',
            cb({
              label: 'Acord',
              supporting: 'Sunt de acord cu termenii și condițiile serviciului.',
              flags: 'checked',
            }),
          ),
          cell(
            'default (sm)',
            cb({
              size: 'sm',
              label: 'Acord',
              supporting: 'Sunt de acord cu termenii și condițiile serviciului.',
            }),
          ),
          cell(
            'selected (sm)',
            cb({
              size: 'sm',
              label: 'Acord',
              supporting: 'Sunt de acord cu termenii și condițiile serviciului.',
              flags: 'checked',
            }),
          ),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Acord', supporting: 'Sunt de acord cu termenii și condițiile serviciului.' }),
          cb({
            label: 'Acord',
            supporting: 'Sunt de acord cu termenii și condițiile serviciului.',
            flags: 'checked',
          }),
        ),
      },
    },
  },
};

export const Error: Story = {
  name: 'Error',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
        ${[
          cell('error (unselected)', cb({ label: 'Refuz', flags: 'invalid' })),
          cell('error (selected)', cb({ label: 'Refuz', flags: 'invalid checked' })),
          cell(
            'error + supporting',
            cb({ label: 'Refuz', supporting: 'Această opțiune blochează cererea.', flags: 'invalid' }),
          ),
          cell('error (sm)', cb({ size: 'sm', label: 'Refuz', flags: 'invalid checked' })),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Refuz', flags: 'invalid' }),
          cb({ label: 'Refuz', flags: 'invalid checked' }),
          cb({ label: 'Refuz', supporting: 'Această opțiune blochează cererea.', flags: 'invalid' }),
        ),
      },
    },
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () =>
    wrap(
      [
        cell('disabled (unselected)', cb({ label: 'Acord', flags: 'disabled' })),
        cell('disabled (selected)', cb({ label: 'Acord', flags: 'disabled checked' })),
        cell(
          'disabled + supporting',
          cb({ label: 'Acord', supporting: 'Această opțiune nu poate fi modificată.', flags: 'disabled' }),
        ),
        cell('disabled (sm)', cb({ size: 'sm', label: 'Acord', flags: 'disabled checked' })),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Acord', flags: 'disabled' }),
          cb({ label: 'Acord', flags: 'disabled checked' }),
          cb({ label: 'Acord', supporting: 'Această opțiune nu poate fi modificată.', flags: 'disabled' }),
        ),
      },
    },
  },
};

export const Group: Story = {
  name: 'Group (preview)',
  render: () => /*html*/ `
      <fieldset style="display: flex; flex-direction: column; gap: var(--spacing-12); padding: var(--spacing-16); border: 1px solid var(--color-border-base-default); border-radius: var(--border-radius-8); max-width: 360px;">
        <legend style="font-family: var(--font-family-primary); font-size: var(--font-size-14); font-weight: var(--font-weight-medium); color: var(--color-text-base-default); padding: 0 var(--spacing-4);">Selectează o opțiune</legend>
        ${cb({ name: 'consimtamant', value: 'acord', label: 'Acord', flags: 'checked' })}
        ${cb({ name: 'consimtamant', value: 'refuz', label: 'Refuz' })}
        ${cb({ name: 'consimtamant', value: 'indecis', label: 'Doresc să decid mai târziu' })}
      </fieldset>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Multiple `mud-radio` siblings sharing a `name` form an implicit group. A dedicated `mud-radio-group` molecule that adds roving-focus and arrow-key navigation will land in a follow-up PR.',
      },
      source: {
        code: docsCode(
          cb({ name: 'consimtamant', value: 'acord', label: 'Acord', flags: 'checked' }),
          cb({ name: 'consimtamant', value: 'refuz', label: 'Refuz' }),
          cb({ name: 'consimtamant', value: 'indecis', label: 'Doresc să decid mai târziu' }),
        ),
      },
    },
  },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () => /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 360px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 800px;">
        ${[
          cell(
            'long label wraps',
            cb({
              label:
                'Sunt de acord ca datele mele cu caracter personal să fie prelucrate de Agenția de Guvernare Electronică pentru a primi serviciile selectate.',
            }),
          ),
          cell(
            'long supporting text wraps',
            cb({
              label: 'Acord',
              supporting:
                'Datele dumneavoastră vor fi prelucrate în conformitate cu Legea nr. 133 privind protecția datelor cu caracter personal și vor fi păstrate pentru maximum 36 de luni.',
            }),
          ),
          cell(
            'long label + long supporting',
            cb({
              label: 'Sunt de acord cu termenii completi ai serviciului electronic',
              supporting:
                'Aceasta include termenii de utilizare, politica de confidențialitate și acordul privind cookie-urile pentru toate subdomeniile .gov.md.',
              flags: 'checked',
            }),
          ),
          cell('no label (aria-label only)', cb({ ariaLabel: 'Opțiunea A' })),
        ].join('')}
      </div>
    `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: '…long Romanian label…' }),
          cb({ label: 'Acord', supporting: '…long supporting text…' }),
          cb({ ariaLabel: 'Opțiunea A' }),
        ),
      },
    },
  },
};
