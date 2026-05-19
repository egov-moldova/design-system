/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

const meta: Meta = {
  title: 'Utilities/Skeleton',
  component: 'cor-skeleton',
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: 'text',
      description: 'Width of the skeleton loader',
      table: {
        defaultValue: { summary: '100%' },
      },
    },
    height: {
      control: 'text',
      description: 'Height of the skeleton loader',
      table: {
        defaultValue: { summary: 'var(--spacing-20)' },
      },
    },
    borderRadius: {
      control: 'text',
      description: 'Border radius of the skeleton loader',
      table: {
        defaultValue: { summary: 'var(--border-radius-8)' },
      },
    },
    backgroundColor: {
      control: 'color',
      description: 'Background color of the skeleton loader',
      table: {
        defaultValue: { summary: 'var(--skeleton-background-color)' },
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => {
    const widthAttr = args.width ? `width="${args.width}"` : '';
    const heightAttr = args.height ? `height="${args.height}"` : '';
    const borderRadiusAttr = args.borderRadius ? `border-radius="${args.borderRadius}"` : '';
    const backgroundColorAttr = args.backgroundColor ? `background-color="${args.backgroundColor}"` : '';

    return /*html*/ `<cor-skeleton ${widthAttr} ${heightAttr} ${borderRadiusAttr} ${backgroundColorAttr}></cor-skeleton>`;
  },
  args: {
    width: '',
    height: '',
    borderRadius: '',
    backgroundColor: '',
  },
};

export const CustomWidth: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => /*html*/ `<cor-skeleton width="${args.width}"></cor-skeleton>`,
  args: {
    width: '200px',
  },
};

export const CustomHeight: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => /*html*/ `<cor-skeleton height="${args.height}"></cor-skeleton>`,
  args: {
    height: '40px',
  },
};

export const CustomBorderRadius: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => /*html*/ `<cor-skeleton border-radius="${args.borderRadius}"></cor-skeleton>`,
  args: {
    borderRadius: '16px',
  },
};

export const Circle: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) =>
    /*html*/ `<cor-skeleton width="${args.width}" height="${args.height}" border-radius="${args.borderRadius}"></cor-skeleton>`,
  args: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
  },
};

export const Rectangle: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => /*html*/ `<cor-skeleton width="${args.width}" height="${args.height}"></cor-skeleton>`,
  args: {
    width: '300px',
    height: '200px',
  },
};

export const TextLine: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => /*html*/ `<cor-skeleton width="${args.width}" height="${args.height}"></cor-skeleton>`,
  args: {
    width: '100%',
    height: '16px',
  },
};

export const MultipleLines: Story = {
  argTypes: {
    width: {
      control: false,
    },
  },
  args: {
    height: '16px',
    backgroundColor: 'var(--color-background-base-default)',
    borderRadius: '4px',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 12px; width: 300px;">
      <cor-skeleton width="100%" height="${args.height}" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="90%" height="${args.height}" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="80%" height="${args.height}" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Multiple lines skeleton with customizable height, background color, and border radius. Width values are intentionally varied (100%, 90%, 80%) for visual hierarchy.',
      },
    },
  },
};

export const CardSkeleton: Story = {
  argTypes: {
    height: {
      control: false,
    },
    width: {
      control: false,
    },
  },
  args: {
    backgroundColor: 'var(--color-background-base-default)',
    borderRadius: '8px',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; width: 300px; padding: 16px; border: 1px solid var(--color-border-base-default); border-radius: 8px;">
      <cor-skeleton width="100%" height="200px" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="80%" height="24px" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="100%" height="16px" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="90%" height="16px" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Card skeleton with customizable background color and border radius. Width and height values are fixed for proper card layout.',
      },
    },
  },
};

export const ProfileSkeleton: Story = {
  argTypes: {
    height: {
      control: false,
    },
    width: {
      control: false,
    },
    avatarBackgroundColor: {
      control: 'color',
      description: 'Background color of the avatar skeleton',
      table: {
        defaultValue: { summary: 'var(--color-background-base-default)' },
      },
    },
    textBackgroundColor: {
      control: 'color',
      description: 'Background color of the title text skeleton',
      table: {
        defaultValue: { summary: 'var(--color-background-base-default)' },
      },
    },
    subtitleBackgroundColor: {
      control: 'color',
      description: 'Background color of the subtitle text skeleton',
      table: {
        defaultValue: { summary: 'var(--color-background-base-default)' },
      },
    },
    borderRadius: {
      control: 'text',
      description: 'Border radius of the avatar skeleton',
      table: {
        defaultValue: { summary: '50%' },
      },
    },
  },
  args: {
    avatarBackgroundColor: 'var(--color-background-base-default)',
    textBackgroundColor: 'var(--color-background-base-default)',
    subtitleBackgroundColor: 'var(--color-background-base-default)',
    borderRadius: '50%',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; gap: 16px; align-items: center;">
      <cor-skeleton width="64px" height="64px" border-radius="${args.borderRadius}" background-color="${args.avatarBackgroundColor}"></cor-skeleton>
      <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
        <cor-skeleton width="150px" height="20px" background-color="${args.textBackgroundColor}" border-radius="4px"></cor-skeleton>
        <cor-skeleton width="100px" height="16px" background-color="${args.subtitleBackgroundColor}" border-radius="4px"></cor-skeleton>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Profile skeleton with customizable background colors for avatar and text elements, and adjustable border radius. Width and height values are fixed for proper profile layout.',
      },
    },
  },
};

export const CustomBackgroundColor: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => /*html*/ `<cor-skeleton background-color="${args.backgroundColor}"></cor-skeleton>`,
  args: {
    backgroundColor: 'var(--color-background-brand-default-active)',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the new backgroundColor prop for custom skeleton colors.',
      },
    },
  },
};

export const CustomColorAndRadius: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) =>
    /*html*/ `<cor-skeleton width="${args.width}" height="${args.height}" border-radius="${args.borderRadius}" background-color="${args.backgroundColor}"></cor-skeleton>`,
  args: {
    width: '120px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-background-brand-default-active)',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows combined customization with both backgroundColor and borderRadius props.',
      },
    },
  },
};

export const ColoredCircle: Story = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) =>
    /*html*/ `<cor-skeleton width="${args.width}" height="${args.height}" border-radius="${args.borderRadius}" background-color="${args.backgroundColor}"></cor-skeleton>`,
  args: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-background-brand-secondary-active)',
  },
  parameters: {
    docs: {
      description: {
        story: 'Circle skeleton with custom background color.',
      },
    },
  },
};

export const ThemedMultipleLines: Story = {
  argTypes: {
    width: {
      control: false,
    },
  },
  args: {
    height: '16px',
    backgroundColor: 'var(--color-background-base-default)',
    borderRadius: '4px',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 12px; width: 300px;">
      <cor-skeleton width="100%" height="${args.height}" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="90%" height="${args.height}" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="80%" height="${args.height}" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'Multiple lines skeleton with themed background colors.',
      },
    },
  },
};

export const ThemedCardSkeleton: Story = {
  argTypes: {
    height: {
      control: false,
    },
    width: {
      control: false,
    },
  },
  args: {
    backgroundColor: 'var(--color-background-base-default)',
    borderRadius: '8px',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; width: 300px; padding: 16px; border: 1px solid var(--color-border-base-default); border-radius: 8px;">
      <cor-skeleton width="100%" height="200px" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="80%" height="24px" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="100%" height="16px" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
      <cor-skeleton width="90%" height="16px" background-color="${args.backgroundColor}" border-radius="${args.borderRadius}"></cor-skeleton>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'Card skeleton with themed background colors for different elements.',
      },
    },
  },
};

export const ThemedProfileSkeleton: Story = {
  render: () => /*html*/ `
    <div style="display: flex; gap: 16px; align-items: center;">
      <cor-skeleton width="64px" height="64px" border-radius="50%" background-color="var(--color-background-base-default)"></cor-skeleton>
      <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
        <cor-skeleton width="150px" height="20px" background-color="var(--color-background-base-default)"></cor-skeleton>
        <cor-skeleton width="100px" height="16px" background-color="var(--color-background-base-default)"></cor-skeleton>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'Profile skeleton with themed background colors for avatar and text elements.',
      },
    },
    controls: {
      disable: true,
    },
  },
};

export const TokenBasedCustomization: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; width: 400px;">
      <h4>Design Token Examples</h4>
      <div style="display: flex; gap: 8px; align-items: center;">
        <cor-skeleton width="16px" height="16px" border-radius="var(--border-radius-4)" background-color="var(--color-background-base-default)"></cor-skeleton>
        <span>Small muted skeleton</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <cor-skeleton width="24px" height="24px" border-radius="var(--border-radius-8)" background-color="var(--color-background-base-default-active)"></cor-skeleton>
        <span>Medium surface skeleton</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <cor-skeleton width="32px" height="32px" border-radius="var(--border-radius-12)" background-color="var(--color-background-base-tertiary)"></cor-skeleton>
        <span>Large border skeleton</span>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'Shows how to use design tokens with the backgroundColor prop for consistent theming.',
      },
    },
    controls: {
      disable: true,
    },
  },
};
