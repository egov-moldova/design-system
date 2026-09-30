import type { Meta, StoryObj } from '@storybook/web-components-vite';

import { TABS_SIZES } from './mud-tabs.types';
import type { TabDescriptor, TabsSize } from './mud-tabs.types';

type StoryArgs = {
  size: TabsSize;
  value: string;
  ariaLabel: string;
};

const cellLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin-bottom: var(--spacing-4);';

const wrap = (children: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); max-width: 1024px;">
    ${children}
  </div>
`;

const cell = (caption: string, body: string) => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-8);">
    <span style="${cellLabelStyle}">${caption}</span>
    ${body}
  </div>
`;

const renderTabsScript = (id: string, tabs: TabDescriptor[]) => /*html*/ `
  <script>
    (function(){
      const el = document.getElementById('${id}');
      if (el) el.tabs = ${JSON.stringify(tabs)};
    })();
  </script>
`;

const renderTabsHtml = (
  id: string,
  tabs: TabDescriptor[],
  args: Partial<StoryArgs> & { value: string },
  containerWidth?: string,
) => /*html*/ `
  <div ${containerWidth ? `style="inline-size: ${containerWidth};"` : ''}>
    <mud-tabs
      id="${id}"
      size="${args.size ?? 'md'}"
      value="${args.value}"
      aria-label="${args.ariaLabel ?? 'Navigare'}"
    ></mud-tabs>
    ${renderTabsScript(id, tabs)}
  </div>
`;

// ---------------------------------------------------------------------------
// Code-panel snippets — the consumer markup, without the demo chrome
// ---------------------------------------------------------------------------

// One tab as a one-line JS object literal.
const jsTab = (tab: TabDescriptor) =>
  `{ ${Object.entries(tab)
    .map(([key, v]) => `${key}: ${typeof v === 'string' ? `'${v}'` : String(v)}`)
    .join(', ')} }`;

// `tabs` is a property, not an attribute, so a snippet hands it over in a script, one
// `[selector, tabs]` pair per element.
const docsSourceScript = (assignments: Array<[selector: string, tabs: TabDescriptor[]]>) => `<script>
${assignments
  .map(
    ([selector, tabs]) => `  document.querySelector('${selector}').tabs = [
${tabs.map(tab => `    ${jsTab(tab)},`).join('\n')}
  ];`,
  )
  .join('\n')}
</script>`;

const defaultTabs: TabDescriptor[] = [
  { value: 'profil', label: 'Profil' },
  { value: 'documente', label: 'Documente' },
  { value: 'notificari', label: 'Notificări' },
  { value: 'setari', label: 'Setări' },
];

const meta: Meta<StoryArgs> = {
  title: 'Components/Tabs',
  component: 'mud-tabs',
  subcomponents: { 'mud-tab': 'mud-tab' },
  argTypes: {
    size: {
      control: 'select',
      options: TABS_SIZES,
      description: 'Visual size rung. `md` for desktop, `sm` for mobile/dense.',
      table: { defaultValue: { summary: 'md' } },
    },
    value: {
      control: 'text',
      description: 'Value of the currently selected tab.',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name for the tablist.',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          '`mud-tabs` is a horizontal tablist following the WAI-ARIA tabs pattern. ' +
          'It supports two composition modes: declarative `<mud-tab>` children, or a ' +
          'data-driven `tabs` prop. The component renders overflow chevrons when tabs ' +
          'exceed the container width.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  name: 'Default',
  render: args => renderTabsHtml('tabs-default', defaultTabs, args),
  args: {
    size: 'md',
    value: 'profil',
    ariaLabel: 'Navigare cont',
  },
  parameters: {
    docs: {
      source: {
        code: `<mud-tabs aria-label="Navigare cont" value="profil"></mud-tabs>
<script>
  document.querySelector('mud-tabs').tabs = [
    { value: 'profil', label: 'Profil' },
    { value: 'documente', label: 'Documente' },
    { value: 'notificari', label: 'Notificări' },
    { value: 'setari', label: 'Setări' },
  ];
</script>`,
      },
    },
  },
};

const sectionHeading = (text: string) =>
  `<p style="font-size: var(--font-size-14); font-weight: 500; color: var(--color-text-base-default); margin: 0; padding-block-start: var(--spacing-8);">${text}</p>`;

const variationTabs: Record<string, TabDescriptor[]> = {
  'regular': [
    { value: 'profil', label: 'Label' },
    { value: 'documente', label: 'Label' },
    { value: 'notificari', label: 'Label' },
    { value: 'setari', label: 'Label' },
  ],
  'icon': [
    { value: 'profil', label: 'Label', iconName: 'person' },
    { value: 'documente', label: 'Label', iconName: 'document' },
    { value: 'notificari', label: 'Label', iconName: 'notification' },
    { value: 'setari', label: 'Label', iconName: 'settings' },
  ],
  'badge': [
    { value: 'profil', label: 'Label' },
    { value: 'documente', label: 'Label', badgeCount: 18 },
    { value: 'notificari', label: 'Label' },
    { value: 'setari', label: 'Label' },
  ],
  'icon-badge': [
    { value: 'profil', label: 'Label', iconName: 'person' },
    { value: 'notificari', label: 'Label', iconName: 'notification', badgeCount: 18 },
    { value: 'plati', label: 'Label', iconName: 'credit-card' },
    { value: 'istoric', label: 'Label', iconName: 'clock' },
  ],
};

const docsSourceAllVariations = /*html*/ `<!-- Desktop (md) -->
<mud-tabs id="regular" aria-label="Label variation" value="profil"></mud-tabs>
<mud-tabs id="icon" aria-label="Icon variation" value="profil"></mud-tabs>
<mud-tabs id="badge" aria-label="Counter variation" value="profil"></mud-tabs>
<mud-tabs id="icon-badge" aria-label="Full variation" value="profil"></mud-tabs>

<!-- Mobile (sm) -->
<mud-tabs id="regular-sm" aria-label="Label variation sm" value="profil" size="sm"></mud-tabs>
<mud-tabs id="icon-sm" aria-label="Icon variation sm" value="profil" size="sm"></mud-tabs>
<mud-tabs id="badge-sm" aria-label="Counter variation sm" value="profil" size="sm"></mud-tabs>
<mud-tabs id="icon-badge-sm" aria-label="Full variation sm" value="profil" size="sm"></mud-tabs>
${docsSourceScript(
  ['', '-sm'].flatMap(suffix =>
    Object.entries(variationTabs).map(([id, tabs]): [string, TabDescriptor[]] => [`#${id}${suffix}`, tabs]),
  ),
)}`;

export const AllVariations: Story = {
  name: 'AllVariations',
  render: () =>
    wrap(
      [
        sectionHeading('Desktop (md)'),
        cell(
          'regular — label only',
          renderTabsHtml(
            'tabs-var-regular',
            [
              { value: 'profil', label: 'Label' },
              { value: 'documente', label: 'Label' },
              { value: 'notificari', label: 'Label' },
              { value: 'setari', label: 'Label' },
            ],
            { value: 'profil', ariaLabel: 'Label variation' },
          ),
        ),
        cell(
          'icon — leading icon + label',
          renderTabsHtml(
            'tabs-var-icon',
            [
              { value: 'profil', label: 'Label', iconName: 'person' },
              { value: 'documente', label: 'Label', iconName: 'document' },
              { value: 'notificari', label: 'Label', iconName: 'notification' },
              { value: 'setari', label: 'Label', iconName: 'settings' },
            ],
            { value: 'profil', ariaLabel: 'Icon variation' },
          ),
        ),
        cell(
          'badge — label + trailing badge count',
          renderTabsHtml(
            'tabs-var-badge',
            [
              { value: 'profil', label: 'Label' },
              { value: 'documente', label: 'Label', badgeCount: 18 },
              { value: 'notificari', label: 'Label' },
              { value: 'setari', label: 'Label' },
            ],
            { value: 'profil', ariaLabel: 'Counter variation' },
          ),
        ),
        cell(
          'icon + badge — both ornaments',
          renderTabsHtml(
            'tabs-var-icon-badge',
            [
              { value: 'profil', label: 'Label', iconName: 'person' },
              { value: 'notificari', label: 'Label', iconName: 'notification', badgeCount: 18 },
              { value: 'plati', label: 'Label', iconName: 'credit-card' },
              { value: 'istoric', label: 'Label', iconName: 'clock' },
            ],
            { value: 'profil', ariaLabel: 'Full variation' },
          ),
        ),
        sectionHeading('Mobile (sm)'),
        cell(
          'regular — label only',
          renderTabsHtml(
            'tabs-var-sm-regular',
            [
              { value: 'profil', label: 'Label' },
              { value: 'documente', label: 'Label' },
              { value: 'notificari', label: 'Label' },
              { value: 'setari', label: 'Label' },
            ],
            { value: 'profil', size: 'sm', ariaLabel: 'Label variation sm' },
          ),
        ),
        cell(
          'icon — leading icon + label',
          renderTabsHtml(
            'tabs-var-sm-icon',
            [
              { value: 'profil', label: 'Label', iconName: 'person' },
              { value: 'documente', label: 'Label', iconName: 'document' },
              { value: 'notificari', label: 'Label', iconName: 'notification' },
              { value: 'setari', label: 'Label', iconName: 'settings' },
            ],
            { value: 'profil', size: 'sm', ariaLabel: 'Icon variation sm' },
          ),
        ),
        cell(
          'badge — label + trailing badge count',
          renderTabsHtml(
            'tabs-var-sm-badge',
            [
              { value: 'profil', label: 'Label' },
              { value: 'documente', label: 'Label', badgeCount: 18 },
              { value: 'notificari', label: 'Label' },
              { value: 'setari', label: 'Label' },
            ],
            { value: 'profil', size: 'sm', ariaLabel: 'Counter variation sm' },
          ),
        ),
        cell(
          'icon + badge — both ornaments',
          renderTabsHtml(
            'tabs-var-sm-icon-badge',
            [
              { value: 'profil', label: 'Label', iconName: 'person' },
              { value: 'notificari', label: 'Label', iconName: 'notification', badgeCount: 18 },
              { value: 'plati', label: 'Label', iconName: 'credit-card' },
              { value: 'istoric', label: 'Label', iconName: 'clock' },
            ],
            { value: 'profil', size: 'sm', ariaLabel: 'Full variation sm' },
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The four Figma variations (label-only, leading icon, trailing badge, both ornaments) ' +
          'shown at Desktop (md — 48 px) and Mobile (sm — 40 px) sizes.',
      },
      source: { code: docsSourceAllVariations },
    },
  },
};

const focusTabHtml = (id: string, selectedValue: string, focusValue: string, ariaLabel: string) => /*html*/ `
  <mud-tabs id="${id}" aria-label="${ariaLabel}" value="${selectedValue}">
    <mud-tab value="a" label="Label"></mud-tab>
    <mud-tab value="b" label="Label"></mud-tab>
    <mud-tab value="c" label="Label"></mud-tab>
  </mud-tabs>
  <script>
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        // The story may already be unmounted when these frames run (test runners
        // mount the next story first), so the host can be gone.
        var host = document.getElementById('${id}');
        var tab = host && host.querySelector('mud-tab[value="${focusValue}"]');
        if (tab) tab.focus();
      });
    });
  </script>
`;

const statesTabs: TabDescriptor[] = [
  { value: 'a', label: 'Label' },
  { value: 'b', label: 'Label' },
  { value: 'c', label: 'Label' },
];

const docsSourceStates = /*html*/ `<mud-tabs id="selected" aria-label="Selected state" value="a"></mud-tabs>
<mud-tabs id="unselected" aria-label="Unselected state" value="a"></mud-tabs>

<mud-tabs aria-label="Stare selected-focus" value="b">
  <mud-tab value="a" label="Label"></mud-tab>
  <mud-tab value="b" label="Label"></mud-tab>
  <mud-tab value="c" label="Label"></mud-tab>
</mud-tabs>

<mud-tabs aria-label="Stare unselected-focus" value="a">
  <mud-tab value="a" label="Label"></mud-tab>
  <mud-tab value="b" label="Label"></mud-tab>
  <mud-tab value="c" label="Label"></mud-tab>
</mud-tabs>
${docsSourceScript([
  ['#selected', statesTabs],
  ['#unselected', statesTabs],
])}`;

export const States: Story = {
  name: 'States',
  render: () =>
    wrap(
      [
        cell(
          'selected — active tab (bold label + bottom indicator)',
          renderTabsHtml(
            'tabs-st-selected',
            [
              { value: 'a', label: 'Label' },
              { value: 'b', label: 'Label' },
              { value: 'c', label: 'Label' },
            ],
            { value: 'a', ariaLabel: 'Selected state' },
          ),
        ),
        cell(
          'unselected — inactive tab (secondary label, no indicator)',
          renderTabsHtml(
            'tabs-st-unselected',
            [
              { value: 'a', label: 'Label' },
              { value: 'b', label: 'Label' },
              { value: 'c', label: 'Label' },
            ],
            { value: 'a', ariaLabel: 'Unselected state' },
          ),
        ),
        cell(
          'selected: focus — active tab receives keyboard focus (Tab → ←/→)',
          focusTabHtml('tabs-st-sel-focus', 'b', 'b', 'Stare selected-focus'),
        ),
        cell(
          'unselected: focus — inactive tab receives keyboard focus without activating',
          focusTabHtml('tabs-st-unsel-focus', 'a', 'b', 'Stare unselected-focus'),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'The four Figma states: selected, unselected, selected+focus, unselected+focus. ' +
          'Tab into the tablist to see the keyboard focus ring; arrow keys move ' +
          'between enabled tabs (automatic activation mode — focus = selection).',
      },
      source: { code: docsSourceStates },
    },
  },
};

const overflowTabs: TabDescriptor[] = [
  { value: 'profil', label: 'Profile' },
  { value: 'documente', label: 'Documents' },
  { value: 'notificari', label: 'Notifications' },
  { value: 'setari', label: 'Settings' },
  { value: 'plati', label: 'Payments' },
  { value: 'istoric', label: 'History' },
  { value: 'preferinte', label: 'Preferences' },
  { value: 'securitate', label: 'Security' },
];

const docsSourceOverflow = /*html*/ `<!-- Many tabs in a narrow container: a chevron appears at the trailing edge. -->
<mud-tabs id="overflow-right" aria-label="Overflow trailing" value="profil"></mud-tabs>

<!-- Selection in the middle: chevrons on both edges once the strip is scrolled. -->
<mud-tabs id="overflow-left" aria-label="Overflow leading" value="setari"></mud-tabs>
${docsSourceScript([
  ['#overflow-right', overflowTabs],
  ['#overflow-left', overflowTabs],
])}`;

export const Overflow: Story = {
  name: 'Overflow',
  render: () =>
    wrap(
      [
        cell(
          'overflow right — many tabs in a narrow container; chevron appears at the trailing edge',
          renderTabsHtml(
            'tabs-of-right',
            [
              { value: 'profil', label: 'Profile' },
              { value: 'documente', label: 'Documents' },
              { value: 'notificari', label: 'Notifications' },
              { value: 'setari', label: 'Settings' },
              { value: 'plati', label: 'Payments' },
              { value: 'istoric', label: 'History' },
              { value: 'preferinte', label: 'Preferences' },
              { value: 'securitate', label: 'Security' },
            ],
            { value: 'profil', ariaLabel: 'Overflow trailing' },
            '420px',
          ),
        ),
        cell(
          'overflow left — pre-scrolled to the middle; chevrons appear on both edges',
          /*html*/ `
            <div style="inline-size: 420px;">
              <mud-tabs id="tabs-of-mid" aria-label="Overflow leading" value="setari"></mud-tabs>
            </div>
            ${renderTabsScript('tabs-of-mid', [
              { value: 'profil', label: 'Profile' },
              { value: 'documente', label: 'Documents' },
              { value: 'notificari', label: 'Notifications' },
              { value: 'setari', label: 'Settings' },
              { value: 'plati', label: 'Payments' },
              { value: 'istoric', label: 'History' },
              { value: 'preferinte', label: 'Preferences' },
              { value: 'securitate', label: 'Security' },
            ])}
            <script>
              requestAnimationFrame(function(){
                requestAnimationFrame(function(){
                  var el = document.getElementById('tabs-of-mid');
                  if (el && el.shadowRoot) {
                    var scroller = el.shadowRoot.querySelector('.scroller');
                    if (scroller) scroller.scrollLeft = 200;
                  }
                });
              });
            </script>
          `,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'When tabs exceed the container width, chevron buttons appear at the trailing ' +
          'edge (right) and, after scrolling, the leading edge (left) as well. Click a ' +
          'chevron to scroll the strip by 75 % of its width.',
      },
      source: { code: docsSourceOverflow },
    },
  },
};

const docsSourceMobile = /*html*/ `<mud-tabs id="mobile-label" aria-label="Mobile — label" value="profil" size="sm"></mud-tabs>
<mud-tabs id="mobile-overflow" aria-label="Mobile — overflow" value="profil" size="sm"></mud-tabs>
${docsSourceScript([
  [
    '#mobile-label',
    [
      { value: 'profil', label: 'Profile' },
      { value: 'documente', label: 'Documents' },
      { value: 'notificari', label: 'Notifications' },
    ],
  ],
  [
    '#mobile-overflow',
    [
      { value: 'profil', label: 'Profile', iconName: 'person' },
      { value: 'documente', label: 'Documents', iconName: 'document' },
      { value: 'notificari', label: 'Notifications', iconName: 'notification', badgeCount: 4 },
      { value: 'setari', label: 'Settings', iconName: 'settings' },
      { value: 'plati', label: 'Payments', iconName: 'credit-card' },
    ],
  ],
])}`;

export const Mobile: Story = {
  name: 'Mobile',
  render: () =>
    wrap(
      [
        cell(
          'sm size — 40px tall (mobile / dense layouts)',
          /*html*/ `
            <div style="inline-size: 360px;">
              ${renderTabsHtml(
                'tabs-mobile-1',
                [
                  { value: 'profil', label: 'Profile' },
                  { value: 'documente', label: 'Documents' },
                  { value: 'notificari', label: 'Notifications' },
                ],
                { value: 'profil', size: 'sm', ariaLabel: 'Mobile — label' },
              )}
            </div>
          `,
        ),
        cell(
          'sm + overflow — chevrons remain touch-friendly',
          /*html*/ `
            <div style="inline-size: 343px;">
              ${renderTabsHtml(
                'tabs-mobile-2',
                [
                  { value: 'profil', label: 'Profile', iconName: 'person' },
                  { value: 'documente', label: 'Documents', iconName: 'document' },
                  { value: 'notificari', label: 'Notifications', iconName: 'notification', badgeCount: 4 },
                  { value: 'setari', label: 'Settings', iconName: 'settings' },
                  { value: 'plati', label: 'Payments', iconName: 'credit-card' },
                ],
                { value: 'profil', size: 'sm', ariaLabel: 'Mobile — overflow' },
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
          'Mobile breakpoint uses `size="sm"`: 40 px tall, 12 px horizontal padding, ' +
          '14 px label font size. Touch targets are kept ≥ 24×24 per WCAG 2.1 AA.',
      },
      source: { code: docsSourceMobile },
    },
  },
};

const docsSourceWithDisabled = /*html*/ `<mud-tabs id="disabled-one" aria-label="With a disabled tab" value="profil"></mud-tabs>
<mud-tabs id="disabled-many" aria-label="Several disabled tabs" value="profil"></mud-tabs>
${docsSourceScript([
  [
    '#disabled-one',
    [
      { value: 'profil', label: 'Profile' },
      { value: 'documente', label: 'Documents', disabled: true },
      { value: 'notificari', label: 'Notifications' },
      { value: 'setari', label: 'Settings' },
    ],
  ],
  [
    '#disabled-many',
    [
      { value: 'profil', label: 'Profile' },
      { value: 'documente', label: 'Documents', disabled: true },
      { value: 'notificari', label: 'Notifications', badgeCount: 7, disabled: true },
      { value: 'setari', label: 'Settings' },
    ],
  ],
])}`;

export const WithDisabled: Story = {
  name: 'WithDisabled',
  render: () =>
    wrap(
      [
        cell(
          'one disabled tab — skipped by arrow-key navigation',
          renderTabsHtml(
            'tabs-disabled-one',
            [
              { value: 'profil', label: 'Profile' },
              { value: 'documente', label: 'Documents', disabled: true },
              { value: 'notificari', label: 'Notifications' },
              { value: 'setari', label: 'Settings' },
            ],
            { value: 'profil', ariaLabel: 'With a disabled tab' },
          ),
        ),
        cell(
          'multiple disabled tabs — selection lands on next enabled tab',
          renderTabsHtml(
            'tabs-disabled-many',
            [
              { value: 'profil', label: 'Profile' },
              { value: 'documente', label: 'Documents', disabled: true },
              { value: 'notificari', label: 'Notifications', badgeCount: 7, disabled: true },
              { value: 'setari', label: 'Settings' },
            ],
            { value: 'profil', ariaLabel: 'Several disabled tabs' },
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithDisabled } },
  },
};

const docsSourceWithPanels = /*html*/ `<mud-tabs aria-label="User account" value="profil">
  <mud-tab value="profil" label="Profile"></mud-tab>
  <mud-tab value="documente" label="Documents"></mud-tab>
  <mud-tab value="notificari" label="Notifications"></mud-tab>
  <mud-tab value="setari" label="Settings"></mud-tab>
  <p slot="panel-profil">
    <strong>User profile.</strong> Here you see your personal data, profile photo and the preferences shown to other members.
  </p>
  <p slot="panel-documente">
    <strong>Documents.</strong> Your ID card, contracts and identity documents stored safely.
  </p>
  <p slot="panel-notificari">
    <strong>Notifications.</strong> Recent messages about your account activity.
  </p>
  <p slot="panel-setari">
    <strong>Settings.</strong> Language, time zone, email alerts and two-step authentication.
  </p>
</mud-tabs>`;

export const WithPanels: Story = {
  name: 'WithPanels',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 720px;">
      <mud-tabs id="tabs-panels" aria-label="User account" value="profil">
        <mud-tab value="profil" label="Profile"></mud-tab>
        <mud-tab value="documente" label="Documents"></mud-tab>
        <mud-tab value="notificari" label="Notifications"></mud-tab>
        <mud-tab value="setari" label="Settings"></mud-tab>
        <div slot="panel-profil" style="font-size: var(--font-size-14); color: var(--color-text-base-default); line-height: 1.5;">
          <strong>User profile.</strong> Here you see your personal data, profile photo and the preferences shown to other members.
        </div>
        <div slot="panel-documente" style="font-size: var(--font-size-14); color: var(--color-text-base-default); line-height: 1.5;">
          <strong>Documents.</strong> Your ID card, contracts and identity documents stored safely.
        </div>
        <div slot="panel-notificari" style="font-size: var(--font-size-14); color: var(--color-text-base-default); line-height: 1.5;">
          <strong>Notifications.</strong> Recent messages about your account activity.
        </div>
        <div slot="panel-setari" style="font-size: var(--font-size-14); color: var(--color-text-base-default); line-height: 1.5;">
          <strong>Settings.</strong> Language, time zone, email alerts and two-step authentication.
        </div>
      </mud-tabs>
    </div>
  `,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Declarative composition: `<mud-tab>` children alongside matching ' +
          '`<div slot="panel-{value}">` blocks. The component wires `aria-controls` ' +
          'and `aria-labelledby` automatically and hides inactive panels via the ' +
          '`hidden` attribute.',
      },
      source: { code: docsSourceWithPanels },
    },
  },
};

const docsSourceEdgeCases = /*html*/ `<mud-tabs id="two" aria-label="Two tabs" value="a"></mud-tabs>
<mud-tabs id="long" aria-label="Long labels" value="a"></mud-tabs>
<mud-tabs id="badges" aria-label="Contoare mari" value="a"></mud-tabs>
<mud-tabs aria-label="Empty list"></mud-tabs>
${docsSourceScript([
  [
    '#two',
    [
      { value: 'a', label: 'List' },
      { value: 'b', label: 'Map' },
    ],
  ],
  [
    '#long',
    [
      { value: 'a', label: 'Detailed user profile' },
      { value: 'b', label: 'Recently uploaded documents' },
      { value: 'c', label: 'Non-linguistic notifications' },
    ],
  ],
  [
    '#badges',
    [
      { value: 'a', label: 'Messages', badgeCount: 99 },
      { value: 'b', label: 'Requests', badgeCount: 256 },
      { value: 'c', label: 'Archive', badgeCount: 0 },
    ],
  ],
])}`;

export const EdgeCases: Story = {
  name: 'EdgeCases',
  render: () =>
    wrap(
      [
        cell(
          'two tabs (minimum)',
          renderTabsHtml(
            'tabs-ec-two',
            [
              { value: 'a', label: 'List' },
              { value: 'b', label: 'Map' },
            ],
            { value: 'a', ariaLabel: 'Two tabs' },
          ),
        ),
        cell(
          'very long labels — truncate with ellipsis',
          /*html*/ `
            <div style="inline-size: 520px;">
              ${renderTabsHtml(
                'tabs-ec-long',
                [
                  { value: 'a', label: 'Detailed user profile' },
                  { value: 'b', label: 'Recently uploaded documents' },
                  { value: 'c', label: 'Non-linguistic notifications' },
                ],
                { value: 'a', ariaLabel: 'Long labels' },
              )}
            </div>
          `,
        ),
        cell(
          'high badge counts',
          renderTabsHtml(
            'tabs-ec-badges',
            [
              { value: 'a', label: 'Messages', badgeCount: 99 },
              { value: 'b', label: 'Requests', badgeCount: 256 },
              { value: 'c', label: 'Archive', badgeCount: 0 },
            ],
            { value: 'a', ariaLabel: 'Contoare mari' },
          ),
        ),
        cell(
          'empty tabs (defensive — renders nothing useful, no crash)',
          /*html*/ `
            <mud-tabs aria-label="Empty list"></mud-tabs>
          `,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceEdgeCases } },
  },
};
