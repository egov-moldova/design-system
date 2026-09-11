import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { ACCORDION_ICON_POSITIONS, ACCORDION_SIZES } from '../mud-accordion/mud-accordion.types';
import type { AccordionIconPosition, AccordionSize } from '../mud-accordion/mud-accordion.types';

type AccordionItemArgs = {
  heading: string;
  supportingText: string;
  open: boolean;
  disabled: boolean;
  size: AccordionSize;
  iconPosition: AccordionIconPosition;
};

const wrapperStyle = 'display: block; padding: var(--spacing-24); max-width: 996px;';

/** Escapes a control value for interpolation into a double-quoted HTML attribute. */
const attr = (value: string) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

// `size` and `icon-position` go on the container, not on the item: `mud-accordion`
// assigns both onto every child in `propagateToItems()` (mud-accordion.tsx:176) from
// its own `componentDidLoad`, which runs after the child's — so an item-level value
// is overwritten before first paint and the control would do nothing.
const renderItem = (args: AccordionItemArgs) => /*html*/ `
  <div style="${wrapperStyle}">
    <mud-accordion mode="multiple" size="${args.size}" icon-position="${args.iconPosition}">
      <mud-accordion-item
        heading="${attr(args.heading)}"
        ${args.supportingText ? `supporting-text="${attr(args.supportingText)}"` : ''}
        ${args.open ? 'open' : ''}
        ${args.disabled ? 'disabled' : ''}
      >
        Panel body content. Always in the DOM; hidden while the item is closed.
      </mud-accordion-item>
    </mud-accordion>
  </div>
`;

const docsSourceAllSizes = /*html*/ `<mud-accordion mode="multiple" size="sm">
  <mud-accordion-item heading="size=&quot;sm&quot;" supporting-text="Compact header">Panel body.</mud-accordion-item>
</mud-accordion>

<mud-accordion mode="multiple" size="md">
  <mud-accordion-item heading="size=&quot;md&quot;" supporting-text="Default header">Panel body.</mud-accordion-item>
</mud-accordion>`;

const docsSourceStates = /*html*/ `<mud-accordion mode="multiple">
  <mud-accordion-item heading="Closed">Panel body.</mud-accordion-item>
  <mud-accordion-item heading="Open" open>Panel body.</mud-accordion-item>
  <mud-accordion-item heading="Disabled" disabled>Panel body.</mud-accordion-item>
</mud-accordion>`;

const meta: Meta<AccordionItemArgs> = {
  title: 'Molecules/Accordion Item',
  component: 'mud-accordion-item',
  // The item's API table is rendered on the Accordion docs page (mud-accordion.mdx),
  // because the item is not usable outside a `mud-accordion`. A second autodocs page
  // would compete with it for the same content.
  tags: ['!autodocs'],
  argTypes: {
    heading: { control: 'text' },
    supportingText: { control: 'text' },
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ACCORDION_SIZES },
    iconPosition: { control: 'select', options: ACCORDION_ICON_POSITIONS },
  },
  parameters: {
    layout: 'fullscreen',
    // The manifest feeds this component's argTypes (see .storybook/preview.js), and
    // `wca` lists every public class field as a property — so `@Element() host`
    // arrives as a control over a live DOM node. The docs blocks exclude it too;
    // this key is what keeps it out of the Canvas Controls panel.
    controls: { exclude: ['host'] },
  },
};
export default meta;

type Story = StoryObj<AccordionItemArgs>;

export const Default: Story = {
  render: renderItem,
  args: {
    heading: 'Cum efectuez o plată cu MPay?',
    supportingText: 'Pași simpli pentru autentificare și confirmare',
    open: false,
    disabled: false,
    size: 'md',
    iconPosition: 'right',
  },
};

export const AllSizes: Story = {
  render: () => /*html*/ `
    <div style="${wrapperStyle}">
      <mud-accordion mode="multiple" size="sm">
        <mud-accordion-item heading="size=&quot;sm&quot;" supporting-text="Compact header">Panel body.</mud-accordion-item>
      </mud-accordion>
      <mud-accordion mode="multiple" size="md">
        <mud-accordion-item heading="size=&quot;md&quot;" supporting-text="Default header">Panel body.</mud-accordion-item>
      </mud-accordion>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllSizes } },
  },
};

export const States: Story = {
  render: () => /*html*/ `
    <div style="${wrapperStyle}">
      <mud-accordion mode="multiple">
        <mud-accordion-item heading="Closed">Panel body.</mud-accordion-item>
        <mud-accordion-item heading="Open" open>Panel body.</mud-accordion-item>
        <mud-accordion-item heading="Disabled" disabled>Panel body.</mud-accordion-item>
      </mud-accordion>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceStates } },
  },
};
