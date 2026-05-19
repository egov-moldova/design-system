import { SelectItemVariant } from './cor-select-item.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

interface StoryArgs {
  variant?: string;
  label?: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
}

export default {
  title: 'Atoms/Select Item',
  component: 'cor-select-item',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: Object.values(SelectItemVariant),
    },
    label: {
      control: 'text',
      description: 'Primary label text',
    },
    description: {
      control: 'text',
      description: 'Secondary text (description or timestamp)',
    },
    selected: {
      control: 'boolean',
      description: 'Selected state',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    indeterminate: {
      control: 'boolean',
      description: 'Indeterminate/mixed checkbox state',
    },
  },
};

export const Default = {
  args: {
    variant: 'basic',
    label: 'Label',
    description: 'Description',
    selected: false,
    disabled: false,
    indeterminate: false,
  },
  render: (args: StoryArgs) => {
    return /*html*/ `
      <div style="width: 264px;">
        <cor-select-item
          variant="${args.variant}"
          label="${args.label}"
          description="${args.description}"
          ${args.selected ? 'selected' : ''}
          ${args.disabled ? 'disabled' : ''}
          ${args.indeterminate ? 'indeterminate' : ''}
        >
          <cor-icon slot="icon-left" name="${ICON_NAMES.ADD}" size="sm" color="neutral-icon-weak"></cor-icon>
          <cor-avatar slot="pre-content" size="md" initials="AZ"></cor-avatar>
          <cor-badge-interactive slot="post-content" size="md">
            <cor-icon slot="icon" size="2xs" name="${ICON_NAMES.WARNING}" color="currentColor"></cor-icon>
            13
          </cor-badge-interactive>
          <cor-icon slot="icon-right" name="${ICON_NAMES.ADD}" size="sm" color="neutral-icon-weak"></cor-icon>
        </cor-select-item>
      </div>
    `;
  },
};

export const AllVariantsTable = {
  render: () => {
    const variants = Object.values(SelectItemVariant);

    return /*html*/ `
      <div style="display: grid; gap: 64px;">
        ${variants
          .map(
            variant => /*html*/ `
          <div>
            <h3 style="margin: 0 0 20px 0; font-size: 14px; font-weight: 600; text-transform: capitalize;">${variant}</h3>
            <div style="display: grid; gap: 32px; max-width: 400px;">
              <!-- Default -->
              <cor-select-item
                variant="${variant}"
                label="Label"
                ${variant === SelectItemVariant.TIMESTAMP ? 'description="Description"' : 'description="Description"'}
              ></cor-select-item>

              <!-- Selected -->
              <cor-select-item
                variant="${variant}"
                label="Label"
                ${variant === SelectItemVariant.TIMESTAMP ? 'description="Description"' : 'description="Description"'}
                selected
              ></cor-select-item>

              ${
                variant !== SelectItemVariant.TIMESTAMP
                  ? /*html*/ `
              <!-- Full variant with icons and pre-content -->
              <cor-select-item
                variant="${variant}"
                label="Label"
                description="Description"
                selected
              >
                <cor-icon slot="icon-left" name="${ICON_NAMES.ADD}" size="sm" color="neutral-icon-weak"></cor-icon>
                <cor-avatar slot="pre-content" size="md" initials="AZ"></cor-avatar>
                <cor-badge-interactive slot="post-content" size="md" selected>
                  <cor-icon slot="icon" size="2xs" name="${ICON_NAMES.WARNING}" color="currentColor"></cor-icon>
                  13
                </cor-badge-interactive>
                <cor-icon slot="icon-right" name="${ICON_NAMES.ADD}" size="sm" color="neutral-icon-weak"></cor-icon>
              </cor-select-item>
              `
                  : ''
              }
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    `;
  },
};

export const AllStatesTable = {
  render: () => {
    return /*html*/ `
      <div style="display: grid; gap: 48px;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Basic Variant</h3>
        <div style="display: grid; gap: 32px; max-width: 400px;">
          <!-- Default -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Default</p>
            <cor-select-item
              id="basic-default"
              variant="basic"
              label="Label"
              description="Description"
            ></cor-select-item>
          </div>

          <!-- Hover (simulated via story controls) -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Hover (hover over item)</p>
            <cor-select-item
              id="basic-hover"
              variant="basic"
              label="Label"
              description="Description"
            ></cor-select-item>
          </div>

          <!-- Pressed (simulated via story controls) -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Pressed (click and hold)</p>
            <cor-select-item
              id="basic-pressed"
              variant="basic"
              label="Label"
              description="Description"
            ></cor-select-item>
          </div>

          <!-- Disabled -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Disabled</p>
            <cor-select-item
              id="basic-disabled"
              variant="basic"
              label="Label"
              description="Description"
              disabled
            ></cor-select-item>
          </div>

          <!-- Selected -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Selected</p>
            <cor-select-item
              id="basic-selected"
              variant="basic"
              label="Label"
              description="Description"
              selected
            ></cor-select-item>
          </div>

          <!-- Selected + Disabled -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Selected + Disabled</p>
            <cor-select-item
              id="basic-selected-disabled"
              variant="basic"
              label="Label"
              description="Description"
              selected
              disabled
            ></cor-select-item>
          </div>

          <!-- Selected + Indeterminate (Mixed) -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Indeterminate (Mixed)</p>
            <cor-select-item
              id="basic-indeterminate"
              variant="basic"
              label="Label"
              description="Description"
              indeterminate
            ></cor-select-item>
          </div>

          <!-- With Avatar -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">With Avatar</p>
            <cor-select-item
              id="basic-avatar"
              variant="basic"
              label="Label"
              description="Description"
            >
              <cor-avatar slot="pre-content" size="md" initials="AZ"></cor-avatar>
            </cor-select-item>
          </div>

          <!-- With Avatar + Selected -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">With Avatar + Selected</p>
            <cor-select-item
              id="basic-avatar-selected"
              variant="basic"
              label="Label"
              description="Description"
              selected
            >
              <cor-avatar slot="pre-content" size="md" initials="AZ"></cor-avatar>
            </cor-select-item>
          </div>

          <!-- With Icons -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">With Icons</p>
            <cor-select-item
              id="basic-icons"
              variant="basic"
              label="Label"
              description="Description"
            >
              <cor-icon slot="icon-left" name="${ICON_NAMES.ADD}" size="sm" color="neutral-icon-weak"></cor-icon>
              <cor-icon slot="icon-right" name="${ICON_NAMES.ADD}" size="sm" color="neutral-icon-weak"></cor-icon>
            </cor-select-item>
          </div>

          <!-- With Badge -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">With Badge</p>
            <cor-select-item
              id="basic-badge"
              variant="basic"
              label="Label"
              description="Description"
            >
              <cor-badge-interactive slot="post-content" size="md">
                <cor-icon slot="icon" size="2xs" name="${ICON_NAMES.WARNING}" color="currentColor"></cor-icon>
                13
              </cor-badge-interactive>
            </cor-select-item>
          </div>

          <!-- With Badge + Selected -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">With Badge + Selected</p>
            <cor-select-item
              id="basic-badge-selected"
              variant="basic"
              label="Label"
              description="Description"
              selected
            >
              <cor-badge-interactive slot="post-content" size="md">
                <cor-icon slot="icon" size="2xs" name="${ICON_NAMES.WARNING}" color="currentColor"></cor-icon>
                13
              </cor-badge-interactive>
            </cor-select-item>
          </div>
        </div>

        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Timestamp Variant</h3>
        <div style="display: grid; gap: 24px; max-width: 400px;">
          <!-- Default -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Default</p>
            <cor-select-item
              id="timestamp-default"
              variant="timestamp"
              label="Label"
              description="Description"
            ></cor-select-item>
          </div>

          <!-- Selected -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Selected</p>
            <cor-select-item
              id="timestamp-selected"
              variant="timestamp"
              label="Label"
              description="Description"
              selected
            ></cor-select-item>
          </div>

          <!-- Disabled -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Disabled</p>
            <cor-select-item
              id="timestamp-disabled"
              variant="timestamp"
              label="Label"
              description="Description"
              disabled
            ></cor-select-item>
          </div>

          <!-- Selected + Disabled -->
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: var(--color-text-base-tertiary);">Selected + Disabled</p>
            <cor-select-item
              id="timestamp-selected-disabled"
              variant="timestamp"
              label="Label"
              description="Description"
              selected
              disabled
            ></cor-select-item>
          </div>
        </div>
      </div>
    `;
  },
};
