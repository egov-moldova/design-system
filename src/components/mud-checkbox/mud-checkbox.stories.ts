import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { CHECKBOX_SIZES } from './mud-checkbox.types';
import type { CheckboxSize } from './mud-checkbox.types';

type CheckboxArgs = {
  size: CheckboxSize;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
  readonly: boolean;
  label: string;
  supportingText: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

// ---------- Slot-first markup helper ----------
//
// `label` / `supportingText` props are ARIA-only (see component JSDoc); visible
// content lives exclusively in the `label` / `supporting-text` slots. This
// helper composes that markup so every story renders the same structure.

type CbOpts = {
  size?: CheckboxSize;
  label?: string;
  supporting?: string;
  /** Space-separated boolean attribute list (e.g. 'checked disabled'). */
  flags?: string;
  /** Raw `aria-label` override — wins over the `label` prop for AT only. */
  ariaLabel?: string;
  /** Raw inner markup override. When set, ignores `label`/`supporting`. */
  rawSlots?: string;
};

const cb = (opts: CbOpts = {}): string => {
  const attrs = [
    opts.size && opts.size !== 'md' ? `size="${opts.size}"` : '',
    opts.ariaLabel ? `aria-label="${opts.ariaLabel}"` : '',
    opts.flags ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const opener = attrs ? `<mud-checkbox ${attrs}>` : '<mud-checkbox>';
  const slots =
    opts.rawSlots !== undefined
      ? opts.rawSlots
      : [
          opts.label ? `<span slot="label">${opts.label}</span>` : '',
          opts.supporting ? `<span slot="supporting-text">${opts.supporting}</span>` : '',
        ]
          .filter(Boolean)
          .join('');
  return `${opener}${slots}</mud-checkbox>`;
};

const renderCheckbox = (args: CheckboxArgs) =>
  cb({
    size: args.size,
    label: args.label,
    supporting: args.supportingText,
    flags: [
      args.checked && 'checked',
      args.indeterminate && 'indeterminate',
      args.disabled && 'disabled',
      args.invalid && 'invalid',
      args.required && 'required',
      args.readonly && 'readonly',
    ]
      .filter(Boolean)
      .join(' '),
  });

const docsSource = (args: CheckboxArgs) =>
  renderCheckbox(args).replace(/<\/mud-checkbox>/, '\n</mud-checkbox>').replace(/<span slot=/g, '\n  <span slot=');

const meta: Meta<CheckboxArgs> = {
  title: 'Atoms/Checkbox',
  component: 'mud-checkbox',
  argTypes: {
    size: {
      control: 'select',
      options: CHECKBOX_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    checked: { control: 'boolean', description: 'Checked state.' },
    indeterminate: { control: 'boolean', description: 'Visual tri-state marker (dash glyph).' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean', description: 'Destructive visuals + `aria-invalid`.' },
    required: { control: 'boolean' },
    readonly: { control: 'boolean' },
    label: {
      control: 'text',
      description: 'Slotted visible label (rendered as `<span slot="label">…</span>`).',
    },
    supportingText: {
      control: 'text',
      description: 'Slotted supporting text (rendered as `<span slot="supporting-text">…</span>`).',
    },
  },
};

export default meta;

type Story = StoryObj<CheckboxArgs>;

export const Default: Story = {
  render: renderCheckbox,
  args: {
    size: 'md',
    checked: false,
    indeterminate: false,
    disabled: false,
    invalid: false,
    required: false,
    readonly: false,
    label: 'Acord',
    supportingText: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: CheckboxArgs }) => docsSource(args),
      },
    },
  },
};

export const Checked: Story = {
  render: renderCheckbox,
  args: { ...Default.args!, checked: true, label: 'Termeni și condiții' },
  parameters: Default.parameters,
};

export const Indeterminate: Story = {
  render: renderCheckbox,
  args: { ...Default.args!, indeterminate: true, label: 'Selectează toate categoriile' },
  parameters: Default.parameters,
};

// ---------- Grid helpers ----------

const wrapStates = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--spacing-24) var(--spacing-32); padding: var(--spacing-24); max-width: 880px;">
    ${children}
  </div>
`;

const wrapNarrow = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 280px)); gap: var(--spacing-24) var(--spacing-32); padding: var(--spacing-24); max-width: 640px;">
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
  render: () =>
    wrapStates(
      [
        cell('unchecked (md)', cb({ label: 'Default' })),
        cell('checked (md)', cb({ label: 'Default', flags: 'checked' })),
        cell('indeterminate (md)', cb({ label: 'Default', flags: 'indeterminate' })),
        cell('disabled unchecked', cb({ label: 'Default', flags: 'disabled' })),
        cell('disabled checked', cb({ label: 'Default', flags: 'disabled checked' })),
        cell('disabled indeterminate', cb({ label: 'Default', flags: 'disabled indeterminate' })),
        cell('error unchecked', cb({ label: 'Default', flags: 'invalid' })),
        cell('error checked', cb({ label: 'Default', flags: 'invalid checked' })),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          cb({ label: 'Default' }),
          cb({ label: 'Default', flags: 'checked' }),
          cb({ label: 'Default', flags: 'indeterminate' }),
          cb({ label: 'Default', flags: 'disabled' }),
          cb({ label: 'Default', flags: 'disabled checked' }),
          cb({ label: 'Default', flags: 'disabled indeterminate' }),
          cb({ label: 'Default', flags: 'invalid' }),
          cb({ label: 'Default', flags: 'invalid checked' }),
        ),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrapNarrow(
      CHECKBOX_SIZES.flatMap(size => [
        cell(`${size} · unchecked`, cb({ size, label: 'Acord' })),
        cell(`${size} · checked`, cb({ size, label: 'Acord', flags: 'checked' })),
      ]).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsCode(
          ...CHECKBOX_SIZES.flatMap(s => [
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
    wrapNarrow(
      [
        cell('plain slot', cb({ label: 'Acord' })),
        cell('plain slot (checked)', cb({ label: 'Termeni și condiții', flags: 'checked' })),
        cell(
          'rich slot',
          cb({
            rawSlots: /*html*/ `<span slot="label">Sunt de acord cu <strong>Termeni și condiții</strong></span>`,
          }),
        ),
        cell(
          'rich slot (checked)',
          cb({
            flags: 'checked',
            rawSlots: /*html*/ `<span slot="label">Doresc să primesc <a href="#">actualizări</a> prin email</span>`,
          }),
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const WithSupportingText: Story = {
  name: 'With Supporting Text',
  render: () =>
    wrapNarrow(
      [
        cell('unchecked', cb({ label: 'Acord', supporting: 'Vom trimite confirmarea la adresa ta de email.' })),
        cell(
          'checked',
          cb({
            label: 'Termeni și condiții',
            supporting: 'Citește documentul complet înainte de a continua.',
            flags: 'checked',
          }),
        ),
        cell(
          'indeterminate',
          cb({
            label: 'Selectează toate',
            supporting: 'Unele subcategorii sunt deja selectate.',
            flags: 'indeterminate',
          }),
        ),
        cell(
          'small size',
          cb({ size: 'sm', label: 'Marketing', supporting: 'Pot fi dezactivate oricând din setări.' }),
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const Error: Story = {
  name: 'Error',
  render: () =>
    wrapNarrow(
      [
        cell(
          'error unchecked',
          cb({
            label: 'Termeni și condiții',
            supporting: 'Trebuie să accepți termenii pentru a continua.',
            flags: 'invalid required',
          }),
        ),
        cell(
          'error checked',
          cb({
            label: 'Termeni și condiții',
            supporting: 'Trebuie să accepți termenii pentru a continua.',
            flags: 'invalid checked',
          }),
        ),
        cell('error sm', cb({ size: 'sm', label: 'Acord', flags: 'invalid' })),
        cell('error sm checked', cb({ size: 'sm', label: 'Acord', flags: 'invalid checked' })),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () =>
    wrapNarrow(
      [
        cell('disabled unchecked', cb({ label: 'Acord', flags: 'disabled' })),
        cell('disabled checked', cb({ label: 'Acord', flags: 'disabled checked' })),
        cell('disabled indeterminate', cb({ label: 'Acord', flags: 'disabled indeterminate' })),
        cell(
          'disabled + supporting',
          cb({ label: 'Acord', supporting: 'Această opțiune nu este disponibilă acum.', flags: 'disabled' }),
        ),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () =>
    wrapNarrow(
      [
        cell(
          'long label wraps',
          cb({
            label:
              'Doresc să primesc actualizări periodice prin email despre noile funcționalități, promoții și evenimente organizate de Corlab și partenerii săi',
          }),
        ),
        cell(
          'long label + supporting',
          cb({
            label: 'Sunt de acord cu Termeni și condiții și Politica de confidențialitate',
            supporting:
              'Te rugăm să citești cu atenție documentele complete înainte de a continua. Acordul tău se aplică tuturor serviciilor Corlab și poate fi retras oricând din pagina de setări a contului.',
            flags: 'checked',
          }),
        ),
        cell('no label (aria-only)', cb({ ariaLabel: 'Selectează rândul' })),
        cell('readonly checked', cb({ label: 'Verificat de sistem', flags: 'readonly checked' })),
      ].join(''),
    ),
  parameters: { controls: { disable: true } },
};

export const ReducedMotion: Story = {
  name: 'Reduced Motion',
  render: () => /*html*/ `
    <style>
      .reduced-motion-wrapper {
        --checkbox-container-transition-duration: 0ms;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, auto));
        gap: var(--spacing-16);
        padding: var(--spacing-24);
        align-items: center;
      }
    </style>
    <div class="reduced-motion-wrapper">
      ${cb({ label: 'Default' })}
      ${cb({ label: 'Checked', flags: 'checked' })}
      ${cb({ label: 'Indeterminate', flags: 'indeterminate' })}
    </div>
    <p style="${cellLabelStyle}; max-width: 540px; padding: 0 var(--spacing-24); font-style: italic;">
      Locally overrides <code>--checkbox-container-transition-duration</code> to demonstrate the
      static state shown when the user enables OS-level "reduce motion".
    </p>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<style>
  /* Honor reduce-motion, or force it locally. */
  .reduced-motion-wrapper {
    --checkbox-container-transition-duration: 0ms;
  }
</style>

<div class="reduced-motion-wrapper">
  ${cb({ label: 'Default' })}
</div>`,
      },
    },
  },
};

// Internal coverage story — exercises the Stencil-injected constructor guard
// (`if (registerHost !== false) { ... }`) so browser-mode coverage reports
// 100% branches on the TSX. Hidden from sidebar + autodocs.
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => cb({ label: 'hidden' }),
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-checkbox') as unknown as (new (registerHost: boolean) => unknown) | undefined;
    // `globalThis.Error` because the local `Error: Story` export above shadows the global class in this module.
    if (!Ctor) throw new globalThis.Error('mud-checkbox constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new globalThis.Error('instance not constructed');
  },
};
