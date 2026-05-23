import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SEGMENTED_CONTROL_SIZES } from './cor-segmented-control.types';
import type { SegmentedControlSegment, SegmentedControlSize } from './cor-segmented-control.types';

type StoryArgs = {
  size: SegmentedControlSize;
  disabled: boolean;
  value: string;
  ariaLabel: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const filterSegmented = ['Toate', 'Active', 'Inactive'];
const filterValues = ['toate', 'active', 'inactive'];

const renderControlScript = (id: string, segments: SegmentedControlSegment[]) => /*html*/ `
  <script>
    (function(){
      const el = document.getElementById('${id}');
      if (el) el.segments = ${JSON.stringify(segments)};
    })();
  </script>
`;

// Lit-html does not bind `.segments` reliably across some browser session
// reuses. The plain HTML stories below set the property via a script tag.
const renderControlHtml = (
  id: string,
  segments: SegmentedControlSegment[],
  args: Partial<StoryArgs> & { value: string },
) => /*html*/ `
  <cor-segmented-control
    id="${id}"
    size="${args.size ?? 'md'}"
    value="${args.value}"
    ${args.disabled ? 'disabled' : ''}
    aria-label="${args.ariaLabel ?? 'Filtru'}"
  ></cor-segmented-control>
  ${renderControlScript(id, segments)}
`;

const meta: Meta<StoryArgs> = {
  title: 'Atoms/Segmented Control',
  component: 'cor-segmented-control',
  argTypes: {
    size: {
      control: 'select',
      options: SEGMENTED_CONTROL_SIZES,
      description: 'Visual size rung.',
      table: { defaultValue: { summary: 'md' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the whole group.',
      table: { defaultValue: { summary: 'false' } },
    },
    value: {
      control: 'text',
      description: 'Value of the currently selected segment.',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name for the group.',
    },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  name: 'Default',
  render: args =>
    renderControlHtml(
      'sc-default',
      filterSegmented.map((label, i) => ({ value: filterValues[i] ?? label, label })),
      args,
    ),
  args: {
    size: 'md',
    disabled: false,
    value: 'toate',
    ariaLabel: 'Filtru stare',
  },
  parameters: {
    docs: {
      source: {
        code: `<cor-segmented-control aria-label="Filtru stare" value="toate"></cor-segmented-control>
<script>
  document.querySelector('cor-segmented-control').segments = [
    { value: 'toate', label: 'Toate' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];
</script>`,
      },
    },
  },
};

const wrap = (children: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); max-width: 900px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

export const Two: Story = {
  name: 'Two',
  render: () =>
    wrap(
      cell(
        '2 segments',
        renderControlHtml(
          'sc-two',
          [
            { value: 'lista', label: 'Lista' },
            { value: 'harta', label: 'Hartă' },
          ],
          { value: 'lista', ariaLabel: 'Mod afișare' },
        ),
      ),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<cor-segmented-control aria-label="Mod afișare" value="lista"></cor-segmented-control>
<script>
  document.querySelector('cor-segmented-control').segments = [
    { value: 'lista', label: 'Lista' },
    { value: 'harta', label: 'Hartă' },
  ];
</script>`,
      },
    },
  },
};

export const Three: Story = {
  name: 'Three',
  render: () =>
    wrap(
      cell(
        '3 segments',
        renderControlHtml(
          'sc-three',
          [
            { value: 'toate', label: 'Toate' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
          { value: 'active', ariaLabel: 'Filtru stare' },
        ),
      ),
    ),
  parameters: {
    controls: { disable: true },
  },
};

export const Four: Story = {
  name: 'Four',
  render: () =>
    wrap(
      cell(
        '4 segments',
        renderControlHtml(
          'sc-four',
          [
            { value: 'zi', label: 'Zi' },
            { value: 'saptamana', label: 'Săptămână' },
            { value: 'luna', label: 'Lună' },
            { value: 'an', label: 'An' },
          ],
          { value: 'saptamana', ariaLabel: 'Interval' },
        ),
      ),
    ),
  parameters: {
    controls: { disable: true },
  },
};

export const FivePlus: Story = {
  name: 'FivePlus',
  render: () =>
    wrap(
      [
        cell(
          '5 segments (recommended ceiling)',
          renderControlHtml(
            'sc-five',
            [
              { value: 'toate', label: 'Toate' },
              { value: 'noi', label: 'Noi' },
              { value: 'in-curs', label: 'În curs' },
              { value: 'finalizate', label: 'Finalizate' },
              { value: 'expirate', label: 'Expirate' },
            ],
            { value: 'noi', ariaLabel: 'Filtru solicitări' },
          ),
        ),
        cell(
          '6 segments (use sparingly — Figma cautions against >5)',
          renderControlHtml(
            'sc-six',
            [
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
              { value: '6', label: '6' },
            ],
            { value: '3', ariaLabel: 'Pas' },
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Figma 659:8188 recommends up to 5 segments. Past that, consider tabs or a `cor-select-input` instead — the control still works, but the labels start losing legibility.',
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'AllSizes',
  render: () =>
    wrap(
      SEGMENTED_CONTROL_SIZES.map((size, idx) =>
        cell(
          size,
          /*html*/ `
            <cor-segmented-control
              id="sc-size-${size}-${idx}"
              size="${size}"
              value="zi"
              aria-label="Interval (${size})"
            ></cor-segmented-control>
            <script>
              (function(){
                const el = document.getElementById('sc-size-${size}-${idx}');
                if (el) el.segments = [
                  { value: 'zi', label: 'Zi' },
                  { value: 'saptamana', label: 'Săptămână' },
                  { value: 'luna', label: 'Lună' },
                ];
              })();
            </script>
          `,
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
  },
};

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell(
          'default',
          renderControlHtml(
            'sc-st-default',
            [
              { value: 'a', label: 'Label' },
              { value: 'b', label: 'Label' },
            ],
            { value: 'a', ariaLabel: 'Stare default' },
          ),
        ),
        cell(
          'unselected (no selection)',
          renderControlHtml(
            'sc-st-unselected',
            [
              { value: 'a', label: 'Label' },
              { value: 'b', label: 'Label' },
            ],
            { value: '', ariaLabel: 'Fără selecție' },
          ),
        ),
        cell(
          'focus (use Tab to focus)',
          renderControlHtml(
            'sc-st-focus',
            [
              { value: 'a', label: 'Label' },
              { value: 'b', label: 'Label' },
            ],
            { value: 'a', ariaLabel: 'Stare focus' },
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Hover the unselected segment to see the soft hover tint. Tab into the control to see the keyboard focus ring (brand blue per AGE focus-ring tokens).',
      },
    },
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () =>
    wrap(
      [
        cell(
          'whole control disabled',
          renderControlHtml(
            'sc-d-all',
            [
              { value: 'zi', label: 'Zi' },
              { value: 'saptamana', label: 'Săptămână' },
              { value: 'luna', label: 'Lună' },
            ],
            { value: 'saptamana', disabled: true, ariaLabel: 'Interval (disabled)' },
          ),
        ),
        cell(
          'single segment disabled',
          renderControlHtml(
            'sc-d-one',
            [
              { value: 'zi', label: 'Zi' },
              { value: 'saptamana', label: 'Săptămână', disabled: true },
              { value: 'luna', label: 'Lună' },
            ],
            { value: 'zi', ariaLabel: 'Interval cu un segment dezactivat' },
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
  },
};

export const WithIcons: Story = {
  name: 'WithIcons',
  render: () =>
    wrap(
      [
        cell(
          'icon + label, 3 segments',
          renderControlHtml(
            'sc-ic-three',
            [
              { value: 'lista', label: 'Lista', iconName: 'bullet-list' },
              { value: 'harta', label: 'Hartă', iconName: 'map-pin' },
              { value: 'grila', label: 'Grilă', iconName: 'dot-grid' },
            ],
            { value: 'lista', ariaLabel: 'Mod afișare' },
          ),
        ),
        cell(
          'icon + label, sm size',
          renderControlHtml(
            'sc-ic-sm',
            [
              { value: 'lista', label: 'Lista', iconName: 'bullet-list' },
              { value: 'harta', label: 'Hartă', iconName: 'map-pin' },
            ],
            { value: 'harta', size: 'sm', ariaLabel: 'Mod afișare (compact)' },
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Leading icons use the existing `cor-icon` registry. Provide the icon `name` on the segment; the component renders it at 20px and inherits the segment text colour.',
      },
    },
  },
};

export const EdgeCases: Story = {
  name: 'EdgeCases',
  render: () =>
    wrap(
      [
        cell(
          'long label truncates with ellipsis',
          renderControlHtml(
            'sc-ec-truncate',
            [
              { value: 'a', label: 'Solicitări recente' },
              { value: 'b', label: 'Solicitări finalizate' },
              { value: 'c', label: 'Solicitări în așteptare îndelungată' },
            ],
            { value: 'a', ariaLabel: 'Truncare etichetă' },
          ),
        ),
        cell(
          'no selection (uncontrolled start)',
          renderControlHtml(
            'sc-ec-empty',
            [
              { value: 'zi', label: 'Zi' },
              { value: 'saptamana', label: 'Săptămână' },
              { value: 'luna', label: 'Lună' },
            ],
            { value: '', ariaLabel: 'Fără selecție inițială' },
          ),
        ),
        cell(
          'mobile breakpoint (touch — 343px container)',
          /*html*/ `
            <div style="inline-size: 343px;">
              ${renderControlHtml(
                'sc-ec-mobile',
                [
                  { value: 'toate', label: 'Toate' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ],
                { value: 'toate', ariaLabel: 'Filtru (mobil)' },
              )}
            </div>
          `,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
  },
};
