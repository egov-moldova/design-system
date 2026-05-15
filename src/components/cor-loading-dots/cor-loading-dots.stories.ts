export default {
  title: 'Atoms/Loading Dots',
  component: 'cor-loading-dots',
  tags: ['autodocs'],
  argTypes: {},
};

export const Default = {
  render: () => /*html*/ `
    <cor-loading-dots></cor-loading-dots>
  `,
  args: {},
  parameters: {
    controls: {
      disable: true,
    },
  },
};
