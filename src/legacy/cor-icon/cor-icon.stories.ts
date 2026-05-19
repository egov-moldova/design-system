import { IconSize } from './cor-icon.types';
import { ICON_COLOR_OPTIONS } from './cor-icon.constants';
import ICON_NAMES from './assets/carbon-icon-names.json';

interface IconStoryArgs {
  name: string;
  color: string;
  size: IconSize;
  interactive: boolean;
  disabled: boolean;
  ariaLabel: string;
}

export default {
  title: 'Atoms/Icon',
  component: 'cor-icon',
  tags: ['autodocs'],
  argTypes: {
    name: {
      options: Object.values(ICON_NAMES),
      control: { type: 'select' },
    },
    color: {
      options: ICON_COLOR_OPTIONS,
      control: { type: 'select' },
    },
    size: {
      options: Object.values(IconSize),
      control: { type: 'select' },
    },
    interactive: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    ariaLabel: {
      control: { type: 'text' },
    },
  },
};

const renderIcon = (args: IconStoryArgs) => /*html*/ `
  <cor-icon
    name="${args.name}"
    color="${args.color}"
    size="${args.size}"
    ${args.interactive ? 'interactive' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
  ></cor-icon>
`;

export const Default = {
  render: (args: any) => renderIcon(args),
  args: {
    name: ICON_NAMES.ADD,
    color: 'neutral-icon-default',
    size: IconSize.LG,
    interactive: false,
    disabled: false,
    ariaLabel: '',
  },
};

export const Interactive = {
  render: (args: any) => renderIcon(args),
  args: {
    name: ICON_NAMES.ADD,
    color: 'neutral-icon-default',
    size: IconSize.LG,
    interactive: true,
    disabled: false,
    ariaLabel: 'Add item',
  },
};

export const Disabled = {
  render: (args: any) => renderIcon(args),
  args: {
    name: ICON_NAMES.ADD,
    color: 'neutral-icon-default',
    size: IconSize.LG,
    interactive: true,
    disabled: true,
    ariaLabel: 'Add item (disabled)',
  },
};

export const Sizes = {
  render: () => /*html*/ `
    <div style="display: flex; gap: 16px; align-items: center;">
      ${Object.values(IconSize)
        .map(size => `<cor-icon name="${ICON_NAMES.ADD}" color="neutral-icon-default" size="${size}"></cor-icon>`)
        .join('')}
    </div>
  `,
};
