import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TEXTAREA_RESIZE, TEXTAREA_SIZES, TEXTAREA_VARIANTS } from './mud-textarea.types';
import type { TextareaResize, TextareaSize, TextareaVariant } from './mud-textarea.types';

type TextareaArgs = {
  variant: TextareaVariant;
  size: TextareaSize;
  resize: TextareaResize;
  label: string;
  placeholder: string;
  value: string;
  helperText: string;
  errorText: string;
  rows: number;
  maxLength: number;
  showCounter: boolean;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  locale: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const renderTextarea = (args: TextareaArgs) => /*html*/ `
  <mud-textarea
    variant="${args.variant}"
    size="${args.size}"
    resize="${args.resize}"
    label="${args.label}"
    placeholder="${args.placeholder}"
    value="${args.value}"
    helper-text="${args.helperText}"
    error-text="${args.errorText}"
    rows="${args.rows}"
    ${typeof args.maxLength === 'number' && args.maxLength > 0 ? `maxlength="${args.maxLength}"` : ''}
    ${args.showCounter ? '' : 'show-counter="false"'}
    ${args.required ? 'required' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.readonly ? 'readonly' : ''}
    ${args.invalid ? 'invalid' : ''}
    ${args.locale ? `locale="${args.locale}"` : ''}
  ></mud-textarea>
`;

const docsSourceDefault = (args: TextareaArgs) => {
  const attrs = [
    args.variant !== 'default' ? `variant="${args.variant}"` : '',
    args.size !== 'md' ? `size="${args.size}"` : '',
    args.resize !== 'vertical' ? `resize="${args.resize}"` : '',
    args.label ? `label="${args.label}"` : '',
    args.placeholder ? `placeholder="${args.placeholder}"` : '',
    args.value ? `value="${args.value}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.errorText ? `error-text="${args.errorText}"` : '',
    args.rows && args.rows !== 4 ? `rows="${args.rows}"` : '',
    typeof args.maxLength === 'number' && args.maxLength > 0 ? `maxlength="${args.maxLength}"` : '',
    args.showCounter ? '' : 'show-counter="false"',
    args.required ? 'required' : '',
    args.disabled ? 'disabled' : '',
    args.readonly ? 'readonly' : '',
    args.invalid ? 'invalid' : '',
    args.locale ? `locale="${args.locale}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-textarea ${attrs}></mud-textarea>`;
};

const meta: Meta<TextareaArgs> = {
  title: 'Components/Input/Textarea',
  component: 'mud-textarea',
  argTypes: {
    variant: {
      control: 'select',
      options: TEXTAREA_VARIANTS,
      description: 'Color treatment. `destructive` is forced when `invalid` is set.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: TEXTAREA_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    resize: {
      control: 'select',
      options: TEXTAREA_RESIZE,
      description: 'Vertical resize affordance.',
      table: { defaultValue: { summary: 'vertical' } },
    },
    label: { control: 'text', description: 'Plain-text label.' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    helperText: { control: 'text' },
    errorText: { control: 'text' },
    rows: { control: { type: 'number', min: 1, max: 20 } },
    maxLength: { control: { type: 'number', min: 0, max: 2000 } },
    showCounter: { control: 'boolean' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    locale: {
      control: 'select',
      options: ['', 'ro-MD', 'en-US', 'ru-MD'],
      description: 'Language of the built-in copy. Unset follows the closest ancestor `lang`, else `ro-MD`.',
    },
  },
};

export default meta;

type Story = StoryObj<TextareaArgs>;

export const Default: Story = {
  render: renderTextarea,
  args: {
    variant: 'default',
    size: 'lg',
    resize: 'vertical',
    label: 'Description',
    placeholder: 'Add a description…',
    value: '',
    helperText: '',
    errorText: '',
    rows: 4,
    maxLength: 0,
    showCounter: true,
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
    locale: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: TextareaArgs }) => docsSourceDefault(args),
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 384px)); gap: var(--spacing-32) var(--spacing-48); padding: var(--spacing-24); max-width: 920px;">
    ${children}
  </div>
`;

const wrapWide = (children: string) => /*html*/ `
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 240px)); gap: var(--spacing-32) var(--spacing-24); padding: var(--spacing-24); max-width: 1120px;">
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
    wrapWide(
      TEXTAREA_VARIANTS.map(variant =>
        cell(
          variant,
          /*html*/ `<mud-textarea variant="${variant}" size="lg" label="Description" placeholder="Add a description…"></mud-textarea>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TEXTAREA_VARIANTS.map(
          v =>
            `<mud-textarea variant="${v}" size="lg" label="Description" placeholder="Add a description…"></mud-textarea>`,
        ).join('\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () =>
    wrap(
      TEXTAREA_SIZES.map(size =>
        cell(
          size,
          /*html*/ `<mud-textarea size="${size}" label="Description" placeholder="Add a description…"></mud-textarea>`,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: TEXTAREA_SIZES.map(
          s => `<mud-textarea size="${s}" label="Description" placeholder="Add a description…"></mud-textarea>`,
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
        cell(
          'default',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…"></mud-textarea>`,
        ),
        cell(
          'hover (use mouse)',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…"></mud-textarea>`,
        ),
        cell(
          'focus (use Tab)',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…"></mud-textarea>`,
        ),
        cell(
          'filled',
          /*html*/ `<mud-textarea size="lg" label="Description" value="The fix no longer works correctly after the latest update."></mud-textarea>`,
        ),
        cell(
          'read-only',
          /*html*/ `<mud-textarea size="lg" label="Description" value="This content is read-only." readonly></mud-textarea>`,
        ),
        cell(
          'disabled',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…" disabled></mud-textarea>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…" required></mud-textarea>`,
        ),
        cell(
          'destructive',
          /*html*/ `<mud-textarea size="lg" variant="destructive" label="Description" placeholder="Add a description…" invalid error-text="This field is required"></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Description" placeholder="Add a description…"></mud-textarea>',
          '<mud-textarea size="lg" label="Description" value="…" readonly></mud-textarea>',
          '<mud-textarea size="lg" label="Description" disabled></mud-textarea>',
          '<mud-textarea size="lg" label="Description" required></mud-textarea>',
          '<mud-textarea size="lg" variant="destructive" label="Description" invalid error-text="This field is required"></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const WithLabel: Story = {
  name: 'With Label',
  render: () =>
    wrap(
      [
        cell(
          'plain label',
          /*html*/ `<mud-textarea size="lg" label="Reason for the request" placeholder="Describe the reason…"></mud-textarea>`,
        ),
        cell(
          'label slot (rich)',
          /*html*/ `<mud-textarea size="lg" placeholder="Add a description…">
            <span slot="label">Comments <strong>(optional)</strong></span>
          </mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Reason for the request" placeholder="Describe the reason…"></mud-textarea>',
          '<mud-textarea size="lg" placeholder="…"><span slot="label">Comments <strong>(optional)</strong></span></mud-textarea>',
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
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…" helper-text="At most 500 characters, no personal data."></mud-textarea>`,
        ),
        cell(
          'mandatory',
          /*html*/ `<mud-textarea size="lg" label="Reason for the request" placeholder="Describe the reason…" helper-text="This field is required to continue." required></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Description" helper-text="At most 500 characters, no personal data."></mud-textarea>',
          '<mud-textarea size="lg" label="Reason for the request" helper-text="This field is required to continue." required></mud-textarea>',
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
          'invalid + error',
          /*html*/ `<mud-textarea size="lg" label="Comments" value="ok" invalid error-text="The message must contain at least 20 characters."></mud-textarea>`,
        ),
        cell(
          'explicit destructive',
          /*html*/ `<mud-textarea size="lg" variant="destructive" label="Description" placeholder="Add a description…" error-text="This field is required" invalid></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Comments" value="ok" invalid error-text="The message must contain at least 20 characters."></mud-textarea>',
          '<mud-textarea size="lg" variant="destructive" label="Description" placeholder="…" error-text="This field is required" invalid></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const WithCharacterCounter: Story = {
  name: 'With Character Counter',
  render: () =>
    wrap(
      [
        cell(
          'default + counter',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…" maxlength="500"></mud-textarea>`,
        ),
        cell(
          'with helper + counter',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…" helper-text="At most 500 characters." maxlength="500"></mud-textarea>`,
        ),
        cell(
          'near limit',
          /*html*/ `<mud-textarea size="lg" label="Comments" value="This is a comment that is close to the maximum length allowed for this field." maxlength="100"></mud-textarea>`,
        ),
        cell(
          'over limit',
          /*html*/ `<mud-textarea size="lg" label="Comments" value="This is a comment far too long that exceeds the maximum length allowed for this field and should show a visual warning." maxlength="50" invalid error-text="The message exceeds the allowed limit."></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Description" placeholder="…" maxlength="500"></mud-textarea>',
          '<mud-textarea size="lg" label="Description" helper-text="…" maxlength="500"></mud-textarea>',
          '<mud-textarea size="lg" label="Comments" value="…" maxlength="100"></mud-textarea>',
          '<mud-textarea size="lg" label="Comments" value="…" maxlength="50" invalid error-text="The message exceeds the allowed limit."></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const Mandatory: Story = {
  name: 'Mandatory',
  render: () =>
    wrap(
      [
        cell(
          'mandatory (lg)',
          /*html*/ `<mud-textarea size="lg" label="Reason for the request" placeholder="Describe the reason…" required></mud-textarea>`,
        ),
        cell(
          'mandatory + helper',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…" helper-text="This field cannot stay empty." required></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Reason for the request" required></mud-textarea>',
          '<mud-textarea size="lg" label="Description" helper-text="This field cannot stay empty." required></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const Readonly: Story = {
  name: 'Read-Only',
  render: () =>
    wrap(
      [
        cell(
          'read-only (lg)',
          /*html*/ `<mud-textarea size="lg" label="Comments" value="This content is read-only and cannot be modified." readonly helper-text="Read-only field."></mud-textarea>`,
        ),
        cell(
          'disabled (for comparison)',
          /*html*/ `<mud-textarea size="lg" label="Comments" value="This content is disabled and inaccessible." disabled helper-text="Disabled field."></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Comments" value="…" readonly helper-text="Read-only field."></mud-textarea>',
          '<mud-textarea size="lg" label="Comments" value="…" disabled helper-text="Disabled field."></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () =>
    wrap(
      [
        cell(
          'disabled empty',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…" disabled></mud-textarea>`,
        ),
        cell(
          'disabled filled',
          /*html*/ `<mud-textarea size="lg" label="Comments" value="Existing content that can no longer be edited." disabled></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="Description" placeholder="…" disabled></mud-textarea>',
          '<mud-textarea size="lg" label="Comments" value="…" disabled></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};

export const NoResize: Story = {
  name: 'No Resize',
  render: () =>
    wrap(
      [
        cell(
          'resize="none"',
          /*html*/ `<mud-textarea size="lg" resize="none" label="Description" placeholder="Add a description…"></mud-textarea>`,
        ),
        cell(
          'resize="none" + filled',
          /*html*/ `<mud-textarea size="lg" resize="none" label="Comments" value="This field has a fixed size and cannot be resized by the user."></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" resize="none" label="Description" placeholder="…"></mud-textarea>',
          '<mud-textarea size="lg" resize="none" label="Comments" value="…"></mud-textarea>',
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
          'label truncation (single line)',
          /*html*/ `<mud-textarea size="lg" label="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient and accessible services." placeholder="Add a description…"></mud-textarea>`,
        ),
        cell(
          'helper truncation (two lines)',
          /*html*/ `<mud-textarea size="lg" label="Description" placeholder="Add a description…" helper-text="Moldova's digital evolution is at the heart of seamless public service delivery, providing every resident with secure, efficient and accessible online access."></mud-textarea>`,
        ),
        cell(
          'very long content (scroll)',
          /*html*/ `<mud-textarea size="lg" label="Comments" value="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."></mud-textarea>`,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: [
          '<mud-textarea size="lg" label="…long label…" placeholder="…"></mud-textarea>',
          '<mud-textarea size="lg" label="Description" helper-text="…long helper…"></mud-textarea>',
          '<mud-textarea size="lg" label="Comments" value="…long content…"></mud-textarea>',
        ].join('\n'),
      },
    },
  },
};
