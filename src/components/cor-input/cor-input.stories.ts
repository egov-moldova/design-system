/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { InputSize, InputLabelPosition, InputType } from './cor-input.enums';

const renderInput = (args: any) => {
  const showLine = args.showLine ? 'show-line' : '';
  const disabled = args.disabled ? 'disabled' : '';
  const invalid = args.invalid ? 'invalid' : '';
  const skeleton = args.skeleton ? 'skeleton' : '';
  const required = args.required ? 'required' : '';
  const withClearButton = args.withClearButton !== false ? 'with-clear-button' : 'with-clear-button="false"';
  const inline = args.inline ? 'inline' : '';

  const leftIcon = args.leftIconName
    ? /*html*/ `<cor-icon size="sm" slot="icon-left" name="${args.leftIconName}" color="currentColor"></cor-icon>`
    : '';

  const rightIcon = args.rightIconName
    ? /*html*/ `<cor-icon size="sm" slot="icon-right" name="${args.rightIconName}" color="currentColor"></cor-icon>`
    : '';

  const helper = args.helperText ? /*html*/ `<span slot="helper-text">${args.helperText}</span>` : '';
  const wrapperStyle = args.inline ? 'display: inline-flex;' : 'width: 200px;';

  return /*html*/ `
    <div style="${wrapperStyle}">
      <cor-input
        size="${args.size}"
        label-position="${args.labelPosition}"
        ${showLine}
        ${disabled}
        ${invalid}
        ${skeleton}
        ${required}
        ${inline}
        ${withClearButton}
        ${args.labelInfo ? `label-info="${args.labelInfo}"` : ''}
        type="${args.type}"
        placeholder="${args.placeholder}"
        ${args.value ? `value="${args.value}"` : ''}
        label="${args.label}"
        name="input"
        input-id="input"
      >
        ${leftIcon}

        ${rightIcon}

        ${helper}
      </cor-input>
    </div>
  `;
};

const generateDocumentationCode = (args: any) => {
  const attributes = [];

  // Add size attribute
  attributes.push(`size="${args.size}"`);

  // Add label-position attribute
  attributes.push(`label-position="${args.labelPosition}"`);

  // Add boolean attributes
  if (args.showLine) attributes.push('show-line');
  if (args.disabled) attributes.push('disabled');
  if (args.invalid) attributes.push('invalid');
  if (args.skeleton) attributes.push('skeleton');
  if (args.required) attributes.push('required');
  if (args.inline) attributes.push('inline');

  // Add label-info if present
  if (args.labelInfo) attributes.push(`label-info="${args.labelInfo}"`);

  // Add type attribute
  attributes.push(`type="${args.type}"`);

  const attributesString = attributes.join('\n  ');

  const leftIcon = args.leftIconName
    ? `  <cor-icon size="sm" slot="icon-left" name="${args.leftIconName}" color="currentColor"></cor-icon>\n\n`
    : '';

  const rightIcon = args.rightIconName
    ? `\n\n  <cor-icon size="sm" slot="icon-right" name="${args.rightIconName}" color="currentColor"></cor-icon>`
    : '';

  const helper = args.helperText ? `\n\n  <span slot="helper-text">${args.helperText}</span>` : '';

  const valueAttr = args.value ? ` value="${args.value}"` : '';

  return /*html*/ `<cor-input
  ${attributesString}
  placeholder="${args.placeholder}"${valueAttr}
  label="${args.label}"
  name="input"
  input-id="input"
>
${leftIcon}${rightIcon}${helper}
</cor-input>`;
};

const meta: Meta = {
  title: 'Molecules/Input',
  component: 'cor-input',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(InputSize),
      description: 'Size of the input',
    },
    labelPosition: {
      control: 'select',
      options: Object.values(InputLabelPosition),
      description: 'Label position (inside or outside)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the input field',
    },
    invalid: {
      control: 'boolean',
      description: 'Indicates if the input is invalid',
    },
    skeleton: {
      control: 'boolean',
      description: 'Show skeleton loading state',
    },
    showLine: {
      control: 'boolean',
      description: 'Show separator line between content and right icon',
    },
    inline: {
      control: 'boolean',
      description: 'Inline mode - width fits visible input content',
    },
    withClearButton: {
      control: 'boolean',
      description: 'Show clear button',
    },
    type: {
      control: 'select',
      options: Object.values(InputType),
      description: 'Input type',
    },
    label: {
      control: 'text',
      description: 'Label text',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    value: {
      control: 'text',
      description: 'Input value',
    },
    helperText: {
      control: 'text',
      description: 'Helper message text',
    },
    leftIconName: {
      control: 'text',
      description: 'Left icon name (leave empty to hide)',
    },
    rightIconName: {
      control: 'text',
      description: 'Right icon name (leave empty to hide)',
    },
    required: {
      control: 'boolean',
      description: 'Indicates if the input is required (shows asterisk)',
    },
    labelInfo: {
      control: 'text',
      description: 'Info text for tooltip on info icon next to label (only for labelPosition="outside")',
    },
  },
  render: renderInput,
  parameters: {
    docs: {
      source: {
        transform: (_src: any, storyContext: any) => {
          return generateDocumentationCode(storyContext.args);
        },
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'inside',
    showLine: true,
    disabled: false,
    invalid: false,
    skeleton: false,
    required: false,
    inline: false,
    withClearButton: true,
    labelInfo: '',
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: 'System message goes here',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const DefaultFilled: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'inside',
    showLine: true,
    disabled: false,
    invalid: false,
    skeleton: false,
    withClearButton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: 'Value',
    helperText: 'System message goes here',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const SizeMd: StoryObj = {
  args: {
    size: 'md',
    labelPosition: 'outside',
    showLine: true,
    disabled: false,
    invalid: false,
    skeleton: false,
    withClearButton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: 'System message goes here',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const SizeSm: StoryObj = {
  args: {
    size: 'sm',
    labelPosition: 'outside',
    showLine: true,
    disabled: false,
    invalid: false,
    skeleton: false,
    withClearButton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: 'System message goes here',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const LabelOutside: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'outside',
    showLine: true,
    disabled: false,
    invalid: false,
    skeleton: false,
    withClearButton: true,
    required: false,
    labelInfo: '',
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: 'System message goes here',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const LabelOutsideFilled: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'outside',
    showLine: true,
    disabled: false,
    invalid: false,
    skeleton: false,
    required: false,
    labelInfo: '',
    label: 'Label',
    placeholder: 'Placeholder',
    value: 'Value',
    helperText: 'System message goes here',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const LabelOutsideRequired: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'outside',
    showLine: true,
    disabled: false,
    invalid: false,
    skeleton: false,
    required: true,
    labelInfo: 'Additional information about this field',
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: 'System message goes here',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const StateDisabled: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'inside',
    showLine: true,
    disabled: true,
    invalid: false,
    skeleton: false,
    withClearButton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: 'System message goes here',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const StateDisabledFilled: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'inside',
    showLine: true,
    disabled: true,
    invalid: false,
    skeleton: false,
    withClearButton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: 'Value',
    helperText: 'System message goes here',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const StateInvalid: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'inside',
    showLine: true,
    disabled: false,
    invalid: true,
    skeleton: false,
    withClearButton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: 'Invalid input',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const StateSkeleton: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'inside',
    showLine: false,
    disabled: false,
    invalid: false,
    skeleton: true,
    withClearButton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: '',
    leftIconName: '',
    rightIconName: '',
    type: 'text',
  },
};

export const NoIcons: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'inside',
    showLine: false,
    disabled: false,
    invalid: false,
    skeleton: false,
    withClearButton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: 'System message goes here',
    leftIconName: '',
    rightIconName: '',
    type: 'text',
  },
};

export const NoMessage: StoryObj = {
  args: {
    size: 'lg',
    labelPosition: 'inside',
    showLine: true,
    disabled: false,
    invalid: false,
    skeleton: false,
    withClearButton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    helperText: '',
    leftIconName: ICON_NAMES.SEARCH,
    rightIconName: ICON_NAMES.CHEVRON__DOWN,
    type: 'text',
  },
};

export const InlineNumeric: StoryObj = {
  args: {
    size: 'md',
    labelPosition: 'outside',
    showLine: false,
    disabled: false,
    invalid: false,
    skeleton: false,
    withClearButton: true,
    required: false,
    inline: true,
    labelInfo: '',
    label: 'Qty',
    placeholder: '',
    value: '1000',
    helperText: '',
    leftIconName: '',
    rightIconName: '',
    type: 'text',
  },
};

export const AllSizesTable: StoryObj = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 24px; align-items: center;">
      <div style="font-weight: 600;">Size</div>
      <div style="font-weight: 600;">Empty</div>
      <div style="font-weight: 600;">Filled</div>

      <div>lg</div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" show-line type="text" placeholder="Placeholder" label="Label" name="input-lg-empty" input-id="input-lg-empty">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
        </cor-input>
      </div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" show-line type="text" placeholder="Placeholder" value="Value" label="Label" name="input-lg-filled" input-id="input-lg-filled">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
        </cor-input>
      </div>

      <div>md</div>
      <div style="width: 200px;">
        <cor-input size="md" label-position="inside" show-line type="text" placeholder="Placeholder" label="Label" name="input-md-empty" input-id="input-md-empty">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
        </cor-input>
      </div>
      <div style="width: 200px;">
        <cor-input size="md" label-position="inside" show-line type="text" placeholder="Placeholder" value="Value" label="Label" name="input-md-filled" input-id="input-md-filled">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
        </cor-input>
      </div>

      <div>sm</div>
      <div style="width: 200px;">
        <cor-input size="sm" label-position="inside" show-line type="text" placeholder="Placeholder" label="Label" name="input-sm-empty" input-id="input-sm-empty">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
        </cor-input>
      </div>
      <div style="width: 200px;">
        <cor-input size="sm" label-position="inside" show-line type="text" placeholder="Placeholder" value="Value" label="Label" name="input-sm-filled" input-id="input-sm-filled">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
        </cor-input>
      </div>
    </div>
  `,
};

export const AllStatesTable: StoryObj = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 24px; align-items: center;">
      <div style="font-weight: 600;">State</div>
      <div style="font-weight: 600;">Empty</div>
      <div style="font-weight: 600;">Filled</div>

      <div>Default</div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" show-line type="text" placeholder="Placeholder" label="Label" name="input-default-empty" input-id="input-default-empty">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
          <span slot="helper-text">System message goes here</span>
        </cor-input>
      </div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" show-line type="text" placeholder="Placeholder" value="Value" label="Label" name="input-default-filled" input-id="input-default-filled">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
          <span slot="helper-text">System message goes here</span>
        </cor-input>
      </div>

      <div>Disabled</div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" show-line disabled type="text" placeholder="Placeholder" label="Label" name="input-disabled-empty" input-id="input-disabled-empty">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
          <span slot="helper-text">System message goes here</span>
        </cor-input>
      </div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" show-line disabled type="text" placeholder="Placeholder" value="Value" label="Label" name="input-disabled-filled" input-id="input-disabled-filled">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
          <span slot="helper-text">System message goes here</span>
        </cor-input>
      </div>

      <div>Invalid</div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" show-line invalid type="text" placeholder="Placeholder" label="Label" name="input-invalid-empty" input-id="input-invalid-empty">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
          <span slot="helper-text">Invalid input</span>
        </cor-input>
      </div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" show-line invalid type="text" placeholder="Placeholder" value="Value" label="Label" name="input-invalid-filled" input-id="input-invalid-filled">
          <cor-icon size="sm" slot="icon-left" name="carbon:search" color="currentColor"></cor-icon>
          <cor-icon size="sm" slot="icon-right" name="carbon:chevron--down" color="currentColor"></cor-icon>
          <span slot="helper-text">Invalid input</span>
        </cor-input>
      </div>

      <div>Skeleton</div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" skeleton type="text" placeholder="Placeholder" label="Label" name="input-skeleton-empty" input-id="input-skeleton-empty">
        </cor-input>
      </div>
      <div style="width: 200px;">
        <cor-input size="lg" label-position="inside" skeleton type="text" placeholder="Placeholder" label="Label" name="input-skeleton-filled" input-id="input-skeleton-filled">
        </cor-input>
      </div>
    </div>
  `,
};
