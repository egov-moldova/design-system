/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { NotificationState } from './cor-banner-notification.enums';

const meta: Meta = {
  title: 'Molecules/Banner Notification',
  component: 'cor-banner-notification',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Full-width persistent banner. Dark inverse surface. Typically placed at the top of a page or section. No elevation, no auto-dismiss.',
      },
    },
    layout: 'fullscreen',
  },
  argTypes: {
    state: {
      control: 'select',
      options: [NotificationState.INFO, NotificationState.SUCCESS, NotificationState.WARNING, NotificationState.ERROR],
      description: 'Semantic state controlling icon, accent colour, background, and title colour.',
      table: {
        defaultValue: { summary: NotificationState.INFO },
      },
    },
    dismissible: {
      control: 'boolean',
      description: 'When true, renders a dismiss button.',
      table: { defaultValue: { summary: 'true' } },
    },
  },
};

export default meta;
type Story = StoryObj;

const renderComponent = (args: any) => /*html*/ `
  <div style="width: 100%;">
    <cor-banner-notification
      state="${args.state}"
      dismissible="${args.dismissible}"
    >
      <span slot="title">${args.title ?? 'Banner notification message'}</span>
    </cor-banner-notification>
  </div>
`;

export const Default: Story = {
  args: {
    state: NotificationState.INFO,
    dismissible: true,
    title: 'Scheduled maintenance on Sunday at 02:00 UTC.',
  },
  render: (args: any) => renderComponent(args),
};

export const AllStates: Story = {
  argTypes: {
    state: {
      control: false,
    },
  },
  args: { dismissible: true },
  render: args => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; width: 100%; box-sizing: border-box;">
      <cor-banner-notification
        state="${NotificationState.ERROR}"
        dismissible="${args.dismissible}"
      >
        <span slot="title">Error — something went wrong. Please try again.</span>
      </cor-banner-notification>

      <cor-banner-notification
        state="${NotificationState.WARNING}"
        dismissible="${args.dismissible}"
      >
        <span slot="title">Warning — your subscription expires in 3 days.</span>
      </cor-banner-notification>

      <cor-banner-notification
        state="${NotificationState.SUCCESS}"
        dismissible="${args.dismissible}"
      >
        <span slot="title">Success — changes saved successfully.</span>
      </cor-banner-notification>

      <cor-banner-notification
        state="${NotificationState.INFO}"
        dismissible="${args.dismissible}"
      >
        <span slot="title">Info — scheduled maintenance on Sunday at 02:00 UTC.</span>
      </cor-banner-notification>

    </div>
  `,
};
