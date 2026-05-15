/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { TabSize, TabStyle } from '../cor-tab-button/cor-tab-button.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { IconSize } from '../cor-icon/cor-icon.types';

/**
 * Helper: Attach event listeners to element after render
 * Avoids inline scripts and __bound hacks
 */
const attachEventListeners = (elementId: string, eventName: string, callback: (detail: any) => void) => {
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (el) {
      el.addEventListener(eventName, ((e: CustomEvent) => callback(e.detail)) as EventListener);
    }
  }, 0);
};

type CorTabsArgs = {
  tabStyle: string;
  size: string;
  value: string;
  disabled: boolean;
  error: boolean;
};

const renderTabs = (args: CorTabsArgs) => {
  const disabled = args.disabled ? 'disabled' : '';
  const error = args.error ? 'error' : '';

  return /*html*/ `
    <cor-tabs
      tab-style="${args.tabStyle}"
      size="${args.size}"
      value="${args.value}"
      ${disabled}
      ${error}
    >
      <cor-tab-button value="tab-1">Label</cor-tab-button>
      <cor-tab-button value="tab-2">Label</cor-tab-button>
      <cor-tab-button value="tab-3">Label</cor-tab-button>
    </cor-tabs>
  `;
};

const meta: Meta = {
  title: 'Molecules/Tabs',
  component: 'cor-tabs',
  tags: ['autodocs'],
  argTypes: {
    tabStyle: { control: 'select', options: Object.values(TabStyle), description: 'Visual style variant' },
    size: { control: 'select', options: Object.values(TabSize), description: 'Size of all tab buttons' },
    value: {
      control: 'select',
      options: ['tab-1', 'tab-2', 'tab-3'],
      description: 'Value of the currently selected tab',
    },
    disabled: { control: 'boolean', description: 'Disable all tab buttons' },
    error: { control: 'boolean', description: 'Container error state' },
  },
  render: (args: any) => renderTabs(args as CorTabsArgs),
  parameters: {
    actions: { handles: ['corTabChange'] },
  },
};
export default meta;

export const Default: StoryObj = {
  args: {
    tabStyle: TabStyle.STYLE_1,
    size: TabSize.LG,
    value: 'tab-1',
    disabled: false,
    error: false,
  },
};

export const Style1: StoryObj = {
  argTypes: {
    tabStyle: {
      control: false,
    },
  },
  args: {
    ...Default.args,
  },
  render: (args: Partial<CorTabsArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Default (Label Only)</div>
        <cor-tabs tab-style="style-1" size="${args.size}" value="${args.value}" ${args.disabled ? 'disabled' : ''} ${args.error ? 'error' : ''}>
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Icon Only</div>
        <cor-tabs tab-style="style-1" size="${args.size}" value="home" ${args.disabled ? 'disabled' : ''} ${args.error ? 'error' : ''}>
          <cor-tab-button value="home" icon-only>
            <cor-icon name="${ICON_NAMES.HOME}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="settings" icon-only>
            <cor-icon name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="user" icon-only>
            <cor-icon name="${ICON_NAMES.USER}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Complex (Icon + Label + Badge)</div>
        <cor-tabs tab-style="style-1" size="${args.size}" value="${args.value}" ${args.disabled ? 'disabled' : ''} ${args.error ? 'error' : ''}>
          <cor-tab-button value="tab-1">
            <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" size="${IconSize.MD}" color="currentColor"></cor-icon>
            Label
            <cor-badge-interactive size="sm">3</cor-badge-interactive>
          </cor-tab-button>
          <cor-tab-button value="tab-2">
            <cor-icon slot="icon-left" name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}" color="currentColor"></cor-icon>
            Label
            <cor-badge-interactive size="sm">12</cor-badge-interactive>
          </cor-tab-button>
          <cor-tab-button value="tab-3">
            <cor-icon slot="icon-left" name="${ICON_NAMES.USER}" size="${IconSize.MD}" color="currentColor"></cor-icon>
            Label
            <cor-icon slot="icon-right" name="${ICON_NAMES.NOTIFICATION}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
        </cor-tabs>
      </div>
    </div>
  `,
};

export const Style2: StoryObj = {
  argTypes: {
    tabStyle: {
      control: false,
    },
  },
  args: {
    ...Default.args,
  },
  render: (args: Partial<CorTabsArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Default (Label Only)</div>
        <cor-tabs tab-style="style-2" size="${args.size}" value="${args.value}" ${args.disabled ? 'disabled' : ''} ${args.error ? 'error' : ''}>
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Icon Only</div>
        <cor-tabs tab-style="style-2" size="${args.size}" value="home" ${args.disabled ? 'disabled' : ''} ${args.error ? 'error' : ''}>
          <cor-tab-button value="home" icon-only>
            <cor-icon name="${ICON_NAMES.HOME}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="settings" icon-only>
            <cor-icon name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="user" icon-only>
            <cor-icon name="${ICON_NAMES.USER}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Complex (Icon + Label + Badge)</div>
        <cor-tabs tab-style="style-2" size="${args.size}" value="${args.value}" ${args.disabled ? 'disabled' : ''} ${args.error ? 'error' : ''}>
          <cor-tab-button value="tab-1">
            <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" size="${IconSize.MD}" color="currentColor"></cor-icon>
            Label
            <cor-badge-interactive size="sm">3</cor-badge-interactive>
          </cor-tab-button>
          <cor-tab-button value="tab-2">
            <cor-icon slot="icon-left" name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}" color="currentColor"></cor-icon>
            Label
            <cor-badge-interactive size="sm">12</cor-badge-interactive>
          </cor-tab-button>
          <cor-tab-button value="tab-3">
            <cor-icon slot="icon-left" name="${ICON_NAMES.USER}" size="${IconSize.MD}" color="currentColor"></cor-icon>
            Label
            <cor-icon slot="icon-right" name="${ICON_NAMES.NOTIFICATION}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
        </cor-tabs>
      </div>
    </div>
  `,
};

export const Style3: StoryObj = {
  argTypes: {
    tabStyle: {
      control: false,
    },
  },
  args: {
    ...Default.args,
  },
  render: (args: Partial<CorTabsArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Default (Label Only)</div>
        <cor-tabs tab-style="style-3" size="${args.size}" value="${args.value}" ${args.disabled ? 'disabled' : ''} ${args.error ? 'error' : ''}>
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Icon Only</div>
        <cor-tabs tab-style="style-3" size="${args.size}" value="home" ${args.disabled ? 'disabled' : ''} ${args.error ? 'error' : ''}>
          <cor-tab-button value="home" icon-only>
            <cor-icon name="${ICON_NAMES.HOME}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="settings" icon-only>
            <cor-icon name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="user" icon-only>
            <cor-icon name="${ICON_NAMES.USER}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-default); margin-bottom: 8px;">Complex (Icon + Label + Badge)</div>
        <cor-tabs tab-style="style-3" size="${args.size}" value="${args.value}" ${args.disabled ? 'disabled' : ''} ${args.error ? 'error' : ''}>
          <cor-tab-button value="tab-1">
            <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" size="${IconSize.MD}" color="currentColor"></cor-icon>
            Label
            <cor-badge-interactive size="sm">3</cor-badge-interactive>
          </cor-tab-button>
          <cor-tab-button value="tab-2">
            <cor-icon slot="icon-left" name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}" color="currentColor"></cor-icon>
            Label
            <cor-badge-interactive size="sm">12</cor-badge-interactive>
          </cor-tab-button>
          <cor-tab-button value="tab-3">
            <cor-icon slot="icon-left" name="${ICON_NAMES.USER}" size="${IconSize.MD}" color="currentColor"></cor-icon>
            Label
            <cor-icon slot="icon-right" name="${ICON_NAMES.NOTIFICATION}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
        </cor-tabs>
      </div>
    </div>
  `,
};

export const AllStyles: StoryObj = {
  argTypes: {
    tabStyle: {
      control: false,
    },
  },
  args: {
    ...Default.args,
  },
  render: (args: Partial<CorTabsArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-1 (contained pill)</div>
        <cor-tabs
          tab-style="style-1"
          size="${args.size}"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          ${args.error ? 'error' : ''}
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-2 (divided)</div>
        <cor-tabs
          tab-style="style-2"
          size="${args.size}"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          ${args.error ? 'error' : ''}
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-3 (underline)</div>
        <cor-tabs
          tab-style="style-3"
          size="${args.size}"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          ${args.error ? 'error' : ''}
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
    </div>
  `,
};

export const AllSizes: StoryObj = {
  argTypes: {
    size: {
      control: false,
    },
  },
  args: {
    ...Default.args,
  },
  render: (args: Partial<CorTabsArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">lg</div>
        <cor-tabs
          tab-style="${args.tabStyle}"
          size="lg"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          ${args.error ? 'error' : ''}
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">md</div>
        <cor-tabs
          tab-style="${args.tabStyle}"
          size="md"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          ${args.error ? 'error' : ''}
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">sm</div>
        <cor-tabs
          tab-style="${args.tabStyle}"
          size="sm"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          ${args.error ? 'error' : ''}
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
    </div>
  `,
};

export const ErrorState: StoryObj = {
  argTypes: {
    error: {
      control: false,
    },
    tabStyle: {
      control: false,
    },
  },
  args: {
    ...Default.args,
    error: true,
  },
  render: (args: Partial<CorTabsArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-1 (contained pill)</div>
        <cor-tabs
          tab-style="style-1"
          size="${args.size}"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          error
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-2 (divided)</div>
        <cor-tabs
          tab-style="style-2"
          size="${args.size}"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          error
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-3 (underline)</div>
        <cor-tabs
          tab-style="style-3"
          size="${args.size}"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          error
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
    </div>
  `,
};

export const DisabledState: StoryObj = {
  argTypes: {
    disabled: {
      control: false,
    },
    tabStyle: {
      control: false,
    },
  },
  args: {
    ...Default.args,
    disabled: true,
  },
  render: (args: Partial<CorTabsArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-1 (contained pill)</div>
        <cor-tabs
          tab-style="style-1"
          size="${args.size}"
          value="${args.value}"
          ${args.error ? 'error' : ''}
          disabled
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-2 (divided)</div>
        <cor-tabs
          tab-style="style-2"
          size="${args.size}"
          value="${args.value}"
          ${args.error ? 'error' : ''}
          disabled
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-3 (underline)</div>
        <cor-tabs
          tab-style="style-3"
          size="${args.size}"
          value="${args.value}"
          ${args.error ? 'error' : ''}
          disabled
        >
          <cor-tab-button value="tab-1">Label</cor-tab-button>
          <cor-tab-button value="tab-2">Label</cor-tab-button>
          <cor-tab-button value="tab-3">Label</cor-tab-button>
        </cor-tabs>
      </div>
    </div>
  `,
};

export const Icons: StoryObj = {
  argTypes: {
    tabStyle: {
      control: false,
    },
    value: {
      control: 'select',
      options: ['home', 'settings', 'user', 'notifications'],
    },
  },
  args: {
    ...Default.args,
    tabStyle: TabStyle.STYLE_1,
    value: 'home',
  },
  render: (args: Partial<CorTabsArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-1 (contained pill)</div>
        <cor-tabs
          tab-style="style-1"
          size="${args.size}"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          ${args.error ? 'error' : ''}
        >
          <cor-tab-button value="home" icon-only>
            <cor-icon name="${ICON_NAMES.HOME}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="settings" icon-only>
            <cor-icon name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="user" icon-only>
            <cor-icon name="${ICON_NAMES.USER}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="notifications" icon-only>
            <cor-icon name="${ICON_NAMES.NOTIFICATION}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-2 (divided)</div>
        <cor-tabs
          tab-style="style-2"
          size="${args.size}"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          ${args.error ? 'error' : ''}
        >
          <cor-tab-button value="home" icon-only>
            <cor-icon name="${ICON_NAMES.HOME}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="settings" icon-only>
            <cor-icon name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="user" icon-only>
            <cor-icon name="${ICON_NAMES.USER}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="notifications" icon-only>
            <cor-icon name="${ICON_NAMES.NOTIFICATION}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
        </cor-tabs>
      </div>
      <div>
        <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-bottom: 8px;">style-3 (underline)</div>
        <cor-tabs
          tab-style="style-3"
          size="${args.size}"
          value="${args.value}"
          ${args.disabled ? 'disabled' : ''}
          ${args.error ? 'error' : ''}
        >
          <cor-tab-button value="home" icon-only>
            <cor-icon name="${ICON_NAMES.HOME}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="settings" icon-only>
            <cor-icon name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="user" icon-only>
            <cor-icon name="${ICON_NAMES.USER}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
          <cor-tab-button value="notifications" icon-only>
            <cor-icon name="${ICON_NAMES.NOTIFICATION}" size="${IconSize.MD}" color="currentColor"></cor-icon>
          </cor-tab-button>
        </cor-tabs>
      </div>
    </div>
  `,
};

export const Interactive: StoryObj = {
  args: {
    ...Default.args,
  },
  render: (args: Partial<CorTabsArgs>) => {
    const elementId = 'demo-tabs';
    const outputId = 'demo-output-content';
    const logContentId = 'tabs-log-content';

    // Attach event listener after render
    attachEventListeners(elementId, 'corTabChange', detail => {
      const tabs = document.getElementById(elementId) as any;
      const output = document.getElementById(outputId);
      const logContent = document.getElementById(logContentId);
      const panels = {
        'tab-1': document.getElementById('panel-tab-1') as HTMLElement | null,
        'tab-2': document.getElementById('panel-tab-2') as HTMLElement | null,
        'tab-3': document.getElementById('panel-tab-3') as HTMLElement | null,
      };

      if (tabs && output && logContent) {
        tabs.value = detail.value;
        output.textContent = detail.value;

        // Switch panel visibility
        Object.keys(panels).forEach(tab => {
          const panel = panels[tab as keyof typeof panels];
          if (panel) {
            panel.style.display = tab === detail.value ? 'block' : 'none';
          }
        });

        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] corTabChange (value: ${detail.value})<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <cor-tabs
        id="${elementId}"
        tab-style="${args.tabStyle}"
        value="${args.value}"
        size="${args.size}"
        ${args.disabled ? 'disabled' : ''}
        ${args.error ? 'error' : ''}
      >
        <cor-tab-button value="tab-1">Tab One</cor-tab-button>
        <cor-tab-button value="tab-2">Tab Two</cor-tab-button>
        <cor-tab-button value="tab-3">Tab Three</cor-tab-button>
      </cor-tabs>

      <div id="tab-content" style="padding: 16px; background: var(--color-background-base-default); border-radius: 4px; min-width: 360px;">
        <div id="panel-tab-1" style="display: block;">
          <h3>Content for Tab One</h3>
          <p>This is the content panel for the first tab. It is displayed when Tab One is selected.</p>
        </div>
        <div id="panel-tab-2" style="display: none;">
          <h3>Content for Tab Two</h3>
          <p>This is the content panel for the second tab. It is displayed when Tab Two is selected.</p>
        </div>
        <div id="panel-tab-3" style="display: none;">
          <h3>Content for Tab Three</h3>
          <p>This is the content panel for the third tab. It is displayed when Tab Three is selected.</p>
        </div>
      </div>

      <div style="font-size: 12px; color: var(--color-text-base-tertiary); margin-top: 32px;">Click a tab — the corTabChange event is emitted. The consumer updates <code>value</code> externally and displays the corresponding content.</div>

      <div id="demo-output" style="padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Current Value:</div>
        <div id="${outputId}">tab-1</div>
      </div>
      <div id="tabs-log" style="padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
        <div id="${logContentId}">Click a tab to see events...</div>
      </div>
    </div>
  `;
  },
};
