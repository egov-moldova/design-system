import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { BUTTON_GROUP_ORIENTATIONS } from './mud-button-group.types';
import type { ButtonGroupOrientation } from './mud-button-group.types';

type ButtonGroupArgs = {
  orientation: ButtonGroupOrientation;
  label: string;
};

const sectionLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0 0 var(--spacing-8); font-style: italic;';

const renderDefault = (args: ButtonGroupArgs) => /*html*/ `
  <mud-button-group
    orientation="${args.orientation}"
    ${args.label ? `label="${args.label}"` : ''}
  >
    <mud-button variant="secondary">Cancel</mud-button>
    <mud-button variant="primary">Save</mud-button>
  </mud-button-group>
`;

const docsSourceDefault = (args: ButtonGroupArgs) => {
  const attrs = [
    args.orientation !== 'horizontal' ? `orientation="${args.orientation}"` : '',
    args.label ? `label="${args.label}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const open = attrs ? `<mud-button-group ${attrs}>` : '<mud-button-group>';
  return `${open}
  <mud-button variant="secondary">Cancel</mud-button>
  <mud-button variant="primary">Save</mud-button>
</mud-button-group>`;
};

const renderHorizontal = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); align-items: flex-start;">
    <div>
      <p style="${sectionLabelStyle}">Natural width — buttons keep their intrinsic size.</p>
      <mud-button-group orientation="horizontal">
        <mud-button variant="secondary">Cancel</mud-button>
        <mud-button variant="primary">Save</mud-button>
      </mud-button-group>
    </div>

    <div>
      <p style="${sectionLabelStyle}">Three buttons, mixed variants.</p>
      <mud-button-group orientation="horizontal">
        <mud-button variant="neutral">Back</mud-button>
        <mud-button variant="secondary">Save draft</mud-button>
        <mud-button variant="primary">Publish</mud-button>
      </mud-button-group>
    </div>
  </div>
`;

const docsSourceHorizontal = /*html*/ `<mud-button-group orientation="horizontal">
  <mud-button variant="secondary">Cancel</mud-button>
  <mud-button variant="primary">Save</mud-button>
</mud-button-group>

<mud-button-group orientation="horizontal">
  <mud-button variant="neutral">Back</mud-button>
  <mud-button variant="secondary">Save draft</mud-button>
  <mud-button variant="primary">Publish</mud-button>
</mud-button-group>`;

const renderVertical = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); align-items: flex-start;">
    <div style="width: 280px;">
      <p style="${sectionLabelStyle}">Two buttons, stacked vertically. Container width = 280px.</p>
      <mud-button-group orientation="vertical">
        <mud-button variant="primary">Continue</mud-button>
        <mud-button variant="secondary">Back</mud-button>
      </mud-button-group>
    </div>

    <div style="width: 280px;">
      <p style="${sectionLabelStyle}">Three buttons, vertical stack.</p>
      <mud-button-group orientation="vertical">
        <mud-button variant="primary">Save changes</mud-button>
        <mud-button variant="secondary">Save as draft</mud-button>
        <mud-button variant="neutral">Discard</mud-button>
      </mud-button-group>
    </div>
  </div>
`;

const docsSourceVertical = /*html*/ `<mud-button-group orientation="vertical">
  <mud-button variant="primary">Continue</mud-button>
  <mud-button variant="secondary">Back</mud-button>
</mud-button-group>`;

const renderHorizontalFullWidth = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); align-items: flex-start;">
    <p style="${sectionLabelStyle}">Match Figma horizontal-stack — children with <code>full-width</code> share the container space equally (container = 450px).</p>
    <div style="width: 450px;">
      <mud-button-group orientation="horizontal" style="display: flex; width: 100%;">
        <mud-button variant="secondary" full-width>Cancel</mud-button>
        <mud-button variant="primary" full-width>Save</mud-button>
      </mud-button-group>
    </div>
  </div>
`;

const docsSourceHorizontalFullWidth = /*html*/ `<!-- The group itself stretches to its container; each child mud-button
     opts into full-width so the buttons split available space equally. -->
<div style="width: 450px;">
  <mud-button-group orientation="horizontal" style="display: flex; width: 100%;">
    <mud-button variant="secondary" full-width>Cancel</mud-button>
    <mud-button variant="primary" full-width>Save</mud-button>
  </mud-button-group>
</div>`;

const renderVerticalFullWidth = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); align-items: flex-start;">
    <p style="${sectionLabelStyle}">Match Figma vertical-stack — children with <code>full-width</code> fill the container width (container = 400px).</p>
    <div style="width: 400px;">
      <mud-button-group orientation="vertical">
        <mud-button variant="primary" full-width>Save</mud-button>
        <mud-button variant="secondary" full-width>Cancel</mud-button>
      </mud-button-group>
    </div>
  </div>
`;

const docsSourceVerticalFullWidth = /*html*/ `<!-- Vertical group already stretches children (align-items: stretch);
     full-width on each mud-button makes them fill the container width. -->
<div style="width: 400px;">
  <mud-button-group orientation="vertical">
    <mud-button variant="primary" full-width>Save</mud-button>
    <mud-button variant="secondary" full-width>Cancel</mud-button>
  </mud-button-group>
</div>`;

const renderWithLabel = () => /*html*/ `
  <div style="padding: var(--spacing-24);">
    <p style="${sectionLabelStyle}">The <code>label</code> prop sets <code>aria-label</code> on the host (<code>role="group"</code>) so screen readers announce the buttons as a unit.</p>
    <mud-button-group label="Form actions">
      <mud-button variant="secondary">Cancel</mud-button>
      <mud-button variant="primary" type="submit">Save</mud-button>
    </mud-button-group>
  </div>
`;

const docsSourceWithLabel = /*html*/ `<mud-button-group label="Form actions">
  <mud-button variant="secondary">Cancel</mud-button>
  <mud-button variant="primary" type="submit">Save</mud-button>
</mud-button-group>`;

const renderMixedSizes = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-16); padding: var(--spacing-24); align-items: flex-start;">
    <p style="${sectionLabelStyle}">The group does <strong>not</strong> propagate <code>size</code> to children — each <code>mud-button</code> remains independent.</p>
    <mud-button-group>
      <mud-button variant="secondary" size="sm">Small</mud-button>
      <mud-button variant="primary" size="md">Medium</mud-button>
      <mud-button variant="primary" size="lg">Large</mud-button>
    </mud-button-group>
  </div>
`;

const docsSourceMixedSizes = /*html*/ `<mud-button-group>
  <mud-button variant="secondary" size="sm">Small</mud-button>
  <mud-button variant="primary" size="md">Medium</mud-button>
  <mud-button variant="primary" size="lg">Large</mud-button>
</mud-button-group>`;

const meta: Meta<ButtonGroupArgs> = {
  title: 'Molecules/Button Group',
  component: 'mud-button-group',
  argTypes: {
    orientation: {
      control: 'select',
      options: BUTTON_GROUP_ORIENTATIONS,
      description: 'Axis along which buttons are stacked.',
      table: { defaultValue: { summary: 'horizontal' } },
    },
    label: {
      control: 'text',
      description: 'Accessible name forwarded to `aria-label` (paired with `role="group"`).',
    },
  },
};
export default meta;

type Story = StoryObj<ButtonGroupArgs>;

// ---------------------------------------------------------------------------
// Default — interactive playground
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderDefault,
  args: {
    orientation: 'horizontal',
    label: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: ButtonGroupArgs }) => docsSourceDefault(args),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Horizontal — natural width, mixed variants
// ---------------------------------------------------------------------------
export const Horizontal: Story = {
  render: renderHorizontal,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceHorizontal } },
  },
};

// ---------------------------------------------------------------------------
// Vertical — natural width, stacked column
// ---------------------------------------------------------------------------
export const Vertical: Story = {
  render: renderVertical,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceVertical } },
  },
};

// ---------------------------------------------------------------------------
// HorizontalFullWidth — matches Figma horizontal-stack
// ---------------------------------------------------------------------------
export const HorizontalFullWidth: Story = {
  render: renderHorizontalFullWidth,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceHorizontalFullWidth } },
  },
};

// ---------------------------------------------------------------------------
// VerticalFullWidth — matches Figma vertical-stack
// ---------------------------------------------------------------------------
export const VerticalFullWidth: Story = {
  render: renderVerticalFullWidth,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceVerticalFullWidth } },
  },
};

// ---------------------------------------------------------------------------
// WithLabel — accessible grouping demo
// ---------------------------------------------------------------------------
export const WithLabel: Story = {
  render: renderWithLabel,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithLabel } },
  },
};

// ---------------------------------------------------------------------------
// MixedSizes — confirms group does not propagate `size`
// ---------------------------------------------------------------------------
export const MixedSizes: Story = {
  render: renderMixedSizes,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceMixedSizes } },
  },
};

// ---------------------------------------------------------------------------
// CoverageGuard — Stencil constructor branch coverage
// ---------------------------------------------------------------------------
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<mud-button-group><mud-button>Coverage</mud-button></mud-button-group>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const Ctor = customElements.get('mud-button-group') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!Ctor) throw new Error('mud-button-group constructor missing from registry');
    const instance = new Ctor(false);
    if (!instance) throw new Error('instance not constructed');
  },
};
