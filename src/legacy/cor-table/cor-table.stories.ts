/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { TableSize } from './cor-table.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

type TableArgs = {
  size: TableSize;
  zebra: boolean;
  bordered: boolean;
};

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

/**
 * Helper: Attach event listener to single element after render
 */
const attachEventListener = (selector: string, eventName: string, callback: (detail: any) => void) => {
  setTimeout(() => {
    const el = document.querySelector(selector);
    if (el) {
      el.addEventListener(eventName, ((e: CustomEvent) => callback(e.detail)) as EventListener);
    }
  }, 0);
};

const meta: Meta = {
  title: 'Organisms/Table',
  component: 'cor-table',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(TableSize),
      description: 'Size variant controlling cell padding and min-height',
      table: { defaultValue: { summary: TableSize.LG } },
    },
    zebra: {
      control: 'boolean',
      description: 'Enable alternating row backgrounds',
      table: { defaultValue: { summary: 'false' } },
    },
    bordered: {
      control: 'boolean',
      description: 'Enable outer border on the table',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  parameters: {
    actions: { handles: ['corSelectAll', 'corRowSelect', 'corRowClick', 'corRowExpand', 'corAction'] },
  },
};

export default meta;
type Story = StoryObj;

const sampleTable = (size: string, extras = '') => /*html*/ `
  <cor-table size="${size}" ${extras}>
    <cor-thead>
      <cor-column field="name" col-index="1">Name</cor-column>
      <cor-column field="email" col-index="2">Email</cor-column>
      <cor-column field="role" col-index="3">Role</cor-column>
      <cor-column field="status" col-index="4">Status</cor-column>
    </cor-thead>
    <cor-tbody>
      <cor-row row-id="1">
        <cor-cell col-index="1">Alice Johnson</cor-cell>
        <cor-cell col-index="2">alice@example.com</cor-cell>
        <cor-cell col-index="3">Admin</cor-cell>
        <cor-cell col-index="4">Active</cor-cell>
      </cor-row>
      <cor-row row-id="2">
        <cor-cell col-index="1">Bob Smith</cor-cell>
        <cor-cell col-index="2">bob@example.com</cor-cell>
        <cor-cell col-index="3">Editor</cor-cell>
        <cor-cell col-index="4">Active</cor-cell>
      </cor-row>
      <cor-row row-id="3">
        <cor-cell col-index="1">Carol Williams</cor-cell>
        <cor-cell col-index="2">carol@example.com</cor-cell>
        <cor-cell col-index="3">Viewer</cor-cell>
        <cor-cell col-index="4">Inactive</cor-cell>
      </cor-row>
      <cor-row row-id="4" disabled>
        <cor-cell col-index="1">Dave Brown</cor-cell>
        <cor-cell col-index="2">dave@example.com</cor-cell>
        <cor-cell col-index="3">Viewer</cor-cell>
        <cor-cell col-index="4">Suspended</cor-cell>
      </cor-row>
    </cor-tbody>
    <cor-tfoot>
      <cor-typography variant="body-xs" color="color-neutral-text-weak"><span>4 items</span></cor-typography>
    </cor-tfoot>
  </cor-table>
`;

const render = (args: any) => sampleTable(args.size, `${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}`);

export const Default: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: false,
  },
  render,
};

export const Bordered: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render,
};

export const AllSizes: Story = {
  render: () => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 48px;">
      <div>
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600;">Large (lg) — default</h3>
        ${sampleTable('lg', 'bordered')}
      </div>
      <div>
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600;">Medium (md)</h3>
        ${sampleTable('md', 'bordered')}
      </div>
      <div>
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600;">Small (sm)</h3>
        ${sampleTable('sm', 'bordered')}
      </div>
    </div>
  `,
  argTypes: {
    size: {
      control: false,
    },
  },
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
};

export const WithSelectedRow: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-thead>
        <cor-column field="name" col-index="1">Name</cor-column>
        <cor-column field="email" col-index="2">Email</cor-column>
        <cor-column field="role" col-index="3">Role</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <cor-cell col-index="1">Alice Johnson</cor-cell>
          <cor-cell col-index="2">alice@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
        </cor-row>
        <cor-row row-id="2" selected>
          <cor-cell col-index="1">Bob Smith</cor-cell>
          <cor-cell col-index="2">bob@example.com</cor-cell>
          <cor-cell col-index="3">Editor</cor-cell>
        </cor-row>
        <cor-row row-id="3">
          <cor-cell col-index="1">Carol Williams</cor-cell>
          <cor-cell col-index="2">carol@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
        </cor-row>
      </cor-tbody>
    </cor-table>
  `,
};

export const WithZebra: Story = {
  args: {
    size: TableSize.LG,
    zebra: true,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-thead>
        <cor-column field="name" col-index="1">Name</cor-column>
        <cor-column field="email" col-index="2">Email</cor-column>
        <cor-column field="role" col-index="3">Role</cor-column>
        <cor-column field="status" col-index="4">Status</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <cor-cell col-index="1">Alice Johnson</cor-cell>
          <cor-cell col-index="2">alice@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
        <cor-row row-id="2">
          <cor-cell col-index="1">Bob Smith</cor-cell>
          <cor-cell col-index="2">bob@example.com</cor-cell>
          <cor-cell col-index="3">Editor</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
        <cor-row row-id="3">
          <cor-cell col-index="1">Carol Williams</cor-cell>
          <cor-cell col-index="2">carol@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
          <cor-cell col-index="4">Inactive</cor-cell>
        </cor-row>
        <cor-row row-id="4">
          <cor-cell col-index="1">Dave Brown</cor-cell>
          <cor-cell col-index="2">dave@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
          <cor-cell col-index="4">Pending</cor-cell>
        </cor-row>
        <cor-row row-id="5">
          <cor-cell col-index="1">Eve Davis</cor-cell>
          <cor-cell col-index="2">eve@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
      </cor-tbody>
    </cor-table>
  `,
};

export const WithSelection: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => {
    const logContentId = 'sel-log-content';

    // Attach event listener to thead for select all
    attachEventListener('cor-thead', 'corSelectAll', detail => {
      const logContent = document.getElementById(logContentId);
      const thead = document.querySelector('cor-thead');
      if (logContent && thead) {
        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] Select All: selected=${detail.selected}<br>${logContent.innerHTML}`;
        thead.removeAttribute('select-all-indeterminate');
        if (detail.selected) {
          thead.setAttribute('select-all-checked', '');
        } else {
          thead.removeAttribute('select-all-checked');
        }
      }
    });

    // Attach event listeners to all rows for row selection
    attachEventListenersToAll('cor-row', 'corRowSelect', (el, detail) => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] Row Select: rowId=${detail.rowId}, selected=${detail.selected}<br>${logContent.innerHTML}`;
        if (detail.selected) {
          el.setAttribute('selected', '');
        } else {
          el.removeAttribute('selected');
        }
      }
    });

    return /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-thead selectable select-all-indeterminate>
        <cor-column field="name" col-index="1">Name</cor-column>
        <cor-column field="email" col-index="2">Email</cor-column>
        <cor-column field="role" col-index="3">Role</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1" selectable selected>
          <cor-cell col-index="1">Alice Johnson</cor-cell>
          <cor-cell col-index="2">alice@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
        </cor-row>
        <cor-row row-id="2" selectable>
          <cor-cell col-index="1">Bob Smith</cor-cell>
          <cor-cell col-index="2">bob@example.com</cor-cell>
          <cor-cell col-index="3">Editor</cor-cell>
        </cor-row>
        <cor-row row-id="3" selectable selected>
          <cor-cell col-index="1">Carol Williams</cor-cell>
          <cor-cell col-index="2">carol@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
        </cor-row>
        <cor-row row-id="4" selectable disabled>
          <cor-cell col-index="1">Dave Brown</cor-cell>
          <cor-cell col-index="2">dave@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
        </cor-row>
      </cor-tbody>
    </cor-table>

    <div id="sel-log" style="margin-top: 24px; padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
      <div id="${logContentId}">Toggle checkboxes to see events...</div>
    </div>
  `;
  },
};

export const InteractiveCells: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 48px;">
      <div>
        <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Interactive cells — Tab to focus, amber glow on focus-visible</h3>
        <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
          <cor-thead>
            <cor-column field="name" col-index="1">Name</cor-column>
            <cor-column field="email" col-index="2">Email</cor-column>
            <cor-column field="role" col-index="3">Role</cor-column>
          </cor-thead>
          <cor-tbody>
            <cor-row row-id="1">
              <cor-cell col-index="1" interactive>Alice Johnson</cor-cell>
              <cor-cell col-index="2" interactive>alice@example.com</cor-cell>
              <cor-cell col-index="3" interactive>Admin</cor-cell>
            </cor-row>
            <cor-row row-id="2">
              <cor-cell col-index="1" interactive>Bob Smith</cor-cell>
              <cor-cell col-index="2" interactive>bob@example.com</cor-cell>
              <cor-cell col-index="3" interactive>Editor</cor-cell>
            </cor-row>
          </cor-tbody>
        </cor-table>
      </div>
      <div>
        <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Active cells — edit-mode styling (red border + tinted background)</h3>
        <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
          <cor-thead>
            <cor-column field="name" col-index="1">Name</cor-column>
            <cor-column field="email" col-index="2">Email</cor-column>
            <cor-column field="role" col-index="3">Role</cor-column>
          </cor-thead>
          <cor-tbody>
            <cor-row row-id="1">
              <cor-cell col-index="1">Alice Johnson</cor-cell>
              <cor-cell col-index="2" active>alice@example.com</cor-cell>
              <cor-cell col-index="3">Admin</cor-cell>
            </cor-row>
            <cor-row row-id="2">
              <cor-cell col-index="1" active>Bob Smith</cor-cell>
              <cor-cell col-index="2">bob@example.com</cor-cell>
              <cor-cell col-index="3">Editor</cor-cell>
            </cor-row>
          </cor-tbody>
        </cor-table>
      </div>
    </div>
  `,
};

export const SortableColumns: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => {
    const logContentId = 'sort-log-content';

    // Attach event listeners to all column actions
    attachEventListenersToAll('cor-column-action', 'corAction', el => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const timestamp = new Date().toLocaleTimeString();
        const field = (el as HTMLElement).dataset.field;
        logContent.innerHTML = `[${timestamp}] Sort action clicked: field=${field}<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-thead>
        <cor-column field="name" col-index="1" active>
          Name
          <cor-column-action slot="action-right" data-action="sort" data-field="name" active hide-focus-ring>
            <cor-icon name="${ICON_NAMES.ARROW__UP}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
        <cor-column field="email" col-index="2">
          Email
          <cor-column-action slot="action-right" data-action="sort" data-field="email" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.ARROWS__VERTICAL}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
        <cor-column field="role" col-index="3">
          Role
          <cor-column-action slot="action-right" data-action="sort" data-field="role" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.ARROW__DOWN}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
        <cor-column field="status" col-index="4">Status</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <cor-cell col-index="1">Alice Johnson</cor-cell>
          <cor-cell col-index="2">alice@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
        <cor-row row-id="2">
          <cor-cell col-index="1">Bob Smith</cor-cell>
          <cor-cell col-index="2">bob@example.com</cor-cell>
          <cor-cell col-index="3">Editor</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
      </cor-tbody>
    </cor-table>

    <div id="sort-log" style="margin-top: 24px; padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
      <div id="${logContentId}">Click column actions to see events...</div>
    </div>
  `;
  },
};

export const FilterableColumns: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => {
    const logContentId = 'filter-log-content';

    // Attach event listeners to all column actions
    attachEventListenersToAll('cor-column-action', 'corAction', el => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const timestamp = new Date().toLocaleTimeString();
        const actionType = (el as HTMLElement).dataset.action || '';
        const field = (el as HTMLElement).dataset.field;
        logContent.innerHTML = `[${timestamp}] ${actionType.charAt(0).toUpperCase() + actionType.slice(1)} action clicked: field=${field}<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-thead>
        <cor-column field="name" col-index="1" active>
          Name
          <cor-column-action active slot="action-right" data-action="sort" data-field="name" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.ARROW__UP}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
        <cor-column field="email" col-index="2">
          Email
          <cor-column-action slot="action-right" data-action="filter" data-field="email" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.FILTER}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
        <cor-column field="role" col-index="3" active>
          Role
          <cor-column-action active slot="action-right" data-action="filter" data-field="role" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.FILTER__EDIT}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
        <cor-column field="status" col-index="4">
          Status
          <cor-column-action slot="action-right" data-action="sort" data-field="status">
            <cor-icon name="${ICON_NAMES.ARROWS__VERTICAL}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
          <cor-column-action slot="action-right" data-action="filter" data-field="status">
            <cor-icon name="${ICON_NAMES.FILTER}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <cor-cell col-index="1">Alice Johnson</cor-cell>
          <cor-cell col-index="2">alice@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
        <cor-row row-id="2">
          <cor-cell col-index="1">Bob Smith</cor-cell>
          <cor-cell col-index="2">bob@example.com</cor-cell>
          <cor-cell col-index="3">Editor</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
      </cor-tbody>
    </cor-table>

    <div id="filter-log" style="margin-top: 24px; padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
      <div id="${logContentId}">Click column actions to see events...</div>
    </div>
  `;
  },
};

export const ComplexColumns: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => {
    const logContentId = 'complex-log-content';

    // Attach event listeners to all column actions
    attachEventListenersToAll('cor-column-action', 'corAction', el => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const timestamp = new Date().toLocaleTimeString();
        const actionType = (el as HTMLElement).dataset.action || '';
        const field = (el as HTMLElement).dataset.field;
        const actionLabel = actionType.charAt(0).toUpperCase() + actionType.slice(1);

        // Get column name from parent cor-column element if field is not available
        let fieldInfo = field ? `field=${field}` : '';
        if (!field) {
          const column = (el as HTMLElement).closest('cor-column');
          const columnField = column?.getAttribute('field');
          fieldInfo = columnField ? `column=${columnField}` : '(unknown)';
        }

        logContent.innerHTML = `[${timestamp}] ${actionLabel} action clicked: ${fieldInfo}<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-thead>
        <cor-column field="order" width="60px" col-index="1">
          #
        </cor-column>
        <cor-column field="name" col-index="2" active>
          <cor-column-action slot="action-left" data-action="drag" tabbable="false" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.DRAGGABLE}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
          Name
          <cor-column-action active slot="action-right" data-action="sort" data-field="name" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.ARROW__UP}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
        <cor-column field="email" col-index="3">
          <cor-column-action slot="action-left" data-action="drag" tabbable="false" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.DRAGGABLE}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
          Email
          <cor-column-action slot="action-right" data-action="filter" data-field="email" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.FILTER}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
        <cor-column field="role" col-index="4" active>
          <cor-column-action slot="action-left" data-action="drag" tabbable="false" hide-focus-ring>
            <cor-icon name="${ICON_NAMES.DRAGGABLE}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
          Role
          <cor-column-action slot="action-right" data-action="sort" data-field="role">
            <cor-icon name="${ICON_NAMES.ARROWS__VERTICAL}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
          <cor-column-action active slot="action-right" data-action="filter" data-field="role">
            <cor-icon name="${ICON_NAMES.FILTER__EDIT}" size="sm" color="currentColor"></cor-icon>
          </cor-column-action>
        </cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <cor-cell col-index="1">1</cor-cell>
          <cor-cell col-index="2">Alice Johnson</cor-cell>
          <cor-cell col-index="3">alice@example.com</cor-cell>
          <cor-cell col-index="4">Admin</cor-cell>
        </cor-row>
        <cor-row row-id="2">
          <cor-cell col-index="1">2</cor-cell>
          <cor-cell col-index="2">Bob Smith</cor-cell>
          <cor-cell col-index="3">bob@example.com</cor-cell>
          <cor-cell col-index="4">Editor</cor-cell>
        </cor-row>
        <cor-row row-id="3">
          <cor-cell col-index="1">3</cor-cell>
          <cor-cell col-index="2">Carol White</cor-cell>
          <cor-cell col-index="3">carol@example.com</cor-cell>
          <cor-cell col-index="4">Viewer</cor-cell>
        </cor-row>
      </cor-tbody>
    </cor-table>

    <div id="complex-log" style="margin-top: 24px; padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
      <div id="${logContentId}">Click column actions to see events...</div>
    </div>
  `;
  },
};

export const WithExpandableRows: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => {
    const logContentId = 'expand-log-content';

    // Attach event listeners to all rows for expansion
    attachEventListenersToAll('cor-row', 'corRowExpand', (_el, detail) => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] Expand: rowId=${detail.rowId}, expanded=${detail.expanded}<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-thead expandable>
        <cor-column field="name" col-index="1">Name</cor-column>
        <cor-column field="email" col-index="2">Email</cor-column>
        <cor-column field="role" col-index="3">Role</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1" expandable expanded>
          <cor-cell col-index="1">Alice Johnson</cor-cell>
          <cor-cell col-index="2">alice@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
          <div slot="expand">
            <cor-typography variant="body-md"><span>Content:</span></cor-typography>
            <cor-slot></cor-slot>
          </div>
        </cor-row>
        <cor-row row-id="2" expandable>
          <cor-cell col-index="1">Bob Smith</cor-cell>
          <cor-cell col-index="2">bob@example.com</cor-cell>
          <cor-cell col-index="3">Editor</cor-cell>
          <div slot="expand">
            <cor-typography variant="body-md"><span>Content:</span></cor-typography>
            <cor-slot></cor-slot>
          </div>
        </cor-row>
        <cor-row row-id="3" expandable>
          <cor-cell col-index="1">Carol Williams</cor-cell>
          <cor-cell col-index="2">carol@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
          <div slot="expand">
            <cor-typography variant="body-md"><span>Content:</span></cor-typography>
            <cor-slot></cor-slot>
          </div>
        </cor-row>
      </cor-tbody>
    </cor-table>

    <div id="expand-log" style="margin-top: 24px; padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-family: monospace; font-size: 12px;">
      <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
      <div id="${logContentId}">Click expand chevrons to see events...</div>
    </div>
  `;
  },
};

export const WithTableHeader: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-table-header>
        <cor-typography slot="title" variant="heading-md"><span>Title</span></cor-typography>

        <div slot="actions" style="display: flex; gap: 16px; align-items: center;">
          <cor-button variant="secondary-gray" size="md"><button type="button">Compare</button></cor-button>
        </div>
      </cor-table-header>

      <cor-thead>
        <cor-column field="name" col-index="1">Name</cor-column>
        <cor-column field="email" col-index="2">Email</cor-column>
        <cor-column field="role" col-index="3">Role</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <cor-cell col-index="1">Alice Johnson</cor-cell>
          <cor-cell col-index="2">alice@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
        </cor-row>
        <cor-row row-id="2">
          <cor-cell col-index="1">Bob Smith</cor-cell>
          <cor-cell col-index="2">bob@example.com</cor-cell>
          <cor-cell col-index="3">Editor</cor-cell>
        </cor-row>
        <cor-row row-id="3">
          <cor-cell col-index="1">Carol Williams</cor-cell>
          <cor-cell col-index="2">carol@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
        </cor-row>
      </cor-tbody>
      <cor-tfoot>
        <cor-typography variant="body-xs" color="color-neutral-text-weak"><span>3 items</span></cor-typography>
      </cor-tfoot>
    </cor-table>
  `,
};

export const WithTableHeaderFull: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-table-header>
        <cor-typography slot="title" variant="heading-md"><span>Title</span></cor-typography>

        <cor-typography slot="description" variant="body-sm"><span>Description</span></cor-typography>

        <div slot="actions" style="display: flex; gap: 16px; align-items: center;">
          <cor-input size="md" placeholder="Search" style="width: 200px;">
            <cor-icon name="${ICON_NAMES.SEARCH}" slot="icon-left" />
          </cor-input>

          <cor-input size="md" value="Value" placeholder="Search" style="width: 135px;">
            <cor-icon name="${ICON_NAMES.CALENDAR}" slot="icon-left" />
          </cor-input>

          <cor-button variant="secondary-gray" size="md"><button type="button"><cor-icon name="${ICON_NAMES.FILTER}"></cor-icon>Filters</button></cor-button>
        </div>
      </cor-table-header>

      <cor-thead>
        <cor-column field="name" col-index="1">Name</cor-column>
        <cor-column field="email" col-index="2">Email</cor-column>
        <cor-column field="role" col-index="3">Role</cor-column>
        <cor-column field="status" col-index="4">Status</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <cor-cell col-index="1">Alice Johnson</cor-cell>
          <cor-cell col-index="2">alice@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
        <cor-row row-id="2">
          <cor-cell col-index="1">Bob Smith</cor-cell>
          <cor-cell col-index="2">bob@example.com</cor-cell>
          <cor-cell col-index="3">Editor</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
        <cor-row row-id="3">
          <cor-cell col-index="1">Carol Williams</cor-cell>
          <cor-cell col-index="2">carol@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
          <cor-cell col-index="4">Inactive</cor-cell>
        </cor-row>
        <cor-row row-id="4">
          <cor-cell col-index="1">Dave Brown</cor-cell>
          <cor-cell col-index="2">dave@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
          <cor-cell col-index="4">Pending</cor-cell>
        </cor-row>
      </cor-tbody>
      <cor-tfoot>
        <cor-typography variant="body-xs" color="color-neutral-text-weak"><span>4 items</span></cor-typography>
      </cor-tfoot>
    </cor-table>
  `,
};

export const WithAccessibilityLabels: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => /*html*/ `
    <h3 id="users-table-title" style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">User Management</h3>
    <p id="users-table-desc" style="margin: 0 0 16px; font-size: 14px; color: var(--color-text-base-secondary);">
      Active users in the system with their roles and permissions
    </p>

    <cor-table
      size="${args.size}"
      ${args.zebra ? 'zebra' : ''}
      ${args.bordered ? 'bordered' : ''}
      aria-labelledby="users-table-title"
      aria-describedby="users-table-desc"
    >
      <cor-thead>
        <cor-column field="name" col-index="1">Name</cor-column>
        <cor-column field="email" col-index="2">Email</cor-column>
        <cor-column field="role" col-index="3">Role</cor-column>
        <cor-column field="status" col-index="4">Status</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <cor-cell col-index="1">Alice Johnson</cor-cell>
          <cor-cell col-index="2">alice@example.com</cor-cell>
          <cor-cell col-index="3">Admin</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
        <cor-row row-id="2">
          <cor-cell col-index="1">Bob Smith</cor-cell>
          <cor-cell col-index="2">bob@example.com</cor-cell>
          <cor-cell col-index="3">Editor</cor-cell>
          <cor-cell col-index="4">Active</cor-cell>
        </cor-row>
        <cor-row row-id="3">
          <cor-cell col-index="1">Carol Williams</cor-cell>
          <cor-cell col-index="2">carol@example.com</cor-cell>
          <cor-cell col-index="3">Viewer</cor-cell>
          <cor-cell col-index="4">Inactive</cor-cell>
        </cor-row>
      </cor-tbody>
      <cor-tfoot>
        <cor-typography variant="body-xs" color="color-neutral-text-weak"><span>3 users</span></cor-typography>
      </cor-tfoot>
    </cor-table>

    <div style="margin-top: 24px; padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-size: 13px;">
      <strong>Accessibility:</strong> This table uses <code>aria-labelledby</code> and <code>aria-describedby</code>
      to provide screen readers with proper context. Screen readers will announce:
      "User Management, table. Active users in the system with their roles and permissions."
    </div>
  `,
};

export const WithPaginationARIA: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => /*html*/ `
    <cor-table
      size="${args.size}"
      ${args.zebra ? 'zebra' : ''}
      ${args.bordered ? 'bordered' : ''}
      aria-label="Transaction history"
      row-count="100"
      col-count="4"
    >
      <cor-thead>
        <cor-column field="date" col-index="1">Date</cor-column>
        <cor-column field="description" col-index="2">Description</cor-column>
        <cor-column field="amount" col-index="3">Amount</cor-column>
        <cor-column field="balance" col-index="4">Balance</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1" row-index="1">
          <cor-cell col-index="1">2024-01-15</cor-cell>
          <cor-cell col-index="2">Payment received</cor-cell>
          <cor-cell col-index="3">+$1,250.00</cor-cell>
          <cor-cell col-index="4">$5,430.00</cor-cell>
        </cor-row>
        <cor-row row-id="2" row-index="2">
          <cor-cell col-index="1">2024-01-14</cor-cell>
          <cor-cell col-index="2">Office supplies</cor-cell>
          <cor-cell col-index="3">-$89.50</cor-cell>
          <cor-cell col-index="4">$4,180.00</cor-cell>
        </cor-row>
        <cor-row row-id="3" row-index="3">
          <cor-cell col-index="1">2024-01-13</cor-cell>
          <cor-cell col-index="2">Software subscription</cor-cell>
          <cor-cell col-index="3">-$49.99</cor-cell>
          <cor-cell col-index="4">$4,269.50</cor-cell>
        </cor-row>
        <cor-row row-id="4" row-index="4">
          <cor-cell col-index="1">2024-01-12</cor-cell>
          <cor-cell col-index="2">Client invoice #_1234</cor-cell>
          <cor-cell col-index="3">+$2,500.00</cor-cell>
          <cor-cell col-index="4">$4,319.49</cor-cell>
        </cor-row>
        <cor-row row-id="5" row-index="5">
          <cor-cell col-index="1">2024-01-11</cor-cell>
          <cor-cell col-index="2">Utility payment</cor-cell>
          <cor-cell col-index="3">-$125.00</cor-cell>
          <cor-cell col-index="4">$1,819.49</cor-cell>
        </cor-row>
      </cor-tbody>
      <cor-tfoot>
        <cor-typography variant="body-xs" color="color-neutral-text-weak">
          <span>Showing 1-5 of 100 transactions</span>
        </cor-typography>
        <!-- Future: When cor-pagination is implemented, replace this with:
        <cor-pagination
          total-items="100"
          page-size="5"
          current-page="1"
          onCorPageChange={(e) => {
            // Update table with new data
            // Update row-index props to reflect actual position (e.g., page 2 would have row-index 6-10)
          }}
        />
        -->
      </cor-tfoot>
    </cor-table>

    <div style="margin-top: 24px; padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-size: 13px;">
      <strong>Accessibility:</strong> This table demonstrates pagination/virtual scrolling ARIA attributes:
      <ul style="margin: 8px 0 0; padding-left: 20px;">
        <li><code>row-count="100"</code> — Screen readers announce "Table with 100 rows"</li>
        <li><code>col-count="4"</code> — Screen readers announce "4 columns"</li>
        <li><code>row-index</code> on each row — Announces position "Row 1 of 100", "Row 2 of 100", etc.</li>
        <li><code>col-index</code> on cells — Helps with column hiding scenarios</li>
      </ul>
      <p style="margin: 12px 0 0; font-style: italic;">
        Note: When cor-pagination is implemented, row-index should be updated dynamically to reflect
        the actual row position in the full dataset (e.g., page 2 would show rows 6-10 with row-index 6-10).
      </p>
    </div>
  `,
};

export const AutoColumnWidths: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => /*html*/ `
    <cor-table size="${args.size}" ${args.zebra ? 'zebra' : ''} ${args.bordered ? 'bordered' : ''}>
      <cor-thead>
        <!-- Set width ONLY on cor-column, cells will inherit via col-index -->
        <cor-column field="order" width="60px" col-index="1">
          #
        </cor-column>
        <cor-column field="name" col-index="2">
          Name
        </cor-column>
        <cor-column field="email" width="240px" col-index="3">
          Email
        </cor-column>
        <cor-column field="role" width="120px" col-index="4">
          Role
        </cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <!-- No width needed on cells — they consume CSS vars via col-index -->
          <cor-cell col-index="1">1</cor-cell>
          <cor-cell col-index="2">Alice Johnson</cor-cell>
          <cor-cell col-index="3">alice@example.com</cor-cell>
          <cor-cell col-index="4">Admin</cor-cell>
        </cor-row>
        <cor-row row-id="2">
          <cor-cell col-index="1">2</cor-cell>
          <cor-cell col-index="2">Bob Smith</cor-cell>
          <cor-cell col-index="3">bob@example.com</cor-cell>
          <cor-cell col-index="4">Editor</cor-cell>
        </cor-row>
        <cor-row row-id="3">
          <cor-cell col-index="1">3</cor-cell>
          <cor-cell col-index="2">Carol White</cor-cell>
          <cor-cell col-index="3">carol@example.com</cor-cell>
          <cor-cell col-index="4">Viewer</cor-cell>
        </cor-row>
      </cor-tbody>
    </cor-table>

    <div style="margin-top: 24px; padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-size: 13px;">
      <strong>Pattern 1: Automatic Column Width Propagation</strong>
      <p style="margin: 8px 0;">
        Set <code>width</code> once on <code>cor-column</code> and <code>col-index</code> on both header and cells.
        The width automatically propagates to matching cells via CSS variables.
      </p>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Column #1: <code>width="60px"</code> → all cells with <code>col-index="1"</code> inherit</li>
        <li>Column #2: No width set → flexes to fill available space</li>
        <li>Column #3: <code>width="240px"</code> → all cells with <code>col-index="3"</code> inherit</li>
        <li>Column #4: <code>width="120px"</code> → all cells with <code>col-index="4"</code> inherit</li>
      </ul>
      <p style="margin: 8px 0 0;">
        <strong>Inspect DevTools:</strong> Check <code>cor-table</code> for CSS vars like <code>--cor-table-col-1-width: 60px</code>
      </p>
    </div>
  `,
};

export const LoadingState: Story = {
  args: {
    size: TableSize.LG,
    zebra: false,
    bordered: true,
  },
  render: (args: Partial<TableArgs>) => /*html*/ `
    <cor-table
      size="${args.size}"
      ${args.zebra ? 'zebra' : ''}
      ${args.bordered ? 'bordered' : ''}
      aria-label="User data"
      loading="true"
    >
      <cor-thead>
        <cor-column field="name" col-index="1">Name</cor-column>
        <cor-column field="email" col-index="2">Email</cor-column>
        <cor-column field="role" col-index="3">Role</cor-column>
      </cor-thead>
      <cor-tbody>
        <cor-row row-id="1">
          <cor-cell col-index="1">Loading...</cor-cell>
          <cor-cell col-index="2">Loading...</cor-cell>
          <cor-cell col-index="3">Loading...</cor-cell>
        </cor-row>
        <cor-row row-id="2">
          <cor-cell col-index="1">Loading...</cor-cell>
          <cor-cell col-index="2">Loading...</cor-cell>
          <cor-cell col-index="3">Loading...</cor-cell>
        </cor-row>
        <cor-row row-id="3">
          <cor-cell col-index="1">Loading...</cor-cell>
          <cor-cell col-index="2">Loading...</cor-cell>
          <cor-cell col-index="3">Loading...</cor-cell>
        </cor-row>
      </cor-tbody>
    </cor-table>

    <div style="margin-top: 24px; padding: 16px; background: var(--color-background-base-default); border-radius: 4px; font-size: 13px;">
      <strong>Accessibility:</strong> The <code>loading</code> prop adds <code>aria-busy="true"</code>
      to the table, which tells screen readers: "Table is busy loading". This prevents users from
      interacting with incomplete data.
      <p style="margin: 12px 0 0;">
        <strong>Note:</strong> This prop currently only adds the ARIA attribute for screen reader support.
        Visual loading indicators (skeleton screens, spinners, opacity changes) can be added in future iterations
        based on design requirements.
      </p>
    </div>
  `,
};
