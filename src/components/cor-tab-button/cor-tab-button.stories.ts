/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { TabSize, TabStyle } from './cor-tab-button.enums';
import { ICON_NAMES } from '../..';

type CorTabButtonArgs = {
  value: string;
  size: string;
  tabStyle: string;
  selected: boolean;
  disabled: boolean;
  skeleton: boolean;
  iconOnly: boolean;
  iconLabel: string;
  label: string;
};

const renderTabButton = (args: CorTabButtonArgs) => {
  const selected = args.selected ? 'selected' : '';
  const disabled = args.disabled ? 'disabled' : '';
  const skeleton = args.skeleton ? 'skeleton' : '';

  return /*html*/ `
    <cor-tab-button
      value="${args.value}"
      size="${args.size}"
      tab-style="${args.tabStyle}"
      ${selected}
      ${disabled}
      ${skeleton}
    >
      ${args.label}
    </cor-tab-button>
  `;
};

const meta: Meta = {
  title: 'Atoms/Tab Button',
  component: 'cor-tab-button',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: Object.values(TabSize), description: 'Size of the tab button' },
    tabStyle: { control: 'select', options: Object.values(TabStyle), description: 'Visual style variant' },
    selected: { control: 'boolean', description: 'Selected/active state' },
    disabled: { control: 'boolean', description: 'Disabled state' },
    skeleton: { control: 'boolean', description: 'Skeleton loading state' },
    iconOnly: { control: 'boolean', description: 'Icon-only mode (no text label)' },
    iconLabel: { control: 'text', description: 'Accessible label for icon-only tabs' },
    label: { control: 'text', description: 'Label text content' },
    value: { control: 'text', description: 'Unique tab identifier' },
  },
  render: (args: any) => renderTabButton(args as CorTabButtonArgs),
};
export default meta;

export const Default: StoryObj = {
  args: {
    value: 'tab-1',
    size: TabSize.LG,
    tabStyle: TabStyle.STYLE_1,
    selected: false,
    disabled: false,
    skeleton: false,
    iconOnly: false,
    iconLabel: '',
    label: 'Label',
  },
};

export const Selected: StoryObj = {
  args: {
    ...Default.args,
    selected: true,
    label: 'Label',
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
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 80px; font-size: 12px; color: var(--color-neutral-text-weaker);">LG</span>
        <cor-tab-button value="icon-lg-1" size="lg" tab-style="style-1" icon-only>
          <cor-icon name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-tab-button>
        <cor-tab-button value="icon-lg-2" size="lg" tab-style="style-1" icon-only selected>
          <cor-icon name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-tab-button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 80px; font-size: 12px; color: var(--color-neutral-text-weaker);">MD</span>
        <cor-tab-button value="icon-md-1" size="md" tab-style="style-1" icon-only>
          <cor-icon name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-tab-button>
        <cor-tab-button value="icon-md-2" size="md" tab-style="style-1" icon-only selected>
          <cor-icon name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-tab-button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 80px; font-size: 12px; color: var(--color-neutral-text-weaker);">SM</span>
        <cor-tab-button value="icon-sm-1" size="sm" tab-style="style-1" icon-only>
          <cor-icon name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-tab-button>
        <cor-tab-button value="icon-sm-2" size="sm" tab-style="style-1" icon-only selected>
          <cor-icon name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-tab-button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 80px; font-size: 12px; color: var(--color-neutral-text-weaker);">All Styles</span>
        <cor-tab-button value="icon-s1" size="md" tab-style="style-1" icon-only>
          <cor-icon name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-tab-button>
        <cor-tab-button value="icon-s2" size="md" tab-style="style-2" icon-only>
          <cor-icon name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-tab-button>
        <cor-tab-button value="icon-s3" size="md" tab-style="style-3" icon-only>
          <cor-icon name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
        </cor-tab-button>
      </div>
    </div>
  `,
};

export const WithIcon: StoryObj = {
  args: {
    ...Default.args,
    label: 'Label',
  },
  render: (args: any) => /*html*/ `
    <cor-tab-button value="${args.value}" size="${args.size}" tab-style="${args.tabStyle}" ${args.selected ? 'selected' : ''} ${args.disabled ? 'disabled' : ''} ${args.skeleton ? 'skeleton' : ''}>
      <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
      ${args.label}
    </cor-tab-button>
  `,
};

export const WithIconRight: StoryObj = {
  args: {
    ...Default.args,
    label: 'Label',
  },
  render: (args: any) => /*html*/ `
    <cor-tab-button value="${args.value}" size="${args.size}" tab-style="${args.tabStyle}" ${args.selected ? 'selected' : ''} ${args.disabled ? 'disabled' : ''} ${args.skeleton ? 'skeleton' : ''}>
      ${args.label}
      <cor-icon slot="icon-right" name="${ICON_NAMES.SETTINGS}" color="currentColor"></cor-icon>
    </cor-tab-button>
  `,
};

export const WithBothIcons: StoryObj = {
  args: {
    ...Default.args,
    label: 'Label',
  },
  render: (args: any) => /*html*/ `
    <cor-tab-button value="${args.value}" size="${args.size}" tab-style="${args.tabStyle}" ${args.selected ? 'selected' : ''} ${args.disabled ? 'disabled' : ''} ${args.skeleton ? 'skeleton' : ''}>
      <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
      ${args.label}
      <cor-icon slot="icon-right" name="${ICON_NAMES.NOTIFICATION}" color="currentColor"></cor-icon>
    </cor-tab-button>
  `,
};

export const WithBothIconsAndBadge: StoryObj = {
  args: {
    ...Default.args,
    label: 'Label',
    selected: true,
  },
  render: (args: any) => /*html*/ `
    <cor-tab-button value="${args.value}" size="${args.size}" tab-style="${args.tabStyle}" ${args.selected ? 'selected' : ''} ${args.disabled ? 'disabled' : ''} ${args.skeleton ? 'skeleton' : ''}>
      <cor-icon slot="icon-left" name="${ICON_NAMES.HOME}" color="currentColor"></cor-icon>
      ${args.label}
      <cor-badge-interactive size="sm">13</cor-badge-interactive>
      <cor-icon slot="icon-right" name="${ICON_NAMES.NOTIFICATION}" color="currentColor"></cor-icon>
    </cor-tab-button>
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
    tabStyle: TabStyle.STYLE_1,
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 32px; font-size: 12px; color: var(--color-neutral-text-weaker);">lg</span>
        <cor-tab-button
          value="a"
          size="lg"
          tab-style="${args.tabStyle}"
        >
          ${args.label}
        </cor-tab-button>
        <cor-tab-button
          value="b"
          size="lg"
          tab-style="${args.tabStyle}"
          selected
        >
          ${args.label}
        </cor-tab-button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 32px; font-size: 12px; color: var(--color-neutral-text-weaker);">md</span>
        <cor-tab-button
          value="c"
          size="md"
          tab-style="${args.tabStyle}"
        >
          ${args.label}
        </cor-tab-button>
        <cor-tab-button
          value="d"
          size="md"
          tab-style="${args.tabStyle}"
          selected
        >
          ${args.label}
        </cor-tab-button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 32px; font-size: 12px; color: var(--color-neutral-text-weaker);">sm</span>
        <cor-tab-button
          value="e"
          size="sm"
          tab-style="${args.tabStyle}"
        >
          ${args.label}
        </cor-tab-button>
        <cor-tab-button
          value="f"
          size="sm"
          tab-style="${args.tabStyle}"
          selected
        >
          ${args.label}
        </cor-tab-button>
      </div>
    </div>
  `,
};

export const AllStyles: StoryObj = {
  argTypes: {
    size: {
      control: false,
    },
    selected: {
      control: false,
    },
    disabled: {
      control: false,
    },
    skeleton: {
      control: false,
    },
  },
  args: {
    ...Default.args,
    size: TabSize.LG,
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-1</span>
        <cor-tab-button value="a" size="${args.size}" tab-style="style-1">${args.label}</cor-tab-button>
        <cor-tab-button value="b" size="${args.size}" tab-style="style-1" selected>${args.label}</cor-tab-button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-2</span>
        <cor-tab-button value="c" size="${args.size}" tab-style="style-2">${args.label}</cor-tab-button>
        <cor-tab-button value="d" size="${args.size}" tab-style="style-2" selected>${args.label}</cor-tab-button>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-3</span>
        <cor-tab-button value="e" size="${args.size}" tab-style="style-3">${args.label}</cor-tab-button>
        <cor-tab-button value="f" size="${args.size}" tab-style="style-3" selected>${args.label}</cor-tab-button>
      </div>
    </div>
  `,
};

export const AllSizesAndStyles: StoryObj = {
  argTypes: {
    selected: {
      control: false,
    },
    disabled: {
      control: false,
    },
    skeleton: {
      control: false,
    },
  },
  args: {
    ...Default.args,
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Size LG -->
      <div>
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--color-neutral-text-default);">Size LG</div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-1</span>
            <cor-tab-button value="lg-1-a" size="lg" tab-style="style-1">${args.label}</cor-tab-button>
            <cor-tab-button value="lg-1-b" size="lg" tab-style="style-1" selected>${args.label}</cor-tab-button>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-2</span>
            <cor-tab-button value="lg-2-a" size="lg" tab-style="style-2">${args.label}</cor-tab-button>
            <cor-tab-button value="lg-2-b" size="lg" tab-style="style-2" selected>${args.label}</cor-tab-button>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-3</span>
            <cor-tab-button value="lg-3-a" size="lg" tab-style="style-3">${args.label}</cor-tab-button>
            <cor-tab-button value="lg-3-b" size="lg" tab-style="style-3" selected>${args.label}</cor-tab-button>
          </div>
        </div>
      </div>

      <!-- Size MD -->
      <div>
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--color-neutral-text-default);">Size MD</div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-1</span>
            <cor-tab-button value="md-1-a" size="md" tab-style="style-1">${args.label}</cor-tab-button>
            <cor-tab-button value="md-1-b" size="md" tab-style="style-1" selected>${args.label}</cor-tab-button>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-2</span>
            <cor-tab-button value="md-2-a" size="md" tab-style="style-2">${args.label}</cor-tab-button>
            <cor-tab-button value="md-2-b" size="md" tab-style="style-2" selected>${args.label}</cor-tab-button>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-3</span>
            <cor-tab-button value="md-3-a" size="md" tab-style="style-3">${args.label}</cor-tab-button>
            <cor-tab-button value="md-3-b" size="md" tab-style="style-3" selected>${args.label}</cor-tab-button>
          </div>
        </div>
      </div>

      <!-- Size SM -->
      <div>
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--color-neutral-text-default);">Size SM</div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-1</span>
            <cor-tab-button value="sm-1-a" size="sm" tab-style="style-1">${args.label}</cor-tab-button>
            <cor-tab-button value="sm-1-b" size="sm" tab-style="style-1" selected>${args.label}</cor-tab-button>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-2</span>
            <cor-tab-button value="sm-2-a" size="sm" tab-style="style-2">${args.label}</cor-tab-button>
            <cor-tab-button value="sm-2-b" size="sm" tab-style="style-2" selected>${args.label}</cor-tab-button>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="width: 56px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-text-weaker);">style-3</span>
            <cor-tab-button value="sm-3-a" size="sm" tab-style="style-3">${args.label}</cor-tab-button>
            <cor-tab-button value="sm-3-b" size="sm" tab-style="style-3" selected>${args.label}</cor-tab-button>
          </div>
        </div>
      </div>
    </div>
  `,
};

export const States: StoryObj = {
  argTypes: {
    tabStyle: {
      control: false,
    },
    selected: {
      control: false,
    },
    disabled: {
      control: false,
    },
    skeleton: {
      control: false,
    },
    iconOnly: {
      control: false,
    },
  },
  args: {
    ...Default.args,
    size: TabSize.LG,
  },
  render: (args: Partial<CorTabButtonArgs>) => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr 1fr 1fr; gap: 12px 24px; align-items: center;">
      <div style="font-weight: 600; font-size: 12px;">State</div>
      <div style="font-weight: 600; font-size: 12px;">style-1</div>
      <div style="font-weight: 600; font-size: 12px;">style-2</div>
      <div style="font-weight: 600; font-size: 12px;">style-3</div>

      <div style="font-size: 12px; color: var(--color-neutral-text-weaker);">Default</div>
      <cor-tab-button value="a" tab-style="style-1" size="${args.size}">Label</cor-tab-button>
      <cor-tab-button value="b" tab-style="style-2" size="${args.size}">Label</cor-tab-button>
      <cor-tab-button value="c" tab-style="style-3" size="${args.size}">Label</cor-tab-button>

      <div style="font-size: 12px; color: var(--color-neutral-text-weaker);">Selected</div>
      <cor-tab-button value="d" tab-style="style-1" size="${args.size}" selected>Label</cor-tab-button>
      <cor-tab-button value="e" tab-style="style-2" size="${args.size}" selected>Label</cor-tab-button>
      <cor-tab-button value="f" tab-style="style-3" size="${args.size}" selected>Label</cor-tab-button>

      <div style="font-size: 12px; color: var(--color-neutral-text-weaker);">Disabled</div>
      <cor-tab-button value="j" tab-style="style-1" size="${args.size}" disabled>Label</cor-tab-button>
      <cor-tab-button value="k" tab-style="style-2" size="${args.size}" disabled>Label</cor-tab-button>
      <cor-tab-button value="l" tab-style="style-3" size="${args.size}" disabled>Label</cor-tab-button>

      <div style="font-size: 12px; color: var(--color-neutral-text-weaker);">Skeleton</div>
      <cor-tab-button value="m" tab-style="style-1" size="${args.size}" skeleton></cor-tab-button>
      <cor-tab-button value="n" tab-style="style-2" size="${args.size}" skeleton></cor-tab-button>
      <cor-tab-button value="o" tab-style="style-3" size="${args.size}" skeleton></cor-tab-button>

      <div style="font-size: 12px; color: var(--color-neutral-text-weaker);">Skeleton<br>icon-only</div>
      <cor-tab-button value="p" tab-style="style-1" size="${args.size}" skeleton icon-only></cor-tab-button>
      <cor-tab-button value="q" tab-style="style-2" size="${args.size}" skeleton icon-only></cor-tab-button>
      <cor-tab-button value="r" tab-style="style-3" size="${args.size}" skeleton icon-only></cor-tab-button>
    </div>
  `,
};
