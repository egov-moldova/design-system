import { LinkSize, LinkState, LinkUnderline } from './cor-link.enums';
import ICON_NAMES from '../cor-icon/assets/carbon-icon-names.json';

export default {
  title: 'Atoms/Link',
  component: 'cor-link',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(LinkSize),
      description: 'Size of the link',
    },
    state: {
      control: 'select',
      options: Object.values(LinkState),
      description: 'Visual state of the link',
    },
    href: {
      control: 'text',
      description: 'Href for the anchor element',
    },
    target: {
      control: 'text',
      description: 'Target for the anchor element',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible label for icon-only mode',
    },
    underline: {
      control: 'select',
      options: Object.values(LinkUnderline),
      description: 'Controls when the link is underlined',
    },
  },
};

export const Default = {
  render: (args: any) => {
    return /*html*/ `<cor-link
      size="${args.size}"
      state="${args.state}"
      underline="${args.underline}"
      href="${args.href}"
      ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
    >
      <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}" size="${args.size === 'sm' ? 'sm' : 'md'}" color="currentColor"></cor-icon>
      Label
      <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}" size="${args.size === 'sm' ? 'sm' : 'md'}" color="currentColor"></cor-icon>
    </cor-link>`;
  },
  args: {
    size: LinkSize.MD,
    state: LinkState.DEFAULT,
    underline: LinkUnderline.ALWAYS,
    href: '#',
    target: '_self',
    ariaLabel: '',
  },
};

export const UnderlineVariants = {
  render: () => {
    const underlines = Object.values(LinkUnderline);
    const sizes = Object.values(LinkSize);

    return /*html*/ `
      <div style="font-family: system-ui, sans-serif; padding: 20px;">
        <h2>Link Underline Variants</h2>
        <p style="margin-bottom: 20px; color: var(--color-text-base-tertiary);">
          Demonstrates the three underline options: always (best for accessibility), hover, and none.
        </p>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: left; background: var(--color-background-base-default);">Underline</th>
              ${sizes.map(size => `<th style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: center; background: var(--color-background-base-default); text-transform: uppercase;">${size}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${underlines
              .map(
                underline => `
              <tr>
                <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; font-weight: 600; background: var(--color-background-base-default); white-space: nowrap;">${underline}</td>
                ${sizes
                  .map(
                    size => `
                  <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: center;">
                    <cor-link size="${size}" underline="${underline}">Link text</cor-link>
                  </td>
                `,
                  )
                  .join('')}
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
        <div style="margin-top: 24px; padding: 16px; background: var(--color-background-brand-default); border-left: 4px solid var(--color-border-brand-default);">
          <strong>Accessibility Note:</strong> Use <code>underline="always"</code> for links within body text to ensure they're distinguishable for colorblind users (WCAG 2.1 compliance).
        </div>
      </div>
    `;
  },
  parameters: {
    controls: {
      disable: true,
    },
  },
};

export const AllStatesTable = {
  render: () => {
    const states = Object.values(LinkState);
    const sizes = Object.values(LinkSize);

    const sizeHeaders = sizes
      .map(
        size =>
          /*html*/ `<th colspan="3" style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: center; background: var(--color-background-base-default); text-transform: uppercase;">${size}</th>`,
      )
      .join('');

    const subHeaders = sizes
      .map(
        () => /*html*/ `
        <th style="border: 1px solid var(--color-border-base-subtle); padding: 8px; text-align: center; background: var(--color-background-base-default); font-size: 11px;">With icons</th>
        <th style="border: 1px solid var(--color-border-base-subtle); padding: 8px; text-align: center; background: var(--color-background-base-default); font-size: 11px;">Label only</th>
        <th style="border: 1px solid var(--color-border-base-subtle); padding: 8px; text-align: center; background: var(--color-background-base-default); font-size: 11px;">Icon only</th>
      `,
      )
      .join('');

    const stateRows = states
      .map(state => {
        const cells = sizes
          .map(size => {
            return /*html*/ `
            <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: center;">
              <cor-link size="${size}" state="${state}">
                <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}" size="${size === 'sm' ? 'sm' : 'md'}" color="currentColor"></cor-icon>
                Label
                <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}" size="${size === 'sm' ? 'sm' : 'md'}" color="currentColor"></cor-icon>
              </cor-link>
            </td>
            <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: center;">
              <cor-link size="${size}" state="${state}">Label</cor-link>
            </td>
            <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: center;">
              <cor-link size="${size}" state="${state}" aria-label="Icon only link">
                <cor-icon slot="icon" name="${ICON_NAMES.LAUNCH}" size="${size === 'sm' ? 'sm' : 'md'}" color="currentColor"></cor-icon>
              </cor-link>
            </td>
          `;
          })
          .join('');

        return /*html*/ `
        <tr>
          <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; font-weight: 600; background: var(--color-background-base-default); white-space: nowrap;">:${state}</td>
          ${cells}
        </tr>`;
      })
      .join('');

    // Add skeleton row
    const skeletonCells = sizes
      .map(size => {
        return /*html*/ `
        <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: center;">
          <cor-link size="${size}" skeleton>
            <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}" size="${size === 'sm' ? 'sm' : 'md'}" color="currentColor"></cor-icon>
            Label
            <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}" size="${size === 'sm' ? 'sm' : 'md'}" color="currentColor"></cor-icon>
          </cor-link>
        </td>
        <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: center;">
          <cor-link size="${size}" skeleton>Label</cor-link>
        </td>
        <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: center;">
          <cor-link size="${size}" skeleton icon-only></cor-link>
        </td>
      `;
      })
      .join('');

    const skeletonRow = /*html*/ `
      <tr>
        <td style="border: 1px solid var(--color-border-base-subtle); padding: 12px; font-weight: 600; background: var(--color-background-base-default); white-space: nowrap;">skeleton</td>
        ${skeletonCells}
      </tr>`;

    return /*html*/ `
      <div style="font-family: system-ui, sans-serif; padding: 20px;">
        <h2>Link States Matrix</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="border: 1px solid var(--color-border-base-subtle); padding: 12px; text-align: left; background: var(--color-background-base-default);">State</th>
              ${sizeHeaders}
            </tr>
            <tr>
              <th style="border: 1px solid var(--color-border-base-subtle); padding: 8px; background: var(--color-background-base-default);"></th>
              ${subHeaders}
            </tr>
          </thead>
          <tbody>
            ${stateRows}
            ${skeletonRow}
          </tbody>
        </table>
      </div>
    `;
  },
  parameters: {
    controls: {
      disable: true,
    },
  },
};

export const SizeMd = {
  args: {
    size: LinkSize.MD,
    state: LinkState.DEFAULT,
    underline: LinkUnderline.ALWAYS,
    href: '#',
    target: '_self',
    ariaLabel: '',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 20px; font-family: system-ui;">
      <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
        <cor-link
          size="${args.size}"
          state="${args.state}"
          underline="${args.underline}"
          href="${args.href}"
          ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
        >
          <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}"
          size="${args.size}" color="currentColor"></cor-icon>
          Label
          <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}"
          size="${args.size}" color="currentColor"></cor-icon>
        </cor-link>
        <cor-link
          size="${args.size}"
          state="${args.state}"
          underline="${args.underline}"
          href="${args.href}"
          ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
        >
          Label
        </cor-link>
        <cor-link
          size="${args.size}"
          state="${args.state}"
          underline="${args.underline}"
          href="${args.href}"
          ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
        >
          <cor-icon slot="icon" name="${ICON_NAMES.LAUNCH}"
          size="${args.size}" color="currentColor"></cor-icon>
        </cor-link>
      </div>
    </div>
  `,
};

export const SizeSm = {
  args: {
    size: LinkSize.SM,
    state: LinkState.DEFAULT,
    underline: LinkUnderline.ALWAYS,
    href: '#',
    target: '_self',
    ariaLabel: '',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 20px; font-family: system-ui;">
      <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
        <cor-link
          size="${args.size}"
          state="${args.state}"
          underline="${args.underline}"
          href="${args.href}"
          ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
        >
          <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}"
          size="${args.size}" color="currentColor"></cor-icon>
          Label
          <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}"
          size="${args.size}" color="currentColor"></cor-icon>
        </cor-link>
        <cor-link
          size="${args.size}"
          state="${args.state}"
          underline="${args.underline}"
          href="${args.href}"
          ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
        >
          Label
        </cor-link>
        <cor-link
          size="${args.size}"
          state="${args.state}"
          underline="${args.underline}"
          href="${args.href}"
          ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
        >
          <cor-icon slot="icon" name="${ICON_NAMES.LAUNCH}"
          size="${args.size}" color="currentColor"></cor-icon>
        </cor-link>
      </div>
    </div>
  `,
};

export const StateDisabled = {
  args: {
    size: LinkSize.MD,
    state: LinkState.DISABLED,
    underline: LinkUnderline.ALWAYS,
    href: '#',
    target: '_self',
    ariaLabel: '',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; align-items: center; gap: 24px; padding: 20px;">
      <cor-link
        size="${args.size}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
      >
        <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}"
        size="${args.size}" color="currentColor"></cor-icon>
        Label
        <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}"
        size="${args.size}" color="currentColor"></cor-icon>
      </cor-link>
      <cor-link
        size="${args.size}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
      >
        Label
      </cor-link>
      <cor-link
        size="${args.size}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        aria-label="Icon only link"
      >
        <cor-icon slot="icon" name="${ICON_NAMES.LAUNCH}"
        size="${args.size}" color="currentColor"></cor-icon>
      </cor-link>
      <cor-link
        size="${LinkSize.SM}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
      >
        <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}"
        size="${LinkSize.SM}" color="currentColor"></cor-icon>
        Label
        <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}"
        size="${LinkSize.SM}" color="currentColor"></cor-icon>
      </cor-link>
      <cor-link
        size="${LinkSize.SM}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
      >
        Label
      </cor-link>
      <cor-link
        size="${LinkSize.SM}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        aria-label="Icon only link"
      >
        <cor-icon slot="icon" name="${ICON_NAMES.LAUNCH}"
        size="${LinkSize.SM}" color="currentColor"></cor-icon>
      </cor-link>
    </div>
  `,
};

export const StateError = {
  args: {
    size: LinkSize.MD,
    state: LinkState.ERROR,
    underline: LinkUnderline.ALWAYS,
    href: '#',
    target: '_self',
    ariaLabel: '',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; align-items: center; gap: 24px; padding: 20px;">
      <cor-link
        size="${args.size}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
      >
        <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}"
        size="${args.size}" color="currentColor"></cor-icon>
        Label
        <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}"
        size="${args.size}" color="currentColor"></cor-icon>
      </cor-link>
      <cor-link
        size="${args.size}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
      >
        Label
      </cor-link>
      <cor-link
        size="${args.size}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        aria-label="Icon only link"
      >
        <cor-icon slot="icon" name="${ICON_NAMES.LAUNCH}"
        size="${args.size}" color="currentColor"></cor-icon>
      </cor-link>
      <cor-link
        size="${LinkSize.SM}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
      >
        <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}"
        size="${LinkSize.SM}" color="currentColor"></cor-icon>
        Label
        <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}"
        size="${LinkSize.SM}" color="currentColor"></cor-icon>
      </cor-link>
      <cor-link
        size="${LinkSize.SM}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
      >
        Label
      </cor-link>
      <cor-link
        size="${LinkSize.SM}"
        state="${args.state}"
        underline="${args.underline}"
        href="${args.href}"
        aria-label="Icon only link"
      >
        <cor-icon slot="icon" name="${ICON_NAMES.LAUNCH}"
        size="${LinkSize.SM}" color="currentColor"></cor-icon>
      </cor-link>
    </div>
  `,
};

export const Skeleton = {
  argTypes: {
    state: {
      control: false,
    },
    href: {
      control: false,
    },
    target: {
      control: false,
    },
    ariaLabel: {
      control: false,
    },
    underline: {
      control: false,
    },
  },
  args: {
    size: LinkSize.MD,
    state: LinkState.DEFAULT,
    underline: LinkUnderline.ALWAYS,
    href: '#',
    target: '_self',
    ariaLabel: '',
  },
  render: (args: any) => /*html*/ `
    <div style="display: flex; align-items: center; gap: 24px; padding: 20px;">
      <cor-link size="${args.size}" skeleton
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}>
        <cor-icon slot="icon-left" name="${ICON_NAMES.LAUNCH}"
        size="${args.size}" color="currentColor"></cor-icon>
        Label
        <cor-icon slot="icon-right" name="${ICON_NAMES.LAUNCH}"
        size="${args.size}" color="currentColor"></cor-icon>
      </cor-link>

      <cor-link size="${args.size}" skeleton
        ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}>
        Label
      </cor-link>

      <cor-link size="${args.size}" skeleton icon-only></cor-link>

      <cor-link size="${LinkSize.SM}" skeleton></cor-link>

      <cor-link size="${LinkSize.SM}" skeleton></cor-link>

      <cor-link size="${LinkSize.SM}" skeleton icon-only></cor-link>
    </div>
  `,
};
