import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { SEGMENTED_CONTROL_SIZES } from './mud-segmented-control.types';
import type { SegmentedControlSegment, SegmentedControlSize } from './mud-segmented-control.types';
import { jsLiteral } from '../../utils/story-docs-source';

type StoryArgs = {
  size: SegmentedControlSize;
  disabled: boolean;
  fluid: boolean;
  stacked: boolean;
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
    ${args.stacked ? 'stacked' : ''}
    aria-label="${args.ariaLabel ?? 'Filtru'}"
  ></mud-segmented-control>
  ${renderControlScript(elId, segments)}
`;
};

// ---------------------------------------------------------------------------
// Code-panel snippets — the consumer markup, without the demo chrome
// ---------------------------------------------------------------------------

// `segments` is a property, not an attribute, so a snippet hands it over in a script, one
// `[id, segments]` pair per element, addressed by id. No top-level binding, so snippets
// pasted onto one page do not collide.
const docsSourceScript = (assignments: Array<[id: string, segments: SegmentedControlSegment[]]>) => `<script>
${assignments
  .map(
    ([id, segments]) => `  document.getElementById('${id}').segments = [
${segments.map(segment => `    ${jsLiteral(segment)},`).join('\n')}
  ];`,
  )
  .join('\n')}
</script>`;

const meta: Meta<StoryArgs> = {
  title: 'Components/Segmented Control',
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
            { value: 'lista', label: 'List' },
            { value: 'harta', label: 'Map' },
          ],
          { value: 'lista', ariaLabel: 'Display mode' },
        ),
      ),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<mud-segmented-control aria-label="Display mode" value="lista"></mud-segmented-control>
<script>
  document.querySelector('mud-segmented-control').segments = [
    { value: 'lista', label: 'List' },
    { value: 'harta', label: 'Map' },
  ];
</script>`,
      },
    },
  },
};

const docsSourceThree = /*html*/ `<mud-segmented-control id="segmented-status-filter" aria-label="Status filter" value="active"></mud-segmented-control>
${docsSourceScript([
  [
    'segmented-status-filter',
    [
      { value: 'toate', label: 'Toate' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  ],
])}`;

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
          { value: 'active', ariaLabel: 'Status filter' },
        ),
      ),
    ),
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceThree } },
  },
};

const docsSourceFour = /*html*/ `<mud-segmented-control id="segmented-range" aria-label="Range" value="saptamana"></mud-segmented-control>
${docsSourceScript([
  [
    'segmented-range',
    [
      { value: 'zi', label: 'Zi' },
      { value: 'saptamana', label: 'Week' },
      { value: 'luna', label: 'Month' },
      { value: 'an', label: 'An' },
    ],
  ],
])}`;

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
            { value: 'saptamana', label: 'Week' },
            { value: 'luna', label: 'Month' },
            { value: 'an', label: 'An' },
          ],
          { value: 'saptamana', ariaLabel: 'Range' },
        ),
      ),
    ),
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceFour } },
  },
};

const docsSourceFivePlus = /*html*/ `<!-- 5 segments: the recommended ceiling. -->
<mud-segmented-control id="segmented-five" aria-label="Request filter" value="noi"></mud-segmented-control>

<!-- 6 segments: use sparingly. -->
<mud-segmented-control id="segmented-six" aria-label="Pas" value="3"></mud-segmented-control>
${docsSourceScript([
  [
    'segmented-five',
    [
      { value: 'toate', label: 'Toate' },
      { value: 'noi', label: 'Noi' },
      { value: 'in-curs', label: 'In progress' },
      { value: 'finalizate', label: 'Completed' },
      { value: 'expirate', label: 'Expirate' },
    ],
  ],
  [
    'segmented-six',
    [
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5' },
      { value: '6', label: '6' },
    ],
  ],
])}`;

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
              { value: 'in-curs', label: 'In progress' },
              { value: 'finalizate', label: 'Completed' },
              { value: 'expirate', label: 'Expirate' },
            ],
            { value: 'noi', ariaLabel: 'Request filter' },
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
      source: { code: docsSourceFivePlus },
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
                { value: 'a', fluid: true, ariaLabel: 'Mobile breakpoint' },
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
<mud-segmented-control aria-label="Filter" value="a"></mud-segmented-control>

<!-- Mobile: full-width. -->
<mud-segmented-control aria-label="Filter" value="a" fluid></mud-segmented-control>`,
      },
    },
  },
};

const docsSourceEqualSizes = /*html*/ `<mud-segmented-control id="segmented-equal-sizes" aria-label="Dimensiuni egale" value="a"></mud-segmented-control>
${docsSourceScript([
  [
    'segmented-equal-sizes',
    [
      { value: 'a', label: 'Other Label' },
      { value: 'b', label: 'Label' },
      { value: 'c', label: 'Label' },
    ],
  ],
])}`;

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
      source: { code: docsSourceEqualSizes },
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
              { value: 'saptamana', label: 'Week' },
              { value: 'luna', label: 'Month' },
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
      { value: 'saptamana',  label: 'Week' },
      { value: 'luna',       label: 'Month' },
    ];
  }
</script>`,
      },
    },
  },
};

const stateSegments: SegmentedControlSegment[] = [
  { value: 'a', label: 'Label' },
  { value: 'b', label: 'Label' },
];

const docsSourceStates = /*html*/ `<!-- default -->
<mud-segmented-control id="segmented-state-default" aria-label="Stare default" value="a"></mud-segmented-control>

<!-- unselected: no selection -->
<mud-segmented-control id="segmented-state-unselected" aria-label="No selection"></mud-segmented-control>

<!-- focus: use Tab to focus -->
<mud-segmented-control id="segmented-state-focus" aria-label="Stare focus" value="a"></mud-segmented-control>
${docsSourceScript([
  ['segmented-state-default', stateSegments],
  ['segmented-state-unselected', stateSegments],
  ['segmented-state-focus', stateSegments],
])}`;

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
            { value: '', ariaLabel: 'No selection' },
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
      source: { code: docsSourceStates },
    },
  },
};

const docsSourceDisabled = /*html*/ `<!-- The whole control disabled. -->
<mud-segmented-control id="segmented-disabled-all" aria-label="Interval (disabled)" value="saptamana" disabled></mud-segmented-control>

<!-- A single segment disabled. -->
<mud-segmented-control id="segmented-disabled-one" aria-label="Range with a disabled segment" value="zi"></mud-segmented-control>
${docsSourceScript([
  [
    'segmented-disabled-all',
    [
      { value: 'zi', label: 'Zi' },
      { value: 'saptamana', label: 'Week' },
      { value: 'luna', label: 'Month' },
    ],
  ],
  [
    'segmented-disabled-one',
    [
      { value: 'zi', label: 'Zi' },
      { value: 'saptamana', label: 'Week', disabled: true },
      { value: 'luna', label: 'Month' },
    ],
  ],
])}`;

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
              { value: 'saptamana', label: 'Week' },
              { value: 'luna', label: 'Month' },
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
              { value: 'saptamana', label: 'Week', disabled: true },
              { value: 'luna', label: 'Month' },
            ],
            { value: 'zi', ariaLabel: 'Range with a disabled segment' },
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceDisabled } },
  },
};

const docsSourceWithIcons = /*html*/ `<mud-segmented-control id="segmented-icons-three" aria-label="Display mode" value="lista"></mud-segmented-control>
<mud-segmented-control id="segmented-icons-sm" aria-label="Display mode (compact)" value="harta" size="sm"></mud-segmented-control>
${docsSourceScript([
  [
    'segmented-icons-three',
    [
      { value: 'lista', label: 'List', iconName: 'bullet-list' },
      { value: 'harta', label: 'Map', iconName: 'map-pin' },
      { value: 'grila', label: 'Grid', iconName: 'dot-grid' },
    ],
  ],
  [
    'segmented-icons-sm',
    [
      { value: 'lista', label: 'List', iconName: 'bullet-list' },
      { value: 'harta', label: 'Map', iconName: 'map-pin' },
    ],
  ],
])}`;

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
              { value: 'lista', label: 'List', iconName: 'bullet-list' },
              { value: 'harta', label: 'Map', iconName: 'map-pin' },
              { value: 'grila', label: 'Grid', iconName: 'dot-grid' },
            ],
            { value: 'lista', ariaLabel: 'Display mode' },
          ),
        ),
        cell(
          'icon + label, sm size',
          renderControlHtml(
            'sc-ic-sm',
            [
              { value: 'lista', label: 'List', iconName: 'bullet-list' },
              { value: 'harta', label: 'Map', iconName: 'map-pin' },
            ],
            { value: 'harta', size: 'sm', ariaLabel: 'Display mode (compact)' },
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
      source: { code: docsSourceWithIcons },
    },
  },
};

const docsSourceStacked = /*html*/ `<!-- Stacks itself when a row will not fit; the stacked attribute pins the layout. -->
<mud-segmented-control id="segmented-stacked" aria-label="Type (stacked)" value="cetatean" stacked fluid></mud-segmented-control>

<!-- The same segments as a row. -->
<mud-segmented-control id="segmented-stacked-row" aria-label="Type (row)" value="cetatean" fluid></mud-segmented-control>
${docsSourceScript(
  ['segmented-stacked', 'segmented-stacked-row'].map((id): [string, SegmentedControlSegment[]] => [
    id,
    [
      { value: 'cetatean', label: 'Citizen', iconName: 'bullet-list' },
      { value: 'afacere', label: 'Business', iconName: 'map-pin' },
      { value: 'institutii', label: 'Institutions', iconName: 'dot-grid' },
    ],
  ]),
)}`;

export const Stacked: Story = {
  name: 'Stacked',
  render: () => {
    const segments: SegmentedControlSegment[] = [
      { value: 'cetatean', label: 'Citizen', iconName: 'bullet-list' },
      { value: 'afacere', label: 'Business', iconName: 'map-pin' },
      { value: 'institutii', label: 'Institutions', iconName: 'dot-grid' },
    ];
    return wrap(
      [
        cell(
          'stacked — 288px (a 320px phone)',
          /*html*/ `
            <div style="inline-size: 288px;">
              ${renderControlHtml('sc-stacked', segments, { value: 'cetatean', stacked: true, fluid: true, ariaLabel: 'Type (stacked)' })}
            </div>
          `,
        ),
        cell(
          'the same row, for comparison',
          /*html*/ `
            <div style="inline-size: 288px;">
              ${renderControlHtml('sc-stacked-row', segments, { value: 'cetatean', fluid: true, ariaLabel: 'Type (row)' })}
            </div>
          `,
        ),
      ].join(''),
    );
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The control stacks by itself when a row will not fit: it measures what the row would need — the widest segment, since the track keeps its columns equal — against the space it has, and moves the icons above the labels only then. Resize the canvas and watch the first cell flip at around 300px.\n\nNot a Figma variant. The design set draws one row at both breakpoints and answers a long label with an ellipsis, which runs out on a narrow phone: three segments with icons need 382px where a 320px device offers 288, and truncating leaves “Ce…”, “Af…”, “Ins…” to choose between. Stacking brings the same three to 258px and keeps every word. The `stacked` attribute pins the layout where a row would still fit. Pending design sign-off.',
      },
      source: { code: docsSourceStacked },
    },
  },
};

export const EdgeCases: Story = {
  name: 'EdgeCases',
  render: () =>
    wrap(
      [
        cell(
          'long label truncates with ellipsis (329px, per Figma 663:12433)',
          // A width, because the control hugs its content: given room, long
          // labels simply make it wider and nothing truncates. Figma's own edge
          // case pins 329px around two segments, which is what forces the case.
          // Not `fluid` — that is the Mobile breakpoint and pads 4; this edge
          // case is the Desktop variant, constrained.
          /*html*/ `
            <div style="inline-size: 329px;">
              ${renderControlHtml(
                'sc-ec-truncate',
                [
                  {
                    value: 'a',
                    label:
                      'Moldova’s digital evolution is at the heart of seamless public service delivery, providing citizens with easy access to essential information.',
                  },
                  { value: 'b', label: 'Services, Always at Your Fingertips' },
                ],
                { value: 'a', ariaLabel: 'Label truncation' },
              )}
            </div>
          `,
        ),
        cell(
          'long labels, three segments',
          /*html*/ `
            <div style="inline-size: 329px;">
              ${renderControlHtml(
                'sc-ec-truncate-3',
                [
                  { value: 'a', label: 'Recent requests' },
                  { value: 'b', label: 'Completed requests' },
                  { value: 'c', label: 'Requests pending for a long time' },
                ],
                { value: 'a', ariaLabel: 'Label truncation (3)' },
              )}
            </div>
          `,
        ),
        cell(
          'no selection (uncontrolled start)',
          renderControlHtml(
            'sc-ec-empty',
            [
              { value: 'zi', label: 'Zi' },
              { value: 'saptamana', label: 'Week' },
              { value: 'luna', label: 'Month' },
            ],
            { value: '', ariaLabel: 'No initial selection' },
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
                { value: 'toate', fluid: true, ariaLabel: 'Filter (mobile)' },
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
          'Figma Edge Cases (663:12428) states the rule this story demonstrates: “Labels for segmented controls should be concise and brief to fit within the available space. Aim to use short labels to ensure readability. However, if a longer label is unavoidable, truncate the text on the first line with an ellipsis.”\n\nTruncation only happens once something constrains the width — the control hugs its content, so given room the long labels simply make it wider. The first two cells sit in the 329px box the design pins, with the labels the design uses.',
      },
      source: {
        code: `<!-- Long labels truncate with ellipsis. -->
<mud-segmented-control aria-label="Truncation" value="a"></mud-segmented-control>

<!-- No initial selection — first enabled segment becomes the roving tab stop. -->
<mud-segmented-control aria-label="No selection"></mud-segmented-control>

<!-- Mobile-width container (343px). -->
<div style="inline-size: 343px;">
  <mud-segmented-control aria-label="Filter" value="toate"></mud-segmented-control>
</div>

<script>
  for (const el of document.querySelectorAll('mud-segmented-control')) {
    el.segments = [
      { value: 'a', label: 'Recent requests' },
      { value: 'b', label: 'Completed requests' },
      { value: 'c', label: 'Requests pending for a long time' },
    ];
  }
</script>`,
      },
    },
  },
};
