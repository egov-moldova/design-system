import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SEGMENTED_CONTROL_SIZES } from './mud-segmented-control.types';
import type { SegmentedControlSegment, SegmentedControlSize } from './mud-segmented-control.types';

type StoryArgs = {
  size: SegmentedControlSize;
  disabled: boolean;
  fluid: boolean;
  value: string;
  ariaLabel: string;
};

const cellLabelStyle = 'font-size: var(--font-size-12); color: var(--color-text-base-tertiary);';

const filterSegmented = ['Toate', 'Active', 'Inactive'];
const filterValues = ['toate', 'active', 'inactive'];

// Each render gets a unique id so the same story re-rendered on one page (e.g.
// autodocs shows the primary story twice) never produces colliding ids.
let scRenderUid = 0;

const renderControlScript = (id: string, segments: SegmentedControlSegment[]) => /*html*/ `
  <script>
    (function(){
      // Resolve the control from the script's own position first — robust even
      // if two controls share an id — then fall back to the unique id.
      var s = document.currentScript;
      var prev = s && s.previousElementSibling;
      var el = prev && prev.tagName === 'MUD-SEGMENTED-CONTROL' ? prev : document.getElementById('${id}');
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
) => {
  const elId = `${id}-${++scRenderUid}`;
  return /*html*/ `
  <mud-segmented-control
    id="${elId}"
    size="${args.size ?? 'md'}"
    value="${args.value}"
    ${args.disabled ? 'disabled' : ''}
    ${args.fluid ? 'fluid' : ''}
    aria-label="${args.ariaLabel ?? 'Filtru'}"
  ></mud-segmented-control>
  ${renderControlScript(elId, segments)}
`;
};

const meta: Meta<StoryArgs> = {
  title: 'Atoms/Segmented Control',
  component: 'mud-segmented-control',
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
    fluid: {
      control: 'boolean',
      description: 'Full-width mode — the control fills its container (mobile breakpoint).',
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
    fluid: false,
    value: 'toate',
    ariaLabel: 'Filtru stare',
  },
  parameters: {
    docs: {
      source: {
        code: `<mud-segmented-control aria-label="Filtru stare" value="toate"></mud-segmented-control>
<script>
  document.querySelector('mud-segmented-control').segments = [
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
        code: `<mud-segmented-control aria-label="Mod afișare" value="lista"></mud-segmented-control>
<script>
  document.querySelector('mud-segmented-control').segments = [
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
          'Figma 659:8188 recommends up to 5 segments. Past that, consider tabs or a `mud-select` instead — the control still works, but the labels start losing legibility.',
      },
    },
  },
};

export const Breakpoints: Story = {
  name: 'Breakpoints',
  render: () =>
    wrap(
      [
        cell(
          'desktop — hugs content, segments uniform width',
          renderControlHtml(
            'sc-bp-desktop',
            [
              { value: 'a', label: 'Label' },
              { value: 'b', label: 'Label' },
            ],
            { value: 'a', ariaLabel: 'Breakpoint desktop' },
          ),
        ),
        cell(
          'mobile — fluid (full-width, 343px container)',
          /*html*/ `
            <div style="inline-size: 343px;">
              ${renderControlHtml(
                'sc-bp-mobile',
                [
                  { value: 'a', label: 'Label' },
                  { value: 'b', label: 'Label' },
                ],
                { value: 'a', fluid: true, ariaLabel: 'Breakpoint mobil' },
              )}
            </div>
          `,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Per Figma 659:8188 the control hugs its content on desktop and goes full-width on mobile. Set the `fluid` attribute for the mobile breakpoint — the equal-width segments then stretch to fill the container.',
      },
      source: {
        code: `<!-- Desktop: hugs content. -->
<mud-segmented-control aria-label="Filtru" value="a"></mud-segmented-control>

<!-- Mobile: full-width. -->
<mud-segmented-control aria-label="Filtru" value="a" fluid></mud-segmented-control>`,
      },
    },
  },
};

export const EqualSizes: Story = {
  name: 'EqualSizes',
  render: () =>
    wrap(
      cell(
        'mixed-length labels render at uniform width',
        renderControlHtml(
          'sc-equal',
          [
            { value: 'a', label: 'Other Label' },
            { value: 'b', label: 'Label' },
            { value: 'c', label: 'Label' },
          ],
          { value: 'a', ariaLabel: 'Dimensiuni egale' },
        ),
      ),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Every segment resolves to the width of the widest label, so siblings stay uniform regardless of their own text length (Figma "Equal Sizes" — Do).',
      },
    },
  },
};

export const AllSizes: Story = {
  name: 'AllSizes',
  render: () =>
    wrap(
      SEGMENTED_CONTROL_SIZES.map(size =>
        cell(
          size,
          renderControlHtml(
            `sc-size-${size}`,
            [
              { value: 'zi', label: 'Zi' },
              { value: 'saptamana', label: 'Săptămână' },
              { value: 'luna', label: 'Lună' },
            ],
            { value: 'zi', size, ariaLabel: `Interval (${size})` },
          ),
        ),
      ).join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<!-- The segments are assigned imperatively after upgrade (data prop). -->
<mud-segmented-control aria-label="Interval" value="zi" size="md"></mud-segmented-control>
<mud-segmented-control aria-label="Interval" value="zi" size="sm"></mud-segmented-control>

<script>
  for (const el of document.querySelectorAll('mud-segmented-control')) {
    el.segments = [
      { value: 'zi',         label: 'Zi' },
      { value: 'saptamana',  label: 'Săptămână' },
      { value: 'luna',       label: 'Lună' },
    ];
  }
</script>`,
      },
    },
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
          'Leading icons use the existing `mud-icon` registry. Provide the icon `name` on the segment; the component renders it at 20px and inherits the segment text colour.',
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
          'mobile breakpoint (fluid — 343px container)',
          /*html*/ `
            <div style="inline-size: 343px;">
              ${renderControlHtml(
                'sc-ec-mobile',
                [
                  { value: 'toate', label: 'Toate' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ],
                { value: 'toate', fluid: true, ariaLabel: 'Filtru (mobil)' },
              )}
            </div>
          `,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<!-- Long labels truncate with ellipsis. -->
<mud-segmented-control aria-label="Truncare" value="a"></mud-segmented-control>

<!-- No initial selection — first enabled segment becomes the roving tab stop. -->
<mud-segmented-control aria-label="Fără selecție"></mud-segmented-control>

<!-- Mobile-width container (343px). -->
<div style="inline-size: 343px;">
  <mud-segmented-control aria-label="Filtru" value="toate"></mud-segmented-control>
</div>

<script>
  for (const el of document.querySelectorAll('mud-segmented-control')) {
    el.segments = [
      { value: 'a', label: 'Solicitări recente' },
      { value: 'b', label: 'Solicitări finalizate' },
      { value: 'c', label: 'Solicitări în așteptare îndelungată' },
    ];
  }
</script>`,
      },
    },
  },
};
