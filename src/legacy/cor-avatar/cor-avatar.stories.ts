import { AvatarSize } from './cor-avatar.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { IconSize } from '../cor-icon/cor-icon.types';

type AvatarArgs = {
  size: AvatarSize;
  initials?: string;
  disabled: boolean;
  skeleton: boolean;
  showImage: boolean;
  showIcon: boolean;
};

const defaultArgs: AvatarArgs = {
  size: AvatarSize.LG,
  initials: 'AZ',
  disabled: false,
  skeleton: false,
  showImage: false,
  showIcon: false,
};

export default {
  title: 'Atoms/Avatar',
  component: 'cor-avatar',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(AvatarSize),
    },
    initials: {
      control: 'text',
      description: 'Initials to display (1-2 characters)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    skeleton: {
      control: 'boolean',
      description: 'Skeleton loading state',
    },
  },
};

const renderAvatar = (args: AvatarArgs) => {
  const attrs = [
    `size="${args.size}"`,
    args.initials ? `initials="${args.initials}"` : '',
    args.disabled ? 'disabled' : '',
    args.skeleton ? 'skeleton' : '',
  ]
    .filter(Boolean)
    .join(' ');

  let slotContent = '';
  if (args.showImage) {
    slotContent += /*html*/ `<img slot="image" src="https://i.pravatar.cc/150?img=5" alt="Avatar" />`;
  }
  if (args.showIcon) {
    slotContent += /*html*/ `<cor-icon slot="icon" name="${ICON_NAMES.USER__AVATAR}" size="${IconSize.SM}" color="currentColor"></cor-icon>`;
  }

  return /*html*/ `
    <cor-avatar ${attrs}>
      ${slotContent}
    </cor-avatar>
  `;
};

export const Default = {
  render: renderAvatar,
  args: { ...defaultArgs } as AvatarArgs,
};

export const DefaultWithImage = {
  render: renderAvatar,
  argTypes: {
    showImage: {
      control: false,
    },
    showIcon: {
      control: false,
    },
  },
  args: { ...defaultArgs, showImage: true } as AvatarArgs,
};

export const ActiveState = {
  argTypes: {
    disabled: {
      control: false,
    },
    skeleton: {
      control: false,
    },
    showImage: {
      control: false,
    },
    showIcon: {
      control: false,
    },
  },
  args: { ...defaultArgs } as AvatarArgs,
  render: (args: Partial<AvatarArgs>) => {
    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Active States</h3>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: var(--color-text-base-tertiary);">
            <strong>Active state (click):</strong> Click and hold any avatar to see the red border (2px).
            <br/>
            <strong>Active state (prop):</strong> Use the <code>active</code> prop for programmatic control.
            <br/>
            <strong>Hover state:</strong> Hover over any avatar to see the border color change.
          </p>
        </div>
        <div style="display: flex; gap: 24px; align-items: center;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <cor-avatar size="${args.size}" initials="${args.initials}"></cor-avatar>
            <span style="font-size: 12px; color: var(--color-text-base-tertiary);">Default</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <cor-avatar size="${args.size}" initials="${args.initials}" active></cor-avatar>
            <span style="font-size: 12px; color: var(--color-text-base-tertiary);">Active (prop)</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <cor-avatar size="${args.size}" initials="${args.initials}" active>
              <img slot="image" src="https://i.pravatar.cc/150?img=5" alt="Avatar" />
            </cor-avatar>
            <span style="font-size: 12px; color: var(--color-text-base-tertiary);">With Photo (active)</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <cor-avatar size="${args.size}" initials="${args.initials}" disabled active></cor-avatar>
            <span style="font-size: 12px; color: var(--color-text-base-tertiary);">Disabled</span>
          </div>
        </div>
      </div>
    `;
  },
};

export const AllSizesTable = {
  argTypes: {
    size: {
      control: false,
    },
  },
  args: { ...defaultArgs } as AvatarArgs,
  render: (args: Partial<AvatarArgs>) => {
    const sizes = Object.values(AvatarSize);

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">All Sizes with Initials</h3>
        <div style="display: flex; align-items: center; gap: 16px;">
          ${sizes
            .map(size => {
              const slotContent = args.showImage
                ? /*html*/ `<img slot="image" src="https://i.pravatar.cc/150?img=5" alt="Avatar" />`
                : '';
              return /*html*/ `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <cor-avatar
                size="${size}"
                ${args.initials ? `initials="${args.initials}"` : ''}
                ${args.disabled ? 'disabled' : ''}
                ${args.skeleton ? 'skeleton' : ''}
              >
                ${slotContent}
              </cor-avatar>
              <span style="font-size: 12px; color: var(--color-text-base-tertiary);">${size}</span>
            </div>
          `;
            })
            .join('')}
        </div>
      </div>
    `;
  },
};

export const AllStatesTable = {
  argTypes: {
    disabled: {
      control: false,
    },
    skeleton: {
      control: false,
    },
    showImage: {
      control: false,
    },
    showIcon: {
      control: false,
    },
  },
  args: { ...defaultArgs } as AvatarArgs,
  render: (args: Partial<AvatarArgs>) => {
    const states = [
      { name: 'Default', attrs: '' },
      { name: 'Hover', attrs: 'hovered', note: '' },
      { name: 'Active', attrs: 'active', note: '' },
      { name: 'Disabled', attrs: 'disabled' },
      { name: 'Skeleton', attrs: 'skeleton' },
    ];

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 32px;">
        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Initials Only</h3>
          <div style="display: flex; gap: 24px;">
            ${states
              .map(
                state => /*html*/ `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <cor-avatar size="${args.size}" initials="${args.initials}" ${state.attrs}></cor-avatar>
                <span style="font-size: 12px; color: var(--color-text-base-tertiary);">${state.name} ${state.note || ''}</span>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Photo Only</h3>
          <div style="display: flex; gap: 24px;">
            ${states
              .map(
                state => /*html*/ `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <cor-avatar size="${args.size}" initials="${args.initials}" ${state.attrs}>
                  <img slot="image" src="https://i.pravatar.cc/150?img=5" alt="Avatar" />
                </cor-avatar>
                <span style="font-size: 12px; color: var(--color-text-base-tertiary);">${state.name} ${state.note || ''}</span>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Icon Only</h3>
          <div style="display: flex; gap: 24px;">
            ${states
              .map(
                state => /*html*/ `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <cor-avatar size="${args.size}" initials="${args.initials}" ${state.attrs}>
                  <cor-icon slot="icon" name="${ICON_NAMES.USER__AVATAR}" size="${IconSize.SM}" color="currentColor"></cor-icon>
                </cor-avatar>
                <span style="font-size: 12px; color: var(--color-text-base-tertiary);">${state.name} ${state.note || ''}</span>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  },
};

export const AllCombinations = {
  argTypes: {
    size: {
      control: false,
    },
    skeleton: {
      control: false,
    },
    showImage: {
      control: false,
    },
    showIcon: {
      control: false,
    },
  },
  args: { ...defaultArgs } as AvatarArgs,
  render: (args: Partial<AvatarArgs>) => {
    const sizes = Object.values(AvatarSize);

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 32px;">
        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">All Sizes - Initials</h3>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            ${sizes
              .map(
                size => /*html*/ `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <cor-avatar
                  size="${size}"
                  initials="${args.initials}"
                  ${args.disabled ? 'disabled' : ''}
                ></cor-avatar>
                <span style="font-size: 12px; color: var(--color-text-base-tertiary);">${size}</span>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">All Sizes - Photo</h3>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            ${sizes
              .map(
                size => /*html*/ `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <cor-avatar
                  size="${size}"
                  initials="${args.initials}"
                  ${args.disabled ? 'disabled' : ''}
                >
                  <img slot="image" src="https://i.pravatar.cc/150?img=5" alt="Avatar" />
                </cor-avatar>
                <span style="font-size: 12px; color: var(--color-text-base-tertiary);">${size}</span>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">All Sizes - Skeleton</h3>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            ${sizes
              .map(
                size => /*html*/ `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <cor-avatar
                  size="${size}"
                  initials="${args.initials}"
                  ${args.disabled ? 'disabled' : ''}
                  skeleton
                ></cor-avatar>
                <span style="font-size: 12px; color: var(--color-text-base-tertiary);">${size}</span>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  },
};
