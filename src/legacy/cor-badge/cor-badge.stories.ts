/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { BadgeStatus, BadgeVariant, BadgeSize } from './cor-badge.enums';
import { IconSize } from '../cor-icon/cor-icon.types';
import { CARBON_ICON_NAMES } from '../..';

type BadgeArgs = {
  status: BadgeStatus;
  variant: BadgeVariant;
  size: BadgeSize;
  showIcon?: boolean;
  text?: string;
};

const defaultArgs = {
  status: BadgeStatus.SUCCESS,
  variant: BadgeVariant.FILLED,
  size: BadgeSize.MD,
  text: 'Status',
  showIcon: true,
};

const ICON_FOR_STATUS: Record<string, string | null> = {
  [BadgeStatus.ERROR]: CARBON_ICON_NAMES.WARNING__FILLED,
  [BadgeStatus.WARNING]: CARBON_ICON_NAMES.WARNING__FILLED,
  [BadgeStatus.SUCCESS]: CARBON_ICON_NAMES.CHECKMARK__FILLED,
  [BadgeStatus.INFO]: CARBON_ICON_NAMES.INFORMATION__FILLED,
  [BadgeStatus.DEFAULT]: CARBON_ICON_NAMES.CIRCLE_DASH,
};

const getIconSize = (size: BadgeSize) => (size === BadgeSize.XS ? IconSize['2XS'] : IconSize.SM);

const meta: Meta = {
  title: 'Atoms/Badge',
  component: 'cor-badge',
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: Object.values(BadgeStatus),
      description: 'Semantic status of the badge',
      table: {
        defaultValue: { summary: BadgeStatus.DEFAULT },
      },
    },
    variant: {
      control: 'select',
      options: Object.values(BadgeVariant),
      description: 'Visual style variant',
      table: {
        defaultValue: { summary: BadgeVariant.FILLED },
      },
    },
    size: {
      control: 'select',
      options: Object.values(BadgeSize),
      description: 'Size of the badge',
      table: {
        defaultValue: { summary: BadgeSize.MD },
      },
    },
    showIcon: {
      control: 'boolean',
      description: 'Show icon in the badge',
      table: { defaultValue: { summary: 'true' } },
    },
    text: {
      control: 'text',
      description: 'Default slot text content',
    },
  },
};

export default meta;
type Story = StoryObj<BadgeArgs>;

const render = (args: BadgeArgs) => /*html*/ `
  <cor-badge
    status="${args.status}"
    variant="${args.variant}"
    size="${args.size}"
  >
    ${args.showIcon ? /*html*/ `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[args.status] ?? ''}" color="currentColor"></cor-icon>` : ''}
    ${args.text ?? ''}
  </cor-badge>
`;

export const Default: Story = {
  args: defaultArgs,
  render,
};

export const AllVariantsTable: Story = {
  argTypes: {
    status: { control: false },
    variant: { control: false },
  },
  args: { ...defaultArgs } as BadgeArgs,
  render: (args: Partial<BadgeArgs>) => {
    const statuses: Array<{ key: string; label: string }> = [
      { key: BadgeStatus.ERROR, label: 'error' },
      { key: BadgeStatus.WARNING, label: 'warning' },
      { key: BadgeStatus.SUCCESS, label: 'success' },
      { key: BadgeStatus.INFO, label: 'info' },
      { key: BadgeStatus.DEFAULT, label: 'default' },
    ];

    const variants = ['filled', 'muted', 'plain', 'dot'];

    // use shared ICON_FOR_STATUS and getIconSize helpers above

    const rows = statuses
      .map(s => {
        const cells = variants
          .map(v => {
            if (v === 'dot') {
              return `<div style="text-align: center;"><cor-badge status="${s.key}" variant="${v}" size="${args.size}">${args.text ?? ''}</cor-badge></div>`;
            }

            const iconName = ICON_FOR_STATUS[s.key] ?? '';
            const icon =
              args.showIcon && iconName
                ? /*html*/ `<cor-icon slot="icon" size="${getIconSize(args.size ?? BadgeSize.MD)}" name="${iconName}" color="currentColor"></cor-icon>`
                : '';

            return `<div style="text-align: center;"><cor-badge status="${s.key}" variant="${v}" size="${args.size}">${icon}${args.text ?? ''}</cor-badge></div>`;
          })
          .join('\n');

        return `<div>${s.label}</div>\n${cells}`;
      })
      .join('\n');

    return /*html*/ `
      <div style="display: grid; grid-template-columns: auto repeat(4, 1fr); gap: 16px; align-items: center; font-family: sans-serif; font-size: 13px;">
        <div style="font-weight: 600;">Status / Variant</div>
        <div style="font-weight: 600; text-align: center;">filled</div>
        <div style="font-weight: 600; text-align: center;">muted</div>
        <div style="font-weight: 600; text-align: center;">plain</div>
        <div style="font-weight: 600; text-align: center;">dot</div>

        ${rows}
      </div>
    `;
  },
};

export const AllSizesTable: Story = {
  argTypes: {
    size: {
      control: false,
    },
    showIcon: {
      control: false,
    },
    variant: {
      control: false,
    },
  },
  args: { ...defaultArgs } as BadgeArgs,
  render: (args: BadgeArgs) => /*html*/ `
    <div style="display: grid; grid-template-columns: auto repeat(4, 1fr); gap: 16px; align-items: center; font-family: sans-serif; font-size: 13px;">
      <div style="font-weight: 600;">Size</div>
      <div style="font-weight: 600; text-align: center;">Label only</div>
      <div style="font-weight: 600; text-align: center;">With icon</div>
      <div style="font-weight: 600; text-align: center;">Icon only</div>
      <div style="font-weight: 600; text-align: center;">Dot</div>

      <div>md (20px)</div>
      <div style="text-align: center;">
        <cor-badge status="${args.status}" variant="filled" size="md">${args.text}</cor-badge>
      </div>
      <div style="text-align: center;">
        <cor-badge status="${args.status}" variant="filled" size="md">
          <cor-icon slot="icon" size="${IconSize.SM}" name="${ICON_FOR_STATUS[BadgeStatus.ERROR]}" color="currentColor"></cor-icon>
          ${args.text}
        </cor-badge>
      </div>
      <div style="text-align: center;">
        <cor-badge status="${args.status}" variant="filled" size="md">
          <cor-icon slot="icon" size="${IconSize.SM}" name="${ICON_FOR_STATUS[BadgeStatus.ERROR]}" color="currentColor"></cor-icon>
        </cor-badge>
      </div>
      <div style="text-align: center;">
        <cor-badge status="${args.status}" variant="dot" size="md">${args.text}</cor-badge>
      </div>

      <div>xs (16px)</div>
      <div style="text-align: center;">
        <cor-badge status="${args.status}" variant="filled" size="xs">${args.text}</cor-badge>
      </div>
      <div style="text-align: center;">
        <cor-badge status="${args.status}" variant="filled" size="xs">
          <cor-icon slot="icon" size="${IconSize['2XS']}" name="${ICON_FOR_STATUS[BadgeStatus.ERROR]}" color="currentColor"></cor-icon>
          ${args.text}
        </cor-badge>
      </div>
      <div style="text-align: center;">
        <cor-badge status="${args.status}" variant="filled" size="xs">
          <cor-icon slot="icon" size="${IconSize['2XS']}" name="${ICON_FOR_STATUS[BadgeStatus.ERROR]}" color="currentColor"></cor-icon>
        </cor-badge>
      </div>
      <div style="text-align: center;">
        <cor-badge status="${args.status}" variant="dot" size="xs">${args.text}</cor-badge>
      </div>
    </div>
  `,
};

export const WithIcon: Story = {
  argTypes: {
    showIcon: {
      control: false,
    },
    status: {
      control: false,
    },
    text: {
      control: false,
    },
  },
  args: { ...defaultArgs, showIcon: true } as BadgeArgs,
  render: (args: BadgeArgs) => /*html*/ `
    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
      <cor-badge status="error" variant="${args.variant}" size="${args.size}">
        <cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.ERROR]}" color="currentColor"></cor-icon>
        Error
      </cor-badge>
      <cor-badge status="warning" variant="${args.variant}" size="${args.size}">
        <cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.WARNING]}" color="currentColor"></cor-icon>
        Warning
      </cor-badge>
      <cor-badge status="success" variant="${args.variant}" size="${args.size}">
        <cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.SUCCESS]}" color="currentColor"></cor-icon>
        Success
      </cor-badge>
      <cor-badge status="info" variant="${args.variant}" size="${args.size}">
        <cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.INFO]}" color="currentColor"></cor-icon>
        Info
      </cor-badge>
      <cor-badge status="default" variant="${args.variant}" size="${args.size}">
        <cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.DEFAULT]}" color="currentColor"></cor-icon>
        Default
      </cor-badge>
    </div>
  `,
};

export const MutedVariant: Story = {
  argTypes: {
    status: {
      control: false,
    },
    text: {
      control: false,
    },
    variant: {
      control: false,
    },
  },
  args: { ...defaultArgs, variant: BadgeVariant.MUTED } as BadgeArgs,
  render: (args: BadgeArgs) => /*html*/ `
    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
      <cor-badge status="error" variant="muted" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.ERROR]}" color="currentColor"></cor-icon>` : ''}Error</cor-badge>
      <cor-badge status="warning" variant="muted" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.WARNING]}" color="currentColor"></cor-icon>` : ''}Warning</cor-badge>
      <cor-badge status="success" variant="muted" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.SUCCESS]}" color="currentColor"></cor-icon>` : ''}Success</cor-badge>
      <cor-badge status="info" variant="muted" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.INFO]}" color="currentColor"></cor-icon>` : ''}Info</cor-badge>
      <cor-badge status="default" variant="muted" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.DEFAULT]}" color="currentColor"></cor-icon>` : ''}Default</cor-badge>
    </div>
  `,
};

export const PlainVariant: Story = {
  argTypes: {
    status: {
      control: false,
    },
    text: {
      control: false,
    },
    variant: {
      control: false,
    },
  },
  args: { ...defaultArgs, variant: BadgeVariant.PLAIN } as BadgeArgs,
  render: (args: BadgeArgs) => /*html*/ `
    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
      <cor-badge status="error" variant="plain" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.ERROR]}" color="currentColor"></cor-icon>` : ''}Error</cor-badge>
      <cor-badge status="warning" variant="plain" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.WARNING]}" color="currentColor"></cor-icon>` : ''}Warning</cor-badge>
      <cor-badge status="success" variant="plain" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.SUCCESS]}" color="currentColor"></cor-icon>` : ''}Success</cor-badge>
      <cor-badge status="info" variant="plain" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.INFO]}" color="currentColor"></cor-icon>` : ''}Info</cor-badge>
      <cor-badge status="default" variant="plain" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.DEFAULT]}" color="currentColor"></cor-icon>` : ''}Default</cor-badge>
    </div>
  `,
};

export const DotVariant: Story = {
  argTypes: {
    status: {
      control: false,
    },
    text: {
      control: false,
    },
    variant: {
      control: false,
    },
  },
  args: { ...defaultArgs, variant: BadgeVariant.DOT } as BadgeArgs,
  render: (args: BadgeArgs) => /*html*/ `
    <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
      <cor-badge status="error" variant="dot" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.ERROR]}" color="currentColor"></cor-icon>` : ''}Error</cor-badge>
      <cor-badge status="warning" variant="dot" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.WARNING]}" color="currentColor"></cor-icon>` : ''}Warning</cor-badge>
      <cor-badge status="success" variant="dot" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.SUCCESS]}" color="currentColor"></cor-icon>` : ''}Active</cor-badge>
      <cor-badge status="info" variant="dot" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.INFO]}" color="currentColor"></cor-icon>` : ''}Info</cor-badge>
      <cor-badge status="default" variant="dot" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.DEFAULT]}" color="currentColor"></cor-icon>` : ''}Default</cor-badge>
    </div>
  `,
};

export const DefaultSlot: Story = {
  argTypes: {
    status: {
      control: false,
    },
    text: {
      control: false,
    },
    variant: {
      control: false,
    },
  },
  args: { ...defaultArgs } as BadgeArgs,
  render: (args: BadgeArgs) => /*html*/ `
    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
      <cor-badge status="error" variant="filled" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.ERROR]}" color="currentColor"></cor-icon>` : ''}Critical</cor-badge>
      <cor-badge status="success" variant="muted" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.SUCCESS]}" color="currentColor"></cor-icon>` : ''}Resolved</cor-badge>
      <cor-badge status="warning" variant="plain" size="${args.size}">${args.showIcon ? `<cor-icon slot="icon" size="${getIconSize(args.size)}" name="${ICON_FOR_STATUS[BadgeStatus.WARNING]}" color="currentColor"></cor-icon>` : ''}Review</cor-badge>
    </div>
  `,
};
