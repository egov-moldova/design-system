/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { NotificationState } from './cor-inline-notification.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

const meta: Meta = {
  title: 'Molecules/Inline Notification',
  component: 'cor-inline-notification',
  tags: ['autodocs'],
  argTypes: {
    'state': {
      control: 'select',
      options: [NotificationState.INFO, NotificationState.SUCCESS, NotificationState.WARNING, NotificationState.ERROR],
      description: 'Semantic state controlling icon, accent colour, background, and title colour.',
      table: {
        defaultValue: { summary: NotificationState.INFO },
      },
    },
    'dismissible': {
      control: 'boolean',
      description: 'When true, renders a dismiss button.',
      table: { defaultValue: { summary: 'true' } },
    },
    'variant': {
      control: 'select',
      options: ['default', 'in-form'],
      description: 'Visual variant of the inline notification.',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    // Slot controls — suppress auto-generated controls; slots accept specific elements only.
    'icon': { control: false, table: { disable: true } },
    'title': { control: false, table: { disable: true } },
    'subtitle': { control: false, table: { disable: true } },
    'meta': { control: false, table: { disable: true } },
    'actions': { control: false, table: { disable: true } },
    'close-icon': { control: false, table: { disable: true } },
  },
};

export default meta;
type Story = StoryObj;

const renderComponent = (args: any) => /*html*/ `
  <cor-inline-notification
    state="${args.state}"
    dismissible="${args.dismissible}"
    variant="${args.variant}"
  >
    <span slot="title">${args.title ?? 'Notification title'}</span>
    ${args.subtitle ? `<span slot="subtitle">${args.subtitle}</span>` : ''}
    ${args.meta ? `<span slot="meta">${args.meta}</span>` : ''}
  </cor-inline-notification>
`;

export const Default: Story = {
  args: {
    state: NotificationState.INFO,
    dismissible: true,
    title: 'This is an informational message',
    subtitle: 'Additional supporting detail can go here.',
    meta: '2 minutes ago',
    variant: 'default',
  },
  render: (args: any) => renderComponent(args),
};

export const WithCustomIcon: Story = {
  args: {
    state: NotificationState.INFO,
    title: 'Custom icon override',
    subtitle: 'Provide a <code>cor-icon</code> in the <code>icon</code> slot to replace the semantic default.',
  },
  render: (args: any) => /*html*/ `
    <cor-inline-notification
      state="${args.state}"
      dismissible="${args.dismissible}"
      variant="${args.variant}"
    >
      <cor-icon slot="icon" name="${ICON_NAMES.INFORMATION__SQUARE__FILLED}" color="system-info-icon-inverted" size="md"></cor-icon>
      <span slot="title">${args.title}</span>
      <span slot="subtitle">${args.subtitle}</span>
    </cor-inline-notification>
  `,
};

export const AllStates: Story = {
  argTypes: {
    state: {
      control: false,
    },
  },
  args: {
    dismissible: true,
    variant: 'default',
  },
  render: args => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 420px;">
      <cor-inline-notification
        state="${NotificationState.ERROR}"
        dismissible="${args.dismissible}"
        variant="${args.variant}"
      >
        <span slot="title">Error — Something went wrong</span>
        <span slot="subtitle">Review the details and try again.</span>
        <span slot="meta">2 minutes ago</span>
      </cor-inline-notification>

      <cor-inline-notification
        state="${NotificationState.WARNING}"
        dismissible="${args.dismissible}"
        variant="${args.variant}"
      >
        <span slot="title">Warning — Attention needed</span>
        <span slot="subtitle">This action may have unintended consequences.</span>
        <span slot="meta">5 minutes ago</span>
      </cor-inline-notification>

      <cor-inline-notification
        state="${NotificationState.SUCCESS}"
        dismissible="${args.dismissible}"
        variant="${args.variant}"
      >
        <span slot="title">Success — Changes saved</span>
        <span slot="subtitle">Your updates have been applied.</span>
        <span slot="meta">Just now</span>
      </cor-inline-notification>

      <cor-inline-notification
        state="${NotificationState.INFO}"
        dismissible="${args.dismissible}"
        variant="${args.variant}"
      >
        <span slot="title">Info — New features available</span>
        <span slot="subtitle">Check the release notes for details.</span>
        <span slot="meta">1 hour ago</span>
      </cor-inline-notification>
    </div>
  `,
};

export const InForm: Story = {
  args: {
    state: NotificationState.INFO,
    dismissible: true,
    title: 'Informational notification',
    subtitle: 'Notification subtitle',
    meta: 'Time',
    variant: 'in-form',
  },
  render: (args: any) => /*html*/ `
    <cor-inline-notification
      state="${args.state}"
      dismissible="${args.dismissible}"
      variant="${args.variant}"
      style="max-width: 420px;"
    >
      <span slot="title">${args.title ?? 'Notification title'}</span>
      ${args.subtitle ? `<span slot="subtitle">${args.subtitle}</span>` : ''}
      ${args.meta ? `<span slot="meta">${args.meta}</span>` : ''}
    </cor-inline-notification>
  `,
};

export const InFormAllStates: Story = {
  argTypes: {
    state: {
      control: false,
    },
  },
  args: {
    dismissible: true,
    variant: 'in-form',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 420px;">
      <cor-inline-notification
        state="${NotificationState.ERROR}"
        dismissible="${args.dismissible}"
        variant="${args.variant}"
        style="max-width: 420px;"
      >
        <span slot="title">Error — Something went wrong</span>
        <span slot="subtitle">Review the details and try again.</span>
        <span slot="meta">2 minutes ago</span>
      </cor-inline-notification>

      <cor-inline-notification
        state="${NotificationState.WARNING}"
        dismissible="${args.dismissible}"
        variant="${args.variant}"
        style="max-width: 420px;"
      >
        <span slot="title">Warning — Attention needed</span>
        <span slot="subtitle">This action may have unintended consequences.</span>
        <span slot="meta">5 minutes ago</span>
      </cor-inline-notification>

      <cor-inline-notification
        state="${NotificationState.SUCCESS}"
        dismissible="${args.dismissible}"
        variant="${args.variant}"
        style="max-width: 420px;"
      >
        <span slot="title">Success — Changes saved</span>
        <span slot="subtitle">Your updates have been applied.</span>
        <span slot="meta">Just now</span>
      </cor-inline-notification>

      <cor-inline-notification
        state="${NotificationState.INFO}"
        dismissible="${args.dismissible}"
        variant="${args.variant}"
        style="max-width: 420px;"
      >
        <span slot="title">Info — New features available</span>
        <span slot="subtitle">Check the release notes for details.</span>
        <span slot="meta">1 hour ago</span>
      </cor-inline-notification>
    </div>
  `,
};
