/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { AccordionSize, AccordionIconPosition } from './cor-accordion.enums';
import { ICON_NAMES } from '../..';

interface AccordionStoryArgs {
  size: AccordionSize;
  iconPosition: AccordionIconPosition;
  open: boolean;
  disabled: boolean;
  skeleton: boolean;
  summaryText: string;
  contentText: string;
}

const meta: Meta<AccordionStoryArgs> = {
  title: 'Molecules/Accordion',
  component: 'cor-accordion',
  tags: ['autodocs'],
  argTypes: {
    size: {
      options: Object.values(AccordionSize),
      control: { type: 'select' },
    },
    iconPosition: {
      options: Object.values(AccordionIconPosition),
      control: { type: 'select' },
    },
    open: { control: { type: 'boolean' } },
    disabled: { control: { type: 'boolean' } },
    skeleton: { control: { type: 'boolean' } },
    summaryText: { control: { type: 'text' } },
    contentText: { control: { type: 'text' } },
  },
  args: {
    size: AccordionSize.MD,
    iconPosition: AccordionIconPosition.LEFT,
    open: false,
    disabled: false,
    skeleton: false,
    summaryText: 'Accordion',
    contentText:
      'The accordion component delivers large amounts of content in a small space through progressive disclosure. The user gets key details about the underlying content and can choose to expand that content.',
  },
};

export default meta;
type Story = StoryObj<AccordionStoryArgs>;

const render = (args: AccordionStoryArgs) => /*html*/ `
  <div style="width: 400px;">
    <cor-accordion
      size=${args.size}
      icon-position=${args.iconPosition}
      ${args.open ? 'open' : ''}
      ${args.disabled ? 'disabled' : ''}
      ${args.skeleton ? 'skeleton' : ''}
    >
      <span slot="summary">${args.summaryText}</span>

      <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
        <cor-typography variant="body-md" color="color-neutral-text-weak">
          <p>${args.contentText}</p>
          </cor-typography>
          <cor-slot size="lg"></cor-slot>
      </div>
    </cor-accordion>
  </div>
`;

export const Default: Story = {
  render,
};

export const OpenByDefault: Story = {
  render,
  args: {
    open: true,
  },
};

export const IconRight: Story = {
  render,
  args: {
    iconPosition: AccordionIconPosition.RIGHT,
  },
};

export const Disabled: Story = {
  argTypes: {
    disabled: {
      control: false,
    },
  },
  args: {
    disabled: true,
  },
  render: (args: AccordionStoryArgs) => /*html*/ `
    <div style="width: 400px;">
      <cor-accordion
        size=${args.size}
        icon-position=${args.iconPosition}
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      >
        <span slot="summary" style="display: flex; align-items: center; gap: 8px;">
          Accordion with badge
          <cor-badge-interactive size="md">
            <cor-icon slot="icon" size="2xs" name="${ICON_NAMES.WARNING}" color="currentColor"></cor-icon>
            13
          </cor-badge-interactive>
        </span>
        <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
          <cor-typography variant="body-md" color="color-neutral-text-weak">
            <p>${args.contentText}</p>
            </cor-typography>
            <cor-slot size="lg"></cor-slot>
        </div>
      </cor-accordion>
    </div>
  `,
};

export const SkeletonCollapsed: Story = {
  args: {
    skeleton: true,
  },
  render: (args: AccordionStoryArgs) => /*html*/ `
    <div style="width: 400px;">
      <cor-accordion
        size=${args.size}
        icon-position=${args.iconPosition}
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      >
        <span slot="summary">${args.summaryText}</span>
        <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
          <cor-typography variant="body-md" color="color-neutral-text-weak">
            <p>${args.contentText}</p>
            </cor-typography>
            <cor-slot size="lg"></cor-slot>
        </div>
      </cor-accordion>
    </div>
  `,
};

export const SkeletonExpanded: Story = {
  args: {
    skeleton: true,
    open: true,
  },
  render: (args: AccordionStoryArgs) => /*html*/ `
    <div style="width: 400px;">
      <cor-accordion
        size=${args.size}
        icon-position=${args.iconPosition}
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      >
        <span slot="summary">${args.summaryText}</span>
        <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
          <cor-typography variant="body-md" color="color-neutral-text-weak">
            <p>${args.contentText}</p>
            </cor-typography>
            <cor-slot size="lg"></cor-slot>
        </div>
      </cor-accordion>
    </div>
  `,
};

export const SizeSM: Story = {
  render,
  args: {
    size: AccordionSize.SM,
    summaryText: 'Small Accordion',
  },
};

export const IconPositions: Story = {
  argTypes: {
    iconPosition: {
      control: false,
    },
  },
  render: (args: AccordionStoryArgs) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 0; width: 400px;">
      <cor-accordion
        size=${args.size}
        icon-position="left"
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      >
        <span slot="summary">Icon Left (default)</span>
        <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
          <cor-typography variant="body-md" color="color-neutral-text-weak">
            <p>${args.contentText}</p>
            </cor-typography>
            <cor-slot size="lg"></cor-slot>
        </div>
      </cor-accordion>
      <cor-accordion
        size=${args.size}
        icon-position="right"
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      >
        <span slot="summary">Icon Right</span>
        <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
          <cor-typography variant="body-md" color="color-neutral-text-weak">
            <p>${args.contentText}</p>
            </cor-typography>
            <cor-slot size="lg"></cor-slot>
        </div>
      </cor-accordion>
    </div>
  `,
};

export const AllStates: Story = {
  argTypes: {
    open: {
      control: false,
    },
    disabled: {
      control: false,
    },
    skeleton: {
      control: false,
    },
  },
  render: (args: AccordionStoryArgs) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; width: 400px;">
      <div>
        <p style="font-size: 12px; color: var(--color-neutral-text-weaker); margin: 0 0 4px;">Default (collapsed)</p>
        <cor-accordion
          size=${args.size}
          icon-position=${args.iconPosition}
        >
          <span slot="summary">Default collapsed</span>
          <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
            <cor-typography variant="body-md" color="color-neutral-text-weak">
              <p>${args.contentText}</p>
              </cor-typography>
              <cor-slot size="lg"></cor-slot>
          </div>
        </cor-accordion>
      </div>
      <div>
        <p style="font-size: 12px; color: var(--color-neutral-text-weaker); margin: 0 0 4px;">Expanded</p>
        <cor-accordion
          size=${args.size}
          icon-position=${args.iconPosition}
          open
        >
          <span slot="summary">Expanded state</span>
          <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
            <cor-typography variant="body-md" color="color-neutral-text-weak">
              <p>${args.contentText}</p>
              </cor-typography>
              <cor-slot size="lg"></cor-slot>
          </div>
        </cor-accordion>
      </div>
      <div>
        <p style="font-size: 12px; color: var(--color-neutral-text-weaker); margin: 0 0 4px;">Disabled</p>
        <cor-accordion
          size=${args.size}
          icon-position=${args.iconPosition}
          disabled
        >
          <span slot="summary">Disabled</span>
          <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
            <cor-typography variant="body-md" color="color-neutral-text-weak">
              <p>${args.contentText}</p>
              </cor-typography>
              <cor-slot size="lg"></cor-slot>
          </div>
        </cor-accordion>
      </div>
      <div>
        <p style="font-size: 12px; color: var(--color-neutral-text-weaker); margin: 0 0 4px;">Skeleton</p>
        <cor-accordion
          size=${args.size}
          icon-position=${args.iconPosition}
          skeleton
        ></cor-accordion>
      </div>
      <div>
        <p style="font-size: 12px; color: var(--color-neutral-text-weaker); margin: 0 0 4px;">Skeleton expanded</p>
        <cor-accordion
          size=${args.size}
          icon-position=${args.iconPosition}
          skeleton
          open
        ></cor-accordion>
      </div>
    </div>
  `,
};

export const AllSizes: Story = {
  argTypes: {
    size: {
      control: false,
    },
  },
  args: {
    open: true,
  },
  render: (args: AccordionStoryArgs) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; width: 400px;">
      <div>
        <p style="font-size: 12px; color: var(--color-neutral-text-weaker); margin: 0 0 4px;">MD size</p>
        <cor-accordion
          size="${AccordionSize.MD}"
          icon-position=${args.iconPosition}
          ${args.open ? 'open' : ''}
          ${args.disabled ? 'disabled' : ''}
          ${args.skeleton ? 'skeleton' : ''}
        >
          <span slot="summary">Medium Accordion</span>
          <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
            <cor-typography variant="body-md" color="color-neutral-text-weak">
              <p>${args.contentText}</p>
              </cor-typography>
              <cor-slot size="lg"></cor-slot>
          </div>
        </cor-accordion>
      </div>
      <div>
        <p style="font-size: 12px; color: var(--color-neutral-text-weaker); margin: 0 0 4px;">SM size</p>
        <cor-accordion
          size="${AccordionSize.SM}"
          icon-position=${args.iconPosition}
          ${args.open ? 'open' : ''}
          ${args.disabled ? 'disabled' : ''}
          ${args.skeleton ? 'skeleton' : ''}
        >
          <span slot="summary">Small Accordion</span>
          <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
            <cor-typography variant="body-md" color="color-neutral-text-weak">
              <p>${args.contentText}</p>
              </cor-typography>
              <cor-slot size="lg"></cor-slot>
          </div>
        </cor-accordion>
      </div>
    </div>
  `,
};

export const MultipleAccordions: Story = {
  render: (args: AccordionStoryArgs) => /*html*/ `
    <div style="width: 400px;">
      <cor-accordion
        size=${args.size}
        icon-position=${args.iconPosition}
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      >
        <span slot="summary">Section One</span>
        <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
          <cor-typography variant="body-md" color="color-neutral-text-weak">
            <p>${args.contentText}</p>
            </cor-typography>
            <cor-slot size="lg"></cor-slot>
        </div>
      </cor-accordion>
      <cor-accordion
        size=${args.size}
        icon-position=${args.iconPosition}
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      >
        <span slot="summary">Section Two</span>
        <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
          <cor-typography variant="body-md" color="color-neutral-text-weak">
            <p>${args.contentText}</p>
            </cor-typography>
            <cor-slot size="lg"></cor-slot>
        </div>
      </cor-accordion>
      <cor-accordion
        size=${args.size}
        icon-position=${args.iconPosition}
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      >
        <span slot="summary">Section Three</span>
        <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
          <cor-typography variant="body-md" color="color-neutral-text-weak">
            <p>${args.contentText}</p>
            </cor-typography>
            <cor-slot size="lg"></cor-slot>
        </div>
      </cor-accordion>
    </div>
  `,
};

export const WithBadge: Story = {
  render: (args: AccordionStoryArgs) => /*html*/ `
    <div style="width: 400px;">
      <cor-accordion
        size=${args.size}
        icon-position=${args.iconPosition}
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.skeleton ? 'skeleton' : ''}
      >
        <span slot="summary" style="display: flex; align-items: center; gap: 8px;">
          Accordion with badge
          <cor-badge-interactive size="md">
            <cor-icon slot="icon" size="2xs" name="${ICON_NAMES.WARNING}" color="currentColor"></cor-icon>
            13
          </cor-badge-interactive>
        </span>
        <div style="display: flex; flex-direction: column; gap: 16px; justify-content: space-between; align-items: center;">
          <cor-typography variant="body-md" color="color-neutral-text-weak">
            <p>${args.contentText}</p>
            </cor-typography>
            <cor-slot size="lg"></cor-slot>
        </div>
      </cor-accordion>
    </div>
  `,
};
