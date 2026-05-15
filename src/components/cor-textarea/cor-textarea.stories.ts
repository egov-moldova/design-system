/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { TextareaLabelPosition, TextareaResize } from './cor-textarea.enums';

const renderTextarea = (args: any) => {
  const disabled = args.disabled ? 'disabled' : '';
  const invalid = args.invalid ? 'invalid' : '';
  const skeleton = args.skeleton ? 'skeleton' : '';
  const required = args.required ? 'required' : '';

  const helper = args.helperText ? /*html*/ `<span slot="helper-text">${args.helperText}</span>` : '';

  return /*html*/ `
    <div style="width: 200px;">
      <cor-textarea
        label-position="${args.labelPosition}"
        resize="${args.resize}"
        ${disabled}
        ${invalid}
        ${skeleton}
        ${required}
        ${args.labelInfo ? `label-info="${args.labelInfo}"` : ''}
        label="${args.label}"
        placeholder="${args.placeholder}"
        ${args.value ? `value="${args.value}"` : ''}
        name="textarea"
        textarea-id="textarea"
        rows="${args.rows}"
      >
        ${helper}
      </cor-textarea>
    </div>
  `;
};

const generateDocumentationCode = (args: any) => {
  const attributes = [];

  attributes.push(`label-position="${args.labelPosition}"`);
  attributes.push(`resize="${args.resize}"`);

  if (args.disabled) attributes.push('disabled');
  if (args.invalid) attributes.push('invalid');
  if (args.skeleton) attributes.push('skeleton');
  if (args.required) attributes.push('required');

  if (args.labelInfo) attributes.push(`label-info="${args.labelInfo}"`);

  attributes.push(`label="${args.label}"`);
  attributes.push(`placeholder="${args.placeholder}"`);
  attributes.push(`name="textarea"`);
  attributes.push(`textarea-id="textarea"`);
  attributes.push(`rows="${args.rows}"`);

  const attributesString = attributes.join('\n  ');

  const valueAttr = args.value ? ` value="${args.value}"` : '';
  const helper = args.helperText ? `\n\n  <span slot="helper-text">${args.helperText}</span>` : '';

  return `<cor-textarea
  ${attributesString}${valueAttr}
>${helper}
</cor-textarea>`;
};

const meta: Meta = {
  title: 'Molecules/Textarea',
  component: 'cor-textarea',
  tags: ['autodocs'],
  argTypes: {
    labelPosition: {
      control: 'select',
      options: Object.values(TextareaLabelPosition),
      description: 'Label position (inside or outside)',
    },
    resize: {
      control: 'select',
      options: Object.values(TextareaResize),
      description: 'Resize behavior of the textarea',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the textarea',
    },
    invalid: {
      control: 'boolean',
      description: 'Indicates if the textarea is invalid',
    },
    skeleton: {
      control: 'boolean',
      description: 'Show skeleton loading state',
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
      description: 'Textarea value',
    },
    rows: {
      control: 'number',
      description: 'Number of visible text rows',
    },
    helperText: {
      control: 'text',
      description: 'Helper message text',
    },
    required: {
      control: 'boolean',
      description: 'Indicates if the textarea is required (shows asterisk)',
    },
    labelInfo: {
      control: 'text',
      description: 'Info text for tooltip on info icon next to label (only for labelPosition="outside")',
    },
  },
  render: renderTextarea,
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
    labelPosition: 'inside',
    resize: 'vertical',
    disabled: false,
    invalid: false,
    skeleton: false,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    rows: 4,
    helperText: 'System message goes here',
  },
};

export const DefaultFilled: StoryObj = {
  args: {
    labelPosition: 'inside',
    resize: 'vertical',
    disabled: false,
    invalid: false,
    skeleton: false,
    label: 'Label',
    placeholder: 'Placeholder',
    value: 'Value',
    rows: 4,
    helperText: 'System message goes here',
  },
};

export const LabelOutside: StoryObj = {
  args: {
    labelPosition: 'outside',
    resize: 'vertical',
    disabled: false,
    invalid: false,
    skeleton: false,
    required: false,
    labelInfo: '',
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    rows: 4,
    helperText: 'System message goes here',
  },
};

export const LabelOutsideFilled: StoryObj = {
  args: {
    labelPosition: 'outside',
    resize: 'vertical',
    disabled: false,
    invalid: false,
    skeleton: false,
    required: false,
    labelInfo: '',
    label: 'Label',
    placeholder: 'Placeholder',
    value: 'Value',
    rows: 4,
    helperText: 'System message goes here',
  },
};

export const LabelOutsideRequired: StoryObj = {
  args: {
    labelPosition: 'outside',
    resize: 'vertical',
    disabled: false,
    invalid: false,
    skeleton: false,
    required: true,
    labelInfo: 'Additional information about this field',
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    rows: 4,
    helperText: 'System message goes here',
  },
};

export const StateDisabled: StoryObj = {
  args: {
    labelPosition: 'inside',
    resize: 'vertical',
    disabled: true,
    invalid: false,
    skeleton: false,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    rows: 4,
    helperText: 'System message goes here',
  },
};

export const StateDisabledFilled: StoryObj = {
  args: {
    labelPosition: 'inside',
    resize: 'vertical',
    disabled: true,
    invalid: false,
    skeleton: false,
    label: 'Label',
    placeholder: 'Placeholder',
    value: 'Value',
    rows: 4,
    helperText: 'System message goes here',
  },
};

export const StateInvalid: StoryObj = {
  args: {
    labelPosition: 'inside',
    resize: 'vertical',
    disabled: false,
    invalid: true,
    skeleton: false,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    rows: 4,
    helperText: 'Invalid input',
  },
};

export const StateSkeleton: StoryObj = {
  args: {
    labelPosition: 'inside',
    resize: 'vertical',
    disabled: false,
    invalid: false,
    skeleton: true,
    label: 'Label',
    placeholder: 'Placeholder',
    value: '',
    rows: 4,
    helperText: '',
  },
};

export const AllStatesTable: StoryObj = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 24px; align-items: start;">
      <div style="font-weight: 600;">State</div>
      <div style="font-weight: 600;">Empty</div>
      <div style="font-weight: 600;">Filled</div>

      <div>Default</div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" label="Label" placeholder="Placeholder" name="ta-default-empty" textarea-id="ta-default-empty" rows="4">
          <span slot="helper-text">System message goes here</span>
        </cor-textarea>
      </div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" label="Label" placeholder="Placeholder" value="Value" name="ta-default-filled" textarea-id="ta-default-filled" rows="4">
          <span slot="helper-text">System message goes here</span>
        </cor-textarea>
      </div>

      <div>Disabled</div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" disabled label="Label" placeholder="Placeholder" name="ta-disabled-empty" textarea-id="ta-disabled-empty" rows="4">
          <span slot="helper-text">System message goes here</span>
        </cor-textarea>
      </div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" disabled label="Label" placeholder="Placeholder" value="Value" name="ta-disabled-filled" textarea-id="ta-disabled-filled" rows="4">
          <span slot="helper-text">System message goes here</span>
        </cor-textarea>
      </div>

      <div>Invalid</div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" invalid label="Label" placeholder="Placeholder" name="ta-invalid-empty" textarea-id="ta-invalid-empty" rows="4">
          <span slot="helper-text">Invalid input</span>
        </cor-textarea>
      </div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" invalid label="Label" placeholder="Placeholder" value="Value" name="ta-invalid-filled" textarea-id="ta-invalid-filled" rows="4">
          <span slot="helper-text">Invalid input</span>
        </cor-textarea>
      </div>

      <div>Skeleton</div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" skeleton label="Label" placeholder="Placeholder" name="ta-skeleton-empty" textarea-id="ta-skeleton-empty" rows="4">
        </cor-textarea>
      </div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" skeleton label="Label" placeholder="Placeholder" name="ta-skeleton-filled" textarea-id="ta-skeleton-filled" rows="4">
        </cor-textarea>
      </div>
    </div>
  `,
};

export const AllLabelPositionsTable: StoryObj = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 24px; align-items: start;">
      <div style="font-weight: 600;">Label Position</div>
      <div style="font-weight: 600;">Default</div>
      <div style="font-weight: 600;">Filled</div>

      <div>Label Inside</div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" label="Label" placeholder="Placeholder" name="ta-inside-empty" textarea-id="ta-inside-empty" rows="4">
          <span slot="helper-text">System message goes here</span>
        </cor-textarea>
      </div>
      <div style="width: 200px;">
        <cor-textarea label-position="inside" label="Label" placeholder="Placeholder" value="Value" name="ta-inside-filled" textarea-id="ta-inside-filled" rows="4">
          <span slot="helper-text">System message goes here</span>
        </cor-textarea>
      </div>

      <div>Label Outside</div>
      <div style="width: 200px;">
        <cor-textarea label-position="outside" label="Label" placeholder="Placeholder" name="ta-outside-empty" textarea-id="ta-outside-empty" rows="4">
          <span slot="helper-text">System message goes here</span>
        </cor-textarea>
      </div>
      <div style="width: 200px;">
        <cor-textarea label-position="outside" label="Label" placeholder="Placeholder" value="Value" name="ta-outside-filled" textarea-id="ta-outside-filled" rows="4">
          <span slot="helper-text">System message goes here</span>
        </cor-textarea>
      </div>
    </div>
  `,
};
