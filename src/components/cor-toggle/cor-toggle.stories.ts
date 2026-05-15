/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { ToggleSize } from './cor-toggle.enums';

const renderToggle = (args: any) => {
  const attrs = [
    `size="${args.size}"`,
    args.checked ? 'checked' : '',
    args.disabled ? 'disabled' : '',
    args.invalid ? 'invalid' : '',
    args.name ? `name="${args.name}"` : '',
    args.value ? `value="${args.value}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return /*html*/ `
    <cor-toggle ${attrs}>
      ${args.label || 'Label'}
    </cor-toggle>
  `;
};

const meta: Meta = {
  title: 'Atoms/Toggle',
  component: 'cor-toggle',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(ToggleSize),
      description: 'Size of the toggle',
    },
    checked: {
      control: 'boolean',
      description: 'Checked state',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    invalid: {
      control: 'boolean',
      description: 'Invalid state',
    },
    label: {
      control: 'text',
      description: 'Toggle label text',
    },
  },
  render: renderToggle,
};

export default meta;

export const Default: StoryObj = {
  render: renderToggle,
  args: {
    size: ToggleSize.MD,
    label: 'Label',
    checked: false,
    disabled: false,
    invalid: false,
  },
};

export const AllSizesTable: StoryObj = {
  render: () => {
    const sizes = Object.values(ToggleSize);

    return /*html*/ `
      <div style="display: grid; gap: 24px;">
        ${sizes
          .map(
            size => /*html*/ `
          <div>
            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; text-transform: capitalize;">${size}</h3>
            <div style="display: grid; gap: 12px;">
              <!-- Unchecked -->
              <cor-toggle
                id="toggle-${size}-unchecked"
                size="${size}"
              >Unchecked</cor-toggle>

              <!-- Checked -->
              <cor-toggle
                id="toggle-${size}-checked"
                size="${size}"
                checked
              >Checked</cor-toggle>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    `;
  },
};

export const AllStatesTable: StoryObj = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 16px;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">All States</h3>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Default</h4>
            <cor-toggle size="md">Default</cor-toggle>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Checked</h4>
            <cor-toggle size="md" checked>Checked</cor-toggle>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Disabled</h4>
            <cor-toggle size="md" disabled>Disabled</cor-toggle>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Disabled Checked</h4>
            <cor-toggle size="md" disabled checked>Disabled Checked</cor-toggle>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Invalid</h4>
            <cor-toggle size="md" invalid>Invalid</cor-toggle>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Invalid Checked</h4>
            <cor-toggle size="md" invalid checked>Invalid Checked</cor-toggle>
          </div>
        </div>
      </div>
    `;
  },
};

export const ComplexShowcase: StoryObj = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 32px; padding: 24px; background: var(--color-neutral-background-base);">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Controls / Toggle</h2>

        <!-- MD Size Section -->
        <div style="display: grid; gap: 24px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--color-neutral-text-weak);">Size: MD</h3>

          <div style="display: grid; grid-template-columns: auto repeat(2, 1fr); gap: 24px 32px; align-items: center;">
            <!-- Header Row -->
            <div style="font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weakest);">State</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weakest);">Off</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weakest);">On</div>

            <!-- Default Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Default</div>
            <cor-toggle size="md">Label</cor-toggle>
            <cor-toggle size="md" checked>Label</cor-toggle>

            <!-- Disabled Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Disabled</div>
            <cor-toggle size="md" disabled>Label</cor-toggle>
            <cor-toggle size="md" disabled checked>Label</cor-toggle>

            <!-- Invalid Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Invalid</div>
            <cor-toggle size="md" invalid>Label</cor-toggle>
            <cor-toggle size="md" invalid checked>Label</cor-toggle>
          </div>
        </div>

        <!-- SM Size Section -->
        <div style="display: grid; gap: 24px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--color-neutral-text-weak);">Size: SM</h3>

          <div style="display: grid; grid-template-columns: auto repeat(2, 1fr); gap: 24px 32px; align-items: center;">
            <!-- Header Row -->
            <div style="font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weakest);">State</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weakest);">Off</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-neutral-text-weakest);">On</div>

            <!-- Default Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Default</div>
            <cor-toggle size="sm">Label</cor-toggle>
            <cor-toggle size="sm" checked>Label</cor-toggle>
            <!-- Disabled Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Disabled</div>
            <cor-toggle size="sm" disabled>Label</cor-toggle>
            <cor-toggle size="sm" disabled checked>Label</cor-toggle>

            <!-- Invalid Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Invalid</div>
            <cor-toggle size="sm" invalid>Label</cor-toggle>
            <cor-toggle size="sm" invalid checked>Label</cor-toggle>
          </div>
        </div>
      </div>
    `;
  },
};

export const WithLeftLabel: StoryObj = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 16px;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Toggle with Left Label</h3>

        <cor-toggle size="md">
          <span slot="label-left">Left Label</span>
        </cor-toggle>

        <cor-toggle size="md" checked>
          <span slot="label-left">Left Label</span>
        </cor-toggle>

        <cor-toggle size="sm">
          <span slot="label-left">Left Label</span>
        </cor-toggle>
      </div>
    `;
  },
};

export const WithBothLabels: StoryObj = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 16px;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Toggle with Both Labels</h3>

        <cor-toggle size="md">
          <span slot="label-left">Left</span>
          Right
        </cor-toggle>

        <cor-toggle size="md" checked>
          <span slot="label-left">Off</span>
          On
        </cor-toggle>
      </div>
    `;
  },
};
