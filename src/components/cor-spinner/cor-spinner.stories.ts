import { SpinnerSize } from './cor-spinner.enums';

export default {
  title: 'Atoms/Spinner',
  component: 'cor-spinner',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: Object.values(SpinnerSize),
    },
    label: {
      control: 'text',
    },
    hideDots: {
      control: 'boolean',
    },
  },
};

const renderSpinner = (args: { size: SpinnerSize; label?: string; hideDots?: boolean }) => {
  const attrs = [`size="${args.size}"`, args.label ? `label="${args.label}"` : '', args.hideDots ? 'hide-dots' : '']
    .filter(Boolean)
    .join(' ');
  return /*html*/ `<cor-spinner ${attrs}></cor-spinner>`;
};

export const Default = {
  render: renderSpinner,
  args: {
    size: SpinnerSize.XLG,
    label: 'Loading',
  },
};

export const AllSizes = {
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: 32px; padding: 24px; flex-wrap: wrap;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="xlg"></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">xlg (56px)</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="lg"></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">lg (44px)</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="md"></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">md (32px)</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="sm"></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">sm (24px)</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="xsm"></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">xsm (16px)</span>
      </div>
    </div>
  `,
  parameters: {
    controls: {
      disable: true,
    },
  },
};

export const Xlg = {
  render: renderSpinner,
  args: { size: SpinnerSize.XLG, label: 'Loading' },
};

export const Lg = {
  render: renderSpinner,
  args: { size: SpinnerSize.LG, label: 'Loading' },
};

export const Md = {
  render: renderSpinner,
  args: { size: SpinnerSize.MD, label: 'Loading' },
};

export const Sm = {
  render: renderSpinner,
  args: { size: SpinnerSize.SM, label: 'Loading' },
};

export const Xsm = {
  render: renderSpinner,
  args: { size: SpinnerSize.XSM, label: 'Loading' },
};

export const WithoutDots = {
  render: renderSpinner,
  args: {
    size: SpinnerSize.XLG,
    label: 'Loading',
    hideDots: true,
  },
};

export const AllSizesWithoutDots = {
  render: () => /*html*/ `
    <div style="display: flex; align-items: center; gap: 32px; padding: 24px; flex-wrap: wrap;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="xlg" hide-dots></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">xlg (56px)</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="lg" hide-dots></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">lg (44px)</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="md" hide-dots></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">md (32px)</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="sm" hide-dots></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">sm (24px)</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <cor-spinner size="xsm" hide-dots></cor-spinner>
        <span style="font-size: 12px; color: var(--color-text-base-tertiary);">xsm (16px)</span>
      </div>
    </div>
  `,
  parameters: {
    controls: {
      disable: true,
    },
  },
};
