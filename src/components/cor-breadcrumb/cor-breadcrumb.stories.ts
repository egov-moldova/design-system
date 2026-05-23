import type { Meta, StoryObj } from '@storybook/web-components-vite';

import type { BreadcrumbItem } from './cor-breadcrumb.types';

type BreadcrumbArgs = {
  items: BreadcrumbItem[];
  maxVisible: number;
  separator: string;
  responsive: boolean;
  ariaLabel: string;
};

const sectionLabelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); margin: 0 0 var(--spacing-8); font-style: italic;';
const headingStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-default); font-weight: 500; margin: var(--spacing-16) 0 var(--spacing-8); font-family: ui-monospace, SFMono-Regular, Menlo, monospace;';

// Romanian e-Gov flow — Acasă > Servicii > MPay > Detalii plată
const defaultItems: BreadcrumbItem[] = [
  { label: 'Acasă', href: '/' },
  { label: 'Servicii', href: '/servicii' },
  { label: 'MPay', href: '/servicii/mpay' },
  { label: 'Detalii plată', active: true },
];

const overflowItems: BreadcrumbItem[] = [
  { label: 'Acasă', href: '/' },
  { label: 'Servicii', href: '/servicii' },
  { label: 'Plăți', href: '/servicii/plati' },
  { label: 'MPay', href: '/servicii/plati/mpay' },
  { label: 'Tranzacții', href: '/servicii/plati/mpay/tranzactii' },
  { label: '2026', href: '/servicii/plati/mpay/tranzactii/2026' },
  { label: 'Mai', href: '/servicii/plati/mpay/tranzactii/2026/mai' },
  { label: 'Detalii plată', active: true },
];

const loadingItems: BreadcrumbItem[] = [
  { label: 'Acasă', href: '/' },
  { label: 'Servicii', href: '/servicii' },
  { label: 'MPay', loading: true },
  { label: 'Detalii plată', active: true },
];

const longLabelItems: BreadcrumbItem[] = [
  { label: 'Acasă', href: '/' },
  {
    label: 'Eticheta foarte lungă care depășește treizeci de caractere',
    href: '/seo-long',
  },
  { label: 'Detalii plată', active: true },
];

const visitedItems: BreadcrumbItem[] = [
  { label: 'Acasă', href: '/', visited: true },
  { label: 'Servicii', href: '/servicii', visited: true },
  { label: 'MPay', href: '/servicii/mpay' },
  { label: 'Detalii plată', active: true },
];

const disabledItems: BreadcrumbItem[] = [
  { label: 'Acasă', href: '/', disabled: true },
  { label: 'Servicii', href: '/servicii' },
  { label: 'MPay', href: '/servicii/mpay' },
  { label: 'Detalii plată', active: true },
];

let storyInstance = 0;
const nextId = () => `cor-breadcrumb-story-${++storyInstance}`;

const setItemsScript = (id: string, items: BreadcrumbItem[]) =>
  /*html*/ `<script>(function(){const el=document.getElementById('${id}');if(el)el.items=${JSON.stringify(items)};})();</script>`;

const renderBreadcrumb = (args: BreadcrumbArgs, items: BreadcrumbItem[] = args.items, extraAttrs: string = '') => {
  const id = nextId();
  return /*html*/ `
    <cor-breadcrumb
      id="${id}"
      max-visible="${args.maxVisible}"
      separator="${args.separator}"
      ${args.responsive ? '' : 'responsive="false"'}
      ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
      ${extraAttrs}
    ></cor-breadcrumb>
    ${setItemsScript(id, items)}
  `;
};

const renderDefault = (args: BreadcrumbArgs) => /*html*/ `
  <div style="padding: var(--spacing-24); background: var(--color-background-base-default);">
    ${renderBreadcrumb(args)}
  </div>
`;

const docsSourceDefault = (args: BreadcrumbArgs) => `<cor-breadcrumb id="my-breadcrumb"
  max-visible="${args.maxVisible}"></cor-breadcrumb>
<script>
  document.getElementById('my-breadcrumb').items = ${JSON.stringify(args.items, null, 2)};
</script>`;

const renderAllStates = () => {
  const baseArgs: BreadcrumbArgs = {
    items: defaultItems,
    maxVisible: 5,
    separator: '/',
    responsive: true,
    ariaLabel: '',
  };
  return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); background: var(--color-background-base-default);">
      <p style="${sectionLabelStyle}">Per-item states sampled from Figma node 81:713 — enabled / hover / focus / active / disabled / visited.</p>
      <div>
        <p style="${headingStyle}">enabled (default)</p>
        ${renderBreadcrumb(baseArgs, defaultItems)}
      </div>
      <div>
        <p style="${headingStyle}">hover &amp; focus — interact with the trail below</p>
        ${renderBreadcrumb(baseArgs, defaultItems)}
      </div>
      <div>
        <p style="${headingStyle}">visited</p>
        ${renderBreadcrumb(baseArgs, visitedItems)}
      </div>
      <div>
        <p style="${headingStyle}">disabled (Acasă unreachable)</p>
        ${renderBreadcrumb(baseArgs, disabledItems)}
      </div>
      <div>
        <p style="${headingStyle}">active — last crumb, aria-current="page", medium weight</p>
        ${renderBreadcrumb(baseArgs, defaultItems)}
      </div>
    </div>
  `;
};

const renderOverflow = () => {
  const baseArgs: BreadcrumbArgs = {
    items: overflowItems,
    maxVisible: 5,
    separator: '/',
    responsive: true,
    ariaLabel: '',
  };
  return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); background: var(--color-background-base-default);">
      <p style="${sectionLabelStyle}">Overflow — 8 items, max-visible=5. The middle 5 collapse into the "…" menu. Click the trigger to reveal the dropdown.</p>
      ${renderBreadcrumb(baseArgs, overflowItems)}
      <p style="${sectionLabelStyle}">Tighter — max-visible=4 keeps only the first item, "…", and the last two.</p>
      ${renderBreadcrumb({ ...baseArgs, maxVisible: 4 }, overflowItems)}
    </div>
  `;
};

const renderLoading = () => {
  const baseArgs: BreadcrumbArgs = {
    items: loadingItems,
    maxVisible: 5,
    separator: '/',
    responsive: true,
    ariaLabel: '',
  };
  return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); background: var(--color-background-base-default);">
      <p style="${sectionLabelStyle}">Per-item loading state — the MPay crumb's label is replaced by a spinner while the parent page resolves.</p>
      ${renderBreadcrumb(baseArgs, loadingItems)}
    </div>
  `;
};

const renderMobile = () => {
  const baseArgs: BreadcrumbArgs = {
    items: defaultItems,
    maxVisible: 5,
    separator: '/',
    responsive: true,
    ariaLabel: '',
  };
  return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); background: var(--color-background-base-default);">
      <p style="${sectionLabelStyle}">Mobile collapses to a single back link to the parent page. Resize the viewport below 640px to preview, or use a container that mimics phone width.</p>
      <div style="max-width: 320px; border: 1px dashed var(--color-border-base-default); border-radius: 8px; padding: var(--spacing-12);">
        <p style="${headingStyle}">simulated mobile (container = 320px)</p>
        ${renderBreadcrumb(baseArgs, defaultItems)}
      </div>
      <div>
        <p style="${headingStyle}">at full width — desktop trail is visible</p>
        ${renderBreadcrumb(baseArgs, defaultItems)}
      </div>
    </div>
  `;
};

const renderWithCustomSeparator = () => {
  const baseArgs: BreadcrumbArgs = {
    items: defaultItems,
    maxVisible: 5,
    separator: '/',
    responsive: true,
    ariaLabel: '',
  };
  const id1 = nextId();
  const id2 = nextId();
  return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); background: var(--color-background-base-default);">
      <p style="${sectionLabelStyle}">Custom separator via the <code>separator</code> slot — render a forward slash, a middot, or any inline content.</p>
      <div>
        <p style="${headingStyle}">slash separator</p>
        <cor-breadcrumb id="${id1}" max-visible="${baseArgs.maxVisible}">
          <span slot="separator" style="color: var(--color-text-base-tertiary); width: 12px; text-align: center;">/</span>
        </cor-breadcrumb>
        ${setItemsScript(id1, defaultItems)}
      </div>
      <div>
        <p style="${headingStyle}">middot separator</p>
        <cor-breadcrumb id="${id2}" max-visible="${baseArgs.maxVisible}">
          <span slot="separator" style="color: var(--color-text-base-tertiary); width: 16px; text-align: center;">·</span>
        </cor-breadcrumb>
        ${setItemsScript(id2, defaultItems)}
      </div>
    </div>
  `;
};

const renderEdgeCases = () => {
  const baseArgs: BreadcrumbArgs = {
    items: defaultItems,
    maxVisible: 5,
    separator: '/',
    responsive: true,
    ariaLabel: '',
  };
  return /*html*/ `
    <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); background: var(--color-background-base-default);">
      <p style="${sectionLabelStyle}">Very long labels are truncated at the per-crumb level (max-width: 30ch) with an ellipsis. Container width is 600px to force truncation.</p>
      <div style="max-width: 600px; border: 1px dashed var(--color-border-base-default); border-radius: 8px; padding: var(--spacing-12);">
        ${renderBreadcrumb(baseArgs, longLabelItems)}
      </div>
      <p style="${sectionLabelStyle}">Two items only — single parent link plus active page.</p>
      ${renderBreadcrumb(baseArgs, [
        { label: 'Acasă', href: '/' },
        { label: 'Profil', active: true },
      ])}
      <p style="${sectionLabelStyle}">Single item — only the active page (no separator).</p>
      ${renderBreadcrumb(baseArgs, [{ label: 'Acasă', active: true }])}
    </div>
  `;
};

const renderSlotMode = () => /*html*/ `
  <div style="display: flex; flex-direction: column; gap: var(--spacing-24); padding: var(--spacing-24); background: var(--color-background-base-default);">
    <p style="${sectionLabelStyle}">Slot-mode — declare crumbs as markup. The parent skips its internal separator logic in this mode; consumers compose freely.</p>
    <cor-breadcrumb>
      <cor-breadcrumb-item href="/">Acasă</cor-breadcrumb-item>
      <cor-breadcrumb-item href="/servicii">Servicii</cor-breadcrumb-item>
      <cor-breadcrumb-item href="/servicii/mpay">MPay</cor-breadcrumb-item>
      <cor-breadcrumb-item active>Detalii plată</cor-breadcrumb-item>
    </cor-breadcrumb>
  </div>
`;

const meta: Meta<BreadcrumbArgs> = {
  title: 'Molecules/Breadcrumb',
  component: 'cor-breadcrumb',
  argTypes: {
    items: {
      control: 'object',
      description: 'Typed crumb list. Each item: { label, href?, active?, visited?, disabled?, loading? }.',
    },
    maxVisible: {
      control: { type: 'number', min: 2, max: 12, step: 1 },
      description: 'Maximum visible crumbs before overflow collapses the middle into a "…" menu.',
      table: { defaultValue: { summary: '5' } },
    },
    separator: {
      control: 'text',
      description: 'Fallback separator character when the `separator` slot is empty.',
      table: { defaultValue: { summary: '/' } },
    },
    responsive: {
      control: 'boolean',
      description: 'Collapse to a back link on viewports ≤640px.',
      table: { defaultValue: { summary: 'true' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name for the `<nav>` landmark.',
      table: { defaultValue: { summary: 'Breadcrumb' } },
    },
  },
};
export default meta;

type Story = StoryObj<BreadcrumbArgs>;

// ---------------------------------------------------------------------------
// Default — 4 items linear (Acasă > Servicii > MPay > Detalii plată)
// ---------------------------------------------------------------------------
export const Default: Story = {
  render: renderDefault,
  args: {
    items: defaultItems,
    maxVisible: 5,
    separator: '/',
    responsive: true,
    ariaLabel: '',
  },
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: BreadcrumbArgs }) => docsSourceDefault(args),
      },
    },
  },
};

export const AllStates: Story = {
  render: renderAllStates,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsSourceDefault({
          items: defaultItems,
          maxVisible: 5,
          separator: '/',
          responsive: true,
          ariaLabel: '',
        }),
      },
    },
  },
};

export const Overflow: Story = {
  render: renderOverflow,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsSourceDefault({
          items: overflowItems,
          maxVisible: 5,
          separator: '/',
          responsive: true,
          ariaLabel: '',
        }),
      },
    },
  },
};

export const Loading: Story = {
  render: renderLoading,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsSourceDefault({
          items: loadingItems,
          maxVisible: 5,
          separator: '/',
          responsive: true,
          ariaLabel: '',
        }),
      },
    },
  },
};

export const Mobile: Story = {
  render: renderMobile,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsSourceDefault({
          items: defaultItems,
          maxVisible: 5,
          separator: '/',
          responsive: true,
          ariaLabel: '',
        }),
      },
    },
  },
};

export const WithCustomSeparator: Story = {
  render: renderWithCustomSeparator,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<cor-breadcrumb id="my-breadcrumb">
  <span slot="separator">/</span>
</cor-breadcrumb>
<script>document.getElementById('my-breadcrumb').items = ${JSON.stringify(defaultItems, null, 2)};</script>`,
      },
    },
  },
};

export const EdgeCases: Story = {
  render: renderEdgeCases,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: docsSourceDefault({
          items: longLabelItems,
          maxVisible: 5,
          separator: '/',
          responsive: true,
          ariaLabel: '',
        }),
      },
    },
  },
};

export const SlotMode: Story = {
  render: renderSlotMode,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<cor-breadcrumb>
  <cor-breadcrumb-item href="/">Acasă</cor-breadcrumb-item>
  <cor-breadcrumb-item href="/servicii">Servicii</cor-breadcrumb-item>
  <cor-breadcrumb-item href="/servicii/mpay">MPay</cor-breadcrumb-item>
  <cor-breadcrumb-item active>Detalii plată</cor-breadcrumb-item>
</cor-breadcrumb>`,
      },
    },
  },
};

// Coverage guard — ensures Stencil constructor is exercised
export const CoverageGuard: Story = {
  tags: ['!autodocs', '!dev'],
  render: () => /*html*/ `<cor-breadcrumb id="cor-breadcrumb-coverage"></cor-breadcrumb>
    <script>(function(){const el=document.getElementById('cor-breadcrumb-coverage');if(el)el.items=${JSON.stringify(defaultItems)};})();</script>`,
  parameters: {
    controls: { disable: true },
    docs: { disable: true },
  },
  play: async () => {
    const ParentCtor = customElements.get('cor-breadcrumb') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!ParentCtor) throw new Error('cor-breadcrumb constructor missing from registry');
    const parent = new ParentCtor(false);
    if (!parent) throw new Error('cor-breadcrumb did not construct');

    const ItemCtor = customElements.get('cor-breadcrumb-item') as unknown as
      | (new (registerHost: boolean) => unknown)
      | undefined;
    if (!ItemCtor) throw new Error('cor-breadcrumb-item constructor missing from registry');
    const item = new ItemCtor(false);
    if (!item) throw new Error('cor-breadcrumb-item did not construct');
  },
};
