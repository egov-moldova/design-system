/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { MenuButtonType } from './cor-menu-button.enums';
import { ICON_NAMES } from '../..';

type CorMenuButtonArgs = {
  value: string;
  type: string;
  selected: boolean;
  disabled: boolean;
  skeleton: boolean;
  iconOnly: boolean;
  iconLabel: string;
  label: string;
  showIconLeft: boolean;
  showIconRight: boolean;
  showBadge: boolean;
  badgeCount: string;
};

const renderMenuButton = (args: CorMenuButtonArgs) => {
  const selected = args.selected ? 'selected' : '';
  const disabled = args.disabled ? 'disabled' : '';
  const skeleton = args.skeleton ? 'skeleton' : '';
  const iconOnly = args.iconOnly ? 'icon-only' : '';

  const iconLeft = args.showIconLeft
    ? `<cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>`
    : '';

  const iconRight = args.showIconRight
    ? `<cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>`
    : '';

  const badge = args.showBadge ? `<cor-badge-interactive size="md">${args.badgeCount}</cor-badge-interactive>` : '';

  const defaultSlot = args.iconOnly ? '' : `${args.label}${badge}`;

  return /*html*/ `
    <cor-menu-button
      value="${args.value}"
      type="${args.type}"
      ${selected}
      ${disabled}
      ${skeleton}
      ${iconOnly}
    >
      ${iconLeft}
      ${defaultSlot}
      ${iconRight}
    </cor-menu-button>
  `;
};

const meta: Meta = {
  title: 'Molecules/Menu Button',
  component: 'cor-menu-button',
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: Object.values(MenuButtonType), description: 'Visual type variant' },
    selected: { control: 'boolean', description: 'Selected/active state' },
    disabled: { control: 'boolean', description: 'Disabled state' },
    skeleton: { control: 'boolean', description: 'Skeleton loading state' },
    iconOnly: { control: 'boolean', description: 'Icon-only mode (no label)' },
    iconLabel: { control: 'text', description: 'Accessible label for icon-only' },
    label: { control: 'text', description: 'Label text' },
    value: { control: 'text', description: 'Unique identifier' },
    showIconLeft: { control: 'boolean', description: 'Show left icon' },
    showIconRight: { control: 'boolean', description: 'Show right icon' },
    showBadge: { control: 'boolean', description: 'Show badge' },
    badgeCount: { control: 'text', description: 'Badge count text' },
  },
  render: (args: any) => renderMenuButton(args as CorMenuButtonArgs),
};
export default meta;

export const Default: StoryObj = {
  args: {
    value: 'menu-1',
    type: MenuButtonType.PRIMARY,
    selected: false,
    disabled: false,
    skeleton: false,
    iconOnly: false,
    iconLabel: '',
    label: 'Label',
    showIconLeft: true,
    showIconRight: true,
    showBadge: true,
    badgeCount: '13',
  },
};

export const Selected: StoryObj = {
  args: {
    ...Default.args,
    selected: true,
  },
};

export const Disabled: StoryObj = {
  args: {
    ...Default.args,
    disabled: true,
  },
};

export const Skeleton: StoryObj = {
  args: {
    ...Default.args,
    skeleton: true,
  },
};

export const IconOnly: StoryObj = {
  parameters: {
    controls: {
      disable: true,
    },
  },
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
      <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default);">Primary — Icon Only</div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <cor-menu-button value="io-1" type="primary" icon-only>
          <cor-icon slot="icon" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-menu-button>
        <cor-menu-button value="io-2" type="primary" icon-only selected>
          <cor-icon slot="icon" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-menu-button>
        <cor-menu-button value="io-3" type="primary" icon-only disabled>
          <cor-icon slot="icon" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-menu-button>
        <cor-menu-button value="io-4" type="primary" icon-only skeleton></cor-menu-button>
      </div>
    </div>
  `,
};

export const AllTypes: StoryObj = {
  parameters: {
    controls: {
      disable: true,
    },
  },
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Primary</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <cor-menu-button value="p-1" type="primary">
            <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
            Label
            <cor-badge-interactive size="md">13</cor-badge-interactive>
            <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
          </cor-menu-button>
          <cor-menu-button value="p-2" type="primary" selected>
            <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
            Label
            <cor-badge-interactive size="md">13</cor-badge-interactive>
            <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
          </cor-menu-button>
        </div>
      </div>

      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Secondary</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <cor-menu-button value="s-1" type="secondary">
            <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
            LABEL
            <cor-badge-interactive size="md">13</cor-badge-interactive>
            <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
          </cor-menu-button>
          <cor-menu-button value="s-2" type="secondary" selected>
            <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
            LABEL
            <cor-badge-interactive size="md">13</cor-badge-interactive>
            <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
          </cor-menu-button>
        </div>
      </div>

      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Tertiary</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <cor-menu-button value="t-1" type="tertiary">
            <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
            LABEL
            <cor-badge-interactive size="md">13</cor-badge-interactive>
          </cor-menu-button>
          <cor-menu-button value="t-2" type="tertiary" selected>
            <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
            LABEL
            <cor-badge-interactive size="md">13</cor-badge-interactive>
          </cor-menu-button>
        </div>
      </div>
    </div>
  `,
};

export const States: StoryObj = {
  parameters: {
    controls: { disable: true },
  },
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: 80px 1fr 1fr 1fr 1fr; gap: 12px 24px; place-items: center;">
      <div style="font-weight: 600; font-size: 12px;">State</div>
      <div style="font-weight: 600; font-size: 12px;">Primary</div>
      <div style="font-weight: 600; font-size: 12px;">Icon Only</div>
      <div style="font-weight: 600; font-size: 12px;">Secondary</div>
      <div style="font-weight: 600; font-size: 12px;">Tertiary</div>

      <div style="font-size: 12px; color: var(--color-text-base-tertiary);">Default</div>
      <cor-menu-button value="p-def" type="primary">
        <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        Label
        <cor-badge-interactive size="md">13</cor-badge-interactive>
        <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
      </cor-menu-button>
      <cor-menu-button value="io-def" type="primary" icon-only>
        <cor-icon slot="icon" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
      </cor-menu-button>
      <cor-menu-button value="s-def" type="secondary">
        <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        LABEL
        <cor-badge-interactive size="md">13</cor-badge-interactive>
        <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
      </cor-menu-button>
      <cor-menu-button value="t-def" type="tertiary">
        <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        LABEL
        <cor-badge-interactive size="md">13</cor-badge-interactive>
      </cor-menu-button>

      <div style="font-size: 12px; color: var(--color-text-base-tertiary);">Selected</div>
      <cor-menu-button value="p-sel" type="primary" selected>
        <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        Label
        <cor-badge-interactive size="md">13</cor-badge-interactive>
        <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
      </cor-menu-button>
      <cor-menu-button value="io-sel" type="primary" icon-only selected>
        <cor-icon slot="icon" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
      </cor-menu-button>
      <cor-menu-button value="s-sel" type="secondary" selected>
        <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        LABEL
        <cor-badge-interactive size="md">13</cor-badge-interactive>
        <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
      </cor-menu-button>
      <cor-menu-button value="t-sel" type="tertiary" selected>
        <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        LABEL
        <cor-badge-interactive size="md">13</cor-badge-interactive>
      </cor-menu-button>

      <div style="font-size: 12px; color: var(--color-text-base-tertiary);">Disabled</div>
      <cor-menu-button value="p-dis" type="primary" disabled>
        <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        Label
        <cor-badge-interactive size="md">13</cor-badge-interactive>
        <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
      </cor-menu-button>
      <cor-menu-button value="io-dis" type="primary" icon-only disabled>
        <cor-icon slot="icon" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
      </cor-menu-button>
      <cor-menu-button value="s-dis" type="secondary" disabled>
        <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        LABEL
        <cor-badge-interactive size="md">13</cor-badge-interactive>
        <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
      </cor-menu-button>
      <cor-menu-button value="t-dis" type="tertiary" disabled>
        <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        LABEL
        <cor-badge-interactive size="md">13</cor-badge-interactive>
      </cor-menu-button>

      <div style="font-size: 12px; color: var(--color-text-base-tertiary);">Skeleton</div>
      <cor-menu-button value="p-sk" type="primary" skeleton></cor-menu-button>
      <cor-menu-button value="io-sk" type="primary" skeleton icon-only></cor-menu-button>
      <cor-menu-button value="s-sk" type="secondary" skeleton></cor-menu-button>
      <cor-menu-button value="t-sk" type="tertiary" skeleton></cor-menu-button>
    </div>
  `,
};

export const EventLogging: StoryObj = {
  parameters: {
    controls: { disable: true },
  },
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div style="display: flex; gap: 16px; align-items: flex-start;">
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default);">Menu Buttons</div>
          <div style="display: flex; gap: 16px;">
            <cor-menu-button id="menu-btn-1" value="home" type="primary">
              <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
              Home
              <cor-badge-interactive size="md">5</cor-badge-interactive>
              <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
            </cor-menu-button>

            <cor-menu-button id="menu-btn-2" value="home icon" type="primary" icon-only iconLabel="Icon Only">
              <cor-icon slot="icon" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
            </cor-menu-button>


            <cor-menu-button id="menu-btn-3" value="settings" type="secondary">
              <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
              Settings
              <cor-badge-interactive size="md">12</cor-badge-interactive>
              <cor-icon slot="icon-right" name="${ICON_NAMES.OVERFLOW_MENU__HORIZONTAL}" color="currentColor"></cor-icon>
            </cor-menu-button>

            <cor-menu-button id="menu-btn-4" value="profile" type="tertiary" selected>
              <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
              Profile
              <cor-badge-interactive size="md">3</cor-badge-interactive>
            </cor-menu-button>

            <cor-menu-button id="menu-btn-5" value="disabled" type="primary" disabled>
              <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
              Disabled
            </cor-menu-button>
          </div>
        </div>
      </div>

      <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-top: 32px;">Click a menu button — the corMenuSelect event is emitted with the button's value.</div>

      <div id="menu-output" style="padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Current Value:</div>
        <div id="menu-output-content">-</div>
      </div>
      <div id="menu-log" style="padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
        <div id="menu-log-content">Click a menu button to see events...</div>
      </div>
    </div>
  `,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const buttons = [
      canvasElement.querySelector('#menu-btn-1'),
      canvasElement.querySelector('#menu-btn-2'),
      canvasElement.querySelector('#menu-btn-3'),
      canvasElement.querySelector('#menu-btn-4'),
    ].filter((button): button is Element => Boolean(button));

    const output = canvasElement.querySelector<HTMLElement>('#menu-output-content');
    const logContent = canvasElement.querySelector<HTMLElement>('#menu-log-content');

    if (!output || !logContent) {
      return;
    }

    buttons.forEach(button => {
      const existingHandler = (button as HTMLElement & { __menuLogHandler?: (event: Event) => void }).__menuLogHandler;
      if (existingHandler) {
        button.removeEventListener('corMenuSelect', existingHandler as EventListener);
      }

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ value: string }>;
        const ts = new Date().toLocaleTimeString();
        const logEntry = `[${ts}] corMenuSelect (value: ${customEvent.detail.value})`;

        output.textContent = customEvent.detail.value;
        logContent.innerHTML = `${logEntry}<br>${logContent.innerHTML}`;
      };

      (button as HTMLElement & { __menuLogHandler?: (event: Event) => void }).__menuLogHandler = handler;
      button.addEventListener('corMenuSelect', handler as EventListener);
    });
  },
};
