import { SeparatorVariant } from './cor-separator.enums';

export default {
  title: 'Utilities/Separator',
  component: 'cor-separator',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: Object.values(SeparatorVariant),
      control: { type: 'select' },
      defaultValue: SeparatorVariant.DIVIDER,
    },
  },
};

export const Separator = {
  render: (args: any) => /*html*/ `
    <div style="padding: 12px;">
      <cor-separator variant="${args.variant}"></cor-separator>
    </div>
  `,
  args: {
    variant: SeparatorVariant.DIVIDER,
  },
};

export const SeparatorTop = {
  render: (args: any) => /*html*/ `
    <div style="padding: 12px;">
      <cor-separator variant="${args.variant}" style="background: var(--color-neutral-border-default)"></cor-separator>
    </div>
  `,
  args: {
    variant: SeparatorVariant.TOP,
  },
};
