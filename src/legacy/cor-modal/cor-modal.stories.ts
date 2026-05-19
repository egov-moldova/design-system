/* eslint-disable */
import type { Meta, StoryObj } from '@storybook/web-components';
/* eslint-enable */
import { ModalPlacement, ModalSize } from './cor-modal.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';
import { IconSize } from '../cor-icon/cor-icon.types';

interface CorModalArgs {
  open: boolean;
  placement: string;
  size: string;
  title: string;
  hideHeader: boolean;
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  ariaLabel: string;
  bodyContent: string;
}

const meta: Meta<CorModalArgs> = {
  title: 'Organisms/Modal',
  component: 'cor-modal',
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the modal is open/visible',
      table: { defaultValue: { summary: 'false' } },
    },
    placement: {
      control: 'select',
      options: Object.values(ModalPlacement),
      description: 'Placement of the modal: right (drawer), center (dialog), or full (full-width)',
      table: { defaultValue: { summary: 'center' } },
    },
    size: {
      control: 'select',
      options: Object.values(ModalSize),
      description: 'Size variant: sm, md, or lg',
      table: { defaultValue: { summary: 'md' } },
    },
    title: {
      control: 'text',
      description: 'Title projected into the modal header via slot="title"',
    },
    hideHeader: {
      control: 'boolean',
      description: 'Hide the modal header entirely (removes header container, border, padding, and close button)',
      table: { defaultValue: { summary: 'false' } },
    },
    closeOnBackdrop: {
      control: 'boolean',
      description: 'Whether clicking the backdrop closes the modal',
      table: { defaultValue: { summary: 'true' } },
    },
    closeOnEscape: {
      control: 'boolean',
      description: 'Whether pressing Escape closes the modal',
      table: { defaultValue: { summary: 'true' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible label for the modal (used if no modalTitle)',
    },
    bodyContent: {
      control: 'text',
      description: 'Demo content for the modal body',
      table: { category: 'Demo' },
    },
  },
  args: {
    open: true,
    placement: ModalPlacement.CENTER,
    size: ModalSize.MD,
    title: 'Title',
    hideHeader: false,
    closeOnBackdrop: true,
    closeOnEscape: true,
    ariaLabel: '',
    bodyContent: 'Modal body content goes here. This is where you can add forms, text, or any other content.',
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<CorModalArgs>;

const renderModal = (args: CorModalArgs) => /*html*/ `
  <cor-modal
    ${args.open ? 'open' : ''}
    placement="${args.placement}"
    size="${args.size}"
    ${args.hideHeader ? 'hide-header' : ''}
    close-on-backdrop="${args.closeOnBackdrop}"
    close-on-escape="${args.closeOnEscape}"
    aria-label="${args.ariaLabel || ''}"
  >
    ${args.title ? /*html*/ `<cor-typography slot="title" variant="heading-md" color="color-neutral-text-default"><h2>${args.title}</h2></cor-typography>` : ''}
    <cor-typography variant="body-md">
      <p>${args.bodyContent}</p>
    </cor-typography>

    <div slot="footer" style="display: flex; justify-content: space-between; width: 100%;">
      <cor-button variant="secondary-gray" size="${IconSize.MD}">
        <button type="button">Cancel</button>
      </cor-button>
      <cor-button variant="primary-gray" size="${IconSize.MD}">
        <button type="button">Save<cor-icon name="${ICON_NAMES.CHECKMARK__FILLED}" size="${IconSize.MD}" color="currentColor"></cor-icon></button>
      </cor-button>
    </div>
  </cor-modal>
`;

export const Default: Story = {
  render: renderModal,
};

export const CenterSmall: Story = {
  args: {
    placement: ModalPlacement.CENTER,
    size: ModalSize.SM,
    title: 'Title',
  },
  render: renderModal,
};

export const CenterMedium: Story = {
  args: {
    placement: ModalPlacement.CENTER,
    size: ModalSize.MD,
    title: 'Title',
  },
  render: renderModal,
};

export const RightSmall: Story = {
  args: {
    placement: ModalPlacement.RIGHT,
    size: ModalSize.SM,
    title: 'Title',
  },
  render: renderModal,
};

export const RightMedium: Story = {
  args: {
    placement: ModalPlacement.RIGHT,
    size: ModalSize.MD,
    title: 'Title',
  },
  render: renderModal,
};

export const FullLarge: Story = {
  args: {
    placement: ModalPlacement.FULL,
    size: ModalSize.LG,
    title: 'Title',
  },
  render: renderModal,
};

export const WithoutFooter: Story = {
  args: {
    title: 'Modal Without Footer',
  },
  render: args => /*html*/ `
    <cor-modal
      ${args.open ? 'open' : ''}
      placement="${args.placement}"
      size="${args.size}"
      ${args.hideHeader ? 'hide-header' : ''}
      close-on-backdrop="${args.closeOnBackdrop}"
      close-on-escape="${args.closeOnEscape}"
      aria-label="${args.ariaLabel || ''}"
    >
      ${args.title ? /*html*/ `<cor-typography slot="title" variant="heading-md" color="color-neutral-text-default"><h2>${args.title}</h2></cor-typography>` : ''}
      <cor-typography variant="body-md">
        <p>${args.bodyContent}</p>
      </cor-typography>
    </cor-modal>
  `,
};

export const WithoutHeader: Story = {
  args: {
    title: '',
    hideHeader: true,
  },
  render: args => /*html*/ `
    <cor-modal
      ${args.open ? 'open' : ''}
      placement="${args.placement}"
      size="${args.size}"
      ${args.hideHeader ? 'hide-header' : ''}
      close-on-backdrop="${args.closeOnBackdrop}"
      close-on-escape="${args.closeOnEscape}"
      aria-label="${args.ariaLabel || ''}"
    >
      <cor-typography variant="body-md">
        <p>${args.bodyContent}</p>
      </cor-typography>

      <div slot="footer" style="display: flex; justify-content: space-between; width: 100%;">
        <cor-button variant="secondary-gray" size="${IconSize.MD}">
          <button type="button" data-modal-close>Cancel</button>
        </cor-button>
        <cor-button variant="primary-gray" size="${IconSize.MD}">
          <button type="button">Save<cor-icon name="${ICON_NAMES.CHECKMARK__FILLED}" size="${IconSize.MD}" color="currentColor"></cor-icon></button>
        </cor-button>
      </div>
    </cor-modal>
  `,
};

export const LongContent: Story = {
  args: {
    title: 'Long Content Modal',
    bodyContent: '',
  },
  render: args => /*html*/ `
    <cor-modal
      ${args.open ? 'open' : ''}
      placement="${args.placement}"
      size="${args.size}"
      ${args.hideHeader ? 'hide-header' : ''}
      close-on-backdrop="${args.closeOnBackdrop}"
      close-on-escape="${args.closeOnEscape}"
      aria-label="${args.ariaLabel || ''}"
    >
      ${args.title ? /*html*/ `<cor-typography slot="title" variant="heading-md" color="color-neutral-text-default"><h2>${args.title}</h2></cor-typography>` : ''}
      <div>
        ${Array(20)
          .fill(null)
          .map(
            (_, i) => `
              <cor-typography variant="body-md">
                <p>Paragraph ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
              </cor-typography>
            `,
          )
          .join('')}
      </div>
      <div slot="footer" style="display: flex; justify-content: space-between; width: 100%;">
        <cor-button variant="secondary-gray" size="${IconSize.MD}">
          <button type="button">Cancel</button>
        </cor-button>
        <cor-button variant="primary-gray" size="${IconSize.MD}">
          <button type="button">Save<cor-icon name="${ICON_NAMES.CHECKMARK__FILLED}" size="${IconSize.MD}" color="currentColor"></cor-icon></button>
        </cor-button>
      </div>
    </cor-modal>
  `,
};

export const ComposableHeader: Story = {
  args: {
    title: 'Settings',
    hideHeader: false,
    bodyContent:
      'This modal uses <code>slot="title"</code> for rich title content and <code>slot="header-actions"</code> for extra header buttons. The DS close button is always present.',
  },
  render: args => /*html*/ `
    <cor-modal
      ${args.open ? 'open' : ''}
      placement="${args.placement}"
      size="${args.size}"
      ${args.hideHeader ? 'hide-header' : ''}
      close-on-backdrop="${args.closeOnBackdrop}"
      close-on-escape="${args.closeOnEscape}"
      aria-label="${args.ariaLabel || ''}"
    >
      <span slot="title" style="display: flex; align-items: center; gap: 8px;">
        <cor-icon name="${ICON_NAMES.SETTINGS}" size="${IconSize.MD}"></cor-icon>
        ${args.title ? `<cor-typography variant="heading-md" color="color-neutral-text-default"><h2>${args.title}</h2></cor-typography>` : ''}

        <cor-typography variant="body-sm" color="color-neutral-text-default"><span>System configuration</span></cor-typography>
      </span>
      <cor-button slot="header-actions" variant="secondary-gray" size="md" icon-only>
        <button type="button" aria-label="Help"><cor-icon name="${ICON_NAMES.HELP}" size="${IconSize.MD}"></cor-icon></button>
      </cor-button>
      <cor-typography variant="body-md">
        <p>${args.bodyContent}</p>
      </cor-typography>
      <div slot="footer" style="display: flex; justify-content: space-between; width: 100%;">
        <cor-button variant="secondary-gray" size="${IconSize.MD}">
          <button type="button">Cancel</button>
        </cor-button>
        <cor-button variant="primary-gray" size="${IconSize.MD}">
          <button type="button">Save<cor-icon name="${ICON_NAMES.CHECKMARK__FILLED}" size="${IconSize.MD}" color="currentColor"></cor-icon></button>
        </cor-button>
      </div>
    </cor-modal>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Use `slot="title"` for rich title content (text, icons, badges) and `slot="header-actions"` for extra buttons. The DS-provided close button is always rendered in shadow DOM.',
      },
    },
  },
};

export const FullHeaderOverride: Story = {
  args: {
    title: 'Full Header Override',
    hideHeader: false,
    closeOnBackdrop: true,
    closeOnEscape: true,
    ariaLabel: 'Full Header Override',
    bodyContent:
      'This modal uses <code>slot="header"</code> to replace the entire header region, including the close button. Use this only for complex toolbars that cannot be composed with <code>slot="title"</code> and <code>slot="header-actions"</code>.',
  },
  render: args => /*html*/ `
    <cor-modal
      ${args.open ? 'open' : ''}
      placement="${args.placement}"
      size="${args.size}"
      ${args.hideHeader ? 'hide-header' : ''}
      close-on-backdrop="${args.closeOnBackdrop}"
      close-on-escape="${args.closeOnEscape}"
      aria-label="${args.ariaLabel || ''}"
    >
      <div slot="header" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <cor-typography variant="heading-xl" color="color-neutral-text-default">
            <h2>Full Override</h2>
          </cor-typography>
        </div>
        <div style="display: flex; gap: 8px;">
          <cor-input size="md" placeholder="Search" style="width: 200px;">
            <cor-icon name="${ICON_NAMES.SEARCH}" slot="icon-left" />
          </cor-input>
          <cor-input size="md" value="Value" placeholder="Search" style="width: 135px;">
            <cor-icon name="${ICON_NAMES.CALENDAR}" slot="icon-left" />
          </cor-input>
          <cor-button variant="secondary-gray" size="md"
            ><button type="button"><cor-icon name="${ICON_NAMES.FILTER}"></cor-icon>Filters</button></cor-button
          >
          <cor-button variant="primary" size="${IconSize.MD}">
            <button type="button">Action</button>
          </cor-button>
          <cor-button variant="secondary-gray" size="${IconSize.MD}" icon-only>
            <button type="button" aria-label="Close" data-modal-close>
              <cor-icon name="${ICON_NAMES.CLOSE__LARGE}" size="${IconSize.MD}"></cor-icon>
            </button>
          </cor-button>
        </div>
      </div>
      <div>
        <cor-typography variant="body-md">
          <p>${args.bodyContent}</p>
        </cor-typography>
      </div>
      <div slot="footer" style="display: flex; justify-content: space-between; width: 100%;">
        <cor-button variant="secondary-gray" size="${IconSize.MD}">
          <button type="button">Cancel</button>
        </cor-button>
        <cor-button variant="primary-gray" size="${IconSize.MD}">
          <button type="button">Save<cor-icon name="${ICON_NAMES.CHECKMARK__FILLED}" size="${IconSize.MD}" color="currentColor"></cor-icon></button>
        </cor-button>
      </div>
    </cor-modal>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Use `slot="header"` only as an escape hatch for complex toolbars. The entire header region is replaced — you must provide your own close button.',
      },
    },
  },
};

export const InteractiveDemo: Story = {
  argTypes: {
    open: {
      control: false,
    },
  },
  args: {
    open: false,
    placement: ModalPlacement.CENTER,
    size: ModalSize.MD,
    title: 'Interactive Demo',
    closeOnBackdrop: true,
    closeOnEscape: true,
    bodyContent:
      'Click the backdrop or press Escape to close this modal. Any element with <code>data-modal-close</code> will close this modal when clicked — no JavaScript needed.',
  },
  render: args => /*html*/ `
    <div style="padding: 24px;">
      <cor-button variant="primary" size="${IconSize.MD}">
        <button type="button" onclick="document.querySelector('#demo-modal').show()">Open Modal</button>
      </cor-button>

      <cor-modal
        id="demo-modal"
        placement="${args.placement}"
        size="${args.size}"
        ${args.hideHeader ? 'hide-header' : ''}
        close-on-backdrop="${args.closeOnBackdrop}"
        close-on-escape="${args.closeOnEscape}"
      >
        ${args.title ? /*html*/ `<cor-typography slot="title" variant="heading-md" color="color-neutral-text-default"><h2>${args.title}</h2></cor-typography>` : ''}
        <cor-typography variant="body-md">
          <p>${args.bodyContent}</p>
        </cor-typography>
        <div slot="footer" style="display: flex; justify-content: space-between; width: 100%;">
          <cor-button variant="secondary-gray" size="${IconSize.MD}">
            <button type="button" data-modal-close>Cancel</button>
          </cor-button>
          <cor-button variant="primary-gray" size="${IconSize.MD}">
            <button type="button">Save<cor-icon name="${ICON_NAMES.CHECKMARK__FILLED}" size="${IconSize.MD}" color="currentColor"></cor-icon></button>
          </cor-button>
        </div>
      </cor-modal>
    </div>
  `,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Add `data-modal-close` to any slotted element to close the modal declaratively without writing JavaScript.',
      },
    },
  },
};
