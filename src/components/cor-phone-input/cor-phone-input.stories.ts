import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { PHONE_INPUT_SIZES, PHONE_INPUT_VARIANTS } from './cor-phone-input.types';
import type { PhoneInputSize, PhoneInputVariant } from './cor-phone-input.types';

type PhoneInputArgs = {
  variant: PhoneInputVariant;
  size: PhoneInputSize;
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
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderPhoneInput = (args: PhoneInputArgs) => /*html*/ `
  <cor-phone-input
    variant="${args.variant}"
    size="${args.size}"
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
  ></cor-phone-input>
`;

const docsSourceDefault = (args: PhoneInputArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
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
  ]
    .filter(Boolean)
    .join(' ');
  return `<cor-phone-input ${attrs}></cor-phone-input>`;
};

const meta: Meta<PhoneInputArgs> = {
  title: 'Atoms/Input/Phone',
  component: 'cor-phone-input',
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
  },
};

export default meta;

type Story = StoryObj<PhoneInputArgs>;

export const Default: Story = {
  render: renderPhoneInput,
  args: {
    variant: 'default',
    size: 'lg',
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

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const AllVariants: Story = {
  name: 'All Variants',
  render: () =>
    wrap(
      PHONE_INPUT_VARIANTS.map(variant =>
        cell(
          variant,
          /*html*/ `<cor-phone-input variant="${variant}" size="lg" label="Număr de telefon"></cor-phone-input>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: PHONE_INPUT_VARIANTS.map(
          v => `<cor-phone-input variant="${v}" size="lg" label="Număr de telefon"></cor-phone-input>`,
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
        cell(size, /*html*/ `<cor-phone-input size="${size}" label="Număr de telefon"></cor-phone-input>`),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: PHONE_INPUT_SIZES.map(
          s => `<cor-phone-input size="${s}" label="Număr de telefon"></cor-phone-input>`,
        ).join('\n'),
      },
    },
  },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell('default: default', /*html*/ `<cor-phone-input size="lg" label="Număr de telefon"></cor-phone-input>`),
        cell(
          'default: filled',
          /*html*/ `<cor-phone-input size="lg" label="Număr de telefon" value="+37362123456"></cor-phone-input>`,
        ),
        cell(
          'default: disabled',
          /*html*/ `<cor-phone-input size="lg" label="Număr de telefon" disabled></cor-phone-input>`,
        ),
        cell(
          'default: readonly',
          /*html*/ `<cor-phone-input size="lg" label="Număr de telefon" value="+37362123456" readonly></cor-phone-input>`,
        ),
        cell(
          'default: mandatory',
          /*html*/ `<cor-phone-input size="lg" label="Număr de telefon" required></cor-phone-input>`,
        ),
        cell(
          'destructive: default',
          /*html*/ `<cor-phone-input variant="destructive" size="lg" label="Număr de telefon"></cor-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-phone-input size="lg" label="Număr de telefon"></cor-phone-input>',
          '<cor-phone-input size="lg" label="Număr de telefon" value="+37362123456"></cor-phone-input>',
          '<cor-phone-input size="lg" label="Număr de telefon" disabled></cor-phone-input>',
          '<cor-phone-input size="lg" label="Număr de telefon" value="+37362123456" readonly></cor-phone-input>',
          '<cor-phone-input size="lg" label="Număr de telefon" required></cor-phone-input>',
          '<cor-phone-input variant="destructive" size="lg" label="Număr de telefon"></cor-phone-input>',
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
          /*html*/ `<cor-phone-input size="lg" label="Telefon"  default-country="MD" value="+37362123456"></cor-phone-input>`,
        ),
        cell(
          'România (RO)',
          /*html*/ `<cor-phone-input size="lg" label="Telefon" default-country="RO" value="+40721987654"></cor-phone-input>`,
        ),
        cell(
          'Ucraina (UA)',
          /*html*/ `<cor-phone-input size="lg" label="Telefon" default-country="UA" value="+380501234567"></cor-phone-input>`,
        ),
        cell(
          'Statele Unite (US)',
          /*html*/ `<cor-phone-input size="lg" label="Telefon" default-country="US" value="+12025550143"></cor-phone-input>`,
        ),
        cell(
          'Germania (DE)',
          /*html*/ `<cor-phone-input size="lg" label="Telefon" default-country="DE" value="+4915123456789"></cor-phone-input>`,
        ),
        cell(
          'Italia (IT)',
          /*html*/ `<cor-phone-input size="lg" label="Telefon" default-country="IT" value="+393311234567"></cor-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Per-country mask preview. The local segment is reformatted whenever a different country is picked; the dial code on the trigger is the only durable signal of the country.',
      },
      source: {
        code: [
          '<cor-phone-input default-country="MD" value="+37362123456"></cor-phone-input>',
          '<cor-phone-input default-country="RO" value="+40721987654"></cor-phone-input>',
          '<cor-phone-input default-country="UA" value="+380501234567"></cor-phone-input>',
          '<cor-phone-input default-country="US" value="+12025550143"></cor-phone-input>',
          '<cor-phone-input default-country="DE" value="+4915123456789"></cor-phone-input>',
          '<cor-phone-input default-country="IT" value="+393311234567"></cor-phone-input>',
        ].join('\n'),
      },
    },
  },
};

export const OpenDropdown: Story = {
  name: 'Open Dropdown',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); display: flex; gap: var(--spacing-48); align-items: flex-start; min-height: 440px;">
      <div style="display: flex; flex-direction: column; gap: var(--spacing-8); width: 320px;">
        <span style="${cellLabelStyle}">Listbox open (default-country MD)</span>
        <cor-phone-input id="cor-phone-input-open-fixture" size="lg" label="Număr de telefon" open></cor-phone-input>
      </div>
    </div>
    <script>
      requestAnimationFrame(() => {
        const el = document.getElementById('cor-phone-input-open-fixture');
        if (el && !el.hasAttribute('open')) el.setAttribute('open', '');
      });
    </script>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The country listbox surfaces Moldova at the top, followed by the curated diaspora list (RO, RU, UA, US, GB, DE, FR, IT, ES, PT, IL, TR, BG, GR). Each row pairs the Romanian country name with its E.164 dial code.',
      },
      source: {
        code: '<cor-phone-input size="lg" label="Număr de telefon" open></cor-phone-input>',
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
          /*html*/ `<cor-phone-input size="lg" label="Telefon" value="+37362" invalid></cor-phone-input>`,
        ),
        cell(
          'explicit destructive variant',
          /*html*/ `<cor-phone-input variant="destructive" size="lg" label="Telefon" value="+37362" error-text="Format invalid" invalid></cor-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-phone-input size="lg" label="Telefon" value="+37362" invalid></cor-phone-input>',
          '<cor-phone-input variant="destructive" size="lg" label="Telefon" value="+37362" error-text="Format invalid" invalid></cor-phone-input>',
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
          /*html*/ `<cor-phone-input size="lg" label="Număr de telefon" helper-text="Vom folosi numărul doar pentru notificări"></cor-phone-input>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<cor-phone-input size="lg" label="Număr de telefon" required helper-text="Câmp obligatoriu"></cor-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-phone-input size="lg" label="Număr de telefon" helper-text="Vom folosi numărul doar pentru notificări"></cor-phone-input>',
          '<cor-phone-input size="lg" label="Număr de telefon" required helper-text="Câmp obligatoriu"></cor-phone-input>',
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
          'invalid + Romanian message',
          /*html*/ `<cor-phone-input size="lg" label="Telefon" value="+37362" invalid error-text="Numărul de telefon este incomplet"></cor-phone-input>`,
        ),
        cell(
          'invalid + explicit destructive',
          /*html*/ `<cor-phone-input variant="destructive" size="lg" label="Telefon" value="+37362" invalid error-text="Format invalid"></cor-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Romanian-voice error copy. `errorText` defaults to "Numărul de telefon este incomplet" when `invalid` is set without a custom message — override via the prop for non-Romanian consumers.',
      },
      source: {
        code: [
          '<cor-phone-input size="lg" label="Telefon" value="+37362" invalid error-text="Numărul de telefon este incomplet"></cor-phone-input>',
          '<cor-phone-input variant="destructive" size="lg" label="Telefon" value="+37362" invalid error-text="Format invalid"></cor-phone-input>',
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
          /*html*/ `<cor-phone-input size="lg" label="Telefon" default-country="MD" value="+447911123456"></cor-phone-input>`,
        ),
        cell(
          'long international format (DE 11 digits)',
          /*html*/ `<cor-phone-input size="lg" label="Telefon" default-country="DE" value="+4915123456789"></cor-phone-input>`,
        ),
        cell(
          'label truncation (single line)',
          /*html*/ `<cor-phone-input size="lg" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services"></cor-phone-input>`,
        ),
        cell(
          'assistive truncation (two lines)',
          /*html*/ `<cor-phone-input size="lg" label="Telefon" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient, and accessible online services that respect their time."></cor-phone-input>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<cor-phone-input size="lg" label="Telefon" default-country="MD" value="+447911123456"></cor-phone-input>',
          '<cor-phone-input size="lg" label="Telefon" default-country="DE" value="+4915123456789"></cor-phone-input>',
          '<cor-phone-input size="lg" label="…long label…"></cor-phone-input>',
          '<cor-phone-input size="lg" label="Telefon" helper-text="…long helper text…"></cor-phone-input>',
        ].join('\n'),
      },
    },
  },
};
