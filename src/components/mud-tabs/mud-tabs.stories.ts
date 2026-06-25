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

const defaultTabs: TabDescriptor[] = [
  { value: 'profil', label: 'Profil' },
  { value: 'documente', label: 'Documente' },
  { value: 'notificari', label: 'Notificări' },
  { value: 'setari', label: 'Setări' },
];

const meta: Meta<StoryArgs> = {
  title: 'Molecules/Tabs',
  component: 'mud-tabs',
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
            { value: 'profil', ariaLabel: 'Variație etichetă' },
          ),
        ),
        cell(
          'icon — leading icon + label',
          renderTabsHtml(
            'tabs-var-icon',
            [
              { value: 'profil', label: 'Label', iconName: 'person' },
              { value: 'documente', label: 'Label', iconName: 'document-filled' },
              { value: 'notificari', label: 'Label', iconName: 'notification' },
              { value: 'setari', label: 'Label', iconName: 'settings' },
            ],
            { value: 'profil', ariaLabel: 'Variație pictogramă' },
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
            { value: 'profil', ariaLabel: 'Variație contor' },
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
            { value: 'profil', ariaLabel: 'Variație completă' },
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
            { value: 'profil', size: 'sm', ariaLabel: 'Variație etichetă sm' },
          ),
        ),
        cell(
          'icon — leading icon + label',
          renderTabsHtml(
            'tabs-var-sm-icon',
            [
              { value: 'profil', label: 'Label', iconName: 'person' },
              { value: 'documente', label: 'Label', iconName: 'document-filled' },
              { value: 'notificari', label: 'Label', iconName: 'notification' },
              { value: 'setari', label: 'Label', iconName: 'settings' },
            ],
            { value: 'profil', size: 'sm', ariaLabel: 'Variație pictogramă sm' },
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
            { value: 'profil', size: 'sm', ariaLabel: 'Variație contor sm' },
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
            { value: 'profil', size: 'sm', ariaLabel: 'Variație completă sm' },
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
        var tab = document.getElementById('${id}').querySelector('mud-tab[value="${focusValue}"]');
        if (tab) tab.focus();
      });
    });
  </script>
`;

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
            { value: 'a', ariaLabel: 'Stare selectată' },
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
            { value: 'a', ariaLabel: 'Stare neselectată' },
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
    },
  },
};

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
              { value: 'profil', label: 'Profil' },
              { value: 'documente', label: 'Documente' },
              { value: 'notificari', label: 'Notificări' },
              { value: 'setari', label: 'Setări' },
              { value: 'plati', label: 'Plăți' },
              { value: 'istoric', label: 'Istoric' },
              { value: 'preferinte', label: 'Preferințe' },
              { value: 'securitate', label: 'Securitate' },
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
              { value: 'profil', label: 'Profil' },
              { value: 'documente', label: 'Documente' },
              { value: 'notificari', label: 'Notificări' },
              { value: 'setari', label: 'Setări' },
              { value: 'plati', label: 'Plăți' },
              { value: 'istoric', label: 'Istoric' },
              { value: 'preferinte', label: 'Preferințe' },
              { value: 'securitate', label: 'Securitate' },
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
    },
  },
};

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
                  { value: 'profil', label: 'Profil' },
                  { value: 'documente', label: 'Documente' },
                  { value: 'notificari', label: 'Notificări' },
                ],
                { value: 'profil', size: 'sm', ariaLabel: 'Mobil — etichetă' },
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
                  { value: 'profil', label: 'Profil', iconName: 'person' },
                  { value: 'documente', label: 'Documente', iconName: 'document-filled' },
                  { value: 'notificari', label: 'Notificări', iconName: 'notification', badgeCount: 4 },
                  { value: 'setari', label: 'Setări', iconName: 'settings' },
                  { value: 'plati', label: 'Plăți', iconName: 'credit-card' },
                ],
                { value: 'profil', size: 'sm', ariaLabel: 'Mobil — overflow' },
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
    },
  },
};

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
              { value: 'profil', label: 'Profil' },
              { value: 'documente', label: 'Documente', disabled: true },
              { value: 'notificari', label: 'Notificări' },
              { value: 'setari', label: 'Setări' },
            ],
            { value: 'profil', ariaLabel: 'Cu tab dezactivat' },
          ),
        ),
        cell(
          'multiple disabled tabs — selection lands on next enabled tab',
          renderTabsHtml(
            'tabs-disabled-many',
            [
              { value: 'profil', label: 'Profil' },
              { value: 'documente', label: 'Documente', disabled: true },
              { value: 'notificari', label: 'Notificări', badgeCount: 7, disabled: true },
              { value: 'setari', label: 'Setări' },
            ],
            { value: 'profil', ariaLabel: 'Mai multe taburi dezactivate' },
          ),
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
  },
};

export const WithPanels: Story = {
  name: 'WithPanels',
  render: () => /*html*/ `
    <div style="padding: var(--spacing-24); max-width: 720px;">
      <mud-tabs id="tabs-panels" aria-label="Cont utilizator" value="profil">
        <mud-tab value="profil" label="Profil"></mud-tab>
        <mud-tab value="documente" label="Documente"></mud-tab>
        <mud-tab value="notificari" label="Notificări"></mud-tab>
        <mud-tab value="setari" label="Setări"></mud-tab>
        <div slot="panel-profil" style="font-size: var(--font-size-14); color: var(--color-text-base-default); line-height: 1.5;">
          <strong>Profil utilizator.</strong> Aici vezi datele personale, fotografia de profil și preferințele afișate altor membri.
        </div>
        <div slot="panel-documente" style="font-size: var(--font-size-14); color: var(--color-text-base-default); line-height: 1.5;">
          <strong>Documente.</strong> Buletinul, contractele și actele tale de identitate stocate în siguranță.
        </div>
        <div slot="panel-notificari" style="font-size: var(--font-size-14); color: var(--color-text-base-default); line-height: 1.5;">
          <strong>Notificări.</strong> Mesajele recente despre activitatea contului tău.
        </div>
        <div slot="panel-setari" style="font-size: var(--font-size-14); color: var(--color-text-base-default); line-height: 1.5;">
          <strong>Setări.</strong> Limba, fusul orar, alertele prin email și autentificarea în doi pași.
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
    },
  },
};

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
              { value: 'a', label: 'Lista' },
              { value: 'b', label: 'Hartă' },
            ],
            { value: 'a', ariaLabel: 'Două taburi' },
          ),
        ),
        cell(
          'very long labels — truncate with ellipsis',
          /*html*/ `
            <div style="inline-size: 520px;">
              ${renderTabsHtml(
                'tabs-ec-long',
                [
                  { value: 'a', label: 'Profil utilizator detaliat' },
                  { value: 'b', label: 'Documente recente încărcate' },
                  { value: 'c', label: 'Notificări nelinguistice' },
                ],
                { value: 'a', ariaLabel: 'Etichete lungi' },
              )}
            </div>
          `,
        ),
        cell(
          'high badge counts',
          renderTabsHtml(
            'tabs-ec-badges',
            [
              { value: 'a', label: 'Mesaje', badgeCount: 99 },
              { value: 'b', label: 'Cereri', badgeCount: 256 },
              { value: 'c', label: 'Arhivă', badgeCount: 0 },
            ],
            { value: 'a', ariaLabel: 'Contoare mari' },
          ),
        ),
        cell(
          'empty tabs (defensive — renders nothing useful, no crash)',
          /*html*/ `
            <mud-tabs aria-label="Listă goală"></mud-tabs>
          `,
        ),
      ].join(''),
    ),
  parameters: {
    controls: { disable: true },
  },
};
