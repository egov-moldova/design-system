import { AvatarSize } from '../cor-avatar/cor-avatar.enums';

export default {
  title: 'Molecules/Avatar Group',
  component: 'cor-avatar-group',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(AvatarSize),
    },
    max: {
      control: {
        type: 'number',
        min: 1,
        max: 5,
        step: 1,
      },
      description: 'Maximum avatars to display before showing overflow (+N)',
      defaultValue: 5,
    },
  },
};

const renderAvatarGroup = (args: any) => {
  return /*html*/ `
    <cor-avatar-group size="${args.size}" max="${args.max}">
      <cor-avatar initials="AZ">
        <img slot="image" src="https://i.pravatar.cc/150?img=1" alt="Avatar" />
      </cor-avatar>
      <cor-avatar initials="BX">
        <img slot="image" src="https://i.pravatar.cc/150?img=2" alt="Avatar" />
      </cor-avatar>
      <cor-avatar initials="CW">
        <img slot="image" src="https://i.pravatar.cc/150?img=3" alt="Avatar" />
      </cor-avatar>
      <cor-avatar initials="DV">
        <img slot="image" src="https://i.pravatar.cc/150?img=7" alt="Avatar" />
      </cor-avatar>
      <cor-avatar initials="EY">
        <img slot="image" src="https://i.pravatar.cc/150?img=8" alt="Avatar" />
      </cor-avatar>
    </cor-avatar-group>
  `;
};

type AvatarGroupArgs = {
  size: AvatarSize;
  max?: number;
};

const defaultArgs: AvatarGroupArgs = {
  size: AvatarSize.MD,
  max: 5,
};

export const Default = {
  render: renderAvatarGroup,
  args: {
    ...defaultArgs,
  },
};

export const AllSizes = {
  argTypes: {
    size: { control: false },
  },
  args: {
    ...defaultArgs,
  },
  render: (args: AvatarGroupArgs) => {
    const sizes = Object.values(AvatarSize);

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        ${sizes
          .map(
            size => /*html*/ `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 600;">${size}</h4>
            <cor-avatar-group size="${size}" max=${args.max}>
              <cor-avatar initials="AZ">
                <img slot="image" src="https://i.pravatar.cc/150?img=1" alt="Avatar" />
              </cor-avatar>
              <cor-avatar initials="BX">
                <img slot="image" src="https://i.pravatar.cc/150?img=2" alt="Avatar" />
              </cor-avatar>
              <cor-avatar initials="CW">
                <img slot="image" src="https://i.pravatar.cc/150?img=3" alt="Avatar" />
              </cor-avatar>
              <cor-avatar initials="DV">
                <img slot="image" src="https://i.pravatar.cc/150?img=7" alt="Avatar" />
              </cor-avatar>
            </cor-avatar-group>
          </div>
        `,
          )
          .join('')}
      </div>
    `;
  },
};

export const WithMaxLimit = {
  argTypes: {
    max: { control: false },
  },
  args: {
    ...defaultArgs,
  },
  render: (args: AvatarGroupArgs) => {
    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Max 3 (shows +2 overflow)</h3>
          <cor-avatar-group size=${args.size} max="3">
            <cor-avatar initials="AZ">
              <img slot="image" src="https://i.pravatar.cc/150?img=1" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="BX">
              <img slot="image" src="https://i.pravatar.cc/150?img=2" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="CW">
              <img slot="image" src="https://i.pravatar.cc/150?img=3" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="DV">
              <img slot="image" src="https://i.pravatar.cc/150?img=7" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="EY">
              <img slot="image" src="https://i.pravatar.cc/150?img=8" alt="Avatar" />
            </cor-avatar>
          </cor-avatar-group>
        </div>

        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Max 4 (shows +3 overflow)</h3>
          <cor-avatar-group size=${args.size} max="4">
            <cor-avatar initials="AZ">
              <img slot="image" src="https://i.pravatar.cc/150?img=1" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="BX">
              <img slot="image" src="https://i.pravatar.cc/150?img=2" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="CW">
              <img slot="image" src="https://i.pravatar.cc/150?img=3" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="DV">
              <img slot="image" src="https://i.pravatar.cc/150?img=4" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="EY">
              <img slot="image" src="https://i.pravatar.cc/150?img=5" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="FX">
              <img slot="image" src="https://i.pravatar.cc/150?img=6" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="GW">
              <img slot="image" src="https://i.pravatar.cc/150?img=7" alt="Avatar" />
            </cor-avatar>
          </cor-avatar-group>
        </div>
      </div>
    `;
  },
};

export const MixedContent = {
  render: (args: AvatarGroupArgs) => {
    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Photos + Initials</h3>
          <cor-avatar-group size=${args.size} max=${args.max}>
            <cor-avatar initials="AZ">
              <img slot="image" src="https://i.pravatar.cc/150?img=1" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="BX">
              <img slot="image" src="https://i.pravatar.cc/150?img=2" alt="Avatar" />
            </cor-avatar>
            <cor-avatar initials="CW"></cor-avatar>
            <cor-avatar initials="DV"></cor-avatar>
          </cor-avatar-group>
        </div>

        <div>
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Initials Only</h3>
          <cor-avatar-group size=${args.size} max=${args.max}>
            <cor-avatar initials="AZ"></cor-avatar>
            <cor-avatar initials="BX"></cor-avatar>
            <cor-avatar initials="CW"></cor-avatar>
            <cor-avatar initials="DV"></cor-avatar>
          </cor-avatar-group>
        </div>
      </div>
    `;
  },
};
