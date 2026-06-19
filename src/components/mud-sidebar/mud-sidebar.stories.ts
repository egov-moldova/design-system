import type { Meta, StoryObj } from '@storybook/web-components-vite';

// ---------------------------------------------------------------------------
// Arg types — typed from @Prop() declarations on mud-sidebar
// ---------------------------------------------------------------------------

type SidebarArgs = {
  collapsed: boolean;
  ariaLabel: string;
};

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const stageStyle =
  'display: flex; gap: var(--spacing-32); padding: var(--spacing-32); align-items: flex-start; min-block-size: 480px;';

const labelStyle =
  'font-size: var(--font-size-12); color: var(--color-text-base-tertiary); font-style: italic; margin: 0 0 var(--spacing-8);';

const gridStyle =
  'display: grid; grid-template-columns: 160px 1fr; gap: var(--spacing-24); align-items: start; padding: var(--spacing-32);';

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

const renderDefault = (args: SidebarArgs) => /*html*/ `
  <div style="${stageStyle}">
    <mud-sidebar
      ${args.collapsed ? 'collapsed' : ''}
      ${args.ariaLabel ? `aria-label="${args.ariaLabel}"` : ''}
    >
      <mud-sidebar-group heading="Heading">
        <mud-sidebar-item
          value="overview"
          icon="group"
          icon-active="group-filled"
          label="Overview"
          active
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="analytics"
          icon="chart"
          label="Analytics"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="documents"
          icon="document"
          label="Documents"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="search"
          icon="search"
          label="Search"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="filter"
          icon="filter"
          label="Filters"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="settings"
          icon="settings"
          label="Settings"
        ></mud-sidebar-item>
      </mud-sidebar-group>
      <mud-sidebar-group heading="Heading">
        <mud-sidebar-item
          value="download"
          label="Downloads"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="archive"
          label="Archive"
        ></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>
  </div>
`;

const docsSourceDefault = /*html*/ `<mud-sidebar aria-label="Main navigation">
  <mud-sidebar-group heading="Heading">
    <mud-sidebar-item value="overview" icon="group" icon-active="group-filled" label="Overview" active></mud-sidebar-item>
    <mud-sidebar-item value="analytics" icon="chart" label="Analytics"></mud-sidebar-item>
    <mud-sidebar-item value="documents" icon="document" label="Documents"></mud-sidebar-item>
    <mud-sidebar-item value="search" icon="search" label="Search"></mud-sidebar-item>
    <mud-sidebar-item value="filter" icon="filter" label="Filters"></mud-sidebar-item>
    <mud-sidebar-item value="settings" icon="settings" label="Settings"></mud-sidebar-item>
  </mud-sidebar-group>
  <mud-sidebar-group heading="Heading">
    <mud-sidebar-item value="download" label="Downloads"></mud-sidebar-item>
    <mud-sidebar-item value="archive" label="Archive"></mud-sidebar-item>
  </mud-sidebar-group>
</mud-sidebar>`;

// ---------------------------------------------------------------------------

const renderWithSecondaryLabels = () => /*html*/ `
  <div style="${stageStyle}">
    <mud-sidebar aria-label="Navigation with secondary labels">
      <mud-sidebar-group heading="Servicii">
        <mud-sidebar-item
          value="overview"
          icon="group"
          icon-active="group-filled"
          label="Overview"
          secondary="Nou"
          active
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="analytics"
          icon="chart"
          label="Analytics"
          secondary="Beta"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="documents"
          icon="document"
          label="Documents"
          secondary="47"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="search"
          icon="search"
          label="Search"
        ></mud-sidebar-item>
      </mud-sidebar-group>
      <mud-sidebar-group heading="Configurare">
        <mud-sidebar-item
          value="settings"
          icon="settings"
          label="Settings"
          secondary="Pro"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="filter"
          icon="filter"
          label="Filters"
          secondary="3 active"
        ></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>
  </div>
`;

const docsSourceWithSecondaryLabels = /*html*/ `<mud-sidebar aria-label="Navigation with secondary labels">
  <mud-sidebar-group heading="Servicii">
    <mud-sidebar-item value="overview" icon="group" icon-active="group-filled" label="Overview" secondary="Nou" active></mud-sidebar-item>
    <mud-sidebar-item value="analytics" icon="chart" label="Analytics" secondary="Beta"></mud-sidebar-item>
    <mud-sidebar-item value="documents" icon="document" label="Documents" secondary="47"></mud-sidebar-item>
  </mud-sidebar-group>
</mud-sidebar>`;

// ---------------------------------------------------------------------------

const renderWithTagsAndBadges = () => /*html*/ `
  <div style="${stageStyle}">
    <mud-sidebar aria-label="Navigation with tags and badges">
      <mud-sidebar-group heading="Cereri">
        <mud-sidebar-item
          value="overview"
          icon="group"
          icon-active="group-filled"
          label="Overview"
          active
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="pending"
          icon="document"
          label="Pending"
          badge="1"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="completed"
          icon="download"
          label="Completed"
          badge="12"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="search"
          icon="search"
          label="Search"
          tag="New"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="analytics"
          icon="chart"
          label="Analytics"
          tag="Beta"
        ></mud-sidebar-item>
      </mud-sidebar-group>
      <mud-sidebar-group heading="Acțiuni">
        <mud-sidebar-item
          value="edit"
          icon="edit"
          label="Edit"
          tag="Pro"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="copy"
          icon="copy"
          label="Copy"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="delete"
          icon="delete"
          label="Delete"
        ></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>
  </div>
`;

const docsSourceWithTagsAndBadges = /*html*/ `<mud-sidebar aria-label="Navigation with tags and badges">
  <mud-sidebar-group heading="Cereri">
    <mud-sidebar-item value="overview" icon="group" icon-active="group-filled" label="Overview" active></mud-sidebar-item>
    <mud-sidebar-item value="pending" icon="document" label="Pending" badge="1"></mud-sidebar-item>
    <mud-sidebar-item value="completed" icon="download" label="Completed" badge="12"></mud-sidebar-item>
    <mud-sidebar-item value="search" icon="search" label="Search" tag="New"></mud-sidebar-item>
    <mud-sidebar-item value="analytics" icon="chart" label="Analytics" tag="Beta"></mud-sidebar-item>
  </mud-sidebar-group>
</mud-sidebar>`;

// ---------------------------------------------------------------------------

const renderExpandable = () => /*html*/ `
  <div style="${stageStyle}">
    <mud-sidebar aria-label="Navigation with expandable items">
      <mud-sidebar-group heading="Heading">
        <mud-sidebar-item
          value="overview"
          icon="group"
          icon-active="group-filled"
          label="Overview"
          active
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="documents"
          icon="document"
          label="Documents"
          expandable
          expanded
        >
          <mud-sidebar-item slot="children" value="doc-list" label="All documents"></mud-sidebar-item>
          <mud-sidebar-item slot="children" value="doc-drafts" label="Drafts"></mud-sidebar-item>
          <mud-sidebar-item slot="children" value="doc-archive" label="Archive"></mud-sidebar-item>
        </mud-sidebar-item>
        <mud-sidebar-item
          value="analytics"
          icon="chart"
          label="Analytics"
          expandable
        >
          <mud-sidebar-item slot="children" value="analytics-overview" label="Overview"></mud-sidebar-item>
          <mud-sidebar-item slot="children" value="analytics-reports" label="Reports"></mud-sidebar-item>
        </mud-sidebar-item>
        <mud-sidebar-item
          value="settings"
          icon="settings"
          label="Settings"
        ></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>
  </div>
`;

const docsSourceExpandable = /*html*/ `<mud-sidebar aria-label="Navigation with expandable items">
  <mud-sidebar-group heading="Heading">
    <mud-sidebar-item value="overview" icon="group" icon-active="group-filled" label="Overview" active></mud-sidebar-item>
    <!-- expandable + expanded = open on mount -->
    <mud-sidebar-item value="documents" icon="document" label="Documents" expandable expanded>
      <mud-sidebar-item slot="children" value="doc-list" label="All documents"></mud-sidebar-item>
      <mud-sidebar-item slot="children" value="doc-drafts" label="Drafts"></mud-sidebar-item>
      <mud-sidebar-item slot="children" value="doc-archive" label="Archive"></mud-sidebar-item>
    </mud-sidebar-item>
    <!-- expandable without expanded = collapsed on mount -->
    <mud-sidebar-item value="analytics" icon="chart" label="Analytics" expandable>
      <mud-sidebar-item slot="children" value="analytics-overview" label="Overview"></mud-sidebar-item>
      <mud-sidebar-item slot="children" value="analytics-reports" label="Reports"></mud-sidebar-item>
    </mud-sidebar-item>
  </mud-sidebar-group>
</mud-sidebar>`;

// ---------------------------------------------------------------------------

const renderCollapsed = () => /*html*/ `
  <div style="${stageStyle}">
    <mud-sidebar collapsed aria-label="Collapsed icon-only rail">
      <mud-sidebar-group>
        <mud-sidebar-item
          value="overview"
          icon="group"
          icon-active="group-filled"
          label="Overview"
          active
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="analytics"
          icon="chart"
          label="Analytics"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="documents"
          icon="document"
          label="Documents"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="search"
          icon="search"
          label="Search"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="filter"
          icon="filter"
          label="Filters"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="settings"
          icon="settings"
          label="Settings"
        ></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>
  </div>
`;

const docsSourceCollapsed = /*html*/ `<!-- collapsed prop shrinks the sidebar to a 68 px icon-only rail -->
<mud-sidebar collapsed aria-label="Collapsed icon-only rail">
  <mud-sidebar-group>
    <mud-sidebar-item value="overview" icon="group" icon-active="group-filled" label="Overview" active></mud-sidebar-item>
    <mud-sidebar-item value="analytics" icon="chart" label="Analytics"></mud-sidebar-item>
    <mud-sidebar-item value="documents" icon="document" label="Documents"></mud-sidebar-item>
    <mud-sidebar-item value="settings" icon="settings" label="Settings"></mud-sidebar-item>
  </mud-sidebar-group>
</mud-sidebar>`;

// ---------------------------------------------------------------------------

const renderStates = () => /*html*/ `
  <div style="${gridStyle}">
    <div style="font-weight: var(--font-weight-semibold); color: var(--color-text-base-secondary);">State</div>
    <div style="font-weight: var(--font-weight-semibold); color: var(--color-text-base-secondary);">Example</div>

    <div style="${labelStyle}">Default</div>
    <mud-sidebar aria-label="Default state" style="width: 280px;">
      <mud-sidebar-group>
        <mud-sidebar-item value="default" icon="group" label="Default item"></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>

    <div style="${labelStyle}">Active</div>
    <mud-sidebar aria-label="Active state" style="width: 280px;">
      <mud-sidebar-group>
        <mud-sidebar-item value="active" icon="group" icon-active="group-filled" label="Active item" active></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>

    <div style="${labelStyle}">Disabled</div>
    <mud-sidebar aria-label="Disabled state" style="width: 280px;">
      <mud-sidebar-group>
        <mud-sidebar-item value="disabled" icon="group" label="Disabled item" disabled></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>

    <div style="${labelStyle}">Expandable (collapsed)</div>
    <mud-sidebar aria-label="Expandable collapsed state" style="width: 280px;">
      <mud-sidebar-group>
        <mud-sidebar-item value="expandable" icon="document" label="Expandable item" expandable>
          <mud-sidebar-item slot="children" value="child-1" label="Child item"></mud-sidebar-item>
        </mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>

    <div style="${labelStyle}">Expandable (open)</div>
    <mud-sidebar aria-label="Expandable open state" style="width: 280px;">
      <mud-sidebar-group>
        <mud-sidebar-item value="expandable-open" icon="document" label="Expandable item" expandable expanded>
          <mud-sidebar-item slot="children" value="child-a" label="Child A"></mud-sidebar-item>
          <mud-sidebar-item slot="children" value="child-b" label="Child B"></mud-sidebar-item>
        </mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>

    <div style="${labelStyle}">As link</div>
    <mud-sidebar aria-label="Link state" style="width: 280px;">
      <mud-sidebar-group>
        <mud-sidebar-item value="link" icon="search" label="Link item" href="/example"></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>
  </div>
`;

const docsSourceStates = /*html*/ `<!-- Default -->
<mud-sidebar-item value="default" icon="group" label="Default item"></mud-sidebar-item>

<!-- Active (uses icon-active filled variant) -->
<mud-sidebar-item value="active" icon="group" icon-active="group-filled" label="Active item" active></mud-sidebar-item>

<!-- Disabled -->
<mud-sidebar-item value="disabled" icon="group" label="Disabled item" disabled></mud-sidebar-item>

<!-- Expandable — collapsed by default -->
<mud-sidebar-item value="parent" icon="document" label="Expandable item" expandable>
  <mud-sidebar-item slot="children" value="child-1" label="Child item"></mud-sidebar-item>
</mud-sidebar-item>

<!-- Expandable — open on mount -->
<mud-sidebar-item value="parent" icon="document" label="Expandable item" expandable expanded>
  <mud-sidebar-item slot="children" value="child-a" label="Child A"></mud-sidebar-item>
  <mud-sidebar-item slot="children" value="child-b" label="Child B"></mud-sidebar-item>
</mud-sidebar-item>

<!-- As link (href prop) -->
<mud-sidebar-item value="link" icon="search" label="Link item" href="/example"></mud-sidebar-item>`;

// ---------------------------------------------------------------------------

const renderAllItemFeatures = () => /*html*/ `
  <div style="${stageStyle}">
    <mud-sidebar aria-label="All item features showcase">
      <mud-sidebar-group heading="Item feature matrix">
        <mud-sidebar-item
          value="icon-label"
          icon="group"
          icon-active="group-filled"
          label="Icon + Label (active)"
          active
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="icon-secondary"
          icon="chart"
          label="Icon + Secondary"
          secondary="123"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="icon-tag"
          icon="search"
          label="Icon + Tag"
          tag="New"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="icon-badge"
          icon="document"
          label="Icon + Badge"
          badge="5"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="icon-chevron"
          icon="filter"
          label="Icon + Chevron (expandable)"
          expandable
          expanded
        >
          <mud-sidebar-item slot="children" value="child-filter-1" label="Active filter"></mud-sidebar-item>
          <mud-sidebar-item slot="children" value="child-filter-2" label="Archived filter"></mud-sidebar-item>
        </mud-sidebar-item>
      </mud-sidebar-group>
      <mud-sidebar-group heading="Without icon">
        <mud-sidebar-item
          value="label-only"
          label="Label only"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="label-secondary"
          label="Label + Secondary"
          secondary="Nou"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="label-badge-large"
          label="Label + Large badge"
          badge="99"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="label-tag"
          label="Label + Tag"
          tag="Beta"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="label-href"
          label="Label + Link"
          href="/example"
        ></mud-sidebar-item>
        <mud-sidebar-item
          value="label-disabled"
          label="Disabled (no icon)"
          disabled
        ></mud-sidebar-item>
      </mud-sidebar-group>
    </mud-sidebar>
  </div>
`;

const docsSourceAllItemFeatures = /*html*/ `<!-- Icon + label (active — swaps to icon-active variant) -->
<mud-sidebar-item value="overview" icon="group" icon-active="group-filled" label="Overview" active></mud-sidebar-item>

<!-- Icon + secondary right-aligned label -->
<mud-sidebar-item value="analytics" icon="chart" label="Analytics" secondary="123"></mud-sidebar-item>

<!-- Icon + outlined tag -->
<mud-sidebar-item value="search" icon="search" label="Search" tag="New"></mud-sidebar-item>

<!-- Icon + numbered badge -->
<mud-sidebar-item value="documents" icon="document" label="Documents" badge="5"></mud-sidebar-item>

<!-- Expandable with chevron -->
<mud-sidebar-item value="filters" icon="filter" label="Filters" expandable expanded>
  <mud-sidebar-item slot="children" value="filter-1" label="Active filter"></mud-sidebar-item>
  <mud-sidebar-item slot="children" value="filter-2" label="Archived filter"></mud-sidebar-item>
</mud-sidebar-item>

<!-- No icon, label only -->
<mud-sidebar-item value="plain" label="Label only"></mud-sidebar-item>

<!-- Renders as anchor when href is set -->
<mud-sidebar-item value="link" label="Link item" href="/example"></mud-sidebar-item>

<!-- Disabled -->
<mud-sidebar-item value="off" label="Disabled item" disabled></mud-sidebar-item>`;

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<SidebarArgs> = {
  title: 'Organisms/Sidebar',
  component: 'mud-sidebar',
  argTypes: {
    collapsed: {
      control: 'boolean',
      description:
        'Collapse the sidebar to an icon-only compact rail (~68 px wide). Propagated automatically to all nested `mud-sidebar-group` and `mud-sidebar-item` children.',
      table: { defaultValue: { summary: 'false' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name forwarded to `aria-label` on the inner `<nav>` landmark.',
      table: { defaultValue: { summary: '—' } },
    },
  },
  args: {
    collapsed: false,
    ariaLabel: 'Main navigation',
  },
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<SidebarArgs>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * A full sidebar with two groups and six items in the first group.
 * The first item is active — it swaps its icon to the filled `group-filled` variant.
 * A divider auto-renders above the second group.
 * Use the Controls panel to toggle `collapsed` and observe the icon-only rail.
 */
export const Default: Story = {
  render: renderDefault,
  parameters: {
    docs: {
      source: {
        type: 'dynamic',
        transform: (_code: string, { args }: { args: SidebarArgs }) =>
          args.collapsed
            ? docsSourceCollapsed
            : docsSourceDefault,
      },
    },
  },
};

/**
 * Items with right-aligned `secondary` text. Use this for counts, labels,
 * version tags, or anything that belongs on the trailing edge of the row.
 */
export const WithSecondaryLabels: Story = {
  render: renderWithSecondaryLabels,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithSecondaryLabels } },
  },
};

/**
 * Items carrying `tag` (outlined neutral `mud-tag`) and `badge` (numbered
 * `mud-badge`). Tags suit string labels ("New", "Beta"); badges suit numeric
 * counters. Both can coexist with an icon and secondary text.
 */
export const WithTagsAndBadges: Story = {
  render: renderWithTagsAndBadges,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceWithTagsAndBadges } },
  },
};

/**
 * Expandable items toggle a `children` slot via the `expandable` + `expanded`
 * props. The chevron rotates on expand. The "Documents" group starts open
 * (`expanded`); "Analytics" starts closed.
 * `mudToggle` fires with `{ value, expanded }` on each toggle.
 */
export const Expandable: Story = {
  render: renderExpandable,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceExpandable } },
  },
};

/**
 * `collapsed` sidebar — icon-only rail. Labels, secondary text, tags, and
 * badges are hidden. Only the leading icon remains visible.
 * Hover/focus/active states still apply; tooltip display is left to the
 * consuming app.
 */
export const Collapsed: Story = {
  render: renderCollapsed,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceCollapsed } },
  },
};

/**
 * Visual catalogue of `mud-sidebar-item` interaction states: Default, Active,
 * Disabled, Expandable (closed), Expandable (open), and As-link.
 * Hover and focus states are interaction-driven and visible in the live canvas.
 */
export const States: Story = {
  render: renderStates,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceStates } },
  },
};

/**
 * All item feature combinations in one sidebar: icon, label, secondary,
 * tag, badge, expandable chevron, link, and disabled — with and without
 * a leading icon. Use this as a visual regression fixture.
 */
export const AllItemFeatures: Story = {
  render: renderAllItemFeatures,
  parameters: {
    controls: { disable: true },
    docs: { source: { code: docsSourceAllItemFeatures } },
  },
};
