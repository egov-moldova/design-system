import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

/**
 * Helper: Attach event listeners to multiple elements after render
 * Avoids inline scripts and __bound hacks
 */
const attachEventListenersToAll = (
  selector: string,
  eventName: string,
  callback: (el: Element, detail: any) => void,
) => {
  setTimeout(() => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.addEventListener(eventName, ((e: CustomEvent) => callback(el, e.detail)) as EventListener);
    });
  }, 0);
};

interface ColumnActionStoryArgs {
  disabled: boolean;
  iconName: string;
}

export default {
  title: 'Atoms/Column Action',
  component: 'cor-column-action',
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: { type: 'boolean' },
      description: 'Disables the action button',
    },
    iconName: {
      control: { type: 'select' },
      options: [
        ICON_NAMES.FILTER,
        ICON_NAMES.FILTER__EDIT,
        ICON_NAMES.ARROWS__VERTICAL,
        ICON_NAMES.ARROW__DOWN,
        ICON_NAMES.ARROW__UP,
        ICON_NAMES.CHEVRON__DOWN,
        ICON_NAMES.CHEVRON__UP,
        ICON_NAMES.DRAGGABLE,
        ICON_NAMES.OVERFLOW_MENU__VERTICAL,
      ],
      description: 'Icon to display in the action button',
    },
  },
  parameters: {
    actions: { handles: ['corAction', 'corActionBlur'] },
  },
};

const renderColumnAction = (args: ColumnActionStoryArgs) => /*html*/ `
  <cor-column-action ${args.disabled ? 'disabled' : ''}>
    <cor-icon name="${args.iconName}" size="sm" color="currentColor"></cor-icon>
  </cor-column-action>
`;

export const Default = {
  render: (args: ColumnActionStoryArgs) => renderColumnAction(args),
  args: {
    disabled: false,
    iconName: ICON_NAMES.FILTER,
  },
};

export const AllIconTypes = {
  render: () => /*html*/ `
    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.FILTER}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Filter</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.FILTER__EDIT}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Filtered</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.ARROWS__VERTICAL}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Arrows Vertical</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.ARROW__DOWN}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Arrow Down</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.ARROW__UP}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Arrow Up</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.CHEVRON__DOWN}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Chevron Down</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.CHEVRON__UP}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Chevron Up</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.DRAGGABLE}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Draggable</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.OVERFLOW_MENU__VERTICAL}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Menu</span>
      </div>
    </div>
  `,
};

export const States = {
  render: () => /*html*/ `
    <div style="display: flex; gap: 16px; align-items: center;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action>
          <cor-icon name="${ICON_NAMES.FILTER}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Default</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action active>
          <cor-icon name="${ICON_NAMES.FILTER}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Active</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action class="is-focused">
          <cor-icon name="${ICON_NAMES.FILTER}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Focus</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <cor-column-action disabled>
          <cor-icon name="${ICON_NAMES.FILTER}" size="sm" color="currentColor"></cor-icon>
        </cor-column-action>
        <span style="font-size: 11px; color: var(--color-neutral-text-weaker);">Disabled</span>
      </div>
    </div>
  `,
};

export const Disabled = {
  render: (args: ColumnActionStoryArgs) => renderColumnAction(args),
  args: {
    disabled: true,
    iconName: ICON_NAMES.FILTER,
  },
};

export const Interactive = {
  render: () => {
    const logContentId = 'log-content';

    // Attach event listeners to all column actions after render
    attachEventListenersToAll('cor-column-action', 'corAction', el => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const timestamp = new Date().toLocaleTimeString();
        const actionType = (el as HTMLElement).dataset.action;
        logContent.innerHTML = `[${timestamp}] Action "${actionType}" clicked<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
      <cor-column-action id="action-1" data-action="sort">
        <cor-icon name="${ICON_NAMES.ARROWS__VERTICAL}" size="sm" color="currentColor"></cor-icon>
      </cor-column-action>

      <cor-column-action id="action-2" data-action="filter">
        <cor-icon name="${ICON_NAMES.FILTER}" size="sm" color="currentColor"></cor-icon>
      </cor-column-action>

      <cor-column-action id="action-3" data-action="menu">
        <cor-icon name="${ICON_NAMES.OVERFLOW_MENU__VERTICAL}" size="sm" color="currentColor"></cor-icon>
      </cor-column-action>
    </div>

    <div id="event-log" style="margin-top: 24px; padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
      <div id="${logContentId}">Click actions to see events...</div>
    </div>
  `;
  },
};
