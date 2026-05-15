/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */

import { BreadcrumbsEllipsisListPosition } from './cor-breadcrumbs-ellipsis.enums';

type BreadcrumbsEllipsisStoryArgs = {
  disabled: boolean;
  listPosition: BreadcrumbsEllipsisListPosition;
};

const defaultArgs: BreadcrumbsEllipsisStoryArgs = {
  disabled: false,
  listPosition: BreadcrumbsEllipsisListPosition.AUTO,
};

const renderEllipsis = (args: Partial<BreadcrumbsEllipsisStoryArgs>) => {
  const disabled = args.disabled ? 'disabled' : '';

  return /*html*/ `
    <div style="padding: 40px; display: flex; align-items: center; font-size: 14px;">
      <cor-breadcrumbs-ellipsis
        list-position="${args.listPosition}"
        ${disabled}
      >
        <cor-select-item variant="label-only" label="Projects" value="projects"></cor-select-item>
        <cor-select-item variant="label-only" label="Team Alpha" value="team-alpha"></cor-select-item>
        <cor-select-item variant="label-only" label="Sprint 12" value="sprint-12"></cor-select-item>
      </cor-breadcrumbs-ellipsis>
    </div>
  `;
};

const meta: Meta = {
  title: 'Atoms/Breadcrumbs Ellipsis',
  component: 'cor-breadcrumbs-ellipsis',
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean', description: 'Disabled state' },
    listPosition: {
      control: 'select',
      options: Object.values(BreadcrumbsEllipsisListPosition),
      description: 'Dropdown position',
    },
  },
  render: renderEllipsis,
};
export default meta;

export const Default: StoryObj = {
  args: defaultArgs,
};

export const Open: StoryObj = {
  args: {
    ...defaultArgs,
    listPosition: BreadcrumbsEllipsisListPosition.BOTTOM,
  },
  render: (args: Partial<BreadcrumbsEllipsisStoryArgs>) => /*html*/ `
    <div style="padding: 40px; display: flex; align-items: center; font-size: 14px;">
      <cor-breadcrumbs-ellipsis
      id="open-ellipsis"
        list-position="${args.listPosition}"
        ${args.disabled ? 'disabled' : ''}
        >
        <cor-select-item variant="label-only" label="Projects" value="projects"></cor-select-item>
        <cor-select-item variant="label-only" label="Team Alpha" value="team-alpha"></cor-select-item>
        <cor-select-item variant="label-only" label="Sprint 12" value="sprint-12"></cor-select-item>
      </cor-breadcrumbs-ellipsis>
    </div>
  `,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // Wait for the component to be fully rendered
    await new Promise(resolve => setTimeout(resolve, 250));

    const el = canvasElement.querySelector<HTMLElement>('#open-ellipsis');
    const btn = el?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
  },
};

export const DisabledState: StoryObj = {
  args: {
    ...defaultArgs,
    disabled: true,
  },
};

export const PositionTop: StoryObj = {
  args: {
    ...defaultArgs,
    listPosition: BreadcrumbsEllipsisListPosition.TOP,
  },
  render: (args: Partial<BreadcrumbsEllipsisStoryArgs>) => /*html*/ `
    <div style="padding: 120px 40px 40px; display: flex; align-items: center; font-size: 14px;">
      <cor-breadcrumbs-ellipsis
        id="top-ellipsis"
        list-position="${args.listPosition}"
        ${args.disabled ? 'disabled' : ''}
      >
        <cor-select-item variant="label-only" label="Projects" value="projects"></cor-select-item>
        <cor-select-item variant="label-only" label="Team Alpha" value="team-alpha"></cor-select-item>
        <cor-select-item variant="label-only" label="Sprint 12" value="sprint-12"></cor-select-item>
      </cor-breadcrumbs-ellipsis>
    </div>
  `,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const el = canvasElement.querySelector<HTMLElement>('#top-ellipsis');
    const btn = el?.shadowRoot?.querySelector<HTMLButtonElement>('.ellipsis-btn');
    btn?.click();
  },
};
