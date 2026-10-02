import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { MUD_LOCALES } from '../../utils/locale';
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
  locale: string;
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
    ${args.locale ? `locale="${args.locale}"` : ''}
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
    args.locale ? `locale="${args.locale}"` : '',
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
  title: 'Components/Input/Phone',
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
    locale: {
      control: 'select',
      options: ['', ...MUD_LOCALES],
      description:
        'Language of every built-in message plus the listbox country names. Unset follows the closest ancestor `lang`, else `ro-MD`.',
    },
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
    locale: '',
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
    label: 'Phone (international)',
    placeholder: '',
    value: '',
    helperText: '',
    errorText: '',
    locale: '',
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
          'International mode reveals the chevron on the country trigger; clicking opens a listbox of every country with its flag, name in the page language, and dial code; the search field narrows it.',
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
          /*html*/ `<mud-phone-input variant="${variant}" size="lg" type="international" label="Phone number"></mud-phone-input>`,
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
          v => `<mud-phone-input variant="${v}" size="lg" type="international" label="Phone number"></mud-phone-input>`,
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
          /*html*/ `<mud-phone-input variant="${variant}" size="lg" type="local" label="Phone number"></mud-phone-input>`,
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
          v => `<mud-phone-input variant="${v}" size="lg" type="local" label="Phone number"></mud-phone-input>`,
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
          /*html*/ `<mud-phone-input size="${size}" type="international" label="Phone number"></mud-phone-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: PHONE_INPUT_SIZES.map(
          s => `<mud-phone-input size="${s}" type="international" label="Phone number"></mud-phone-input>`,
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
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone number"></mud-phone-input>`,
        ),
        cell(
          'filled',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456"></mud-phone-input>`,
        ),
        cell(
          'loading',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456" loading></mud-phone-input>`,
        ),
        cell(
          'read-only',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456" readonly></mud-phone-input>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone number" disabled></mud-phone-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone number" required></mud-phone-input>`,
        ),
        cell(
          'warning',
          /*html*/ `<mud-phone-input variant="warning" size="lg" type="international" label="Phone number" value="+37362"></mud-phone-input>`,
        ),
        cell(
          'destructive',
          /*html*/ `<mud-phone-input variant="destructive" size="lg" type="international" label="Phone number"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Phone number"></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456"></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456" loading></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456" readonly></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Phone number" disabled></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Phone number" required></mud-phone-input>',
          '<mud-phone-input variant="warning" size="lg" type="international" label="Phone number" value="+37362"></mud-phone-input>',
          '<mud-phone-input variant="destructive" size="lg" type="international" label="Phone number"></mud-phone-input>',
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
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" default-country="MD" value="+37362123456"></mud-phone-input>`,
        ),
        cell(
          'Romania (RO)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" default-country="RO" value="+40721987654"></mud-phone-input>`,
        ),
        cell(
          'Ukraine (UA)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" default-country="UA" value="+380501234567"></mud-phone-input>`,
        ),
        cell(
          'Statele Unite (US)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" default-country="US" value="+12025550143"></mud-phone-input>`,
        ),
        cell(
          'Germania (DE)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" default-country="DE" value="+4915123456789"></mud-phone-input>`,
        ),
        cell(
          'Italia (IT)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" default-country="IT" value="+393311234567"></mud-phone-input>`,
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
        <span style="${cellLabelStyle}">Listbox open — every country, scrolls</span>
        <mud-phone-input id="mud-phone-input-open-fixture" type="international" size="lg" label="Phone number" open></mud-phone-input>
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
          'Open listbox lists every country (245) with its flag, name in the page language and dial code. Moldova (MD) is at the top, the home market; the rest follow in alphabetical order of the displayed name. The search field narrows the list by name, dial code or ISO code. Each flag is a file that loads when its row scrolls into view, so opening the list requests only the rows on screen.',
      },
      source: {
        code: '<mud-phone-input size="lg" type="international" label="Phone number" open></mud-phone-input>',
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
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456" loading helper-text="Checking the number…"></mud-phone-input>`,
        ),
        cell(
          'md',
          /*html*/ `<mud-phone-input size="md" type="international" label="Phone number" value="+37362123456" loading helper-text="Checking the number…"></mud-phone-input>`,
        ),
        cell(
          'local + loading',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Phone number" value="+37362123456" loading helper-text="Checking the number…"></mud-phone-input>`,
        ),
        cell(
          'success + loading',
          /*html*/ `<mud-phone-input variant="success" size="lg" type="international" label="Phone number" value="+37362123456" loading></mud-phone-input>`,
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
          '<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456" loading></mud-phone-input>',
          '<mud-phone-input size="md" type="international" label="Phone number" value="+37362123456" loading></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="Phone number" value="+37362123456" loading></mud-phone-input>',
          '<mud-phone-input variant="success" size="lg" type="international" label="Phone number" value="+37362123456" loading></mud-phone-input>',
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
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456" readonly></mud-phone-input>`,
        ),
        cell(
          'md + intl',
          /*html*/ `<mud-phone-input size="md" type="international" label="Phone number" value="+37362123456" readonly></mud-phone-input>`,
        ),
        cell(
          'lg + local',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Phone number" value="+37362123456" readonly></mud-phone-input>`,
        ),
        cell(
          'disabled (compare)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone number" value="+37362123456" disabled></mud-phone-input>`,
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
          '<mud-phone-input size="lg" type="international" label="Phone" value="+37362123456" readonly></mud-phone-input>',
          '<mud-phone-input size="md" type="international" label="Phone" value="+37362123456" readonly></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="Phone" value="+37362123456" readonly></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Phone" value="+37362123456" disabled></mud-phone-input>',
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
          /*html*/ `<mud-phone-input variant="warning" size="lg" type="international" label="Phone" value="+37362" helper-text="Check the number"></mud-phone-input>`,
        ),
        cell(
          'warning + Romanian copy',
          /*html*/ `<mud-phone-input variant="warning" size="lg" type="local" label="Phone" value="+37362" helper-text="This number has not been verified yet"></mud-phone-input>`,
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
          '<mud-phone-input variant="warning" size="lg" type="international" label="Phone" value="+37362" helper-text="Check the number"></mud-phone-input>',
          '<mud-phone-input variant="warning" size="lg" type="local" label="Phone" value="+37362" helper-text="This number has not been verified yet"></mud-phone-input>',
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
          /*html*/ `<mud-phone-input variant="success" size="lg" type="international" label="Phone" value="+37362123456" helper-text="The number is valid"></mud-phone-input>`,
        ),
        cell(
          'success + local',
          /*html*/ `<mud-phone-input variant="success" size="lg" type="local" label="Phone" value="+37362123456" helper-text="Verified"></mud-phone-input>`,
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
          '<mud-phone-input variant="success" size="lg" type="international" label="Phone" value="+37362123456" helper-text="The number is valid"></mud-phone-input>',
          '<mud-phone-input variant="success" size="lg" type="local" label="Phone" value="+37362123456" helper-text="Verified"></mud-phone-input>',
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
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" value="+37362" invalid></mud-phone-input>`,
        ),
        cell(
          'explicit destructive variant',
          /*html*/ `<mud-phone-input variant="destructive" size="lg" type="international" label="Phone" value="+37362" error-text="Format invalid" invalid></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Phone" value="+37362" invalid></mud-phone-input>',
          '<mud-phone-input variant="destructive" size="lg" type="international" label="Phone" value="+37362" error-text="Format invalid" invalid></mud-phone-input>',
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
          /*html*/ `<mud-phone-input size="lg" type="local" label="Phone number" helper-text="We will use the number for notifications only"></mud-phone-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Phone number" required helper-text="This field is required"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-phone-input size="lg" type="local" label="Phone number" helper-text="We will use the number for notifications only"></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="Phone number" required helper-text="This field is required"></mud-phone-input>',
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
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" value="+37362" invalid></mud-phone-input>`,
        ),
        cell(
          'invalid + explicit error',
          /*html*/ `<mud-phone-input variant="destructive" size="lg" type="local" label="Phone" value="+37362" invalid error-text="Format invalid"></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Default error copy. `errorText` defaults to the built-in "incomplete phone number" message of the active locale when `invalid` is set without a custom message.',
      },
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Phone" value="+37362" invalid></mud-phone-input>',
          '<mud-phone-input variant="destructive" size="lg" type="local" label="Phone" value="+37362" invalid error-text="Format invalid"></mud-phone-input>',
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
          /*html*/ `<mud-phone-input size="lg" type="local" label="Phone" value="+37362123456"></mud-phone-input>`,
        ),
        cell(
          'international (changeable)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" value="+37362123456"></mud-phone-input>`,
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
          '<mud-phone-input size="lg" type="local" label="Phone" value="+37362123456"></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Phone" value="+37362123456"></mud-phone-input>',
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
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" default-country="MD" value="+447911123456"></mud-phone-input>`,
        ),
        cell(
          'long international format (DE 11 digits)',
          /*html*/ `<mud-phone-input size="lg" type="international" label="Phone" default-country="DE" value="+4915123456789"></mud-phone-input>`,
        ),
        cell(
          'label truncation (single line)',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services"></mud-phone-input>`,
        ),
        cell(
          'assistive truncation (two lines)',
          /*html*/ `<mud-phone-input size="lg" type="local" label="Phone" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></mud-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-phone-input size="lg" type="international" label="Phone" default-country="MD" value="+447911123456"></mud-phone-input>',
          '<mud-phone-input size="lg" type="international" label="Phone" default-country="DE" value="+4915123456789"></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="…long label…"></mud-phone-input>',
          '<mud-phone-input size="lg" type="local" label="Phone" helper-text="…long helper text…"></mud-phone-input>',
        ].join('\n'),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Locales — the country-search placeholder and the localized country names of the open list
// ---------------------------------------------------------------------------
const LOCALES = ['ro-MD', 'en-US', 'ru-MD'] as const;

const localesPhoneInput = (locale: string) =>
  `<mud-phone-input locale="${locale}" size="lg" type="international" label="Phone number" open></mud-phone-input>`;

export const Locales: Story = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-24); padding: var(--spacing-24); min-height: 420px;">
      ${LOCALES.map(locale => /*html*/ `<div style="display: flex; flex-direction: column; gap: var(--spacing-8);"><span style="${cellLabelStyle}">locale="${locale}"</span>${localesPhoneInput(locale)}</div>`).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The same component under each supported locale. Only the built-in copy changes; content stays as written. This is the one place a story pins `locale` — every other story follows the Storybook toolbar.',
      },
      source: { code: LOCALES.map(localesPhoneInput).join('\n') },
    },
  },
};
