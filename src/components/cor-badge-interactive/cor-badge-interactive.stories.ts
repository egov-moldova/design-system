/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { BadgeInteractiveSize } from './cor-badge-interactive.enums';

// Custom element wrapper for the interactive demo.
// connectedCallback fires when the HTML is mounted in BOTH canvas (story) and
// docs (autodocs) mode — unlike play(), which only runs in canvas/test mode.
const BADGE_DEMO_TAG = 'badge-interactive-demo';
if (!customElements.get(BADGE_DEMO_TAG)) {
  class BadgeInteractiveDemo extends HTMLElement {
    _ctrl: AbortController | null = null;
    connectedCallback() {
      const logContent = this.querySelector('#log-content');

      if (!logContent) {
        return;
      }

      this._ctrl?.abort();
      this._ctrl = new AbortController();

      this.addEventListener(
        'corClick',
        (e: Event) => {
          const el = e.target as Element;
          const ts = new Date().toLocaleTimeString();
          const text = el.textContent?.trim() || 'unknown';
          logContent.innerHTML = `[${ts}] Badge "${text}" clicked<br>${logContent.innerHTML}`;
        },
        { signal: this._ctrl.signal },
      );
    }

    disconnectedCallback() {
      this._ctrl?.abort();
      this._ctrl = null;
    }
  }
  customElements.define(BADGE_DEMO_TAG, BadgeInteractiveDemo);
}

// Args type for stories
type BadgeInteractiveArgs = {
  size: BadgeInteractiveSize;
  text?: string;
  showIcon?: boolean;
  disabled?: boolean;
  selected?: boolean;
  skeleton?: boolean;
};

const defaultArgs: BadgeInteractiveArgs = {
  size: BadgeInteractiveSize.MD,
  text: '13',
  showIcon: true,
  disabled: false,
  selected: false,
  skeleton: false,
};

const meta: Meta<BadgeInteractiveArgs> = {
  title: 'Atoms/Badge Interactive',
  component: 'cor-badge-interactive',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(BadgeInteractiveSize),
      description: 'Size of the badge',
      table: {
        defaultValue: { summary: BadgeInteractiveSize.MD },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    selected: {
      control: 'boolean',
      description: 'Selected state',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    skeleton: {
      control: 'boolean',
      description: 'Skeleton/empty state',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
  parameters: {
    actions: { handles: ['corClick'] },
  },
};

export default meta;
type Story = StoryObj<BadgeInteractiveArgs>;

const render = (args: BadgeInteractiveArgs) => /*html*/ `
  <cor-badge-interactive
    size="${args.size}"
    ${args.selected ? 'selected' : ''}
    ${args.disabled ? 'disabled' : ''}
    ${args.skeleton ? 'skeleton' : ''}
  >
    ${args.showIcon ? '<cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>' : ''}
    ${args.text || '13'}
  </cor-badge-interactive>
`;

export const Default: Story = {
  args: { ...defaultArgs } as BadgeInteractiveArgs,
  argTypes: {
    text: {
      control: 'text',
      description: 'Text content of the badge (rendered into default slot)',
      table: { defaultValue: { summary: '13' } },
    },
    showIcon: {
      control: 'boolean',
      description: 'Show icon in the badge',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render,
};

export const AllSizesTable: Story = {
  parameters: {
    controls: {
      disable: true,
    },
  },
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto repeat(3, 1fr); gap: 24px; align-items: center;">
      <div style="font-weight: 600;">Size</div>
      <div style="font-weight: 600; text-align: center;">With Icon</div>
      <div style="font-weight: 600; text-align: center;">Without Icon</div>
      <div style="font-weight: 600; text-align: center;">Selected</div>

      <div>md (20px)</div>
      <div style="text-align: center;">
        <cor-badge-interactive size="md">
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive size="md">13</cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive size="md" selected>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>

      <div>sm (16px)</div>
      <div style="text-align: center;">
        <cor-badge-interactive size="sm">
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive size="sm">13</cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive size="sm" selected>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>

      <div>xs (14px)</div>
      <div style="text-align: center;">
        <cor-badge-interactive size="xs">
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive size="xs">13</cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive size="xs" selected>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
    </div>
  `,
};

export const AllStatesTable: Story = {
  parameters: {
    controls: {
      disable: true,
    },
  },
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: auto repeat(3, 1fr); gap: 24px; align-items: center;">
      <div style="font-weight: 600;">State</div>
      <div style="font-weight: 600; text-align: center;">md</div>
      <div style="font-weight: 600; text-align: center;">sm</div>
      <div style="font-weight: 600; text-align: center;">xs</div>

      <div>Default</div>
      <div style="text-align: center;">
        <cor-badge-interactive id="default-md" size="md">
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive id="default-sm" size="sm">
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive id="default-xs" size="xs">
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>

      <div>Selected</div>
      <div style="text-align: center;">
        <cor-badge-interactive id="selected-md" size="md" selected>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive id="selected-sm" size="sm" selected>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive id="selected-xs" size="xs" selected>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>

      <div>Disabled</div>
      <div style="text-align: center;">
        <cor-badge-interactive id="disabled-md" size="md" disabled>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive id="disabled-sm" size="sm" disabled>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive id="disabled-xs" size="xs" disabled>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>

      <div>Empty (skeleton)</div>
      <div style="text-align: center;">
        <cor-badge-interactive id="empty-md" size="md" skeleton>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive id="empty-sm" size="sm" skeleton>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
      <div style="text-align: center;">
        <cor-badge-interactive id="empty-xs" size="xs" skeleton>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          13
        </cor-badge-interactive>
      </div>
    </div>
  `,
};

export const Interactive: Story = {
  parameters: {
    controls: {
      disable: true,
    },
  },
  render: () => /*html*/ `
    <badge-interactive-demo>
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <cor-badge-interactive id="interactive-1" size="md">
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          Clickable
        </cor-badge-interactive>

        <cor-badge-interactive id="interactive-2" size="sm" selected>
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          Selected
        </cor-badge-interactive>

        <cor-badge-interactive id="interactive-3" size="xs">
          <cor-icon slot="icon" size="2xs" name="carbon:warning" color="currentColor"></cor-icon>
          99+
        </cor-badge-interactive>
      </div>

      <div id="event-log" style="margin-top: 24px; padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
        <div id="log-content">Click badges to see events...</div>
      </div>
    </badge-interactive-demo>
  `,
};
