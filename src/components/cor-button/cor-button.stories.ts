import { BUTTON_TAGS } from './cor-button.constants';
import { ButtonSize, ButtonVariant } from './cor-button.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

export default {
  title: 'Atoms/Button',
  component: 'cor-button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: Object.values(ButtonVariant),
    },
    size: {
      control: 'select',
      options: Object.values(ButtonSize),
    },
    text: {
      control: 'text',
      default: 'My Button Text',
      description: 'Story value for the button text',
    },
    tag: {
      control: 'select',
      options: BUTTON_TAGS,
      default: 'button',
      description: 'Select the type of button to display.',
    },
    disabled: {
      control: 'boolean',
      description: 'Select to display the button is disabled.',
    },
    iconOnly: {
      control: 'boolean',
      options: [true, false],
      description: 'Select to display the button is disabled.',
    },
  },
};

export const Button = {
  render: (args: any) => {
    const iconSize = [ButtonSize.LG, ButtonSize.MD].includes(args.size) ? 'md' : 'sm';
    const tag = args.tag || 'button';

    if (tag === 'button') {
      return args.iconOnly
        ? `<cor-button variant="${args.variant}" size="${args.size}" iconOnly="${args.iconOnly}">
            <button ${args.disabled ? 'disabled' : ''}>
              <cor-icon name="${ICON_NAMES.ADD}" size="${iconSize}" color="currentColor"></cor-icon>
            </button>
          </cor-button>`
        : `<cor-button variant="${args.variant}" size="${args.size}" iconOnly="${args.iconOnly}">
            <button ${args.disabled ? 'disabled' : ''}>
              <cor-icon name="${ICON_NAMES.ADD}" size="${iconSize}" color="currentColor"></cor-icon>
              ${args.text}
              <cor-icon name="${ICON_NAMES.ADD}" size="${iconSize}" color="currentColor"></cor-icon>
            </button>
          </cor-button>`;
    } else {
      return args.iconOnly
        ? `<cor-button variant="${args.variant}" size="${args.size}" iconOnly="${args.iconOnly}">
            <a href="#" aria-disabled="${args.disabled}">
              <cor-icon name="${ICON_NAMES.ADD}" size="${iconSize}" color="currentColor"></cor-icon>
            </a>
          </cor-button>`
        : `<cor-button variant="${args.variant}" size="${args.size}" iconOnly="${args.iconOnly}">
            <a href="#" aria-disabled="${args.disabled}">
              <cor-icon name="${ICON_NAMES.ADD}" size="${iconSize}" color="currentColor"></cor-icon>
              ${args.text}
              <cor-icon name="${ICON_NAMES.ADD}" size="${iconSize}" color="currentColor"></cor-icon>
            </a>
          </cor-button>`;
    }
  },
  args: {
    variant: ButtonVariant.PRIMARY,
    size: ButtonSize.MD,
    text: 'My Button',
    tag: 'button',
    disabled: false,
    iconOnly: false,
  },
};

export const AllVariantsTable = {
  render: (args: any) => {
    const variants = Object.values(ButtonVariant);
    const sizes = [ButtonSize.LG, ButtonSize.MD, ButtonSize.SM, ButtonSize.XS];

    const sizeHeaders = sizes
      .map(
        size =>
          `<th style="border: 1px solid var(--color-neutral-border-weakest); padding: 12px; text-align: center; background: var(--color-neutral-background-default);">${size.toUpperCase()}</th>`,
      )
      .join('');

    const rows = variants
      .map(variant => {
        const variantLabel = variant.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const cells = sizes
          .map(size => {
            const iconSize = [ButtonSize.LG, ButtonSize.MD].includes(size) ? 'md' : 'sm';
            const disabledAttr = args.disabled ? 'disabled' : '';
            return `
          <td style="border: 1px solid var(--color-neutral-border-weakest); padding: 12px; text-align: center;">
            <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px;">
              <cor-button variant="${variant}" size="${size}">
                <button ${disabledAttr}>
                  <cor-icon name="${ICON_NAMES.ADD}" size="${iconSize}" color="currentColor"></cor-icon>
                  Button
                  <cor-icon name="${ICON_NAMES.ADD}" size="${iconSize}" color="currentColor"></cor-icon>
                </button>
              </cor-button>
              <cor-button variant="${variant}" size="${size}" iconOnly>
                <button ${disabledAttr}>
                  <cor-icon name="${ICON_NAMES.ADD}" size="${iconSize}" color="currentColor"></cor-icon>
                </button>
              </cor-button>
            </div>
          </td>`;
          })
          .join('');

        return `
        <tr>
          <td style="border: 1px solid var(--color-neutral-border-weakest); padding: 12px; font-weight: 600; background: var(--color-neutral-background-default);">${variantLabel}</td>
          ${cells}
        </tr>`;
      })
      .join('');

    return `
      <div style="font-family: system-ui, sans-serif; padding: 20px;">
        <h2>Button Variants Matrix</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="border: 1px solid var(--color-neutral-border-weakest); padding: 12px; text-align: left; background: var(--color-neutral-background-default);">Variant</th>
              ${sizeHeaders}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  },
  args: {
    disabled: false,
  },
};
