/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { ProgressBarType, ProgressBarSize } from './cor-progress-bar.enums';

/**
 * Helper: Attach click handler to button after render
 */
const attachButtonClick = (buttonId: string, callback: () => void) => {
  setTimeout(() => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', callback);
    }
  }, 0);
};

type ProgressBarArgs = {
  type: ProgressBarType;
  size: ProgressBarSize;
  value: number;
  showPercentage: boolean;
  label: string;
  message: string;
};

const meta: Meta = {
  title: 'Molecules/Progress Bar',
  component: 'cor-progress-bar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A progress bar for communicating task or process completion. Supports default (info) and error types, three sizes, optional label, percentage display, and a system message below the track.',
      },
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: Object.values(ProgressBarType),
      description: 'Visual type — controls fill and track colours.',
      table: { defaultValue: { summary: ProgressBarType.DEFAULT } },
    },
    size: {
      control: 'select',
      options: Object.values(ProgressBarSize),
      description: 'Height of the progress track.',
      table: { defaultValue: { summary: ProgressBarSize.LG } },
    },
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Current progress value (0–100).',
      table: { defaultValue: { summary: '0' } },
    },
    showPercentage: {
      control: 'boolean',
      description: 'Show numeric percentage alongside the label.',
      table: { defaultValue: { summary: 'false' } },
    },
    label: {
      control: 'text',
      description: 'Content for the label slot.',
      table: { defaultValue: { summary: 'Progress bar label' } },
    },
    message: {
      control: 'text',
      description: 'Content for the message slot.',
      table: { defaultValue: { summary: 'System message goes here' } },
    },
  },
};

export default meta;
type Story = StoryObj;

const renderComponent = (args: ProgressBarArgs) => {
  const showPercentage = args.showPercentage ? 'show-percentage' : '';
  const labelSlot = args.label ? `<span slot="label">${args.label}</span>` : '';
  const messageSlot = args.message ? `<span slot="message">${args.message}</span>` : '';

  return /*html*/ `
    <div style="width: 372px; padding: 16px;">
      <cor-progress-bar
        type="${args.type}"
        size="${args.size}"
        value="${args.value}"
        ${showPercentage}
      >
        ${labelSlot}
        ${messageSlot}
      </cor-progress-bar>
    </div>
  `;
};

const DEFAULT_ARGS: Partial<ProgressBarArgs> = {
  type: ProgressBarType.DEFAULT,
  size: ProgressBarSize.LG,
  value: 40,
  showPercentage: true,
  label: 'Progress bar label',
  message: 'System message goes here',
};

export const Default: Story = {
  args: DEFAULT_ARGS,
  render: (args: any) => renderComponent(args),
};

export const Error: Story = {
  args: {
    ...DEFAULT_ARGS,
    type: ProgressBarType.ERROR,
  },
  render: (args: any) => renderComponent(args),
};

export const NoLabel: Story = {
  args: {
    ...DEFAULT_ARGS,
    value: 65,
    showPercentage: false,
    label: '',
    message: '',
  },
  render: (args: any) => renderComponent(args),
};

export const AllSizes: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; padding: 16px; width: 372px;">
      <div>
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weak);">lg (12px)</p>
        <cor-progress-bar
          type="${ProgressBarType.DEFAULT}"
          size="${ProgressBarSize.LG}"
          value="60"
          show-percentage
        >
          <span slot="label">Large progress bar</span>
        </cor-progress-bar>
      </div>
      <div>
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weak);">md (8px)</p>
        <cor-progress-bar
          type="${ProgressBarType.DEFAULT}"
          size="${ProgressBarSize.MD}"
          value="60"
          show-percentage
        >
          <span slot="label">Medium progress bar</span>
        </cor-progress-bar>
      </div>
      <div>
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weak);">sm (4px)</p>
        <cor-progress-bar
          type="${ProgressBarType.DEFAULT}"
          size="${ProgressBarSize.SM}"
          value="60"
          show-percentage
        >
          <span slot="label">Small progress bar</span>
        </cor-progress-bar>
      </div>
    </div>
  `,
  parameters: { controls: { disable: true } },
};

export const AllTypes: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 24px; padding: 16px; width: 372px;">
      <div>
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weak);">Default (Info)</p>
        <cor-progress-bar
          type="${ProgressBarType.DEFAULT}"
          size="${ProgressBarSize.LG}"
          value="40"
          show-percentage
        >
          <span slot="label">Progress bar label</span>
          <span slot="message">System message goes here</span>
        </cor-progress-bar>
      </div>
      <div>
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weak);">Error</p>
        <cor-progress-bar
          type="${ProgressBarType.ERROR}"
          size="${ProgressBarSize.LG}"
          value="40"
          show-percentage
        >
          <span slot="label">Progress bar label</span>
          <span slot="message">System message goes here</span>
        </cor-progress-bar>
      </div>
    </div>
  `,
  parameters: { controls: { disable: true } },
};

export const ProgressStages: Story = {
  args: DEFAULT_ARGS,
  argTypes: {
    value: { control: false },
    label: { control: false },
    message: { control: false },
  },
  render: (args: Partial<ProgressBarArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px; width: 372px;">
      <cor-progress-bar
        type="${args.type}"
        size="${args.size}"
        value="0"
        show-percentage="${args.showPercentage}"
      >
        <span slot="label">0% — Not started</span>
      </cor-progress-bar>
      <cor-progress-bar
        type="${args.type}"
        size="${args.size}"
        value="25"
        show-percentage="${args.showPercentage}"
      >
        <span slot="label">25% — In progress</span>
      </cor-progress-bar>
      <cor-progress-bar
        type="${args.type}"
        size="${args.size}"
        value="50"
        show-percentage="${args.showPercentage}"
      >
        <span slot="label">50% — Halfway</span>
      </cor-progress-bar>
      <cor-progress-bar
        type="${args.type}"
        size="${args.size}"
        value="75"
        show-percentage="${args.showPercentage}"
      >
        <span slot="label">75% — Almost done</span>
      </cor-progress-bar>
      <cor-progress-bar
        type="${args.type}"
        size="${args.size}"
        value="100"
        show-percentage="${args.showPercentage}"
      >
        <span slot="label">100% — Complete</span>
      </cor-progress-bar>
    </div>
  `,
};

export const Animated: Story = {
  args: {
    ...DEFAULT_ARGS,
    value: 0,
    label: 'Progress animation',
    message: 'System message goes here',
  },
  render: (args: Partial<ProgressBarArgs>) => {
    let currentInterval: number | null = null;

    const animateProgress = () => {
      const el = document.getElementById('animated-progress') as any;
      if (!el) return;

      if (currentInterval !== null) {
        clearInterval(currentInterval);
      }

      el.value = 0;
      let current = 0;
      currentInterval = window.setInterval(() => {
        current += 1;
        el.value = current;
        if (current >= 100) {
          clearInterval(currentInterval!);
          currentInterval = null;
        }
      }, 30);
    };

    attachButtonClick('animate-progress-btn', animateProgress);

    return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start; padding: 16px; width: 372px;">
      <cor-progress-bar
        id="animated-progress"
        type="${args.type}"
        size="${args.size}"
        value="${args.value}"
        show-percentage="${args.showPercentage}"
        animate-percentage
      >
        <span slot="label">${args.label}</span>
        <span slot="message">${args.message}</span>
      </cor-progress-bar>
      <cor-button variant="secondary-gray" size="sm"><button id="animate-progress-btn">Animate 0 → 100</button></cor-button>
    </div>
  `;
  },
};
