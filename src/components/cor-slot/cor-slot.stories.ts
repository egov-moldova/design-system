export default {
  title: 'Utilities/Slot',
  component: 'cor-slot',
  tags: ['autodocs'],
  argTypes: {
    size: {
      options: ['lg', 'sm'],
      control: { type: 'select' },
      defaultValue: 'lg',
      description: 'Controls padding and layout density of the slot.',
    },
  },
};

/**
 * Base Slot example
 */
export const Slot = {
  render: (args: any) => `<cor-slot size="${args.size}"></cor-slot>`,
  args: {
    size: 'lg',
  },
};
