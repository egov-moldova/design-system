/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { SelectSize } from './cor-select.enums';

const attachEventListeners = (elementId: string, eventName: string, callback: (detail: any) => void) => {
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (el && !(el as any)[`_bound_${eventName}`]) {
      (el as any)[`_bound_${eventName}`] = true;
      el.addEventListener(eventName, (e: Event) => callback((e as CustomEvent).detail));
    }
  }, 0);
};

const renderSelect = (args: any) => {
  const disabled = args.disabled ? 'disabled' : '';
  const invalid = args.invalid ? 'invalid' : '';
  const required = args.required ? 'required' : '';
  const inline = args.inline ? 'inline' : '';
  const placeholder = args.placeholder ? `placeholder="${args.placeholder}"` : '';
  const value = args.value ? `value="${args.value}"` : '';
  const name = args.name ? `name="${args.name}"` : '';
  const listPosition = args.listPosition ? `list-position="${args.listPosition}"` : '';

  return /*html*/ `
    <cor-select
      size="${args.size}"
      ${value}
      ${placeholder}
      ${name}
      ${listPosition}
      ${disabled}
      ${invalid}
      ${required}
      ${inline}
    >
      <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
      <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
      <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
      <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
      <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
    </cor-select>
  `;
};

const meta: Meta = {
  title: 'Molecules/Select',
  component: 'cor-select',
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: Object.values(SelectSize), description: 'Component size' },
    value: { control: 'text', description: 'Selected value' },
    placeholder: { control: 'text', description: 'Placeholder text' },
    name: { control: 'text', description: 'Form field name' },
    disabled: { control: 'boolean', description: 'Disables the select' },
    invalid: { control: 'boolean', description: 'Invalid state' },
    required: { control: 'boolean', description: 'Required field' },
    inline: { control: 'boolean', description: 'Inline mode - width fits content' },
    listPosition: { control: 'select', options: ['top', 'bottom'], description: 'Dropdown position' },
  },
  render: renderSelect,
};
export default meta;

export const Default: StoryObj = {
  args: {
    size: SelectSize.LG,
    value: '12',
    name: 'default-select',
    disabled: false,
    invalid: false,
    required: false,
  },
};

export const WithPlaceholder: StoryObj = {
  args: {
    size: SelectSize.LG,
    placeholder: 'Select an option',
    name: 'placeholder-select',
    disabled: false,
    invalid: false,
    required: false,
  },
};

export const Disabled: StoryObj = {
  args: {
    size: SelectSize.LG,
    value: '12',
    name: 'disabled-select',
    disabled: true,
    invalid: false,
    required: false,
  },
};

export const Invalid: StoryObj = {
  args: {
    size: SelectSize.LG,
    value: '12',
    name: 'invalid-select',
    disabled: false,
    invalid: true,
    required: false,
  },
};

export const AllSizes: StoryObj = {
  argTypes: {
    size: {
      control: false,
    },
    name: {
      control: false,
    },
    value: {
      control: false,
    },
  },
  args: {
    size: SelectSize.LG,
    value: '12',
    name: 'default-select',
    disabled: false,
    invalid: false,
    required: false,
  },
  render: (args: any) => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center;">
      <div style="font-weight: 600;">Size</div>
      <div style="font-weight: 600;">Component</div>

      <div>lg</div>
      <cor-select
        size="lg"
        name="size-lg"
        value="${args.value}"
        ${args.placeholder ? `placeholder="${args.placeholder}"` : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.invalid ? 'invalid' : ''}
        ${args.required ? 'required' : ''}
        ${args.inline ? 'inline' : ''}
      >
        <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
        <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
        <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
      </cor-select>

      <div>md</div>
      <cor-select
        size="md"
        name="size-md"
        value="${args.value}"
        ${args.placeholder ? `placeholder="${args.placeholder}"` : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.invalid ? 'invalid' : ''}
        ${args.required ? 'required' : ''}
        ${args.inline ? 'inline' : ''}
      >
        <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
        <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
        <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
      </cor-select>

      <div>sm</div>
      <cor-select
        size="sm"
        name="size-sm"
        value="${args.value}"
        ${args.placeholder ? `placeholder="${args.placeholder}"` : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.invalid ? 'invalid' : ''}
        ${args.required ? 'required' : ''}
        ${args.inline ? 'inline' : ''}
      >
        <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
        <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
        <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
      </cor-select>
    </div>
  `,
};

export const States: StoryObj = {
  argTypes: {
    disabled: {
      control: false,
    },
    invalid: {
      control: false,
    },
    name: {
      control: false,
    },
    value: {
      control: false,
    },
  },
  args: {
    size: SelectSize.LG,
    value: '12',
    placeholder: 'Select an option',
    disabled: false,
    invalid: false,
    required: false,
    inline: false,
  },
  render: (args: any) => /*html*/ `
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center;">
      <div style="font-weight: 600;">State</div>
      <div style="font-weight: 600;">Component</div>

      <div>Default</div>
      <cor-select
        size="${args.size}"
        value="${args.value}"
        name="state-default"
        ${args.disabled ? 'disabled' : ''}
        ${args.invalid ? 'invalid' : ''}
        ${args.required ? 'required' : ''}
        ${args.inline ? 'inline' : ''}
      >
        <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
        <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
        <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
      </cor-select>

      <div>Placeholder</div>
      <cor-select
        size="${args.size}"
        placeholder="${args.placeholder}"
        name="state-placeholder"
        ${args.disabled ? 'disabled' : ''}
        ${args.invalid ? 'invalid' : ''}
        ${args.required ? 'required' : ''}
        ${args.inline ? 'inline' : ''}
      >
        <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
        <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
        <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
      </cor-select>

      <div>Disabled</div>
      <cor-select
        size="${args.size}"
        value="${args.value}"
        disabled
        name="state-disabled"
        ${args.inline ? 'inline' : ''}
      >
        <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
        <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
        <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
      </cor-select>

      <div>Invalid</div>
      <cor-select
        size="${args.size}"
        value="${args.value}"
        invalid
        name="state-invalid"
        ${args.inline ? 'inline' : ''}
      >
        <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
        <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
        <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
      </cor-select>
    </div>
  `,
};

export const Inline: StoryObj = {
  args: {
    size: SelectSize.LG,
    value: '12',
    placeholder: '',
    disabled: false,
    invalid: false,
    required: false,
    inline: true,
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; gap: 16px; align-items: center;">
      <span>Show</span>
      <cor-select
        size="${args.size}"
        value="${args.value}"
        name="inline-select"
        ${args.placeholder ? `placeholder="${args.placeholder}"` : ''}
        ${args.disabled ? 'disabled' : ''}
        ${args.invalid ? 'invalid' : ''}
        ${args.required ? 'required' : ''}
        ${args.inline ? 'inline' : ''}
      >
        <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
        <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
        <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
        <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
        <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
      </cor-select>
      <span>items per page</span>
    </div>
  `,
};

export const EventLogging: StoryObj = {
  args: {
    size: SelectSize.LG,
    value: '12',
    name: 'event-logging-select',
    disabled: false,
    invalid: false,
    required: false,
  },
  render: (args: any) => {
    const elementId = 'select-event-demo';
    const logContentId = 'select-log-content';

    attachEventListeners(elementId, 'corChange', detail => {
      const logContent = document.getElementById(logContentId);
      if (logContent) {
        const ts = new Date().toLocaleTimeString();
        logContent.innerHTML = `[${ts}] corChange: value=${detail.value}<br>${logContent.innerHTML}`;
      }
    });

    return /*html*/ `
      <div style="display: flex; flex-direction: column; gap: 24px; align-items: flex-start;">
        <cor-select
          id="${elementId}"
          size="${args.size}"
          ${args.value ? `value="${args.value}"` : ''}
          name="${args.name}"
          ${args.disabled ? 'disabled' : ''}
          ${args.invalid ? 'invalid' : ''}
          ${args.required ? 'required' : ''}
        >
          <cor-select-item variant="label-only" value="9" label="9"></cor-select-item>
          <cor-select-item variant="label-only" value="12" label="12"></cor-select-item>
          <cor-select-item variant="label-only" value="24" label="24"></cor-select-item>
          <cor-select-item variant="label-only" value="36" label="36"></cor-select-item>
          <cor-select-item variant="label-only" value="48" label="48"></cor-select-item>
        </cor-select>

        <div style="padding: 16px; background: var(--color-neutral-background-default); border-radius: 4px; font-family: monospace; font-size: 12px; min-width: 320px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Event Log:</div>
          <div id="${logContentId}">Select an option to see events...</div>
        </div>
      </div>
    `;
  },
};
