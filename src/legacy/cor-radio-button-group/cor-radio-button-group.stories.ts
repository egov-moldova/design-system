/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { RadioButtonGroupOrientation } from './cor-radio-button-group.enums';

const renderRadioButtonGroup = (args: any) => {
  const attrs = [
    args.orientation ? `orientation="${args.orientation}"` : '',
    args.gap ? `gap="${args.gap}"` : '',
    args.name ? `name="${args.name}"` : '',
    args.legend ? `legend="${args.legend}"` : '',
    args.helperText ? `helper-text="${args.helperText}"` : '',
    args.size ? `size="${args.size}"` : '',
    args.disabled ? 'disabled' : '',
    args.invalid ? 'invalid' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return /*html*/ `
    <cor-radio-button-group ${attrs}>
      ${
        args.radioButtons ||
        `
        <cor-radio-button value="option1">Option 1</cor-radio-button>
        <cor-radio-button value="option2">Option 2</cor-radio-button>
        <cor-radio-button value="option3">Option 3</cor-radio-button>
        <cor-radio-button value="option4">Option 4</cor-radio-button>
      `
      }
    </cor-radio-button-group>
  `;
};

const meta: Meta = {
  title: 'Molecules/Radio Button Group',
  component: 'cor-radio-button-group',
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: Object.values(RadioButtonGroupOrientation),
      description: 'Layout orientation',
    },
    gap: {
      control: 'text',
      description: 'Custom gap override (CSS value)',
    },
    name: {
      control: 'text',
      description: 'Shared name attribute for all child radio buttons',
    },
    legend: {
      control: 'text',
      description: 'Group label (renders as legend)',
    },
    helperText: {
      control: 'text',
      description: 'Helper text displayed below the group',
    },
    size: {
      control: 'select',
      options: ['md', 'sm'],
      description: 'Size propagated to all child radio buttons',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state propagated to all child radio buttons',
    },
    invalid: {
      control: 'boolean',
      description: 'Invalid state propagated to all child radio buttons',
    },
  },
  render: renderRadioButtonGroup,
};

export default meta;

export const VerticalGroup: StoryObj = {
  args: {
    orientation: RadioButtonGroupOrientation.VERTICAL,
    legend: 'Vertical Group',
    name: 'vertical-group',
    radioButtons: `
      <cor-radio-button value="option1" checked>Label</cor-radio-button>
      <cor-radio-button value="option2">Label</cor-radio-button>
      <cor-radio-button value="option3">Label</cor-radio-button>
      <cor-radio-button value="option4">Label</cor-radio-button>
    `,
  },
};

export const HorizontalGroup: StoryObj = {
  args: {
    orientation: RadioButtonGroupOrientation.HORIZONTAL,
    legend: 'Horizontal group',
    name: 'horizontal-group',
    radioButtons: `
      <cor-radio-button value="option1" checked>Label</cor-radio-button>
      <cor-radio-button value="option2">Label</cor-radio-button>
      <cor-radio-button value="option3">Label</cor-radio-button>
      <cor-radio-button value="option4">Label</cor-radio-button>
    `,
  },
};

export const WithLegendAndHelper: StoryObj = {
  args: {
    orientation: RadioButtonGroupOrientation.VERTICAL,
    legend: 'Select your preference',
    helperText: 'Choose one option that applies to you',
    name: 'preference-group',
    radioButtons: `
      <cor-radio-button value="newsletter">Receive weekly newsletter</cor-radio-button>
      <cor-radio-button value="updates">Product updates</cor-radio-button>
      <cor-radio-button value="promotions">Special promotions</cor-radio-button>
    `,
  },
};

export const DisabledGroup: StoryObj = {
  args: {
    orientation: RadioButtonGroupOrientation.VERTICAL,
    legend: 'Disabled Group',
    name: 'disabled-group',
    disabled: true,
    radioButtons: `
      <cor-radio-button value="option1" checked>Option 1</cor-radio-button>
      <cor-radio-button value="option2">Option 2</cor-radio-button>
      <cor-radio-button value="option3">Option 3</cor-radio-button>
    `,
  },
};

export const InvalidGroup: StoryObj = {
  args: {
    orientation: RadioButtonGroupOrientation.VERTICAL,
    legend: 'Terms and Conditions',
    name: 'terms-group',
    invalid: true,
    helperText: 'You must select one option',
    radioButtons: `
      <cor-radio-button value="accept">I accept the terms and conditions</cor-radio-button>
      <cor-radio-button value="decline">I decline the terms and conditions</cor-radio-button>
    `,
  },
};

export const SmallSize: StoryObj = {
  args: {
    orientation: RadioButtonGroupOrientation.VERTICAL,
    legend: 'Small Size Group',
    name: 'small-group',
    size: 'sm',
    radioButtons: `
      <cor-radio-button value="option1">Small radio button 1</cor-radio-button>
      <cor-radio-button value="option2">Small radio button 2</cor-radio-button>
      <cor-radio-button value="option3">Small radio button 3</cor-radio-button>
    `,
  },
};

export const AllLayouts: StoryObj = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 48px; padding: 24px;">
        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Vertical Group</h3>
          <cor-radio-button-group orientation="vertical" name="vertical-demo">
            <cor-radio-button value="v1" checked>Label</cor-radio-button>
            <cor-radio-button value="v2">Label</cor-radio-button>
            <cor-radio-button value="v3">Label</cor-radio-button>
            <cor-radio-button value="v4">Label</cor-radio-button>
          </cor-radio-button-group>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Horizontal group</h3>
          <cor-radio-button-group orientation="horizontal" name="horizontal-demo">
            <cor-radio-button value="h1" checked>Label</cor-radio-button>
            <cor-radio-button value="h2">Label</cor-radio-button>
            <cor-radio-button value="h3">Label</cor-radio-button>
            <cor-radio-button value="h4">Label</cor-radio-button>
          </cor-radio-button-group>
        </div>
      </div>
    `;
  },
};

export const WithStates: StoryObj = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 32px; padding: 24px;">
        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Default</h3>
          <cor-radio-button-group legend="Select option" name="state-default">
            <cor-radio-button value="1" checked>Checked</cor-radio-button>
            <cor-radio-button value="2">Unchecked</cor-radio-button>
          </cor-radio-button-group>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Disabled</h3>
          <cor-radio-button-group legend="Disabled group" name="state-disabled" disabled>
            <cor-radio-button value="1" checked>Checked disabled</cor-radio-button>
            <cor-radio-button value="2">Unchecked disabled</cor-radio-button>
          </cor-radio-button-group>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Invalid</h3>
          <cor-radio-button-group legend="Required selection" name="state-invalid" invalid helper-text="Please select one option">
            <cor-radio-button value="1">Option 1</cor-radio-button>
            <cor-radio-button value="2">Option 2</cor-radio-button>
          </cor-radio-button-group>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Small Size</h3>
          <cor-radio-button-group legend="Small radio buttons" name="state-small" size="sm">
            <cor-radio-button value="1" checked>Small option 1</cor-radio-button>
            <cor-radio-button value="2">Small option 2</cor-radio-button>
            <cor-radio-button value="3">Small option 3</cor-radio-button>
          </cor-radio-button-group>
        </div>
      </div>
    `;
  },
};

export const KeyboardNavigationDemo: StoryObj = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 24px; padding: 24px;">
        <div style="padding: 16px; background: var(--color-background-base-default); border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Keyboard Navigation</h4>
          <p style="margin: 0; font-size: 12px; color: var(--color-text-base-secondary);">
            Use <kbd style="padding: 2px 6px; background: var(--color-background-base-default); border: 1px solid var(--color-border-base-subtle); border-radius: 3px;">↑</kbd>
            <kbd style="padding: 2px 6px; background: var(--color-background-base-default); border: 1px solid var(--color-border-base-subtle); border-radius: 3px;">↓</kbd>
            <kbd style="padding: 2px 6px; background: var(--color-background-base-default); border: 1px solid var(--color-border-base-subtle); border-radius: 3px;">←</kbd>
            <kbd style="padding: 2px 6px; background: var(--color-background-base-default); border: 1px solid var(--color-border-base-subtle); border-radius: 3px;">→</kbd>
            arrow keys to navigate between radio buttons.
            Press <kbd style="padding: 2px 6px; background: var(--color-background-base-default); border: 1px solid var(--color-border-base-subtle); border-radius: 3px;">Space</kbd> to select.
          </p>
        </div>

        <cor-radio-button-group legend="Try keyboard navigation" name="keyboard-demo">
          <cor-radio-button value="option1" checked>Option 1 (selected)</cor-radio-button>
          <cor-radio-button value="option2">Option 2</cor-radio-button>
          <cor-radio-button value="option3">Option 3</cor-radio-button>
          <cor-radio-button value="option4">Option 4</cor-radio-button>
          <cor-radio-button value="option5">Option 5</cor-radio-button>
        </cor-radio-button-group>
      </div>
    `;
  },
};
