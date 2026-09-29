import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { RADIO_SIZES } from '../mud-radio/mud-radio.types';
import type { RadioSize } from '../mud-radio/mud-radio.types';
import { RADIO_GROUP_ORIENTATIONS } from './mud-radio-group.types';
import type { RadioGroupOrientation } from './mud-radio-group.types';

type RadioGroupArgs = {
  label: string;
  value: string;
  size: RadioSize;
  orientation: RadioGroupOrientation;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
  errorText: string;
};

type Option = {
  value: string;
  label: string;
  supporting?: string;
  disabled?: boolean;
};

const ERROR_TEXT = 'Selectați o opțiune pentru a continua.';

const NOTIFICATIONS: Option[] = [
  { value: 'email', label: 'E-mail' },
  { value: 'sms', label: 'SMS' },
  { value: 'post', label: 'Poștă' },
];

const YES_NO: Option[] = [
  { value: 'da', label: 'Da' },
  { value: 'nu', label: 'Nu' },
];

const DELIVERY: Option[] = [
  { value: 'standard', label: 'Livrare standard', supporting: '3–5 zile lucrătoare, gratuit.' },
  { value: 'express', label: 'Livrare expres', supporting: '1–2 zile lucrătoare, 50 MDL.' },
  { value: 'office', label: 'Ridicare de la oficiu', supporting: 'Disponibil din ziua următoare.' },
];

// ---------- Markup helpers ----------
//
// Options carry their visible text in `mud-radio`'s `label` / `supporting-text`
// slots; the props of the same name render the same text.

const option = (o: Option): string => {
  const attrs = [`value="${o.value}"`, o.disabled ? 'disabled' : ''].filter(Boolean).join(' ');
  const supporting = o.supporting ? `<span slot="supporting-text">${o.supporting}</span>` : '';
  return `<mud-radio ${attrs}><span slot="label">${o.label}</span>${supporting}</mud-radio>`;
};

type GroupOpts = Partial<RadioGroupArgs> & { options: Option[]; id?: string };

const group = (opts: GroupOpts): string => {
  const attrs = [
    opts.id ? `id="${opts.id}"` : '',
    opts.label ? `label="${opts.label}"` : '',
    opts.value ? `value="${opts.value}"` : '',
    opts.size && opts.size !== 'md' ? `size="${opts.size}"` : '',
    opts.orientation && opts.orientation !== 'vertical' ? `orientation="${opts.orientation}"` : '',
    opts.errorText ? `error-text="${opts.errorText}"` : '',
    opts.disabled ? 'disabled' : '',
    opts.invalid ? 'invalid' : '',
    opts.required ? 'required' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const options = opts.options.map(o => `\n  ${option(o)}`).join('');
  return `<mud-radio-group ${attrs}>${options}\n</mud-radio-group>`;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-12);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

const renderGroup = (args: RadioGroupArgs) => group({ ...args, options: NOTIFICATIONS });

const meta: Meta<RadioGroupArgs> = {
  title: 'Components/Radio Group',
  component: 'mud-radio-group',
  argTypes: {
    label: { control: 'text', description: 'Visible group label; names the radiogroup.' },
    value: {
      control: 'select',
      options: ['', ...NOTIFICATIONS.map(o => o.value)],
      description: '`value` of the selected radio.',
    },
    size: {
      control: 'select',
      options: RADIO_SIZES,
      description: 'Size rung given to every radio and the label.',
      table: { defaultValue: { summary: 'md' } },
    },
    orientation: {
      control: 'inline-radio',
      options: RADIO_GROUP_ORIENTATIONS,
      description: 'Stacked, or in a row that wraps.',
      table: { defaultValue: { summary: 'vertical' } },
    },
    disabled: { control: 'boolean', description: 'Disables every radio.' },
    invalid: { control: 'boolean', description: 'Turns every radio red; pair with `error-text`.' },
    required: { control: 'boolean', description: 'Sets `aria-required` on the radiogroup.' },
    errorText: { control: 'text', description: 'Message shown under the options while `invalid` is set.' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A labelled set of `mud-radio` options with one selection. The group is one Tab stop; the arrow keys move the selection. It gives its radios one `name`, its `size`, `disabled` and `invalid`, and fires one `mudChange` per selection.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<RadioGroupArgs>;

export const Default: Story = {
  render: renderGroup,
  args: {
    label: 'Cum doriți să primiți notificările?',
    value: 'sms',
    size: 'md',
    orientation: 'vertical',
    disabled: false,
    invalid: false,
    required: false,
    errorText: '',
  },
  parameters: {
    docs: {
      source: { type: 'dynamic', transform: (_code: string, ctx: { args: RadioGroupArgs }) => renderGroup(ctx.args) },
    },
  },
};

export const Horizontal: Story = {
  render: () => group({ label: 'Aveți deja un cont MPass?', orientation: 'horizontal', value: 'da', options: YES_NO }),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          '`orientation="horizontal"` lays the options out in a row, 24px apart, and wraps them when the row is full.',
      },
      source: {
        code: group({ label: 'Aveți deja un cont MPass?', orientation: 'horizontal', value: 'da', options: YES_NO }),
      },
    },
  },
};

export const WithSupportingText: Story = {
  name: 'With Supporting Text',
  render: () => group({ label: 'Alegeți modul de livrare', value: 'standard', options: DELIVERY }),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Each option can describe itself in the `supporting-text` slot of its `mud-radio`.',
      },
      source: { code: group({ label: 'Alegeți modul de livrare', value: 'standard', options: DELIVERY }) },
    },
  },
};

export const HorizontalWithSupportingText: Story = {
  name: 'Horizontal With Supporting Text',
  render: () => /*html*/ `
    <div style="max-width: 720px;">
      ${group({ label: 'Alegeți modul de livrare', orientation: 'horizontal', value: 'express', options: DELIVERY })}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'A horizontal group of options with supporting text. The row wraps when the options do not fit.',
      },
      source: {
        code: group({
          label: 'Alegeți modul de livrare',
          orientation: 'horizontal',
          value: 'express',
          options: DELIVERY,
        }),
      },
    },
  },
};

export const Error: Story = {
  name: 'Error',
  render: () =>
    group({
      label: 'Cum doriți să primiți notificările?',
      invalid: true,
      errorText: ERROR_TEXT,
      options: NOTIFICATIONS,
    }),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          '`invalid` turns every radio red and sets `aria-invalid` on the radiogroup; `error-text` shows the message under the options, linked through `aria-describedby`.',
      },
      source: {
        code: group({
          label: 'Cum doriți să primiți notificările?',
          invalid: true,
          errorText: ERROR_TEXT,
          options: NOTIFICATIONS,
        }),
      },
    },
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
      ${cell('group disabled', group({ label: 'Cum doriți să primiți notificările?', value: 'sms', disabled: true, options: NOTIFICATIONS }))}
      ${cell(
        'one option disabled',
        group({
          label: 'Cum doriți să primiți notificările?',
          value: 'email',
          options: [NOTIFICATIONS[0], { ...NOTIFICATIONS[1], disabled: true }, NOTIFICATIONS[2]],
        }),
      )}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'A disabled group disables every radio. An option disabled on its own is skipped by the arrow keys, and stays disabled when the group is enabled again.',
      },
      source: {
        code: [
          group({ label: 'Cum doriți să primiți notificările?', value: 'sms', disabled: true, options: NOTIFICATIONS }),
          group({
            label: 'Cum doriți să primiți notificările?',
            value: 'email',
            options: [NOTIFICATIONS[0], { ...NOTIFICATIONS[1], disabled: true }, NOTIFICATIONS[2]],
          }),
        ].join('\n\n'),
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => /*html*/ `
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 320px)); gap: var(--spacing-24) var(--spacing-48); padding: var(--spacing-24); max-width: 760px;">
      ${RADIO_SIZES.map(size => cell(`size="${size}"`, group({ label: 'Cum doriți să primiți notificările?', value: 'sms', size, options: NOTIFICATIONS }))).join('')}
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: RADIO_SIZES.map(size =>
          group({ label: 'Cum doriți să primiți notificările?', value: 'sms', size, options: NOTIFICATIONS }),
        ).join('\n\n'),
      },
    },
  },
};

// Regression test, not documentation — hidden from the sidebar and autodocs.
// The keyboard contract and the event path only exist in a real browser: the
// radio's `mudChange` reaches the group's shadow listener through the slot,
// which the spec environment does not model.
export const KeyboardAndPointer: Story = {
  tags: ['!autodocs', '!dev'],
  render: () =>
    group({ id: 'group', label: 'Livrare', options: [DELIVERY[0], { ...DELIVERY[1], disabled: true }, DELIVERY[2]] }),
  parameters: { controls: { disable: true }, docs: { disable: true } },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await customElements.whenDefined('mud-radio-group');
    await customElements.whenDefined('mud-radio');
    const groupEl = canvasElement.querySelector('#group') as HTMLMudRadioGroupElement;
    const radios = Array.from(groupEl.querySelectorAll('mud-radio')) as HTMLMudRadioElement[];
    const events: unknown[] = [];
    canvasElement.addEventListener('mudChange', ev => events.push((ev as CustomEvent).detail));

    // One Tab stop: nothing selected, so the first enabled radio. The other
    // hosts carry tabindex="-1", which takes their shadow input out of the
    // Tab order. `userEvent.tab()` walks the light DOM only and cannot show
    // that, so the attribute is what this pins.
    await waitFor(() => expect(radios.map(r => r.getAttribute('tabindex'))).toEqual([null, '-1', '-1']));
    radios[0].focus();
    await waitFor(() => expect(document.activeElement).toBe(radios[0]));

    // ArrowDown skips the disabled option and selects the last one.
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(groupEl.value).toBe('office'));
    // Focus and the radios' checked state land after the value, so wait for them too.
    await waitFor(() => expect(document.activeElement).toBe(radios[2]));
    await waitFor(() => expect(radios.map(r => r.checked)).toEqual([false, false, true]));

    // ArrowDown wraps to the first.
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(groupEl.value).toBe('standard'));

    // A click on another radio: one group event, no radio event outside the group.
    const input = radios[2].shadowRoot?.querySelector('input') as HTMLInputElement;
    // The radio re-renders asynchronously after the group unchecks it; a click on
    // an input that is still checked changes nothing and fires no change event.
    await waitFor(() => expect(input.checked).toBe(false));
    input.click();
    await waitFor(() => expect(groupEl.value).toBe('office'));
    await waitFor(() => expect(events).toEqual([{ value: 'office' }, { value: 'standard' }, { value: 'office' }]));
  },
};
