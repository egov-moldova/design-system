import type { Meta, StoryObj } from '@storybook/web-components-vite';

import type { ToastVariant } from '../mud-toast/mud-toast.types';

type ToastRegionArgs = {
  duration: number;
};

const SAMPLE: Record<ToastVariant, { titleText: string; message: string }> = {
  info: { titleText: 'Programare confirmată', message: 'Vă așteptăm luni, la ora 10:00.' },
  success: { titleText: 'Plată efectuată', message: 'Chitanța a fost trimisă pe e-mail.' },
  warning: { titleText: 'Sesiunea expiră', message: 'Salvați modificările în următoarele 2 minute.' },
  error: { titleText: 'Plata a eșuat', message: 'Verificați datele cardului și încercați din nou.' },
};

const buttonRowStyle =
  'display: flex; flex-wrap: wrap; gap: var(--spacing-8); padding: var(--spacing-24); max-width: 520px;';
const hintStyle =
  'font-family: var(--font-family-primary); font-size: var(--font-size-14); color: var(--color-text-base-tertiary); margin: 0 var(--spacing-24);';

const renderPlayground = (args: ToastRegionArgs): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = /*html*/ `
    <div style="${buttonRowStyle}">
      ${(Object.keys(SAMPLE) as ToastVariant[])
        .map(
          variant =>
            `<mud-button variant="${variant === 'error' ? 'destructive' : 'neutral'}" data-variant="${variant}">Arată ${variant}</mud-button>`,
        )
        .join('')}
    </div>
    <p style="${hintStyle}">
      Info and success close themselves after ${args.duration} ms unless the pointer is over them or focus is inside;
      warning and error stay until closed.
    </p>
    <mud-toast-region duration="${args.duration}"></mud-toast-region>
  `;
  const region = wrapper.querySelector('mud-toast-region') as HTMLMudToastRegionElement;
  wrapper.querySelectorAll<HTMLElement>('[data-variant]').forEach(button => {
    button.addEventListener('click', () => {
      const variant = button.dataset.variant as ToastVariant;
      void region.show({ variant, ...SAMPLE[variant] });
    });
  });
  return wrapper;
};

const docsSourcePlayground = /*html*/ `<mud-toast-region id="toasts"></mud-toast-region>

<script>
  const toasts = document.getElementById('toasts');
  // Info and success close themselves after \`duration\` (5000 ms by default).
  toasts.show({ variant: 'success', titleText: 'Plată efectuată', message: 'Chitanța a fost trimisă pe e-mail.' });
  // Warnings and errors stay until the user closes them.
  toasts.show({ variant: 'error', titleText: 'Plata a eșuat', message: 'Verificați datele cardului.' });
</script>`;

// The stack Figma draws (14830:13873 desktop, 14830:13914 mobile): an older
// info toast and a newer success toast. duration="0" keeps them on screen.
const renderStack = () => /*html*/ `
  <mud-toast-region duration="0">
    <mud-toast variant="info" title-text="Message heading">We inform you about service changes.</mud-toast>
    <mud-toast variant="success" title-text="Message heading">We inform you about service changes.</mud-toast>
  </mud-toast-region>
`;

const docsSourceStack = /*html*/ `<mud-toast-region>
  <!-- Oldest first: on desktop the newest shows on top, on mobile nearest the bottom. -->
  <mud-toast variant="info" title-text="Message heading">We inform you about service changes.</mud-toast>
  <mud-toast variant="success" title-text="Message heading">We inform you about service changes.</mud-toast>
</mud-toast-region>`;

const meta: Meta<ToastRegionArgs> = {
  title: 'Components/Toast Region',
  component: 'mud-toast-region',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Places, stacks and dismisses `mud-toast` messages as the Figma Toast Message page shows them (14830:13653): ' +
          'top-right on desktop with the newest on top, along the bottom on mobile with the newest nearest the bottom, ' +
          '12px apart. Info and success toasts with no action close themselves after `duration`; warnings, errors and ' +
          'toasts with an action stay until the user closes them. Put one region on the page and call `show()`.',
      },
    },
  },
  argTypes: {
    duration: {
      control: { type: 'number', min: 0, step: 500 },
      description: 'Milliseconds an info or success toast with no action stays; 0 keeps every toast.',
      table: { defaultValue: { summary: '5000' } },
    },
  },
  args: {
    duration: 5000,
  },
};

export default meta;
type Story = StoryObj<ToastRegionArgs>;

export const Default: Story = {
  render: renderPlayground,
  parameters: { docs: { source: { code: docsSourcePlayground } } },
};

export const Stacked: Story = {
  render: renderStack,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceStack } } },
};

export const Mobile: Story = {
  // Storybook 10 reads the starting viewport from `globals`.
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  render: renderStack,
  parameters: { controls: { disable: true }, docs: { source: { code: docsSourceStack } } },
};
