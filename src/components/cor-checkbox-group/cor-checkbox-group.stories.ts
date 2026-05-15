/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { CheckboxGroupOrientation } from './cor-checkbox-group.enums';

const renderCheckboxGroup = (args: any) => {
  const attrs = [
    args.orientation ? `orientation="${args.orientation}"` : '',
    args.columns ? `columns="${args.columns}"` : '',
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
    <cor-checkbox-group ${attrs}>
      ${
        args.checkboxes ||
        `
        <cor-checkbox value="option1">Option 1</cor-checkbox>
        <cor-checkbox value="option2">Option 2</cor-checkbox>
        <cor-checkbox value="option3">Option 3</cor-checkbox>
        <cor-checkbox value="option4">Option 4</cor-checkbox>
      `
      }
    </cor-checkbox-group>
  `;
};

const meta: Meta = {
  title: 'Molecules/CheckboxGroup',
  component: 'cor-checkbox-group',
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: Object.values(CheckboxGroupOrientation),
      description: 'Layout orientation',
    },
    columns: {
      control: 'number',
      description: 'Number of columns for multi-column vertical layout',
    },
    gap: {
      control: 'text',
      description: 'Custom gap override (CSS value)',
    },
    name: {
      control: 'text',
      description: 'Shared name attribute for all child checkboxes',
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
      description: 'Size propagated to all child checkboxes',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state propagated to all child checkboxes',
    },
    invalid: {
      control: 'boolean',
      description: 'Invalid state propagated to all child checkboxes',
    },
  },
  render: renderCheckboxGroup,
};

export default meta;

export const VerticalGroup: StoryObj = {
  args: {
    orientation: CheckboxGroupOrientation.VERTICAL,
    legend: 'Vertical Group',
    checkboxes: `
      <cor-checkbox value="option1" checked>Label</cor-checkbox>
      <cor-checkbox value="option2">Label</cor-checkbox>
      <cor-checkbox value="option3">Label</cor-checkbox>
      <cor-checkbox value="option4">Label</cor-checkbox>
    `,
  },
};

export const VerticalMultiColumn: StoryObj = {
  render: () => {
    return /*html*/ `
      <cor-checkbox-group orientation="vertical" columns="2">
        <cor-checkbox value="option1" checked>Label</cor-checkbox>
        <cor-checkbox value="option2">Label</cor-checkbox>
        <cor-checkbox value="option3">Label</cor-checkbox>
        <cor-checkbox value="option4">Label</cor-checkbox>
        <cor-checkbox value="option5" checked>Label</cor-checkbox>
        <cor-checkbox value="option6">Label</cor-checkbox>
        <cor-checkbox value="option7">Label</cor-checkbox>
      </cor-checkbox-group>
    `;
  },
};

export const HorizontalGroup: StoryObj = {
  args: {
    orientation: CheckboxGroupOrientation.HORIZONTAL,
    legend: 'Horizontal group',
    checkboxes: `
      <cor-checkbox value="option1" checked>Label</cor-checkbox>
      <cor-checkbox value="option2">Label</cor-checkbox>
      <cor-checkbox value="option3">Label</cor-checkbox>
      <cor-checkbox value="option4">Label</cor-checkbox>
    `,
  },
};

export const WithLegendAndHelper: StoryObj = {
  args: {
    orientation: CheckboxGroupOrientation.VERTICAL,
    legend: 'Select your preferences',
    helperText: 'Choose one or more options that apply to you',
    checkboxes: `
      <cor-checkbox value="newsletter">Receive weekly newsletter</cor-checkbox>
      <cor-checkbox value="updates">Product updates</cor-checkbox>
      <cor-checkbox value="promotions">Special promotions</cor-checkbox>
    `,
  },
};

export const DisabledGroup: StoryObj = {
  args: {
    orientation: CheckboxGroupOrientation.VERTICAL,
    legend: 'Disabled Group',
    disabled: true,
    checkboxes: `
      <cor-checkbox value="option1" checked>Option 1</cor-checkbox>
      <cor-checkbox value="option2">Option 2</cor-checkbox>
      <cor-checkbox value="option3">Option 3</cor-checkbox>
    `,
  },
};

export const InvalidGroup: StoryObj = {
  args: {
    orientation: CheckboxGroupOrientation.VERTICAL,
    legend: 'Terms and Conditions',
    invalid: true,
    helperText: 'You must accept at least one option',
    checkboxes: `
      <cor-checkbox value="terms">I accept the terms and conditions</cor-checkbox>
      <cor-checkbox value="privacy">I accept the privacy policy</cor-checkbox>
    `,
  },
};

export const SmallSize: StoryObj = {
  args: {
    orientation: CheckboxGroupOrientation.VERTICAL,
    legend: 'Small Size Group',
    size: 'sm',
    checkboxes: `
      <cor-checkbox value="option1">Small checkbox 1</cor-checkbox>
      <cor-checkbox value="option2">Small checkbox 2</cor-checkbox>
      <cor-checkbox value="option3">Small checkbox 3</cor-checkbox>
    `,
  },
};

export const AllLayouts: StoryObj = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 48px; padding: 24px;">
        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Vertical Group</h3>
          <cor-checkbox-group orientation="vertical">
            <cor-checkbox value="v1" checked>Label</cor-checkbox>
            <cor-checkbox value="v2">Label</cor-checkbox>
            <cor-checkbox value="v3">Label</cor-checkbox>
            <cor-checkbox value="v4">Label</cor-checkbox>
          </cor-checkbox-group>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Vertical Group (multi-column)</h3>
          <cor-checkbox-group orientation="vertical" columns="2">
            <cor-checkbox value="m1" checked>Label</cor-checkbox>
            <cor-checkbox value="m2">Label</cor-checkbox>
            <cor-checkbox value="m3">Label</cor-checkbox>
            <cor-checkbox value="m4">Label</cor-checkbox>
            <cor-checkbox value="m5" checked>Label</cor-checkbox>
            <cor-checkbox value="m6">Label</cor-checkbox>
            <cor-checkbox value="m7">Label</cor-checkbox>
          </cor-checkbox-group>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Horizontal group</h3>
          <cor-checkbox-group orientation="horizontal">
            <cor-checkbox value="h1" checked>Label</cor-checkbox>
            <cor-checkbox value="h2">Label</cor-checkbox>
            <cor-checkbox value="h3">Label</cor-checkbox>
            <cor-checkbox value="h4">Label</cor-checkbox>
          </cor-checkbox-group>
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
          <cor-checkbox-group legend="Select options">
            <cor-checkbox value="1" checked>Checked</cor-checkbox>
            <cor-checkbox value="2">Unchecked</cor-checkbox>
            <cor-checkbox value="3" indeterminate>Indeterminate</cor-checkbox>
          </cor-checkbox-group>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Disabled</h3>
          <cor-checkbox-group legend="Disabled group" disabled>
            <cor-checkbox value="1" checked>Checked disabled</cor-checkbox>
            <cor-checkbox value="2">Unchecked disabled</cor-checkbox>
          </cor-checkbox-group>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Invalid</h3>
          <cor-checkbox-group legend="Required selection" invalid helper-text="Please select at least one option">
            <cor-checkbox value="1">Option 1</cor-checkbox>
            <cor-checkbox value="2">Option 2</cor-checkbox>
          </cor-checkbox-group>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Small Size</h3>
          <cor-checkbox-group legend="Small checkboxes" size="sm">
            <cor-checkbox value="1" checked>Small option 1</cor-checkbox>
            <cor-checkbox value="2">Small option 2</cor-checkbox>
            <cor-checkbox value="3">Small option 3</cor-checkbox>
          </cor-checkbox-group>
        </div>
      </div>
    `;
  },
};
