/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { CheckboxSize } from './cor-checkbox.enums';

const renderCheckbox = (args: any) => {
  const attrs = [
    `size="${args.size}"`,
    args.checked ? 'checked' : '',
    args.indeterminate ? 'indeterminate' : '',
    args.disabled ? 'disabled' : '',
    args.invalid ? 'invalid' : '',
    args.name ? `name="${args.name}"` : '',
    args.value ? `value="${args.value}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return /*html*/ `
    <cor-checkbox ${attrs}>
      ${args.label || 'Checkbox label'}
    </cor-checkbox>
  `;
};

const meta: Meta = {
  title: 'Atoms/Checkbox',
  component: 'cor-checkbox',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(CheckboxSize),
      description: 'Size of the checkbox',
    },
    checked: {
      control: 'boolean',
      description: 'Checked state',
    },
    indeterminate: {
      control: 'boolean',
      description: 'Indeterminate state (for select all checkboxes)',
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
      description: 'Checkbox label text',
    },
  },
  render: renderCheckbox,
};

export default meta;

export const Default: StoryObj = {
  render: renderCheckbox,
  args: {
    size: CheckboxSize.MD,
    label: 'Checkbox label',
    checked: false,
    indeterminate: false,
    disabled: false,
    invalid: false,
  },
};

export const AllSizesTable: StoryObj = {
  render: () => {
    const sizes = Object.values(CheckboxSize);

    return /*html*/ `
      <div style="display: grid; gap: 24px;">
        ${sizes
          .map(
            size => /*html*/ `
          <div>
            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; text-transform: capitalize;">${size}</h3>
            <div style="display: grid; gap: 12px;">
              <!-- Unchecked -->
              <cor-checkbox
                id="checkbox-${size}-unchecked"
                size="${size}"
              >Unchecked</cor-checkbox>

              <!-- Checked -->
              <cor-checkbox
                id="checkbox-${size}-checked"
                size="${size}"
                checked
              >Checked</cor-checkbox>

              <!-- Indeterminate -->
              <cor-checkbox
                id="checkbox-${size}-indeterminate"
                size="${size}"
                indeterminate
              >Indeterminate</cor-checkbox>
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

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Default</h4>
            <cor-checkbox size="md">Default</cor-checkbox>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Checked</h4>
            <cor-checkbox size="md" checked>Checked</cor-checkbox>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Indeterminate</h4>
            <cor-checkbox size="md" indeterminate>Indeterminate</cor-checkbox>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Disabled</h4>
            <cor-checkbox size="md" disabled>Disabled</cor-checkbox>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Disabled Checked</h4>
            <cor-checkbox size="md" disabled checked>Disabled Checked</cor-checkbox>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Disabled Indeterminate</h4>
            <cor-checkbox size="md" disabled indeterminate>Disabled Indeterminate</cor-checkbox>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Invalid</h4>
            <cor-checkbox size="md" invalid>Invalid</cor-checkbox>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Invalid Checked</h4>
            <cor-checkbox size="md" invalid checked>Invalid Checked</cor-checkbox>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Invalid Indeterminate</h4>
            <cor-checkbox size="md" invalid indeterminate>Invalid Indeterminate</cor-checkbox>
          </div>
        </div>
      </div>
    `;
  },
};

export const ComplexShowcase: StoryObj = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 32px; padding: 24px; background: var(--color-background-base-default);">
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Controls / Checkbox</h2>

        <!-- MD Size Section -->
        <div style="display: grid; gap: 24px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--color-text-base-default);">Size: MD</h3>

          <div style="display: grid; grid-template-columns: auto repeat(3, 1fr); gap: 24px 32px; align-items: center;">
            <!-- Header Row -->
            <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-secondary);">State</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-secondary);">Off</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-secondary);">On</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-secondary);">Mixed</div>

            <!-- Default Row -->
            <div style="font-size: 12px; color: var(--color-text-base-default);">Default</div>
            <cor-checkbox size="md">Label</cor-checkbox>
            <cor-checkbox size="md" checked>Label</cor-checkbox>
            <cor-checkbox size="md" indeterminate>Label</cor-checkbox>

            <!-- Disabled Row -->
            <div style="font-size: 12px; color: var(--color-text-base-default);">Disabled</div>
            <cor-checkbox size="md" disabled>Label</cor-checkbox>
            <cor-checkbox size="md" disabled checked>Label</cor-checkbox>
            <cor-checkbox size="md" disabled indeterminate>Label</cor-checkbox>

            <!-- Invalid Row -->
            <div style="font-size: 12px; color: var(--color-text-base-default);">Invalid</div>
            <cor-checkbox size="md" invalid>Label</cor-checkbox>
            <cor-checkbox size="md" invalid checked>Label</cor-checkbox>
            <cor-checkbox size="md" invalid indeterminate>Label</cor-checkbox>
          </div>
        </div>

        <!-- SM Size Section -->
        <div style="display: grid; gap: 24px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--color-text-base-default);">Size: SM</h3>

          <div style="display: grid; grid-template-columns: auto repeat(3, 1fr); gap: 24px 32px; align-items: center;">
            <!-- Header Row -->
            <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-secondary);">State</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-secondary);">Off</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-secondary);">On</div>
            <div style="font-size: 12px; font-weight: 600; color: var(--color-text-base-secondary);">Mixed</div>

            <!-- Default Row -->
            <div style="font-size: 12px; color: var(--color-text-base-default);">Default</div>
            <cor-checkbox size="sm">Label</cor-checkbox>
            <cor-checkbox size="sm" checked>Label</cor-checkbox>
            <cor-checkbox size="sm" indeterminate>Label</cor-checkbox>

            <!-- Disabled Row -->
            <div style="font-size: 12px; color: var(--color-text-base-default);">Disabled</div>
            <cor-checkbox size="sm" disabled>Label</cor-checkbox>
            <cor-checkbox size="sm" disabled checked>Label</cor-checkbox>
            <cor-checkbox size="sm" disabled indeterminate>Label</cor-checkbox>

            <!-- Invalid Row -->
            <div style="font-size: 12px; color: var(--color-text-base-default);">Invalid</div>
            <cor-checkbox size="sm" invalid>Label</cor-checkbox>
            <cor-checkbox size="sm" invalid checked>Label</cor-checkbox>
            <cor-checkbox size="sm" invalid indeterminate>Label</cor-checkbox>
          </div>
        </div>
      </div>
    `;
  },
};
