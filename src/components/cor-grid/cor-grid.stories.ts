export default {
  title: 'Utilities/Grid',
  component: 'cor-grid',
  tags: ['autodocs'],
  argTypes: {
    spacing: {
      control: { type: 'number', min: 0, max: 40, step: 1 },
      description:
        'Optional helper to override the horizontal gap between grid items. When a number is provided, the value is applied directly in pixels.',
      defaultValue: null,
    },
    rowSpacing: {
      control: { type: 'number', min: 0, max: 40, step: 1 },
      description:
        'Optional helper to override the vertical gap between grid items. When a number is provided, the value is applied directly in pixels. ',
      defaultValue: null,
    },
  },
};

const itemStyle = () =>
  `background: var(--color-background-brand-default); border: 1px solid var(--color-border-brand-default); color: var(--color-text-brand-on-secondary); font-size: 18px; padding: 8px 16px; border-radius: 8px; min-height:44px; height: -webkit-fill-available; display:flex;align-items:center;justify-content:center;`;

export const FixedSizes = {
  render: (args: any) => `
    <cor-grid container spacing="${args.spacing}" row-spacing="${args.rowSpacing}">
      <cor-grid size="8"><div style="${itemStyle()}">8 columns</div></cor-grid>
      <cor-grid size="4"><div style="${itemStyle()}">4 columns</div></cor-grid>
      <cor-grid size="4"><div style="${itemStyle()}">4 columns</div></cor-grid>
      <cor-grid size="8"><div style="${itemStyle()}">8 columns</div></cor-grid>
    </cor-grid>
  `,
  args: {},
};

export const ResponsiveSizes = {
  render: (args: any) => `
    <cor-grid container spacing="${args.spacing}" row-spacing="${args.rowSpacing}">
      <cor-grid size='{"xs":6,"md":8}'><div style="${itemStyle()}">xs: 6 columns, md: 8 columns</div></cor-grid>
      <cor-grid size='{"xs":6,"md":4}'><div style="${itemStyle()}">xs: 6 columns, md: 4 columns</div></cor-grid>
      <cor-grid size='{"xs":6,"md":4}'><div style="${itemStyle()}">xs: 6 columns, md: 4 columns</div></cor-grid>
      <cor-grid size='{"xs":6,"md":8}'><div style="${itemStyle()}">xs: 6 columns, md: 8 columns</div></cor-grid>
    </cor-grid>
  `,
  args: {},
};

export const Nested = {
  render: (args: any) => `
    <cor-grid container spacing="${args.spacing}" row-spacing="${args.rowSpacing}">
      <cor-grid size="6" style="border: 1px dashed var(--color-border-base-tertiary); padding: 12px 0; border-radius: 8px;">
        <cor-grid container spacing="${args.spacing}" rowSpacing="${args.rowSpacing}">
          <cor-grid size='{"xs":12,"md":6}'><div style="${itemStyle()}">xs=12 md=6</div></cor-grid>
          <cor-grid size='{"xs":12,"md":6}'><div style="${itemStyle()}">xs=12 md=6</div></cor-grid>
        </cor-grid>
      </cor-grid>
      <cor-grid size="6" style="border: 1px dashed var(--color-border-base-tertiary); padding: 12px 0; border-radius: 8px"> </cor-grid>
    </cor-grid>
  `,
  args: {},
};
