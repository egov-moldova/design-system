/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { LabelSize, LabelState } from './cor-label.enums';

const renderLabel = (args: any) => {
  const helperText = args.helperText ? /*html*/ `<span slot="helper-text">${args.helperText}</span>` : '';
  const showIcon = args.showIcon !== undefined ? (args.showIcon ? 'show-icon' : '') : '';

  return /*html*/ `
    <cor-label size="${args.size}" state="${args.state}" ${showIcon}>
      ${args.text}
      ${helperText}
    </cor-label>
  `;
};

const meta: Meta = {
  title: 'Atoms/Label',
  component: 'cor-label',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(LabelSize),
      description: 'Size of the label',
    },
    state: {
      control: 'select',
      options: Object.values(LabelState),
      description: 'State of the label',
    },
    text: {
      control: 'text',
      description: 'Label text content',
    },
    helperText: {
      control: 'text',
      description: 'Optional helper text',
    },
    showIcon: {
      control: 'boolean',
      description: 'Show icon in helper text',
    },
  },
  render: renderLabel,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    size: LabelSize.MD,
    state: LabelState.DEFAULT,
    text: 'Label',
    helperText: '',
  },
};

export const WithHelperText: Story = {
  args: {
    size: LabelSize.MD,
    state: LabelState.DEFAULT,
    text: 'Label',
    helperText: 'Helper text',
  },
};

export const StateHover: Story = {
  args: {
    size: LabelSize.MD,
    state: LabelState.HOVER,
    text: 'Label',
    helperText: '',
  },
};

export const StateActive: Story = {
  args: {
    size: LabelSize.MD,
    state: LabelState.ACTIVE,
    text: 'Label',
    helperText: '',
  },
};

export const StateDisabled: Story = {
  args: {
    size: LabelSize.MD,
    state: LabelState.DISABLED,
    text: 'Label',
    helperText: '',
  },
};

export const StateError: Story = {
  args: {
    size: LabelSize.MD,
    state: LabelState.ERROR,
    text: 'Label',
    helperText: '',
  },
};

export const StateErrorWithHelper: Story = {
  args: {
    size: LabelSize.MD,
    state: LabelState.ERROR,
    text: 'Label',
    helperText: 'Error message',
    showIcon: true,
  },
};

export const WithHelperTextAndIcon: Story = {
  args: {
    size: LabelSize.MD,
    state: LabelState.DEFAULT,
    text: 'Label',
    helperText: 'Helper text with icon',
    showIcon: true,
  },
};

export const SizeSmall: Story = {
  args: {
    size: LabelSize.SM,
    state: LabelState.DEFAULT,
    text: 'Label',
    helperText: '',
  },
};

export const AllSizes: Story = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 24px; align-items: start;">
      <div style="font-weight: 600;">Size</div>
      <div style="font-weight: 600;">Without Helper</div>
      <div style="font-weight: 600;">With Helper</div>

      <div>md</div>
      <div>
        <cor-label size="md" state="default">Label</cor-label>
      </div>
      <div>
        <cor-label size="md" state="default">
          Label
          <span slot="helper-text">Helper text</span>
        </cor-label>
      </div>

      <div>sm</div>
      <div>
        <cor-label size="sm" state="default">Label</cor-label>
      </div>
      <div>
        <cor-label size="sm" state="default">
          Label
          <span slot="helper-text">Helper text</span>
        </cor-label>
      </div>
    </div>
  `,
};

export const AllStates: Story = {
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr; gap: 24px; align-items: start;">
      <div style="font-weight: 600;">State</div>
      <div style="font-weight: 600;">Without Helper</div>
      <div style="font-weight: 600;">With Helper</div>

      <div>default</div>
      <div>
        <cor-label size="md" state="default">Label</cor-label>
      </div>
      <div>
        <cor-label size="md" state="default">
          Label
          <span slot="helper-text">Helper text</span>
        </cor-label>
      </div>

      <div>hover</div>
      <div>
        <cor-label size="md" state="hover">Label</cor-label>
      </div>
      <div>
        <cor-label size="md" state="hover">
          Label
          <span slot="helper-text">Helper text</span>
        </cor-label>
      </div>

      <div>active</div>
      <div>
        <cor-label size="md" state="active">Label</cor-label>
      </div>
      <div>
        <cor-label size="md" state="active">
          Label
          <span slot="helper-text">Helper text</span>
        </cor-label>
      </div>

      <div>disabled</div>
      <div>
        <cor-label size="md" state="disabled">Label</cor-label>
      </div>
      <div>
        <cor-label size="md" state="disabled">
          Label
          <span slot="helper-text">Helper text</span>
        </cor-label>
      </div>

      <div>error</div>
      <div>
        <cor-label size="md" state="error">Label</cor-label>
      </div>
      <div>
        <cor-label size="md" state="error">
          Label
          <span slot="helper-text">Error message</span>
        </cor-label>
      </div>
    </div>
  `,
};
