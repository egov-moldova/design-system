/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { TooltipPlacement, TooltipTrigger } from './cor-tooltip.enums';

/**
 * Helper: Attach event listeners to element after render
 * Avoids inline scripts and __bound hacks
 */
const attachEventListeners = (elementId: string, eventName: string, callback: (detail: any) => void) => {
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (el) {
      el.addEventListener(eventName, ((e: CustomEvent) => callback(e.detail)) as EventListener);
    }
  }, 0);
};

const renderTooltip = (args: any) => {
  const showArrow = args.showArrow === false ? 'show-arrow="false"' : '';
  const interactive = args.interactive ? 'interactive' : '';
  const disabled = args.disabled ? 'disabled' : '';
  const open = args.open ? 'open' : '';

  return /*html*/ `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 160px; padding: 40px;">
      <cor-tooltip
        placement="${args.placement}"
        trigger="${args.trigger}"
        show-delay="${args.showDelay}"
        hide-delay="${args.hideDelay}"
        max-width="${args.maxWidth}"
        offset="${args.offset}"
        ${showArrow}
        ${interactive}
        ${disabled}
        ${open}
      >
        <cor-button slot="trigger">
          <button type="button">Hover me</button>
        </cor-button>

        <cor-typography slot="title" variant="body-md-semibold">
            <span>Tooltip Title</span>
        </cor-typography>

        <cor-typography slot="description" variant="body-sm">
          <span>This is the tooltip description text.</span>
        </cor-typography>
      </cor-tooltip>
    </div>
  `;
};

const meta: Meta = {
  title: 'Molecules/Tooltip',
  component: 'cor-tooltip',
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: 'select',
      options: Object.values(TooltipPlacement),
      description: 'Preferred placement relative to the trigger',
    },
    showArrow: {
      control: 'boolean',
      description: 'Show or hide the CSS triangle arrow',
    },
    trigger: {
      control: 'select',
      options: Object.values(TooltipTrigger),
      description: 'How the tooltip is triggered',
    },
    open: {
      control: 'boolean',
      description: 'Controlled open state (for trigger="manual")',
    },
    showDelay: {
      control: 'number',
      description: 'Delay in ms before showing',
    },
    hideDelay: {
      control: 'number',
      description: 'Delay in ms before hiding',
    },
    interactive: {
      control: 'boolean',
      description: 'Keep open when hovering tooltip content',
    },
    maxWidth: {
      control: 'text',
      description: 'Max width of the tooltip container',
    },
    disabled: {
      control: 'boolean',
      description: 'Prevent tooltip from showing',
    },
    flipFallback: {
      control: 'boolean',
      description: 'Auto-flip to opposite side if not enough space',
    },
    offset: {
      control: 'number',
      description: 'Distance in px between trigger and tooltip',
    },
  },
  render: renderTooltip,
  parameters: {
    actions: { handles: ['corTooltipShow', 'corTooltipHide'] },
  },
};
export default meta;

export const Default: StoryObj = {
  args: {
    placement: TooltipPlacement.TOP,
    showArrow: true,
    trigger: TooltipTrigger.HOVER,
    open: false,
    showDelay: 200,
    hideDelay: 150,
    interactive: false,
    maxWidth: '280px',
    disabled: false,
    flipFallback: true,
    offset: 4,
  },
};

export const ManualControl: StoryObj = {
  args: {
    ...Default.args,
    trigger: TooltipTrigger.MANUAL,
    open: true,
  },
};

export const NoArrow: StoryObj = {
  args: {
    ...Default.args,
    showArrow: false,
  },
};

export const ClickTrigger: StoryObj = {
  args: {
    ...Default.args,
    trigger: TooltipTrigger.CLICK,
  },
};

export const FocusTrigger: StoryObj = {
  args: {
    ...Default.args,
    trigger: TooltipTrigger.FOCUS,
  },
};

export const Interactive: StoryObj = {
  args: {
    ...Default.args,
    interactive: true,
    trigger: TooltipTrigger.HOVER,
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 160px; padding: 40px;">
      <cor-tooltip
        placement="${args.placement}"
        trigger="${args.trigger}"
        interactive
        show-delay="${args.showDelay}"
        hide-delay="${args.hideDelay}"
        max-width="${args.maxWidth}"
        offset="${args.offset}"
      >
        <cor-button slot="trigger">
          <button type="button">Hover me</button>
        </cor-button>
        <cor-typography slot="title" variant="body-md-semibold">
          <span>Interactive Tooltip</span>
        </cor-typography>
        <cor-typography slot="description" variant="body-sm">
          <span>You can hover over this tooltip without it closing.</span>
        </cor-typography>
        <div>
          <cor-button>
            <button type="button">Action inside tooltip</button>
          </cor-button>
        </div>
      </cor-tooltip>
    </div>
  `,
};

export const WithContent: StoryObj = {
  args: {
    ...Default.args,
    maxWidth: '320px',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 200px; padding: 40px;">
      <cor-tooltip
        placement="${args.placement}"
        trigger="${args.trigger}"
        max-width="${args.maxWidth}"
        offset="${args.offset}"
      >
        <cor-button slot="trigger">
          <button type="button">Hover for details</button>
        </cor-button>
        <cor-typography slot="title" variant="body-md-semibold">
          <span>Tooltip with Content</span>
        </cor-typography>
        <cor-typography slot="description" variant="body-sm">
          <span>Description appears above the content slot.</span>
        </cor-typography>
        <div style="padding: 4px 0; font-size: 12px; color: var(--color-text-base-secondary);">
          Additional content here: links, lists, or any component.
        </div>
      </cor-tooltip>
    </div>
  `,
};

export const TitleOnly: StoryObj = {
  args: {
    ...Default.args,
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 160px; padding: 40px;">
      <cor-tooltip
        placement="${args.placement}"
        trigger="${args.trigger}"
        max-width="${args.maxWidth}"
        offset="${args.offset}"
      >
        <cor-button slot="trigger">
          <button type="button">Hover me</button>
        </cor-button>
        <cor-typography slot="title" variant="body-md-semibold">
          <span>Title only</span>
        </cor-typography>
      </cor-tooltip>
    </div>
  `,
};

export const EventLog: StoryObj = {
  args: {
    ...Default.args,
    trigger: TooltipTrigger.HOVER,
    open: false,
  },
  render: (args: any) => {
    const elementId = 'tooltip-event-demo';
    const logContentId = 'tooltip-log-content';

    // Attach event listeners after render
    attachEventListeners(elementId, 'corTooltipShow', () => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] corTooltipShow<br>${logContent.innerHTML}`;
      }
    });

    attachEventListeners(elementId, 'corTooltipHide', () => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] corTooltipHide<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 24px; min-height: 220px; padding: 40px;">
      <cor-tooltip
        id="${elementId}"
        placement="${args.placement}"
        trigger="${args.trigger}"
        show-delay="${args.showDelay}"
        hide-delay="${args.hideDelay}"
        max-width="${args.maxWidth}"
        offset="${args.offset}"
      >
        <cor-button slot="trigger">
          <button type="button">Trigger</button>
        </cor-button>

        <cor-typography slot="title" variant="body-md-semibold">
          <span>Tooltip Title</span>
        </cor-typography>

        <cor-typography slot="description" variant="body-sm">
          <span>This is the tooltip description text.</span>
        </cor-typography>
      </cor-tooltip>

      <div id="tooltip-log" style="padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 360px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
        <div id="${logContentId}">Hover the trigger to see events...</div>
      </div>
    </div>
  `;
  },
};

export const AllPlacements: StoryObj = {
  argTypes: {
    placement: {
      control: false,
    },
  },
  args: {
    ...Default.args,
  },
  render: (args: any) => {
    const placements = Object.values(TooltipPlacement);
    const items = placements
      .map(
        p => /*html*/ `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 180px; padding: 24px 16px; box-sizing: border-box;">
          <span style="font-size: 11px; color: var(--color-text-base-secondary); white-space: nowrap;">${p}</span>
          <cor-tooltip
            placement="${p}"
            trigger="${args.open ? 'manual' : args.trigger}"
            show-arrow="${args.showArrow}"
            show-delay="${args.showDelay}"
            hide-delay="${args.hideDelay}"
            max-width="${args.maxWidth}"
            offset="${args.offset}"
            ${args.interactive ? 'interactive' : ''}
            ${args.disabled ? 'disabled' : ''}
            ${args.open ? 'open' : ''}
          >
            <cor-button slot="trigger">
              <button type="button" style="white-space: nowrap; font-size: 11px; padding: 4px 8px;">Trigger</button>
            </cor-button>

            <cor-typography slot="title" variant="body-md-semibold">
              <span>${p.toUpperCase()}</span>
            </cor-typography>

            <cor-typography slot="description" variant="body-sm">
              <span>Placement: ${p}</span>
            </cor-typography>
          </cor-tooltip>
        </div>
      `,
      )
      .join('');

    return /*html*/ `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 24px; align-items: stretch; box-sizing: border-box; max-width: 1200px; margin: 0 auto;">
        ${items}
      </div>
    `;
  },
};
