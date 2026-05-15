/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { NotificationState, ToastPosition } from './cor-toast-notification.enums';

const meta: Meta = {
  title: 'Molecules/Toast Notification',
  component: 'cor-toast-notification',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Floating notification that appends itself to `<body>`. Auto-dismisses after `autoClose` ms (default 5 s). Timer pauses on hover.',
      },
    },
  },
  argTypes: {
    state: {
      control: 'select',
      options: Object.values(NotificationState),
      description: 'Semantic state controlling icon, accent colour, background and title colour.',
      table: {
        defaultValue: { summary: NotificationState.INFO },
      },
    },
    dismissible: {
      control: 'boolean',
      description: 'When true, shows a dismiss button.',
      table: { defaultValue: { summary: 'true' } },
    },
    autoClose: {
      control: 'number',
      description: 'Auto-dismiss delay in ms. Set to 0 to disable.',
      table: { defaultValue: { summary: '5000' } },
    },
    position: {
      control: 'select',
      options: Object.values(ToastPosition),
      description: 'Screen position of the toast.',
      table: { defaultValue: { summary: ToastPosition.TOP_LEFT } },
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * Renders inside an iframe / Storybook canvas. Because the toast portals to body,
 * set autoClose=0 for static previews so it doesn't disappear.
 */
const renderStatic = (args: any) => /*html*/ `
  <div style="position: relative; height: 160px; overflow: hidden;">
    <cor-toast-notification
      state="${args.state}"
      dismissible="${args.dismissible}"
      auto-close="${args.autoClose}"
      position="${args.position ?? ToastPosition.TOP_LEFT}"
    >
      <span slot="title">${args.title ?? 'Toast notification'}</span>
      ${args.subtitle ? /*html*/ `<span slot="subtitle">${args.subtitle}</span>` : ''}
      ${args.meta ? /*html*/ `<span slot="meta">${args.meta}</span>` : ''}
      ${args.actions === false ? '' : /*html*/ `<cor-link slot="action" size="sm" href="#">Action 1</cor-link><cor-link slot="action" size="sm" href="#">Action 2</cor-link>`}
    </cor-toast-notification>
  </div>
`;

export const Default: Story = {
  args: {
    state: NotificationState.INFO,
    dismissible: true,
    autoClose: 0,
    title: 'This is an informational toast',
    subtitle: 'It will auto-dismiss after 5 seconds.',
    meta: '2 min ago',
  },
  render: (args: any) => renderStatic(args),
};

export const AllStates: Story = {
  argTypes: {
    position: {
      control: false,
    },
    state: {
      control: false,
    },
  },
  args: {
    dismissible: true,
    autoClose: 0,
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 420px; padding: 16px;">
      <div style="max-width: 420px;">
        <cor-toast-notification
          state="${NotificationState.ERROR}"
          dismissible="${args.dismissible}"
          auto-close="${args.autoClose}"
          style="position: relative !important;"
        >
          <span slot="title">Informational notification</span>
          <span slot="subtitle">Notification subtitle</span>
          <span slot="meta">Time</span>
          <cor-link slot="action" size="sm" href="#">Action 1</cor-link>
          <cor-link slot="action" size="sm" href="#">Action 2</cor-link>
        </cor-toast-notification>
      </div>

      <div style="max-width: 420px;">
        <cor-toast-notification
          state="${NotificationState.WARNING}"
          dismissible="${args.dismissible}"
          auto-close="${args.autoClose}"
          style="position: relative !important;"

          <span slot="title">Informational notification</span>
          <span slot="subtitle">Notification subtitle</span>
          <span slot="meta">Time</span>
          <cor-link slot="action" size="sm" href="#">Action 1</cor-link>
          <cor-link slot="action" size="sm" href="#">Action 2</cor-link>
        </cor-toast-notification>
      </div>

      <div style="max-width: 420px;">
        <cor-toast-notification
          state="${NotificationState.SUCCESS}"
          dismissible="${args.dismissible}"
          auto-close="${args.autoClose}"
          style="position: relative !important;"
        >
          <span slot="title">Informational notification</span>
          <span slot="subtitle">Notification subtitle</span>
          <span slot="meta">Time</span>
          <cor-link slot="action" size="sm" href="#">Action 1</cor-link>
          <cor-link slot="action" size="sm" href="#">Action 2</cor-link>
        </cor-toast-notification>
      </div>

      <div style="max-width: 420px;">
        <cor-toast-notification
          state="${NotificationState.INFO}"
          dismissible="${args.dismissible}"
          auto-close="${args.autoClose}"
          style="position: relative !important;"
        >
          <span slot="title">Informational notification</span>
          <span slot="subtitle">Notification subtitle</span>
          <span slot="meta">Time</span>
          <cor-link slot="action" size="sm" href="#">Action 1</cor-link>
          <cor-link slot="action" size="sm" href="#">Action 2</cor-link>
        </cor-toast-notification>
      </div>

      <div style="max-width: 420px;">
        <cor-toast-notification
          state="${NotificationState.NEUTRAL}"
          dismissible="${args.dismissible}"
          auto-close="${args.autoClose}"
          style="position: relative !important;"
        >
          <span slot="title">Informational notification</span>
          <span slot="subtitle">Notification subtitle</span>
          <span slot="meta">Time</span>
          <cor-link slot="action" size="sm" href="#">Action 1</cor-link>
          <cor-link slot="action" size="sm" href="#">Action 2</cor-link>
        </cor-toast-notification>
      </div>
    </div>
  `,
};

export const Positions: Story = {
  argTypes: {
    position: {
      control: false,
    },
    state: {
      control: false,
    },
  },
  args: {
    dismissible: true,
    autoClose: 0,
  },
  render: (args: any) => /*html*/ `
    <div style="position: relative; height: 520px;">
      <cor-toast-notification
        state="${NotificationState.INFO}"
        position="${ToastPosition.TOP_LEFT}"
        dismissible="${args.dismissible}"
        auto-close="${args.autoClose}"
      >
        <span slot="title">Top left</span>
      </cor-toast-notification>
      <cor-toast-notification
        state="${NotificationState.SUCCESS}"
        position="${ToastPosition.TOP_CENTER}"
        dismissible="${args.dismissible}"
        auto-close="${args.autoClose}"
      >
        <span slot="title">Top center</span>
      </cor-toast-notification>
      <cor-toast-notification
        state="${NotificationState.WARNING}"
        position="${ToastPosition.TOP_RIGHT}"
        dismissible="${args.dismissible}"
        auto-close="${args.autoClose}"
      >
        <span slot="title">Top right</span>
      </cor-toast-notification>
      <cor-toast-notification
        state="${NotificationState.NEUTRAL}"
        position="${ToastPosition.BOTTOM_LEFT}"
        dismissible="${args.dismissible}"
        auto-close="${args.autoClose}"
      >
        <span slot="title">Bottom left</span>
      </cor-toast-notification>
      <cor-toast-notification
        state="${NotificationState.ERROR}"
        position="${ToastPosition.BOTTOM_CENTER}"
        dismissible="${args.dismissible}"
        auto-close="${args.autoClose}"
      >
        <span slot="title">Bottom center</span>
      </cor-toast-notification>
      <cor-toast-notification
        state="${NotificationState.INFO}"
        position="${ToastPosition.BOTTOM_RIGHT}"
        dismissible="${args.dismissible}"
        auto-close="${args.autoClose}"
      >
        <span slot="title">Bottom right</span>
      </cor-toast-notification>
    </div>
  `,
};

export const WithActions: Story = {
  args: {
    dismissible: true,
    autoClose: 0,
    state: NotificationState.WARNING,
    position: ToastPosition.TOP_LEFT,
  },
  render: (args: any) => /*html*/ `
    <div style="padding: 16px; max-width: 400px;">
      <cor-toast-notification
        state="${args.state}"
        auto-close="${args.autoClose}"
        dismissible="${args.dismissible}"
        position="${args.position}"
      >
        <span slot="title">Session expiring soon</span>
        <span slot="subtitle">You will be logged out in 5 minutes.</span>
        <cor-link slot="action" variant="ghost" size="sm"><span>Dismiss</span></cor-link>
        <cor-link slot="action" variant="primary" size="sm"><span>Stay logged in</span></cor-link>
      </cor-toast-notification>
    </div>
  `,
};
