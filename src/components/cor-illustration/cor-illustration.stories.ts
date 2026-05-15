/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import type { IllustrationName } from './cor-illustration.types';
import { ILLUSTRATION_NAMES } from './cor-illustration.types';

type CorIllustrationArgs = { name: IllustrationName; alt?: string; width?: number; height?: number };

const ILLUSTRATION_NAMES_OPTIONS: IllustrationName[] = [...ILLUSTRATION_NAMES];

const renderIllustration = (args: CorIllustrationArgs) => {
  const altAttr = args.alt ? `alt="${args.alt}"` : '';
  const widthAttr = args.width !== undefined ? `width="${args.width}"` : '';
  const heightAttr = args.height !== undefined ? `height="${args.height}"` : '';

  return /*html*/ `
    <cor-illustration
      name="${args.name}"
      ${altAttr}
      ${widthAttr}
      ${heightAttr}
    ></cor-illustration>
  `;
};

const meta: Meta<CorIllustrationArgs> = {
  title: 'Atoms/Illustration',
  component: 'cor-illustration',
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: { type: 'select' },
      options: ILLUSTRATION_NAMES_OPTIONS,
      description: 'Illustration asset name — maps to `assets/{name}.svg`',
    },
    alt: {
      control: { type: 'text' },
      description:
        'Accessible label. Provide to expose the illustration as an image (`role="img"`). Omit for decorative illustrations (`aria-hidden="true"`).',
    },
    width: {
      control: { type: 'number' },
      description: 'Override width in px. Omit to use the 160px default token.',
    },
    height: {
      control: { type: 'number' },
      description: 'Override height in px. Omit to use the 160px default token.',
    },
  },
  render: renderIllustration,
};
export default meta;

export const Default: StoryObj = {
  args: { name: 'map' },
};

export const CustomSize: StoryObj = {
  args: { name: 'map', width: 800, height: 600 },
};

export const SideBySide: StoryObj = {
  parameters: {
    controls: {
      disable: true,
    },
  },
  render: () => /*html*/ `
    <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
      <div style="display: flex; flex-direction: column; align-items: center;">
        <cor-illustration name="map" alt="Map illustration" width="120" height="120"></cor-illustration>
        <p style="margin: 4px 0; font-size: 12px; color: var(--color-neutral-text-weak);">120x120</p>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center;">
        <cor-illustration name="map" alt="Map illustration" width="80" height="80"></cor-illustration>
        <p style="margin: 4px 0; font-size: 12px; color: var(--color-neutral-text-weak);">80x80</p>
      </div>
    </div>
  `,
};

export const AllGrid: StoryObj = {
  args: { width: 120, height: 120 },
  parameters: {
    controls: {
      disable: true,
    },
  },
  argTypes: {
    name: {
      control: false,
    },
    alt: {
      control: false,
    },
  },
  render: args => /*html*/ `
    <div style="
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 24px;
      padding: 24px;
      background: var(--color-neutral-background-default);
      border-radius: 8px;
    ">
      ${ILLUSTRATION_NAMES_OPTIONS.map(
        name => /*html*/ `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: var(--color-neutral-background-base);
          border-radius: 4px;
          border: 1px solid var(--color-neutral-border-weakest);
        ">
          <cor-illustration
            name="${name}"
            alt="${name} illustration"
            ${args.width !== undefined ? `width="${args.width}"` : ''}
            ${args.height !== undefined ? `height="${args.height}"` : ''}
          ></cor-illustration>
          <div style="
            font-size: 12px;
            color: var(--color-neutral-text-weak);
            text-align: center;
            font-family: monospace;
          ">${name}</div>
        </div>
      `,
      ).join('')}
    </div>
  `,
};
