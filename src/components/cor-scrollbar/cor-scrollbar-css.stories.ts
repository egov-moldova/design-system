export default {
  title: 'Utilities/Scrollbar/CSS',
  component: 'cor-scrollbar',
  tags: ['autodocs'],
  parameters: {
    controls: { include: ['variant'] },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['neutral', 'primary'],
      description: 'Utility variant: neutral | primary',
      table: { defaultValue: { summary: 'primary' } },
    },
  },
};

type ScrollbarArgs = {
  variant: 'neutral' | 'primary';
};

const argsDefault: ScrollbarArgs = {
  variant: 'neutral',
};

export const VerticalCSS = {
  args: argsDefault,
  render: (args: Partial<ScrollbarArgs>) => {
    const variantClass = args.variant === 'primary' ? ' cor-overflow-scrollbar--primary' : '';
    const items = Array.from(
      { length: 20 },
      () =>
        /*html*/ `<div style="height: 50px; margin-bottom: 16px; background: var(--color-neutral-background-default); border-radius: 8px;"></div>`,
    ).join('');

    return /*html*/ `
      <div class="cor-overflow-scrollbar${variantClass}" style="overflow: auto; height: 240px; width: 100%; border: 1px solid var(--color-neutral-border-weakest);">
        <div style="height: 1000px; padding: 16px;">
          ${items}
        </div>
      </div>
    `;
  },
};

export const HorizontalCSS = {
  args: argsDefault,
  render: (args: Partial<ScrollbarArgs>) => {
    const variantClass = args.variant === 'primary' ? ' cor-overflow-scrollbar--primary' : '';
    const items = Array.from(
      { length: 40 },
      () =>
        /*html*/ `<div style="height: 100%; width: 50px; margin-right: 8px; background: var(--color-neutral-background-default); border-radius: 8px;"></div>`,
    ).join('');

    return /*html*/ `
      <div class="cor-overflow-scrollbar${variantClass}" style="overflow: auto; height: 240px; width: 100%; border: 1px solid var(--color-neutral-border-weakest); padding: 16px;">
        <div style="height: 100%; width: fit-content; display: flex; gap: 8px; flex-direction: row;">
          ${items}
        </div>
      </div>
    `;
  },
};

export const BothCSS = {
  args: argsDefault,
  render: (args: Partial<ScrollbarArgs>) => {
    const variantClass = args.variant === 'primary' ? ' cor-overflow-scrollbar--primary' : '';
    const cells = Array.from({ length: 20 }, (_, row) =>
      Array.from(
        { length: 50 },
        (_, col) =>
          /*html*/ `<div style="width: 80px; height: 80px; display:flex; align-items:center; justify-content:center; background: var(--color-neutral-background-default); border-radius:6px; font-size:11px; color: var(--color-neutral-text-weaker);">${row + 1}×${col + 1}</div>`,
      ).join(''),
    )
      .map(row => /*html*/ `<div style="display:flex; gap:8px;">${row}</div>`)
      .join('');

    return /*html*/ `
      <div class="cor-overflow-scrollbar${variantClass}" style="overflow: auto; height: 300px; width: 100%; border: 1px solid var(--color-neutral-border-weakest);">
        <div style="width: fit-content; min-width: 100%; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          ${cells}
        </div>
      </div>
    `;
  },
};
