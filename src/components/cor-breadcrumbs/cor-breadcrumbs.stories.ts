/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { IconSize } from '../cor-icon/cor-icon.types';

const meta: Meta = {
  title: 'Molecules/Breadcrumbs',
  component: 'cor-breadcrumbs',
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean', description: 'Disable all breadcrumb items' },
    navLabel: { control: 'text', description: 'Accessible label for the nav landmark' },
  },
};
export default meta;

type BreadcrumbsStoryArgs = {
  disabled: boolean;
  navLabel: string;
};

const defaultArgs: BreadcrumbsStoryArgs = {
  disabled: false,
  navLabel: 'Breadcrumbs',
};

export const Default: StoryObj = {
  args: defaultArgs,
  render: (args: Partial<BreadcrumbsStoryArgs>) => /*html*/ `
    <div style="padding: 24px; font-size: 14px;">
      <cor-breadcrumbs
        nav-label="${args.navLabel}"
        ${args.disabled ? 'disabled' : ''}
      >
        <cor-link href="#" value="home" underline="none" aria-label="Home">
          <cor-icon slot="icon" name="${ICON_NAMES.HOME}" size="${IconSize.SM}" color="currentColor"></cor-icon>
        </cor-link>
        <cor-breadcrumbs-ellipsis>
          <cor-select-item variant="label-only" label="Projects" value="projects"></cor-select-item>
          <cor-select-item variant="label-only" label="Team Alpha" value="team-alpha"></cor-select-item>
        </cor-breadcrumbs-ellipsis>
        <cor-link href="#" value="projects" underline="none">Projects</cor-link>
        <cor-link href="#" value="team-alpha" underline="none">Team Alpha</cor-link>
        <cor-link href="#" value="sprint-11" underline="none">Sprint 11</cor-link>
        <cor-link href="#" value="sprint" underline="none">Sprint 12</cor-link>
        <cor-link href="#" value="tasks" underline="none">Tasks</cor-link>
        <cor-link href="#" value="backlog" underline="none">Backlog</cor-link>
        <span>Current Page</span>
      </cor-breadcrumbs>
    </div>
  `,
};

export const NoEllipsis: StoryObj = {
  args: defaultArgs,
  render: (args: Partial<BreadcrumbsStoryArgs>) => /*html*/ `
    <div style="padding: 24px; font-size: 14px;">
      <cor-breadcrumbs
        nav-label="${args.navLabel}"
        ${args.disabled ? 'disabled' : ''}
      >
        <cor-link href="#" value="home" underline="none" aria-label="Home">
          <cor-icon slot="icon" name="${ICON_NAMES.HOME}" size="${IconSize.SM}" color="currentColor"></cor-icon>
        </cor-link>
        <cor-link href="#" value="projects" underline="none">Projects</cor-link>
        <cor-link href="#" value="sprint" underline="none">Sprint 12</cor-link>
        <span>Current Page</span>
      </cor-breadcrumbs>
    </div>
  `,
};

export const DisabledAll: StoryObj = {
  args: defaultArgs,
  render: (args: Partial<BreadcrumbsStoryArgs>) => /*html*/ `
    <div style="padding: 24px; font-size: 14px;">
      <cor-breadcrumbs
        nav-label="${args.navLabel}"
        ${args.disabled ? 'disabled' : ''}
      >
        <cor-link href="#" value="home" underline="none" aria-label="Home">
          <cor-icon slot="icon" name="${ICON_NAMES.HOME}" size="${IconSize.SM}" color="currentColor"></cor-icon>
        </cor-link>
        <cor-breadcrumbs-ellipsis>
          <cor-select-item variant="label-only" label="Projects" value="projects"></cor-select-item>
        </cor-breadcrumbs-ellipsis>
        <cor-link href="#" value="sprint" underline="none">Sprint 12</cor-link>
        <span>Current Page</span>
      </cor-breadcrumbs>
    </div>
  `,
};

export const SingleItem: StoryObj = {
  args: defaultArgs,
  render: (args: Partial<BreadcrumbsStoryArgs>) => /*html*/ `
    <div style="padding: 24px; font-size: 14px;">
      <cor-breadcrumbs
        nav-label="${args.navLabel}"
        ${args.disabled ? 'disabled' : ''}
      >
        <span>Current Page</span>
      </cor-breadcrumbs>
    </div>
  `,
};

export const SkeletonSlotted: StoryObj = {
  args: defaultArgs,
  argTypes: {
    disabled: { control: false },
  },
  render: (args: Partial<BreadcrumbsStoryArgs>) => /*html*/ `
    <div style="padding: 24px; font-size: 14px;">
      <cor-breadcrumbs
        nav-label="${args.navLabel}"
        ${args.disabled ? 'disabled' : ''}
      >
        <cor-link skeleton icon-only></cor-link>
        <cor-link skeleton></cor-link>
        <cor-link skeleton></cor-link>
        <cor-link skeleton></cor-link>
        <cor-link skeleton></cor-link>
        <cor-link skeleton></cor-link>
      </cor-breadcrumbs>
    </div>
  `,
};
