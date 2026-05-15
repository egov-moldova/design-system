/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { SystemMessageState } from './cor-system-message.enums';

const meta: Meta = {
  title: 'Atoms/System Message',
  component: 'cor-system-message',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Lightweight inline message for forms and content areas. Mirrors the helper-text pattern from `cor-input`. No dismiss, no elevation, no accent bar.',
      },
    },
  },
  argTypes: {
    state: {
      control: 'select',
      options: Object.values(SystemMessageState),
      description: 'Controls icon and text colour.',
      table: {
        defaultValue: { summary: SystemMessageState.INFO },
      },
    },
    message: {
      control: 'text',
      description: 'Message text content passed into the default slot.',
    },
  },
};

export default meta;
type Story = StoryObj;

const renderComponent = (args: any) => /*html*/ `
  <cor-system-message state="${args.state}">
    <span>${args.message ?? 'System message text'}</span>
  </cor-system-message>
`;

export const Default: Story = {
  args: {
    state: SystemMessageState.INFO,
    message: 'This field is required.',
  },
  render: (args: any) => renderComponent(args),
};

export const Alert: Story = {
  args: {
    state: SystemMessageState.ALERT,
    message: 'This value is invalid. Please enter a valid email address.',
  },
  render: (args: any) => renderComponent(args),
};

export const Info: Story = {
  args: {
    state: SystemMessageState.INFO,
    message: 'Password must be at least 8 characters.',
  },
  render: (args: any) => renderComponent(args),
};

export const Text: Story = {
  args: {
    state: SystemMessageState.TEXT,
    message: 'Optional field — leave blank if not applicable.',
  },
  render: (args: any) => renderComponent(args),
};

export const AllStates: Story = {
  args: {},
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 16px;">
      <h3 style="margin: 0; font-size: 14px; font-weight: 600; text-transform: capitalize;">Alert</h3>
      <cor-system-message state="${SystemMessageState.ALERT}">
        <span>Invalid email address.</span>
      </cor-system-message>

      <h3 style="margin: 24px 0 0 0; font-size: 14px; font-weight: 600; text-transform: capitalize;">Info</h3>
      <cor-system-message state="${SystemMessageState.INFO}">
        <span>Password must be at least 8 characters.</span>
      </cor-system-message>

      <h3 style="margin: 24px 0 0 0; font-size: 14px; font-weight: 600; text-transform: capitalize;">Text</h3>
      <cor-system-message state="${SystemMessageState.TEXT}">
        <span>Optional — leave blank if not applicable.</span>
      </cor-system-message>
    </div>
  `,
  parameters: {
    controls: {
      disable: true,
    },
  },
};
