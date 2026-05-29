import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { PHONE_INPUT_SIZES, PHONE_INPUT_TYPES, PHONE_INPUT_VARIANTS } from './mud-phone-input.types';
import type { PhoneInputSize, PhoneInputType, PhoneInputVariant } from './mud-phone-input.types';

type PhoneInputArgs = {
  variant: PhoneInputVariant;
  size: PhoneInputSize;
  type: PhoneInputType;
  label: string;
  placeholder: string;
  value: string;
  defaultCountry: string;
  helperText: string;
  errorText: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  loading: boolean;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderPhoneInput = (args: PhoneInputArgs) => /*html*/ `
  <mud-phone-input
    variant="${args.variant}"
    size="${args.size}"
    type="${args.type}"
    default-country="${args.defaultCountry}"
    label="${args.label}"
    placeholder="${args.placeholder}"
    ${args.value ? `value="${args.value}"` : ''}
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.readonly ? 'readonly' : ''}
    ${args.invalid ? 'invalid' : ''}
    ${args.loading ? 'loading' : ''}
  ></mud-phone-input>
`;

const docsSourceDefault = (args: PhoneInputArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.type !== 'local' ? `type="${args.type}"` : '',
    args.defaultCountry !== 'MD' ? `default-country="${args.defaultCountry}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.invalid ? 'invalid' : '',
    args.loading ? 'loading' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-phone-input ${attrs}></mud-phone-input>`;
};

const meta: Meta<PhoneInputArgs> = {
  title: 'Atoms/Input/Phone',
  component: 'mud-phone-input',
  argTypes: {
    variant: {
      control: 'select',
      options: PHONE_INPUT_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: PHONE_INPUT_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    type: {
      control: 'radio',
      options: PHONE_INPUT_TYPES,
      description:
        'Phone entry mode. `local` (Moldova-first) shows a static flag+dial-code pill. `international` shows a clickable country picker.',
      table: { defaultValue: { summary: 'local' } },
    },
    defaultCountry: {
      control: 'select',
      options: ['MD', 'RO', 'RU', 'UA', 'US', 'GB', 'DE', 'FR', 'IT', 'ES', 'PT', 'IL', 'TR', 'BG', 'GR'],
      description: 'Initial country selection (ISO 3166-1 alpha-2). Defaults to Moldova.',
      table: { defaultValue: { summary: 'MD' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    placeholder: { control: 'text', description: 'Defaults to the country mask (digits replaced with 0).' },
    value: { control: 'text', description: 'Canonical E.164 value (e.g. +37362123456).' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<PhoneInputArgs>;

export const Default: Story = {
  render: renderPhoneInput,
  args: {
    variant: 'default',
    size: 'lg',
    type: 'local',
    defaultCountry: 'MD',
    label: 'Număr de telefon',
    placeholder: '',
    value: '',
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
    loading: false,
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: PhoneInputArgs }) => docsSourceDefault(args),
      },
    },
  },
};

export const International: Story = {
  render: renderPhoneInput,
  name: 'International',
  args: {
    variant: 'default',
    size: 'lg',
    type: 'international',
    defaultCountry: 'MD',
    label: 'Telefon (internațional)',
    placeholder: '',
    value: '',
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'International mode reveals the chevron on the country trigger; clicking opens a listbox of 15 countries with flags, Romanian names, and dial codes.',
      },
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: PhoneInputArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
    ${children}
  </div>
`;

const wrapTriple = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 320px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 1140px;">
    ${children}
  </div>
`;

const wrapQuad = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 280px)); gap: var(--spacing-32) var(--spacing-40); padding: var(--spacing-24); max-width: 1280px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const AllVariants: Story = {
  name: 'All Variants',
  render: () =>
    wrapQuad(
      PHONE_INPUT_VARIANTS.map(variant =>
        cell(
          variant,
          /*html*/ `<mud-phone-input variant="${variant}" size="lg" type="international" label="Număr de telefon"></mud-phone-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Four-style matrix in International mode: default, warning, destructive, success. The country trigger is the gray pill at the leading edge of the field; the variant-specific border / focus ring colors are visible on the input container.',
      },
      source: {
        code: PHONE_INPUT_VARIANTS.map(
          v =>
            `<mud-phone-input variant="${v}" size="lg" type="international" label="Număr de telefon"></mud-phone-input>`,
        ).join('\n'),
      },
    },
  },
};

export const AllVariantsLocal: Story = {
  name: 'All Variants (Local)',
  render: () =>
    wrapQuad(
      PHONE_INPUT_VARIANTS.map(variant =>
        cell(
          variant,
          /*html*/ `<mud-phone-input variant="${variant}" size="lg" type="local" label="Număr de telefon"></mud-phone-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Same four styles in Local mode — country is fixed (no chevron, no listbox). For domestic Moldovan numbers where the +373 prefix is implicit.',
      },
      source: {
        code: PHONE_INPUT_VARIANTS.map(
          v => `<mud-phone-input variant="${v}" size="lg" type="local" label="Număr de telefon"></mud-phone-input>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      PHONE_INPUT_SIZES.map(size =>
        cell(
          size,
          /*html*/ `<mud-phone-input size="${size}" type="international" label="Număr de telefon"></mud-phone-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: PHONE_INPUT_SIZES.map(
          s => `<mud-phone-input size="${s}" type="international" label="Număr de telefon"></mud-phone-input>`,
        ).join('\n'),
      },
    },
  },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrapQuad(
      [
        cell(
          'default',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Număr de telefon"></mud-phone-input>`,
        ),
        cell(
          'filled',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456"></mud-phone-input>`,
        ),
        cell(
          'loading',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456" loading></mud-phone-input>`,
        ),
        cell(
          'read-only',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456" readonly></mud-phone-input>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Număr de telefon" disabled></mud-phone-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Număr de telefon" required></mud-phone-input>`,
        ),
        cell(
          'warning',
          /*html*/ `<mud-phone-input variant="warning" size="lg" type="international" label="Număr de telefon" value="+37362"></mud-phone-input>`,
        ),
        cell(
          'destructive',
          /*html*/ `<mud-phone-input variant="destructive" size="lg" type="international" label="Număr de telefon"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Număr de telefon"></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456"></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456" loading></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456" readonly></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Număr de telefon" disabled></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Număr de telefon" required></mud-phone-input>',
          '<mud-phone-input variant="warning" size="lg" type="international" label="Număr de telefon" value="+37362"></mud-phone-input>',
          '<mud-phone-input variant="destructive" size="lg" type="international" label="Număr de telefon"></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithCountrySelected: Story = {
  name: 'With Country Selected',
  render: () =>
    wrapTriple(
      [
        cell(
          'Moldova (MD) — default',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" default-country="MD" value="+37362123456"></mud-phone-input>`,
        ),
        cell(
          'România (RO)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" default-country="RO" value="+40721987654"></mud-phone-input>`,
        ),
        cell(
          'Ucraina (UA)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" default-country="UA" value="+380501234567"></mud-phone-input>`,
        ),
        cell(
          'Statele Unite (US)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" default-country="US" value="+12025550143"></mud-phone-input>`,
        ),
        cell(
          'Germania (DE)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" default-country="DE" value="+4915123456789"></mud-phone-input>`,
        ),
        cell(
          'Italia (IT)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" default-country="IT" value="+393311234567"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Each country surfaces its own flag, dial code, and format mask. The trigger is a clickable combobox in International mode.',
      },
      source: {
        code: [
          '<mud-phone-input type="international" default-country="MD" value="+37362123456"></mud-phone-input>',
          '<mud-phone-input type="international" default-country="RO" value="+40721987654"></mud-phone-input>',
          '<mud-phone-input type="international" default-country="UA" value="+380501234567"></mud-phone-input>',
          '<mud-phone-input type="international" default-country="US" value="+12025550143"></mud-phone-input>',
          '<mud-phone-input type="international" default-country="DE" value="+4915123456789"></mud-phone-input>',
          '<mud-phone-input type="international" default-country="IT" value="+393311234567"></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const OpenDropdown: Story = {
  name: 'Open Dropdown',
  render: () => /*html*/ `
    <style>
      #mud-phone-input-open-fixture::part(listbox) {
        max-block-size: 720px;
      }
    </style>
    <div style="padding: var(--spacing-24); display: flex; gap: var(--spacing-48); align-items: flex-start; min-height: 800px;">
      <div style="display: flex; flex-direction: column; gap: var(--spacing-8); width: 320px;">
        <span style="${cellLabelStyle}">Listbox open — all 15 country flags visible</span>
        <mud-phone-input id="mud-phone-input-open-fixture" type="international" size="lg" label="Număr de telefon" open></mud-phone-input>
      </div>
    </div>
    <script>
      requestAnimationFrame(() => {
        const el = document.getElementById('mud-phone-input-open-fixture');
        if (el && !el.hasAttribute('open')) el.setAttribute('open', '');
      });
    </script>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Open listbox shows all 15 countries side-by-side with their flags. Moldova (MD) is at the top — the home market — followed by the curated diaspora list (RO, RU, UA, US, GB, DE, FR, IT, ES, PT, IL, TR, BG, GR). Each row pairs the flag, Romanian country name, and E.164 dial code.',
      },
      source: {
        code: '<mud-phone-input size="lg" type="international" label="Număr de telefon" open></mud-phone-input>',
      },
    },
  },
};

export const Loading: Story = {
  name: 'Loading',
  render: () =>
    wrapQuad(
      [
        cell(
          'lg',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456" loading helper-text="Se verifică numărul…"></mud-phone-input>`,
        ),
        cell(
          'md',
          /*html*/ `<mud-phone-input size="md" type="international" label="Număr de telefon" value="+37362123456" loading helper-text="Se verifică numărul…"></mud-phone-input>`,
        ),
        cell(
          'local + loading',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Număr de telefon" value="+37362123456" loading helper-text="Se verifică numărul…"></mud-phone-input>`,
        ),
        cell(
          'success + loading',
          /*html*/ `<mud-phone-input variant="success" size="lg" type="international" label="Număr de telefon" value="+37362123456" loading></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Loading state — country trigger and input become uninteractive, an inline `mud-spinner` renders inside the input row, and the host carries `aria-busy="true"`.',
      },
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456" loading></mud-phone-input>',
          '<mud-phone-input size="md" type="international" label="Număr de telefon" value="+37362123456" loading></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="Număr de telefon" value="+37362123456" loading></mud-phone-input>',
          '<mud-phone-input variant="success" size="lg" type="international" label="Număr de telefon" value="+37362123456" loading></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const ReadOnly: Story = {
  name: 'Read Only',
  render: () =>
    wrapQuad(
      [
        cell(
          'lg + intl',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456" readonly></mud-phone-input>`,
        ),
        cell(
          'md + intl',
          /*html*/ `<mud-phone-input size="md" type="international" label="Număr de telefon" value="+37362123456" readonly></mud-phone-input>`,
        ),
        cell(
          'lg + local',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Număr de telefon" value="+37362123456" readonly></mud-phone-input>`,
        ),
        cell(
          'disabled (compare)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Număr de telefon" value="+37362123456" disabled></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Read-only state — soft-gray background, full-contrast text, country trigger inert. A confirmed valid number surfaces a green checkmark at the trailing edge. Distinct from disabled which dims the entire field.',
      },
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Telefon" value="+37362123456" readonly></mud-phone-input>',
          '<mud-phone-input size="md" type="international" label="Telefon" value="+37362123456" readonly></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="Telefon" value="+37362123456" readonly></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Telefon" value="+37362123456" disabled></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithWarning: Story = {
  name: 'With Warning',
  render: () =>
    wrap(
      [
        cell(
          'warning + helper',
          /*html*/ `<mud-phone-input variant="warning" size="lg" type="international" label="Telefon" value="+37362" helper-text="Verifică numărul"></mud-phone-input>`,
        ),
        cell(
          'warning + Romanian copy',
          /*html*/ `<mud-phone-input variant="warning" size="lg" type="local" label="Telefon" value="+37362" helper-text="Acest număr nu este verificat încă"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Warning variant — apricot border for ambiguous-state numbers (e.g. unverified, partial match). Helper copy follows the warning tone.',
      },
      source: {
        code: [
          '<mud-phone-input variant="warning" size="lg" type="international" label="Telefon" value="+37362" helper-text="Verifică numărul"></mud-phone-input>',
          '<mud-phone-input variant="warning" size="lg" type="local" label="Telefon" value="+37362" helper-text="Acest număr nu este verificat încă"></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithSuccess: Story = {
  name: 'With Success',
  render: () =>
    wrap(
      [
        cell(
          'success + helper',
          /*html*/ `<mud-phone-input variant="success" size="lg" type="international" label="Telefon" value="+37362123456" helper-text="Numărul este valid"></mud-phone-input>`,
        ),
        cell(
          'success + local',
          /*html*/ `<mud-phone-input variant="success" size="lg" type="local" label="Telefon" value="+37362123456" helper-text="Verificat"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Success variant — green border telegraphs a confirmed number. Helper copy switches to the success tone.',
      },
      source: {
        code: [
          '<mud-phone-input variant="success" size="lg" type="international" label="Telefon" value="+37362123456" helper-text="Numărul este valid"></mud-phone-input>',
          '<mud-phone-input variant="success" size="lg" type="local" label="Telefon" value="+37362123456" helper-text="Verificat"></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const Invalid: Story = {
  name: 'Invalid',
  render: () =>
    wrap(
      [
        cell(
          'invalid + default Romanian message',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" value="+37362" invalid></mud-phone-input>`,
        ),
        cell(
          'explicit destructive variant',
          /*html*/ `<mud-phone-input variant="destructive" size="lg" type="international" label="Telefon" value="+37362" error-text="Format invalid" invalid></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Telefon" value="+37362" invalid></mud-phone-input>',
          '<mud-phone-input variant="destructive" size="lg" type="international" label="Telefon" value="+37362" error-text="Format invalid" invalid></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithHelperText: Story = {
  name: 'With Helper Text',
  render: () =>
    wrap(
      [
        cell(
          'default',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Număr de telefon" helper-text="Vom folosi numărul doar pentru notificări"></mud-phone-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Număr de telefon" required helper-text="Câmp obligatoriu"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-phone-input size="lg" type="local" label="Număr de telefon" helper-text="Vom folosi numărul doar pentru notificări"></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="Număr de telefon" required helper-text="Câmp obligatoriu"></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const WithError: Story = {
  name: 'With Error',
  render: () =>
    wrap(
      [
        cell(
          'invalid + default Romanian message',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" value="+37362" invalid></mud-phone-input>`,
        ),
        cell(
          'invalid + explicit error',
          /*html*/ `<mud-phone-input variant="destructive" size="lg" type="local" label="Telefon" value="+37362" invalid error-text="Format invalid"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Romanian-voice error copy. `errorText` defaults to "Numărul de telefon este incomplet" when `invalid` is set without a custom message.',
      },
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Telefon" value="+37362" invalid></mud-phone-input>',
          '<mud-phone-input variant="destructive" size="lg" type="local" label="Telefon" value="+37362" invalid error-text="Format invalid"></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const TypeComparison: Story = {
  name: 'Type Comparison (Local vs International)',
  render: () =>
    wrap(
      [
        cell(
          'local (default — MD-only)',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Telefon" value="+37362123456"></mud-phone-input>`,
        ),
        cell(
          'international (changeable)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" value="+37362123456"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Side-by-side comparison of the two phone-entry modes. Local hides the chevron — the country is fixed to the `defaultCountry`. International reveals the chevron and accepts country changes through the listbox.',
      },
      source: {
        code: [
          '<mud-phone-input size="lg" type="local" label="Telefon" value="+37362123456"></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Telefon" value="+37362123456"></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const EdgeCases: Story = {
  name: 'Edge Cases',
  render: () =>
    wrap(
      [
        cell(
          'paste full E.164 (+44 detected → GB)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" default-country="MD" value="+447911123456"></mud-phone-input>`,
        ),
        cell(
          'long international format (DE 11 digits)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Telefon" default-country="DE" value="+4915123456789"></mud-phone-input>`,
        ),
        cell(
          'label truncation (single line)',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services"></mud-phone-input>`,
        ),
        cell(
          'assistive truncation (two lines)',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Telefon" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Telefon" default-country="MD" value="+447911123456"></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Telefon" default-country="DE" value="+4915123456789"></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="…long label…"></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="Telefon" helper-text="…long helper text…"></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};
