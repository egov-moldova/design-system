/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { RadioButtonSize } from './cor-radio-button.enums';

const renderRadioButton = (args: any) => {
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
    <cor-radio-button ${attrs}>
      ${args.label || 'Radio button label'}
    </cor-radio-button>
  `;
};

const meta: Meta = {
  title: 'Atoms/Radio Button',
  component: 'cor-radio-button',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(RadioButtonSize),
      description: 'Size of the radio button',
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
      description: 'Radio button label text',
    },
  },
  render: renderRadioButton,
};

export default meta;

export const Default: StoryObj = {
  render: renderRadioButton,
  args: {
    size: RadioButtonSize.MD,
    label: 'Radio button label',
    checked: false,
    disabled: false,
    invalid: false,
    name: 'radio-group',
    value: 'option1',
  },
};

export const AllSizesTable: StoryObj = {
  render: () => {
    const sizes = Object.values(RadioButtonSize);

    return /*html*/ `
      <div style="display: grid; gap: 24px;">
        ${sizes
          .map(
            size => /*html*/ `
          <div>
            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; text-transform: capitalize;">${size}</h3>
            <div style="display: grid; gap: 12px;">
              <!-- Unchecked -->
              <cor-radio-button
                id="radio-${size}-unchecked"
                size="${size}"
                name="radio-${size}"
                value="unchecked"
              >Unchecked</cor-radio-button>

              <!-- Checked -->
              <cor-radio-button
                id="radio-${size}-checked"
                size="${size}"
                name="radio-${size}-checked"
                value="checked"
                checked
              >Checked</cor-radio-button>
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
            <cor-radio-button size="md" name="state-default" value="default">Default</cor-radio-button>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Checked</h4>
            <cor-radio-button size="md" name="state-checked" value="checked" checked>Checked</cor-radio-button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Disabled</h4>
            <cor-radio-button size="md" name="state-disabled" value="disabled" disabled>Disabled</cor-radio-button>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Disabled Checked</h4>
            <cor-radio-button size="md" name="state-disabled-checked" value="disabled-checked" disabled checked>Disabled Checked</cor-radio-button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Invalid</h4>
            <cor-radio-button size="md" name="state-invalid" value="invalid" invalid>Invalid</cor-radio-button>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">Invalid Checked</h4>
            <cor-radio-button size="md" name="state-invalid-checked" value="invalid-checked" invalid checked>Invalid Checked</cor-radio-button>
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
        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Controls / Radio Button</h2>

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
            <cor-radio-button size="md" name="showcase-md-default" value="off">Label</cor-radio-button>
            <cor-radio-button size="md" name="showcase-md-default" value="on" checked>Label</cor-radio-button>

            <!-- Disabled Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Disabled</div>
            <cor-radio-button size="md" name="showcase-md-disabled" value="off" disabled>Label</cor-radio-button>
            <cor-radio-button size="md" name="showcase-md-disabled" value="on" disabled checked>Label</cor-radio-button>

            <!-- Invalid Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Invalid</div>
            <cor-radio-button size="md" name="showcase-md-invalid" value="off" invalid>Label</cor-radio-button>
            <cor-radio-button size="md" name="showcase-md-invalid" value="on" invalid checked>Label</cor-radio-button>
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
            <cor-radio-button size="sm" name="showcase-sm-default" value="off">Label</cor-radio-button>
            <cor-radio-button size="sm" name="showcase-sm-default" value="on" checked>Label</cor-radio-button>

            <!-- Disabled Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Disabled</div>
            <cor-radio-button size="sm" name="showcase-sm-disabled" value="off" disabled>Label</cor-radio-button>
            <cor-radio-button size="sm" name="showcase-sm-disabled" value="on" disabled checked>Label</cor-radio-button>

            <!-- Invalid Row -->
            <div style="font-size: 12px; color: var(--color-neutral-text-weak);">Invalid</div>
            <cor-radio-button size="sm" name="showcase-sm-invalid" value="off" invalid>Label</cor-radio-button>
            <cor-radio-button size="sm" name="showcase-sm-invalid" value="on" invalid checked>Label</cor-radio-button>
          </div>
        </div>
      </div>
    `;
  },
};
