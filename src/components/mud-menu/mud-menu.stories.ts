import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { MENU_ITEM_LEADINGS, MENU_TYPES } from './mud-menu.types';
import type { MenuItemLeading, MenuType } from './mud-menu.types';

// ---------------------------------------------------------------------------
// Args type — reflects mud-menu's primary @Prop() surface
// ---------------------------------------------------------------------------

type MenuArgs = {
  type: MenuType;
  open: boolean;
  value: string;
  closeOnSelect: boolean;
  ariaLabel: string;
};

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------

const wrapStyle =
  'display: flex; flex-wrap: wrap; gap: var(--spacing-32); padding: var(--spacing-24); align-items: flex-start;';

const panelWidth = 'width: 270px;';

const cellLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0 0 var(--spacing-8);';

const cell = (
  caption: string,
  body: string,
) => /*html*/ `<div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <p style="${cellLabelStyle}">${caption}</p>
    ${body}
  </div>`;

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

const renderSelectionMenu = (args: MenuArgs) => /*html*/ `
  <div style="${panelWidth}">
    <mud-menu
      type="selection"
      ${args.open ? 'open' : ''}
      ${args.value ? `value="${args.value}"` : ''}
      ${args.closeOnSelect ? 'close-on-select' : ''}
      ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
    >
      <mud-menu-item value="1">Option 1</mud-menu-item>
      <mud-menu-item value="2">Option 2</mud-menu-item>
      <mud-menu-item value="3">Option 3</mud-menu-item>
      <mud-menu-item value="4">Option 4</mud-menu-item>
      <mud-menu-item value="5">Option 5</mud-menu-item>
      <mud-menu-item value="6">Option 6</mud-menu-item>
    </mud-menu>
  </div>
`;

const docsSourceDefault = (args: MenuArgs) => {
  const attrs = [
    `type="${args.type}"`,
    args.open ? 'open' : '',
    args.value ? `value="${args.value}"` : '',
    args.closeOnSelect ? 'close-on-select' : '',
    args.ariaLabel ? `aria-label="${args.ariaLabel}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<mud-menu ${attrs}>
  <mud-menu-item value="1">Option 1</mud-menu-item>
  <mud-menu-item value="2">Option 2</mud-menu-item>
  <mud-menu-item value="3">Option 3</mud-menu-item>
  <mud-menu-item value="4">Option 4</mud-menu-item>
  <mud-menu-item value="5">Option 5</mud-menu-item>
  <mud-menu-item value="6">Option 6</mud-menu-item>
</mud-menu>`;
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<MenuArgs> = {
  title: 'Molecules/Menu',
  component: 'mud-menu',
  argTypes: {
    type: {
      control: 'select',
      options: MENU_TYPES,
      description:
        'Menu semantics. `selection` = single-select list (ARIA listbox) with trailing checkmark on selected item. `contextual` = action menu (ARIA menu).',
      table: { defaultValue: { summary: 'contextual' } },
    },
    open: {
      control: 'boolean',
      description: 'Whether the panel is shown. Set `false` to hide it when used inside a popover.',
      table: { defaultValue: { summary: 'true' } },
    },
    value: {
      control: 'text',
      description:
        'Currently selected value (selection menus). Propagated down to items to drive the trailing checkmark.',
      table: { defaultValue: { summary: '' } },
    },
    closeOnSelect: {
      control: 'boolean',
      description: 'Emit `mudClose` immediately after any item is activated.',
      table: { defaultValue: { summary: 'false' } },
    },
    ariaLabel: {
      control: 'text',
      description: "Accessible name forwarded to the panel's `aria-label`.",
      table: { defaultValue: { summary: '' } },
    },
  },
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<MenuArgs>;

// ---------------------------------------------------------------------------
// 1. Default / SelectionMenu
// ---------------------------------------------------------------------------

export const Default: Story = {
  name: 'Selection Menu',
  render: renderSelectionMenu,
  args: {
    type: 'selection',
    open: true,
    value: '1',
    closeOnSelect: false,
    ariaLabel: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: MenuArgs }) => docsSourceDefault(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// 2. ContextualMenu
// ---------------------------------------------------------------------------

const docsSourceContextual = /*html*/ `<mud-menu type="contextual" open>
  <mud-menu-item value="copy">Copy</mud-menu-item>
  <mud-menu-item value="paste">Paste</mud-menu-item>
  <mud-menu-item value="cut">Cut</mud-menu-item>
  <mud-menu-item value="select-all">Select All</mud-menu-item>
  <mud-menu-item value="undo">Undo</mud-menu-item>
  <mud-menu-item value="redo">Redo</mud-menu-item>
</mud-menu>`;

export const ContextualMenu: Story = {
  name: 'Contextual Menu',
  render: () => /*html*/ `
    <div style="${panelWidth}">
      <mud-menu type="contextual" open>
        <mud-menu-item value="copy">Copy</mud-menu-item>
        <mud-menu-item value="paste">Paste</mud-menu-item>
        <mud-menu-item value="cut">Cut</mud-menu-item>
        <mud-menu-item value="select-all">Select All</mud-menu-item>
        <mud-menu-item value="undo">Undo</mud-menu-item>
        <mud-menu-item value="redo">Redo</mud-menu-item>
      </mud-menu>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceContextual } },
  },
};

// ---------------------------------------------------------------------------
// 3. WithLeadingIcons
// ---------------------------------------------------------------------------

const docsSourceWithLeadingIcons = /*html*/ `<mud-menu type="contextual" open>
  <mud-menu-item value="edit" leading="icon" icon="edit">Edit</mud-menu-item>
  <mud-menu-item value="copy" leading="icon" icon="copy">Copy</mud-menu-item>
  <mud-menu-item value="download" leading="icon" icon="download">Download</mud-menu-item>
  <mud-menu-item value="delete" leading="icon" icon="delete">Delete</mud-menu-item>
  <mud-menu-item value="settings" leading="icon" icon="settings">Settings</mud-menu-item>
  <mud-menu-item value="filter" leading="icon" icon="filter">Filter</mud-menu-item>
</mud-menu>`;

export const WithLeadingIcons: Story = {
  name: 'With Leading Icons',
  render: () => /*html*/ `
    <div style="${panelWidth}">
      <mud-menu type="contextual" open>
        <mud-menu-item value="edit" leading="icon" icon="edit">Edit</mud-menu-item>
        <mud-menu-item value="copy" leading="icon" icon="copy">Copy</mud-menu-item>
        <mud-menu-item value="download" leading="icon" icon="download">Download</mud-menu-item>
        <mud-menu-item value="delete" leading="icon" icon="delete">Delete</mud-menu-item>
        <mud-menu-item value="settings" leading="icon" icon="settings">Settings</mud-menu-item>
        <mud-menu-item value="filter" leading="icon" icon="filter">Filter</mud-menu-item>
      </mud-menu>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithLeadingIcons } },
  },
};

// ---------------------------------------------------------------------------
// 4. WithCheckboxes
// ---------------------------------------------------------------------------

const docsSourceWithCheckboxes = /*html*/ `<mud-menu type="contextual" open>
  <mud-menu-item value="bold" leading="checkbox" selected>Bold</mud-menu-item>
  <mud-menu-item value="italic" leading="checkbox">Italic</mud-menu-item>
  <mud-menu-item value="underline" leading="checkbox" selected>Underline</mud-menu-item>
  <mud-menu-item value="strikethrough" leading="checkbox">Strikethrough</mud-menu-item>
  <mud-menu-item value="superscript" leading="checkbox">Superscript</mud-menu-item>
  <mud-menu-item value="subscript" leading="checkbox">Subscript</mud-menu-item>
</mud-menu>`;

export const WithCheckboxes: Story = {
  name: 'With Checkboxes',
  render: () => /*html*/ `
    <div style="${panelWidth}">
      <mud-menu type="contextual" open>
        <mud-menu-item value="bold" leading="checkbox" selected>Bold</mud-menu-item>
        <mud-menu-item value="italic" leading="checkbox">Italic</mud-menu-item>
        <mud-menu-item value="underline" leading="checkbox" selected>Underline</mud-menu-item>
        <mud-menu-item value="strikethrough" leading="checkbox">Strikethrough</mud-menu-item>
        <mud-menu-item value="superscript" leading="checkbox">Superscript</mud-menu-item>
        <mud-menu-item value="subscript" leading="checkbox">Subscript</mud-menu-item>
      </mud-menu>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithCheckboxes } },
  },
};

// ---------------------------------------------------------------------------
// 5. WithRadios
// ---------------------------------------------------------------------------

const docsSourceWithRadios = /*html*/ `<mud-menu type="contextual" open>
  <mud-menu-item value="small" leading="radio">Small</mud-menu-item>
  <mud-menu-item value="medium" leading="radio" selected>Medium</mud-menu-item>
  <mud-menu-item value="large" leading="radio">Large</mud-menu-item>
  <mud-menu-item value="extra-large" leading="radio">Extra Large</mud-menu-item>
  <mud-menu-item value="compact" leading="radio">Compact</mud-menu-item>
  <mud-menu-item value="spacious" leading="radio">Spacious</mud-menu-item>
</mud-menu>`;

export const WithRadios: Story = {
  name: 'With Radios',
  render: () => /*html*/ `
    <div style="${panelWidth}">
      <mud-menu type="contextual" open>
        <mud-menu-item value="small" leading="radio">Small</mud-menu-item>
        <mud-menu-item value="medium" leading="radio" selected>Medium</mud-menu-item>
        <mud-menu-item value="large" leading="radio">Large</mud-menu-item>
        <mud-menu-item value="extra-large" leading="radio">Extra Large</mud-menu-item>
        <mud-menu-item value="compact" leading="radio">Compact</mud-menu-item>
        <mud-menu-item value="spacious" leading="radio">Spacious</mud-menu-item>
      </mud-menu>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithRadios } },
  },
};

// ---------------------------------------------------------------------------
// 6. WithSectionHeading
// ---------------------------------------------------------------------------

const docsSourceWithSectionHeading = /*html*/ `<mud-menu type="contextual" open>
  <mud-menu-item value="view" leading="icon" icon="search">View</mud-menu-item>
  <mud-menu-item value="copy" leading="icon" icon="copy">Copy</mud-menu-item>
  <mud-menu-item value="edit" leading="icon" icon="edit">Edit</mud-menu-item>
  <mud-menu-item heading>Danger Zone</mud-menu-item>
  <mud-menu-item value="delete" leading="icon" icon="delete">Delete</mud-menu-item>
  <mud-menu-item value="settings" leading="icon" icon="settings">Settings</mud-menu-item>
</mud-menu>`;

export const WithSectionHeading: Story = {
  name: 'With Section Heading',
  render: () => /*html*/ `
    <div style="${panelWidth}">
      <mud-menu type="contextual" open>
        <mud-menu-item value="view" leading="icon" icon="search">View</mud-menu-item>
        <mud-menu-item value="copy" leading="icon" icon="copy">Copy</mud-menu-item>
        <mud-menu-item value="edit" leading="icon" icon="edit">Edit</mud-menu-item>
        <mud-menu-item heading>Danger Zone</mud-menu-item>
        <mud-menu-item value="delete" leading="icon" icon="delete">Delete</mud-menu-item>
        <mud-menu-item value="settings" leading="icon" icon="settings">Settings</mud-menu-item>
      </mud-menu>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithSectionHeading } },
  },
};

// ---------------------------------------------------------------------------
// 7. DisabledItems
// ---------------------------------------------------------------------------

const docsSourceDisabledItems = /*html*/ `<mud-menu type="contextual" open>
  <mud-menu-item value="copy" leading="icon" icon="copy">Copy</mud-menu-item>
  <mud-menu-item value="edit" leading="icon" icon="edit">Edit</mud-menu-item>
  <mud-menu-item value="download" leading="icon" icon="download" disabled>Download</mud-menu-item>
  <mud-menu-item value="delete" leading="icon" icon="delete" disabled>Delete</mud-menu-item>
  <mud-menu-item value="settings" leading="icon" icon="settings">Settings</mud-menu-item>
</mud-menu>`;

export const DisabledItems: Story = {
  name: 'Disabled Items',
  render: () => /*html*/ `
    <div style="${panelWidth}">
      <mud-menu type="contextual" open>
        <mud-menu-item value="copy" leading="icon" icon="copy">Copy</mud-menu-item>
        <mud-menu-item value="edit" leading="icon" icon="edit">Edit</mud-menu-item>
        <mud-menu-item value="download" leading="icon" icon="download" disabled>Download</mud-menu-item>
        <mud-menu-item value="delete" leading="icon" icon="delete" disabled>Delete</mud-menu-item>
        <mud-menu-item value="settings" leading="icon" icon="settings">Settings</mud-menu-item>
      </mud-menu>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceDisabledItems } },
  },
};

// ---------------------------------------------------------------------------
// 8. Scrollable
// ---------------------------------------------------------------------------

const scrollableItems = Array.from({ length: 15 }, (_, i) => i + 1)
  .map(n => `  <mud-menu-item value="${n}">Option ${n}</mud-menu-item>`)
  .join('\n');

const docsSourceScrollable = `<mud-menu type="selection" open value="1">
${scrollableItems}
</mud-menu>`;

export const Scrollable: Story = {
  name: 'Scrollable (15 items)',
  render: () => /*html*/ `
    <div style="${panelWidth}">
      <mud-menu type="selection" open value="1">
        ${Array.from({ length: 15 }, (_, i) => i + 1)
          .map(n => `<mud-menu-item value="${n}">Option ${n}</mud-menu-item>`)
          .join('\n        ')}
      </mud-menu>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceScrollable } },
  },
};

// ---------------------------------------------------------------------------
// 9. AllStates — grid: Default / Selected / Disabled / Heading separator
// ---------------------------------------------------------------------------

const docsSourceAllStates = /*html*/ `<!-- Default item -->
<mud-menu type="contextual" open>
  <mud-menu-item value="action">Action</mud-menu-item>
</mud-menu>

<!-- Selected item (selection menu) -->
<mud-menu type="selection" open value="action">
  <mud-menu-item value="action">Action</mud-menu-item>
</mud-menu>

<!-- Disabled item -->
<mud-menu type="contextual" open>
  <mud-menu-item value="action" disabled>Action</mud-menu-item>
</mud-menu>

<!-- With section heading -->
<mud-menu type="contextual" open>
  <mud-menu-item value="action">Action</mud-menu-item>
  <mud-menu-item heading>Section</mud-menu-item>
  <mud-menu-item value="other">Other</mud-menu-item>
</mud-menu>`;

export const AllStates: Story = {
  name: 'All States',
  render: () => /*html*/ `
    <div style="${wrapStyle}">
      ${cell(
        'default item',
        /*html*/ `<div style="${panelWidth}">
        <mud-menu type="contextual" open>
          <mud-menu-item value="action">Action</mud-menu-item>
          <mud-menu-item value="other">Other</mud-menu-item>
        </mud-menu>
      </div>`,
      )}
      ${cell(
        'selected item (selection)',
        /*html*/ `<div style="${panelWidth}">
        <mud-menu type="selection" open value="action">
          <mud-menu-item value="action">Action</mud-menu-item>
          <mud-menu-item value="other">Other</mud-menu-item>
        </mud-menu>
      </div>`,
      )}
      ${cell(
        'disabled item',
        /*html*/ `<div style="${panelWidth}">
        <mud-menu type="contextual" open>
          <mud-menu-item value="action">Action</mud-menu-item>
          <mud-menu-item value="other" disabled>Disabled</mud-menu-item>
        </mud-menu>
      </div>`,
      )}
      ${cell(
        'with section heading',
        /*html*/ `<div style="${panelWidth}">
        <mud-menu type="contextual" open>
          <mud-menu-item value="action">Action</mud-menu-item>
          <mud-menu-item heading>Section</mud-menu-item>
          <mud-menu-item value="other">Other</mud-menu-item>
        </mud-menu>
      </div>`,
      )}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllStates } },
  },
};

// ---------------------------------------------------------------------------
// 10. AllLeadingTypes — grid comparing all leading= values
// ---------------------------------------------------------------------------

const leadingLabels: Record<MenuItemLeading, string> = {
  none: 'none',
  checkbox: 'checkbox',
  radio: 'radio',
  icon: 'icon',
};

const docsSourceAllLeadingTypes = MENU_ITEM_LEADINGS.map(
  leading =>
    `<mud-menu type="contextual" open>
  <mud-menu-item value="a" leading="${leading}"${leading === 'icon' ? ' icon="edit"' : ''}>Option A</mud-menu-item>
  <mud-menu-item value="b" leading="${leading}"${leading === 'icon' ? ' icon="copy"' : ''} selected>Option B</mud-menu-item>
  <mud-menu-item value="c" leading="${leading}"${leading === 'icon' ? ' icon="delete"' : ''} disabled>Option C</mud-menu-item>
</mud-menu>`,
).join('\n\n');

export const AllLeadingTypes: Story = {
  name: 'All Leading Types',
  render: () => /*html*/ `
    <div style="${wrapStyle}">
      ${MENU_ITEM_LEADINGS.map(
        leading => /*html*/ `
        ${cell(
          `leading="${leadingLabels[leading]}"`,
          /*html*/ `<div style="${panelWidth}">
          <mud-menu type="contextual" open>
            <mud-menu-item value="a" leading="${leading}"${leading === 'icon' ? ' icon="edit"' : ''}>Option A</mud-menu-item>
            <mud-menu-item value="b" leading="${leading}"${leading === 'icon' ? ' icon="copy"' : ''} selected>Option B</mud-menu-item>
            <mud-menu-item value="c" leading="${leading}"${leading === 'icon' ? ' icon="delete"' : ''} disabled>Option C</mud-menu-item>
          </mud-menu>
        </div>`,
        )}`,
      ).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllLeadingTypes } },
  },
};
