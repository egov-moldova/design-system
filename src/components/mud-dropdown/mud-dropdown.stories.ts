import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { DROPDOWN_ALIGNS } from './mud-dropdown.types';
import type { DropdownAlign } from './mud-dropdown.types';

type DropdownArgs = {
  align: DropdownAlign;
};

const OPTIONS = ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5', 'Option 6'];

const menu = () => /*html*/ `
  <mud-menu type="contextual" aria-label="Options">
    ${OPTIONS.map((label, i) => `<mud-menu-item value="o${i + 1}">${label}</mud-menu-item>`).join('')}
  </mud-menu>`;

// Figma Menu › Dismissal (430:25768): a circular primary medium button with a
// trailing chevron, the contextual menu 4px under it, left edges aligned.
const renderDefault = (args: DropdownArgs) => /*html*/ `
  <div style="padding: var(--spacing-24); min-block-size: 420px;">
    <mud-dropdown align="${args.align}">
      <mud-button slot="trigger" shape="circular">
        Button
        <mud-icon slot="icon-end" name="chevron-bottom" size="20"></mud-icon>
      </mud-button>
      ${menu()}
    </mud-dropdown>
  </div>
`;

const docsSourceDefault = /*html*/ `<mud-dropdown>
  <mud-button slot="trigger" shape="circular">
    Button
    <mud-icon slot="icon-end" name="chevron-bottom" size="20"></mud-icon>
  </mud-button>
  <mud-menu type="contextual" aria-label="Options">
    <mud-menu-item value="o1">Option 1</mud-menu-item>
    <mud-menu-item value="o2">Option 2</mud-menu-item>
    <mud-menu-item value="o3">Option 3</mud-menu-item>
  </mud-menu>
</mud-dropdown>`;

// Row actions: an icon-only "more" trigger at the end of a row opens the menu
// inwards. Figma draws the trigger with a label; the icon-only form follows the
// same placement and dismissal (design review 12.10.2026).
const renderRowActions = () => /*html*/ `
  <div style="display: flex; justify-content: flex-end; padding: var(--spacing-24); min-block-size: 240px; max-inline-size: 640px;">
    <mud-dropdown align="end">
      <mud-button slot="trigger" appearance="text" variant="neutral" icon-only aria-label="Acțiuni">
        <mud-icon slot="icon" name="more-vertical" size="20"></mud-icon>
      </mud-button>
      <mud-menu type="contextual" aria-label="Acțiuni pentru rând">
        <mud-menu-item value="view" leading="icon" icon="eye-open">Vizualizează</mud-menu-item>
        <mud-menu-item value="edit" leading="icon" icon="edit">Editează</mud-menu-item>
        <mud-menu-item value="delete" leading="icon" icon="delete">Șterge</mud-menu-item>
      </mud-menu>
    </mud-dropdown>
  </div>
`;

const docsSourceRowActions = /*html*/ `<mud-dropdown align="end">
  <mud-button slot="trigger" appearance="text" variant="neutral" icon-only aria-label="Acțiuni">
    <mud-icon slot="icon" name="more-vertical" size="20"></mud-icon>
  </mud-button>
  <mud-menu type="contextual" aria-label="Acțiuni pentru rând">
    <mud-menu-item value="view" leading="icon" icon="eye-open">Vizualizează</mud-menu-item>
    <mud-menu-item value="edit" leading="icon" icon="edit">Editează</mud-menu-item>
    <mud-menu-item value="delete" leading="icon" icon="delete">Șterge</mud-menu-item>
  </mud-menu>
</mud-dropdown>`;

const meta: Meta<DropdownArgs> = {
  title: 'Components/Dropdown',
  component: 'mud-dropdown',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Opens a `mud-menu` from a trigger (Figma Menu › Dismissal, 430:25768): the menu 4px under the trigger, ' +
          'lined up with its left edge, or its right edge with `align="end"`. It closes when the trigger is pressed ' +
          'again, when an item is chosen, on a press outside, when focus leaves it, and on Escape. Listen for ' +
          '`mudSelect` from the menu to act on the choice.',
      },
    },
  },
  argTypes: {
    align: {
      control: 'inline-radio',
      options: DROPDOWN_ALIGNS,
      description: 'Which edge of the trigger the menu lines up with.',
      table: { defaultValue: { summary: 'start' } },
    },
  },
  args: { align: 'start' },
};

export default meta;
type Story = StoryObj<DropdownArgs>;

export const Default: Story = {
  render: renderDefault,
  parameters: { docs: { source: { code: docsSourceDefault } } },
};

export const RowActions: Story = {
  name: 'Row Actions',
  render: renderRowActions,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceRowActions } } },
};
